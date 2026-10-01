import {DIALOGUE_BANK} from './dialogue-bank.js?v=b98915729dc9912f10252044e5070a3dd1ebfb19';

const pools=new Map();
const knownIds=new Set(DIALOGUE_BANK.map(e=>e.id));
for(const entry of DIALOGUE_BANK){
  if(!pools.has(entry.trigger))pools.set(entry.trigger,[]);
  pools.get(entry.trigger).push(entry);
}
export const dialogueStats={entries:DIALOGUE_BANK.length,lines:DIALOGUE_BANK.reduce((sum,e)=>sum+e.lines.length,0),pools:pools.size};

// Conversation choices use their own sequence and never consume market randomness.
export function ensureDialogue(s){
  if(!s.dialogueMemory||typeof s.dialogueMemory!=='object')s.dialogueMemory={turn:0,lastUsed:{}};
  if(!Number.isSafeInteger(s.dialogueMemory.turn)||s.dialogueMemory.turn<0)s.dialogueMemory.turn=0;
  s.dialogueMemory.lastUsed ||= {};
  return s.dialogueMemory;
}
function hash(value){let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function chooseDialogue(s,trigger,values={}){
  const pool=pools.get(trigger);
  if(!pool?.length)throw Error('Missing dialogue pool: '+trigger);
  const memory=ensureDialogue(s);
  let candidates=pool.filter(entry=>memory.lastUsed[entry.id]===undefined);
  if(!candidates.length){
    const oldest=Math.min(...pool.map(entry=>memory.lastUsed[entry.id]));
    candidates=pool.filter(entry=>memory.lastUsed[entry.id]===oldest);
  }
  const n=hash(String(s.seed)+':'+trigger+':'+memory.turn);
  const entry=candidates[n%candidates.length];
  memory.lastUsed[entry.id]=++memory.turn;
  return {id:entry.id,lines:entry.lines.map(([from,text])=>({from,text:text.replace(/\{([a-z]+)\}/g,(_,key)=>String(values[key]??'{'+key+'}'))}))};
}
export function appendDialogue(s,channel,trigger,values){
  const selected=chooseDialogue(s,trigger,values);
  const messages=selected.lines.map(line=>({...line,dialogueId:selected.id,kind:line.from==='久留美'?'self':channel}));
  s.chat[channel].push(...messages);
  s.chat[channel]=s.chat[channel].slice(-60);
  return messages;
}
export function updateSpeech(s,emotion,force=false){
  if(!force&&s.speech?.mood===emotion&&knownIds.has(s.speech.id))return;
  const selected=chooseDialogue(s,'speech.'+emotion);
  s.speech={id:selected.id,mood:emotion,text:selected.lines[0].text};
}
export function chapterChat(s){
  s.chat={group:[],friend:[]};
  appendDialogue(s,'group','group.intro');
  appendDialogue(s,'friend','friend.intro');
}
