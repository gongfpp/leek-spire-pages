import {pendingStory} from './story.js?v=88d93a74d3ccac11e74e9918fcd7c0383997bcd5';
import {TRANSITION_COPY} from './copy/transitions.js?v=88d93a74d3ccac11e74e9918fcd7c0383997bcd5';
// One scene per closing screen. Item/family events take priority; a quiet night
// can instead show the day's reversal or one original-work quotation.
export function selectDailyScene(state){
 const report=state.dayReport;if(!report)return null;
 const event=state.day===report.day&&state.phase==='resting'?pendingStory(state):null;
 if(event&&event.key!=='quietNight')return {kind:'story',event};
 const turn=(report.moments||[]).filter(t=>t.reversal).at(-1);
 if(turn)return {kind:'turnaround',event,turn};
 const big=Math.max(10000,report.opening*.2),homage=report.net>=big?'big-win':report.net<=-big?'big-loss':report.day===1?'first-day':null;
 if(homage)return {kind:'homage',event,homage,caption:TRANSITION_COPY.homage[homage]};
 return {kind:'story',event};
}
