import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const plain=process.argv.includes('--plain');
const say=(message,emoji='✅')=>console.log(`${plain?'':emoji+' '}${message}`);
const option=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
if(process.argv.includes('--help')){
  say('Store artwork: node scripts/capture-store.mjs [--playwright /path/to/index.mjs] [--chromium /path/to/chrome] [--plain]','🎨');
  say('Creates the padded 128px icon and store-assets/*.png from an isolated release candidate. Native site permission remains a manual check.','📋');
  process.exit(0);
}
const modulePath=option('--playwright');
const {chromium}=await import(modulePath?pathToFileURL(resolve(modulePath)).href:'playwright');
const root=resolve('.'), out=join(root,'store-assets');
const temp=await mkdtemp(join(tmpdir(),'auto-refresh-artwork-'));
const extension=join(temp,'extension');
let context, server, progress;
const started=Date.now();
const verifySize=async(path,width,height)=>{
  const bytes=await readFile(path);
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
};
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
try{
  await mkdir(out,{recursive:true});await mkdir('output/playwright',{recursive:true});
  progress=setInterval(()=>console.error(`${plain?'':'⏱️ '}Store capture active | ${Math.floor((Date.now()-started)/1000)}s`),15000);
  say('Launching isolated release-candidate capture...','🎨');
  // The candidate comes from release.py's allowlisted installation folder, never a normal browser profile.
  const {version}=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
  await cp(join(root,`artifacts/auto-refresh-cache-${version}`),extension,{recursive:true});
  const manifest=JSON.parse(await readFile(join(extension,'manifest.json'),'utf8'));
  // Headless Chromium cannot accept the native dialog; only the disposable copy pregrants loopback.
  manifest.host_permissions=['http://127.0.0.1/*'];
  await writeFile(join(extension,'manifest.json'),JSON.stringify(manifest));
  context=await chromium.launchPersistentContext(join(temp,'profile'),{
    executablePath:option('--chromium'),headless:true,
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--no-sandbox'],
  });
  context.setDefaultTimeout(15000);
  const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extensionId=new URL(worker.url()).host;
  server=spawn(process.execPath,['scripts/demo-server.js','--plain'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
  const localUrl=await new Promise((resolve,reject)=>{
    server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(data.toString());if(match)resolve(match[0]);});
    server.once('error',reject);server.once('exit',code=>reject(Error(`Fixture exited ${code}`)));
  });
  const fixture=await context.newPage();await fixture.goto(localUrl+'/page?demo=1');
  const popup=await context.newPage();await fixture.bringToFront();await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForFunction(()=>!document.getElementById('start').disabled);
  await popup.fill('#minutes','0');await popup.fill('#seconds','600');await popup.click('#start');
  await popup.waitForFunction(()=>document.getElementById('status').textContent==='Running');
  assert.equal(await popup.inputValue('#minutes'),'10');assert.equal(await popup.inputValue('#seconds'),'0');
  const tabId=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(tab=>tab.url===url).id,fixture.url());
  const badge=()=>worker.evaluate(id=>chrome.action.getBadgeText({tabId:id}),tabId);
  assert.ok(Number(await badge())>=595,'Real running timer must update action badge');
  await popup.setViewportSize({width:376,height:800});
  assert.ok(await noOverflow(popup));
  const raw=join(out,'popup-running.png');await popup.locator('body').screenshot({path:raw});
  await popup.close();await fixture.bringToFront();const initial=Number(await badge());
  await fixture.waitForTimeout(2100);assert.ok(Number(await badge())<initial,'Badge must count down with popup closed');
  say('Genuine popup captured after Start 600 seconds; normalized 10m 0s, Running, and closed-popup badge verified.');

  const page=await context.newPage();
  for(const name of ['help.html','privacy.html']){
    for(const width of [390,1100]){
      await page.setViewportSize({width,height:850});await page.goto(`chrome-extension://${extensionId}/${name}`);
      assert.ok(await noOverflow(page),`${name} must fit ${width}px`);
      assert.equal(await page.locator('h1').count(),1);assert.ok(await page.locator('h2').count()>0);
      for(const link of await page.locator('a').all())assert.ok((await link.innerText()).trim() || await link.getAttribute('aria-label'),'Links need accessible names');
      await page.screenshot({path:`output/playwright/${name.replace('.html','')}-${width}.png`,fullPage:true});
    }
  }
  say('Help and privacy checked at 390px and 1100px: no horizontal overflow, headings and named links.');
  const original=await readFile(join(root,'icons/refresh.svg'),'utf8');
  const padded=original.replace('viewBox="0 0 128 128"','viewBox="4 4 120 120" x="16" y="16" width="96" height="96"').replace('width="128" height="128" ','');
  await page.setViewportSize({width:128,height:128});
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style><svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">${padded}</svg>`);
  await page.screenshot({path:join(root,'icons/refresh-128.png'),omitBackground:true});
  await verifySize(join(root,'icons/refresh-128.png'),128,128);
  // Assert transparent store padding and a visible 96px square artwork region.
  const icon=await readFile(join(root,'icons/refresh-128.png'));
  const pixels=await page.evaluate(async data=>{
    const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const c=canvas.getContext('2d');c.drawImage(image,0,0);const d=c.getImageData(0,0,128,128).data;let minX=128,minY=128,maxX=-1,maxY=-1;
    for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(d[(y*128+x)*4+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    return [minX,minY,maxX,maxY];
  },'data:image/png;base64,'+icon.toString('base64'));
  assert.deepEqual(pixels,[16,16,111,111]);
  const iconUrl='data:image/png;base64,'+icon.toString('base64');
  const popupUrl='data:image/png;base64,'+(await readFile(raw)).toString('base64');
  const css=`*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#171c1d;color:#eaf0ef;font-family:"Segoe UI",system-ui,sans-serif}h1,p{margin:0}.teal{color:#72deca}`;
  await page.setViewportSize({width:1280,height:800});
  await page.setContent(`<style>${css}.left{position:absolute;left:76px;top:78px;width:606px}.brand{display:flex;align-items:center;gap:16px;font-size:22px;font-weight:650;margin-bottom:58px}.brand img{width:56px;height:56px}h1{font-size:62px;line-height:1.1;letter-spacing:-2.7px;margin-bottom:28px}.intro{color:#b5c6c2;font-size:23px;line-height:1.55;max-width:520px}.features{margin-top:36px;font-size:18px;line-height:2.1;color:#d4e1df}.features span{color:#72deca;margin-right:10px}.caption{position:absolute;left:76px;bottom:50px;width:600px;font-size:13px;color:#aebfbd;line-height:1.6}.capture{position:absolute;right:78px;top:42px;width:378px;border:1px solid #485655;border-radius:12px;overflow:hidden;box-shadow:0 18px 55px #0005}.capture img{display:block;width:376px}.rule{position:absolute;left:716px;top:58px;bottom:58px;width:1px;background:#344041}</style><div class="left"><div class="brand"><img src="${iconUrl}" alt="">Auto Refresh Cache</div><h1>Remember the page.<br><span class="teal">Refresh on repeat.</span></h1><p class="intro">Set minutes and seconds. Keep an independent timer for each matching tab.</p><div class="features"><div><span>↻</span>Seconds remaining on the toolbar badge</div><div><span>↻</span>Saved intervals across browser restarts</div><div><span>↻</span>Pause one tab. Keep the others running.</div></div></div><div class="rule"></div><div class="capture"><img src="${popupUrl}" alt="Actual running extension popup"></div><p class="caption">Actual extension popup on a local demonstration page.<br>Chrome may delay refreshes and badge updates in background tabs.</p>`);
  await page.locator('.capture img').evaluate(image=>image.decode());
  assert.ok(await noOverflow(page));
  assert.ok(await page.locator('.capture').evaluate(el=>el.getBoundingClientRect().bottom<=800),'Popup must fit screenshot');
  await page.screenshot({path:join(out,'screenshot-1280x800.png')});
  await verifySize(join(out,'screenshot-1280x800.png'),1280,800);
  await page.setViewportSize({width:440,height:280});
  await page.setContent(`<style>${css}.tile{padding:28px 30px}.brand{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:650;margin-bottom:22px}.brand img{width:48px;height:48px}h1{font-size:32px;line-height:1.15;letter-spacing:-1px}p{color:#b5c6c2;font-size:14px;margin-top:18px;line-height:1.5}.line{position:absolute;bottom:0;height:6px;background:#72deca;width:100%}</style><div class="tile"><div class="brand"><img src="${iconUrl}" alt="">Auto Refresh Cache</div><h1>Remember the page.<br><span class="teal">Refresh on repeat.</span></h1><p>Exact-page intervals. Independent tab timers.<br>Seconds remaining on your toolbar badge.</p></div><div class="line"></div>`);
  await page.locator('img').evaluate(image=>image.decode());assert.ok(await noOverflow(page));
  await page.screenshot({path:join(out,'promo-440x280.png')});await verifySize(join(out,'promo-440x280.png'),440,280);
  say('Store assets ready: screenshot 1280x800, small promo 440x280, genuine popup, padded 128px store icon.');
}catch(error){
  console.error(`${plain?'Error:':'❌ Error:'} ${error.message}`);process.exitCode=1;
}finally{
  clearInterval(progress);await context?.close();server?.kill();await rm(temp,{recursive:true,force:true});
}
