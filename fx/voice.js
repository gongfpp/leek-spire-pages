// Short original Japanese utterances from the official public main PV.
// Text is fixed to its recording; original fan-game dialogue is never passed off as spoken audio.
// Text approval does not approve the separate PV audition candidates.
export const VOICE_LINES = Object.freeze([]);
export const VOICE_SOURCE='https://www.youtube.com/watch?v=7rxIZ3z0S4s';
export function availableVoices(emotion){return VOICE_LINES.filter(line=>line.moods.includes(emotion));}
export class VoicePlayer{
 constructor({makeAudio=()=>new Audio(),onUpdate=()=>{},onPlay=()=>{},onReject=()=>{},lines=VOICE_LINES}={}){this.lines=lines;this.audio=makeAudio();this.audio.preload='none';this.audio.volume=.65;this.onUpdate=onUpdate;this.onPlay=onPlay;this.onReject=onReject;this.presentation=null;this.playing=false;this.generation=0;this.sequence={};this.lastMood=null;this.lastRun=null;this.audio.addEventListener('ended',()=>{this.playing=false;this.onUpdate();});}
 stop(){this.generation++;this.audio.pause();this.playing=false;this.presentation=null;}
 async play(emotion,speechId){const pool=this.lines.filter(line=>line.moods.includes(emotion));if(!pool.length)return false;this.stop();const turn=this.sequence[emotion]||0,line=pool[turn%pool.length];this.sequence[emotion]=turn+1;const gen=this.generation;
 this.audio.src=line.file;this.audio.currentTime=0;this.presentation={...line,mood:emotion,speechId};this.playing=true;this.onUpdate();
 try{await this.audio.play();if(gen!==this.generation)return false;this.onPlay(line);return true;}catch{if(gen===this.generation){this.playing=false;this.presentation=null;this.onReject(line);this.onUpdate();}return false;}}
 sync({enabled,emotion,speechId,run}){const changed=this.lastMood!==emotion||this.lastRun!==run;this.lastMood=emotion;this.lastRun=run;
 if(!enabled){if(this.presentation||this.playing)this.stop();return null;}
 if(changed){this.stop();if(this.lines.some(line=>line.moods.includes(emotion)))void this.play(emotion,speechId);}
 if(this.presentation&&this.presentation.mood===emotion&&(this.presentation.speechId===speechId||this.playing))return this.presentation;
 return null;}
}
