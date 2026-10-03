import {DIALOGUE_BANK} from './dialogue-bank.js?v=88d93a74d3ccac11e74e9918fcd7c0383997bcd5';
import {ORIGINAL_DIALOGUE_BANK,originalCandidates} from './original-dialogue.js?v=88d93a74d3ccac11e74e9918fcd7c0383997bcd5';

export const DIALOGUE_VERSION=6;
const quotes=new Map(DIALOGUE_BANK.flatMap(q=>[[q.id,q],[q.alias,q]]));
const n=value=>Number.isFinite(value)?value:0;
const money=value=>Math.round(n(value)).toLocaleString('zh-CN');
const empty=()=>({id:null,lines:[]});
export function dialogueFacts(s){
  const positions=Array.isArray(s.positions)&&s.positions.length?s.positions:s.position?[s.position]:[];
  const p=positions[0],unrealized=positions.reduce((sum,p)=>sum+n(p.notional??n(p.margin)*n(p.leverage))*n(p.direction)*(n(s.price)/Math.max(Number.EPSILON,n(p.entry))-1),0);
  const equity=Math.max(0,n(s.cash)+positions.reduce((sum,p)=>sum+n(p.margin),0)+unrealized)+n(s.reserve);
  const profit=equity-100000-n(s.externalFunding)+n(s.expenses)-n(s.developer?.profitOffset);
  const trades=(s.history||[]).filter(t=>Number.isFinite(t.pnl));
  const loss=profit<-.01||unrealized<-.01||trades.some(t=>t.pnl<-.01);
  const bigLoss=profit<=-30000||(s.recent||[]).some(t=>n(t.pnl)<0&&n(t.impact)<=-.07)||trades.some(t=>t.pnl<=-30000);
  const recent=s.recent?.[0];
  const flat=!!recent&&!p&&recent.day===s.day&&n(recent.impact)===0&&!n(recent.pnl)&&Number.isFinite(recent.observedMove);
  const payment=s.family?.lastRepayment;
  return {p,unrealized,equity,profit,loss,bigLoss,flat,observedMove:flat?recent.observedMove:0,payment};
}
function permitted(q,s){
  const f=dialogueFacts(s),family=s.family||{},disclosed=s.disclosures||{},alias=q.alias;
  const paid=!!f.payment&&n(f.payment.amount)>0&&n(family.repaid)>=n(f.payment.amount);
  const hasDebt=n(family.outstanding)>0;
  const taken=!!s.fatherUsed&&n(family.outstanding)+n(family.repaid)>0;
  const currentDisclosure=key=>disclosed[key]?.day===s.day&&disclosed[key]?.beat===s.beat;
  switch(alias){
    case 'Q01':case 'Q02':return f.profit<20000000;
    case 'Q03':return f.profit>0||f.unrealized>0;
    case 'Q04':return (s.positions?.length?s.positions:s.position?[s.position]:[]).some(p=>p.leverage===100);
    case 'Q05':case 'Q10':return f.unrealized>0||f.profit>0||(s.lastTrade?.pnl>0&&s.lastTrade.day===s.day);
    case 'Q06':return !!f.p&&f.unrealized<0;
    case 'Q07':return f.loss;
    case 'Q08':return f.flat&&f.observedMove>=.004;
    case 'Q09':case 'Q14':case 'W02':return f.bigLoss;
    case 'Q11':return true;
    case 'Q12':return f.p?.direction===1||s.intent==='long';
    case 'Q13':return s.publicMarketSpeaker?.direction===1&&s.publicMarketSpeaker?.losing===true;
    case 'Q15':return (s.positions?.length?s.positions:s.position?[s.position]:[]).some(p=>n(p.maxUnrealized)>0&&n(p.notional??n(p.margin)*n(p.leverage))*n(p.direction)*(n(s.price)/Math.max(Number.EPSILON,n(p.entry))-1)<=0);
    case 'Q16':return s.ending?.id==='crisis'||s.pendingEnding==='crisis';
    case 'Q17':return !!f.p&&(n(s.sanity)<=20||(s.positions?.length?s.positions:[f.p]).some(p=>n(p.risk)>=25));
    case 'Q18':return (s.history||[]).some(t=>t.day<s.day&&t.pnl<=-30000);
    case 'Q19':return currentDisclosure('greed')&&(f.unrealized>0||f.profit>0||(s.lastTrade?.pnl>0&&s.lastTrade.day===s.day));
    case 'Q20':case 'Q21':case 'Q22':return !!disclosed.debt&&hasDebt;
    case 'Q23':case 'Q24':return false; // No approved prerequisite scene exists yet.
    case 'Q25':return !!disclosed.debt&&hasDebt&&family.opposed===true;
    case 'W01':return (s.positions?.length?s.positions:s.position?[s.position]:[]).some(p=>p.direction===1&&n(s.price)<n(p.entry));
    case 'W03':return !!f.p&&f.unrealized<0;
    case 'W04':case 'W05':return !!f.p&&currentDisclosure('position');
    case 'W06':return taken&&!family.informed;
    case 'W07':return f.flat&&f.observedMove<=-.004;
    case 'V2-E03-01':return (!!family.unlocked||s.storyContext==='fatherUnlock')&&f.equity<30000&&!s.fatherUsed;
    case 'V2-E03-02':return !!family.unlocked&&!!family.viewed&&!s.fatherUsed;
    case 'V2-E03-04':return !!family.unlocked&&!s.fatherUsed&&(family.closed===true||family.lastAction==='leave_alone');
    case 'V2-E03-05':return taken&&family.takenConfirmed===true;
    case 'V2-E03-06':return taken&&family.takenConfirmed===true;
    case 'V2-E04-01':return taken&&!family.informed&&!family.discovered;
    case 'V2-E04-03':return taken&&(family.discovered===true||s.storyContext==='fatherFound');
    case 'V2-E05-01':return paid&&hasDebt&&n(f.payment.outstanding)>0;
    case 'V2-E05-03':return paid&&hasDebt&&n(f.payment.outstanding)>0;
    case 'V2-E05-05':return paid&&hasDebt&&f.payment.wasInformed===false;
    case 'V2-E06-01':return paid&&!hasDebt&&f.payment.outstanding===0;
    case 'V2-C02-P1':return s.ending?.id==='walkaway'||s.pendingEnding==='walkaway';
    default:return false;
  }
}
// Omit state only for a verbatim approval-text lookup, never for runtime display.
export function approvedQuote(id,s){
  const q=quotes.get(id);if(!q||s&&!permitted(q,s))return null;
  let text=q.lines[0][1];
  if(s)text=text.replace('{{repayNow}}',money(s.family?.lastRepayment?.amount)).replace('{{fatherOutstanding}}',money(s.family?.outstanding));
  return {id:q.id,from:q.lines[0][0],text};
}
const routes={
  'speech.hopeful':['Q01','Q02'],'speech.focused':['Q11'],'speech.calm':['Q03'],
  'speech.smug':['Q10'],'speech.ecstatic':['Q05'],'speech.determined':['Q12','Q17','W03'],
  'speech.nervous':['Q04'],'speech.stunned':['Q15'],'speech.anxious':['Q06'],
  'speech.irritated':['W01'],'speech.regretful':['Q08','Q07'],'speech.despair':['Q09','Q14','W02'],
  'speech.relieved':['W07'],
  'group.meme':['Q02'],'group.ask':['Q11'],'group.stance.long':['Q12'],'group.share.win':['Q10'],
  'group.market.down':['Q13'],'friend.position':[['W04','W05']],
  'friend.debt':[['Q25','Q20','Q21','Q22']],'friend.confess':[['Q25','Q20','Q21','Q22']],
  'friend.greed':[['Q05','Q19']],'friend.loss.memory':['Q18'],
  'prop.father':['V2-E03-06'],'prop.mochiko':[['W04','W05']],
  'ending.crisis':['Q16']
};
export const dialogueStats={entries:DIALOGUE_BANK.length,lines:DIALOGUE_BANK.length,pools:Object.keys(routes).length,originalScenes:ORIGINAL_DIALOGUE_BANK.length,originalLines:ORIGINAL_DIALOGUE_BANK.reduce((sum,q)=>sum+q.lines.length,0)};
const rawTexts=new Set(DIALOGUE_BANK.filter(q=>!['Q23','Q24'].includes(q.alias)).map(q=>q.lines[0][1]));
const historicalText=text=>typeof text==='string'&&(rawTexts.has(text)||/^这里是 ¥[\d,]+。我先放回来。$/.test(text)||/^还差 ¥[\d,]+，我记着。$/.test(text));
export function ensureDialogue(s){
  if(!s.dialogueMemory||typeof s.dialogueMemory!=='object')s.dialogueMemory={turn:0,lastUsed:{}};
  const memory=s.dialogueMemory;
  if(memory.version!==DIALOGUE_VERSION){
    s.chat ||= {};for(const channel of ['group','friend','campus'])s.chat[channel]=(s.chat[channel]||[]).filter(line=>quotes.has(line.dialogueId)&&historicalText(line.text));
    delete s.archivedChat; // Retired text must not remain in a migrated save or return to UI.
    s.speech=null;if(!historicalText(s.dayOpeningLine))s.dayOpeningLine='';
    if(s.dayReport){if(!historicalText(s.dayReport.openingLine))s.dayReport.openingLine='';if(!historicalText(s.dayReport.closingLine))s.dayReport.closingLine='';}
    if(s.story?.log)s.story.log=s.story.log.map(entry=>Object.fromEntries(['id','day','beat','choice'].filter(key=>entry[key]!==undefined).map(key=>[key,entry[key]])));
    memory.turn=0;memory.lastUsed={};memory.version=DIALOGUE_VERSION;
  }
  if(!Number.isSafeInteger(memory.turn)||memory.turn<0)memory.turn=0;
  if(!memory.lastUsed||typeof memory.lastUsed!=='object')memory.lastUsed={};
  return memory;
}
function candidates(s,trigger){
  const approved=(routes[trigger]||[]).map(ids=>{
    const lines=(Array.isArray(ids)?ids:[ids]).map(id=>approvedQuote(id,s)).filter(Boolean);
    // These conversations cannot lose the knowledge gate and leave only a self line.
    if(trigger==='friend.greed'&&!lines.some(q=>q.id==='V2-F01-02'))return empty();
    return {id:lines.length?lines.map(q=>q.id).join('+'):null,lines};
  }).filter(entry=>entry.lines.length);
  if(trigger.startsWith('speech.')&&approved.length)return approved;
  return [...approved,...originalCandidates(s,trigger,dialogueFacts(s))];
}
function hash(value){let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function chooseDialogue(s,trigger){
  const memory=ensureDialogue(s),pool=candidates(s,trigger);if(!pool.length)return empty();
  const oldest=Math.min(...pool.map(entry=>memory.lastUsed[entry.id]||0));
  const available=pool.filter(entry=>(memory.lastUsed[entry.id]||0)===oldest);
  const entry=available[hash(String(s.seed)+':'+trigger+':'+memory.turn)%available.length];
  memory.lastUsed[entry.id]=++memory.turn;return entry;
}
export function appendDialogue(s,channel,trigger){
  const selected=chooseDialogue(s,trigger);
  const messages=selected.lines.map(({id,...line})=>({...line,dialogueId:id,kind:line.from==='久留美'?'self':channel}));
  s.chat ||= {};s.chat[channel] ||= [];s.chat[channel].push(...messages);s.chat[channel]=s.chat[channel].slice(-60);return messages;
}
export function updateSpeech(s,emotion,force=false){
  ensureDialogue(s);
  // Eligibility, rather than raw price, is the stable render key. It changes as facts change.
  const pool=candidates(s,'speech.'+emotion),key=emotion+':'+pool.map(q=>q.id).join('|');
  if(!force&&s.speech?.facts===key){const current=pool.find(q=>q.id===s.speech.id);if(current)s.speech.text=current.lines[0]?.text||'';return;}
  const selected=chooseDialogue(s,'speech.'+emotion);
  s.speech={id:selected.id,mood:emotion,text:selected.lines[0]?.text||'',facts:key};
}
export function chapterChat(s){s.chat={group:[],friend:[],campus:[]};ensureDialogue(s);appendDialogue(s,'friend','friend.intro');}
export function comicCaptions(id,s){
  const key=({million:'C01',walkaway:'C02',broke:'C03',crisis:'C04',father:'C05',friend:'C06'})[id]||id;
  const q=id=>approvedQuote(id,s)?.text||'';
  if(key==='C01')return dialogueFacts(s).profit>=20000000?['Q10','Q11','Q05','Q03'].map(q):['','','',''];
  if(key==='C02')return [q('V2-C02-P1'),'','',''];
  if(key==='C03')return s.ending?.id==='broke'?['Q14','Q07','Q09'].map(q).concat(''):['','','',''];
  if(key==='C05'){
    // Completed panels need recorded events, not a reconstruction from current cash.
    const f=s.family||{};
    const unlocked=f.unlockedAtEquity<30000&&f.unlockedAtEquity>=0;
    const found=!!f.discovered;
    return [unlocked?approvedQuote('V2-E03-01').text:q('V2-E03-01'),q('V2-E03-05'),found?approvedQuote('V2-E04-01').text:'',q(f.outstanding>0?'V2-E05-01':'V2-E06-01')];
  }
  return ['','','',''];
}
