import { parseInterval, duration, sitePattern } from './rules.js';
const $=id=>document.getElementById(id);
let tabId, view, busy=false, initialized=false, listSignature='';
const error=message=>{ $('error').textContent=message; $('error').hidden=!message; };
async function send(message) {
  const result=await chrome.runtime.sendMessage({...message,tabId});
  if(!result?.ok)throw new Error(result?.error || 'The extension is unavailable. Reopen the popup.');
  return result.value;
}
function tick() {
  const state=view?.state;
  if(state?.status==='running' && view.allowed) {
    const remaining=Math.max(0,Math.ceil((state.due-Date.now())/1000));
    $('countdown').textContent=remaining ? `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Due…';
  } else $('countdown').textContent='—';
}
async function refresh() {
  view=await send({type:'view'});
  $('page').textContent=view.url || view.rawUrl || 'This page is unavailable.';
  const saved=!!view.seconds;
  const running=view.allowed && view.state?.status==='running';
  const paused=saved && view.paused;
  let status=!view.url?'Unsupported page':!saved?'Not started':!view.allowed?'Site access needed':paused?'Paused in this tab':running?'Running':view.state?.status==='error'?'Unable to start':'Waiting for page';
  $('status').textContent=status;$('status').dataset.running=String(!!running);
  $('scope').textContent=saved?`Saved interval · ${duration(view.seconds)}`:'Start to remember this exact page';
  $('start').disabled=busy || !view.url;
  $('start').textContent=paused?'Resume':saved?'Update & restart':'Start';
  $('stop').hidden=!running;$('clear').hidden=!saved;
  if(!initialized){const seconds=view.seconds || 600;$('minutes').value=Math.floor(seconds/60);$('seconds').value=seconds%60;initialized=true;}
  const signature=JSON.stringify(view.rules);
  if(signature!==listSignature){
    listSignature=signature;$('saved-list').replaceChildren();
    const entries=Object.entries(view.rules).sort(([a],[b])=>a.localeCompare(b));
    $('saved-count').textContent=entries.length;
    if(!entries.length){const p=document.createElement('p');p.className='empty';p.textContent='No saved pages yet. Start a timer to add one.';$('saved-list').append(p);}
    for(const [url,seconds] of entries){
      const li=document.createElement('li'),info=document.createElement('div'),p=document.createElement('p'),small=document.createElement('span'),button=document.createElement('button');
      p.textContent=url;small.textContent=duration(seconds);small.className='small';info.append(p,small);
      button.textContent='Clear';button.setAttribute('aria-label',`Clear auto refresh for ${url}`);button.onclick=()=>act(()=>send({type:'clear',url}));
      li.append(info,button);$('saved-list').append(li);
    }
  }
  tick();
}
async function act(action) {
  if(busy)return;busy=true;error('');
  for(const button of document.querySelectorAll('button'))button.disabled=true;
  try {await action();}catch(e){error(e.message);}
  finally {busy=false;for(const button of document.querySelectorAll('button'))button.disabled=false;await refresh().catch(e=>error(e.message));}
}
$('form').addEventListener('submit',event=>{
  event.preventDefault();if(busy || !view?.url)return;
  let seconds;
  try {seconds=parseInterval($('minutes').value,$('seconds').value);}catch(e){error(e.message);return;}
  // Invoke request directly in the gesture, before awaiting anything.
  const permission=chrome.permissions.request({origins:[sitePattern(view.url)]});
  act(async()=>{
    if(!await permission)throw new Error('Site access was denied. Click Start and allow this site to remember refreshes.');
    await send({type:'start',url:view.url,seconds});
    $('minutes').value=Math.floor(seconds/60);$('seconds').value=seconds%60;
  });
});
$('stop').onclick=()=>act(()=>send({type:'stop',url:view.url}));
$('clear').onclick=()=>act(()=>send({type:'clear',url:view.url}));
try {
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});tabId=tab?.id;
  if(!tabId)throw new Error('No active tab. Open a web page first.');
  await refresh();
  setInterval(()=>{if(!busy)refresh().catch(e=>error(e.message));},1000);
}catch(e){error(e.message);$('status').textContent='Unavailable';}
