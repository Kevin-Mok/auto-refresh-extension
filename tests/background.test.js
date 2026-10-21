import test from 'node:test';
import assert from 'node:assert/strict';

test('trusted popup messages work both as a toolbar popup and an extension tab', async()=>{
  let listener;
  const event={addListener(){}};
  const popup='chrome-extension://fixture/popup.html';
  globalThis.chrome={
    storage:{local:{get:async()=>({}),set:async()=>{}},session:{get:async()=>({}),set:async()=>{}}},
    permissions:{contains:async()=>false,onRemoved:event},
    scripting:{getRegisteredContentScripts:async()=>[]},
    alarms:{getAll:async()=>[],onAlarm:event},
    tabs:{query:async()=>[],get:async id=>({id,url:'https://example.com/'}),onUpdated:event,onRemoved:event},
    webNavigation:{onCommitted:event,onHistoryStateUpdated:event,onReferenceFragmentUpdated:event},
    runtime:{getURL:()=>popup,onMessage:{addListener(fn){listener=fn;}},onStartup:event,onInstalled:event},
  };
  try {
    await import('../src/background.js?test');
    for(const sender of [{url:popup},{url:popup,tab:{id:2},frameId:0,documentId:'popup-doc'}]){
      let response;
      const held=listener({type:'view',tabId:1},sender,value=>response=value);
      assert.equal(held,true,'trusted popup must keep the response channel open');
      await new Promise(resolve=>setImmediate(resolve));
      assert.equal(response?.ok,true);
      assert.equal(response.value.url,'https://example.com/');
    }
  }finally {delete globalThis.chrome;}
});
