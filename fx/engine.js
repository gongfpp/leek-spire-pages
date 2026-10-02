import {NEWS_CHAINS,PROPS} from './content.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {BLACK_SWANS} from './story-content.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {ensureStory,checkStories,restrictions,addEffect,ageEffects,queueStory,pendingStory} from './story.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
export {pendingStory,chooseStory,restrictions,DEBUFFS} from './story.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {appendDialogue,chooseDialogue,ensureDialogue,updateSpeech,chapterChat} from './dialogue.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
export const VERSION = 3;
export const LIVING_DAILY = 2200;
export const FATHER_SAVINGS = 3000000;
export const TARGET_PROFIT = 20000000;
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
  const cycle=Math.floor((day-1)*2/CHAINS.length),bag=CHAINS.map((_,i)=>i),shuffle=random(mix(seed,cycle,0x777a));
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  const selected=[CHAINS[bag[((day-1)*2)%bag.length]],CHAINS[bag[((day-1)*2+1)%bag.length]]];
  const surprise=random(mix(seed,day,0x1b1a));
  const swan=surprise()<.22||day%7===0?{...BLACK_SWANS[Math.floor(surprise()*BLACK_SWANS.length)],beat:Math.floor(surprise()*4),candle:Math.floor(surprise()*3),tick:2+Math.floor(surprise()*3)}:null;
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
      const shock=swan&&swan.beat===beat&&swan.candle===candle&&swan.tick===tick?swan.delta:0;
      price = Math.max(.0001, price * (1 + drift + noise + shock));
      ticks.push(Number(price.toFixed(9)));
    }
    return ticks;
  }));
  return {events, tracks, swan};
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
    script: null, pending: null, history: [], recent: [], chat: {group:[],friend:[]}, promise: null,
    relationship: 0, publicStance: null, promiseNoted:false, dinner:false, skills:{mochiko:false,yasuko:false},
    fatherUsed:false,externalFunding:0,dayOpeningFunding:0,stress:0,heat:0,peakPersonal:START,equityTrail:[START],nextStop:null,
    lastEvent:null, lastTrade:null, lastReaction:null, dayReport:null};
  state.script = planDay(seed, 1, state.price);
  chapterChat(state);ensureStory(state);updateSpeech(state,'hopeful');state.dayOpeningLine=state.speech.text;
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
export function tradingProfit(s){return equity(s)-START-(s.externalFunding||0)+(s.expenses||0)-(s.developer?.profitOffset||0);}
export function mentalState(s, sample=false){
  ensureStory(s);const modifiers=restrictions(s);
  const personal=Math.max(0,equity(s)-(s.externalFunding||0)+(s.expenses||0)-(s.developer?.profitOffset||0));
  s.peakPersonal=Math.max(START,s.peakPersonal||START,personal);
  s.equityTrail ||= [personal];
  if(sample){s.equityTrail.push(personal);s.equityTrail=s.equityTrail.slice(-48);}
  const recentPeak=Math.max(START*.01,...s.equityTrail,personal);
  const totalDrawdown=Math.max(0,1-personal/s.peakPersonal);
  const recentDrawdown=Math.max(0,1-personal/recentPeak);
  const exposure=s.position ? Math.min(1,s.position.margin/Math.max(equity(s),1))*Math.min(1,s.position.leverage/50) : 0;
  s.sanity=Math.max(0,Math.min(100,Math.round(100-totalDrawdown*80-recentDrawdown*20-exposure*8-(s.stress||0)-modifiers.stress+modifiers.mental+(s.restRecovery||0)+(s.reserve>=LIVING_DAILY?2:0))));
  if(s.developer?.edited&&Number.isFinite(s.developer.sanityOverride))s.sanity=Math.max(0,Math.min(100,s.developer.sanityOverride));
  const emotion=mood(s);checkStories(s,equity(s),emotion);updateSpeech(s,emotion);
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
  s.lastTrade = {type:reason, direction:p.direction, margin, leverage:p.leverage, entry:p.entry, exit:s.price, pnl, day:s.day, beat:Math.min(s.beat,BEATS_PER_DAY-1)};
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
  if (s.sanity<8) return 'despair';
  if(s.sanity>=75&&s.day===1&&s.beat===0&&!s.position&&!latest&&Math.abs(tradingProfit(s))<.01)return 'hopeful';
  if(latest?.day===s.day&&latest.observedMove)return latest.type;
  if (latest?.type==='despair' || weighted<-.17) return 'despair';
  if (s.sanity<25) return 'anxious';
  if (latest?.type==='ecstatic' && weighted>0) return 'ecstatic';
  if (s.position && (s.position.risk>=20 || unrealized(s)<-s.position.margin*.22)) return 'nervous';
  if (latest?.day===s.day&&latest?.type==='regretful') return 'regretful';
  if (latest?.day===s.day&&latest?.type==='relieved') return 'relieved';
  if (s.emotionBias?.until>(s.day-1)*4+s.beat) return s.emotionBias.mood;
  if((s.effects||[]).some(e=>e.id==='fatigue'))return 'exhausted';
  if(s.family?.outstanding>0&&s.family.discovered)return 'guilty';
  if (weighted<-.015 || latest?.type==='anxious' && weighted<0) return 'anxious';
  if((s.stress||0)>16&&s.sanity>=25)return 'irritated';
  if (weighted>.02) return 'smug';
  return 'calm';
}
export function currentEvent(s){return s.swanSeen&&s.lastEvent?.swan&&s.lastEvent.beat===Math.min(s.beat,3)?{...s.script.events[Math.min(s.beat,3)],...s.lastEvent,source:'汇市紧急快讯'}:s.script.events[Math.min(s.beat,BEATS_PER_DAY-1)];}
export function useProp(s,id){
  ensureStory(s);
  if(!['decision','day_end','resting','bankrupt'].includes(s.phase)||s.phase!=='decision'&&id!=='father')throw Error('请等行情暂停');
  if(!PROPS[id])throw Error('没有这个物品');
  if(id==='father'){
    if(!s.family.unlocked)throw Error('柜子的钥匙还没有出现');
    if(s.fatherUsed)throw Error('这笔存款已经取过了');
    s.fatherUsed=true;s.cash+=FATHER_SAVINGS;s.externalFunding+=FATHER_SAVINGS;s.stress+=12;s.heat=Math.min(5,s.heat+2);
    s.family.outstanding=FATHER_SAVINGS;s.family.borrowedAt=(s.day-1)*4+s.beat;addEffect(s,'guilt',null);s.emotionBias={mood:'guilty',until:(s.day-1)*4+s.beat+2};
    s.family.takenConfirmed=true;
    if(s.phase==='bankrupt')s.phase='day_end';refreshReport(s);mentalState(s);const line=chooseDialogue(s,'prop.father').lines[0]?.text||'';return{id,amount:FATHER_SAVINGS,line};
  }
  if(s.itemsUsed[id]||s.skills[id])throw Error('今天已经用过了');
  if(id==='receipt'&&(!s.position||unrealized(s)<=0))throw Error('先有一笔浮盈，再拍这张截图');
  const cost=PROPS[id].cost||0;if(s.cash<cost)throw Error('可用资金不够买这个');
  s.cash-=cost;s.expenses+=cost;s.itemsUsed[id]=true;if(['mochiko','yasuko'].includes(id))s.skills[id]=true;
  let trade=null;
  if(id==='mochiko'){
    if(s.position){s.position.stop=Math.min(s.position.stop,.25);if(unrealized(s)<=-s.position.margin*s.position.stop)trade=closePosition(s,1,'stop');}else s.nextStop=.25;
    s.stress=Math.max(0,s.stress-8);addEffect(s,'caution',1);
  }else if(id==='yasuko'||id==='airplane'){
    if(s.position)trade=closePosition(s,1,id);s.stress=Math.max(0,s.stress-(id==='airplane'?16:12));s.heat=Math.max(0,s.heat-2);addEffect(s,'offline',1);
  }else if(id==='tea'){s.stress=Math.max(0,s.stress-10);addEffect(s,'bathroom',1);s.emotionBias={mood:'warm',until:(s.day-1)*4+s.beat+1};}
  else if(id==='energy'){addEffect(s,'wired',2);s.emotionBias={mood:'focused',until:(s.day-1)*4+s.beat+2};}
  else if(id==='notebook'){addEffect(s,'notes',2);s.emotionBias={mood:'focused',until:(s.day-1)*4+s.beat+2};}
  else if(id==='amulet'){addEffect(s,'lucky',2);s.emotionBias={mood:'hopeful',until:(s.day-1)*4+s.beat+2};}
  else if(id==='receipt'){trade=closePosition(s,.5,'receipt');s.stress=Math.max(0,s.stress-6);addEffect(s,'ego',2);s.emotionBias={mood:'embarrassed',until:(s.day-1)*4+s.beat+2};}
  mentalState(s);const line=chooseDialogue(s,'prop.'+id).lines[0]?.text||'';return{id,trade,cost,stop:s.position?.stop||s.nextStop,line};
}
function refreshReport(s){if(!s.dayReport)return;const funding=s.externalFunding-s.dayOpeningFunding,costs=s.expenses-s.dayOpeningExpenses;s.dayReport.closing=equity(s);s.dayReport.funding=funding;s.dayReport.costs=costs;s.dayReport.net=equity(s)-s.dayOpening-funding+costs;s.dayReport.externalFunding=s.externalFunding;}
export function repayFather(s,amount){ensureStory(s);if(!['decision','day_end','resting'].includes(s.phase))throw Error('请等行情暂停');if(!Number.isFinite(amount)||amount<=0||amount>s.cash||amount>s.family.outstanding)throw Error('归还金额超过可用资金或欠款');const wasInformed=s.family.informed||s.family.discovered;s.cash-=amount;s.externalFunding-=amount;s.family.outstanding-=amount;s.family.repaid+=amount;s.family.lastRepayment={amount,outstanding:s.family.outstanding,wasInformed,day:s.day,beat:s.beat};s.family.informed=true;s.story.queue=s.story.queue.filter(id=>id!=='fatherFound');s.family.trust+=amount/FATHER_SAVINGS;
 const full=s.family.outstanding<.00001;if(full){s.family.outstanding=0;s.effects=s.effects.filter(e=>e.id!=='guilt');s.story.queue=s.story.queue.filter(id=>id!=='fatherFound'&&id!=='repayPartial');}
 queueStory(s,full?'repayFull':'repayPartial');s.emotionBias={mood:full?'determined':'guilty',until:(s.day-1)*4+s.beat+2};mentalState(s);refreshReport(s);return{amount,outstanding:s.family.outstanding,full};}
export function reply(s, channel, choice) {
  if(!['decision','closing','day_end','resting'].includes(s.phase)||!['group','friend','campus'].includes(channel))throw Error('行情播放时不能聊天');
  ensureStory(s);
  if(channel==='friend'&&['disclose_position','disclose_debt','disclose_greed','confess'].includes(choice)){
    const key=choice==='disclose_position'?'position':choice==='disclose_greed'?'greed':'debt';
    if(key==='position'&&!s.position)throw Error('现在没有持仓可告知');
    if(key==='debt'&&!(s.family.outstanding>0))throw Error('现在没有欠款可告知');
    if(key==='greed'&&!(tradingProfit(s)>0||unrealized(s)>0))throw Error('这句话需要实际盈利');
    s.disclosures ||= {};s.disclosures[key]={day:s.day,beat:s.beat};
    return appendDialogue(s,channel,'friend.'+key);
  }
  if(channel==='campus'&&['class','lunch','hide'].includes(choice)){s.relationship+=choice==='hide'?0:1;s.stress=Math.max(0,s.stress+(choice==='hide'?2:-3));s.emotionBias={mood:choice==='hide'?'lonely':choice==='class'?'focused':'warm',until:(s.day-1)*4+s.beat+1};return appendDialogue(s,channel,'campus.'+choice);}
  if(channel==='group'){
    if(choice==='meme')return appendDialogue(s,channel,'group.meme');
    if(choice==='ask')return appendDialogue(s,channel,'group.ask');
    if(choice==='stance'){
      const direction=s.position?.direction||1;s.publicStance={day:s.day,beat:s.beat,direction};
      return appendDialogue(s,channel,direction===1?'group.stance.long':'group.stance.short');
    }
    if(choice==='share'){
      const profit=tradingProfit(s),risk=Math.round((s.position?.margin||0)/Math.max(equity(s),1)*100);
      const yen=n=>(n<0?'−':'')+'¥'+Math.abs(Math.round(n)).toLocaleString('zh-CN');
      return appendDialogue(s,channel,'group.share.'+(profit>1?'win':profit< -1?'loss':'flat'),{equity:yen(equity(s)),risk:risk+'%',profit:(profit>0?'+':'')+yen(profit)});
    }
    throw Error('不支持的群聊回复');
  }
  if(['talk','study','walk','confess'].includes(choice)){if(choice==='confess'&&!(s.family.outstanding>0))throw Error('现在没有这件事可说');s.relationship++;s.stress=Math.max(0,s.stress-4);s.emotionBias={mood:choice==='study'?'focused':choice==='confess'?'guilty':'warm',until:(s.day-1)*4+s.beat+1};return appendDialogue(s,channel,'friend.'+choice);}
  if(choice==='promise'){s.promise='break_even';s.promiseNoted=false;return appendDialogue(s,channel,'friend.promise');}
  if(choice==='small'){s.promise='small';s.promiseNoted=false;return appendDialogue(s,channel,'friend.small');}
  if(choice==='dinner'){s.relationship++;s.dinner=true;return appendDialogue(s,channel,'friend.dinner');}
  throw Error('不支持的单聊回复');
}
function validateAction(s, action) {
  if(s.phase!=='decision') throw Error('请等待下一个决策点');
  const allowed=s.position?['hold','half','close']:['long','short','wait'];
  if(!allowed.includes(action.type)) throw Error('当前操作不可用');
  if(['long','short'].includes(action.type)){
    if(![.25,.5,1].includes(action.stake)||![5,20,50,100].includes(action.leverage)||![.25,.5,1].includes(action.stop)) throw Error('订单参数无效');
    const limits=restrictions(s);if(limits.noEntry)throw Error('先把这段行情看完，再开手机');if(action.leverage>limits.leverage||action.stake>limits.stake)throw Error('这次先照着物品上的约定来');
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
    if(action.leverage>=50){s.stress+=action.leverage===100?8:4;s.restRecovery=Math.max(0,(s.restRecovery||0)-4);}
    s.heat=Math.min(5,s.heat+(action.leverage>=50?2:1));
  }else if(action.type==='half') trade=closePosition(s,.5,'half');
  else if(action.type==='close') trade=closePosition(s,1,'close');
  else if(action.type==='wait'){s.stress=Math.max(0,s.stress-3);s.heat=Math.max(0,s.heat-1);}
  s.pending={beat:s.beat,candle:0,tick:0,action:action.type,before,flashShown:false,flatAtStart:!s.position,startPrice:s.price};
  s.phase='playing';
  mentalState(s);
  return {trade,before,after:equity(s),action:action.type};
}
function appendChatAfterBeat(s){
  const first=s.candles.at(-CANDLES_PER_BEAT),delta=s.price/(first?.open||s.price)-1;
  appendDialogue(s,'group','group.market.'+(Math.abs(delta)<.0005?'flat':delta>0?'up':'down'));
  if(s.publicStance?.day===s.day&&s.publicStance.beat===s.beat-1){
    const correct=s.publicStance.direction===(delta>=0?1:-1);
    appendDialogue(s,'group','group.stance.'+(correct?'correct':'wrong'));
  }
  if(s.promise&&!s.promiseNoted){
    s.promiseNoted=true;
    appendDialogue(s,'friend','friend.remind.'+(s.promise==='small'?'small':'break_even'));
  }
  updateSpeech(s,mood(s),true);
}
export function settleDay(s) {
  if(s.phase!=='closing')throw Error('请等待今日行情结束，再全平收盘');
  if(s.position)closePosition(s,1,'closing');
  s.cash+=s.reserve;s.reserve=0;
  if(s.dinner)appendDialogue(s,'friend','friend.day.end');
  mentalState(s,true);
  const closing=equity(s),funding=s.externalFunding-s.dayOpeningFunding,costs=s.expenses-s.dayOpeningExpenses;
  s.dayReport={day:s.day,opening:s.dayOpening,closing,net:closing-s.dayOpening-funding+costs,funding,costs,
    trades:s.history.filter(t=>t.day===s.day), mood:mood(s), promise:s.promise,externalFunding:s.externalFunding,
    openingLine:s.dayOpeningLine,closingLine:s.speech.text,
    peak:s.history.filter(t=>t.day===s.day).reduce((a,t)=>!a||Math.abs(t.pnl||0)>Math.abs(a.pnl||0)?t:a,null)};
  s.phase='day_end';return s.dayReport;
}
export function beginRest(s){if(s.phase!=='day_end')throw Error('先完成全平收盘');s.phase='resting';mentalState(s);return pendingStory(s);}
export function finishCampaign(s,id='walkaway'){
  if(!['day_end','resting'].includes(s.phase)||pendingStory(s))throw Error('先完成今晚的休息事件');
  if(!['million','walkaway','broke','crisis'].includes(id))throw Error('未知结局');
  s.ending={id,day:s.day,equity:equity(s),profit:tradingProfit(s),sanity:s.sanity};s.phase='ending';return s.ending;
}
export function endingCondition(s){return s.sanity<=5&&equity(s)<5000?'crisis':equity(s)<MIN_EQUITY?'broke':tradingProfit(s)>=TARGET_PROFIT?'million':null;}
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
  if(p.candle===1&&p.tick===2&&!p.flashShown&&!(s.lastEvent?.swan&&s.lastEvent.beat===p.beat)){p.flashShown=true;const e=s.script.events[p.beat];flash={title:e.flash,copy:e.flashCopy,chain:e.chain};s.lastEvent=flash;}
  const swan=s.script.swan;if(swan&&swan.beat===p.beat&&swan.candle===p.candle&&swan.tick===p.tick){s.swanSeen=true;flash={...swan,swan:true,chain:swan.name};s.lastEvent=flash;s.emotionBias={mood:'stunned',until:(s.day-1)*4+s.beat+2};appendDialogue(s,'group','group.swan.'+(swan.delta>0?'up':'down'));}
  mentalState(s,true);
  p.tick++;
  let candleClosed=false,beatEnded=false,dayEnded=false;
  if(p.tick>=points.length){candle.closed=true;candleClosed=true;p.tick=0;p.candle++;}
  if(p.candle>=CANDLES_PER_BEAT){
    if(p.flatAtStart&&!s.position){const observedMove=s.price/(p.startPrice||s.price)-1;if(Math.abs(observedMove)>=.004)experience(s,{type:observedMove>0?'regretful':'relieved',impact:0,observedMove,day:s.day,beat:s.beat});}
    s.beat++;s.pending=null;beatEnded=true;ageEffects(s);mentalState(s);appendChatAfterBeat(s);
    if(s.beat>=BEATS_PER_DAY||equity(s)<MIN_EQUITY||s.sanity<=0){s.phase='closing';dayEnded=true;}
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
  if(s.phase!=='resting')throw Error('请先休市休息');
  if(pendingStory(s))throw Error('先回应今晚的事件');
  mentalState(s);
  const ending=endingCondition(s);if(ending){finishCampaign(s,ending);return s;}
  s.day++;s.beat=0;s.phase='decision';s.dayOpening=equity(s);s.dayOpeningFunding=s.externalFunding;s.dayOpeningExpenses=s.expenses;s.stress=Math.max(0,s.stress-4);s.restRecovery=Math.min(30,(s.restRecovery||0)+20);s.heat=0;
  const living=Math.min(LIVING_DAILY,s.cash);s.cash-=living;s.reserve=living;
  s.script=planDay(s.seed,s.day,s.price);s.skills={mochiko:false,yasuko:false};s.itemsUsed={};s.nextStop=null;
  s.lastEvent=null;s.swanSeen=false;s.lastReaction=null;s.pending=null;s.promise=null;s.promiseNoted=false;s.dinner=false;s.publicStance=null;
  appendDialogue(s,'friend','friend.day.start');updateSpeech(s,mood(s),true);
  mentalState(s);s.dayOpeningLine=s.speech.text;return s;
}
export function restoreGame(raw) {
  try {
    let s=JSON.parse(raw);
    if(!s||![2,VERSION].includes(s.version)||!Number.isFinite(s.seed)||!Number.isFinite(s.price)||s.price<=0||!Number.isFinite(s.cash)||s.cash<0||!Array.isArray(s.candles)||!s.script?.tracks||!['decision','playing','closing','day_end','resting','ending','bankrupt'].includes(s.phase))return null;
    if(s.phase==='playing'&&(!s.pending||!Number.isInteger(s.pending.beat)||!Number.isInteger(s.pending.candle)||!Number.isInteger(s.pending.tick)))return null;
    if(s.version===2)s=migrateV2(s);
    if(!Number.isFinite(s.reserve)||s.reserve<0||!Number.isFinite(s.externalFunding)||!Array.isArray(s.equityTrail)||!s.chat?.group||!s.chat?.friend)return null;
    if(!s.dialogueMemory){s.archivedChat=s.chat;chapterChat(s);s.speech=null;}
    if(s.phase==='bankrupt')s.phase='day_end';
    if(s.phase==='ending'&&(!s.ending||!['million','walkaway','broke','crisis'].includes(s.ending.id)))return null;
    ensureStory(s);ensureDialogue(s);mentalState(s);s.dayOpeningLine ??= s.speech.text;
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
  s.archivedChat=s.chat;chapterChat(s);
  if(s.promise)appendDialogue(s,'friend','friend.remind.'+(s.promise==='small'?'small':'break_even'));
  if(s.dayReport){s.dayReport.funding=0;s.dayReport.externalFunding=0;for(const t of s.dayReport.trades||[])convertTrade(t);convertTrade(s.dayReport.peak);}
  return s;
}
