// Licensed Kenney recordings only. BGM is intentionally disabled and not loaded.
export const SOUND_FILES={play:'card-place-1',defend:'card-place-2',draw:'card-shuffle',click:'card-slide-1',gain:'chips-stack-1',win:'chips-handle-5',loss:'dice-throw-1',unlock:'cards-pack-open-1',rattle:'chips-handle-5',power:'card-place-2',dividend:'chips-stack-1',upgrade:'cards-pack-open-1',exhaust:'card-slide-1'};
export function volume(value,fallback){return Number.isFinite(Number(value))?Math.max(0,Math.min(1,Number(value))):fallback;}
export class GameAudio{
 constructor({createAudio=()=>document.createElement('audio'),hidden=()=>document.hidden,onError=()=>{}}={}){this.createAudio=createAudio;this.hidden=hidden;this.onError=onError;this.pool=new Map();this.unlocked=false;this.prefs={};this.reported=new Set();}
 make(file,label){const a=this.createAudio();a.src=`./assets/audio/${file}.mp3`;a.preload='none';a.dataset.audio=label;a.hidden=true;if(typeof document!=='undefined')document.body.append(a);a.addEventListener('error',()=>{if(!this.reported.has(label)){this.reported.add(label);this.onError(label);}});return a;}
 configure(prefs){this.prefs=prefs;this.sync();if(!prefs.sound)this.stopEffects();}
 unlock(){this.unlocked=true;}
 sync(){if(this.hidden())this.stopEffects();}
 effect(kind,{rate=1,stretch=false,level=1}={}){if(!this.unlocked||!this.prefs.sound||this.hidden())return;const file=SOUND_FILES[kind]||SOUND_FILES.click;let voices=this.pool.get(file);if(!voices){voices=[this.make(file,kind),this.make(file,kind),this.make(file,kind)];this.pool.set(file,voices);}const a=voices.find(x=>x.paused||x.ended)||voices[0];a.currentTime=0;a.volume=volume(this.prefs.soundVolume,.65)*Math.min(1,level);a.playbackRate=Math.max(.6,Math.min(1.8,rate));a.preservesPitch=stretch;a.webkitPreservesPitch=stretch;try{a.play()?.catch(()=>{});}catch{}}
 stopEffects(){for(const voices of this.pool.values())for(const a of voices)a.pause();}
 pause(){this.stopEffects();}
}
