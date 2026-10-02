// Names are game adaptations of verified scenes, not quotations or official achievements.
const define = (id, name, description, badge, sourceNote, goal = 1) =>
  Object.freeze({id, name, description, badge, sourceNote, goal});
export const ACHIEVEMENTS = Object.freeze([
  define('first-profit','确认利益','完成第一笔手续费后仍盈利的平仓。','利','Web 第 3 话：久留美确认盈利。'),
  define('million-thirty','一百三十万的余震','累计已实现净收益达到 ¥1,300,000。','130','Web 第 3 话：盈利一百三十万后仍然发抖。',1300000),
  define('liquidated','祈祷没有成交价','第一次因保证金不足被强制平仓。','祈','Web 第 1 话：巨亏中祈求上涨；触发条件为游戏改写。'),
  define('hold-loss','关掉屏幕也在跌','选择继续持有后，实际播放至少一根 K 线，仍持有亏损超过保证金 25% 的订单。','暗','Web 第 2–3 话：久留美回避屏幕，行情仍然在动。'),
  define('hundred-times','杠杆把心跳放大','实际持有 100× 仓位经历一次行情变化。','100','Web 第 1 话的高杠杆亏损情境改写。'),
  define('father-funds','柜子里的三百万','实际取用父亲的 ¥3,000,000 存款。','柜','Web 第 1 话：取用家中存款；具体借款账本为游戏设计。'),
  define('tell-everything','今晚把事情说清楚','实际向朋友披露欠款，或在父亲发现前主动归还一笔。','话','Web 第 3 话：想向父亲坦白；本作加入实际披露与还款。'),
  define('fully-repaid','三百万，一分不少','取用父亲存款后，将欠款全部归还。','还','Web 第 3 话的归还三百万计划，由游戏实现；非原作既成事实。'),
  define('accept-stop','我不能输，所以止损','实际执行一次止损平仓。','止','Web 第 2 话：执念使久留美放弃止损；本作反向改写。'),
  define('mochiko-warning','萌智子让你看持仓','实际使用萌智子的止损提醒。','萌','Web 第 3 话：萌智子催久留美查看持仓；止损道具为本作设计。'),
  define('profit-receipt','笑容先落袋','使用盈利截图封存袋，并实际减仓兑现净盈利。','袋','Web 第 3 话：久留美在电脑前确认利润，封存袋为本作道具。'),
  define('saved-at-last','手还在发抖','一笔曾接近强平的仓位最终净盈利平仓。','救','Web 第 3 话：扛过巨亏、平仓后仍发抖；触发条件为游戏改写。'),
  define('walkaway','屏幕之外还有明天','完成主动离场结局。','休','回避屏幕情境的本作延伸；主动离场是原创结局。'),
  define('twenty-million','拿回两千万','在正常游戏中完成两千万交易净收益目标结局。','2000','动画官方简介中的两千万目标；游戏交易结果独立计算。')
]);
const finite = (n, fallback=0) => Number.isFinite(n) ? n : fallback;
const positions = s => Array.isArray(s.positions) ? s.positions : s.position ? [s.position] : [];
const closed = s => (s.history || []).filter(t => t.type !== 'open' && Number.isFinite(t.pnl));
const pnl = (s,p) => finite(p.unrealized,finite(p.margin)*finite(p.leverage)*finite(p.direction)*(finite(s.price)/finite(p.entry,1)-1));
function evidence(s) {
  const trades=closed(s), active=positions(s), realized=trades.reduce((sum,t)=>sum+t.pnl,0);
  return {
    'first-profit':trades.some(t=>t.pnl>0)?1:0,
    'million-thirty':Math.max(0,realized),
    'liquidated':trades.some(t=>t.type==='liquidation')?1:0,
    'hold-loss':s.pending?.action==='hold'&&s.pending.candle>=1&&active.some(p=>p.margin>0&&pnl(s,p)<=-p.margin*.25)?1:0,
    'hundred-times':s.phase==='playing'&&(s.pending?.candle>0||s.pending?.tick>0)&&active.some(p=>p.leverage===100)?1:0,
    'father-funds':s.fatherUsed&&s.family?.takenConfirmed?1:0,
    'tell-everything':s.disclosures?.debt||s.family?.repaid>0&&s.family?.informed&&!s.family?.discovered?1:0,
    'fully-repaid':s.fatherUsed&&s.family?.repaid>=3000000&&finite(s.family?.outstanding)===0?1:0,
    'accept-stop':trades.some(t=>t.type==='stop')?1:0,
    'mochiko-warning':s.itemsUsed?.mochiko||s.skills?.mochiko?1:0,
    'profit-receipt':trades.some(t=>t.type==='receipt'&&t.pnl>0)?1:0,
    'saved-at-last':trades.some(t=>t.pnl>0&&(t.nearMiss||t.minUnrealized<=-t.margin*.65))?1:0,
    'walkaway':s.phase==='ending'&&s.ending?.id==='walkaway'?1:0,
    'twenty-million':s.phase==='ending'&&s.ending?.id==='million'&&s.ending?.profit>=20000000?1:0
  };
}
export function normalizeAchievementProfile(profile={}) {
  const unlocked={};
  for(const def of ACHIEVEMENTS){const entry=profile?.unlocked?.[def.id];if(entry&&Number.isFinite(entry.at)&&entry.at>=0)unlocked[def.id]={at:entry.at,day:Math.max(1,Math.floor(finite(entry.day,1)))};}
  return {version:1,unlocked};
}
export function achievementProgress(state={},profile={}) {
  const saved=normalizeAchievementProfile(profile), values=state.developer?.edited?{}:evidence(state);
  return ACHIEVEMENTS.map(def=>({...def,unlocked:!!saved.unlocked[def.id],unlockedAt:saved.unlocked[def.id]?.at,
    progress:Math.max(0,Math.min(def.goal,finite(values[def.id])))}));
}
export function evaluateAchievements(state,profile={}, {now=Date.now()}={}) {
  const saved=normalizeAchievementProfile(profile), newlyUnlocked=[];
  if(state?.developer?.edited)return {profile:saved,newlyUnlocked};
  for(const def of achievementProgress(state,saved))if(!def.unlocked&&def.progress>=def.goal){
    saved.unlocked[def.id]={at:finite(now,Date.now()),day:Math.max(1,Math.floor(finite(state.day,1)))};
    newlyUnlocked.push(ACHIEVEMENTS.find(a=>a.id===def.id));
  }
  return {profile:saved,newlyUnlocked};
}
const UI_STYLES=`
.fx-ach-host{position:fixed;right:24px;bottom:24px;z-index:1100;pointer-events:none;max-width:calc(100vw - 32px)}
.fx-ach-toast{width:340px;max-width:100%;box-sizing:border-box;display:grid;grid-template-columns:52px 1fr 24px;gap:12px;padding:16px;background:linear-gradient(115deg,#24303a,#151e25);color:#f5f7f9;border:1px solid #617481;border-top:3px solid #a4c967;box-shadow:0 8px 30px #0007;border-radius:5px;pointer-events:auto;font:14px/1.45 system-ui,sans-serif;animation:fx-ach-enter .28s ease-out}
.fx-ach-badge{display:grid;place-items:center;width:48px;height:48px;background:#344743;border:1px solid #7d9b70;color:#c4e18e;border-radius:4px;font-weight:800;font-size:18px}
.fx-ach-label{font-size:11px;color:#b5ca99;letter-spacing:.08em}.fx-ach-name{font-weight:750;font-size:16px;margin:3px 0}.fx-ach-copy{font-size:12px;color:#c5cfd6}.fx-ach-close{color:#bfcbd1;border:0;background:none;cursor:pointer;font-size:20px;align-self:start;padding:0;min-width:24px;min-height:24px}
.fx-ach-book{display:grid;gap:12px}.fx-ach-entry{display:grid;grid-template-columns:52px 1fr;gap:12px;padding:14px;background:#18232b;color:#eaf0f4;border:1px solid #4a5d69;border-radius:5px}.fx-ach-entry.locked{background:#eff0f0;color:#46545e;border-color:#c2c9ce}.fx-ach-entry.locked .fx-ach-badge{background:#d3d8da;border-color:#a0aaaf;color:#667780}.fx-ach-entry .fx-ach-copy{color:inherit;opacity:.82}.fx-ach-meta{display:block;font-size:11px;margin-top:6px;opacity:.7}.fx-ach-hint{font-size:11px;margin-top:5px;opacity:.65}
@keyframes fx-ach-enter{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:640px){.fx-ach-host{right:16px;bottom:calc(96px + env(safe-area-inset-bottom,0px))}.fx-ach-toast{width:310px;padding:12px;gap:9px}}
@media(prefers-reduced-motion:reduce){.fx-ach-toast{animation:none}}
`;
const queues=new WeakMap();
function styles(doc){if(doc.getElementById('fx-ach-style'))return;const css=doc.createElement('style');css.id='fx-ach-style';css.textContent=UI_STYLES;doc.head.append(css);}
function el(doc,tag,className,text){const node=doc.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;}
export function createAchievementToast(def,{document:doc=globalThis.document,duration=5500}={}) {
  if(!doc?.body||!def)return;
  styles(doc);let q=queues.get(doc);if(!q){const host=el(doc,'div','fx-ach-host');host.setAttribute('aria-live','polite');host.setAttribute('aria-atomic','true');doc.body.append(host);q={host,items:[],active:null};queues.set(doc,q);}
  q.items.push({def,duration:Math.max(1500,finite(duration,5500))});
  const show=()=>{if(q.active||!q.items.length)return;const item=q.items.shift(), toast=el(doc,'div','fx-ach-toast');
    toast.append(el(doc,'span','fx-ach-badge',item.def.badge));const content=el(doc,'div','fx-ach-content');content.append(el(doc,'div','fx-ach-label','成就已解锁'),el(doc,'div','fx-ach-name',item.def.name),el(doc,'div','fx-ach-copy',item.def.description));toast.append(content);
    const close=el(doc,'button','fx-ach-close','×');close.type='button';close.setAttribute('aria-label','关闭成就提示');toast.append(close);q.active=toast;
    let timer;const dismiss=()=>{if(q.active!==toast)return;clearTimeout(timer);toast.remove();q.active=null;setTimeout(show,200);};close.addEventListener('click',dismiss);q.host.append(toast);timer=setTimeout(dismiss,item.duration);
  };show();
}
export function renderAchievementBook(container,profile={},state={}) {
  const doc=container.ownerDocument;styles(doc);container.replaceChildren();container.classList.add('fx-ach-book');
  for(const def of achievementProgress(state,profile)){
    const card=el(doc,'article','fx-ach-entry'+(def.unlocked?'':' locked'));card.append(el(doc,'span','fx-ach-badge',def.unlocked?def.badge:'锁'));
    const text=el(doc,'div','fx-ach-content');text.append(el(doc,'div','fx-ach-name',def.name),el(doc,'div','fx-ach-copy',def.description));
    const status=def.unlocked?`已解锁 · ${new Date(def.unlockedAt).toLocaleDateString('zh-CN')}`:def.goal>1?`未解锁 · ${Math.floor(def.progress).toLocaleString('zh-CN')} / ${def.goal.toLocaleString('zh-CN')}`:'未解锁';
    text.append(el(doc,'small','fx-ach-meta',status),el(doc,'div','fx-ach-hint',def.sourceNote));card.append(text);container.append(card);
  }
}
