import {ITEM_EVENTS,itemUnlocked} from './item-events.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {STORIES,getStory} from './story-content.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
export const DEBUFFS={guilt:{name:'父亲的存款',copy:'未还清时心理压力增加 8',stress:8},familyWatch:{name:'父亲开始查账',copy:'心理压力增加 6',stress:6}};
export function ensureStory(s){
 s.story ||= {seen:[],queue:[],log:[],flags:{}};s.story.seen ||= [];s.story.queue ||= [];s.story.log ||= [];s.story.flags ||= {};s.story.presentedDay ||= 0;
 s.family ||= {unlocked:!!s.fatherUsed,outstanding:s.fatherUsed?Math.max(0,s.externalFunding||0):0,borrowedAt:s.fatherUsed?(s.day-1)*4+s.beat:null,discovered:false,informed:false,repaid:0,trust:0};
 s.itemDiscoveries ||= {};s.loan ||= {discovered:false,unlocked:false,outstanding:0,borrowed:0,repaid:0,limit:300000,dailyRate:.0005,interestPaid:0};s.effects ||= [];s.expenses ||= 0;s.dayOpeningExpenses ||= 0;s.chat.campus ||= [];s.itemsUsed ||= {};
 if(!s.itemUnlocks){s.itemUnlocks={};for(const id of new Set([...Object.keys(s.itemsUsed).filter(id=>s.itemsUsed[id]),...Object.keys(s.skills||{}).filter(id=>s.skills[id])]))s.itemUnlocks[id]={event:'legacy-use',day:s.day};for(const key of s.story.seen)for(const id of ITEM_EVENTS[key]||[])s.itemUnlocks[id] ||= {event:key,day:0};}
 if(s.family.outstanding>0&&!s.effects.some(e=>e.id==='guilt'))addEffect(s,'guilt',null);
 return s.story;
}
export function addEffect(s,id,remaining){s.effects ||= [];const effect={id,remaining};const old=s.effects.findIndex(e=>e.id===id);if(old>=0)s.effects[old]=effect;else s.effects.push(effect);return effect;}
export function restrictions(s){
 const sanity=s.sanity??50;let leverage=sanity<40?20:sanity<65?50:100,stake=sanity<40?.25:sanity<65?.5:1,stop=sanity<40?.25:sanity<65?.5:1,mental=0,stress=0;
 for(const e of s.effects||[]){const def=DEBUFFS[e.id];if(!def)continue;mental+=def.mental||0;stress+=def.stress||0;}
 return{leverage,stake,stop,stopMaximum:stop,noStop:stop===1,noEntry:sanity<=5,mental,stress};
}
export function ageEffects(s){const expired=[];s.effects=(s.effects||[]).filter(e=>{if(!DEBUFFS[e.id])return false;if(e.remaining===null)return true;e.remaining--;if(e.remaining<=0){expired.push(e.id);return false;}return true;});return expired;}
export function queueStory(s,id){ensureStory(s);if(!STORIES[id]||s.story.seen.includes(id)||s.story.queue.includes(id))return false;s.story.queue.push(id);return true;}
export function checkStories(s,account,emotion){ensureStory(s);
 if(!s.family.unlocked&&!s.fatherUsed&&emotion==='despair'&&account<30000){s.itemDiscoveries.father ||= {day:s.day,event:'fatherUnlock'};queueStory(s,'fatherUnlock');}
 if(s.day>=2&&!s.story.seen.includes('fatherDiscover'))queueStory(s,'fatherDiscover');
 if(['ecstatic','despair'].includes(emotion)){s.loan.discovered=true;s.loan.unlocked=true;}
 const absolute=(s.day-1)*4+s.beat;
 if(s.family.outstanding>0&&!s.family.discovered&&!s.family.informed&&s.family.borrowedAt!==null&&absolute-s.family.borrowedAt>=2)queueStory(s,'fatherFound');
 if(s.phase==='resting'&&!s.story.queue.length){queueStory(s,s.day===1?'friendStudy':s.day===2?'roommate':'quietNight');}
}
export function pendingStory(s){ensureStory(s);if(s.phase!=='resting'||s.story.presentedDay===s.day)return null;s.story.queue=s.story.queue.filter(id=>!!getStory(s,id));const family=s.story.queue.find(id=>['fatherUnlock','fatherFound','repayPartial','repayFull'].includes(id));const key=family||s.story.queue[0];if(key==='fatherUnlock')s.family.unlockedAtEquity=s.cash+s.reserve;return getStory(s,key);}
export function chooseStory(s,choiceId){if(s.phase!=='resting')throw Error('人物事件只在休市后发生');const event=pendingStory(s);if(!event)throw Error('没有待处理的剧情');const choice=event.choices.find(c=>c.id===choiceId);if(!choice)throw Error('请选择一个回应');s.story.queue=s.story.queue.filter(id=>id!==event.key);s.story.presentedDay=s.day;s.story.seen.push(event.key);s.story.log.push({id:event.key,day:s.day,beat:s.beat,choice:choice.id});s.story.log=s.story.log.slice(-40);
 const unlocked=[];for(const id of ITEM_EVENTS[event.key]||[]){if(!itemUnlocked(s,id)){s.itemDiscoveries[id] ||= {event:event.key,day:s.day};if(id!=='father'){s.itemUnlocks[id]={event:event.key,day:s.day,choice:choice.id};unlocked.push(id);}}}
 if(event.key==='fatherUnlock'){unlocked.push('father');s.family.unlocked=true;s.family.lastAction=choice.id;s.family.viewed=choice.id==='look_at_savings';s.family.closed=choice.id==='leave_alone';choice.lines=getStory(s,event.key)?.choices.find(c=>c.id===choice.id)?.lines||[];}
 if(event.key==='fatherFound'){s.family.discovered=true;addEffect(s,'familyWatch',2);s.family.trust-=1;}
 s.stress=Math.max(0,(s.stress||0)+(choice.stress||0));s.family.trust+=choice.trust||0;
 if(choice.mood)s.emotionBias={mood:choice.mood,until:(s.day-1)*4+s.beat+2};
 const messages=[...event.lines,...choice.lines].map(([from,text])=>({from,text,kind:from==='久留美'?'self':'campus',storyId:event.id,origin:event.original?'original':'approved'}));s.chat.campus.push(...messages);s.chat.campus=s.chat.campus.slice(-80);return{event,choice,messages,unlocked};
}
