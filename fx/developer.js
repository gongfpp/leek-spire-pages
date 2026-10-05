import {equity,tradingProfit,planDay,mentalState,settleDay,beginRest,restoreGame,START,CANDLES_PER_BEAT,BEATS_PER_DAY} from './engine.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';

const range=(value,min,max,label,integer=false)=>{
  if(!Number.isFinite(value)||value<min||value>max||integer&&!Number.isInteger(value))throw Error(`${label}需要在 ${min}～${max} 之间${integer?'，且为整数':''}`);
  return value;
};
export function developerValues(s){return {cash:s.cash,reserve:s.reserve,profit:tradingProfit(s),day:s.day,beat:Math.min(s.beat,3),price:s.price,stress:s.stress||0,debt:s.family.outstanding,phase:['decision','closing','day_end','resting'].includes(s.phase)?s.phase:'decision',sanity:s.developer?.sanityOverride??s.sanity};}

// Edits are atomic. Real position exits remain ordinary game actions, so the editor
// never destroys a margin balance or fabricates a settlement for an open order.
export function applyDeveloperPatch(current,patch){
  if(current.phase==='playing'&&!(current.realtime&&current.marketPaused)||current.position)throw Error('请先平仓并等行情暂停，再修改数据');
  const v={...developerValues(current),...patch};
  range(v.cash,0,1e10,'可用资金');range(v.reserve,0,1e8,'备用金');range(v.profit,-1e10,1e10,'交易净收益');
  range(v.day,1,10000,'日期',true);range(v.beat,0,3,'决策段',true);range(v.price,.001,100000,'USD/JPY 报价（日元/美元）');
  range(v.stress,0,100,'压力');range(v.debt,0,3000000,'父亲欠款');
  if(v.sanity!==null)range(v.sanity,0,100,'心理承受力');
  if(!['decision','closing','day_end','resting'].includes(v.phase))throw Error('请选择有效阶段');
  if(current.mode==='endless'&&v.phase!=='decision')throw Error('操盘模式没有日结或休息阶段，请选择等待决策');
  const s=structuredClone(current);
  s.cash=v.cash;s.reserve=v.reserve;s.day=v.day;s.beat=v.beat;s.price=v.price;s.stress=v.stress;
  s.externalFunding+=(v.debt-s.family.outstanding);s.family.outstanding=v.debt;
  s.family.unlocked ||= v.debt>0;s.fatherUsed ||= v.debt>0;
  if(v.debt>0&&s.family.borrowedAt===null)s.family.borrowedAt=(v.day-1)*4+v.beat;
  if(!v.debt)s.effects=s.effects.filter(e=>e.id!=='guilt');
  s.developer={edited:true,sanityOverride:v.sanity,profitOffset:equity(s)-100000-s.externalFunding+s.expenses-v.profit};
  s.dayOpening=equity(s);s.dayOpeningFunding=s.externalFunding;s.dayOpeningExpenses=s.expenses;
  s.dayReport=null;s.ending=null;s.pending=null;s.phase='decision';s.lastEvent=null;s.swanSeen=false;s.lastTrade=null;s.recent=[];s.lastReaction=null;s.emotionBias=null;
  s.script=planDay(s.seed,s.day,s.price);
  s.candles.push({open:s.price,close:s.price,high:s.price,low:s.price,closed:true,day:s.day,beat:s.beat,developer:true});
  s.candles=s.candles.slice(-100);s.history=[];
  // Edited runs start a new synthetic performance baseline. They remain marked
  // as developer data and cannot enter leaderboards or player achievements.
  s.startEquity=START;s.bonusBeats=0;s.completedDays=v.day-1;
  s.completedCandles=((v.day-1)*BEATS_PER_DAY+v.beat)*CANDLES_PER_BEAT;
  const netEquity=Math.max(0,START+v.profit),peakEquity=Math.max(START,netEquity);
  s.performance={totalProfit:v.profit,closedTrades:0,maxLoss:0,maxProfit:0,peakEquity,maxDrawdown:1-netEquity/peakEquity};
  if(s.loan)s.loan.lastInterestDay=v.day-1;
  s.peakPersonal=Math.max(100000,100000+v.profit);s.equityTrail=[s.peakPersonal];
  mentalState(s,true);
  if(v.phase!=='decision'){
    s.beat=BEATS_PER_DAY;s.completedCandles=v.day*BEATS_PER_DAY*CANDLES_PER_BEAT;s.phase='closing';
    if(v.phase==='day_end'||v.phase==='resting')settleDay(s);
    if(v.phase==='resting')beginRest(s);
  }
  const verified=restoreGame(JSON.stringify(s));
  if(!verified)throw Error('数据不能生成有效存档');
  return verified;
}
