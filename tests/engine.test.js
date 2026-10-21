import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/engine.js';

const url = 'https://example.com/page?q=1';
function setup({ rules = {}, session = {}, denied = false } = {}) {
  let time = 100000;
  const tabs = new Map([1,2].map(id => [id, {id, url, status:'complete', documentId:`doc${id}`} ]));
  const alarms = new Map(), messages = [], reloads = [], badges = new Map(), titles = new Map();
  const local = {rules}, data = structuredClone(session);
  const api = {
    action:{setBadgeText:async({tabId,text})=>badges.set(tabId,text),setTitle:async({tabId,title})=>titles.set(tabId,title),setBadgeBackgroundColor:async()=>{},setBadgeTextColor:async()=>{}},
    storage: {
      local: {get: async () => structuredClone(local), set: async x => Object.assign(local, structuredClone(x))},
      session: {get: async () => structuredClone(data), set: async x => Object.assign(data, structuredClone(x))},
    },
    permissions: {contains: async () => !denied},
    scripting: {getRegisteredContentScripts:async()=>[], registerContentScripts:async()=>{}, unregisterContentScripts:async()=>{}, executeScript:async()=>{}},
    tabs: {
      query:async()=>[...tabs.values()], get:async id=>{if(!tabs.has(id))throw Error('closed');return tabs.get(id);},
      sendMessage:async(id,msg,options)=>{messages.push({id,...msg}); if(msg.type==='reload')reloads.push(id);return {ok:true};},
    },
    webNavigation:{getFrame:async({tabId})=>({documentId:tabs.get(tabId)?.documentId})},
    alarms:{create:async(n,a)=>alarms.set(n,a),clear:async n=>alarms.delete(n),getAll:async()=>[...alarms].map(([name,a])=>({name,scheduledTime:a.when}))},
  };
  const engine = new Engine(api, ()=>time);
  return {engine,api,tabs,alarms,messages,reloads,local,data,badges,titles,tick:n=>time+=n};
}
async function ready(f,id=1){const tab=f.tabs.get(id);await f.engine.ready(id,tab.url,tab.documentId);}

test('unsaved pages stay inactive; 1/29 use document timers and 30/600 use one-shot alarms', async () => {
  const f=setup();await f.engine.init();await ready(f);
  assert.equal(f.engine.states[1],undefined);
  for(const seconds of [1,29,30,600]){
    await f.engine.start(1,url,seconds);
    assert.equal(f.engine.states[1].due,100000+seconds*1000);
    assert.equal(f.alarms.size,seconds>=30?2:0);
    assert.equal(f.messages.filter(x=>x.type==='arm').at(-1).short,seconds<30);
  }
});
test('new tabs count independently; changing shared interval preserves paused peers', async () => {
  const f=setup({rules:{[url]:600}});await f.engine.init();await ready(f);const first=f.engine.states[1].due;
  f.tick(5000);await ready(f,2); // init may have already reconciled tab 2: simulate a new document
  f.tabs.set(3,{id:3,url,status:'complete',documentId:'doc3'});await ready(f,3);
  assert.equal(f.engine.states[1].due,first);assert.equal(f.engine.states[3].due,705000);
  await f.engine.stop(2,url);await f.engine.start(1,url,30);
  assert.equal(f.engine.states[1].due,135000);assert.equal(f.engine.states[3].due,135000);
  assert.equal(f.engine.states[2].status,'paused');
});
test('pause survives reload, SPA away/back and worker suspension; resume starts fresh', async () => {
  const f=setup({rules:{[url]:30}});await f.engine.init();await f.engine.stop(1,url);
  f.tabs.get(1).documentId='reloaded';await f.engine.navigation({tabId:1,url,documentId:'reloaded',frameId:0});await ready(f);
  assert.equal(f.engine.states[1].status,'paused');
  f.tabs.get(1).url='https://example.com/other';await f.engine.navigation({tabId:1,url:f.tabs.get(1).url,documentId:'reloaded',frameId:0});
  f.tabs.get(1).url=url;await f.engine.navigation({tabId:1,url,documentId:'reloaded',frameId:0});await ready(f);
  const restarted=new Engine(f.api,()=>120000);await restarted.init();
  assert.equal(restarted.states[1].status,'paused');
  await restarted.start(1,url,30);assert.equal(restarted.states[1].due,150000);
  await restarted.closed(1);assert.equal(restarted.pauses[1],undefined);
});
test('worker restart preserves valid due times; browser restart uses fresh session', async () => {
  const f=setup({rules:{[url]:600}});await f.engine.init();const due=f.engine.states[1].due;
  f.tick(4000);const restarted=new Engine(f.api,()=>104000);await restarted.init();assert.equal(restarted.states[1].due,due);
  const fresh=setup({rules:f.local.rules});fresh.tick(10000);await fresh.engine.init();assert.equal(fresh.engine.states[1].due,710000);
});
test('Clear cancels all matching tabs, removes pauses, and future visits stay off', async () => {
  const f=setup({rules:{[url]:30}});await f.engine.init();const stale={...f.engine.states[1]};
  await f.engine.stop(2,url);await f.engine.clear(url);
  assert.deepEqual(f.local.rules,{});assert.equal(f.alarms.size,0);assert.deepEqual(f.engine.pauses,{});
  await f.engine.fire(1,stale.token);await ready(f);assert.equal(f.reloads.length,0);assert.equal(f.engine.states[1],undefined);
});
test('stale, early, stopped, navigated and replaced callbacks cannot reload', async () => {
  const f=setup({rules:{[url]:1}});await f.engine.init();const token=f.engine.states[1].token;
  await f.engine.fire(1,token);assert.equal(f.reloads.length,0);
  f.tick(1000);await f.engine.stop(1,url);await f.engine.fire(1,token);assert.equal(f.reloads.length,0);
  await f.engine.start(1,url,1);await f.engine.fire(1,token);assert.equal(f.reloads.length,0);
  const next=f.engine.states[1].token;f.tick(1000);f.tabs.get(1).url='https://example.com/elsewhere';
  await f.engine.fire(1,next);assert.equal(f.reloads.length,0);
});
test('due schedules reload once; missed intervals never replay in bursts', async () => {
  const f=setup({rules:{[url]:30}});await f.engine.init();const token=f.engine.states[1].token;
  f.tick(999999);await f.engine.fire(1,token);await f.engine.fire(1,token);
  assert.deepEqual(f.reloads,[1]);assert.notEqual(f.engine.states[1]?.status,'running');
});
test('denied/revoked permissions and unavailable documents never report running', async () => {
  const denied=setup({rules:{[url]:30},denied:true});await denied.engine.init();
  await assert.rejects(()=>denied.engine.start(1,url,30));assert.notEqual(denied.engine.states[1]?.status,'running');
  const f=setup({rules:{[url]:30}});await f.engine.init();f.api.permissions.contains=async()=>false;
  await f.engine.reconcile();assert.notEqual(f.engine.states[1]?.status,'running');assert.equal(f.alarms.size,0);
  f.api.permissions.contains=async()=>true;f.api.tabs.sendMessage=async()=>{throw Error('cannot reach document');};
  await f.engine.reconcile();assert.notEqual(f.engine.states[1]?.status,'running');
});
test('old documents and fragment changes cannot reset current countdown', async () => {
  const f=setup({rules:{[url]:600}});await f.engine.init();const token=f.engine.states[1].token;
  await f.engine.ready(1,url,'old-doc');assert.equal(f.engine.states[1].token,token);
  f.tabs.get(1).url=url+'#chat';await f.engine.navigation({tabId:1,url:url+'#chat',documentId:'doc1',frameId:0});
  assert.equal(f.engine.states[1].token,token);
});

test('worker restart and duplicate ready preserve the actual alarm deadline', async () => {
  const f=setup({rules:{[url]:30}});await f.engine.init();
  const name=[...f.alarms.keys()].find(name=>name.startsWith('refresh:1:'));
  assert.equal(f.alarms.get(name).when,130000);
  f.tick(25000);await ready(f);assert.equal(f.alarms.get(name).when,130000);
  const restarted=new Engine(f.api,()=>125000);await restarted.init();
  assert.equal(f.alarms.get(name).when,130000);
});
test('Resume only restarts this tab when the saved interval is unchanged', async () => {
  const f=setup({rules:{[url]:600}});await f.engine.init();await f.engine.stop(1,url);
  const peerToken=f.engine.states[2].token, peerDue=f.engine.states[2].due;
  f.tick(10000);await f.engine.start(1,url,600);
  assert.equal(f.engine.states[2].token,peerToken);assert.equal(f.engine.states[2].due,peerDue);
  assert.equal(f.engine.states[1].due,710000);
});

test('Stop from a stale popup cannot cancel a newly navigated page timer', async()=>{
  const other='https://example.com/other';
  const f=setup({rules:{[url]:30,[other]:600}});await f.engine.init();
  f.tabs.get(1).url=other;await f.engine.navigation({tabId:1,url:other,documentId:'doc1',frameId:0});await ready(f);
  const token=f.engine.states[1].token;
  await assert.rejects(()=>f.engine.stop(1,url),/changed/i);
  assert.equal(f.engine.states[1].token,token);assert.equal(f.engine.pauses[1],undefined);
});


test('toolbar shows remaining whole seconds independently and clears inactive badges', async()=>{
  const f=setup({rules:{[url]:600}});await f.engine.init();
  assert.equal(f.badges.get(1),'600');
  f.tick(3100);await f.engine.badge(1);
  assert.equal(f.badges.get(1),'597');
  assert.match(f.titles.get(1),/597 seconds/);
  await f.engine.stop(1,url);assert.equal(f.badges.get(1),'');
  assert.equal(f.badges.get(2),'597');
  await f.engine.start(1,url,600);assert.equal(f.badges.get(1),'600');
  f.tabs.get(1).url='https://example.com/away';
  await f.engine.navigation({tabId:1,url:f.tabs.get(1).url,documentId:'doc1',frameId:0});
  assert.equal(f.badges.get(1),'');
  await f.engine.clear(url);assert.equal(f.badges.get(2),'');
});
test('toolbar reaches zero when overdue and clears while reloading', async()=>{
  const f=setup({rules:{[url]:1}});await f.engine.init();f.tick(1500);
  await f.engine.badge(1);assert.equal(f.badges.get(1),'0');
  await f.engine.fire(1,f.engine.states[1].token);assert.equal(f.badges.get(1),'');
});
