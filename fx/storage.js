// A blocked storage getter or a full quota must not prevent a game from starting.
// The overlay keeps this page playable; writes return whether they reached disk.
export function createGameStorage(resolve=()=>globalThis.localStorage) {
  const overlay=new Map();
  return {
    getItem(key) {
      if(overlay.has(key))return overlay.get(key);
      try{return resolve()?.getItem(key)??null;}catch{return null;}
    },
    setItem(key,value) {
      const text=String(value);overlay.set(key,text);
      try{const storage=resolve();if(!storage)return false;storage.setItem(key,text);return true;}catch{return false;}
    },
    removeItem(key) {
      overlay.set(key,null);
      try{const storage=resolve();if(!storage)return false;storage.removeItem(key);return true;}catch{return false;}
    }
  };
}
