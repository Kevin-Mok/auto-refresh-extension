import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const plain=process.argv.includes('--plain');
const log=text=>console.log(`${plain?'':'✅ '}${text}`);
const option=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};
if(process.argv.includes('--help')){
  console.log(`${plain?'':'🌐 '}Browser verification: node scripts/browser-check.js [--chromium /path/to/chrome] [--playwright /path/to/playwright/index.mjs] [--plain]`);
  process.exit(0);
}
const playwright=option('--playwright');
const {chromium}=await import(playwright?pathToFileURL(resolve(playwright)).href:'playwright');
const root=resolve('.');
const profile=await mkdtemp(join(tmpdir(),'auto-refresh-check-'));
const fixtureExtension=join(profile,'extension');
let context, server;
let localUrl;
let progress;
const started=Date.now();
try {
  server=spawn(process.execPath,['scripts/demo-server.js','--plain'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
  localUrl=await new Promise((resolve,reject)=>{
    server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(data.toString());if(match)resolve(match[0]);});
    server.once('error',reject);server.once('exit',code=>reject(Error(`Fixture exited ${code}`)));
  });
  progress=setInterval(()=>console.error(`${plain?'':'⏱️ '}Browser checks active · ${Math.floor((Date.now()-started)/1000)}s`),15000);
  await mkdir(fixtureExtension,{recursive:true});
  for (const file of ['manifest.json','popup.html','popup.css','src','icons']) await cp(join(root,file),join(fixtureExtension,file),{recursive:true});
  const manifest=JSON.parse(await readFile(join(fixtureExtension,'manifest.json'),'utf8'));
  // Headless Chrome cannot accept its native optional-host dialog; pregrant loopback in this disposable test copy.
  manifest.host_permissions=['http://127.0.0.1/*'];
  await writeFile(join(fixtureExtension,'manifest.json'),JSON.stringify(manifest));
  console.log(`${plain?'':'🌐 '}Test copy pregrants loopback only; native permission prompt remains a manual check.`);
  const launch=async()=>chromium.launchPersistentContext(profile,{
    executablePath:option('--chromium'),headless:true,timeout:15000,
    args:[`--disable-extensions-except=${fixtureExtension}`,`--load-extension=${fixtureExtension}`,'--no-sandbox'],
  });
  console.log(`${plain?'':'🌐 '}Launching isolated Chromium…`);context=await launch();
  let worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker',{timeout:15000});
  const extensionId=new URL(worker.url()).host;
  worker.on('console',message=>console.error(message.text()));
  const page=await context.newPage();await page.goto(localUrl+'/page?demo=1');
  let id;
  let popup=await context.newPage();await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  // A normal extension page has no activeTab grant; prime fixture host permission by the same genuine click API path.
  await popup.evaluate(origin=>{
    const button=document.createElement('button');button.id='grant';button.textContent='Grant test site access';
    button.onclick=()=>chrome.permissions.request({origins:[origin+'/*']}).then(value=>document.body.dataset.granted=value);
    document.body.append(button);
  },localUrl.replace(/:\d+$/,''));
  await popup.click('#grant');
  await popup.waitForFunction(()=>document.body.dataset.granted!==undefined,{},{timeout:8000});
  assert.equal(await popup.getAttribute('body','data-granted'),'true','Chrome must grant optional site access');
  id=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url).id,page.url());
  const command=(type,extra={})=>popup.evaluate(async message=>{
    const answer=await chrome.runtime.sendMessage(message);if(!answer?.ok)throw Error(answer?.error || 'No reply');return answer.value;
  },{type,tabId:id,url:localUrl+'/page?demo=1',...extra});
  const state=()=>command('view');
  await page.bringToFront();await popup.reload();
  await popup.waitForFunction(()=>!document.getElementById('start').disabled);
  await popup.fill('#minutes','0');await popup.fill('#seconds','600');await popup.click('#start');
  await popup.waitForFunction(()=>document.getElementById('status').textContent==='Running');
  assert.equal(await popup.inputValue('#minutes'),'10');assert.equal(await popup.inputValue('#seconds'),'0');
  const inputs=await popup.locator('.inputs').boundingBox(), details=await popup.locator('#page-label').boundingBox();
  assert.ok(inputs.y<details.y,'Minutes/Seconds must precede page details');
  const badge=()=>worker.evaluate(id=>chrome.action.getBadgeText({tabId:id}),id);
  assert.ok(Number(await badge())>=598);
  await popup.close();await page.bringToFront();
  const initial=Number(await badge());
  await page.waitForTimeout(2100);
  assert.ok(Number(await badge())<initial,'badge must count down with popup closed');
  log('Minutes/Seconds come first; toolbar badge counts down with popup closed');
  popup=await context.newPage();await page.bringToFront();await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForFunction(()=>document.getElementById('status').textContent==='Running');
  await popup.fill('#seconds','1.5');await popup.click('#start');await popup.waitForFunction(()=>!document.getElementById('error').hidden);
  assert.equal((await state()).seconds,600);
  await popup.click('#stop');assert.equal((await state()).paused,true);
  assert.equal(await badge(),'');
  log('Real popup Start normalizes 600 seconds; fractional input is rejected; Stop pauses this tab');
  await command('start',{seconds:1});
  const served=await page.textContent('#served');
  await page.waitForFunction(old=>document.getElementById('served').textContent!==old,served);
  await command('stop');const paused=await page.textContent('#served');
  await page.waitForTimeout(1800);assert.equal(await page.textContent('#served'),paused);
  log('1-second actual reload; Stop prevents subsequent reloads');
  await command('start',{seconds:600});
  const second=await context.newPage();await second.goto(localUrl+'/page?demo=1');
  await popup.waitForTimeout(300);
  const states=await worker.evaluate(async()=> (await chrome.storage.session.get('states')).states);
  assert.equal(Object.values(states).filter(s=>s.status==='running').length,2);
  assert.equal((await state()).seconds,600);
  const deadline=(await state()).state.due;
  const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');await cdp.send('ServiceWorker.stopAllWorkers');await cdp.detach();
  assert.equal((await state()).state.due,deadline);
  worker=context.serviceWorkers().find(w=>w.url().includes(extensionId)) || await context.waitForEvent('serviceworker',{timeout:15000});
  log('Actual service-worker stop/wake preserves the countdown');
  await command('stop');assert.equal((await state()).paused,true);
  await page.reload();await popup.waitForTimeout(300);assert.equal((await state()).paused,true);
  log('600 seconds saved; new matching tab runs independently; pause survives reload');
  await page.click('#spa-away');await popup.waitForTimeout(300);
  await page.click('#spa-back');await popup.waitForTimeout(300);assert.equal((await state()).paused,true);
  await command('start',{seconds:29});
  const due=(await state()).state.due;
  await second.bringToFront();await page.bringToFront();assert.equal((await state()).state.due,due);
  await page.click('#spa-away');await popup.waitForTimeout(200);
  assert.equal((await state()).seconds,undefined);
  await page.click('#spa-back');await popup.waitForTimeout(300);
  assert.ok((await state()).state.due>due);
  log('SPA exact-page away/back resets countdown; tab focus preserves it');
  const before29=await page.textContent('#served');
  await page.waitForFunction(old=>document.getElementById('served').textContent!==old,before29,{timeout:45000});
  log('29-second document timer causes an actual reload');
  await command('start',{seconds:30});
  const alarms=await worker.evaluate(()=>chrome.alarms.getAll());assert.equal(alarms.length,2);
  const before=await page.textContent('#served');
  await page.waitForFunction(old=>document.getElementById('served').textContent!==old,before,{timeout:45000});
  log('30-second alarm causes an actual reload');
  await command('clear');
  assert.equal(await badge(),'');
  assert.deepEqual((await state()).rules,{});
  assert.deepEqual(await worker.evaluate(()=>chrome.alarms.getAll()),[]);
  await page.reload();await popup.waitForTimeout(300);assert.equal((await state()).state,null);
  log('Clear removes shared rule, peer schedules and future auto-start');
  await command('start',{seconds:600});await command('stop');
  console.log(`${plain?'':'🌐 '}Closing test pages before browser restart…`);
  await Promise.all(context.pages().map(page=>page.close()));
  await context.close();
  console.log(`${plain?'':'🌐 '}Relaunching the saved test profile…`);
  context=await launch();
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(15000);
  console.log(`${plain?'':'🌐 '}Opening the remembered page after restart…`);
  // Chrome may keep the extension worker asleep until a matching page sends ready.
  const restored=await context.newPage();await restored.goto(localUrl+'/page?demo=1');
  worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker',{timeout:15000});
  const inspected=await context.newPage();await inspected.goto(`chrome-extension://${extensionId}/popup.html`);
  await restored.bringToFront();await inspected.reload();await inspected.waitForTimeout(400);
  const persisted=await worker.evaluate(async()=>({local:await chrome.storage.local.get('rules'),session:await chrome.storage.session.get(['states','pauses'])}));
  assert.equal(persisted.local.rules[localUrl+'/page?demo=1'],600);
  assert.equal(Object.values(persisted.session.pauses || {}).some(x=>Object.values(x).includes(true)),false);
  assert.ok(Object.values(persisted.session.states).some(s=>s.status==='running'));
  log('Browser restart retains local rules, clears pauses, starts fresh timers');
  await mkdir('output/playwright',{recursive:true});
  await inspected.setViewportSize({width:400,height:700});
  await inspected.screenshot({path:'output/playwright/popup.png'});
  log('Browser checks passed; screenshot: output/playwright/popup.png');
} catch (error) {
  console.error(`${plain?'':'❌ '}Browser check failed: ${error.message.split('\n')[0]}`);
  if(process.argv.includes('--details'))console.error(error.stack);
  process.exitCode=1;
} finally {
  clearInterval(progress);await context?.close();server?.kill();await rm(profile,{recursive:true,force:true});
}
