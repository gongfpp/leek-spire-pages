import {assetURL} from './assets.js?v=0903e0cb2ec6498c86db15a635dd58970cd555e4';

// Actual short recordings from the official public main PV, never generated speech.
// Captions stay with their recording, including the PV's amounts, not game balances.
export const VOICE_SOURCE='https://www.youtube.com/watch?v=7rxIZ3z0S4s';
const clip=(id,file,ja,zh,moods,start,end,speaker='福賀くるみ',source=VOICE_SOURCE)=>Object.freeze({id,file:assetURL(`./voice/${file}`),ja,zh,moods:Object.freeze(moods),start,end,speaker,source,leadInSeconds:.4,synthetic:false});
export const VOICE_LINES=Object.freeze([
 clip("pv-profit-ten","kurumi-profit-ten.mp3","含み益10万は出てるけど、やっぱ20万以上で利確したい","虽然已经有十万浮盈了，还是想赚到二十万以上再止盈",["confident","excited"],53.9,59.5,"福賀くるみ","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-profit-twenty","kurumi-profit-twenty.mp3","やっぱ20万以上で利確したい","果然还是想赚到二十万以上再止盈",["greedy","exhilarated","ecstatic"],56.45,59.5,"福賀くるみ","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-cannot-lose","kurumi-cannot-lose.mp3","負けようがない","不可能输的",["reckless","determined"],72.48,73.86,"福賀くるみ","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-gone","kurumi-gone.mp3","どこ行った!?","去哪儿了！？",["regretful","profit-to-loss","shocked","stunned"],61.3,62.92,"福賀くるみ","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-human","kurumi-human.mp3","こんなの、人間が扱っていいものじゃない！","这种东西，根本不是人该碰的！",[],62.84,66.02,"高根やす子","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-stop","kurumi-stop.mp3","やめて！","停下来啊！",["nervous"],79.58,80.91,"福賀くるみ","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-profit-vanished","kurumi-profit-vanished.mp3","利益…","利润……",["profit-to-loss"],60.4,61.35,"福賀くるみ","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-gasp","kurumi-gasp.mp3","あっ！","啊！",["loss-to-profit","relieved"],59.54,60.23,"福賀くるみ","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-mebuki-rich","mebuki-rich.mp3","よし、お金持ち目指して頑張ります","好，朝着变有钱的目标努力",[],31.55,34.65,"山師芽吹","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("pv-yasuko-start","yasuko-start.mp3","私もFXやってやるよ","我也来做FX给你看",[],34.7,37.35,"高根やす子","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
 clip("character-came","kurumi-came.mp3","きたー！","来了！",["excited","loss-to-profit"],0.7,2.78,"福賀くるみ","https://www.youtube.com/watch?v=v-cxfCJlrss"),
 clip("character-check","kurumi-check.mp3","相場チェックした〜い！","想看看行情！",["calm","hopeful"],2.84,4.98,"福賀くるみ","https://www.youtube.com/watch?v=v-cxfCJlrss"),
 clip("character-family-money","kurumi-family-money.mp3","家のお金入れたから余裕だよ〜！","家里的钱放进去了，绰绰有余！",[],5.0,7.44,"福賀くるみ","https://www.youtube.com/watch?v=v-cxfCJlrss"),
 clip("character-greedy","kurumi-greedy.mp3","完全に欲張った！","完全是我太贪了！",["regretful"],7.44,8.98,"福賀くるみ","https://www.youtube.com/watch?v=v-cxfCJlrss"),
 clip("character-laugh","kurumi-laugh.mp3","あははははっ！","啊哈哈哈哈！",["ecstatic","exhilarated"],8.99,10.39,"福賀くるみ","https://www.youtube.com/watch?v=v-cxfCJlrss"),
 clip("pv-mochiko-waste","mochiko-waste.mp3","もったいないよ","太可惜了",[],27.78,28.9,"小金萌智子","https://www.youtube.com/watch?v=7rxIZ3z0S4s"),
]);
export function availableVoices(emotion){return VOICE_LINES.filter(line=>line.moods.includes(emotion));}

export class VoicePlayer{
 constructor({makeAudio=()=>new Audio(),onUpdate=()=>{},onPlay=()=>{},onReject=()=>{},lines=VOICE_LINES,now=()=>Date.now(),minGap=8000}={}){
  this.lines=lines;this.audio=makeAudio();this.audio.preload='none';this.audio.volume=.65;
  this.onUpdate=onUpdate;this.onPlay=onPlay;this.onReject=onReject;this.now=now;this.minGap=minGap;
  this.presentation=null;this.playing=false;this.loading=false;this.lastError=null;this.generation=0;this.sequence={};this.lastMood=null;this.lastRun=null;
  this.unlocked=false;this.lastStarted=-Infinity;this.failed=new Set();
  this.audio.addEventListener('ended',()=>{this.playing=false;this.loading=false;this.onUpdate();});
  this.audio.addEventListener('error',()=>{const line=this.presentation;if(line)this.failed.add(line.id);this.stop();this.lastError='unavailable';if(line)this.onReject(line);this.onUpdate();});
 }
 // Call from an actual pointer/key/replay gesture. Before this, sync performs no play().
 unlock(){if(this.unlocked)return false;this.unlocked=true;this.lastMood=null;this.lastError=null;return true;}
 stop(){this.generation++;this.audio.pause();this.playing=false;this.loading=false;this.lastError=null;this.presentation=null;}
 async start(line,speechId,emotion){
  if(!this.unlocked||!line||this.failed.has(line.id))return false;
  this.stop();const gen=this.generation;this.audio.src=line.file;this.audio.currentTime=0;
  this.presentation={...line,mood:emotion,speechId};this.loading=true;this.lastStarted=this.now();this.onUpdate();
  try{await this.audio.play();if(gen!==this.generation)return false;this.loading=false;this.playing=true;this.onPlay(line);this.onUpdate();return true;}
  catch(error){if(gen===this.generation){this.playing=false;this.loading=false;this.presentation=null;this.lastError=error?.name==='NotAllowedError'?'blocked':'unavailable';if(error?.name==='NotAllowedError')this.unlocked=false;this.onReject(line);this.onUpdate();}return false;}
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
  const runChanged=this.lastRun!==null&&this.lastRun!==run;
  const changed=this.lastMood!==emotion||this.lastRun!==run;this.lastMood=emotion;this.lastRun=run;
  if(!enabled){if(this.presentation||this.playing)this.stop();return null;}
  // A new expression must not amputate the last syllable of an active clip.
  // Explicit mute, replay, audition, navigation and a new run can still stop it.
  if(runChanged)this.stop();
  if(this.presentation&&(this.playing||this.loading))return this.presentation;
  if(changed){this.stop();if(this.unlocked&&this.now()-this.lastStarted>=this.minGap&&this.lines.some(line=>line.moods.includes(emotion)))void this.play(emotion,speechId);}
  if(this.presentation&&this.presentation.mood===emotion&&(this.presentation.speechId===speechId||this.playing||this.loading))return this.presentation;
  return null;
 }
}
