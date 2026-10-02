import {stage} from './progression.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {CARD} from './data.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {effectSummary,design} from './card-design.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
// Feedback is derived from settled state; it cannot affect game economics.
export function feedback(before,after,action){
  const delta=after.hp-before.hp,block=(after.combat?.block||0)-(before.combat?.block||0);
  const unlocked=stage(after)>stage(before);
  const win=(after.screen==='reward'||after.won)&&after.screen!==before.screen;
  const tone=delta<0?'loss':unlocked?'unlock':win?'win':delta>0?'gain':block>0?'defend':action.type==='end'?'draw':action.type==='play'?'play':'click';
  const caption=unlocked?'交易权限，喜加一。':win?'这波，先收下。':action.type==='end'?(delta<0?'只是技术性心痛。':delta>0?'今天又相信了。':'没亏，也是一种赢。'):block>0?'花点小钱，留个后手。':delta>0?'小赚，也算赚。':delta<0?'市场给你上了一课。':'策略已执行。';
  const played=action.type==='play'?before.combat?.hand[action.index]:null;
  const added=played&&after.combat?.effects?.filter(e=>e.id===played.id).at(-1);
  return {delta,block,unlocked,win,tone,caption:after.combat?.combo&&action.type==='play'?after.combat.combo+' · 连招生效':added?effectSummary(added):played?.id==='retain'?'剩余手牌已保留，明日继续使用。':caption,power:played&&CARD[played.id]?.new&&design(played.id).exhaust,name:played?CARD[played.id].name:''};
}
export class ActionGate {
  constructor(now=()=>performance.now()){this.now=now;this.until=0;}
  get busy(){return this.now()<this.until;}
  hold(ms){this.until=this.now()+ms;}
}
export class GameMotion {
  constructor(){this.enabled=true;this.animations=new Set();this.timers=new Set();}
  configure(enabled,force=false){this.enabled=enabled&&(force||!matchMedia('(prefers-reduced-motion: reduce)').matches);if(!this.enabled)this.clear();}
  clear(){for(const a of this.animations)a.cancel();this.animations.clear();for(const t of this.timers)clearTimeout(t);this.timers.clear();document.querySelectorAll('.fx-ghost,.trade-feedback').forEach(e=>e.remove());}
  animate(el,frames,options){if(!el||!this.enabled)return;const a=el.animate(frames,{duration:360,easing:'cubic-bezier(.2,.8,.2,1)',...options});this.animations.add(a);a.finished.catch(()=>{}).finally(()=>this.animations.delete(a));return a;}
  capture(action){
    const rail=document.querySelector('.learning-cards,.hand-cards');
    const cards=[...document.querySelectorAll('[data-action="play"]')];
    const el=cards[action.index];
    return {scroll:rail?.scrollLeft||0,rects:new Map(cards.map(c=>[c.dataset.uid,c.getBoundingClientRect()])),ghost:action.type==='play'&&el?el.cloneNode(true):null,origin:el?.getBoundingClientRect(),focus:document.activeElement?.dataset.action};
  }
  enter(){this.animate(document.querySelector('main'),[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:420});this.deal(new Map());}
  deal(old){document.querySelectorAll('[data-action="play"]').forEach((el,i)=>{
    const prev=old.get(el.dataset.uid),next=el.getBoundingClientRect();
    this.animate(el,prev?[{transform:`translate(${prev.x-next.x}px,${prev.y-next.y}px)`},{transform:'none'}]:[{opacity:0,transform:'translateY(36px) rotate(5deg) scale(.94)'},{opacity:1,transform:'none'}],{duration:340,delay:prev?0:i*45});
  });}
  present(before,after,action,snapshot,f){
    const rail=document.querySelector('.learning-cards,.hand-cards');
    if(rail)rail.scrollLeft=action.type==='end'?0:snapshot.scroll;
    if(snapshot.focus==='play')document.querySelector(`[data-action="play"][data-index="${Math.min(action.index,(after.combat?.hand.length||1)-1)}"]:not(:disabled)`)?.focus({preventScroll:true});
    if(snapshot.focus==='end')document.querySelector('[data-action="end"]')?.focus({preventScroll:true});
    if(before.screen!==after.screen||f.unlocked)this.enter();else this.deal(action.type==='end'?new Map():snapshot.rects);
    if(this.enabled&&snapshot.ghost&&snapshot.origin){
      const g=snapshot.ghost,r=snapshot.origin,target=document.querySelector('.learning-market,.market-stage')?.getBoundingClientRect();
      g.removeAttribute('data-action');g.removeAttribute('data-uid');g.removeAttribute('aria-label');g.setAttribute('aria-hidden','true');g.tabIndex=-1;g.classList.add('fx-ghost');
      Object.assign(g.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',minWidth:'0',height:r.height+'px'});document.body.append(g);
      const dx=(target?target.x+target.width/2:innerWidth/2)-(r.x+r.width/2),dy=(target?target.y+target.height/2:100)-(r.y+r.height/2);
      this.animate(g,[{transform:'scale(1)',opacity:1},{transform:'rotate(-5deg) scale(1.04)',opacity:1,offset:.12},{transform:'rotate(4deg) scale(1.04)',opacity:1,offset:.24},{transform:`translate(${dx*.55}px,${dy*.55}px) rotate(-9deg) scale(.85)`,opacity:1,offset:.6},{transform:`translate(${dx}px,${dy}px) rotate(8deg) scale(.28)`,opacity:0}],{duration:600})?.finished.catch(()=>{}).finally(()=>g.remove());
    }
    const panel=document.querySelector('.learning-market,.market-stage,.event-paper,.result-total');
    const color=f.delta<0?'#58cda3':f.block>0?'#d8f36a':'#fa736a';
    this.animate(panel,[{boxShadow:`inset 0 0 0 2px ${color},0 0 32px ${color}44`},{boxShadow:'inset 0 0 0 0 transparent,0 0 0 transparent'}],{duration:620});
    if(f.delta<0)this.animate(panel,[{transform:'translateX(0)'},{transform:'translateX(-5px)'},{transform:'translateX(4px)'},{transform:'translateX(-2px)'},{transform:'none'}],{duration:300});
    if(f.delta)this.animate(document.querySelector('.net>strong'),[{color,transform:'scale(1.08)'},{color:'var(--text)',transform:'scale(1)'}],{duration:520});
    if(f.block>0)this.animate(document.querySelector('.learning-block,.risk-panel'),[{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:400});
    if(action.type==='end')this.animate(document.querySelector('.candles'),[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:550});
    if(action.type==='end'||f.win||action.type==='play'&&(f.power||after.combat?.combo||f.block>0)){
      document.querySelector('.trade-feedback')?.remove();const el=document.createElement('div');el.className='trade-feedback '+(f.delta<0?'bear':f.block>0?'guard':'bull');el.setAttribute('aria-hidden','true');
      const label=document.createElement('strong');label.textContent=f.unlocked?'新的玩法已解锁':action.type==='end'?'收盘结算':f.block>0?'对冲额度 +¥'+Math.round(f.block*1000).toLocaleString('zh-CN'):f.delta?'已成交':f.power?f.name+' · 已部署':'策略生效';
      const amount=document.createElement('b');amount.textContent=f.delta?`${f.delta>0?'+':'−'}¥${Math.round(Math.abs(f.delta)*1000).toLocaleString('zh-CN')}`:f.win?'落袋为安':f.block>0?'稳住。':'✓';
      const caption=document.createElement('small');caption.textContent=f.caption;el.append(label,amount,caption);document.body.append(el);
      if(!this.enabled){const timer=setTimeout(()=>{el.remove();this.timers.delete(timer);},1500);this.timers.add(timer);}
      this.animate(el,[{opacity:0,transform:'translateY(14px) rotate(-3deg)'},{opacity:1,transform:'none',offset:.16},{opacity:1,transform:'none',offset:.8},{opacity:0,transform:'translateY(-8px)'}],{duration:1500})?.finished.catch(()=>{}).finally(()=>el.remove());
    }
  }
}
