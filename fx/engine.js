export const VERSION = 2;
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

const CHAINS = [
  {
    id: 'watch', name: '密切关注', bias: -1, vol: 1,
    lead: '央行：我们正在密切关注汇率。', leadCopy: '关注了，但有没有行动，没人说。', source: '记者会摘录',
    confirmed: ['口头警告之后，官员真的入场。', '群里说只是吓唬人，市场没听。', '消息属实，价格可能仍会先反抽。'],
    reversed: ['央行澄清：目前没有干预计划。', '群里刚做完空，澄清就到了。', '传闻已被否认，之前的走势正在回吐。'],
    muted: ['官员再度发言：仍在观察。', '采访两次，信息量加起来不到一根 K 线。', '仍无行动证据，别把语气当成交单。']
  },
  {
    id: 'payroll', name: '非农之夜', bias: 1, vol: 3,
    lead: '就业初值火热，群里喊美元起飞。', leadCopy: '标题先到了，修订数据还在路上。', source: '数据快讯',
    confirmed: ['完整数据支持初读，就业仍偏强。', '这次标题和正文居然是同一个意思。', '数据可信，但市场可能已经提前定价。'],
    reversed: ['修订值转弱，刚才的解读翻车。', '标题我看完了，正文把我看完了。', '初值真实，后续修订改变了市场理解。'],
    muted: ['就业有喜有忧，市场分成两派。', '全群都能从数字里找到自己的方向。', '数据混合，单一标题不够下结论。']
  },
  {
    id: 'screenshot', name: '盈利截图', bias: 1, vol: 2,
    lead: '大 V 晒出百万盈利单，催大家上车。', leadCopy: '截图很清晰，账户类型很模糊。', source: '交易群转发',
    confirmed: ['截图日期属实，但他早已平仓。', '老师在山顶喊上车，自己坐的是返程车。', '截图是真的，不能证明此刻方向。'],
    reversed: ['有人发现截图来自模拟账户。', '投资建议收费九十九，亏损自理。', '来源不可靠，价格没有义务照图走。'],
    muted: ['没人找到完整记录，群里继续刷屏。', '没有证据，也不耽误大家说「懂的都懂」。', '无法核实，请把它当噪声。']
  },
  {
    id: 'flock', name: '全群一致', bias: 1, vol: 2,
    lead: '交易群里二十个人，十九个看多。', leadCopy: '第二十个是机器人，在发晚饭红包。', source: '群内投票',
    confirmed: ['短线继续向上，群里开始晒表情包。', '只要不平仓，人人都能宣称自己赚了。', '方向一时正确，风险仍然取决于仓位。'],
    reversed: ['行情掉头，群友开始集体静音。', '全群都赢了，除了群成员。', '一致预期落空，价格反向波动。'],
    muted: ['行情横着走，大家改聊外卖。', '争论三小时，价格只走了一小格。', '群体判断暂时没有得到验证。']
  },
  {
    id: 'hawk', name: '鹰派发言', bias: 1, vol: 3,
    lead: '美联储官员：利率或许维持更久。', leadCopy: '市场听到了鹰叫，也可能昨天就听到了。', source: '讲话转述',
    confirmed: ['后续措辞更强，美元再受追捧。', '群友把「早就知道」打了十二遍。', '讲话支持美元，但不保证连续上涨。'],
    reversed: ['完整讲话还有一句「视数据而定」。', '发言只读半句，仓位却上了满格。', '片段被断章取义，市场重新定价。'],
    muted: ['新讲话没有更明确的路径。', '鹰飞了一圈，落回原来的树上。', '方向仍有争议，消息不是确定信号。']
  },
  {
    id: 'intervention', name: '疑似干预', bias: -1, vol: 3,
    lead: '汇市异动：当局是否出手？', leadCopy: '路透说「交易员猜测」，群里说「板上钉钉」。', source: '市场传闻',
    confirmed: ['官方承认已对汇市采取行动。', '这次真的不是散户的网线问题。', '行动已确认，后续速度仍难预测。'],
    reversed: ['异动源于大额订单，暂无官方行动。', '群里三个「内部消息」都来自同一个截图。', '干预传闻被否认，先前价格冲击可能回撤。'],
    muted: ['官方未评论，交易员继续猜。', '「不予置评」被翻译成了十二种方向。', '证据不足，保持怀疑。']
  }
];
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
    const [reveal, joke, fact] = chain[variant];
    events.push({id: chain.id, chain: chain.name, variant, bias: chain.bias, vol: chain.vol,
      title: beat % 2 === 0 ? chain.lead : reveal,
      copy: beat % 2 === 0 ? chain.leadCopy : joke,
      source: beat % 2 === 0 ? chain.source : '后续核实',
      flash: beat % 2 === 0 ? reveal : `${chain.name}：市场开始消化后续消息。`,
      flashCopy: beat % 2 === 0 ? joke : fact,
      fact: beat % 2 === 0 ? fact : `已核实：${fact}`,
      credibility: variant === 'reversed' ? '最初说法已反转' : variant === 'confirmed' ? '来源基本可信' : '消息仍待核实'});
  }
  let price = startPrice;
  const tracks = events.map((event, beat) => Array.from({length: CANDLES_PER_BEAT}, (_, candle) => {
    const ticks = [];
    for (let tick = 0; tick < TICKS_PER_CANDLE; tick++) {
      const phase = beat % 2 === 0 ? (candle < 2 ? 1 : event.variant === 'reversed' ? -1.5 : event.variant === 'muted' ? .1 : 1.2)
        : event.variant === 'reversed' ? -1 : event.variant === 'muted' ? .1 : .8;
      const drift = event.bias * phase * (0.00007 + day % 3 * 0.00001);
      const noise = (market() + market() - 1) * 0.00058 * event.vol;
      price = Math.max(10, price * (1 + drift + noise));
      ticks.push(Number(price.toFixed(6)));
    }
    return ticks;
  }));
  return {events, tracks};
}

function historyCandles(seed) {
  const rng = random(mix(seed, 0, 0x75ca));
  const candles = [];
  let price = 148.8;
  for (let i = 0; i < 18; i++) {
    const open = price;
    const points = Array.from({length: 6}, () => { price *= 1 + (rng() - .49) * .002; return price; });
    candles.push({open, close: price, high: Math.max(open, ...points), low: Math.min(open, ...points), closed: true, historical: true});
  }
  const ratio = 150 / price;
  for (const c of candles) for (const key of ['open','close','high','low']) c[key] *= ratio;
  return candles;
}
const initialChat = () => ({group:[{from:'群主', text:'新来的？群规第一条：盈利截图可以 P。',kind:'system'}],friend:[{from:'萌智子',text:'你说今天要克制一点。我会记着。',kind:'friend'}]});
export function createGame(seed = Date.now()) {
  seed = seed >>> 0;
  const state = {version: VERSION, seed, day: 1, beat: 0, phase: 'decision', price: 150,
    cash: START, reserve: 0, position: null, sanity: 100, dayOpening: START, candles: historyCandles(seed),
    script: null, pending: null, history: [], recent: [], chat: initialChat(), promise: null,
    relationship: 0, publicStance: null, factCheckedBeat: -1, promiseNoted:false, dinner:false, skills:{insight:false,shield:false,disconnect:false},
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
  s.sanity = Math.max(0, Math.min(100, s.sanity + (pnl>=0?Math.min(9,2+impact*60):-Math.min(28,4-impact*80))));
  const type = reason === 'liquidation' || p.risk>=25 && impact<-.07 ? 'despair'
    : p.risk>=25 && impact>.07 ? 'ecstatic'
    : p.nearMiss && pnl>=0 ? 'relieved'
    : peakUnrealized>0 && peakUnrealized-raw > before*.045 ? 'regretful'
    : pnl>0 ? 'smug' : pnl<0 ? 'anxious' : 'calm';
  experience(s,{type,impact,risk:p.risk,pnl,day:s.day,beat:s.beat});
  return s.lastTrade;
}
export function mood(s) {
  const latest = s.recent[0];
  const weighted = s.recent.reduce((sum,e,i)=>sum+e.impact*[1,.75,.5,.3,.15][i],0);
  if (latest?.type==='despair' || weighted<-.17) return 'despair';
  if (latest?.type==='ecstatic' && weighted>0) return 'ecstatic';
  if (latest?.type==='regretful') return 'regretful';
  if (s.position && (s.position.risk>=20 || unrealized(s)<-s.position.margin*.22)) return 'nervous';
  if (latest?.type==='relieved') return 'relieved';
  if (weighted<-.015 || latest?.type==='anxious' && weighted<0) return 'anxious';
  if (weighted>.02) return 'smug';
  return 'calm';
}
export function currentEvent(s){return s.script.events[Math.min(s.beat,BEATS_PER_DAY-1)];}
export function factCheck(s) {
  if(s.phase!=='decision'||s.skills.insight) return null;
  s.skills.insight=true;s.factCheckedBeat=s.beat;
  const e=currentEvent(s);
  return {title:'来源核实',text:e.fact,credibility:e.credibility};
}
export function useReserve(s) {
  if(s.phase!=='decision'||s.skills.shield||s.cash<1000) return false;
  const amount = Math.round(s.cash*.2);
  s.cash-=amount;s.reserve+=amount;s.skills.shield=true;
  return amount;
}
export function reply(s, channel, choice) {
  if(s.phase!=='decision'||!['group','friend'].includes(channel)) throw Error('行情播放时不能聊天');
  const list=s.chat[channel];
  const append=(from,text)=>list.push({from,text,kind:from==='你'?'self':channel});
  if(channel==='group'){
    if(choice==='source') {
      append('你','消息来源核实了吗？');const result=factCheck(s);
      append('群主',result?result.text:'这条我刚查过了，先看行情吧。');
    } else if(choice==='stance') {
      const direction=s.position?.direction||1;s.publicStance={day:s.day,beat:s.beat,direction};
      append('你',`这段我${direction===1?'看多':'看空'}。`);append('隔壁老王','收到。观点免费，盈亏自理。');
    } else if(choice==='share') {
      const risk=s.position?.margin/Math.max(equity(s),1)||0;
      append('你',`晒一张模拟账户：权益 ¥${Math.round(equity(s)).toLocaleString('zh-CN')}，仓位 ${Math.round(risk*100)}%。`);
      append('隔壁老王',risk>.7?'你这不是仓位，是人生简历。':risk>.25?'仓位不小啊，记得把亏损也晒出来。':'哦，还给自己留了口饭吃。');
    } else throw Error('不支持的群聊回复');
  } else {
    if(choice==='promise'){
      s.promise='break_even';s.promiseNoted=false;append('你','今天回本就走。');append('萌智子','好，我记着。回本了我来接你下班。');
    }else if(choice==='small'){
      s.promise='small';s.promiseNoted=false;append('你','今天最多两成仓。');append('萌智子','二成。截个图留作证据。');
    }else if(choice==='dinner'){
      s.relationship++;s.dinner=true;append('你','晚饭一起吃，我不会一直盯盘。');append('萌智子','那我先点菜。你来之前记得平仓。');
    }else throw Error('不支持的单聊回复');
  }
  return list.slice(-2);
}
function validateAction(s, action) {
  if(s.phase!=='decision') throw Error('请等待下一个决策点');
  const allowed=s.position?['hold','half','close','disconnect']:['long','short','wait','disconnect'];
  if(!allowed.includes(action.type)) throw Error('当前操作不可用');
  if(['long','short'].includes(action.type)){
    if(![.25,.5,1].includes(action.stake)||![5,20,50,100].includes(action.leverage)||![.25,.5,1].includes(action.stop)) throw Error('订单参数无效');
    if(s.cash*action.stake<100) throw Error('可用资金不足');
  }
  if(action.type==='disconnect'&&s.skills.disconnect) throw Error('今天已经拔过网线');
}
export function takeAction(s, action) {
  validateAction(s,action);
  const before=equity(s);
  let trade=null;
  if(action.type==='long'||action.type==='short'){
    const margin=Math.round(s.cash*action.stake);
    s.cash-=margin;
    s.position={direction:action.type==='long'?1:-1,entry:s.price,margin,leverage:action.leverage,
      stop:action.stop,risk:action.stake*action.leverage, maxUnrealized:0,nearMiss:false};
    s.lastTrade={type:'open',direction:s.position.direction,margin,leverage:action.leverage,entry:s.price,day:s.day,beat:s.beat};
    trade=s.lastTrade;
    if(action.leverage>=50)s.sanity=Math.max(0,s.sanity-(action.leverage===100?8:4));
  }else if(action.type==='half') trade=closePosition(s,.5,'half');
  else if(action.type==='close') trade=closePosition(s,1,'close');
  else if(action.type==='disconnect'){
    if(s.position) trade=closePosition(s,1,'disconnect');
    s.skills.disconnect=true;s.sanity=Math.min(100,s.sanity+25);
  }else if(action.type==='wait') s.sanity=Math.min(100,s.sanity+5);
  s.pending={beat:s.beat,candle:0,tick:0,action:action.type,before,flashShown:false};
  s.phase='playing';
  return {trade,before,after:equity(s),action:action.type};
}
function appendChatAfterBeat(s){
  const e=s.script.events[s.beat-1];
  s.chat.group.push({from:'群主',text:`${e.chain}：${e.flash}`,kind:'group'});
  if(s.lastTrade?.day===s.day&&s.lastTrade.beat===s.beat-1&&s.lastTrade.type==='liquidation')
    s.chat.friend.push({from:'萌智子',text:'先离屏幕一分钟。我不是来问亏了多少的。',kind:'friend'});
  else if(s.promise==='small'&&!s.promiseNoted&&s.position?.margin/Math.max(equity(s),1)>.2){
    s.promiseNoted=true;s.chat.friend.push({from:'萌智子',text:'我记得你说最多两成仓。现在这张单已经超过了。',kind:'friend'});
  }else if(s.promise==='break_even'&&!s.promiseNoted&&equity(s)>=s.dayOpening&&s.lastTrade?.day===s.day&&s.lastTrade.beat===s.beat-1&&s.lastTrade.pnl>0){
    s.promiseNoted=true;s.chat.friend.push({from:'萌智子',text:'你说回本就走。现在要不要我来接你？',kind:'friend'});
  }
  if(s.publicStance?.day===s.day&&s.publicStance?.beat===s.beat-1)
    s.chat.group.push({from:'隔壁老王',text:s.publicStance.direction===(s.price>=s.candles.at(-CANDLES_PER_BEAT)?.open?1:-1)?'这段你蒙对了，也别把运气当学历。':'刚才那句「我看多」还撤得回吗？',kind:'group'});
  for(const channel of ['group','friend'])s.chat[channel]=s.chat[channel].slice(-50);
}
function endDay(s) {
  if(s.position)closePosition(s,1,'closing');
  s.cash+=s.reserve;s.reserve=0;
  if(s.dinner)s.chat.friend.push({from:'萌智子',text:`我点好晚饭了。你今天${equity(s)>=s.dayOpening?'赚到':'亏掉'}的钱，都不能代替这一顿。`,kind:'friend'});
  const closing=equity(s);
  s.dayReport={day:s.day,opening:s.dayOpening,closing,net:closing-s.dayOpening,
    trades:s.history.filter(t=>t.day===s.day), mood:mood(s), promise:s.promise,
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
  s.day++;s.beat=0;s.phase='decision';s.dayOpening=equity(s);s.sanity=Math.min(100,s.sanity+22);
  s.script=planDay(s.seed,s.day,s.price);s.skills={insight:false,shield:false,disconnect:false};s.factCheckedBeat=-1;
  s.lastEvent=null;s.lastReaction=null;s.pending=null;s.promise=null;s.promiseNoted=false;s.dinner=false;s.publicStance=null;
  s.chat.friend.push({from:'萌智子',text:`第 ${s.day} 天。你昨天说过的话，我可没忘。今天还一起吃饭吗？`,kind:'friend'});
  return s;
}
export function restoreGame(raw) {
  try {
    const s=JSON.parse(raw);
    if(s?.version!==VERSION||!Number.isFinite(s.seed)||!Number.isFinite(s.price)||!Number.isFinite(s.cash)||!Array.isArray(s.candles)||!s.script?.tracks||!['decision','playing','day_end','bankrupt'].includes(s.phase))return null;
    if(s.phase==='playing'&&(!s.pending||!Number.isInteger(s.pending.beat)||!Number.isInteger(s.pending.candle)||!Number.isInteger(s.pending.tick)))return null;
    return s;
  }catch{return null;}
}
