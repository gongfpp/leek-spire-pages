// Progress is an optimistic, per-mode session. Compare the exact durable bytes,
// not a timestamp (or this tab's failed-write overlay), before every write.
// Web Locks make that comparison + write exclusive between current app pages.
export function createSaveSession({storage,key,legacyKey=null,restore,locks=globalThis.navigator?.locks}) {
  const read=()=>{
    const current=storage.readItem(key);
    const legacy=current.available&&current.value===null&&legacyKey?storage.readItem(legacyKey):null;
    return {current,legacy,raw:current.value??legacy?.value??null};
  };
  let baseline=read(),raw=baseline.raw,localRaw=raw,queue=Promise.resolve(),epoch=0;
  let status='ready',reason='';
  const decode=value=>{try{return value===null?null:restore(value);}catch{return null;}};
  const available=value=>value.current.available&&(!value.legacy||value.legacy.available);
  const invalid=value=>value.raw!==null&&!decode(value.raw);
  const fail=(next,why='')=>{status=next;reason=why;return false;};
  if(!available(baseline))fail('memory','storage');
  else if(invalid(baseline))fail('invalid','schema');
  const blocked=()=>status==='conflict'||status==='invalid';
  function check() {
    if(blocked())return false;
    const latest=read();
    if(!available(latest)){fail('memory','storage');return true;}
    // A previously unreadable slot can only be claimed once proven empty.
    if(!available(baseline)) {
      if(latest.raw!==null)return fail('conflict','unreadable-baseline');
      baseline=latest;
    }
    if(latest.current.value!==baseline.current.value||latest.legacy?.value!==baseline.legacy?.value)return fail('conflict','changed');
    return true;
  }
  return {
    key,legacyKey,
    get raw(){return raw;},get localRaw(){return localRaw;},
    get status(){return status==='saved'&&raw!==localRaw?'pending':status;},get reason(){return reason;},get blocked(){return blocked();},
    check,
    save(state) {
      const text=JSON.stringify(state),generation=epoch;localRaw=text;if(!blocked())status='pending';
      const write=async()=>{
        if(generation!==epoch||!check())return false;
        if(!locks?.request)return fail('memory','coordination');
        try {
          return await locks.request('fx-progress:'+key,{mode:'exclusive'},()=>{
            if(generation!==epoch||!check())return false;
            const latest=read();
            if(!available(latest))return fail('memory','storage');
            if(!storage.setItem(key,text))return fail('memory','storage');
            // After migration, the current slot is authoritative. Never delete
            // the legacy slot, which is still a recovery source for the user.
            baseline={current:{available:true,value:text},legacy:null,raw:text};
            raw=text;status='saved';reason='';return true;
          });
        } catch {return fail('memory','coordination');}
      };
      queue=queue.then(write,write);return queue;
    },
    // Only an explicit user choice may replace this page with another save.
    // Cancel queued writes so a pre-reload snapshot cannot be written afterward.
    reload() {
      const latest=read();
      if(!available(latest)){reason='storage';return {ok:false,reason};}
      if(invalid(latest)){fail('invalid','schema');return {ok:false,reason};}
      epoch++;baseline=latest;raw=latest.raw;localRaw=raw;status='ready';reason='';
      storage.forgetItem(key);
      return {ok:true,state:decode(raw)};
    },
    backup(state) {
      const latest=read();
      return {format:'fx-save-conflict-backup-v1',key,local:state,baselineRaw:raw,
        storedRaw:latest.current.available?latest.current.value:null,
        legacyRaw:latest.legacy?.available?latest.legacy.value:null,
        storageReadable:available(latest)};
    }
  };
}
