import {assetURL} from './assets.js?v=da1d043bda91408042db7dae5be3319577d20085';

// Actual short recordings from the official public main PV, never generated speech.
// Captions stay with their recording, including the PV's amounts, not game balances.
export const VOICE_SOURCE='https://www.youtube.com/watch?v=7rxIZ3z0S4s';
const clip=(id,file,ja,zh,moods,start,end,speaker='福賀くるみ')=>Object.freeze({id,file:assetURL(`./voice/${file}`),ja,zh,moods:Object.freeze(moods),start,end,speaker,source:VOICE_SOURCE,synthetic:false});
export const VOICE_LINES=Object.freeze([
 clip('pv-profit-ten','kurumi-profit-ten.mp3','含み益10万は出てるけど','虽然已经有十万浮盈了',['confident','excited'],53.98,56.70),
 clip('pv-profit-twenty','kurumi-profit-twenty.mp3','やっぱ20万以上で利確したい','果然还是想赚到二十万以上再止盈',['greedy','exhilarated','ecstatic'],56.70,59.32),
 clip('pv-cannot-lose','kurumi-cannot-lose.mp3','負けようがない','不可能输的',['reckless','determined'],72.52,73.80),
 clip('pv-gone','kurumi-gone.mp3','どこ行った!?','去哪儿了！？',['regretful','profit-to-loss','shocked','stunned'],61.32,62.67),
 clip('pv-human','kurumi-human.mp3','人間が扱っていいものじゃない！','这根本不是人该碰的东西！',['despair','anxious','blank'],63.78,66.01),
 clip('pv-stop','kurumi-stop.mp3','やめて！','停下来啊！',['nervous'],79.62,80.66),
 clip('pv-profit-vanished','kurumi-profit-vanished.mp3','利益…','利润……',['profit-to-loss'],60.50,61.32),
 clip('pv-gasp','kurumi-gasp.mp3','あっ！','啊！',['loss-to-profit','relieved'],59.32,59.82),
 // Other characters are kept as distinct guests and cannot become Kurumi's mood voice.
 clip('pv-mebuki-rich','mebuki-rich.mp3','お金持ち目指して頑張ります','我会朝着变有钱的目标努力',[],31.92,34.70,'山師芽吹'),
 clip('pv-yasuko-start','yasuko-start.mp3','私もFXやってやるよ','我也来做FX给你看',[],34.58,37.10,'高根やす子'),
]);
export function availableVoices(emotion){return VOICE_LINES.filter(line=>line.moods.includes(emotion));}

export class VoicePlayer{
 constructor({makeAudio=()=>new Audio(),onUpdate=()=>{},onPlay=()=>{},onReject=()=>{},lines=VOICE_LINES,now=()=>Date.now(),minGap=8000}={}){
  this.lines=lines;this.audio=makeAudio();this.audio.preload='none';this.audio.volume=.65;
  this.onUpdate=onUpdate;this.onPlay=onPlay;this.onReject=onReject;this.now=now;this.minGap=minGap;
  this.presentation=null;this.playing=false;this.generation=0;this.sequence={};this.lastMood=null;this.lastRun=null;
  this.unlocked=false;this.lastStarted=-Infinity;this.failed=new Set();
  this.audio.addEventListener('ended',()=>{this.playing=false;this.onUpdate();});
  this.audio.addEventListener('error',()=>{if(this.presentation){this.failed.add(this.presentation.id);this.onReject(this.presentation);}this.stop();this.onUpdate();});
 }
 // Call from an actual pointer/key/replay gesture. Before this, sync performs no play().
 unlock(){if(this.unlocked)return false;this.unlocked=true;this.lastMood=null;return true;}
 stop(){this.generation++;this.audio.pause();this.playing=false;this.presentation=null;}
 async start(line,speechId,emotion){
  if(!this.unlocked||!line||this.failed.has(line.id))return false;
  this.stop();const gen=this.generation;this.audio.src=line.file;this.audio.currentTime=0;
  this.presentation={...line,mood:emotion,speechId};this.playing=true;this.lastStarted=this.now();this.onUpdate();
  try{await this.audio.play();if(gen!==this.generation)return false;this.onPlay(line);return true;}
  catch(error){if(gen===this.generation){this.playing=false;this.presentation=null;if(error?.name==='NotAllowedError')this.unlocked=false;this.onReject(line);this.onUpdate();}return false;}
 }
 async play(emotion,speechId){
  if(!this.unlocked)return false;
  const pool=this.lines.filter(line=>line.moods.includes(emotion)&&!this.failed.has(line.id));if(!pool.length)return false;
  const turn=this.sequence[emotion]||0,line=pool[turn%pool.length];this.sequence[emotion]=turn+1;
  return this.start(line,speechId,emotion);
 }
 // Optional gallery/audition: guest lines retain their original speaker label.
 async playLine(id,speechId='audition'){return this.start(this.lines.find(line=>line.id===id),speechId,'audition');}
 sync({enabled,emotion,speechId,run}){
  const changed=this.lastMood!==emotion||this.lastRun!==run;this.lastMood=emotion;this.lastRun=run;
  if(!enabled){if(this.presentation||this.playing)this.stop();return null;}
  if(changed){this.stop();if(this.unlocked&&this.now()-this.lastStarted>=this.minGap&&this.lines.some(line=>line.moods.includes(emotion)))void this.play(emotion,speechId);}
  if(this.presentation&&this.presentation.mood===emotion&&(this.presentation.speechId===speechId||this.playing))return this.presentation;
  return null;
 }
}
