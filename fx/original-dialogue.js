import {ORIGINAL_DIALOGUE_BANK} from './copy/original-lines.js?v=67a113dea67d8564869ac8028026f79110f3cb2c';
export {ORIGINAL_DIALOGUE_BANK};
// Only public, already-rendered market observations are read here. Never inspect script/tracks.
function marketMove(s){
  const open=s.candles?.at(-4)?.open;
  if(!(s.beat>0)||s.pending||!Number.isFinite(open)||open<=0||!Number.isFinite(s.price))return null;
  return s.price/open-1;
}
function eligible(gate,s,f){
  if(!gate)return true;
  if(gate.startsWith('used.')){const id=gate.slice(5);return s.itemsUsed?.[id]===true||s.skills?.[id]===true;}
  if(gate.startsWith('promise.'))return s.promise===gate.slice(8);
  const move=marketMove(s);
  switch(gate){
    case 'laterDay':return s.day>1;
    case 'dinner':return s.dinner===true;
    case 'profit':return f.profit>0||f.unrealized>0;
    case 'netLoss':return f.profit< -1;
    case 'netFlat':return Number.isFinite(f.profit)&&Math.abs(f.profit)<=1;
    case 'held':return !!f.p;
    case 'loss':return f.loss===true;
    case 'receipt':return s.itemsUsed?.receipt===true&&s.lastTrade?.type==='receipt'&&s.lastTrade.day===s.day&&s.lastTrade.beat===Math.min(s.beat,3)&&s.lastTrade.pnl>0;
    case 'experience':return (s.history||[]).some(t=>t.day===s.day)||s.recent?.[0]?.day===s.day||s.lastTrade?.day===s.day;
    case 'stance.short':return s.publicStance?.day===s.day&&s.publicStance?.beat===s.beat&&s.publicStance.direction===-1;
    case 'stance.correct':case 'stance.wrong':{
      const stance=s.publicStance;
      if(move===null||stance?.day!==s.day||stance?.beat!==s.beat-1||![1,-1].includes(stance.direction))return false;
      const correct=stance.direction===(move>=0?1:-1);return gate==='stance.correct'?correct:!correct;
    }
    case 'market.up':return move!==null&&move>=.0005;
    case 'market.down':return move!==null&&move<=-.0005;
    case 'market.flat':return move!==null&&Math.abs(move)<.0005;
    case 'swan.up':return s.swanSeen===true&&s.lastEvent?.swan===true&&s.lastEvent.beat===s.beat&&s.lastEvent.delta>0;
    case 'swan.down':return s.swanSeen===true&&s.lastEvent?.swan===true&&s.lastEvent.beat===s.beat&&s.lastEvent.delta<0;
    default:return false;
  }
}
export function originalCandidates(s,trigger,facts={}){
  return ORIGINAL_DIALOGUE_BANK.filter(entry=>entry.trigger===trigger&&eligible(entry.gate,s,facts)).map(entry=>({
    id:entry.id,lines:entry.lines.map(([from,text],index)=>({id:entry.id+':'+index,from,text,origin:'original'}))
  }));
}
