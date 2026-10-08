// Static Pages has no configured A-share API: never create network identity or send events.
export class Telemetry {
 constructor(){this.enabled=false;this.queue=[];this.pageTime=0;this.session='';}
 setEnabled(){this.enabled=false;}
 clock(){} emit(){} beat(){} view(){} observe(){} action(){} async flush(){}
}
