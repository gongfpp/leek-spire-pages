import {TIMES,slots,restriction,oldUnits,pct} from './trading.js?v=82ac3ff11395dbeeecb02c3d06dcb66bd310dc05';
import {marketFor} from './progression.js?v=82ac3ff11395dbeeecb02c3d06dcb66bd310dc05';
export const SESSION_TIMES=['09:30','10:10','10:50','11:30','13:40','14:20','15:00'];
export const TICK_MS=3000;
export function startTape(s){const c=s.combat;c.live={step:0,value:0,mood:3,points:[0],seed:(s.seed^Math.imul(s.rounds+1,2654435761))>>>0};c.mood=3;}
export function tickTape(s){const c=s.combat,l=c.live;if(!l||l.step>=6)return;const m=marketFor(s);l.step++;const k=l.step;l.seed=(Math.imul(l.seed,1664525)+1013904223)>>>0;const noise=l.seed/4294967296-.5;const base=m.sequence[(c.turn-1)%m.sequence.length];l.value=Math.round((base*k/6+noise*(k===6?Math.abs(base)*.4:12))*10)/10;l.points.push(l.value);const target=l.value<=-15?0:l.value<-7?1:l.value<-2?2:l.value<5?3:l.value<12?4:5;l.mood+=Math.sign(target-l.mood);c.mood=l.mood;}
export function publicQuote(s){if(s.version===4){const l=s.combat?.live;return l?{value:l.value,price:l.price,mood:l.mood,phase:'今日行情',time:TIMES[l.step],closed:l.step===5}:null;}const l=s.combat?.live;return l?{value:l.value,mood:l.mood,phase:'今日行情',time:SESSION_TIMES[l.step],closed:l.step===6}:null;}
export function availablePosition(s){return s.version===4?pct(s,oldUnits(s)):Math.max(0,s.position-(s.boughtToday||0));}
export const SELL_CARDS=['reduce','stop','empty','cashout'];
export function tradingRestriction(s,card){
 if(s.version===4)return restriction(s,card);
 if(!s.combat)return '当前不能出牌';
 if(s.version===3&&s.combat.live?.step===6)return '15:00 已收盘，请结算';
 if(SELL_CARDS.includes(card.id)){
  if(s.combat.faith)return '龙头信仰锁仓，本场不能减仓';
  if(s.combat.locked)return '继续格局生效，今日不能减仓';
  if(s.version===3&&availablePosition(s)<=0)return s.boughtToday?'T+1：今日买入明日才可卖':'没有可卖出的持仓';
 }
 if(s.version===3&&['probe','add','volume','dip','leverage','allin'].includes(card.id)&&s.position>=(['leverage'].includes(card.id)?150:100))return '已达到这张牌的仓位上限';
 return '';
}

// Manual sessions keep economic prices frozen until the player advances.
export function startManualTape(s){const c=s.combat,open=s.book?.lastPrice||100;c.live={step:0,open,price:open,value:0,mood:3,points:[open],candles:[],seed:(s.seed^Math.imul(s.rounds+1,2654435761))>>>0};c.mood=3;}
export function advanceTape(s,target){const c=s.combat,l=c.live,m=marketFor(s);while(l.step<target){const prev=l.price;l.step++;if(l.step===3){l.points.push(prev);continue;}l.seed=(Math.imul(l.seed,1664525)+1013904223)>>>0;const noise=l.seed/4294967296-.5,k=({1:1,2:2,4:3,5:4})[l.step],base=Math.max(-9,Math.min(9,m.sequence[(c.turn-1)%m.sequence.length]/3));const change=Math.max(-9.8,Math.min(9.8,base*k/4+noise*2));l.price=Math.round(l.open*(1+change/100)*100)/100;l.value=(l.price/l.open-1)*100;l.points.push(l.price);const range=Math.abs(prev-l.price);l.candles.push({step:l.step,open:prev,close:l.price,high:Math.round((Math.max(prev,l.price)+range*.2+.03)*100)/100,low:Math.round((Math.min(prev,l.price)-range*.15-.03)*100)/100});const targetMood=l.value<=-4?0:l.value<-2?1:l.value<-.5?2:l.value<1?3:l.value<3?4:5;l.mood+=Math.sign(targetMood-l.mood);c.mood=l.mood;}}
