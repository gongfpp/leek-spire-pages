import {START,CANDLES_PER_BEAT,TICKS_PER_CANDLE,BEATS_PER_DAY,beatsPerDay} from './engine.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';

// Returns ratios as fractions (0.10 = 10%). Closed pnl already includes both fees;
// external funding, consumption and open floating gains never count as returns.
export function runPerformance(state){
  const mode=state.mode==='endless'?'endless':'story';
  const startEquity=Number.isFinite(state.startEquity)&&state.startEquity>0?state.startEquity:START;
  const trades=(state.history||[]).filter(t=>t.type!=='open'&&Number.isFinite(t.pnl));
  const summary=state.performance;
  let totalProfit=0,maxLoss=0,maxProfit=0,peak=startEquity,maxDrawdown=0;
  for(const trade of trades){totalProfit+=trade.pnl;maxLoss=Math.min(maxLoss,trade.pnl);maxProfit=Math.max(maxProfit,trade.pnl);peak=Math.max(peak,startEquity+totalProfit);maxDrawdown=Math.max(maxDrawdown,1-Math.max(0,startEquity+totalProfit)/peak);}
  if(summary){({totalProfit,maxLoss,maxProfit,maxDrawdown}=summary);}
  const partialCandle=(state.pending?.tick||0)/TICKS_PER_CANDLE;
  const completedCandles=state.completedCandles??Math.max(0,((state.day||1)-1)*16+(state.beat||0)*CANDLES_PER_BEAT+(state.pending?.candle||0));
  const dayComplete=['day_end','resting','ending'].includes(state.phase)&&mode==='story'&&(state.beat||0)>=beatsPerDay(state);
  const elapsedSimulatedDays=mode==='endless'?(completedCandles+partialCandle)/(BEATS_PER_DAY*CANDLES_PER_BEAT)
    :Math.max(0,(state.day||1)-1)+(dayComplete?1:Math.min(1,((state.beat||0)*CANDLES_PER_BEAT+(state.pending?.candle||0)+partialCandle)/(beatsPerDay(state)*CANDLES_PER_BEAT)));
  const elapsedDays=Math.max(1,elapsedSimulatedDays);
  const completedDays=state.completedDays??Math.max(0,(state.day||1)-1+(dayComplete&&state.ending?.id!=='broke'?1:0));
  const returnRate=totalProfit/startEquity;
  const winRateTrades=summary?.winRateTrades??trades.length,winningTrades=summary?.winningTrades??trades.filter(t=>t.pnl>0).length;
  return {mode,startEquity,initialEquity:startEquity,elapsedDays,elapsedSimulatedDays,completedCandles,completedDays,daysSurvived:completedDays,
    totalProfit,returnRate,totalReturnRate:returnRate,dailyReturnRate:returnRate/elapsedDays,maxLoss,maxProfit,maxDrawdown,
    closedTrades:summary?.closedTrades??trades.length,winningTrades,winRateTrades,winRate:winRateTrades?winningTrades/winRateTrades:null};
}
