// Discovery happens in play. Hidden future items never appear in inventory.
export const ITEM_EVENTS={fatherDiscover:['father'],friendStudy:['mochiko'],roommate:['energy']};
// Kept as an empty compatibility export; unlock conditions are never player copy.
export const UNLOCK_HINTS={};
export {ITEM_SCENES} from './copy/scenes.js?v=9645d7d0bd4195ea72331cc4a4cadf1782175196';
export function itemDiscovered(s,id){return !!s.itemDiscoveries?.[id]||itemUnlocked(s,id);}
export function itemUnlocked(s,id){return id==='father'?!!s.family?.unlocked:!!s.itemUnlocks?.[id];}
export function discoverItems(s){
 s.itemDiscoveries ||= {};s.itemUnlocks ||= {};
 const profit=s.history?.filter(t=>t.type!=='open').reduce((n,t)=>n+(t.pnl||0),0)||0;
 const discover=(id,unlocked=false)=>{s.itemDiscoveries[id] ||= {day:s.day,event:'play'};if(unlocked)s.itemUnlocks[id] ||= {day:s.day,event:'play'};};
 if(profit>=200)discover('takeaway',true);
 if(profit<=-200)discover('noodles',true);
 if(profit>=20000)discover('celebration',true);
 if(s.day>=2)discover('energy',true);
 if(s.day>=3)discover('mochiko',true);
 if(s.day>=2||s.family?.unlocked||s.fatherUsed)discover('father');
 return s.itemDiscoveries;
}
