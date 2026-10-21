import { cleanRules, pageKey, sitePattern, validSeconds } from './rules.js';

const alarmName = (id, token) => `refresh:${id}:${token}`;

export class Engine {
  constructor(api, now = Date.now) {
    this.api = api;
    this.now = now;
    this.rules = {};
    this.states = {};
    this.pauses = {};
  }

  async init() {
    const [local, session] = await Promise.all([
      this.api.storage.local.get('rules'), this.api.storage.session.get(['states', 'pauses']),
    ]);
    this.rules = cleanRules(local.rules);
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    this.pauses = Object.fromEntries(Object.entries(object(session.pauses) ? session.pauses : {})
      .filter(([id, urls]) => /^\d+$/.test(id) && object(urls))
      .map(([id, urls]) => [id, Object.fromEntries(Object.entries(urls).filter(([url, paused]) => this.rules[url] && paused === true))]));
    this.states = Object.fromEntries(Object.entries(object(session.states) ? session.states : {})
      .filter(([id, state]) => /^\d+$/.test(id) && object(state) && this.rules[state.url] &&
        typeof state.token === 'string' && typeof state.documentId === 'string' &&
        Number.isSafeInteger(state.due) && state.due >= 0 &&
        ['running', 'paused', 'loading', 'error'].includes(state.status)));
    await this.reconcile();
  }

  async save() {
    await this.api.storage.session.set({states:this.states, pauses:this.pauses});
  }

  async allowed(url) {
    return this.api.permissions.contains({origins:[sitePattern(url)]});
  }

  async current(id, url, documentId) {
    try {
      const tab = await this.api.tabs.get(id);
      if (pageKey(tab.url) !== url) return false;
      const frame = await this.api.webNavigation.getFrame({tabId:id, frameId:0});
      return frame?.documentId === documentId;
    } catch { return false; }
  }

  async message(id, state, message) {
    return this.api.tabs.sendMessage(Number(id), message, {documentId:state.documentId});
  }

  async cancel(id) {
    const state = this.states[id];
    delete this.states[id];
    if (!state) return;
    await this.api.alarms.clear(alarmName(id, state.token));
    try { await this.message(id, state, {type:'cancel', token:state.token}); } catch { /* Document already gone. */ }
  }

  async registrations() {
    const patterns = [...new Set(Object.keys(this.rules).map(sitePattern))];
    const allowed = [];
    for (const pattern of patterns) if (await this.api.permissions.contains({origins:[pattern]})) allowed.push(pattern);
    const existing = await this.api.scripting.getRegisteredContentScripts();
    const ours = existing.filter(script => script.id === 'remembered-pages');
    if (ours.length && JSON.stringify(ours[0].matches?.slice().sort()) !== JSON.stringify(allowed.slice().sort())) {
      await this.api.scripting.unregisterContentScripts({ids:['remembered-pages']});
    } else if (ours.length) return;
    if (allowed.length) await this.api.scripting.registerContentScripts([{
      id:'remembered-pages', matches:allowed, js:['src/content.js'],
      runAt:'document_idle', persistAcrossSessions:true, allFrames:false,
    }]);
  }

  async reconcile() {
    await this.registrations();
    const tabs = await this.api.tabs.query({});
    const open = new Set(tabs.map(tab=>String(tab.id)));
    for (const id of new Set([...Object.keys(this.states), ...Object.keys(this.pauses)])) {
      if (!open.has(id)) { await this.cancel(id); delete this.pauses[id]; }
    }
    for (const tab of tabs) {
      const url = pageKey(tab.url);
      if (!url || !this.rules[url] || !await this.allowed(url)) { await this.cancel(tab.id); continue; }
      if (tab.status !== 'complete') continue;
      try {
        await this.api.scripting.executeScript({target:{tabId:tab.id}, files:['src/content.js']});
        const frame = await this.api.webNavigation.getFrame({tabId:tab.id, frameId:0});
        if (frame?.documentId) await this.ready(tab.id,url,frame.documentId);
      } catch (error) { await this.fail(tab.id,url,error); }
    }
    const alarms = await this.api.alarms.getAll();
    for (const alarm of alarms) {
      if (!alarm.name.startsWith('refresh:')) continue;
      if (!Object.entries(this.states).some(([id,state]) => state.status==='running' && alarm.name===alarmName(id,state.token))) await this.api.alarms.clear(alarm.name);
    }
    await this.save();
  }

  async fail(id, url, error) {
    const old = this.states[id];
    await this.cancel(id);
    this.states[id] = {url, documentId:old?.documentId || '', token:crypto.randomUUID(), due:0, status:'error', error:'Page access unavailable. Open this page and click Start to grant access.'};
    console.warn('Auto Refresh Cache:', error?.message || error);
    await this.save();
  }

  async ready(id, value, documentId) {
    const url = pageKey(value);
    if (!url || !await this.current(id,url,documentId)) return;
    if (!this.rules[url] || !await this.allowed(url)) { await this.cancel(id); await this.save(); return; }
    let state = this.states[id];
    const paused = this.pauses[id]?.[url] === true;
    if (state?.url !== url || state?.documentId !== documentId || !['running','paused'].includes(state?.status) || (state.status === 'paused') !== paused) {
      await this.cancel(id);
      state = {url, documentId, token:crypto.randomUUID(), due:paused ? 0 : this.now()+this.rules[url]*1000, status:paused?'paused':'running'};
      this.states[id] = state;
    }
    await this.save();
    if (state.status === 'paused') return;
    try {
      const answer = await this.message(id,state,{type:'arm', url, token:state.token, due:state.due, short:this.rules[url]<30});
      if (!answer?.ok) throw new Error('Page did not acknowledge timer.');
      if (this.rules[url]>=30) {
        const name=alarmName(id,state.token);
        const existing=(await this.api.alarms.getAll()).some(alarm=>alarm.name===name);
        if (!existing) await this.api.alarms.create(name, {when:state.due});
      }
    } catch (error) { await this.fail(id,url,error); }
  }

  async start(id, value, seconds) {
    const url = pageKey(value);
    if (!url || !validSeconds(seconds)) throw new Error('Choose a supported HTTP(S) page and a valid whole-second interval.');
    const tab = await this.api.tabs.get(id);
    if (pageKey(tab.url)!==url) throw new Error('The tab changed. Reopen the popup.');
    if (!await this.allowed(url)) throw new Error('Site access was not granted. Click Start and allow access.');
    const changed=this.rules[url]!==seconds;
    this.rules[url]=seconds;
    if (this.pauses[id]) { delete this.pauses[id][url]; if (!Object.keys(this.pauses[id]).length) delete this.pauses[id]; }
    await this.api.storage.local.set({rules:this.rules});
    for (const [tabId,state] of Object.entries(this.states)) if (state.url===url && (changed || Number(tabId)===id)) await this.cancel(tabId);
    await this.save();
    await this.reconcile();
  }

  async stop(id, value) {
    const url = pageKey(value);
    if (!url || !this.rules[url]) throw new Error('This page has no saved auto refresh.');
    const tab=await this.api.tabs.get(id);
    if (pageKey(tab.url)!==url) throw new Error('The tab changed. Reopen the popup.');
    this.pauses[id] ||= {};
    this.pauses[id][url]=true;
    const state=this.states[id];
    await this.cancel(id);
    if (state?.url===url) this.states[id]={...state, token:crypto.randomUUID(), due:0, status:'paused'};
    await this.save();
  }

  async clear(value) {
    const url=pageKey(value);
    if (!url) throw new Error('Unsupported page.');
    delete this.rules[url];
    await this.api.storage.local.set({rules:this.rules});
    for (const [id,urls] of Object.entries(this.pauses)) { delete urls[url]; if(!Object.keys(urls).length)delete this.pauses[id]; }
    for (const [id,state] of Object.entries(this.states)) if(state.url===url)await this.cancel(id);
    await this.registrations();
    await this.save();
  }

  async navigation({tabId, url:value, documentId, frameId}) {
    if (frameId!==0) return;
    const url=pageKey(value), state=this.states[tabId];
    if (state?.url===url && state.documentId===documentId) return;
    await this.cancel(tabId);
    await this.save();
    if (url && this.rules[url] && await this.allowed(url)) {
      try { await this.api.tabs.sendMessage(tabId,{type:'sync'}, {documentId}); } catch { /* New document sends ready at load. */ }
    }
  }

  async fire(id, token) {
    const state=this.states[id];
    if (!state || state.token!==token || state.status!=='running' || this.now()<state.due) return;
    if (!this.rules[state.url] || this.pauses[id]?.[state.url] || !await this.allowed(state.url) || !await this.current(Number(id),state.url,state.documentId)) {
      await this.cancel(id);await this.save();return;
    }
    // Consume before messaging so duplicate alarm/timeout deliveries cannot replay.
    state.status='loading';
    await this.save();
    try {
      const answer=await this.message(id,state,{type:'reload',url:state.url,token,due:state.due});
      if (!answer?.ok) throw new Error('Page changed before refresh.');
    } catch(error) { await this.fail(id,state.url,error); }
  }

  async closed(id) {
    await this.cancel(id);delete this.pauses[id];await this.save();
  }
}
