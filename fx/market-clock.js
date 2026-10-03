// One quotation per timer: never replay elapsed time after a hidden tab or modal.
export class MarketClock{
 constructor({step,canRun,canStep=()=>true,interval=()=>1000,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),onError=()=>{}}){
  Object.assign(this,{step,canRun,canStep,interval,schedule,cancel,onError});this.timer=null;this.generation=0;
 }
 start(){if(this.timer!==null||!this.canRun())return;const generation=this.generation;this.timer=this.schedule(()=>this.pulse(generation),Math.max(50,this.interval()));}
 stop(){this.generation++;if(this.timer!==null)this.cancel(this.timer);this.timer=null;}
 pulse(generation){
  if(generation!==this.generation)return;this.timer=null;
  if(!this.canRun())return;
  try{if(this.canStep())this.step();}catch(error){this.stop();this.onError(error);return;}
  if(generation===this.generation)this.start();
 }
 reschedule(){this.stop();this.start();}
}
