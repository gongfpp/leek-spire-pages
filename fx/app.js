import {createGame, takeAction, advanceTick, finishSegment, nextDay, equity, unrealized, mood, currentEvent, useProp, mentalState, tradingProfit, reply, restoreGame, START, TARGET_PROFIT, BEATS_PER_DAY} from './engine.js';
import {GameAudio} from '../audio.js';
import {GameMotion} from '../feedback.js';
import {showSettlement} from '../settlement.js';
import {MOODS, PROPS} from './content.js';

const $ = id => document.getElementById(id);
const yen = value => `${value<0?'−':''}¥${Math.abs(Math.round(value)).toLocaleString('zh-CN')}`;
const signed = value => `${value>0?'+':''}${yen(value)}`;
const saveKey = 'fx-girl-campaign-v3';
const settingsKey = 'fx-girl-settings';
const fresh = () => createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
let state = restoreGame(localStorage.getItem(saveKey)||localStorage.getItem('fx-girl-campaign-v2')) || fresh();
let stake=.5, leverage=20, stop=.5, speed=1, skip=false, playing=false, actionBusy=false, channel='group', chatOpen=false, shownFlashTimer, toastTimer, propFrame;
let sound = localStorage.getItem(settingsKey)!=='mute';
let fullMotion=localStorage.getItem('fx-girl-motion')!=='reduce';
let portraitStyle=localStorage.getItem('fx-girl-portrait')||'manga';
const audio = new GameAudio();
audio.configure({sound,soundVolume:.5});
const motion = new GameMotion();motion.configure(fullMotion,true);document.body.classList.toggle('motion-full',fullMotion);
const moodInfo = MOODS;
const dayNames=['我就试一下','赚钱好像不难','今晚有大事','新的一天，新的借口'];
const dayTasks=['熟悉市场，活到收盘','辨认消息反转','在突发事件中守住计划','决定什么时候收手'];
const shouldAnimate=()=>motion.enabled&&fullMotion;
const quote=value=>value.toFixed(6);
function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));$('saved').textContent='本机自动保存';}catch{$('saved').textContent='保存失败，请勿刷新';}}
function currentRisk(){return state.position ? Math.round(state.position.margin / Math.max(equity(state),1)*100) : 0;}
function setText(id,value){$(id).textContent=value;}
function chart(){
  const candles=state.candles.slice(-30), w=660,h=252,left=8,right=70,top=14,bottom=26;
  const hi=Math.max(...candles.map(c=>c.high))+.000012,lo=Math.min(...candles.map(c=>c.low))-.000012;
  const y=value=>top+(hi-value)/(hi-lo)*(h-top-bottom),dx=(w-left-right)/candles.length;
  const parts=[`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">`];
  for(let i=0;i<5;i++){const value=hi-(hi-lo)*i/4,Y=y(value);parts.push(`<line x1="${left}" x2="${w-right}" y1="${Y}" y2="${Y}" stroke="#494454" stroke-dasharray="3 5"/><text x="${w-right+9}" y="${Y+4}" fill="#aaa3b7" font-size="11">${quote(value)}</text>`);}
  candles.forEach((c,i)=>{const x=left+dx*(i+.5),color=c.close>=c.open?'#8ae4bf':'#f58cba';
    parts.push(`<line x1="${x}" x2="${x}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${color}" stroke-width="1.5"/><rect x="${x-dx*.29}" y="${Math.min(y(c.open),y(c.close))}" width="${dx*.58}" height="${Math.max(1.5,Math.abs(y(c.open)-y(c.close)))}" fill="${color}" rx="1"/>`);
    if(!c.historical&&c.closed&&i===candles.length-1)parts.push(`<text x="${x}" y="${h-4}" text-anchor="middle" fill="#e5bdd5" font-size="11">●</text>`);
  });
  const Y=y(state.price);parts.push(`<line x1="${left}" x2="${w-right}" y1="${Y}" y2="${Y}" stroke="#f1b4d3" stroke-dasharray="4 4" opacity=".7"/><rect x="${w-right+4}" y="${Y-10}" width="64" height="20" rx="3" fill="#f2a5c8"/><text x="${w-right+36}" y="${Y+4}" text-anchor="middle" fill="#2b2230" font-size="11">${quote(state.price)}</text></svg>`);
  $('chart').innerHTML=parts.join('');$('chart').setAttribute('aria-label',`日元兑美元已发生行情，现价 ${quote(state.price)}，今天第 ${state.beat+1} 个决策点`);
}
function render(){
  const day=state.day,phase=state.phase,position=state.position,marketPlaying=phase==='playing',end=phase==='day_end'||phase==='bankrupt';
  const account=equity(state),event=currentEvent(state),mental=mentalState(state),em=mood(state),info=moodInfo[em];
  const dayNet=account-state.dayOpening-(state.externalFunding-state.dayOpeningFunding);
  setText('stage-name',`第 ${day} 天 · ${dayNames[Math.min(day-1,3)]} / 第 ${Math.floor((day-1)/3)+1} 章`);
  setText('mission-title',`第 ${day} 天 · ${dayTasks[Math.min(day-1,3)]}`);
  setText('mission-copy',end?'今日已收盘，账本与聊天都留给明天。':`本日开盘 ${yen(state.dayOpening)} · ${state.beat+1} / ${BEATS_PER_DAY} 次决策`);
  setText('chapter-target',`交易净收益 ${signed(tradingProfit(state))} · 首章目标 +${yen(TARGET_PROFIT)}`);
  setText('emotion-label',info[0]);setText('emotion-explain',info[3]);
  if($('portrait').dataset.mood!==em+portraitStyle){$('portrait').src=`./fx/${portraitStyle==='chibi'?'chibi':'expressions'}/kurumi-${info[1]}.webp`;$('portrait').dataset.mood=em+portraitStyle;$('portrait').alt=`久留美此刻${info[0]}的${portraitStyle==='chibi'?'Q 版':'漫画'}表情`;}
  if(!marketPlaying)setText('speech',info[2]);
  $('portrait').classList.toggle('chibi',portraitStyle==='chibi');setText('portrait-toggle',portraitStyle==='chibi'?'切换漫画版':'切换 Q 版');
  setText('mental-detail',`累计回撤 ${Math.round(mental.totalDrawdown*100)}% · 近期回撤 ${Math.round(mental.recentDrawdown*100)}%`);
  setText('sanity-text',`${Math.round(state.sanity)} / 100`);$('sanity-fill').style.width=state.sanity+'%';
  setText('price',quote(state.price));setText('inverse-rate',`1 日元 = ${quote(state.price)} 美元 · 1 美元 ≈ ${(1/state.price).toFixed(2)} 日元`);const base=state.candles.findLast(c=>c.day!==day)?.close||1/150;
  const change=(state.price/base-1)*100;setText('change',`${change>=0?'+':''}${change.toFixed(3)}%`);$('change').className=change>=0?'positive':'negative';
  setText('beat-label',end?'今日收盘':`决策 ${state.beat+1} / ${BEATS_PER_DAY}`);
  setText('candle-label',marketPlaying?`第 ${state.pending.candle+1} / 4 根 · 形成中`:'下一段：4 根 K 线');
  setText('market-phase',end?'收盘已结算':marketPlaying?'行情播放中 · 可以加速':'市场已暂停 · 等待决策');
  setText('news-source',event.source);setText('news-time',`${event.time} JST · 模拟快讯`);setText('news-title',event.title);setText('news-copy',event.copy);
  setText('equity',yen(account));setText('free-cash',yen(state.cash));setText('used-margin',yen(position?.margin||0));setText('reserve-amount',yen(state.reserve));setText('external-funding',yen(state.externalFunding));
  setText('day-pnl',signed(dayNet));$('day-pnl').className=dayNet>=0?'positive':'negative';
  $('order-empty').hidden=!!position||end;$('position-card').hidden=!position;
  setText('stake-value',`${Math.round(stake*100)}%`);setText('leverage-value',`${leverage}×`);setText('stop-value',stop===1?'不预设':`保证金 ${Math.round(stop*100)}%`);
  setText('risk-amount',yen(state.cash*stake*stop));
  for(const [attr,value] of [['stake',stake],['leverage',leverage],['stop',stop]])for(const button of document.querySelectorAll(`[data-${attr}]`)){const selected=Number(button.dataset[attr])===value;button.setAttribute('aria-pressed',selected);button.disabled=phase!=='decision'||actionBusy;}
  for(const id of ['long','short','wait','hold','half','close'])$(id).disabled=phase!=='decision'||actionBusy;
  if(position){setText('position-side',position.direction===1?'↗ 日元买单':'↘ 日元卖单');setText('entry-price',quote(position.entry));setText('current-price',quote(state.price));setText('floating',signed(unrealized(state)));$('floating').className=unrealized(state)>=0?'positive':'negative';setText('position-margin',`保证金 ${yen(position.margin)} / 占权益 ${currentRisk()}%`);setText('position-leverage',`${position.leverage}×`);setText('position-stop',position.stop===1?'无预设（可能强平）':`−${yen(position.margin*position.stop)}`);}
  for(const id of ['father','mochiko','yasuko'])$(id).disabled=phase!=='decision'||actionBusy||(id==='father'?state.fatherUsed:state.skills[id])||(id==='yasuko'&&!position);
  if(state.cash<100){$('long').disabled=true;$('short').disabled=true;}
  setText('motion-toggle',fullMotion?'完整动效 · 开':'低动效 · 点此开启');$('motion-toggle').setAttribute('aria-pressed',String(fullMotion));
  setText('heat-label',`交易室 · ${['平稳','升温','升温','火热','沸腾','狂热'][state.heat]}`);$('heat-fill').style.width=`${state.heat*20}%`;document.body.dataset.heat=String(state.heat);
  $('skip').disabled=!marketPlaying;$('restart').disabled=marketPlaying||actionBusy;$('day-review').hidden=!end;
  setText('playback-state',marketPlaying?'行情正在形成':end?'今日行情结束':'等待下一笔操作');
  $('sound').textContent=sound?'♪ 音效开':'♪ 音效关';$('sound').setAttribute('aria-pressed',String(sound));
  const latest=state.chat[channel].at(-1);if(latest)setText('ticker-text',`${latest.from}：${latest.text}`);
  setText('unread',String(Math.min(9,state.chat.group.length+state.chat.friend.length)));
  chart();if(chatOpen)renderChat();persist();
}
function soundEffect(kind,opts){audio.effect(kind,opts);}
function impact(label,amount,tone='gain'){
  const heat=state.heat||0,rate=Math.min(1.8,1+heat*.13);
  soundEffect(tone==='loss'?'loss':'gain',{rate:tone==='loss'?.72:rate,level:.85});
  if(!shouldAnimate())return;
  const el=document.createElement('div');el.className=`deal-impact ${tone}`;el.setAttribute('aria-hidden','true');
  const title=document.createElement('small'),value=document.createElement('b');title.textContent=label;value.textContent=amount;el.append(title,value);document.body.append(el);
  motion.animate(el,[{opacity:0,transform:'translate(-50%,-50%) scale(.65) rotate(-8deg)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.1) rotate(2deg)',offset:.2},{opacity:1,transform:'translate(-50%,-50%) scale(1) rotate(-2deg)',offset:.7},{opacity:0,transform:'translate(-50%,-60%) scale(1.08)'}],{duration:1100-heat*55})?.finished.finally(()=>el.remove()).catch(()=>{});
  const force=2+heat*1.25;
  motion.animate(document.querySelector('main'),[{transform:'none'},{transform:`translate(${-force}px,${force*.4}px) rotate(-.2deg)`},{transform:`translate(${force}px,${-force*.3}px) rotate(.2deg)`},{transform:`translate(${-force*.4}px,0)`},{transform:'none'}],{duration:260+heat*25});
  const color=tone==='loss'?'#f284ba':heat>2?'#ffb84d':'#94eac4';
  motion.animate($('terminal'),[{boxShadow:`inset 0 0 0 3px ${color},0 0 ${24+heat*8}px ${color}99`},{boxShadow:'0 3px 0 #ded5dd'}],{duration:700});
  for(let i=0;i<8+heat*2;i++){
    const spark=document.createElement('i');spark.className='trade-spark';spark.style.background=color;spark.style.left='50%';spark.style.top='38%';document.body.append(spark);
    const angle=(i/(8+heat*2))*Math.PI*2,distance=60+heat*12+(i%3)*18;
    motion.animate(spark,[{opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:`translate(calc(-50% + ${Math.cos(angle)*distance}px),calc(-50% + ${Math.sin(angle)*distance}px)) rotate(${i*40}deg) scale(.3)`}],{duration:650+i%3*70})?.finished.finally(()=>spark.remove()).catch(()=>{});
  }
}
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
    toast(`${tag} · ${signed(t.pnl)}`,t.pnl>=0?'gain':'loss');impact(tag,signed(t.pnl),t.pnl>=0?'gain':'loss');
    fly('平仓',$('position-card'),$('free-cash'));
    if(t.type==='liquidation')motion.animate($('character-card'),[{transform:'translateX(-6px)'},{transform:'translateX(5px)'},{transform:'translateX(-2px)'},{transform:'none'}],{duration:360});
  }else if(result.candleClosed) soundEffect('rattle',{rate:1+state.heat*.1,level:.12+state.heat*.02});
  render();
  if(result.candleClosed)motion.animate($('price'),[{transform:'scale(1.04)'},{transform:'none'}],{duration:240});
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function playSegment(){if(playing)return;playing=true;
  try{
    while(state.phase==='playing'){
      if(skip){let lastFlash=null,lastExit=null;for(const result of finishSegment(state)){if(result.flash)lastFlash=result.flash;if(result.exit)lastExit=result.exit;}if(lastFlash)flash(lastFlash);render();if(lastExit)toast(`已${lastExit.type==='liquidation'?'强平':'止损'} · ${signed(lastExit.pnl)}`,lastExit.pnl>=0?'gain':'loss');break;}
      const result=advanceTick(state);afterTick(result);
      if(state.phase==='playing')await delay(180/(speed*(1+state.heat*.07)));
    }
  }finally{playing=false;skip=false;render();}
  if(state.phase==='day_end'||state.phase==='bankrupt')showDaySettlement();
  else{toast('行情暂停 · 现在由你决定下一步');$('last-trade').textContent=state.position?'日元仓位仍在。先决定要承担多少风险。':'当前空仓。读完快讯，再做下一次决定。';}
}
async function sendAction(type){
  if(state.phase!=='decision'||actionBusy)return;
  actionBusy=true;audio.unlock();render();
  const button=$(type),buttonRect=button.getBoundingClientRect(),positionRect=$('position-card').getBoundingClientRect();
  $('restart').disabled=true;for(const id of ['father','mochiko','yasuko'])$(id).disabled=true;
  motion.animate(button,[{transform:'scale(1)'},{transform:'scale(.9) rotate(-2deg)'},{transform:'scale(1.06) rotate(1deg)'},{transform:'none'}],{duration:210});
  soundEffect('click',{rate:1+state.heat*.1});
  try{
    if(shouldAnimate())await delay(150);
    const result=takeAction(state,{type,stake,leverage,stop});render();
    if(type==='long'||type==='short'){
      const amount=result.trade.margin,label=type==='long'?'买入日元':'卖出日元';
      setText('capital-flow',`${yen(amount)} 从可用资金进入日元${type==='long'?'买':'卖'}单保证金`);
      fly(`${label} ${yen(amount)}`,buttonRect,$('position-card'));impact(label,`${leverage}× · ${yen(amount)}`);
    }else if(result.trade){
      setText('capital-flow',`${yen(result.trade.margin)} 保证金释放 · ${signed(result.trade.pnl)} 已入账`);
      fly(`${type==='half'?'平仓一半':'全部平仓'} ${signed(result.trade.pnl)}`,positionRect,$('free-cash'));
      impact(type==='half'?'平仓一半':'全部平仓',signed(result.trade.pnl),result.trade.pnl>=0?'gain':'loss');
    }else if(type==='hold'){impact('继续持有','日元仓位保留','hold');}
    else toast('空仓观察 · 给自己一点判断的时间');
    if(shouldAnimate())await delay(320);
    actionBusy=false;playSegment();
  }catch(error){actionBusy=false;toast(error.message,'loss');render();}
}
function buildReceipt(report){const labels={half:'减半平仓',close:'全部平仓',stop:'触发止损',liquidation:'强制平仓',closing:'收盘平仓',yasuko:'安子提醒平仓'};
  return{opening:report.opening,closing:report.closing,tradingNet:report.net,funding:report.funding,closingLabel:'21:30 JST / TOKYO TRADING DIARY',rows:report.trades.filter(t=>Number.isFinite(t.pnl)).map(t=>({label:`第 ${t.beat+1} 段 · 日元${t.direction===1?'买':'卖'}单 · ${labels[t.type]||'交易'}`,amount:t.pnl,formula:`${yen(t.margin)} 保证金 · ${t.leverage}× · ${quote(t.entry)} → ${quote(t.exit)}`})).concat(report.funding?[{label:'父亲的柜中存款 · 家庭注资',amount:report.funding,formula:'单独记账，不计入交易利润'}]:[])};}
function showDaySettlement(){if(document.querySelector('.settlement-dialog')||$('day-dialog').open||$('bankrupt-dialog').open)return;
  if(state.phase==='bankrupt'){$('bankrupt-money').textContent=yen(equity(state));$('bankrupt-dialog').showModal();return;}
  const report=buildReceipt(state.dayReport);
  showSettlement(report,{audio,motion,onDone:showDayDialog,onSkip:()=>{}});
}
function showDayDialog(){const r=state.dayReport,peak=r.peak;
  setText('day-title',r.net>=0?'今天，至少账户还在笑。':'今天的亏，明天也记得。');
  setText('day-subtitle',`第 ${r.day} 天结束。账户承受力 ${Math.round(state.sanity)} / 100，消息记录和资金会一起进入下一天。`);
  setText('comic-first',r.promise==='break_even'?'“回本就走。”这句话已经发给萌智子。':r.promise==='small'?'“最多四分之一仓。”这句话已经发给萌智子。':'“先看看。”久留美说完，交易软件已经打开。');
  setText('comic-second',peak?`${peak.type==='liquidation'?'强平':peak.type==='stop'?'止损':peak.type==='half'?'减半':'平仓'}一笔 ${signed(peak.pnl)}。当时久留美的表情：${moodInfo[r.mood]?.[0]||'平静'}。`:'四段行情走完，账户里没有一笔真正成交。');
  setText('comic-third',`收盘 ${yen(r.closing)}。萌智子：${r.net>=0?'你肯平仓的时候，这笔盈利才算结束。':'明天要改的是计划，不是给今天找的新理由。'}`);
  $('comic-reaction').src=`./fx/chibi/kurumi-${moodInfo[r.mood]?.[1]||'calm'}.webp`;
  setText('day-total',yen(r.closing));setText('day-net',`今日交易 ${signed(r.net)} · 交易累计 ${signed(tradingProfit(state))}`);
  $('day-dialog').showModal();}
function newChapter(){localStorage.removeItem(saveKey);state=fresh();stake=.5;leverage=20;stop=.5;skip=false;playing=false;for(const d of document.querySelectorAll('dialog[open]'))d.close();$('capital-flow').textContent='';$('last-trade').textContent='新的一章，从第一根 K 线开始。';render();scrollTo({top:0,behavior:fullMotion?'smooth':'instant'});}
function showProp(id){
  if(actionBusy||state.phase!=='decision')return;
  audio.unlock();let result;
  try{result=useProp(state,id);}catch(error){toast(error.message,'loss');return;}
  const spec=PROPS[id];render();setText('prop-title',spec.name);setText('prop-line',`${spec.speaker}：“${spec.line}”`);setText('prop-rule',spec.copy);
  $('prop-dialog').dataset.kind=id;$('prop-dialog').showModal();
  const amount=result.amount||0,started=performance.now(),duration=shouldAnimate()?1500:0;
  if(amount){
    let soundStep=-1;
    const count=now=>{const progress=duration?Math.min(1,(now-started)/duration):1,ease=1-Math.pow(1-progress,3);setText('prop-amount',`+${yen(amount*ease)}`);
      const step=Math.floor(progress*7);if(step!==soundStep){soundStep=step;soundEffect('gain',{rate:Math.min(1.8,.85+step*.12),level:.6});}
      if(progress<1&&$('prop-dialog').open)propFrame=requestAnimationFrame(count);else if(progress===1)soundEffect('win',{rate:1.35});};
    propFrame=requestAnimationFrame(count);
    setText('capital-flow',`${yen(amount)} 家庭存款进入账户 · 交易利润单独记账`);
  }else{
    setText('prop-amount',result.trade?signed(result.trade.pnl):'止损 · 25%');soundEffect(id==='mochiko'?'defend':'exhaust',{rate:1.1});
    if(result.trade)setText('capital-flow',`${yen(result.trade.margin)} 保证金释放 · ${signed(result.trade.pnl)} 入账`);
  }
  motion.animate($('prop-dialog'),[{opacity:0,transform:'translateY(30px) scale(.85) rotate(-3deg)'},{opacity:1,transform:'translateY(0) scale(1.03) rotate(1deg)'},{opacity:1,transform:'none'}],{duration:600});
  motion.animate(document.querySelector('.prop-envelope'),[{transform:'rotate(-12deg) scale(.6)'},{transform:'rotate(8deg) scale(1.12)'},{transform:'rotate(-5deg) scale(1)'}],{duration:800});
}
function renderChat(){const list=state.chat[channel];const box=$('chat-messages');box.replaceChildren();
  for(const message of list){const row=document.createElement('div');row.className=`message ${message.kind==='self'?'self':''}`;const who=document.createElement('b'),text=document.createElement('p');who.textContent=message.from;text.textContent=message.text;row.append(who,text);box.append(row);}
  box.scrollTop=box.scrollHeight;
  for(const button of document.querySelectorAll('[data-channel]'))button.setAttribute('aria-selected',String(button.dataset.channel===channel));
  const choices=channel==='group'?[['ask','问问大家怎么看'],['stance','发表观点'],['share','晒模拟账户']]:[['promise','说「回本就走」'],['small','说「最多四分之一仓」'],['dinner','约好下班吃饭']];
  $('chat-replies').replaceChildren();for(const [choice,label] of choices){const b=document.createElement('button');b.textContent=label;b.dataset.reply=choice;b.disabled=state.phase!=='decision'||actionBusy;$('chat-replies').append(b);}
  setText('group-count',String(state.chat.group.length));setText('friend-count',String(state.chat.friend.length));}
function openChat(){chatOpen=true;renderChat();$('chat-dialog').showModal();}
function closeChat(){chatOpen=false;$('chat-dialog').close();}

for(const b of document.querySelectorAll('[data-stake],[data-leverage],[data-stop]'))b.addEventListener('click',()=>{if(b.dataset.stake)stake=Number(b.dataset.stake);if(b.dataset.leverage)leverage=Number(b.dataset.leverage);if(b.dataset.stop)stop=Number(b.dataset.stop);render();});
for(const type of ['long','short','wait','hold','half','close'])$(type).addEventListener('click',()=>sendAction(type));
for(const b of document.querySelectorAll('[data-speed]'))b.addEventListener('click',()=>{speed=Number(b.dataset.speed);for(const option of document.querySelectorAll('[data-speed]'))option.setAttribute('aria-pressed',String(option===b));});
$('skip').addEventListener('click',()=>{if(state.phase==='playing')skip=true;});
for(const id of ['father','mochiko','yasuko'])$(id).onclick=()=>showProp(id);
$('prop-done').onclick=()=>{cancelAnimationFrame(propFrame);$('prop-dialog').close();};
$('prop-dialog').addEventListener('cancel',()=>cancelAnimationFrame(propFrame));
$('portrait-toggle').onclick=()=>{portraitStyle=portraitStyle==='chibi'?'manga':'chibi';localStorage.setItem('fx-girl-portrait',portraitStyle);render();motion.animate($('portrait'),[{opacity:.2,transform:'scale(.92)'},{opacity:1,transform:'none'}],{duration:330});};
$('motion-toggle').onclick=()=>{fullMotion=!fullMotion;localStorage.setItem('fx-girl-motion',fullMotion?'full':'reduce');motion.configure(fullMotion,true);document.body.classList.toggle('motion-full',fullMotion);render();};
$('chat-open').onclick=openChat;$('ticker-open').onclick=openChat;$('chat-close').onclick=closeChat;$('chat-dialog').addEventListener('cancel',()=>{chatOpen=false;});
for(const b of document.querySelectorAll('[data-channel]'))b.onclick=()=>{channel=b.dataset.channel;renderChat();};
$('chat-replies').addEventListener('click',e=>{const button=e.target.closest('[data-reply]');if(!button||actionBusy)return;audio.unlock();reply(state,channel,button.dataset.reply);soundEffect('click');render();});
$('sound').onclick=()=>{sound=!sound;localStorage.setItem(settingsKey,sound?'sound':'mute');audio.unlock();audio.configure({sound,soundVolume:.5});soundEffect('click');render();};
$('help').onclick=()=>$('help-dialog').showModal();for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('restart').onclick=()=>$('restart-dialog').showModal();$('confirm-restart').onclick=newChapter;$('new-chapter').onclick=newChapter;
$('next-day').onclick=()=>{nextDay(state);$('day-dialog').close();$('capital-flow').textContent='昨日资金和聊天已继承';$('last-trade').textContent='新一天开始。先读消息，再决定仓位。';soundEffect('unlock');render();scrollTo({top:0,behavior:fullMotion?'smooth':'instant'});};
$('day-close').onclick=()=>$('day-dialog').close();$('day-review').onclick=()=>state.phase==='day_end'?showDayDialog():showDaySettlement();
document.addEventListener('visibilitychange',()=>audio.sync());window.addEventListener('pagehide',()=>audio.pause());
render();if(state.phase==='playing')playSegment();else if(state.phase==='day_end')showDayDialog();else if(state.phase==='bankrupt')showDaySettlement();
