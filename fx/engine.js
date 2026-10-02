import {itemUnlocked,discoverItems,itemDiscovered} from './item-events.js?v=da1d043bda91408042db7dae5be3319577d20085';
import {NEWS_CHAINS,PROPS} from './content.js?v=da1d043bda91408042db7dae5be3319577d20085';
import {BLACK_SWANS} from './story-content.js?v=da1d043bda91408042db7dae5be3319577d20085';
import {ensureStory,checkStories,restrictions,addEffect,ageEffects,queueStory,pendingStory} from './story.js?v=da1d043bda91408042db7dae5be3319577d20085';
export {pendingStory,chooseStory,restrictions,DEBUFFS} from './story.js?v=da1d043bda91408042db7dae5be3319577d20085';
import {appendDialogue,chooseDialogue,ensureDialogue,updateSpeech,chapterChat} from './dialogue.js?v=da1d043bda91408042db7dae5be3319577d20085';
export const VERSION = 5;
export const FEE_RATE = .00005;
export const STOP_OUT_LEVEL = .5;
export const LIVING_DAILY = 2200;
export const FATHER_SAVINGS = 3000000;
export const TARGET_PROFIT = 20000000;
export const START_PRICE = 1 / 150;
export const START = 100000;
export const CANDLES_PER_BEAT = 4;
export const BEATS_PER_DAY = 4;
export function beatsPerDay(s){return BEATS_PER_DAY+(s.bonusBeats||0);}
export {itemDiscovered,discoverItems};
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

export function planDay(seed, day, startPrice, rounds = BEATS_PER_DAY) {
  const story = random(mix(seed, day, 0x5170));
  const market = random(mix(seed, day, 0x61a0));
  const cycle=Math.floor((day-1)*2/CHAINS.length),bag=CHAINS.map((_,i)=>i),shuffle=random(mix(seed,cycle,0x777a));
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  const selected=[CHAINS[bag[((day-1)*2)%bag.length]],CHAINS[bag[((day-1)*2+1)%bag.length]]];
  const surprise=random(mix(seed,day,0x1b1a));
  const swan=surprise()<.22||day%7===0?{...BLACK_SWANS[Math.floor(surprise()*BLACK_SWANS.length)],beat:Math.floor(surprise()*4),candle:Math.floor(surprise()*3),tick:2+Math.floor(surprise()*3)}:null;
  const events = [];
  for (let beat = 0; beat < rounds; beat++) {
    const chain = selected[Math.floor(beat / 2)%selected.length];
    const variant = beat % 2 === 0 ? VARIANTS[Math.floor(story() * 3)] : events[beat - 1].variant;
    const [reveal, detail] = chain[variant];
    events.push({id: chain.id, chain: chain.name, variant, bias: chain.bias, vol: chain.vol,
      title: beat % 2 === 0 ? chain.lead : reveal,
      copy: beat % 2 === 0 ? chain.leadCopy : detail,
      source: chain.source, time: ['09:10','11:30','15:00','21:30','23:30'][beat]||'00:30',
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
    cash: START-LIVING_DAILY, reserve: LIVING_DAILY, positions: [], position: null, nextOrderId: 1, feesPaid: 0, feeLedger: [], sanity: 50, mentalBoost:0, bonusBeats:0, dayOpening: START, candles: historyCandles(seed),
    script: null, pending: null, history: [], recent: [], chat: {group:[],friend:[]}, promise: null,
    relationship: 0, publicStance: null, promiseNoted:false, dinner:false, skills:{mochiko:false,yasuko:false},
    fatherUsed:false,externalFunding:0,dayOpeningFunding:0,stress:0,heat:0,peakPersonal:START,equityTrail:[START],nextStop:null,
    lastEvent:null, lastTrade:null, lastReaction:null, dayReport:null};
  state.script = planDay(seed, 1, state.price);
  chapterChat(state);ensureStory(state);updateSpeech(state,'hopeful');state.dayOpeningLine=state.speech.text;
  return state;
}
// position remains a first-order view for older story/dialogue consumers.
// All accounting uses positions; legacy fixtures/saves can still supply position.
export function positionsOf(s) {
  if(Array.isArray(s.positions)&&s.positions.length)return s.positions;
  return s.position?[s.position]:[];
}
function ensureOrders(s){
  if(!Array.isArray(s.positions)||!s.positions.length&&s.position)s.positions=s.position?[s.position]:[];
  s.nextOrderId ||= 1;s.feesPaid ||= 0;s.feeLedger ||= [];
  for(const p of s.positions){
    if(!p.id)p.id='order-'+s.nextOrderId++;
    p.notional ??= p.margin*p.leverage;p.initialMargin ??= p.margin;p.openFeeRemaining ??= 0;p.openFee ??= 0;p.maxUnrealized ??= 0;p.stop ??= 1;
  }
  syncPosition(s);
}
function syncPosition(s){s.position=s.positions[0]||null;}
export function positionUnrealized(s,p){return p?((p.notional??p.margin*p.leverage)*p.direction*(s.price/p.entry-1)||0):0;}
export function unrealized(s){return positionsOf(s).reduce((sum,p)=>sum+positionUnrealized(s,p),0);}
export function accountMetrics(s){
  const positions=positionsOf(s),usedMargin=positions.reduce((sum,p)=>sum+p.margin,0),floating=unrealized(s);
  const requiredMargin=positions.reduce((sum,p)=>sum+(p.initialMargin??p.margin),0),tradingEquity=s.cash+usedMargin+floating;
  return {cash:s.cash,availableMargin:Math.max(0,Math.min(s.cash,tradingEquity-usedMargin)),usedMargin,
    unrealized:floating,tradingEquity,equity:Math.max(0,tradingEquity)+(s.reserve||0),
    requiredMargin,marginLevel:requiredMargin?tradingEquity/requiredMargin:null,notional:positions.reduce((sum,p)=>sum+(p.notional??p.margin*p.leverage),0),
    feesPaid:s.feesPaid||0,reserve:s.reserve||0};
}
export function equity(s){return accountMetrics(s).equity;}
const money=n=>Math.round(n*100)/100;
const fee=(margin,leverage)=>money(margin*leverage*FEE_RATE);
const floorMoney=n=>Math.max(0,Math.floor((n+1e-8)*100)/100);
function marginWithinBudget(budget,leverage){
  let margin=floorMoney(budget/(1+leverage*FEE_RATE));
  if(margin+fee(margin,leverage)>budget+1e-8)margin=floorMoney(margin-.01);
  return margin;
}
function accountLiquidationPrice(s,extra){
  const positions=[...positionsOf(s),...(extra?[extra]:[])],used=positions.reduce((sum,p)=>sum+p.margin,0);
  const slope=positions.reduce((sum,p)=>sum+(p.notional??p.margin*p.leverage)*p.direction/p.entry,0);
  if(Math.abs(slope)<1e-8)return null;
  const constant=s.cash-(extra?extra.margin+fee(extra.margin,extra.leverage):0)+used-positions.reduce((sum,p)=>sum+(p.notional??p.margin*p.leverage)*p.direction,0);
  const price=(STOP_OUT_LEVEL*positions.reduce((sum,p)=>sum+(p.initialMargin??p.margin),0)-constant)/slope;
  return price>0&&Number.isFinite(price)?price:null;
}
export function orderPreview(s,action={}){
  const a=accountMetrics(s),limits=restrictions(s),leverage=action.leverage;
  const factor=Number.isFinite(leverage)?leverage*FEE_RATE:0;
  const marginLimit=(Math.max(0,a.tradingEquity)*limits.stake-a.usedMargin)/(1+limits.stake*factor);
  const notionalLimit=Number.isFinite(leverage)?(Math.max(0,a.tradingEquity)*limits.leverage-a.notional)/(leverage+limits.leverage*factor):0;
  const maxMargin=floorMoney(Math.min(marginWithinBudget(a.availableMargin,leverage||0),Math.max(0,marginLimit),Math.max(0,notionalLimit)));
  const amountMode=Object.hasOwn(action,'amount');
  const margin=amountMode?money(action.amount):marginWithinBudget(a.availableMargin*(action.stake||0),leverage||0);
  const openFee=fee(margin,leverage||0),closeFee=openFee,stop=s.nextStop?Math.min(action.stop,s.nextStop):action.stop;
  const result={valid:false,error:null,margin,notional:margin*(leverage||0),openFee,closeFee,totalDebit:margin+openFee,maxMargin,
    stopPrice:stop<1&&leverage?s.price*(1-(action.type==='short'?-1:1)*stop/leverage):null,
    liquidationPrice:null,liquidationBasis:'account',riskPercent:a.tradingEquity>0?(a.usedMargin+margin)/Math.max(1,a.tradingEquity-openFee)*100:0,
    availableMargin:a.availableMargin,feeRate:FEE_RATE,stopOutLevel:STOP_OUT_LEVEL};
  let error=null;
  if(s.phase!=='decision')error='请等待下一个决策点';
  else if(!['long','short'].includes(action.type)||![5,20,50,100].includes(leverage)||![.25,.5,1].includes(action.stop)||amountMode&&(!Number.isFinite(action.amount)||action.amount<=0)||!amountMode&&(!Number.isFinite(action.stake)||action.stake<.01||action.stake>1))error='订单参数无效';
  else if(limits.noEntry)error='承受力过低，先休息';
  else if(leverage>limits.leverage)error='心理承受力不足，无法使用这个杠杆';
  else if(action.stop>limits.stop)error='心理承受力不足，需设置更紧的止损';
  else if(margin<100)error='保证金至少需要 ¥100';
  else if(margin+openFee>a.availableMargin+1e-7)error='可用保证金不足（需要预留开仓手续费）';
  else if(margin>maxMargin+1e-7)error='总持仓超过当前心理承受力的风险限额';
  result.error=error;result.valid=!error;
  if(result.valid)result.liquidationPrice=accountLiquidationPrice(s,{margin,leverage,direction:action.type==='long'?1:-1,entry:s.price});
  return result;
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
  const metrics=accountMetrics(s),exposure=Math.min(1,metrics.notional/Math.max(metrics.tradingEquity,1)/50);
  const earned=Math.max(0,Math.min(35,Math.log2(1+Math.max(0,personal-START)/1000)*5));
  s.sanity=Math.max(0,Math.min(100,Math.round(50+earned+(s.mentalBoost||0)+(s.restRecovery||0)-totalDrawdown*65-recentDrawdown*20-exposure*5-(s.stress||0)-modifiers.stress+modifiers.mental)));
  if((s.restRecovery||0)>0&&equity(s)>=5000)s.sanity=Math.max(6,s.sanity);
  if(s.developer?.edited&&Number.isFinite(s.developer.sanityOverride))s.sanity=Math.max(0,Math.min(100,s.developer.sanityOverride));
  const emotion=mood(s);discoverItems(s);checkStories(s,equity(s),emotion);updateSpeech(s,emotion);
  return {value:s.sanity,totalDrawdown,recentDrawdown,exposure};
}
function experience(s, entry) {
  if(entry.reversal){s.dayMoments ||= [];s.dayMoments.push({...entry,day:s.day,beat:s.beat});s.dayMoments=s.dayMoments.slice(-40);}
  s.recent.unshift(entry);
  s.recent = s.recent.slice(0, 5);
  s.lastReaction = {type: entry.type, day: s.day, beat: s.beat, risk:entry.risk||0,pnl:entry.pnl??null,positionId:entry.positionId||null,reversal:entry.reversal||null};
}
function closePosition(s, fraction, reason, positionId){
  ensureOrders(s);
  const p=positionId?s.positions.find(p=>p.id===positionId):s.positions[0];
  if(!p||fraction<=0||fraction>1)throw Error('没有可平仓位');
  const before=equity(s),margin=p.margin*fraction,raw=positionUnrealized(s,p)*fraction;
  const peakUnrealized=p.maxUnrealized*fraction,openFee=p.openFeeRemaining*fraction,closeFee=money((p.notional??p.margin*p.leverage)*fraction*FEE_RATE);
  let pnl=raw-openFee-closeFee;
  let lossReduction=0;
  if(reason==='liquidation'&&s.skills?.mochiko&&pnl<0){lossReduction=-pnl*.25;pnl+=lossReduction;s.protectionPaid=(s.protectionPaid||0)+lossReduction;s.protectionLedger ||= [];s.protectionLedger.push({day:s.day,positionId:p.id,amount:lossReduction});}

  s.cash+=margin+raw-closeFee+lossReduction;s.feesPaid+=closeFee;s.feeLedger.push({day:s.day,beat:Math.min(s.beat,beatsPerDay(s)-1),positionId:p.id,side:'close',amount:closeFee});
  p.notional=(p.notional??p.margin*p.leverage)*(1-fraction);p.initialMargin=(p.initialMargin??p.margin)*(1-fraction);p.margin-=margin;p.maxUnrealized*=1-fraction;p.openFeeRemaining-=openFee;
  if(p.margin<.00001||fraction===1)s.positions=s.positions.filter(order=>order!==p);
  syncPosition(s);
  s.lastTrade={type:reason,positionId:p.id,direction:p.direction,margin,leverage:p.leverage,entry:p.entry,exit:s.price,
    grossPnl:raw,lossReduction,protection:lossReduction>0,openFee,closeFee,fee:openFee+closeFee,feeAllocation:{open:openFee,close:closeFee},nearMiss:!!p.nearMiss,maxUnrealized:peakUnrealized,pnl,day:s.day,beat:Math.min(s.beat,beatsPerDay(s)-1)};
  s.history.push(s.lastTrade);
  const impact=pnl/Math.max(1000,before);
  s.heat=Math.max(0,Math.min(5,(s.heat||0)+(pnl>0?1:-1)));
  const type=pnl>=0?(p.nearMiss||p.recoveredFromLoss?'relieved':impact>.07?'ecstatic':pnl>0?'smug':'calm')
    :reason==='liquidation'||impact<-.07?'despair':peakUnrealized>0?'regretful':'anxious';
  experience(s,{type,impact,risk:p.risk,pnl,positionId:p.id,day:s.day,beat:s.beat});
  return s.lastTrade;
}
function protectBalance(s,trades){
  // Cross-margin losses may exceed one order's margin, but cannot consume reserve.
  // A gap can exhaust the trading account; debt relief is explicit in its ledger.
  if(!s.positions.length&&s.cash<0){
    const relief=-s.cash;s.cash=0;s.balanceProtection=(s.balanceProtection||0)+relief;
    const trade=trades.at(-1);if(trade){trade.balanceProtection=relief;trade.pnl+=relief;}
  }
  if(Math.abs(s.cash)<1e-8)s.cash=0;
}
function enforceMargin(s){
  const exits=[];
  while(s.positions.length&&accountMetrics(s).marginLevel<=STOP_OUT_LEVEL){
    const worst=[...s.positions].sort((a,b)=>positionUnrealized(s,a)-positionUnrealized(s,b))[0];
    exits.push(closePosition(s,1,'liquidation',worst.id));
  }
  protectBalance(s,exits);return exits;
}
function closeOrders(s,fraction,reason,positionId){
  ensureOrders(s);const targets=positionId?s.positions.filter(p=>p.id===positionId):[...s.positions];
  if(!targets.length)throw Error('没有可平仓位');
  const trades=targets.map(p=>closePosition(s,fraction,reason,p.id));
  trades.push(...enforceMargin(s));protectBalance(s,trades);mentalState(s);return trades;
}
export function mood(s) {
  const latest = s.recent[0];
  const weighted = s.recent.reduce((sum,e,i)=>sum+e.impact*[1,.75,.5,.3,.15][i],0);
  if (s.sanity<=15) return 'despair';
  if(s.sanity>=50&&s.day===1&&s.beat===0&&!s.position&&!latest&&Math.abs(tradingProfit(s))<.01)return 'hopeful';
  if(latest?.day===s.day&&(latest.observedMove||latest.reversal))return latest.type;
  if (latest?.type==='despair' || weighted<-.17) return 'despair';
  if (s.sanity<25) return 'anxious';
  if (latest?.type==='ecstatic' && weighted>0 || tradingProfit(s)>START*.15&&s.heat>=3) return 'ecstatic';
  if(positionsOf(s).some(p=>p.risk>=20||positionUnrealized(s,p)<-p.margin*.22))return 'nervous';
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
export function currentEvent(s){return s.swanSeen&&s.lastEvent?.swan&&s.lastEvent.beat===Math.min(s.beat,beatsPerDay(s)-1)?{...s.script.events[Math.min(s.beat,beatsPerDay(s)-1)],...s.lastEvent,source:'汇市紧急快讯'}:s.script.events[Math.min(s.beat,beatsPerDay(s)-1)];}
export function useProp(s,id){
 ensureStory(s);ensureOrders(s);
 if(!['decision','day_end','resting','bankrupt'].includes(s.phase)||s.phase!=='decision'&&id!=='father')throw Error('请等行情暂停');
 if(!PROPS[id])throw Error('没有这个物品');
 if(!itemUnlocked(s,id))throw Error('这个物品还没获得');
 if(id==='father'){
  if(s.fatherUsed)throw Error('这笔存款已经取过了');
  s.fatherUsed=true;s.cash+=FATHER_SAVINGS;s.externalFunding+=FATHER_SAVINGS;s.stress+=12;s.heat=Math.min(5,s.heat+2);
  s.family.outstanding=FATHER_SAVINGS;s.family.borrowedAt=(s.day-1)*4+s.beat;addEffect(s,'guilt',null);s.family.takenConfirmed=true;
  if(s.phase==='bankrupt')s.phase='day_end';refreshReport(s);mentalState(s);return{id,amount:FATHER_SAVINGS,trades:[],line:'这笔钱要还。'};
 }
 if(s.itemsUsed[id])throw Error('今天已经用过了');
 const cost=PROPS[id].cost||0;if(accountMetrics(s).availableMargin<cost)throw Error('可用资金不足');
 s.cash-=cost;s.expenses+=cost;s.itemsUsed[id]=true;
 if(id==='takeaway')s.mentalBoost=Math.min(50,(s.mentalBoost||0)+10);
 if(id==='celebration')s.mentalBoost=Math.min(50,(s.mentalBoost||0)+20);
 if(id==='noodles')s.livingDiscount=.4;
 if(id==='mochiko')s.skills.mochiko=true;
 if(id==='energy'){
  s.bonusBeats=(s.bonusBeats||0)+1;
  const expanded=planDay(s.seed,s.day,s.script.tracks.at(-1).at(-1).at(-1),beatsPerDay(s));
  s.script.events.push({...expanded.events[0],time:'23:30'});s.script.tracks.push(expanded.tracks[0]);
 }
 mentalState(s);return{id,cost,trade:null,trades:[],line:PROPS[id].copy};
}
export function debtSummary(s){return{family:s.family?.outstanding||0,network:s.loan?.outstanding||0,total:(s.family?.outstanding||0)+(s.loan?.outstanding||0)};}
export function borrowNetwork(s,amount){
 ensureStory(s);if(!['decision','day_end','resting'].includes(s.phase))throw Error('请等行情暂停');
 if(!s.loan.unlocked)throw Error('还没有发现网络贷款');
 if(!Number.isFinite(amount)||amount<100||amount>s.loan.limit-s.loan.outstanding)throw Error('借款金额超过额度');
 s.cash+=amount;s.externalFunding+=amount;s.loan.outstanding+=amount;s.loan.borrowed+=amount;s.loan.lastBorrow={day:s.day,amount};s.stress+=3;mentalState(s);refreshReport(s);return{amount,outstanding:s.loan.outstanding};
}
export function repayNetwork(s,amount){
 ensureStory(s);if(!['decision','day_end','resting'].includes(s.phase))throw Error('请等行情暂停');
 if(!Number.isFinite(amount)||amount<=0||amount>s.loan.outstanding||amount>accountMetrics(s).availableMargin)throw Error('还款超过可用资金或欠款');
 s.cash-=amount;s.externalFunding-=amount;s.loan.outstanding-=amount;s.loan.repaid+=amount;mentalState(s);refreshReport(s);return{amount,outstanding:s.loan.outstanding};
}
export function nearStopOrders(s){
 const a=accountMetrics(s);return positionsOf(s).map(p=>{
  const loss=Math.max(0,-positionUnrealized(s,p)),threshold=p.stop<1?p.margin*p.stop:null;
  const progress=threshold?loss/threshold:a.marginLevel?STOP_OUT_LEVEL/a.marginLevel:0;
  return{positionId:p.id,loss,threshold,progress,canTopUp:a.availableMargin>=100,maxTopUp:floorMoney(a.availableMargin),kind:threshold?'stop':'liquidation'};
 }).filter(p=>p.progress>=.65);
}
export function topUpMargin(s,id,amount){
 ensureOrders(s);if(!['playing','decision'].includes(s.phase))throw Error('当前无法追加保证金');
 const p=s.positions.find(p=>p.id===id);if(!p)throw Error('没有这个持仓');
 if(!Number.isFinite(amount)||amount<100||amount>accountMetrics(s).availableMargin)throw Error('追加金额超过可用资金');
 const before=equity(s);s.cash-=amount;p.margin+=amount;p.addedMargin=(p.addedMargin||0)+amount;p.leverage=p.notional/p.margin;
 s.collateralLedger ||= [];s.collateralLedger.push({day:s.day,beat:s.beat,positionId:id,amount});mentalState(s);
 return{positionId:id,amount,before,after:equity(s),notional:p.notional,margin:p.margin};
}
export function rescueClose(s,id){
 ensureOrders(s);if(!['playing','decision'].includes(s.phase))throw Error('当前无法提前平仓');
 const before=equity(s),trades=closeOrders(s,1,'rescue',id);return{trade:trades[0],trades,before,after:equity(s),action:'rescue'};
}
export function livingCost(s){
 const wealth=Math.max(0,equity(s));
 const base=wealth<20000?Math.max(100,wealth*.015):wealth<100000?500+(wealth-20000)*.02125:Math.min(50000,2200+(wealth-100000)*.002);
 return money(Math.min(wealth,base*(1-(s.livingDiscount||0))));
}
function refreshReport(s){if(!s.dayReport)return;const funding=s.externalFunding-s.dayOpeningFunding,costs=s.expenses-s.dayOpeningExpenses;s.dayReport.closing=equity(s);s.dayReport.funding=funding;s.dayReport.costs=costs;s.dayReport.net=equity(s)-s.dayOpening-funding+costs;s.dayReport.externalFunding=s.externalFunding;s.dayReport.tradeNet=s.dayReport.net;s.dayReport.netTradingProfit=s.dayReport.net;}
export function repayFather(s,amount){ensureStory(s);if(!['decision','day_end','resting'].includes(s.phase))throw Error('请等行情暂停');if(!Number.isFinite(amount)||amount<=0||amount>accountMetrics(s).availableMargin||amount>s.family.outstanding)throw Error('归还金额超过可用资金或欠款');const wasInformed=s.family.informed||s.family.discovered;s.cash-=amount;s.externalFunding-=amount;s.family.outstanding-=amount;s.family.repaid+=amount;s.family.lastRepayment={amount,outstanding:s.family.outstanding,wasInformed,day:s.day,beat:s.beat};s.family.informed=true;s.story.queue=s.story.queue.filter(id=>id!=='fatherFound');s.family.trust+=amount/FATHER_SAVINGS;
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
      const profit=tradingProfit(s),risk=Math.round(accountMetrics(s).usedMargin/Math.max(equity(s),1)*100);
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
function validateAction(s,action){
  if(s.phase!=='decision')throw Error('请等待下一个决策点');
  if(!['long','short','hold','wait','half','close'].includes(action.type))throw Error('当前操作不可用');
  if(['long','short'].includes(action.type)){
    const preview=orderPreview(s,action);if(!preview.valid)throw Error(preview.error);return preview;
  }
  if(['half','close'].includes(action.type)&&(!positionsOf(s).length||action.positionId&&!positionsOf(s).some(p=>p.id===action.positionId)))throw Error('没有可平仓位');
  return null;
}
export function takeAction(s,action){
  const preview=validateAction(s,action);ensureOrders(s);
  const before=equity(s);let trade=null,trades=[];
  if(action.type==='long'||action.type==='short'){
    const {margin,openFee}=preview;s.cash-=margin+openFee;if(Math.abs(s.cash)<1e-8)s.cash=0;s.feesPaid+=openFee;s.feeLedger.push({day:s.day,beat:s.beat,positionId:'order-'+s.nextOrderId,side:'open',amount:openFee});
    const p={id:'order-'+s.nextOrderId++,direction:action.type==='long'?1:-1,entry:s.price,margin,initialMargin:margin,notional:margin*action.leverage,leverage:action.leverage,
      stop:s.nextStop?Math.min(action.stop,s.nextStop):action.stop,risk:margin/Math.max(1,accountMetrics(s).tradingEquity+margin)*action.leverage,
      openFee,openFeeRemaining:openFee,maxUnrealized:0,nearMiss:false,day:s.day,beat:s.beat};
    s.positions.push(p);syncPosition(s);s.nextStop=null;
    s.lastTrade={type:'open',positionId:p.id,direction:p.direction,margin,leverage:p.leverage,entry:p.entry,openFee,fee:openFee,day:s.day,beat:s.beat};
    trade=s.lastTrade;trades=[trade];
    if(action.leverage>=50){s.stress+=action.leverage===100?8:4;s.restRecovery=Math.max(0,(s.restRecovery||0)-4);}
    s.heat=Math.min(5,s.heat+(action.leverage>=50?2:1));
  }else if(action.type==='half'||action.type==='close'){
    trades=closeOrders(s,action.type==='half'?.5:1,action.type,action.positionId);trade=trades[0];
  }else if(action.type==='wait'){s.stress=Math.max(0,s.stress-3);s.heat=Math.max(0,s.heat-1);}
  s.pending={beat:s.beat,candle:0,tick:0,action:action.type,before,flashShown:false,flatAtStart:!s.position,startPrice:s.price};
  s.phase='playing';mentalState(s);
  return {trade,trades,before,after:equity(s),action:action.type};
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
  if(positionsOf(s).length)closeOrders(s,1,'closing');
  s.cash+=s.reserve;s.reserve=0;
  const living=livingCost(s),interest=money((s.loan?.outstanding||0)*(s.loan?.dailyRate||.0005)),interestPaid=Math.min(Math.max(0,s.cash-living),interest),interestAccrued=interest-interestPaid;
  s.cash-=living+interestPaid;s.expenses+=living+interest;if(interestAccrued&&s.loan){s.loan.outstanding+=interestAccrued;s.externalFunding+=interestAccrued;}s.livingPaid=(s.livingPaid||0)+living;
  if(s.loan){s.loan.interestPaid+=interestPaid;s.loan.interestAccrued=(s.loan.interestAccrued||0)+interestAccrued;}
  s.expenseLedger ||= [];s.expenseLedger.push({day:s.day,living,interest});
  if(s.dinner)appendDialogue(s,'friend','friend.day.end');
  mentalState(s,true);
  const closing=equity(s),funding=s.externalFunding-s.dayOpeningFunding,costs=s.expenses-s.dayOpeningExpenses;
  s.dayReport={day:s.day,opening:s.dayOpening,closing,net:closing-s.dayOpening-funding+costs,funding,costs,
    livingCost:living,interest,interestPaid,interestAccrued,tradeNet:closing-s.dayOpening-funding+costs,netTradingProfit:closing-s.dayOpening-funding+costs,trades:s.history.filter(t=>t.day===s.day), mood:mood(s), promise:s.promise,externalFunding:s.externalFunding,
    openingLine:s.dayOpeningLine,closingLine:s.speech.text,fees:s.feeLedger.filter(t=>t.day===s.day).reduce((sum,t)=>sum+t.amount,0),feesPaid:s.feeLedger.filter(t=>t.day===s.day).reduce((sum,t)=>sum+t.amount,0),totalFeesPaid:s.feesPaid,
    moments:(s.dayMoments||[]).filter(t=>t.day===s.day),peak:s.history.filter(t=>t.day===s.day).reduce((a,t)=>!a||Math.abs(t.pnl||0)>Math.abs(a.pnl||0)?t:a,null)};
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
  ensureOrders(s);const exits=[];
  for(const pos of s.positions){
   const unreal=positionUnrealized(s,pos),last=pos.lastDirectionalFloating??pos.lastFloating??0;pos.maxUnrealized=Math.max(pos.maxUnrealized,unreal);
   const meaningful=Math.max(5,(pos.notional||0)*.00003);
   if(unreal<-pos.margin*.65)pos.nearMiss=true;
   if(last>meaningful&&unreal<-meaningful){pos.profitToLoss=true;experience(s,{type:'stunned',impact:unreal/Math.max(1000,equity(s)),risk:pos.risk,positionId:pos.id,reversal:'profit-to-loss',pnl:unreal});}
   if(last<-meaningful&&unreal>meaningful){pos.recoveredFromLoss=true;experience(s,{type:'relieved',impact:unreal/Math.max(1000,equity(s)),risk:pos.risk,positionId:pos.id,reversal:'loss-to-profit',pnl:unreal});}
   pos.lastFloating=unreal;if(Math.abs(unreal)>meaningful)pos.lastDirectionalFloating=unreal;
  }
  exits.push(...enforceMargin(s));
  for(const pos of [...s.positions])if(pos.stop<1&&positionUnrealized(s,pos)<=-pos.margin*pos.stop)exits.push(closePosition(s,1,'stop',pos.id));
  exits.push(...enforceMargin(s));protectBalance(s,exits);const exit=exits[0]||null;
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
    if(s.beat>=beatsPerDay(s)||equity(s)<MIN_EQUITY||s.sanity<=0){s.phase='closing';dayEnded=true;}
    else s.phase='decision';
  }
  return{price, candleClosed, beatEnded, dayEnded, exit, exits, flash, equity:equity(s), mood:mood(s)};
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
  s.day++;s.beat=0;s.phase='decision';s.dayOpening=equity(s);s.dayOpeningFunding=s.externalFunding;s.dayOpeningExpenses=s.expenses;s.stress=Math.max(0,s.stress-4);s.restRecovery=Math.min(32,(s.restRecovery||0)+8);s.heat=0;
  s.bonusBeats=0;s.livingDiscount=0;
  const living=Math.min(livingCost(s),Math.max(0,s.cash));s.cash-=living;s.reserve=living;
  s.script=planDay(s.seed,s.day,s.price);s.skills={mochiko:false,yasuko:false};s.itemsUsed={};s.nextStop=null;
  s.dayMoments=[];s.lastEvent=null;s.swanSeen=false;s.lastReaction=null;s.pending=null;s.promise=null;s.promiseNoted=false;s.dinner=false;s.publicStance=null;
  appendDialogue(s,'friend','friend.day.start');updateSpeech(s,mood(s),true);
  mentalState(s);s.dayOpeningLine=s.speech.text;return s;
}
export function restoreGame(raw) {
  try {
    let s=JSON.parse(raw);const oldVersion=s?.version;
    if(s&&[2,3].includes(s.version)&&Number.isFinite(s.cash)&&s.cash<0)return null;
    if(s&&Number.isFinite(s.cash)&&s.cash<0&&s.cash>=-1e-8)s.cash=0;
    if(!s||![2,3,4,VERSION].includes(s.version)||!Number.isFinite(s.seed)||!Number.isFinite(s.price)||s.price<=0||!Number.isFinite(s.cash)||!Array.isArray(s.candles)||!s.script?.tracks||!['decision','playing','closing','day_end','resting','ending','bankrupt'].includes(s.phase))return null;
    if(s.phase==='playing'&&(!s.pending||!Number.isInteger(s.pending.beat)||!Number.isInteger(s.pending.candle)||!Number.isInteger(s.pending.tick)))return null;
    if(s.version===2){delete s.positions;s=migrateV2(s);}
    if(s.version<4){delete s.positions;s.version=VERSION;}
    if(oldVersion<5){s.nextStop=null;s.version=VERSION;s.mentalBoost ||= 0;s.bonusBeats ||= 0;s.itemDiscoveries={...s.itemUnlocks};s.effects=(s.effects||[]).filter(e=>['guilt','familyWatch'].includes(e.id));}
    ensureOrders(s);
    const ids=new Set();
    for(const p of s.positions){
      if(typeof p.id!=='string'||ids.has(p.id)||![1,-1].includes(p.direction)||!Number.isFinite(p.entry)||p.entry<=0||!Number.isFinite(p.margin)||p.margin<=0||!Number.isFinite(p.leverage)||p.leverage<=0||p.leverage>100||!Number.isFinite(p.notional)||p.notional<=0||![.25,.5,1].includes(p.stop)||!Number.isFinite(p.openFeeRemaining)||p.openFeeRemaining<0)return null;
      ids.add(p.id);
    }
    // In cross margin, realizing the losing hedge can make cash negative while
    // its still-open winner covers it. Preserve that valid asset-backed ledger.
    if(s.cash<0&&(!s.positions.length||!Number.isFinite(accountMetrics(s).tradingEquity)||accountMetrics(s).tradingEquity<=0))return null;
    if(!Number.isFinite(s.feesPaid)||s.feesPaid<0||!Number.isInteger(s.nextOrderId)||s.nextOrderId<1)return null;
    while(ids.has('order-'+s.nextOrderId))s.nextOrderId++;
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
  s.version=3;s.price=1/oldPrice;
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
