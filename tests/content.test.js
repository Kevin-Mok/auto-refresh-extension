import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const script=await readFile(new URL('../src/content.js',import.meta.url),'utf8');
function documentHarness() {
  let listener, reloads=0;
  const timers=[],sent=[], intervals=new Map();
  let intervalId=0;
  const location={href:'https://example.com/page#chat',reload:()=>reloads++};
  const sandbox={URL,location,document:{readyState:'complete'},Date:{now:()=>5000},
    setInterval:fn=>{intervals.set(++intervalId,fn);return intervalId;},clearInterval:id=>intervals.delete(id),
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},addEventListener:()=>{},
    chrome:{runtime:{id:'extension',onMessage:{addListener(fn){listener=fn;}},sendMessage:async msg=>{sent.push(msg);return{ok:true};}}},
  };
  vm.runInNewContext(script,sandbox);
  return {location,timers,sent,intervals,reloads:()=>reloads,send:msg=>{let answer;listener(msg,{id:'extension'},value=>answer=value);return answer;}};
}
const arm={type:'arm',url:'https://example.com/page',token:'current',due:5000,short:true};
test('document reload guard rejects stale tokens, cancelled schedules and changed routes',()=>{
  const doc=documentHarness();doc.send(arm);
  assert.equal(doc.send({type:'reload',...arm,type:'reload',token:'old'}).ok,false);
  doc.send({type:'cancel',token:'current'});doc.send({...arm,type:'reload'});assert.equal(doc.reloads(),0);
  doc.send(arm);doc.location.href='https://example.com/other';doc.send({...arm,type:'reload'});assert.equal(doc.reloads(),0);
  doc.timers.at(-1)();assert.equal(doc.sent.filter(msg=>msg.type==='due').length,0);
});
test('document accepts due valid reload exactly once; fragments do not change the page',()=>{
  const doc=documentHarness();doc.send(arm);doc.timers.at(-1)();
  assert.equal(doc.sent.at(-1).token,'current');
  doc.send({...arm,type:'reload'});doc.send({...arm,type:'reload'});assert.equal(doc.reloads(),1);
});
test('document rejects early reload and does not schedule a short timeout for long intervals',()=>{
  const doc=documentHarness();doc.send({...arm,due:6000,short:false});
  assert.equal(doc.timers.length,0);doc.send({...arm,type:'reload',due:6000});assert.equal(doc.reloads(),0);
});


test('armed documents update the toolbar with popup closed and stop after cancellation or route changes',()=>{
  const doc=documentHarness();doc.send({...arm,short:false});
  assert.equal(doc.intervals.size,1);
  [...doc.intervals.values()][0]();assert.equal(doc.sent.at(-1).type,'badge');
  assert.equal(doc.sent.at(-1).token,'current');
  doc.send({type:'cancel',token:'current'});assert.equal(doc.intervals.size,0);
  doc.send({...arm,short:false});doc.location.href='https://example.com/other';
  const before=doc.sent.length;[...doc.intervals.values()][0]();
  assert.equal(doc.sent.length,before);assert.equal(doc.intervals.size,0);
});
