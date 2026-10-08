import {design,effectSummary,comboFor} from './card-design.js?v=82ac3ff11395dbeeecb02c3d06dcb66bd310dc05';
import {features,marketFor} from './progression.js?v=82ac3ff11395dbeeecb02c3d06dcb66bd310dc05';
import {CARD} from './data.js?v=82ac3ff11395dbeeecb02c3d06dcb66bd310dc05';
export const TRADE_UPGRADABLE=['watch','value','inverse','probe','add','reduce','stop','profit','bottom','chase','break','volume','confirm','left','dip','panic','gold','bank','coal','dividend','cash','limit','leverage','contrary','cashout',...Object.values(CARD).filter(c=>c.new).map(c=>c.id)];
export const TIMES=['09:30','10:30','11:30','13:00','14:00','15:00'];
export const MINUTES=[0,60,120,210,270,330];
export const slots=s=>features(s).level===0?[0,3]:features(s).level===1?[0,1,3]:[0,1,3,4];
export const price=s=>s.combat?.live?.price||s.book?.lastPrice||100;
export const units=s=>s.book?.lots.reduce((n,l)=>n+l.units,0)||0;
export const oldUnits=s=>s.book?.lots.filter(l=>l.day<s.rounds).reduce((n,l)=>n+l.units,0)||0;
export const equity=s=>(s.book?.cash||0)+units(s)*price(s);
export const pct=(s,u)=>Math.round(u*price(s)/Math.max(.001,equity(s))*1000)/10;
export function syncBook(s){s.position=pct(s,units(s));s.boughtToday=pct(s,units(s)-oldUnits(s));const c=s.combat;if(c)c.energy=slots(s).filter(k=>k>=c.live.step&&!c.usedSlots.includes(k)).length;}
export function initBook(s){s.book={cash:s.hp*(1-s.position/100),lastPrice:100,equity:s.hp,lots:s.position?[{units:s.hp*s.position/100/100,cost:100,basis:100,day:-1,label:'已有仓位'}]:[]};}
export function startBookDay(s){if(!s.book)initBook(s);s.book.cash+=s.hp-s.book.equity;s.book.equity=s.hp;for(const l of s.book.lots)l.basis=price(s);const c=s.combat;c.usedSlots=[];c.trades=[];c.realized=[];c.pending=[];c.dividendRate??=0;c.effects??=[];c.exhaust??=[];c.triggers=[];c.retained=false;c.dayLedger=[];c.boost=1;c.hidePnl=false;c.lastPlayedBuy=false;c.yieldBoost=1;c.echoUsed=false;c.combo=null;syncBook(s);}
const sales=['harvest','rebalance','trim','reduce','stop','profit','empty','cashout'];
const buys=['momentum','pullback','hedgebuy','scalein','probe','add','bottom','chase','allin','break','volume','confirm','left','dip','gold','bank','coal','limit','leverage','contrary'];
export function restriction(s,card){const c=s.combat;if(!c||!card)return '当前不能出牌';if(['research','moat','dca','coupon','plan','retain'].includes(card.id)&&c.turn>=marketFor(s).days)return '本场没有下一交易日，隔夜效果无法触发';if(c.live.step===5)return '15:00 已收盘，请结算';if(!slots(s).includes(c.live.step))return '当前不是已开放的交易时段';if(c.usedSlots.includes(c.live.step))return '本时段已出牌，请推进时间';if(card.id==='recycle'&&c.block<=0)return '需要未用对冲';if(sales.includes(card.id)){if(c.faith||c.locked)return '当前锁仓，不能卖出';if(oldUnits(s)<1e-8)return units(s)?'T+1：今日买入明日才可卖':'没有可卖出的旧仓';}if(buys.includes(card.id)&&card.id!=='leverage'&&s.book.cash<.001)return '现金不足，不能继续买入';if(card.id==='leverage'&&s.position>=150)return '融资仓位已达 150%';if(card.id==='bottom'&&c.mood===5)return '狂热时不抄底，选择其他策略';if(card.id==='limit'&&(c.inverse?c.live.value>=0:c.live.value<=0))return '尚未上涨，不能追封板';if(card.id==='dividend'&&units(s)<=0)return '没有持仓，不能配置股息策略';return '';}
function pending(s,label,amount,formula=''){if(amount)s.combat.pending.push({label,amount:Math.round(amount*1000),formula,card:s.combat.currentCard||null});}
function buy(s,percent,card,financing=false){const c=s.combat,p=price(s),budget=c.startHp*percent/100*(card.up?1.35:1)*(c.boost||1);const cap=financing?Math.max(0,1.5*equity(s)-units(s)*p):Math.max(0,s.book.cash);const amount=Math.min(budget,cap);if(amount<=.000001)throw Error('现金或融资额度不足');const q=amount/p;s.book.cash-=amount;s.book.lots.push({units:q,cost:p,basis:p,day:s.rounds,label:CARD[card.id].name});c.boost=1;c.trades.push({side:'买入',label:CARD[card.id].name,price:p,units:q,amount,time:TIMES[c.live.step]});}
function sell(s,percent,card){let remaining=percent===Infinity?oldUnits(s):Math.min(oldUnits(s),s.combat.startHp*percent/100*(card.up?1.35:1)/price(s)),sold=0,p=price(s);for(const l of s.book.lots){if(l.day>=s.rounds||remaining<=0)continue;const q=Math.min(l.units,remaining);l.units-=q;remaining-=q;sold+=q;s.combat.realized.push({label:CARD[card.id].name+' · 卖出价差',amount:Math.round((p-l.basis)*q*1000),formula:`${(q*1000).toFixed(2)} 份 × (卖出 ¥${p.toFixed(2)} − 今日计价基准 ¥${l.basis.toFixed(2)})`,card:card.id});}s.book.lots=s.book.lots.filter(l=>l.units>1e-8);s.book.cash+=sold*p;s.combat.trades.push({side:'卖出',label:CARD[card.id].name,price:p,units:sold,amount:sold*p,time:TIMES[s.combat.live.step]});}
export function playTrading(s,index,{draw,log}){const c=s.combat,card=c.hand[index],reason=restriction(s,card);if(reason)throw Error(reason);c.effects??=[];c.exhaust??=[];c.triggers??=[];const tradeStart=c.trades.length,effectStart=c.effects.length,rateBefore=c.dividendRate||0,combo=comboFor(s,card.id);const id=card.id,up=c.inverse?c.live.value<0:c.live.value>0,bonus=card.up?1.35:1;c.currentCard=id;
 const hedge=n=>{const amount=Math.round(n*bonus);c.block+=amount;pending(s,CARD[id].name+' · 对冲成本',-amount*.05,'额度 × 5%，收盘扣除');};
 if(card.id&&CARD[card.id].new)playExpansion(s,card,draw);else switch(id){
 case'probe':buy(s,10,card);c.boost=card.up?1.5:1.3;break;
 case'add':buy(s,20,card);break;
 case'reduce':case'stop':case'profit':sell(s,20,card);if(id==='stop')s.statuses={};if(id==='profit')s.greed=Math.max(0,s.greed-2);break;
 case'empty':sell(s,Infinity,card);break;
 case'cashout':sell(s,30,card);s.greed=0;break;
 case'watch':draw(s,card.up?3:2);break;
 case'bottom':buy(s,c.mood===0?30:s.lastDown?20:10,card);break;
 case'chase':buy(s,c.mood>=4?30:15,card);break;
 case'allin':buy(s,100,card);break;
 case'break':buy(s,up?25:10,card);break;
 case'volume':buy(s,10,card);draw(s,2);break;
 case'confirm':buy(s,15,card);if(up)c.boost=1.5;break;
 case'faith':c.faith=true;c.dividendRate+=.002;break;
 case'hold':c.locked=true;draw(s,2);break;
 case'left':buy(s,10+Math.max(0,3-c.mood)*5,card);break;
 case'dip':buy(s,up?10:25,card);break;
 case'panic':hedge(10);if(c.mood<=1)draw(s,2);break;
 case'gold':buy(s,c.mood<=1?35:10,card);break;
 case'bank':buy(s,10,card);c.dividendRate+=.003*bonus;break;
 case'coal':buy(s,15,card);c.dividendRate+=.002*bonus;break;
 case'dividend':c.dividendRate+=.005*bonus;break;
 case'cash':hedge(12);break;
 case'value':c.keepBlock=true;draw(s,card.up?3:2);break;
 case'limit':buy(s,25,card);break;
 case'leverage':buy(s,30,card,true);s.greed=Math.min(5,s.greed+1);break;
 case'inverse':c.inverse=!c.inverse;draw(s,card.up?2:1);break;
 case'contrary':buy(s,up?10:25,card);break;
 case'ignore':c.hidePnl=true;draw(s,2);break;
 }
 if(design(id).key==='yield'&&c.yieldBoost>1){const factor=c.yieldBoost;c.dividendRate=rateBefore+(c.dividendRate-rateBefore)*factor;for(const e of c.effects.slice(effectStart)){if(e.rate)e.rate*=factor;if(e.increment)e.increment*=factor;if(e.max)e.max*=factor;}c.yieldBoost=1;}
 if(design(id).key==='skill'&&!c.echoUsed){const extra=c.effects.filter(e=>e.id==='echo').reduce((n,e)=>n+e.draw,0);if(extra){draw(s,extra);c.echoUsed=true;trigger(s,'复盘回响',`补抽 ${extra} 张`);}}
 c.combo=combo?.label||null;c.lastPlayedBuy=c.trades.slice(tradeStart).some(t=>t.side==='买入');
 applyTradeCosts(s,tradeStart);
 if(id==='leverage')pending(s,'融资开通费',-.05,'固定 ¥50');
 if(s.relics.includes('abacus')&&CARD[id].type==='红利')c.dividendRate+=.001;
 if(s.relics.includes('cup')&&sales.includes(id)&&!c.cupUsed){draw(s,1);c.cupUsed=true;}
 c.hand.splice(c.hand.findIndex(x=>x.uid===card.uid),1);(design(id).exhaust?c.exhaust:c.discard).push(card);c.usedSlots.push(c.live.step);c.played++;c.playedTotal++;s.used[id]=(s.used[id]||0)+1;delete c.currentCard;syncBook(s);
 const t=c.trades.at(-1);log(s,t?.label===CARD[id].name?`${t.time}「${t.label}」${t.side} ${(t.units*1000).toFixed(2)} 份 @ ¥${t.price.toFixed(2)}。收盘统一核算损益。`:`「${CARD[id].name}」已执行，本时段机会已使用。`);
}
export function estimatedPnl(s){const c=s.combat;if(!c||!s.book)return 0;return c.realized.reduce((n,r)=>n+r.amount/1000,0)+s.book.lots.reduce((n,l)=>n+(price(s)-l.basis)*l.units,0);}
export function settleTrading(s){const c=s.combat,p=price(s),rows=[...c.realized];for(const l of s.book.lots)rows.push({label:l.label+' · 收盘持仓',amount:Math.round((p-l.basis)*l.units*1000),formula:`${(l.units*1000).toFixed(2)} 份 × (收盘 ¥${p.toFixed(2)} − ${l.day===s.rounds?'成交':'昨收'} ¥${l.basis.toFixed(2)})`,card:null});const pnl=rows.reduce((n,r)=>n+r.amount,0)/1000;
 let uncovered=Math.max(0,-pnl);if(uncovered&&c.block){const payout=Math.min(c.block,uncovered);c.block-=payout;uncovered-=payout;pending(s,'对冲兑现',payout,'不超过今日交易与持仓净亏损');}
 let dividend=0;const payYield=(label,rate,quantity=units(s))=>{if(!quantity)return;const amount=quantity*p*rate*(c.market==='earnings'?1.3:1);dividend+=Math.round(amount*1000)/1000;pending(s,label,amount,`${label==='长线底仓'?'可卖旧仓市值':'收盘持仓市值'} × ${(rate*100).toFixed(3)}%${c.market==='earnings'?' × 财报加成 1.3':''}（游戏股息）`);trigger(s,label,'收盘派息');};
 if(c.dividendRate)payYield('持仓股息',c.dividendRate);
 const closingEffects=(c.effects||[]).filter(e=>e.trigger==='close'&&e.from<=s.rounds);
 // Protected amounts are allocated once: normal hedge, reserve, then percentage cover.
 for(const e of closingEffects.filter(e=>e.id==='umbrella')){const paid=Math.min(e.amount,uncovered);e.amount-=paid;uncovered-=paid;if(paid){pending(s,'雨天备用金 · 兑现',paid,'独立额度，不重复对冲同一损失');trigger(s,'雨天备用金','兑现 ¥'+Math.round(paid*1000));}}
 for(const e of closingEffects){switch(e.id){case'loyalty':payYield('长线底仓',e.rate,oldUnits(s));break;case'cashflow':if(c.trades.some(t=>t.side==='买入')&&c.trades.some(t=>t.side==='卖出'))pending(s,'流水生金',Math.max(0,s.book.cash)*e.rate,'正现金余额 × '+(e.rate*100).toFixed(2)+'%');break;case'discipline':if(pct(s,units(s))<=e.limit)pending(s,'仓位纪律',Math.max(0,s.book.cash)*e.rate,'正现金余额 × '+(e.rate*100).toFixed(2)+'%');break;case'annuity':case'coupon':case'ladder':case'payout':payYield(CARD[e.id].name,e.rate);if(e.id==='ladder')e.rate=Math.min(e.max,e.rate+e.increment);break;case'patience':if(!c.trades.some(t=>t.side==='卖出'))payYield('耐心溢价',e.rate);break;case'reserve':pending(s,'留有余粮 · 现金利息',Math.max(0,s.book.cash)*e.rate,'可用现金 × '+(e.rate*100).toFixed(2)+'%');trigger(s,'留有余粮','现金收息');break;case'collar':{const paid=Math.min(e.cap,uncovered*e.ratio);uncovered-=paid;pending(s,'保本区间 · 兑现',paid,'对其他对冲后的剩余亏损按比例补偿');break;}}
  if(e.remaining!==null)e.remaining--;
 }
 c.effects=(c.effects||[]).filter(e=>(e.remaining===null||e.remaining>0)&&(e.id!=='umbrella'||e.amount>1e-8));
 if(s.book.cash<0)pending(s,'融资利息',s.book.cash*.001,'融资余额 × 0.1% / 日');
 if(s.relics.includes('helmet')&&pnl<0)pending(s,'投资习惯补贴',Math.min(.3,-pnl),'亏损日补贴，上限 ¥300');
 if(c.market==='rumor'&&c.turn===3&&c.rumorBet!==null)pending(s,'消息事件',c.rumorBet===c.rumorTruth?1:-1,'消息判断奖励或成本 ¥1,000');
 c.lastDividend=dividend;rows.push(...c.pending);s.book.cash+=c.pending.reduce((n,r)=>n+r.amount/1000,0);const reinvest=Math.min(1,(c.effects||[]).filter(e=>e.id==='compound').reduce((n,e)=>n+e.ratio,0));if(reinvest&&dividend>0&&s.book.cash>0){const amount=Math.min(s.book.cash,dividend*reinvest),q=amount/p;s.book.cash-=amount;s.book.lots.push({units:q,cost:p,basis:p,day:s.rounds,label:'股息再投'});rows.push({label:'股息再投 · 现金转持仓',amount:0,formula:`¥${Math.round(amount*1000)} 按收盘价 ¥${p.toFixed(2)} 买入 ${(q*1000).toFixed(2)} 份；次日可卖`});trigger(s,'股息再投','自动买入 ¥'+Math.round(amount*1000));}const closing=c.startHp+rows.reduce((n,r)=>n+r.amount/1000,0);s.hp=Math.max(0,Math.round(closing*1000)/1000);s.book.cash+=s.hp-equity(s);s.book.lastPrice=p;s.book.equity=s.hp;c.dayLedger.push(...rows);c.alpha+=Math.max(0,s.hp-c.startHp);c.todayGain=s.hp-c.startHp;if(s.hp===0){s.book.cash=0;s.book.lots=[];}syncBook(s);return pnl;}

function trigger(s,name,message){const c=s.combat;c.triggers??=[];c.triggers.push({name,message});c.triggers=c.triggers.slice(-8);}
function addEffect(s,id,values){const effect={id,trigger:'close',remaining:null,from:s.rounds,...values,uid:`${s.rounds}-${s.combat.playedTotal}-${id}`};s.combat.effects.push(effect);trigger(s,CARD[id].name,effectSummary(effect));}
function applyTradeCosts(s,from){const c=s.combat;for(const t of c.trades.slice(from)){c.changes++;if(c.market==='range'&&c.changes>1)pending(s,'频繁交易费用',-.1,'第二次起调整仓位，每次 ¥100');if(c.market==='liquidity')pending(s,'流动性交易费',-t.amount*.002,'成交额 × 0.2%');}}
function playExpansion(s,card,draw){const c=s.combat,u=!!card.up;switch(card.id){
 case'momentum':buy(s,c.lastPlayedBuy?25:15,card);break;
 case'pullback':{const last=c.trades.filter(t=>t.side==='买入').at(-1);buy(s,last&&price(s)<last.price?25:10,card);break;}
 case'harvest':sell(s,c.lastDividend>0?30:20,card);break;
 case'redeploy':draw(s,(c.trades.some(t=>t.side==='卖出')?3:1)+(u?1:0));c.boost=Math.max(c.boost,u?1.5:1.3);break;
 case'buffer':{const amount=(c.trades.some(t=>t.side==='卖出')?12:8)*(u?1.5:1);c.block+=amount;pending(s,'安全垫 · 对冲成本',-amount*.05);break;}
 case'dividendboost':c.yieldBoost=Math.max(c.yieldBoost||1,u?2:1.5);break;
 case'recycle':c.block*=u?.75:.5;draw(s,u?3:2);c.boost=Math.max(c.boost,u?1.75:1.5);break;
 case'cashflow':addEffect(s,'cashflow',{rate:u?.005:.003});break;
 case'discipline':addEffect(s,'discipline',{rate:u?.003:.002,limit:u?60:50});break;
 case'echo':addEffect(s,'echo',{trigger:'skill',draw:u?2:1});break;
 case'hedgebuy':buy(s,c.block>=5?25:10,card);break;
 case'loyalty':addEffect(s,'loyalty',{rate:u?.005:.003});break;
 case'annuity':addEffect(s,'annuity',{rate:u?.006:.004,remaining:u?4:3});break;
 case'compound':addEffect(s,'compound',{trigger:'reinvest',ratio:u?1:.5});break;
 case'moat':addEffect(s,'moat',{trigger:'open',from:s.rounds+1,amount:u?3:2});break;
 case'research':addEffect(s,'research',{trigger:'open',from:s.rounds+1,draw:u?2:1});break;
 case'dca':addEffect(s,'dca',{trigger:'open',from:s.rounds+1,percent:u?8:5,remaining:3});break;
 case'reserve':addEffect(s,'reserve',{rate:u?.0025:.0015,remaining:3});break;
 case'coupon':addEffect(s,'coupon',{from:s.rounds+1,rate:u?.012:.008,remaining:1});break;
 case'ladder':addEffect(s,'ladder',{rate:u?.002:.001,increment:u?.002:.001,max:u?.01:.005});break;
 case'patience':addEffect(s,'patience',{rate:u?.005:.003});break;
 case'payout':addEffect(s,'payout',{rate:u?.012:.008,remaining:1});break;
 case'umbrella':addEffect(s,'umbrella',{amount:u?12:8,remaining:3});pending(s,'雨天备用金 · 成本',u?-.6:-.4,'独立对冲额度 × 5%');break;
 case'collar':addEffect(s,'collar',{ratio:u?.8:.6,cap:u?4:3,remaining:1});pending(s,'保本区间 · 成本',u?-.25:-.2);break;
 case'rebalance':sell(s,30,card);c.block+=u?5:3;pending(s,'再平衡 · 对冲成本',u?-.25:-.15);break;
 case'plan':addEffect(s,'plan',{trigger:'open',from:s.rounds+1,draw:u?3:2,remaining:1});break;
 case'retain':c.retained=true;if(u)addEffect(s,'plan',{trigger:'open',from:s.rounds+1,draw:1,remaining:1});trigger(s,'耐心持牌','剩余手牌保留到明日');break;
 case'rotate':{const others=c.hand.filter(x=>x.uid!==card.uid);c.discard.push(...others);c.hand=[card];draw(s,others.length+(u?2:1));break;}
 case'scalein':buy(s,10,card);addEffect(s,'scalein',{trigger:'open',from:s.rounds+1,percent:u?10:5,remaining:1});break;
 case'trim':sell(s,10,card);addEffect(s,'trim',{trigger:'open',from:s.rounds+1,percent:u?15:10,remaining:1});break;
}}
export function triggerOpening(s,{draw,log}){const c=s.combat;if(s.version!==4)return;for(const e of c.effects||[]){if(e.trigger!=='open'||e.from>s.rounds)continue;const from=c.trades.length;if(e.draw){draw(s,e.draw);trigger(s,CARD[e.id].name,`补抽 ${e.draw} 张，上限 10`);}if(e.id==='moat'){c.block+=e.amount;pending(s,'护城河 · 对冲成本',-e.amount*.05,'开盘自动配置对冲');trigger(s,'护城河','配置 ¥'+e.amount*1000+' 对冲');}if(['dca','scalein'].includes(e.id)){if(s.book.cash>.001){buy(s,e.percent,{id:e.id,up:false});trigger(s,CARD[e.id].name,'开盘买入 ¥'+Math.round(c.trades.at(-1).amount*1000));}else trigger(s,CARD[e.id].name,'现金不足，本次跳过');}if(e.id==='trim'){if(!c.faith&&!c.locked&&oldUnits(s)>1e-8){sell(s,e.percent,{id:'trim',up:false});trigger(s,'阶梯止盈','自动卖出旧仓');}else trigger(s,'阶梯止盈','锁仓或无旧仓，本次跳过');}applyTradeCosts(s,from);if(e.remaining!==null)e.remaining--;}
 c.effects=(c.effects||[]).filter(e=>(e.remaining===null||e.remaining>0)&&(e.id!=='umbrella'||e.amount>1e-8));syncBook(s);if(c.triggers.length)log(s,'开盘触发：'+c.triggers.map(t=>t.name+' · '+t.message).join('；'));}
