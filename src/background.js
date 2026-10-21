import { Engine } from './engine.js';
import { pageKey } from './rules.js';

const engine=new Engine(chrome);
// One queue serializes rule edits, navigation, and timer deliveries across awaits.
let queue=engine.init();
function run(action) {
  const result=queue.then(action);
  queue=result.catch(error=>console.warn('Auto Refresh Cache:',error.message));
  return result;
}

chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  let action;
  if (sender.url===chrome.runtime.getURL('popup.html')) {
    if (message.type==='view') action=async()=>{
      const tab=await chrome.tabs.get(message.tabId);
      const url=pageKey(tab.url);
      const allowed=url && await engine.allowed(url);
      const state=engine.states[tab.id];
      return {url,rawUrl:tab.url || '',rules:engine.rules,seconds:engine.rules[url],
        state:state?.url===url?state:null,allowed,paused:!!engine.pauses[tab.id]?.[url]};
    };
    if (message.type==='start') action=()=>engine.start(message.tabId,message.url,message.seconds);
    if (message.type==='stop') action=()=>engine.stop(message.tabId,message.url);
    if (message.type==='clear') action=()=>engine.clear(message.url);
  } else if (sender.tab && sender.frameId===0 && sender.documentId) {
    if (message.type==='ready') action=()=>engine.ready(sender.tab.id,sender.url,sender.documentId);
    if (message.type==='due') action=()=>{
      const state=engine.states[sender.tab.id];
      if (state?.documentId!==sender.documentId || state.url!==pageKey(sender.url)) return;
      return engine.fire(sender.tab.id,message.token);
    };
  }
  if (!action) return;
  run(action).then(value=>respond({ok:true,value}),error=>respond({ok:false,error:error.message}));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm=>{
  const match=/^refresh:(\d+):(.+)$/.exec(alarm.name);
  if(match)run(()=>engine.fire(Number(match[1]),match[2]));
});
chrome.webNavigation.onCommitted.addListener(details=>run(()=>engine.navigation(details)));
chrome.webNavigation.onHistoryStateUpdated.addListener(details=>run(()=>engine.navigation(details)));
chrome.webNavigation.onReferenceFragmentUpdated.addListener(details=>run(()=>engine.navigation(details)));
chrome.tabs.onRemoved.addListener(id=>run(()=>engine.closed(id)));
chrome.tabs.onUpdated.addListener((id,change)=>{
  if(change.status==='complete')run(async()=>{
    const tab=await chrome.tabs.get(id);
    const url=pageKey(tab.url);
    if(url && engine.rules[url] && await engine.allowed(url)) {
      const frame=await chrome.webNavigation.getFrame({tabId:id,frameId:0});
      if(frame)await engine.ready(id,url,frame.documentId);
    }
  });
});
chrome.permissions.onRemoved.addListener(()=>run(()=>engine.reconcile()));
chrome.runtime.onStartup.addListener(()=>run(()=>engine.reconcile()));
chrome.runtime.onInstalled.addListener(()=>run(()=>engine.reconcile()));
