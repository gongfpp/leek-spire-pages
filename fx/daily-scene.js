import {pendingStory} from './story.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';
import {TRANSITION_COPY} from './copy/transitions.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';
// One scene per closing screen. Item/family events take priority; a quiet night
// can instead show the day's reversal or one original-work quotation.
export function selectDailyScene(state){
 const report=state.dayReport;if(!report)return null;
 const event=state.day===report.day&&state.phase==='resting'?pendingStory(state):null;
 if(event&&event.key!=='quietNight')return {kind:'story',event};
 const turn=(report.moments||[]).filter(t=>t.reversal).at(-1);
 if(turn){const direction=turn.direction??report.trades?.find(t=>t.positionId===turn.positionId)?.direction;return {kind:'turnaround',event,turn,illustration:direction===1?'long-sequence':'portrait'};}
 const trades=(report.trades||[]).filter(t=>t.day===report.day&&Number.isFinite(t.pnl)&&Number.isFinite(t.entry)&&Number.isFinite(t.exit));
 // The original loss panel depicts a bought foreign currency falling in yen terms.
 // A short-USD loss on a rising quote cannot be illustrated by that falling-price line.
 const fallingLongLoss=trades.some(t=>t.direction===1&&t.exit<t.entry&&t.pnl<0);
 const big=Math.max(10000,report.opening*.2),homage=report.net>=big?'big-win':report.net<=-big?(fallingLongLoss?'big-loss':null):report.day===1&&trades.length?'first-day':null;
 if(homage)return {kind:'homage',event,homage,caption:'原作情节引用（其中金额为原作设定）：'+TRANSITION_COPY.homage[homage]};
 return {kind:'story',event};
}
