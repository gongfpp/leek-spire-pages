// Storage failures keep the page playable. Only failed writes override reads;
// a successful write must not hide newer data from another page forever.
export function createGameStorage(resolve=()=>globalThis.localStorage) {
  const overlay=new Map(),cache=new Map();
  function readItem(key) {
    try {
      const storage=resolve();if(!storage)return {available:false,value:cache.get(key)??null};
      const value=storage.getItem(key)??null;cache.set(key,value);
      return {available:true,value};
    } catch {return {available:false,value:cache.get(key)??null};}
  }
  return {
    readItem,
    forgetItem(key){overlay.delete(key);},
    getItem(key) {
      if(overlay.has(key))return overlay.get(key);
      return readItem(key).value;
    },
    setItem(key,value) {
      const text=String(value);overlay.set(key,text);
      try{const storage=resolve();if(!storage)return false;storage.setItem(key,text);overlay.delete(key);cache.set(key,text);return true;}catch{return false;}
    },
    removeItem(key) {
      overlay.set(key,null);
      try{const storage=resolve();if(!storage)return false;storage.removeItem(key);overlay.delete(key);cache.set(key,null);return true;}catch{return false;}
    }
  };
}
