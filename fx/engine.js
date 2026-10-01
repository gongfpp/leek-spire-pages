import {NEWS_CHAINS, initialChat, CHAT_REACTIONS} from './content.js?v=dd90ed26b2c0dbfaf2ad21aa7d7b3322278393ad';
export const VERSION = 3;
export const LIVING_DAILY = 2200;
export const FATHER_SAVINGS = 3000000;
export const TARGET_PROFIT = 50000;
export const START_PRICE = 1 / 150;
export const START = 100000;
export const CANDLES_PER_BEAT = 4;
export const BEATS_PER_DAY = 4;
export const TICKS_PER_CANDLE = 6;
export const MIN_EQUITY = 1000;

export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function mix(seed, day, channel) {
  let x = (seed ^ Math.imul(day, 0x9E3779B9) ^ channel) >>> 0;
  x = Math.imul(x ^ x >>> 16, 0x7feb352d);
  x = Math.imul(x ^ x >>> 15, 0x846ca68b);
  return (x ^ x >>> 16) >>> 0;
}

const CHAINS = NEWS_CHAINS;
const VARIANTS = ['confirmed', 'reversed', 'muted'];

export function planDay(seed, day, startPrice) {
  const story = random(mix(seed, day, 0x5170));
  const market = random(mix(seed, day, 0x61a0));
  const index = Math.floor(story() * CHAINS.length);
  const other = (index + 1 + Math.floor(story() * (CHAINS.length - 1))) % CHAINS.length;
  const selected = [CHAINS[index], CHAINS[other]];
  const events = [];
  for (let beat = 0; beat < BEATS_PER_DAY; beat++) {
    const chain = selected[Math.floor(beat / 2)];
    const variant = beat % 2 === 0 ? VARIANTS[Math.floor(story() * 3)] : events[beat - 1].variant;
    const [reveal, detail] = chain[variant];
    events.push({id: chain.id, chain: chain.name, variant, bias: chain.bias, vol: chain.vol,
      title: beat % 2 === 0 ? chain.lead : reveal,
      copy: beat % 2 === 0 ? chain.leadCopy : detail,
      source: chain.source, time: ['09:10','11:30','15:00','21:30'][beat],
      flash: beat % 2 === 0 ? reveal : `${chain.name}：日元成交量恢复正常`,
      flashCopy: detail});
  }
  let price = startPrice;
  const tracks = events.map((event, beat) => Array.from({length: CANDLES_PER_BEAT}, (_, candle) => {
    const ticks = [];
    for (let tick = 0; tick < TICKS_PER_CANDLE; tick++) {
      const phase = beat % 2 === 0 ? (candle < 2 ? 1 : event.variant === 'reversed' ? -1.5 : event.variant === 'muted' ? .1 : 1.2)
        : event.variant === 'reversed' ? -1 : event.variant === 'muted' ? .1 : .8;
      const drift = event.bias * phase * (0.00007 + day % 3 * 0.00001);
      const noise = (market() + market() - 1) * 0.00058 * event.vol;
      price = Math.max(.0001, price * (1 + drift + noise));
      ticks.push(Number(price.toFixed(9)));
    }
    return ticks;
  }));
  return {events, tracks};
}

function historyCandles(seed) {
  const rng = random(mix(seed, 0, 0x75ca));
  const candles = [];
  let price = START_PRICE * .992;
  for (let i = 0; i < 18; i++) {
    const open = price;
    const points = Array.from({length: 6}, () => { price *= 1 + (rng() - .49) * .002; return price; });
    candles.push({open, close: price, high: Math.max(open, ...points), low: Math.min(open, ...points), closed: true, historical: true});
  }
  const ratio = START_PRICE / price;
  for (const c of candles) for (const key of ['open','close','high','low']) c[key] *= ratio;
  return candles;
}
export function createGame(seed = Date.now()) {
  seed = seed >>> 0;
  const state = {version: VERSION, seed, day: 1, beat: 0, phase: 'decision', price: START_PRICE,
    cash: START-LIVING_DAILY, reserve: LIVING_DAILY, position: null, sanity: 100, dayOpening: START, candles: historyCandles(seed),
    script: null, pending: null, history: [], recent: [], chat: initialChat(), promise: null,
    relationship: 0, publicStance: null, promiseNoted:false, dinner:false, skills:{mochiko:false,yasuko:false},
    fatherUsed:false,externalFunding:0,dayOpeningFunding:0,stress:0,heat:0,peakPersonal:START,equityTrail:[START],nextStop:null,
    lastEvent:null, lastTrade:null, lastReaction:null, dayReport:null};
  state.script = planDay(seed, 1, state.price);
  return state;
}
export function unrealized(s) {
  if (!s.position) return 0;
  const p = s.position;
  return p.margin * p.leverage * p.direction * (s.price / p.entry - 1);
}
export function equity(s) {
  return Math.max(0, s.cash + s.reserve + (s.position ? Math.max(0, s.position.margin + unrealized(s)) : 0));
}
export function tradingProfit(s){return equity(s)-START-(s.externalFunding||0);}
export function mentalState(s, sample=false){
  const personal=Math.max(0,equity(s)-(s.externalFunding||0));
  s.peakPersonal=Math.max(START,s.peakPersonal||START,personal);
  s.equityTrail ||= [personal];
  if(sample){s.equityTrail.push(personal);s.equityTrail=s.equityTrail.slice(-48);}
  const recentPeak=Math.max(START*.01,...s.equityTrail,personal);
  const totalDrawdown=Math.max(0,1-personal/s.peakPersonal);
  const recentDrawdown=Math.max(0,1-personal/recentPeak);
  const exposure=s.position ? Math.min(1,s.position.margin/Math.max(equity(s),1))*Math.min(1,s.position.leverage/50) : 0;
  s.sanity=Math.max(0,Math.min(100,Math.round(100-totalDrawdown*80-recentDrawdown*20-exposure*8-(s.stress||0)+(s.reserve>=LIVING_DAILY?2:0))));
  return {value:s.sanity,totalDrawdown,recentDrawdown,exposure};
}
function experience(s, entry) {
  s.recent.unshift(entry);
  s.recent = s.recent.slice(0, 5);
  s.lastReaction = {type: entry.type, day: s.day, beat: s.beat, risk:entry.risk||0};
}
function closePosition(s, fraction, reason) {
  if (!s.position || fraction <= 0 || fraction > 1) throw Error('没有可平仓位');
  const p = s.position;
  const margin = p.margin * fraction;
  const raw = unrealized(s) * fraction;
  const peakUnrealized = p.maxUnrealized * fraction;
  const pnl = Math.max(-margin, raw);
  const before = equity(s);
  s.cash += margin + pnl;
  p.margin -= margin;
  p.maxUnrealized *= 1-fraction;
  if (p.margin < 0.00001 || fraction === 1) s.position = null;
  s.lastTrade = {type:reason, direction:p.direction, margin, leverage:p.leverage, entry:p.entry, exit:s.price, pnl, day:s.day, beat:s.beat};
  s.history.push(s.lastTrade);
  const impact = pnl / Math.max(1000,before);
  s.heat=Math.max(0,Math.min(5,(s.heat||0)+(pnl>0?1:-1)));
  const type = reason === 'liquidation' || p.risk>=25 && impact<-.07 ? 'despair'
    : p.risk>=25 && impact>.07 ? 'ecstatic'
    : p.nearMiss && pnl>=0 ? 'relieved'
    : peakUnrealized>0 && peakUnrealized-raw > before*.045 ? 'regretful'
    : pnl>0 ? 'smug' : pnl<0 ? 'anxious' : 'calm';
  experience(s,{type,impact,risk:p.risk,pnl,day:s.day,beat:s.beat});
  mentalState(s);
  return s.lastTrade;
}
export function mood(s) {
  const latest = s.recent[0];
  const weighted = s.recent.reduce((sum,e,i)=>sum+e.impact*[1,.75,.5,.3,.15][i],0);
  if (s.sanity<8 || latest?.type==='despair' || weighted<-.17) return 'despair';
  if (s.sanity<25) return 'anxious';
  if (latest?.type==='ecstatic' && weighted>0) return 'ecstatic';
  if (latest?.type==='regretful') return 'regretful';
  if (s.position && (s.position.risk>=20 || unrealized(s)<-s.position.margin*.22)) return 'nervous';
  if (latest?.type==='relieved') return 'relieved';
  if (weighted<-.015 || latest?.type==='anxious' && weighted<0) return 'anxious';
  if (weighted>.02) return 'smug';
  return 'calm';
}
export function currentEvent(s){return s.script.events[Math.min(s.beat,BEATS_PER_DAY-1)];}
export function useProp(s,id){
  if(s.phase!=='decision')throw Error('请等行情暂停');
  if(id==='father'){
    if(s.fatherUsed)throw Error('这笔存款已经取过了');
    s.fatherUsed=true;s.cash+=FATHER_SAVINGS;s.externalFunding+=FATHER_SAVINGS;s.stress+=12;s.heat=Math.min(5,s.heat+2);
    mentalState(s);return {id,amount:FATHER_SAVINGS};
  }
  if(!['mochiko','yasuko'].includes(id)||s.skills[id])throw Error('今天已经用过了');
  s.skills[id]=true;
  let trade=null;
  if(id==='mochiko'){
    if(s.position){s.position.stop=Math.min(s.position.stop,.25);if(unrealized(s)<=-s.position.margin*s.position.stop)trade=closePosition(s,1,'stop');}
    else s.nextStop=.25;
    s.stress=Math.max(0,s.stress-8);
  }else{
    if(s.position)trade=closePosition(s,1,'yasuko');
    s.stress=Math.max(0,s.stress-12);s.heat=Math.max(0,s.heat-2);
  }
  mentalState(s);return{id,trade,stop:s.position?.stop||s.nextStop};
}
export function reply(s, channel, choice) {
  if(s.phase!=='decision'||!['group','friend'].includes(channel)) throw Error('行情播放时不能聊天');
  const list=s.chat[channel],append=(from,text)=>list.push({from,text,kind:from==='久留美'?'self':channel});
  if(channel==='group'){
    if(choice==='ask'){
      append('久留美','日元刚才那一段，你们怎么看？');
      append('芽吹',s.price>=s.candles.at(-1).open?'我觉得还会涨！前辈也这么想，对吧？':'跌了这么多，接下来总该涨了吧？');
      append('安子','你俩先别互相壮胆。群里没有人能替你按平仓。');
    }else if(choice==='stance'){
      const direction=s.position?.direction||1;s.publicStance={day:s.day,beat:s.beat,direction};
      append('久留美',direction===1?'这次我看日元升值。不是凭感觉，我有看数据。':'这次我看日元贬值。就算不太想承认，也得顺着走势。');
      append('萌智子','那就把退出的位置也记下来。方向说得再响，保证金也不会变多。');
    }else if(choice==='share'){
      const risk=(s.position?.margin||0)/Math.max(equity(s),1);
      append('久留美',`现在账户是 ¥${Math.round(equity(s)).toLocaleString('zh-CN')}。日元仓位 ${Math.round(risk*100)}%。`);
      append('芽吹',tradingProfit(s)>0?'好厉害！我也想把打工的钱赚回来……':'那、那只要下一笔赚回来就好了吧？');
      append('安子',risk>.7?'别拿全仓当练习。亏的是钱，又不是作业本。':risk>.25?'仓位已经不小了。别等跌了才找理由。':'至少你还留了退路。别一开心又改成全仓。');
    }else throw Error('不支持的群聊回复');
  }else{
    if(choice==='promise'){
      s.promise='break_even';s.promiseNoted=false;append('久留美','把今天亏掉的赚回来，我就停。');
      append('萌智子','回本是你的愿望，又不是汇率的目的地。你准备在哪里认错？');
    }else if(choice==='small'){
      s.promise='small';s.promiseNoted=false;append('久留美','今天最多四分之一仓。这样总算够冷静了吧？');
      append('萌智子','仓位小，不代表理由正确。不过比你刚才那个表情要好。');
    }else if(choice==='dinner'){
      s.relationship++;s.dinner=true;append('久留美','收盘后一起去吃饭？我想先离开这个数字一会儿。');
      append('萌智子',s.relationship%2?'可以。那家店的新甜点挺可爱。别在门口又打开账户。':'行。你负责准时到，我不想对着一张空椅子点菜。');
    }else throw Error('不支持的单聊回复');
  }
  s.chat[channel]=list.slice(-60);return list.slice(-3);
}
function validateAction(s, action) {
  if(s.phase!=='decision') throw Error('请等待下一个决策点');
  const allowed=s.position?['hold','half','close']:['long','short','wait'];
  if(!allowed.includes(action.type)) throw Error('当前操作不可用');
  if(['long','short'].includes(action.type)){
    if(![.25,.5,1].includes(action.stake)||![5,20,50,100].includes(action.leverage)||![.25,.5,1].includes(action.stop)) throw Error('订单参数无效');
    if(s.cash*action.stake<100) throw Error('可用资金不足');
  }
}
export function takeAction(s, action) {
  validateAction(s,action);
  const before=equity(s);
  let trade=null;
  if(action.type==='long'||action.type==='short'){
    const margin=Math.round(s.cash*action.stake);
    s.cash-=margin;
    s.position={direction:action.type==='long'?1:-1,entry:s.price,margin,leverage:action.leverage,
      stop:s.nextStop?Math.min(action.stop,s.nextStop):action.stop,risk:action.stake*action.leverage, maxUnrealized:0,nearMiss:false};
    s.nextStop=null;
    s.lastTrade={type:'open',direction:s.position.direction,margin,leverage:action.leverage,entry:s.price,day:s.day,beat:s.beat};
    trade=s.lastTrade;
    if(action.leverage>=50)s.stress+=action.leverage===100?8:4;
    s.heat=Math.min(5,s.heat+(action.leverage>=50?2:1));
  }else if(action.type==='half') trade=closePosition(s,.5,'half');
  else if(action.type==='close') trade=closePosition(s,1,'close');
  else if(action.type==='wait'){s.stress=Math.max(0,s.stress-3);s.heat=Math.max(0,s.heat-1);}
  s.pending={beat:s.beat,candle:0,tick:0,action:action.type,before,flashShown:false};
  s.phase='playing';
  mentalState(s);
  return {trade,before,after:equity(s),action:action.type};
}
function appendChatAfterBeat(s){
  const first=s.candles.at(-CANDLES_PER_BEAT),delta=s.price/(first?.open||s.price)-1;
  const [from,text]=CHAT_REACTIONS[Math.abs(delta)<.0005?'flat':delta>0?'up':'down'];
  s.chat.group.push({from,text,kind:'group'});
  if(s.publicStance?.day===s.day&&s.publicStance.beat===s.beat-1){
    const correct=s.publicStance.direction===(delta>=0?1:-1);
    s.chat.group.push({from:'萌智子',text:correct?'方向对了。你现在是打算兑现，还是开始舍不得？':'刚才的判断已经过去了。你要改计划，还是替它找借口？',kind:'group'});
  }
  if(s.promise&&!s.promiseNoted){
    s.promiseNoted=true;
    s.chat.friend.push({from:'萌智子',text:s.promise==='small'?'你说过四分之一仓。别把新的理由当成改数字的许可。':'你说回本就停。我记得。别把“回本”改成“再赚一点”。',kind:'friend'});
  }
  for(const c of ['group','friend'])s.chat[c]=s.chat[c].slice(-60);
}
function endDay(s) {
  if(s.position)closePosition(s,1,'closing');
  s.cash+=s.reserve;s.reserve=0;
  if(s.dinner)s.chat.friend.push({from:'萌智子',text:'收盘了。甜点我先点了，别带着一张还没平掉的单过来。',kind:'friend'});
  mentalState(s,true);
  const closing=equity(s),funding=s.externalFunding-s.dayOpeningFunding;
  s.dayReport={day:s.day,opening:s.dayOpening,closing,net:closing-s.dayOpening-funding,funding,
    trades:s.history.filter(t=>t.day===s.day), mood:mood(s), promise:s.promise,externalFunding:s.externalFunding,
    peak:s.history.filter(t=>t.day===s.day).reduce((a,t)=>!a||Math.abs(t.pnl||0)>Math.abs(a.pnl||0)?t:a,null)};
  s.phase=closing<MIN_EQUITY?'bankrupt':'day_end';
}
export function advanceTick(s) {
  if(s.phase!=='playing'||!s.pending)throw Error('当前没有待播放行情');
  const p=s.pending,points=s.script.tracks[p.beat][p.candle];
  const price=points[p.tick];
  let candle=s.candles.at(-1);
  if(p.tick===0){candle={open:s.price,close:s.price,high:s.price,low:s.price,closed:false,day:s.day,beat:p.beat};s.candles.push(candle);}
  s.price=price;candle.close=price;candle.high=Math.max(candle.high,price);candle.low=Math.min(candle.low,price);
  let exit=null;
  if(s.position){
    const unreal=unrealized(s),pos=s.position;
    pos.maxUnrealized=Math.max(pos.maxUnrealized,unreal);
    if(unreal< -pos.margin*.65)pos.nearMiss=true;
    if(unreal<=-pos.margin)exit=closePosition(s,1,'liquidation');
    else if(unreal<=-pos.margin*pos.stop)exit=closePosition(s,1,'stop');
  }
  let flash=null;
  if(p.candle===1&&p.tick===2&&!p.flashShown){p.flashShown=true;const e=s.script.events[p.beat];flash={title:e.flash,copy:e.flashCopy,chain:e.chain};s.lastEvent=flash;}
  mentalState(s,true);
  p.tick++;
  let candleClosed=false,beatEnded=false,dayEnded=false;
  if(p.tick>=points.length){candle.closed=true;candleClosed=true;p.tick=0;p.candle++;}
  if(p.candle>=CANDLES_PER_BEAT){s.beat++;s.pending=null;beatEnded=true;appendChatAfterBeat(s);
    if(s.beat>=BEATS_PER_DAY||equity(s)<MIN_EQUITY||s.sanity<=0){endDay(s);dayEnded=true;}
    else s.phase='decision';
  }
  return{price, candleClosed, beatEnded, dayEnded, exit, flash, equity:equity(s), mood:mood(s)};
}
export function finishSegment(s) {
  const results=[];
  while(s.phase==='playing')results.push(advanceTick(s));
  return results;
}
export function nextDay(s) {
  if(s.phase!=='day_end')throw Error('尚未收盘或账户已破产');
  s.day++;s.beat=0;s.phase='decision';s.dayOpening=equity(s);s.dayOpeningFunding=s.externalFunding;s.stress=Math.max(0,s.stress-4);s.heat=0;
  const living=Math.min(LIVING_DAILY,s.cash);s.cash-=living;s.reserve=living;
  s.script=planDay(s.seed,s.day,s.price);s.skills={mochiko:false,yasuko:false};s.nextStop=null;
  s.lastEvent=null;s.lastReaction=null;s.pending=null;s.promise=null;s.promiseNoted=false;s.dinner=false;s.publicStance=null;
  s.chat.friend.push({from:'萌智子',text:`第 ${s.day} 天了。昨天的理由先放下，今天这张日元单又是为什么？`,kind:'friend'});
  mentalState(s);return s;
}
export function restoreGame(raw) {
  try {
    let s=JSON.parse(raw);
    if(!s||![2,VERSION].includes(s.version)||!Number.isFinite(s.seed)||!Number.isFinite(s.price)||s.price<=0||!Number.isFinite(s.cash)||s.cash<0||!Array.isArray(s.candles)||!s.script?.tracks||!['decision','playing','day_end','bankrupt'].includes(s.phase))return null;
    if(s.phase==='playing'&&(!s.pending||!Number.isInteger(s.pending.beat)||!Number.isInteger(s.pending.candle)||!Number.isInteger(s.pending.tick)))return null;
    if(s.version===2)s=migrateV2(s);
    if(!Number.isFinite(s.reserve)||s.reserve<0||!Number.isFinite(s.externalFunding)||!Array.isArray(s.equityTrail)||!s.chat?.group||!s.chat?.friend)return null;
    mentalState(s);
    return s;
  }catch{return null;}
}
function migrateV2(s){
  const oldPrice=s.price,oldPosition=s.position;
  const oldUnreal=oldPosition?oldPosition.margin*oldPosition.leverage*oldPosition.direction*(oldPrice/oldPosition.entry-1):0;
  s.version=VERSION;s.price=1/oldPrice;
  for(const c of s.candles){const oldHigh=c.high;c.open=1/c.open;c.close=1/c.close;c.high=1/c.low;c.low=1/oldHigh;}
  s.script.tracks=s.script.tracks.map(beat=>beat.map(candle=>candle.map(p=>1/p)));
  s.script.events=planDay(s.seed,s.day,s.price).events;
  if(oldPosition){
    oldPosition.direction*=-1;
    const divisor=1+oldUnreal/(oldPosition.margin*oldPosition.leverage*oldPosition.direction);
    if(divisor>0)oldPosition.entry=s.price/divisor;
    else{s.cash+=Math.max(0,oldPosition.margin+oldUnreal);s.position=null;}
  }
  const convertTrade=t=>{if(!t)return;t.direction*=-1;if(t.entry)t.entry=1/t.entry;if(t.exit)t.exit=1/t.exit;};
  for(const t of s.history||[])convertTrade(t);
  convertTrade(s.lastTrade);
  s.cash+=s.reserve||0;s.reserve=0;
  if(s.phase==='decision'||s.phase==='playing'){s.reserve=Math.min(LIVING_DAILY,s.cash);s.cash-=s.reserve;}
  s.externalFunding=0;s.dayOpeningFunding=0;s.fatherUsed=false;s.stress=0;s.heat=0;s.nextStop=null;
  s.peakPersonal=Math.max(START,equity(s));s.equityTrail=[START,equity(s)];s.skills={mochiko:false,yasuko:false};
  s.archivedChat=s.chat;s.chat=initialChat();
  if(s.promise)s.chat.friend.push({from:'萌智子',text:s.promise==='small'?'你刚才说想轻仓。那就把数字写下来，别临时改口。':'你刚才说回本就停。我还记着。',kind:'friend'});
  if(s.dayReport){s.dayReport.funding=0;s.dayReport.externalFunding=0;for(const t of s.dayReport.trades||[])convertTrade(t);convertTrade(s.dayReport.peak);}
  return s;
}
