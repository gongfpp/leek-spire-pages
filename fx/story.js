import {STORIES,getStory} from './story-content.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
export const DEBUFFS={guilt:{name:'抽屉里的声音',copy:'未归还的存款让压力增加 8',stress:8},familyWatch:{name:'父亲查账中',copy:'两段行情内杠杆至多 20×、投入至多 50%',leverage:20,stake:.5},bathroom:{name:'热茶的后半场',copy:'下一段投入至多 25%',stake:.25},wired:{name:'今晚不睡',copy:'两段内承受力 +8；之后疲惫两段',mental:8},fatigue:{name:'咖啡因下班了',copy:'两段内承受力 −6',mental:-6},notes:{name:'写都写了',copy:'两段内承受力 +6、杠杆至多 20×',mental:6,leverage:20},offline:{name:'飞行模式',copy:'下一段不能开新仓',noEntry:true},lucky:{name:'护身符在看着',copy:'两段内承受力 +6；之后容易上头',mental:6},ego:{name:'这截图够我吹一天',copy:'两段内压力 +6',stress:6},caution:{name:'答应过萌智子',copy:'下一段杠杆至多 20×',leverage:20}};
export function ensureStory(s){
 s.story ||= {seen:[],queue:[],log:[],flags:{}};s.story.seen ||= [];s.story.queue ||= [];s.story.log ||= [];s.story.flags ||= {};s.story.presentedDay ||= 0;
 s.family ||= {unlocked:!!s.fatherUsed,outstanding:s.fatherUsed?Math.max(0,s.externalFunding||0):0,borrowedAt:s.fatherUsed?(s.day-1)*4+s.beat:null,discovered:false,informed:false,repaid:0,trust:0};
 s.effects ||= [];s.expenses ||= 0;s.dayOpeningExpenses ||= 0;s.chat.campus ||= [];s.itemsUsed ||= {};
 if(s.family.outstanding>0&&!s.effects.some(e=>e.id==='guilt'))addEffect(s,'guilt',null);
 return s.story;
}
export function addEffect(s,id,remaining){s.effects ||= [];const effect={id,remaining};const old=s.effects.findIndex(e=>e.id===id);if(old>=0)s.effects[old]=effect;else s.effects.push(effect);return effect;}
export function restrictions(s){let leverage=s.sanity<=20?20:s.sanity<=50?50:100,stake=s.sanity<=20?.25:s.sanity<=50?.5:1,noEntry=s.sanity<=5,mental=0,stress=0;for(const e of s.effects||[]){const def=DEBUFFS[e.id];if(!def)continue;leverage=Math.min(leverage,def.leverage||100);stake=Math.min(stake,def.stake||1);noEntry ||= !!def.noEntry;mental+=def.mental||0;stress+=def.stress||0;}return{leverage,stake,noEntry,mental,stress};}
export function ageEffects(s){const expired=[];s.effects=(s.effects||[]).filter(e=>{if(e.remaining===null)return true;e.remaining--;if(e.remaining<=0){expired.push(e.id);return false;}return true;});for(const id of expired){if(id==='wired')addEffect(s,'fatigue',2);if(id==='lucky')addEffect(s,'ego',2);}return expired;}
export function queueStory(s,id){ensureStory(s);if(!STORIES[id]||s.story.seen.includes(id)||s.story.queue.includes(id))return false;s.story.queue.push(id);return true;}
export function checkStories(s,account,emotion){ensureStory(s);if(s.sanity<=75)queueStory(s,'threshold75');if(s.sanity<=50)queueStory(s,'threshold50');
 if(!s.family.unlocked&&!s.fatherUsed&&emotion==='despair'&&account<30000)queueStory(s,'fatherUnlock');
 const absolute=(s.day-1)*4+s.beat;
 if(s.family.outstanding>0&&!s.family.discovered&&!s.family.informed&&s.family.borrowedAt!==null&&absolute-s.family.borrowedAt>=2)queueStory(s,'fatherFound');
 if(s.day>=4)queueStory(s,'friendWalk');
}
export function pendingStory(s){ensureStory(s);if(s.phase!=='resting'||s.story.presentedDay===s.day)return null;s.story.queue=s.story.queue.filter(id=>['threshold75','threshold50','fatherUnlock','fatherFound','repayPartial','repayFull','friendWalk'].includes(id)&&!!getStory(s,id));const emergency=s.story.queue.includes('fatherUnlock')&&s.cash+s.reserve<30000;const key=emergency?'fatherUnlock':s.story.queue[0];if(key==='fatherUnlock')s.family.unlockedAtEquity=s.cash+s.reserve;return getStory(s,key);}
export function chooseStory(s,choiceId){if(s.phase!=='resting')throw Error('人物事件只在休市后发生');const event=pendingStory(s);if(!event)throw Error('没有待处理的剧情');const choice=event.choices.find(c=>c.id===choiceId);if(!choice)throw Error('请选择一个回应');s.story.queue=s.story.queue.filter(id=>id!==event.key);s.story.presentedDay=s.day;s.story.seen.push(event.key);s.story.log.push({id:event.key,day:s.day,beat:s.beat,choice:choice.id});s.story.log=s.story.log.slice(-40);
 if(event.key==='fatherUnlock'){s.family.unlocked=true;s.family.lastAction=choice.id;s.family.viewed=choice.id==='look_at_savings';s.family.closed=choice.id==='leave_alone';choice.lines=getStory(s,event.key)?.choices.find(c=>c.id===choice.id)?.lines||[];}
 if(event.key==='fatherFound'){s.family.discovered=true;addEffect(s,'familyWatch',2);s.family.trust-=1;}
 s.stress=Math.max(0,(s.stress||0)+(choice.stress||0));s.family.trust+=choice.trust||0;
 if(choice.mood)s.emotionBias={mood:choice.mood,until:(s.day-1)*4+s.beat+2};
 const messages=[...event.lines,...choice.lines].map(([from,text])=>({from,text,kind:from==='久留美'?'self':'campus',storyId:event.id}));s.chat.campus.push(...messages);s.chat.campus=s.chat.campus.slice(-80);return{event,choice,messages};
}
