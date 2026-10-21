(() => {
  if (globalThis.__autoRefreshCache) return;
  globalThis.__autoRefreshCache = true;
  let schedule = null;
  let timer;
  const key = () => { const url=new URL(location.href);url.hash='';return url.href; };
  const cancel = () => { clearTimeout(timer);schedule=null; };
  const ready = () => {
    if (document.readyState !== 'complete') return;
    chrome.runtime.sendMessage({type:'ready'}).catch(cancel);
  };
  const armTimer = () => {
    clearTimeout(timer);
    if (!schedule?.short) return;
    timer=setTimeout(() => {
      if (!schedule || key()!==schedule.url) { cancel(); return; }
      chrome.runtime.sendMessage({type:'due', token:schedule.token}).catch(cancel);
    },Math.max(0,schedule.due-Date.now()));
  };
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id!==chrome.runtime.id) return;
    if (message.type==='cancel') {
      if (schedule?.token===message.token) cancel();
      respond({ok:true});
    } else if (message.type==='sync') {
      if (schedule?.url!==key()) cancel();
      ready();respond({ok:true});
    } else if (message.type==='arm') {
      if (key()!==message.url || document.readyState!=='complete') { respond({ok:false});return; }
      schedule=message;armTimer();respond({ok:true});
    } else if (message.type==='reload') {
      if (schedule?.token!==message.token || key()!==message.url || Date.now()<message.due) { respond({ok:false});return; }
      cancel();respond({ok:true});location.reload();
    }
  });
  addEventListener('pagehide',cancel);
  addEventListener('pageshow', ready);
  if (document.readyState==='complete') ready();
  else addEventListener('load',ready,{once:true});
})();
