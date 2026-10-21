import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';

async function fixture(env={}) {
  const child=spawn(process.execPath,['scripts/demo-server.js','--plain'],{env:{...process.env,PORT:'0',...env},stdio:['ignore','pipe','pipe']});
  let output='';
  const ready=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Fixture never announced a listening URL')),2000);
    child.stdout.on('data',data=>{output+=data;const match=/http:\/\/127\.0\.0\.1:\d+/.exec(output);if(match){clearTimeout(timeout);resolve(match[0]);}});
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);reject(Error(`Fixture exited ${code}`));});
  });
  return {child,ready};
}
test('demo serves observable reload timestamps',async()=>{
  const {child,ready}=await fixture();
  try {const url=await ready;const response=await fetch(url+'/page?demo=1');assert.equal(response.status,200);assert.match(await response.text(),/id="served"/);}
  finally {child.kill();}
});
test('demo chooses another port without disturbing an occupied listener',async()=>{
  const occupied=http.createServer((req,res)=>res.end('original'));
  await new Promise(resolve=>occupied.listen(0,'127.0.0.1',resolve));
  const {child,ready}=await fixture({PORT:String(occupied.address().port)});
  try {
    const url=await ready;assert.notEqual(new URL(url).port,String(occupied.address().port));
    assert.equal(await (await fetch(`http://127.0.0.1:${occupied.address().port}`)).text(),'original');
  }finally {child.kill();occupied.close();}
});
