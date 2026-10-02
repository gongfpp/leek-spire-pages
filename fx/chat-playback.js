// Presentation timing never modifies dialogue selection, financial state or market RNG.
export class ChatPlayback{
 constructor({chat,onUpdate=()=>{},onReceive=()=>{},schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}={}){this.onUpdate=onUpdate;this.onReceive=onReceive;this.schedule=schedule;this.cancel=cancel;this.timer=null;this.reset(chat||{});}
 reset(chat){if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.queue=[];this.hidden=new Set();this.known=new Set(Object.values(chat).flat());this.typing=null;this.generation=(this.generation||0)+1;}
 observe(chat){for(const [channel,list] of Object.entries(chat))for(const message of list)if(!this.known.has(message)){this.known.add(message);this.hidden.add(message);this.queue.push({channel,message});}this.pump();}
 visible(list){return list.filter(message=>!this.hidden.has(message));}
 busy(channel){return this.queue.some(entry=>entry.channel===channel);}
 pump(){if(this.timer!==null||!this.queue.length)return;const entry=this.queue[0],incoming=entry.message.kind!=='self',gen=this.generation;this.typing=incoming?{channel:entry.channel,from:entry.message.from}:null;
  const duration=incoming?Math.min(1700,600+entry.message.text.length*22):250;
  this.timer=this.schedule(()=>{if(gen!==this.generation)return;this.timer=null;this.queue.shift();this.hidden.delete(entry.message);this.typing=null;if(incoming)this.onReceive(entry);this.onUpdate(entry);this.pump();this.onUpdate();},duration);
 }
}
export class MessageChime{
 constructor(){this.context=null;}
 unlock(){const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioContext)return;this.context ||= new AudioContext();void this.context.resume().catch(()=>{});}
 play(enabled){const ctx=this.context;if(!enabled||!ctx||ctx.state!=='running'||document.hidden)return;const start=ctx.currentTime;for(const [frequency,offset] of [[660,0],[880,.09]]){const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,start+offset);gain.gain.exponentialRampToValueAtTime(.07,start+offset+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+offset+.14);oscillator.connect(gain).connect(ctx.destination);oscillator.start(start+offset);oscillator.stop(start+offset+.16);}}
}
