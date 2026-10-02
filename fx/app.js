import {createGame, takeAction, advanceTick, finishSegment, nextDay, equity, unrealized, mood, currentEvent, useProp, mentalState, tradingProfit, reply, restoreGame, START, TARGET_PROFIT, BEATS_PER_DAY, settleDay, beginRest, finishCampaign, pendingStory, chooseStory, restrictions, DEBUFFS, repayFather} from './engine.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {GameAudio} from '../audio.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {GameMotion} from '../feedback.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {showSettlement} from '../settlement.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {STORIES} from './story-content.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {MOODS, PROPS} from './content.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {ChatPlayback,MessageChime} from './chat-playback.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {VoicePlayer,availableVoices} from './voice.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {FXTelemetry,capitalBucket,pnlBucket} from './telemetry.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {applyDeveloperPatch,developerValues} from './developer.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';
import {comicCaptions,approvedQuote} from './dialogue.js?v=82a207dddc89cc59d55628ea99b6c3bf74157539';

const $ = id => document.getElementById(id);
const yen = value => `${value<0?'−':''}¥${Math.abs(Math.round(value)).toLocaleString('zh-CN')}`;
const signed = value => `${value>0?'+':''}${yen(value)}`;
const saveKey = 'fx-girl-campaign-v3';
const settingsKey = 'fx-girl-settings';
const developerBackupKey='fx-girl-developer-backup-v3';
const fresh = () => createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
let chatRenderedList=[],chatRenderedChannel=null;
let state = restoreGame(localStorage.getItem(saveKey)||localStorage.getItem('fx-girl-campaign-v2')) || fresh();
let stake=.5, leverage=20, stop=.5, speed=1, skip=false, playing=false, actionBusy=false, channel='group', chatOpen=false, shownFlashTimer, toastTimer, propFrame;
let sound = localStorage.getItem(settingsKey)!=='mute';
let voiceEnabled=localStorage.getItem('fx-girl-voice')==='on';
let fullMotion=localStorage.getItem('fx-girl-motion')!=='reduce';
const telemetry=new FXTelemetry({enabled:localStorage.getItem('fx-girl-analytics')!=='off',testMode:!!state.developer?.edited,build:'fx-approved-dev'});
state.runId ||= crypto.randomUUID();let lastMood=null;
const bucket=n=>n<25?'0-24':n<50?'25-49':n<75?'50-74':'75-100';
function track(name,target,detail={},key){if(key)telemetry.emit(name,target,{detail,dedupeKey:state.runId+':'+key});else telemetry.action(name,target,detail);}
function trackExit(t){if(t)track('trade_close',t.type,{direction:t.direction===1?'long':'short',pnlBucket:pnlBucket(t.pnl),leverage:t.leverage},`exit:${state.day}:${state.history.length}`);}
const chime=new MessageChime();
const chatPlayback=new ChatPlayback({chat:state.chat,onUpdate:()=>{setText('unread',String(receivedCount()));if(chatOpen)renderChat();},onReceive:entry=>{chime.play(sound);track('message_receive',entry.channel,{channel:entry.channel,dialogueId:entry.message.dialogueId||'system'});}});
const audio = new GameAudio();
audio.configure({sound,soundVolume:.5});
const voice=new VoicePlayer({onUpdate:()=>render(),onPlay:line=>track('voice_play',line.id,{mood:mood(state),dialogueId:line.id}),onReject:line=>track('voice_rejected',line.id,{reason:'playback-unavailable',dialogueId:line.id})});
const motion = new GameMotion();motion.configure(fullMotion,true);document.body.classList.toggle('motion-full',fullMotion);
const moodInfo = MOODS;
const dayNames=['我就试一下','赚钱好像不难','今晚有大事','新的一天，新的借口'];
const dayTasks=['熟悉市场，活到收盘','辨认消息反转','在突发事件中守住计划','决定什么时候收手'];
const shouldAnimate=()=>motion.enabled&&fullMotion;
const quote=value=>value.toFixed(6);
function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));$('saved').textContent='✓';$('saved').title='进度已保存';}catch{$('saved').textContent='保存失败，请勿刷新';}}
function receivedCount(){return Math.min(9,Object.values(state.chat).reduce((n,list)=>n+chatPlayback.visible(list).length,0));}
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
  $('chart').innerHTML=parts.join('');$('chart').setAttribute('aria-label',`日元兑美元已发生行情，现价 ${quote(state.price)}，今天第 ${Math.min(state.beat+1,BEATS_PER_DAY)} 个决策点`);
}
function render(){
  const limit=restrictions(state);stake=Math.min(stake,limit.stake);leverage=Math.min(leverage,limit.leverage);
  const day=state.day,phase=state.phase,position=state.position,marketPlaying=phase==='playing',end=['day_end','resting','ending'].includes(phase),closing=phase==='closing';
  const account=equity(state),event=currentEvent(state),mental=mentalState(state),em=mood(state),info=moodInfo[em];
  chatPlayback.observe(state.chat);
  const dayNet=account-state.dayOpening-(state.externalFunding-state.dayOpeningFunding)+(state.expenses-state.dayOpeningExpenses);
  setText('stage-name',`第 ${day} 天 · ${dayNames[Math.min(day-1,3)]} / 第 ${Math.floor((day-1)/3)+1} 章`);
  setText('mission-title',`第 ${day} 天 · ${dayTasks[Math.min(day-1,3)]}`);
  setText('mission-copy',end?'窗外已经暗了。':`本日开盘 ${yen(state.dayOpening)} · ${Math.min(state.beat+1,BEATS_PER_DAY)} / ${BEATS_PER_DAY} 次决策`);
  setText('chapter-target',`交易净收益 ${signed(tradingProfit(state))} · 首章目标 +${yen(TARGET_PROFIT)}`);
  setText('emotion-label',info[0]);
  if($('portrait').dataset.mood!==em){$('portrait').src=`./fx/expressions/kurumi-${info[1]}.webp`;$('portrait').dataset.mood=em;$('portrait').alt=`久留美此刻${info[0]}的漫画表情`;}
  const voiced=voice.sync({enabled:voiceEnabled,emotion:em,speechId:state.speech?.id,run:state.runId});
  setText('speech',voiced?.zh||state.speech?.text||'');setText('voice-caption','');$('voice-caption').hidden=true;
  setText('voice-toggle','原声待听审');$('voice-toggle').disabled=true;$('voice-toggle').setAttribute('aria-pressed',String(voiceEnabled));$('voice-replay').hidden=!voiceEnabled||!availableVoices(em).length;

  setText('mental-detail',`累计回撤 ${Math.round(mental.totalDrawdown*100)}% · 近期回撤 ${Math.round(mental.recentDrawdown*100)}% · ${limit.noEntry?'不能新开仓':`新单最多 ${limit.leverage}× / ${Math.round(limit.stake*100)}%`}`);
  setText('sanity-text',`${Math.round(state.sanity)} / 100`);$('sanity-fill').style.width=state.sanity+'%';
  setText('price',quote(state.price));setText('inverse-rate',`1 日元 = ${quote(state.price)} 美元 · 1 美元 ≈ ${(1/state.price).toFixed(2)} 日元`);const base=state.candles.findLast(c=>c.day!==day)?.close||1/150;
  const change=(state.price/base-1)*100;setText('change',`${change>=0?'+':''}${change.toFixed(3)}%`);$('change').className=change>=0?'positive':'negative';
  setText('beat-label',end?'今日收盘':closing?'等待全平收盘':`决策 ${Math.min(state.beat+1,BEATS_PER_DAY)} / ${BEATS_PER_DAY}`);
  setText('candle-label',marketPlaying?`第 ${state.pending.candle+1} / 4 根 · 形成中`:closing||end?'本日 K 线已生成':'下一段：4 根 K 线');
  setText('market-phase',end?'休市':closing?'行情结束 · 请全平收盘':marketPlaying?'行情播放中 · 可以加速':'市场已暂停 · 等待决策');
  setText('news-source',event.source);setText('news-time',`${event.time} JST · 模拟快讯`);setText('news-title',event.title);setText('news-copy',event.copy);
  setText('equity',yen(account));setText('free-cash',yen(state.cash));setText('used-margin',yen(position?.margin||0));setText('reserve-amount',yen(state.reserve));setText('external-funding',yen(state.externalFunding));
  setText('day-pnl',signed(dayNet));$('day-pnl').className=dayNet>=0?'positive':'negative';
  $('order-empty').hidden=!!position||end||closing;$('position-card').hidden=!position;
  setText('stake-value',`${Math.round(stake*100)}%`);setText('leverage-value',`${leverage}×`);setText('stop-value',stop===1?'不预设':`保证金 ${Math.round(stop*100)}%`);
  setText('risk-amount',yen(state.cash*stake*stop));
  for(const [attr,value] of [['stake',stake],['leverage',leverage],['stop',stop]])for(const button of document.querySelectorAll(`[data-${attr}]`)){const selected=Number(button.dataset[attr])===value;button.setAttribute('aria-pressed',selected);button.disabled=phase!=='decision'||actionBusy;}
  for(const id of ['long','short','wait','hold','half','close'])$(id).disabled=phase!=='decision'||actionBusy;
  if(position){setText('position-side',position.direction===1?'↗ 日元多单':'↘ 日元空单');setText('entry-price',quote(position.entry));setText('current-price',quote(state.price));setText('floating',signed(unrealized(state)));$('floating').className=unrealized(state)>=0?'positive':'negative';setText('position-margin',`保证金 ${yen(position.margin)} / 占权益 ${currentRisk()}%`);setText('position-leverage',`${position.leverage}×`);setText('position-stop',position.stop===1?'无预设（可能强平）':`−${yen(position.margin*position.stop)}`);}
  renderTools();const limits=restrictions(state);
  for(const b of document.querySelectorAll('[data-leverage]'))b.disabled ||= Number(b.dataset.leverage)>limits.leverage;
  for(const b of document.querySelectorAll('[data-stake]'))b.disabled ||= Number(b.dataset.stake)>limits.stake;
  leverage=Math.min(leverage,limits.leverage);stake=Math.min(stake,limits.stake);
  if(limits.noEntry){$('long').disabled=true;$('short').disabled=true;}
  $('effect-list').replaceChildren();for(const effect of state.effects){const def=DEBUFFS[effect.id],row=document.createElement('p');row.textContent=`${def.name}${effect.remaining===null?'':` · 剩 ${effect.remaining} 段`}：${def.copy}`;$('effect-list').append(row);}
  if(state.cash<100){$('long').disabled=true;$('short').disabled=true;}
  setText('motion-toggle',fullMotion?'完整动效 · 开':'低动效 · 点此开启');$('motion-toggle').setAttribute('aria-pressed',String(fullMotion));
  setText('heat-label',`交易室 · ${['平稳','升温','升温','火热','沸腾','狂热'][state.heat]}`);$('heat-fill').style.width=`${state.heat*20}%`;document.body.dataset.heat=String(state.heat);
  $('skip').disabled=!marketPlaying;$('restart').disabled=marketPlaying||actionBusy;$('day-review').hidden=!['day_end','resting'].includes(phase);
  setText('playback-state',marketPlaying?'行情正在形成':closing?'今日行情结束，等待你全平收盘':end?'今日休市':'等待下一笔操作');
  $('settle-day').hidden=!closing;$('settle-day').disabled=actionBusy;
  $('rest-panel').hidden=phase!=='resting';
  $('finish-rest').disabled=!!pendingStory(state);
  $('retire').hidden=!['day_end','resting'].includes(phase);
  $('sound').textContent=sound?'♪ 音效开':'♪ 音效关';$('sound').setAttribute('aria-pressed',String(sound));
  const latest=chatPlayback.visible(state.chat[channel]).at(-1);if(latest)setText('ticker-text',`${latest.from}：${latest.text}`);else setText('ticker-text','暂无新消息');
  setText('unread',String(receivedCount()));
  $('developer-status').hidden=!state.developer?.edited;$('developer-open').disabled=marketPlaying||actionBusy;
  setText('privacy-toggle',state.developer?.edited?'测试存档 · 不统计':telemetry.dnt?'浏览器已禁用统计':telemetry.enabled?'匿名统计 · 开':'匿名统计 · 关');$('privacy-toggle').disabled=telemetry.dnt||!!state.developer?.edited;
  telemetry.view({screen:$('story-dialog').open?'story':chatOpen?'chat':phase==='playing'?'market':phase==='closing'?'closing':phase==='resting'?'resting':phase==='ending'?'ending':end?'day_end':'trading',run:state.runId,day});
  if(lastMood!==em){track('mood_change',em,{mood:em,previousMood:lastMood||'none',sanityBucket:bucket(state.sanity)});lastMood=em;}
  track('news_seen',event.id,{newsId:event.id,day,beat:state.beat},`news:${day}:${state.beat}:${event.id}`);
  track('day_start','day',{day},`day-start:${day}`);
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
  if(result.flash){flash(result.flash);if(result.flash.swan)track('black_swan',result.flash.id,{newsId:result.flash.id,day:state.day,beat:result.flash.beat},`swan:${state.day}:${result.flash.id}`);}
  trackExit(result.exit);
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
      if(skip){let lastFlash=null,lastExit=null;for(const result of finishSegment(state)){trackExit(result.exit);if(result.flash?.swan)track('black_swan',result.flash.id,{newsId:result.flash.id},`swan:${state.day}:${result.flash.id}`);if(result.flash)lastFlash=result.flash;if(result.exit)lastExit=result.exit;}if(lastFlash)flash(lastFlash);render();if(lastExit)toast(`已${lastExit.type==='liquidation'?'强平':'止损'} · ${signed(lastExit.pnl)}`,lastExit.pnl>=0?'gain':'loss');break;}
      const result=advanceTick(state);afterTick(result);
      if(state.phase==='playing')await delay(360/speed);
    }
  }finally{playing=false;skip=false;render();}
    if(state.phase==='closing')track('market_end','day',{day:state.day},`market-end:${state.day}`);
  continueScenes();

}
async function sendAction(type){
  if(state.phase!=='decision'||actionBusy)return;
  actionBusy=true;audio.unlock();render();
  const button=$(type),buttonRect=button.getBoundingClientRect(),positionRect=$('position-card').getBoundingClientRect();
  $('restart').disabled=true;for(const b of document.querySelectorAll('[data-prop]'))b.disabled=true;
  motion.animate(button,[{transform:'scale(1)'},{transform:'scale(.9) rotate(-2deg)'},{transform:'scale(1.06) rotate(1deg)'},{transform:'none'}],{duration:210});
  soundEffect('click',{rate:1+state.heat*.1});
  try{
    if(shouldAnimate())await delay(150);
    track('trade_attempt',type,{direction:type==='short'?'short':'long',stake:stake*100,leverage,stop:stop*100,equityBucket:capitalBucket(equity(state))});
    const result=takeAction(state,{type,stake,leverage,stop});if(result.trade?.type==='open')track('trade_open',type,{direction:type==='long'?'long':'short',stake:stake*100,leverage,stop:stop*100});else trackExit(result.trade);render();
    if(type==='long'||type==='short'){
      const amount=result.trade.margin,label=type==='long'?'做多':'做空';
      setText('capital-flow',`${type==='long'?'多单':'空单'} · 保证金 ${yen(amount)}`);
      fly(`${label} ${yen(amount)}`,buttonRect,$('position-card'));impact(label,`${leverage}× · ${yen(amount)}`);
    }else if(result.trade){
      setText('capital-flow',`${yen(result.trade.margin)} 保证金释放 · ${signed(result.trade.pnl)} 已入账`);
      fly(`${type==='half'?'平仓一半':'全部平仓'} ${signed(result.trade.pnl)}`,positionRect,$('free-cash'));
      impact(type==='half'?'平仓一半':'全部平仓',signed(result.trade.pnl),result.trade.pnl>=0?'gain':'loss');
    }else if(type==='hold'){impact('继续持有',signed(unrealized(state)),'hold');}
    else toast('空仓');
    if(shouldAnimate())await delay(320);
    actionBusy=false;playSegment();
  }catch(error){actionBusy=false;track('trade_rejected',type,{reason:'unavailable'});toast(error.message,'loss');render();}
}
function buildReceipt(report){const labels={half:'减半平仓',close:'全部平仓',stop:'触发止损',liquidation:'强制平仓',closing:'收盘平仓',yasuko:'安子提醒平仓'};
  return{opening:report.opening,closing:report.closing,tradingNet:report.net,funding:report.funding,closingLabel:'21:30 JST / TOKYO TRADING DIARY',rows:report.trades.filter(t=>Number.isFinite(t.pnl)).map(t=>({label:`第 ${t.beat+1} 段 · 日元${t.direction===1?'多':'空'}单 · ${labels[t.type]||'交易'}`,amount:t.pnl,formula:`${yen(t.margin)} 保证金 · ${t.leverage}× · ${quote(t.entry)} → ${quote(t.exit)}`})).concat(report.funding?[{label:report.funding>0?'父亲的柜中存款 · 借入':'主动归还父亲的存款',amount:report.funding,formula:'借款变动，单独记账'}]:[]).concat(report.costs?[{label:'便利店与日常物品',amount:-report.costs,formula:'日常开销'}]:[])};}
function showDaySettlement(){if(document.querySelector('.settlement-dialog')||$('day-dialog').open||$('bankrupt-dialog').open)return;
  const report=buildReceipt(state.dayReport);
  showSettlement(report,{audio,motion,intro:'今天的账，记在这里。',onDone:showDayDialog,onSkip:()=>{}});
}
function showDayDialog(){const r=state.dayReport,peak=r.peak;
  setText('day-title',r.net>=0?'今天就到这里。':'先关掉屏幕。');
  setText('day-subtitle',`第 ${r.day} 天 · 东京的夜晚`);
  setText('comic-first',r.openingLine||'');
  setText('comic-second',peak?`${peak.type==='liquidation'?'强平':peak.type==='stop'?'止损':peak.type==='half'?'减半':'平仓'}一笔 ${signed(peak.pnl)}。当时久留美的表情：${moodInfo[r.mood]?.[0]||'平静'}。`:'四段行情走完，账户里没有一笔真正成交。');
  setText('comic-third',r.closingLine||'');
  const big=Math.max(10000,r.opening*.2),homage=r.net>=big?'big-win':r.net<=-big?'big-loss':r.day===1?'first-day':null;
  const dayMood=r.net>=big?'ecstatic':r.net<=-big?'despair':r.mood;
  $('comic-reaction').src=`./fx/expressions/kurumi-${moodInfo[dayMood]?.[1]||'calm'}.webp`;$('comic-reaction').alt='收盘后的'+(moodInfo[dayMood]?.[0]||'平静')+'表情';
  $('homage-panel').hidden=!homage;if(homage){$('homage-image').src=`./fx/homage/demk-${homage}.webp`;$('homage-image').alt=homage==='big-win'?'原作久留美确认利润单格':homage==='big-loss'?'原作久留美亏损惊慌单格':'原作久留美平仓后仍在发抖的单格';$('homage-source').href=homage==='big-loss'?'http://demk.net/1.html':'http://demk.net/3.html';setText('homage-caption',homage==='first-day'?'首日致敬：平仓以后手还在抖。原作此格的具体交易日未核定。':homage==='big-win'?'爆赚致敬：原作久留美确认利润的单格。':'爆亏致敬：原作久留美看着亏损的单格。');}

  setText('day-total',yen(r.closing));setText('day-net',`今日交易 ${signed(r.net)} · 交易累计 ${signed(tradingProfit(state))}`);
  setText('next-day',state.phase==='resting'?'回到休息':'休市后休息');$('day-dialog').showModal();}
function newChapter(){localStorage.removeItem(saveKey);state=fresh();telemetry.setTestMode(false);chatPlayback.reset(state.chat);voice.stop();state.runId=crypto.randomUUID();lastMood=null;stake=.5;leverage=20;stop=.5;skip=false;playing=false;for(const d of document.querySelectorAll('dialog[open]'))d.close();$('capital-flow').textContent='';$('last-trade').textContent='';render();scrollTo({top:0,behavior:fullMotion?'smooth':'instant'});}
function showProp(id,confirmed=false){
  if(actionBusy||!['decision','day_end','resting'].includes(state.phase))return;
  if(id==='father'&&!confirmed){$('father-take-dialog').showModal();return;}
  audio.unlock();let result;
  try{result=useProp(state,id);}catch(error){toast(error.message,'loss');return;}
  track('item_used',id,{itemId:id,mood:mood(state),equityBucket:capitalBucket(equity(state))});trackExit(result.trade);for(const e of state.effects)track('debuff_applied',e.id,{debuffId:e.id,itemId:id,duration:e.remaining||0},`effect:${state.day}:${state.beat}:${id}:${e.id}`);
  const spec=PROPS[id];render();setText('prop-title',spec.name);setText('prop-line',result.line?`${spec.speaker}：${id==='father'?(approvedQuote('V2-E03-05',state)?.text||'')+' '+result.line:result.line}`:'');setText('prop-rule',spec.copy);
  $('prop-dialog').dataset.kind=id;$('prop-dialog').showModal();
  const amount=result.amount||0,started=performance.now(),duration=shouldAnimate()?1500:0;
  if(amount){
    let soundStep=-1;
    const count=now=>{const progress=duration?Math.min(1,(now-started)/duration):1,ease=1-Math.pow(1-progress,3);setText('prop-amount',`+${yen(amount*ease)}`);
      const step=Math.floor(progress*7);if(step!==soundStep){soundStep=step;soundEffect('gain',{rate:Math.min(1.8,.85+step*.12),level:.6});}
      if(progress<1&&$('prop-dialog').open)propFrame=requestAnimationFrame(count);else if(progress===1)soundEffect('win',{rate:1.35});};
    propFrame=requestAnimationFrame(count);
    setText('capital-flow',`${yen(amount)} · 父亲的柜中存款`);
  }else{
    setText('prop-amount',result.trade?signed(result.trade.pnl):result.cost?`−${yen(result.cost)}`:spec.caption);soundEffect(id==='mochiko'?'defend':'exhaust',{rate:1.1});
    if(result.trade)setText('capital-flow',`${yen(result.trade.margin)} 保证金释放 · ${signed(result.trade.pnl)} 入账`);
  }
  motion.animate($('prop-dialog'),[{opacity:0,transform:'translateY(30px) scale(.85) rotate(-3deg)'},{opacity:1,transform:'translateY(0) scale(1.03) rotate(1deg)'},{opacity:1,transform:'none'}],{duration:600});
  motion.animate(document.querySelector('.prop-envelope'),[{transform:'rotate(-12deg) scale(.6)'},{transform:'rotate(8deg) scale(1.12)'},{transform:'rotate(-5deg) scale(1)'}],{duration:800});
}
function renderChat(){const list=chatPlayback.visible(state.chat[channel]);const box=$('chat-messages');const changed=chatRenderedChannel!==channel||list.length!==chatRenderedList.length||list.some((m,i)=>m!==chatRenderedList[i]);
  if(changed){box.replaceChildren();
  for(const message of list){const row=document.createElement('div');row.className=`message ${message.kind==='self'?'self':''} ${chatRenderedChannel===channel&&!chatRenderedList.includes(message)?'message-new':''}`;const who=document.createElement('b'),text=document.createElement('p');who.textContent=message.from;text.textContent=message.text;row.append(who,text);box.append(row);}
  box.scrollTop=box.scrollHeight;chatRenderedChannel=channel;chatRenderedList=[...list];}
  const typing=chatPlayback.typing;setText('typing-status',typing&&typing.channel===channel?(channel==='friend'?'对方正在打字…':typing.from+'正在打字…'):'');
  for(const button of document.querySelectorAll('[data-channel]'))button.setAttribute('aria-selected',String(button.dataset.channel===channel));
  const choices=channel==='group'?[['ask','说说走势'],...(state.position?.direction===1?[['stance','说出做多打算']]:[]),...(tradingProfit(state)>0?[['share','分享盈利']]:[]),['meme','说说回本的念头']]:channel==='campus'?[]:[...(state.position?[['disclose_position','告知当前持仓']]:[]),...(tradingProfit(state)>0||unrealized(state)>0?[['disclose_greed','说出还想赚更多']]:[]),...(state.family.outstanding>0?[['disclose_debt','告知父亲欠款']]:[])];
  $('chat-replies').replaceChildren();for(const [choice,label] of choices){const b=document.createElement('button');b.textContent=label;b.dataset.reply=choice;b.disabled=!['decision','closing','day_end','resting'].includes(state.phase)||actionBusy||chatPlayback.busy(channel);$('chat-replies').append(b);}
  setText('group-count',String(chatPlayback.visible(state.chat.group).length));setText('friend-count',String(chatPlayback.visible(state.chat.friend).length));setText('campus-count',String(chatPlayback.visible(state.chat.campus).length));}
function openChat(){chime.unlock();audio.unlock();chatOpen=true;telemetry.view({screen:'chat',run:state.runId,day:state.day});renderChat();$('chat-dialog').showModal();}
function closeChat(){chatOpen=false;$('chat-dialog').close();render();continueScenes();}

for(const b of document.querySelectorAll('[data-stake],[data-leverage],[data-stop]'))b.addEventListener('click',()=>{if(b.dataset.stake)stake=Number(b.dataset.stake);if(b.dataset.leverage)leverage=Number(b.dataset.leverage);if(b.dataset.stop)stop=Number(b.dataset.stop);render();});
for(const type of ['long','short','wait','hold','half','close'])$(type).addEventListener('click',()=>sendAction(type));
for(const b of document.querySelectorAll('[data-speed]'))b.addEventListener('click',()=>{speed=Number(b.dataset.speed);for(const option of document.querySelectorAll('[data-speed]'))option.setAttribute('aria-pressed',String(option===b));});
$('skip').addEventListener('click',()=>{if(state.phase==='playing')skip=true;});
$('tool-list').addEventListener('click',e=>{const b=e.target.closest('[data-prop]');if(b)showProp(b.dataset.prop);});
$('prop-done').onclick=()=>{cancelAnimationFrame(propFrame);$('prop-dialog').close();continueScenes();};
$('prop-dialog').addEventListener('cancel',()=>{cancelAnimationFrame(propFrame);requestAnimationFrame(continueScenes);});
$('motion-toggle').onclick=()=>{fullMotion=!fullMotion;localStorage.setItem('fx-girl-motion',fullMotion?'full':'reduce');motion.configure(fullMotion,true);document.body.classList.toggle('motion-full',fullMotion);render();};
$('chat-open').onclick=openChat;$('ticker-open').onclick=openChat;$('chat-close').onclick=closeChat;$('chat-dialog').addEventListener('cancel',()=>{chatOpen=false;requestAnimationFrame(()=>{render();continueScenes();});});
for(const b of document.querySelectorAll('[data-channel]'))b.onclick=()=>{channel=b.dataset.channel;renderChat();};
$('chat-replies').addEventListener('click',e=>{const button=e.target.closest('[data-reply]');if(!button||actionBusy||button.disabled||chatPlayback.busy(channel))return;audio.unlock();chime.unlock();const lines=reply(state,channel,button.dataset.reply);track('dialogue_turn',channel,{channel,dialogueId:lines[0]?.dialogueId||'unknown',mood:mood(state)});soundEffect('click');chatPlayback.observe(state.chat);render();});
$('sound').onclick=()=>{sound=!sound;localStorage.setItem(settingsKey,sound?'sound':'mute');audio.unlock();audio.configure({sound,soundVolume:.5});soundEffect('click');render();};
$('help').onclick=()=>$('help-dialog').showModal();for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('restart').onclick=()=>$('restart-dialog').showModal();$('confirm-restart').onclick=newChapter;$('new-chapter').onclick=newChapter;
$('next-day').onclick=()=>{if(state.phase==='resting'){$('day-dialog').close();render();return;}beginRest(state);track('rest_start','night',{day:state.day},`rest:${state.day}`);$('day-dialog').close();render();continueScenes();};
$('finish-rest').onclick=()=>{try{track('rest_end','night',{day:state.day},`rest-end:${state.day}`);nextDay(state);render();continueScenes();scrollTo({top:0,behavior:fullMotion?'smooth':'instant'});}catch(error){toast(error.message);}};
$('settle-day').onclick=()=>{try{audio.unlock();settleDay(state);track('settlement_confirm','close',{day:state.day},`settle:${state.day}`);trackExit(state.dayReport.trades.at(-1));track('day_end','day',{mood:mood(state),equityBucket:capitalBucket(equity(state)),pnlBucket:pnlBucket(state.dayReport.net)},`day-end:${state.day}`);render();showDaySettlement();}catch(error){toast(error.message);}};
$('retire').onclick=()=>{try{finishCampaign(state,'walkaway');render();continueScenes();}catch(error){toast(error.message);}};
$('ending-restart').onclick=newChapter;
$('day-close').onclick=()=>$('day-dialog').close();$('day-review').onclick=()=>showDayDialog();
document.addEventListener('visibilitychange',()=>{audio.sync();if(document.hidden)voice.stop();});window.addEventListener('pagehide',()=>{audio.pause();voice.stop();});
function replaceDeveloperState(next){
  state=next;state.runId=crypto.randomUUID();telemetry.setTestMode(!!state.developer?.edited);chatPlayback.reset(state.chat);voice.stop();lastMood=null;playing=false;actionBusy=false;skip=false;chatOpen=false;
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  $('capital-flow').textContent='';$('last-trade').textContent='';render();continueScenes();
}
function openDeveloper(){
  const values=developerValues(state);for(const [key,value] of Object.entries(values))$('dev-'+key).value=value;
  $('dev-auto-sanity').checked=state.developer?.edited&&state.developer.sanityOverride===null;
  $('dev-sanity').disabled=$('dev-auto-sanity').checked;
  $('developer-restore').disabled=!localStorage.getItem(developerBackupKey);
  setText('developer-error',state.position?'请先平仓并等行情暂停，再应用数据。':'');$('developer-dialog').showModal();
}
$('developer-open').onclick=openDeveloper;$('ending-developer').onclick=openDeveloper;
$('dev-auto-sanity').onchange=()=>{$('dev-sanity').disabled=$('dev-auto-sanity').checked;};
$('developer-form').onsubmit=e=>{
  e.preventDefault();try{
    if(actionBusy||playing)throw Error('请等行情暂停');
    const patch={};for(const key of ['cash','reserve','profit','debt','day','beat','price','stress','sanity'])patch[key]=Number($('dev-'+key).value);
    if($('dev-auto-sanity').checked)patch.sanity=null;patch.phase=$('dev-phase').value;
    const next=applyDeveloperPatch(state,patch);
    if(!state.developer?.edited)localStorage.setItem(developerBackupKey,JSON.stringify(state));
    replaceDeveloperState(next);toast('开发测试数据已应用，原存档可恢复');
  }catch(error){setText('developer-error',error.message);}
};
$('developer-restore').onclick=()=>{try{const original=restoreGame(localStorage.getItem(developerBackupKey));if(!original)throw Error('没有有效的修改前存档');replaceDeveloperState(original);toast('已恢复修改前存档');}catch(error){setText('developer-error',error.message);}};
render();if(state.phase==='playing')playSegment();else continueScenes();

function renderTools(){
 const box=$('tool-list');box.replaceChildren();for(const [id,spec] of Object.entries(PROPS)){const b=document.createElement('button');b.id=id;b.dataset.prop=id;const title=document.createElement('b'),small=document.createElement('small');title.textContent=spec.name;small.textContent=id==='father'&&!state.family.unlocked?'柜门锁着':spec.caption;b.append(title,small);b.disabled=actionBusy||(id==='father'?state.fatherUsed||!state.family.unlocked||!['decision','day_end','resting'].includes(state.phase):state.phase!=='decision'||state.itemsUsed[id]||state.skills[id]||(id==='receipt'&&(!state.position||unrealized(state)<=0))||state.cash<(spec.cost||0));box.append(b);}
 $('family-panel').hidden=!state.fatherUsed;setText('family-debt',`还欠父亲 ${yen(state.family.outstanding)} · 已归还 ${yen(state.family.repaid)}`);$('repay-open').disabled=!['decision','day_end','resting'].includes(state.phase)||state.family.outstanding<=0||state.cash<=0;
 $('bankrupt-rescue').hidden=!state.family.unlocked||state.fatherUsed;
}
function continueScenes(){if(['playing','closing'].includes(state.phase)||document.querySelector('dialog[open]')||document.querySelector('.settlement-dialog'))return;const event=pendingStory(state);if(event){showStory(event);return;}if(state.phase==='day_end')showDaySettlement();else if(state.phase==='ending')showEnding();else telemetry.view({screen:state.phase==='resting'?'resting':'trading',run:state.runId,day:state.day});}
function showCaptions(id,lines){$(id).replaceChildren();lines.forEach((line,i)=>{const p=document.createElement('p');if(line)p.textContent=`${i+1} / ${line}`;$(id).append(p);});}
function showStory(event){telemetry.view({screen:'story',run:state.runId,day:state.day});track('story_seen',event.id,{storyId:event.id,mood:mood(state)},`story:${event.id}`);setText('story-title',event.title);const comic=['fatherUnlock','fatherFound','repayPartial','repayFull'].includes(event.key)?'event-father':['threshold75','threshold50','friendWalk','friendStudy'].includes(event.key)?'event-friend':null;$('story-comic-frame').hidden=!comic;const stage='';$('story-comic-frame').className='story-comic-frame '+stage;if(comic){$('story-comic').src=`./fx/comics/${comic}.webp`;$('story-comic').alt=event.title+'的原创漫画'+(stage?'，仅显示已经发生的情节':'');}for(const [selector,visible] of [['.cover-two',state.fatherUsed],['.cover-three',state.family.discovered],['.cover-four',!!state.family.lastRepayment]])document.querySelector(selector).style.display=comic==='event-father'&&!visible?'block':'none';showCaptions('story-captions',comicCaptions(comic==='event-father'?'father':'friend',state));$('story-lines').replaceChildren();for(const [from,text] of event.lines){const p=document.createElement('p');p.textContent=`${from}：${text}`;$('story-lines').append(p);}const box=$('story-choices');box.replaceChildren();for(const choice of event.choices){const b=document.createElement('button');b.textContent=choice.label;b.dataset.storyChoice=choice.id;box.append(b);}$('story-dialog').showModal();}
$('story-dialog').addEventListener('cancel',e=>e.preventDefault());
$('story-choices').addEventListener('click',e=>{if(e.target.closest('[data-story-continue]')){$('story-dialog').close();render();continueScenes();return;}const b=e.target.closest('[data-story-choice]');if(!b)return;const result=chooseStory(state,b.dataset.storyChoice);track('story_choice',result.event.id,{storyId:result.event.id,choiceId:result.choice.id});if(result.event.key==='fatherUnlock')track('item_unlocked','father',{itemId:'father',storyId:result.event.id});setText('story-title',result.event.title);$('story-lines').replaceChildren();for(const [from,text] of result.choice.lines){const p=document.createElement('p');p.textContent=`${from}：${text}`;$('story-lines').append(p);}const done=document.createElement('button');done.textContent='继续';done.dataset.storyContinue='true';$('story-choices').replaceChildren(done);render();});
$('privacy-toggle').onclick=()=>{const next=!telemetry.enabled;localStorage.setItem('fx-girl-analytics',next?'on':'off');telemetry.setEnabled(next);render();};
$('repay-open').onclick=()=>{const max=Math.floor(Math.min(state.cash,state.family.outstanding));$('repay-amount').max=max;$('repay-amount').value=Math.min(max,10000);setText('repay-limit',`可用资金 ${yen(state.cash)} · 欠款 ${yen(state.family.outstanding)}`);$('repay-dialog').showModal();};
$('repay-all').onclick=()=>{$('repay-amount').value=Math.floor(Math.min(state.cash,state.family.outstanding));};
$('repay-confirm').onclick=()=>{try{const r=repayFather(state,Number($('repay-amount').value));track('story_choice','repay',{storyId:r.full?'repayFull':'repayPartial',choiceId:'repay',equityBucket:capitalBucket(equity(state))});$('repay-dialog').close();toast(`归还 ${yen(r.amount)}`);render();continueScenes();}catch(e){setText('repay-limit',e.message);}};
$('bankrupt-rescue').onclick=()=>{$('bankrupt-dialog').close();showProp('father');};
$('journal-open').onclick=()=>{$('journal-lines').replaceChildren();for(const entry of state.story.log){const p=document.createElement('p');const event=STORIES[entry.id],choice=event?.choices.find(c=>c.id===entry.choice);p.textContent=`第 ${entry.day} 天 · ${event?.title||'今天的事'}：${choice?.label||''}`;$('journal-lines').append(p);}if(!state.story.log.length)setText('journal-lines','今天还没有写进日记的事。');$('journal-dialog').showModal();};

$('voice-toggle').onclick=()=>{voiceEnabled=!voiceEnabled;localStorage.setItem('fx-girl-voice',voiceEnabled?'on':'off');if(voiceEnabled){voice.lastMood=null;render();}else{voice.stop();render();}};
$('father-take-confirm').onclick=()=>{$('father-take-dialog').close();showProp('father',true);};
$('voice-replay').onclick=()=>{void voice.play(mood(state),state.speech?.id);};

function showEnding(){const e=state.ending;track('ending_seen',e.id,{kind:e.id,equityBucket:capitalBucket(e.equity),sanityBucket:bucket(e.sanity)},`ending:${e.id}`);const names={million:'两千万回来了',walkaway:'主动离场',broke:'账户退场',crisis:'最后的坠落'};setText('ending-title',names[e.id]);setText('ending-summary',`第 ${e.day} 天 · 账户 ${yen(e.equity)} · 承受力 ${e.sanity}/100`);$('ending-comic').src=`./fx/comics/ending-${e.id}.webp`;$('ending-comic').alt=names[e.id]+'的原创四格漫画';showCaptions('ending-captions',comicCaptions(e.id,state));const before=approvedQuote('Q16',state);setText('ending-before',e.id==='crisis'?before?.text||'':'');$('ending-dialog').showModal();}
