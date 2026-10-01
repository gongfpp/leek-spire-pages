import {createGame, takeAction, advanceTick, finishSegment, nextDay, equity, unrealized, mood, currentEvent, factCheck, useReserve, reply, restoreGame, START, BEATS_PER_DAY} from './engine.js';
import {GameAudio} from '../audio.js';
import {GameMotion} from '../feedback.js';
import {showSettlement} from '../settlement.js';

const $ = id => document.getElementById(id);
const yen = value => `${value<0?'−':''}¥${Math.abs(Math.round(value)).toLocaleString('zh-CN')}`;
const signed = value => `${value>0?'+':''}${yen(value)}`;
const saveKey = 'fx-girl-campaign-v2';
const settingsKey = 'fx-girl-settings';
const fresh = () => createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
let state = restoreGame(localStorage.getItem(saveKey)) || fresh();
let stake=.5, leverage=20, stop=.5, speed=1, skip=false, playing=false, channel='group', chatOpen=false, shownFlashTimer, toastTimer;
let sound = localStorage.getItem(settingsKey)==='sound';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio = new GameAudio();
audio.configure({sound,soundVolume:.5});
const motion = new GameMotion();motion.configure(!reduced);
const moodInfo = {
  calm:['平静','calm','“先看一下，不急。”','至少现在还能正常呼吸。'],
  smug:['得意','smug','“好像摸到一点门道了。”','这点盈利，足够让手指蠢蠢欲动。'],
  nervous:['紧张','nervous','“它刚才是不是动了一下？”','仓位与波动都在提醒你看止损。'],
  anxious:['焦虑','anxious','“再回来一点，我就走。”','最近几次小亏都还记在心里。'],
  ecstatic:['亢奋','ecstatic','“原来我擅长的事情是赚钱！”','一笔高风险交易赚到了，但下一根线还没走。'],
  despair:['绝望','shocked','“……刚才那个数字呢？”','重仓损失或强平留下了很深的冲击。'],
  regretful:['懊恼','regretful','“我明明看到它涨过的。”','浮盈回吐，比没赚到更难受。'],
  relieved:['如释重负','relieved','“赚不赚先不说，能呼吸了。”','刚从风险线附近离开。']
};
const dayNames=['我就试一下','赚钱好像不难','今晚有大事','新的一天，新的借口'];
const dayTasks=['熟悉市场，活到收盘','辨认消息反转','在突发事件中守住计划','决定什么时候收手'];
const shouldAnimate=()=>motion.enabled&&!reduced;
function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));$('saved').textContent='本机自动保存';}catch{$('saved').textContent='保存失败，请勿刷新';}}
function currentRisk(){return state.position ? Math.round(state.position.margin / Math.max(equity(state),1)*100) : 0;}
function setText(id,value){$(id).textContent=value;}
function chart(){
  const candles=state.candles.slice(-30), w=660,h=252,left=8,right=70,top=14,bottom=26;
  const hi=Math.max(...candles.map(c=>c.high))+.12,lo=Math.min(...candles.map(c=>c.low))-.12;
  const y=value=>top+(hi-value)/(hi-lo)*(h-top-bottom),dx=(w-left-right)/candles.length;
  const parts=[`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">`];
  for(let i=0;i<5;i++){const value=hi-(hi-lo)*i/4,Y=y(value);parts.push(`<line x1="${left}" x2="${w-right}" y1="${Y}" y2="${Y}" stroke="#494454" stroke-dasharray="3 5"/><text x="${w-right+9}" y="${Y+4}" fill="#aaa3b7" font-size="11">${value.toFixed(2)}</text>`);}
  candles.forEach((c,i)=>{const x=left+dx*(i+.5),color=c.close>=c.open?'#8ae4bf':'#f58cba';
    parts.push(`<line x1="${x}" x2="${x}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${color}" stroke-width="1.5"/><rect x="${x-dx*.29}" y="${Math.min(y(c.open),y(c.close))}" width="${dx*.58}" height="${Math.max(1.5,Math.abs(y(c.open)-y(c.close)))}" fill="${color}" rx="1"/>`);
    if(!c.historical&&c.closed&&i===candles.length-1)parts.push(`<text x="${x}" y="${h-4}" text-anchor="middle" fill="#e5bdd5" font-size="11">●</text>`);
  });
  const Y=y(state.price);parts.push(`<line x1="${left}" x2="${w-right}" y1="${Y}" y2="${Y}" stroke="#f1b4d3" stroke-dasharray="4 4" opacity=".7"/><rect x="${w-right+4}" y="${Y-10}" width="64" height="20" rx="3" fill="#f2a5c8"/><text x="${w-right+36}" y="${Y+4}" text-anchor="middle" fill="#2b2230" font-size="11">${state.price.toFixed(3)}</text></svg>`);
  $('chart').innerHTML=parts.join('');$('chart').setAttribute('aria-label',`美元兑日元已发生行情，现价 ${state.price.toFixed(3)}，今天第 ${state.beat+1} 个决策点`);
}
function render(){
  const day=state.day,phase=state.phase,position=state.position,marketPlaying=phase==='playing',end=phase==='day_end'||phase==='bankrupt';
  const account=equity(state),event=currentEvent(state),em=mood(state),info=moodInfo[em];
  setText('stage-name',`第 ${day} 天 · ${dayNames[Math.min(day-1,3)]} / 第 ${Math.floor((day-1)/3)+1} 章`);
  setText('mission-title',`第 ${day} 天 · ${dayTasks[Math.min(day-1,3)]}`);
  setText('mission-copy',end?'今日已收盘，账本与聊天都留给明天。':`本日开盘 ${yen(state.dayOpening)} · ${state.beat+1} / ${BEATS_PER_DAY} 次决策`);
  setText('chapter-target',`章节累计 ${signed(account-START)} · 首章挑战 ¥150,000`);
  setText('emotion-label',info[0]);setText('emotion-explain',info[3]);
  if($('portrait').dataset.mood!==em){$('portrait').src=`./fx/expressions/kurumi-${info[1]}.webp`;$('portrait').dataset.mood=em;$('portrait').alt=`久留美此刻${info[0]}的漫画表情`;}
  if(!marketPlaying)setText('speech',info[2]);
  setText('sanity-text',`${Math.round(state.sanity)} / 100`);$('sanity-fill').style.width=state.sanity+'%';
  setText('price',state.price.toFixed(3));const base=state.candles.findLast(c=>c.day!==day)?.close||150;
  const change=(state.price/base-1)*100;setText('change',`${change>=0?'+':''}${change.toFixed(3)}%`);$('change').className=change>=0?'positive':'negative';
  setText('beat-label',end?'今日收盘':`决策 ${state.beat+1} / ${BEATS_PER_DAY}`);
  setText('candle-label',marketPlaying?`第 ${state.pending.candle+1} / 4 根 · 形成中`:'下一段：4 根 K 线');
  setText('market-phase',end?'收盘已结算':marketPlaying?'行情播放中 · 可以加速':'市场已暂停 · 等待决策');
  setText('news-source',event.source);setText('news-title',event.title);setText('news-copy',event.copy);
  setText('news-hint',state.factCheckedBeat===state.beat ? event.credibility : `可能反转 · 波动 ${'★'.repeat(event.vol)}${'☆'.repeat(3-event.vol)}`);
  $('fact-check').disabled=phase!=='decision'||state.skills.insight;
  setText('equity',yen(account));setText('free-cash',yen(state.cash));setText('used-margin',yen(position?.margin||0));setText('reserve-amount',yen(state.reserve));
  setText('day-pnl',signed(account-state.dayOpening));$('day-pnl').className=account>=state.dayOpening?'positive':'negative';
  $('order-empty').hidden=!!position||end;$('position-card').hidden=!position;
  setText('stake-value',`${Math.round(stake*100)}%`);setText('leverage-value',`${leverage}×`);setText('stop-value',stop===1?'不预设':`保证金 ${Math.round(stop*100)}%`);
  setText('risk-amount',yen(state.cash*stake*stop));
  for(const [attr,value] of [['stake',stake],['leverage',leverage],['stop',stop]])for(const button of document.querySelectorAll(`[data-${attr}]`)){const selected=Number(button.dataset[attr])===value;button.setAttribute('aria-pressed',selected);button.disabled=phase!=='decision';}
  for(const id of ['long','short','wait','hold','half','close'])$(id).disabled=phase!=='decision';
  if(position){setText('position-side',position.direction===1?'↗ 做多':'↘ 做空');setText('entry-price',position.entry.toFixed(3));setText('current-price',state.price.toFixed(3));setText('floating',signed(unrealized(state)));$('floating').className=unrealized(state)>=0?'positive':'negative';setText('position-margin',`保证金 ${yen(position.margin)} / 占权益 ${currentRisk()}%`);setText('position-leverage',`${position.leverage}×`);setText('position-stop',position.stop===1?'无预设（可能强平）':`−${yen(position.margin*position.stop)}`);}
  $('insight').disabled=phase!=='decision'||state.skills.insight;$('shield').disabled=phase!=='decision'||state.skills.shield;$('disconnect').disabled=phase!=='decision'||state.skills.disconnect;
  $('skip').disabled=!marketPlaying;$('restart').disabled=marketPlaying;
  setText('playback-state',marketPlaying?'行情正在形成':end?'今日行情结束':'等待下一笔操作');
  $('sound').textContent=sound?'♪ 音效开':'♪ 音效关';$('sound').setAttribute('aria-pressed',String(sound));
  const latest=state.chat[channel].at(-1);if(latest)setText('ticker-text',`${latest.from}：${latest.text}`);
  setText('unread',String(Math.min(9,state.chat.group.length+state.chat.friend.length)));
  chart();if(chatOpen)renderChat();persist();
}
function soundEffect(kind,opts){audio.effect(kind,opts);}
function fly(label,from,to){if(!shouldAnimate())return;const a=from?.getBoundingClientRect?from.getBoundingClientRect():from,b=to?.getBoundingClientRect?to.getBoundingClientRect():to;if(!a||!b)return;
 const item=document.createElement('div');item.className='flying-order';item.textContent=label;item.style.left=`${a.x+a.width/2}px`;item.style.top=`${a.y+a.height/2}px`;document.body.append(item);
 motion.animate(item,[{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${b.x+b.width/2-a.x-a.width/2}px),calc(-50% + ${b.y+b.height/2-a.y-a.height/2}px)) scale(.72)`,opacity:.1}],{duration:560})?.finished.catch(()=>{}).finally(()=>item.remove());}
function toast(message,kind='neutral'){
 clearTimeout(toastTimer);const el=$('trade-toast');el.hidden=false;el.className=`trade-toast ${kind}`;el.textContent=message;
 motion.animate(el,[{transform:'translate(-50%,-18px)',opacity:0},{transform:'translate(-50%,0)',opacity:1},{transform:'translate(-50%,0)',opacity:1,offset:.7},{transform:'translate(-50%,-10px)',opacity:0}],{duration:2400});
 toastTimer=setTimeout(()=>el.hidden=true,shouldAnimate()?2400:2000);
}
function flash(event){clearTimeout(shownFlashTimer);setText('flash-title',event.title);setText('flash-copy',event.copy);$('news-flash').hidden=false;
 motion.animate($('news-flash'),[{transform:'translateY(-14px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:320});
 shownFlashTimer=setTimeout(()=>$('news-flash').hidden=true,3600);soundEffect('draw',{rate:.9});}
function afterTick(result){
  if(result.flash)flash(result.flash);
  if(result.exit){const t=result.exit;const tag=t.type==='liquidation'?'强制平仓':t.type==='stop'?'止损已触发':'已平仓';
    toast(`${tag} · ${signed(t.pnl)}`,t.pnl>=0?'gain':'loss');soundEffect(t.pnl>=0?'gain':'loss',{rate:t.pnl<0?.74:1.12});
    fly('平仓',$('position-card'),$('free-cash'));
    if(t.type==='liquidation')motion.animate($('character-card'),[{transform:'translateX(-6px)'},{transform:'translateX(5px)'},{transform:'translateX(-2px)'},{transform:'none'}],{duration:360});
  }else if(result.candleClosed) soundEffect('rattle',{rate:1.05,level:.18});
  render();
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function playSegment(){if(playing)return;playing=true;
  try{
    while(state.phase==='playing'){
      if(skip||reduced){let lastFlash=null;for(const result of finishSegment(state)){if(result.flash)lastFlash=result.flash;}if(lastFlash)flash(lastFlash);render();break;}
      const result=advanceTick(state);afterTick(result);
      if(state.phase==='playing')await delay(135/speed);
    }
  }finally{playing=false;skip=false;render();}
  if(state.phase==='day_end'||state.phase==='bankrupt')showDaySettlement();
  else{toast('行情暂停 · 现在由你决定下一步');$('last-trade').textContent=state.position?'仓位仍在，继续持有、减半或全部平仓。':'当前空仓；消息可能已反转，可以再决定。';}
}
function sendAction(type){if(state.phase!=='decision')return;
  audio.unlock();const button=$(type),oldPosition=state.position?{...state.position}:null,oldEquity=equity(state);
  const buttonRect=button.getBoundingClientRect(),positionRect=$('position-card').getBoundingClientRect();
  const result=takeAction(state,{type,stake,leverage,stop});
  render();
  if(type==='long'||type==='short'){
    const amount=result.trade.margin;setText('capital-flow',`${yen(amount)} 从可用资金进入${type==='long'?'多':'空'}单保证金`);
    fly(`${type==='long'?'买入':'卖出'} ${yen(amount)}`,buttonRect,$('position-card'));soundEffect('play',{rate:type==='long'?1.1:.85});
    toast(`${type==='long'?'↗ 做多开仓':'↘ 做空开仓'} · 保证金 ${yen(amount)}`,'gain');
  }else if(result.trade){
    setText('capital-flow',`${yen(result.trade.margin)} 保证金释放 · ${signed(result.trade.pnl)} 已入账`);
    fly(`${type==='half'?'减半':'平仓'} ${signed(result.trade.pnl)}`,positionRect,$('free-cash'));
    soundEffect(result.trade.pnl>=0?'gain':'loss',{rate:1.1});
    toast(`${type==='half'?'平掉一半':type==='disconnect'?'拔网线前先平仓':'全部平仓'} · ${signed(result.trade.pnl)}`,result.trade.pnl>=0?'gain':'loss');
  }else if(type==='disconnect')toast('先离线休息 · 承受力 +25');
  else if(type==='wait')toast('空仓观察 · 承受力 +5');
  else if(type==='hold')toast('继续持有 · 下一段行情开始');
  const impact=equity(state)-oldEquity;
  if(Math.abs(impact)>0.01)motion.animate($('equity'),[{transform:'scale(1.1)',color:impact>=0?'#23936c':'#bd4c7d'},{transform:'none',color:'inherit'}],{duration:510});
  if(oldPosition&&!state.position&&type!=='disconnect')setText('speech',result.trade?.pnl>=0?'“先落袋，才算我的钱。”':'“这次是真的平了。”');
  render();playSegment();
}
function buildReceipt(report){const labels={half:'减半平仓',close:'全部平仓',stop:'触发止损',liquidation:'强制平仓',closing:'收盘平仓',disconnect:'离线前平仓'};
  return{opening:report.opening,closing:report.closing,rows:report.trades.filter(t=>Number.isFinite(t.pnl)).map(t=>({label:`第 ${t.beat+1} 段 · ${t.direction===1?'多':'空'}单 · ${labels[t.type]||'交易'}`,amount:t.pnl,formula:`${yen(t.margin)} 保证金 · ${t.leverage}× · ${t.entry.toFixed(3)} → ${t.exit.toFixed(3)}`}))};}
function showDaySettlement(){if(document.querySelector('.settlement-dialog')||$('day-dialog').open||$('bankrupt-dialog').open)return;
  if(state.phase==='bankrupt'){$('bankrupt-money').textContent=yen(equity(state));$('bankrupt-dialog').showModal();return;}
  const report=buildReceipt(state.dayReport);
  showSettlement(report,{audio,motion,onDone:showDayDialog,onSkip:()=>{}});
}
function showDayDialog(){const r=state.dayReport,peak=r.peak;
  setText('day-title',r.net>=0?'今天，至少账户还在笑。':'今天的亏，明天也记得。');
  setText('day-subtitle',`第 ${r.day} 天结束。账户承受力 ${Math.round(state.sanity)} / 100，消息记录和资金会一起进入下一天。`);
  setText('comic-first',r.promise==='break_even'?'“回本就走。”这句话已经发给萌智子。':r.promise==='small'?'“最多两成仓。”群里已经帮你截图。':'“先看看。”久留美说完，交易软件已经打开。');
  setText('comic-second',peak?`${peak.type==='liquidation'?'强平':peak.type==='stop'?'止损':peak.type==='half'?'减半':'平仓'}一笔 ${signed(peak.pnl)}。当时久留美的表情：${moodInfo[r.mood]?.[0]||'平静'}。`:'四段行情走完，账户里没有一笔真正成交。');
  setText('comic-third',`收盘 ${yen(r.closing)}。萌智子：${r.net>=0?'你今天能按时回来吃饭吗？':'先吃饭，行情不会替你过日子。'}`);
  setText('day-total',yen(r.closing));setText('day-net',`今日 ${signed(r.net)} · 章节累计 ${signed(r.closing-START)}`);
  $('day-dialog').showModal();}
function newChapter(){localStorage.removeItem(saveKey);state=fresh();stake=.5;leverage=20;stop=.5;skip=false;playing=false;for(const d of document.querySelectorAll('dialog[open]'))d.close();$('capital-flow').textContent='';$('last-trade').textContent='新的一章，从第一根 K 线开始。';render();scrollTo({top:0,behavior:reduced?'instant':'smooth'});}
function renderChat(){const list=state.chat[channel];const box=$('chat-messages');box.replaceChildren();
  for(const message of list){const row=document.createElement('div');row.className=`message ${message.kind==='self'?'self':''}`;const who=document.createElement('b'),text=document.createElement('p');who.textContent=message.from;text.textContent=message.text;row.append(who,text);box.append(row);}
  box.scrollTop=box.scrollHeight;
  for(const button of document.querySelectorAll('[data-channel]'))button.setAttribute('aria-selected',String(button.dataset.channel===channel));
  const choices=channel==='group'?[['source','问消息来源'],['stance','发表观点'],['share','晒模拟账户']]:[['promise','说「回本就走」'],['small','说「最多两成仓」'],['dinner','约好下班吃饭']];
  $('chat-replies').replaceChildren();for(const [choice,label] of choices){const b=document.createElement('button');b.textContent=label;b.dataset.reply=choice;b.disabled=state.phase!=='decision'||choice==='source'&&state.skills.insight;$('chat-replies').append(b);}
  setText('group-count',String(state.chat.group.length));setText('friend-count',String(state.chat.friend.length));}
function openChat(){chatOpen=true;renderChat();$('chat-dialog').showModal();}
function closeChat(){chatOpen=false;$('chat-dialog').close();}

for(const b of document.querySelectorAll('[data-stake],[data-leverage],[data-stop]'))b.addEventListener('click',()=>{if(b.dataset.stake)stake=Number(b.dataset.stake);if(b.dataset.leverage)leverage=Number(b.dataset.leverage);if(b.dataset.stop)stop=Number(b.dataset.stop);render();});
for(const type of ['long','short','wait','hold','half','close','disconnect'])$(type).addEventListener('click',()=>sendAction(type));
for(const b of document.querySelectorAll('[data-speed]'))b.addEventListener('click',()=>{speed=Number(b.dataset.speed);for(const option of document.querySelectorAll('[data-speed]'))option.setAttribute('aria-pressed',String(option===b));});
$('skip').addEventListener('click',()=>{if(state.phase==='playing')skip=true;});
$('insight').addEventListener('click',()=>{const result=factCheck(state);if(!result)return;flash({title:result.title,copy:result.text});soundEffect('draw');render();});
$('fact-check').addEventListener('click',()=>{$('insight').click();});
$('shield').addEventListener('click',()=>{const amount=useReserve(state);if(!amount)return;toast(`${yen(amount)} 已锁作生活备用金，收盘返还`);setText('capital-flow',`${yen(amount)} 移出今日风险资金`);soundEffect('defend');render();});
$('chat-open').onclick=openChat;$('ticker-open').onclick=openChat;$('chat-close').onclick=closeChat;$('chat-dialog').addEventListener('cancel',()=>{chatOpen=false;});
for(const b of document.querySelectorAll('[data-channel]'))b.onclick=()=>{channel=b.dataset.channel;renderChat();};
$('chat-replies').addEventListener('click',e=>{const button=e.target.closest('[data-reply]');if(!button)return;reply(state,channel,button.dataset.reply);soundEffect('click');render();});
$('sound').onclick=()=>{sound=!sound;localStorage.setItem(settingsKey,sound?'sound':'mute');audio.unlock();audio.configure({sound,soundVolume:.5});soundEffect('click');render();};
$('help').onclick=()=>$('help-dialog').showModal();for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('restart').onclick=()=>$('restart-dialog').showModal();$('confirm-restart').onclick=newChapter;$('new-chapter').onclick=newChapter;
$('next-day').onclick=()=>{nextDay(state);$('day-dialog').close();$('capital-flow').textContent='昨日资金和聊天已继承';$('last-trade').textContent='新一天开始。先读消息，再决定仓位。';soundEffect('unlock');render();scrollTo({top:0,behavior:reduced?'instant':'smooth'});};
$('day-close').onclick=()=>$('day-dialog').close();
document.addEventListener('visibilitychange',()=>audio.sync());window.addEventListener('pagehide',()=>audio.pause());
render();if(state.phase==='playing')playSegment();else if(state.phase==='day_end')showDayDialog();else if(state.phase==='bankrupt')showDaySettlement();
