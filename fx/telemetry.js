// Anonymous FX telemetry: fixed metadata only; never send chat, input, URLs or error text.
export const FX_EVENT_NAMES = Object.freeze(['visit','screen_view','screen_exit','transition','heartbeat','day_start','day_end','trade_attempt','trade_open','trade_close','trade_rejected','story_seen','story_choice','item_unlocked','item_used','debuff_applied','news_seen','black_swan','mood_change','dialogue_turn','voice_play','voice_rejected','market_end','settlement_confirm','rest_start','rest_end','ending_seen','message_receive','session_end','error']);
const names = new Set(FX_EVENT_NAMES), tokens = new Set(['from','to','reason','build','direction','risk','pnlBucket','capitalBucket','toleranceBucket','mood','previousMood','story','choice','item','debuff','news','kind','code','returnGap','device','orientation','newsId','storyId','choiceId','itemId','debuffId','equityBucket','riskBucket','sanityBucket','channel','dialogueId']);
const numbers = new Set(['leverage','sizePct','durationMs','drawdownPct','tolerance','stress','turn','count','day','beat','stake','stop','duration','threshold']);
const booleans = new Set(['success','returning','muted']);
const uid = () => crypto.randomUUID();
const defaultStorage = name => { try { return globalThis[name]; } catch { return null; } };
const token = value => typeof value === 'string' && /^[a-zA-Z0-9_:.-]{0,80}$/.test(value);
export const capitalBucket = value => value < 10000 ? 'under-10k' : value < 30000 ? '10k-30k' : value < 100000 ? '30k-100k' : value < 300000 ? '100k-300k' : 'over-300k';
export const pnlBucket = value => value < -10000 ? 'loss-large' : value < -1000 ? 'loss-medium' : value < 0 ? 'loss-small' : value === 0 ? 'flat' : value < 1000 ? 'gain-small' : value < 10000 ? 'gain-medium' : 'gain-large';
export function sanitizeDetail(value = {}) {
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (tokens.has(key) && token(val)) result[key] = val;
    else if (numbers.has(key) && Number.isFinite(val)) result[key] = Math.max(0, Math.min(1000000, val));
    else if (booleans.has(key) && typeof val === 'boolean') result[key] = val;
  }
  return result;
}
const get = (storage, key) => { try { return storage?.getItem(key); } catch { return null; } };
const put = (storage, key, value) => { try { storage?.setItem(key, value); } catch {} };
const remove = (storage, key) => { try { storage?.removeItem(key); } catch {} };
const stableID = (storage, key) => { let value = get(storage, key); if (!value || !/^[a-zA-Z0-9_-]{8,80}$/.test(value)) { value = uid(); put(storage, key, value); } return value; };
export class FXTelemetry {
  constructor(options = {}) {
    this.storage = options.storage ?? defaultStorage('localStorage');
    this.sessionStorage = options.sessionStorage ?? defaultStorage('sessionStorage');
    this.document = options.document ?? globalThis.document;
    this.window = options.window ?? globalThis.window;
    this.navigator = options.navigator ?? globalThis.navigator;
    this.location = options.location ?? globalThis.location;
    this.fetch = options.fetch ?? globalThis.fetch?.bind(globalThis);
    this.now = options.now ?? (() => Date.now());
    this.monotonic = options.monotonic ?? (() => performance.now());
    this.dnt = this.navigator?.doNotTrack === '1' || this.window?.doNotTrack === '1' || this.navigator?.globalPrivacyControl === true;
    this.suspended = options.testMode === true;
    this.enabled = options.enabled !== false && !this.dnt && get(this.storage, 'fx-telemetry-enabled') !== 'false';
    const github = this.location?.origin === 'https://gongfpp.github.io';
    this.channel = github ? 'github-pages' : /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(this.location?.origin || '') ? 'local' : 'gpt-site';
    this.path = github ? '/leek-spire-pages/' : '/fx.html';
    this.endpoint = github ? 'https://leek-spire.gongfpp.chatgpt.site/api/events' : '/api/events';
    this.context = {screen: 'boot', run: '', day: 0};
    this.build = token(options.build || '') ? options.build || '' : '';
    this.queue = []; this.seen = new Set(); this.pending = false; this.active = 0; this.pageTime = 0; this.decision = 0; this.last = this.monotonic(); this.visible = !this.document?.hidden; this.lastScreen = ''; this.attempts = 0; this.retryAt = 0; this.ended = false; this.diagnostics = {dropped: 0, rejectedBatches: 0, retries: 0, lastStatus: 0}; this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};
    this.visitor = ''; this.session = '';
    if (this.enabled) this.start();
    else { remove(this.storage,'fx-telemetry-outbox'); remove(this.storage,'fx-anon-visitor'); remove(this.storage,'fx-last-visit'); remove(this.sessionStorage,'fx-anon-session'); remove(this.sessionStorage,'fx-telemetry-seen'); }
    this.onVisibility = () => { this.clock(); if (this.document?.hidden) { this.beat(); this.flush(true); } this.last = this.monotonic(); };
    this.onHide = () => { this.clock(); if (!this.ended) { this.emit('screen_exit', '', {activeMs: this.pageTime}); this.emit('session_end', '', {detail: {reason: 'pagehide'}}); this.ended = true; } this.beat(); this.pageTime = 0; this.flush(true); };
    this.onShow = event => { this.ended = false; this.last = this.monotonic(); this.visible = !this.document?.hidden; if(event.persisted) this.emit('screen_view'); };
    this.onOnline = () => { this.retryAt = 0; this.flush(); };
    this.document?.addEventListener('visibilitychange', this.onVisibility);
    this.window?.addEventListener('pagehide', this.onHide);
    this.window?.addEventListener('pageshow', this.onShow);
    this.window?.addEventListener('online', this.onOnline);
    // Error categories only. Stack/message/filename may contain private data.
    this.onError = () => this.emit('error', 'runtime', {detail: {code: 'runtime-error'}, dedupeKey: 'runtime-error'});
    this.onRejection = () => this.emit('error', 'runtime', {detail: {code: 'unhandled-rejection'}, dedupeKey: 'unhandled-rejection'});
    this.window?.addEventListener('error', this.onError);
    this.window?.addEventListener('unhandledrejection', this.onRejection);
    this.timer = options.autoTimer === false ? null : setInterval(() => { this.clock(); if (this.active >= 15000) this.beat(); this.flush(); }, 5000);
  }
  start() {
    this.visitor = stableID(this.storage, 'fx-anon-visitor'); this.session = stableID(this.sessionStorage, 'fx-anon-session');
    try { this.seen = new Set(JSON.parse(get(this.sessionStorage, 'fx-telemetry-seen') || '[]').filter(k => typeof k === 'string').slice(-1200)); } catch { this.seen = new Set(); }
    try { const saved = JSON.parse(get(this.storage, 'fx-telemetry-outbox') || '[]'); this.queue = saved.filter(e => this.now() - e.queuedAt < 86400000 && names.has(e.name) && e.visitor === this.visitor && /^[a-zA-Z0-9_-]{8,80}$/.test(e.id) && /^[a-zA-Z0-9_-]{8,80}$/.test(e.session) && token(e.run) && token(e.screen) && token(e.target)).slice(-240).map(e => ({id:e.id,visitor:e.visitor,session:e.session,game:'fx',site:'fx',channel:this.channel,path:this.path,run:e.run,screen:e.screen,name:e.name,target:e.target,stage:0,day:Math.max(0,Math.min(10000,Math.floor(e.day||0))),activeMs:Math.max(0,Math.min(3600000,Math.round(e.activeMs||0))),detail:sanitizeDetail(e.detail),queuedAt:e.queuedAt})); } catch { this.queue = []; }
    const previous = Number(get(this.storage, 'fx-last-visit') || 0), gap = this.now() - previous;
    put(this.storage, 'fx-last-visit', String(this.now()));
    const mobile = (this.window?.innerWidth || 1024) < 640;
    this.emit('visit', '', {detail: {returning: previous > 0, returnGap: previous ? gap < 3600000 ? 'under-hour' : gap < 86400000 ? 'same-day' : gap < 604800000 ? 'under-week' : 'over-week' : 'first', device: mobile ? 'mobile' : 'desktop'}});
  }
  persist() { if (this.enabled) put(this.storage, 'fx-telemetry-outbox', JSON.stringify(this.queue)); }
  setTestMode(value) { this.suspended=value===true;this.queue=[];remove(this.storage,'fx-telemetry-outbox');this.active=this.pageTime=this.decision=0;this.last=this.monotonic(); }
  setEnabled(value) {
    const was = this.enabled;
    this.enabled = value === true && !this.dnt;
    put(this.storage, 'fx-telemetry-enabled', value === true ? 'true' : 'false');
    if (!this.enabled) { this.queue = []; this.seen.clear(); remove(this.storage, 'fx-telemetry-outbox'); remove(this.storage, 'fx-anon-visitor'); remove(this.sessionStorage, 'fx-anon-session'); remove(this.storage, 'fx-last-visit'); remove(this.sessionStorage, 'fx-telemetry-seen'); this.visitor = ''; this.session = ''; }
    else if (!was) { this.lastScreen = ''; this.start(); this.view(this.context); }
    this.active = this.pageTime = this.decision = 0; this.last = this.monotonic();
    return this.enabled;
  }
  clock() { const now = this.monotonic(), elapsed = Math.max(0, Math.min(30000, now - this.last)); this.last = now; if (this.enabled && !this.suspended && this.visible) { this.active += elapsed; this.pageTime += elapsed; this.decision += elapsed; } this.visible = !this.document?.hidden; }
  emit(name, target = '', extra = {}) {
    if (!this.enabled || this.suspended || !names.has(name) || !token(target)) return false;
    if (extra.dedupeKey) { const key = `${name}:${extra.dedupeKey}`; if (this.seen.has(key)) return false; this.seen.add(key); if (this.seen.size > 1200) this.seen.delete(this.seen.values().next().value); put(this.sessionStorage, 'fx-telemetry-seen', JSON.stringify([...this.seen])); }
    this.queue.push({id: uid(), visitor: this.visitor, session: this.session, game: 'fx', site: 'fx', channel: this.channel, path: this.path, ...this.context, name, target, stage: 0, activeMs: Math.round(Math.max(0, Math.min(3600000, extra.activeMs || 0))), detail: {...sanitizeDetail(extra.detail), build: this.build}, queuedAt: this.now()});
    if (this.queue.length > 240) this.diagnostics.dropped += this.queue.splice(0, this.queue.length - 240).length;
    this.persist(); return true;
  }
  beat() { if (this.active > 0) this.emit('heartbeat', '', {activeMs: this.active}); this.active = 0; }
  view(context = {}) {
    this.clock(); const next = {screen: token(context.screen) && context.screen.length <= 40 ? context.screen : this.context.screen, run: token(context.run) ? context.run : this.context.run, day: Math.max(0, Math.min(10000, Math.floor(Number.isFinite(context.day) ? context.day : this.context.day)))};
    if (next.screen !== this.lastScreen) {
      if (this.lastScreen) { this.emit('screen_exit', '', {activeMs: this.pageTime}); this.emit('transition', '', {detail: {from: this.lastScreen, to: next.screen}}); }
      this.context = next; this.emit('screen_view'); this.pageTime = 0; this.lastScreen = next.screen;
    } else this.context = next;
  }
  action(name, target = '', detail = {}) { this.clock(); const result = this.emit(name, target, {activeMs: this.decision, detail}); if (['trade_open','trade_close','story_choice','item_used'].includes(name)) this.decision = 0; return result; }
  async flush(lifecycle = false) {
    if (!this.enabled || this.suspended || !this.queue.length || this.pending || (!lifecycle && this.now() < this.retryAt) || !this.fetch || this.navigator?.onLine === false) return false;
    this.queue = this.queue.filter(e => this.now() - e.queuedAt < 86400000); this.persist(); if (!this.queue.length) return false;
    this.pending = true;
    // Old offline sessions are sent separately; the backend enforces a single session per batch.
    const session = this.queue[0].session, rows = this.queue.filter(e => e.session === session).slice(0, 40);
    let data = JSON.stringify({events: rows.map(({queuedAt, ...e}) => e)});
    while(data.length > 47000 && rows.length > 1) { rows.pop(); data = JSON.stringify({events: rows.map(({queuedAt, ...e}) => e)}); }
    const ids = new Set(rows.map(e => e.id));
    try {
      // JSON CORS + keepalive works for Pages; do not delete a beacon before delivery is acknowledged.
      const response = await this.fetch(this.endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'omit', referrerPolicy: 'no-referrer', body: data, keepalive: lifecycle});
      if (!this.enabled) return false;
      this.diagnostics.lastStatus = response.status;
      if (response.status === 400 || response.status === 403) { this.diagnostics.rejectedBatches++; this.diagnostics.dropped += rows.length; try { this.onStatus({...this.diagnostics, reason:'batch-rejected'}); } catch {} }
      if (response.ok || response.status === 400 || response.status === 403) { this.queue = this.queue.filter(e => !ids.has(e.id)); this.attempts = 0; this.retryAt = 0; this.persist(); return response.ok; }
      throw new Error('retry');
    } catch { this.diagnostics.retries++; this.attempts = Math.min(8, this.attempts + 1); this.retryAt = this.now() + Math.min(300000, 5000 * 2 ** this.attempts); return false; }
    finally { this.pending = false; }
  }
  destroy() { if (this.timer) clearInterval(this.timer); this.document?.removeEventListener('visibilitychange', this.onVisibility); for (const [name, handler] of [['pagehide',this.onHide],['pageshow',this.onShow],['online',this.onOnline],['error',this.onError],['unhandledrejection',this.onRejection]]) this.window?.removeEventListener(name,handler); }
}
export {FXTelemetry as Telemetry};
