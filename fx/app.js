import {ACHIEVEMENTS,evaluateAchievements,createAchievementToast,renderAchievementBook} from './achievements.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {buildFXReceipt} from './statement.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {createShareCard} from './share-card.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {buildShareFile,canShareFile,shareReportFile} from './share-export.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {createGameStorage} from './storage.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {PROP_LINES} from './copy/items.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {UI_COPY} from './copy/ui.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {TRANSITION_COPY} from './copy/transitions.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {FXLeaderboard,completedLeaderboardScore} from './leaderboard.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {setImage} from './assets.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {itemUnlocked,itemDiscovered} from './item-events.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {createGame, takeAction, advanceTick, nextDay, equity, unrealized, mood, currentEvent, useProp, mentalState, tradingProfit, restoreGame, START, TARGET_PROFIT, settleDay, beginRest, finishCampaign, pendingStory, chooseStory, restrictions, DEBUFFS, repayFather,beatsPerDay,nearStopOrders,topUpMargin,rescueClose,borrowNetwork,repayNetwork,debtSummary,positionsOf,positionUnrealized,accountMetrics,orderPreview} from './engine.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {GameAudio} from '../audio.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {GameMotion} from '../feedback.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {showSettlement} from '../settlement.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {MOODS, PROPS} from './content.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {VoicePlayer,availableVoices,VOICE_LINES} from './voice.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {mountVoiceLibrary} from './voice-library.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {FXTelemetry,capitalBucket,pnlBucket} from './telemetry.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {applyDeveloperPatch,developerValues} from './developer.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';
import {comicCaptions,approvedQuote} from './dialogue.js?v=0a987596a9518be16b4b4d2a6e109b9f8fa9c505';

const $ = id => document.getElementById(id);
const storage=createGameStorage();
const yen = value => `${value<0?'−':''}¥${Math.abs(value).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
const signed = value => `${value>0?'+':''}${yen(value)}`;
const saveKey = 'fx-girl-campaign-v3';
const settingsKey = 'fx-girl-settings';
const developerBackupKey='fx-girl-developer-backup-v3';
const fresh = () => createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
let state = restoreGame(storage.getItem(saveKey)||storage.getItem('fx-girl-campaign-v2')) || fresh();
let orderFormOpen=!positionsOf(state).length;
let orderMode='percent',orderAmount=10000, shareUrl=null,shareFile=null,shareBusy=false,shareRequest=0;
const achievementKey='fx-jiuliumei-achievements-v1';
let achievementProfile;try{achievementProfile=JSON.parse(storage.getItem(achievementKey)||'{}');}catch{achievementProfile={};}
let stake=.5, leverage=20, stop=.5, speed=1, skip=false, playing=false, actionBusy=false,  shownFlashTimer, toastTimer, propFrame;
let sound = storage.getItem(settingsKey)!=='mute';
let voiceEnabled=storage.getItem('fx-girl-voice')!=='off';
let fullMotion=storage.getItem('fx-girl-motion')!=='reduce';
const telemetry=new FXTelemetry({enabled:storage.getItem('fx-girl-analytics')!=='off',testMode:!!state.developer?.edited,build:'fx-runtime-polish-v6'});
const leaderboard=new FXLeaderboard();
state.runId ||= crypto.randomUUID();let lastMood=null;
const bucket=n=>n<25?'0-24':n<50?'25-49':n<75?'50-74':'75-100';
function track(name,target,detail={},key){if(key)telemetry.emit(name,target,{detail,dedupeKey:state.runId+':'+key});else telemetry.action(name,target,detail);}
function trackExit(t){if(t)track('trade_close',t.type,{direction:t.direction===1?'long':'short',pnlBucket:pnlBucket(t.pnl),leverage:t.leverage},`exit:${state.day}:${t.positionId||t.id||'legacy'}:${t.type}:${t.margin}:${t.pnl}`);}
const audio = new GameAudio();
audio.configure({sound,soundVolume:.5});
const voice=new VoicePlayer({onUpdate:()=>render(),onPlay:line=>track('voice_play',line.id,{mood:mood(state),dialogueId:line.id}),onReject:line=>track('voice_rejected',line.id,{reason:'playback-unavailable',dialogueId:line.id})});
const motion = new GameMotion();motion.configure(fullMotion,true);document.body.classList.toggle('motion-full',fullMotion);
const moodInfo = MOODS;
const dayNames=['我就试一下','赚钱好像不难','今晚有大事','新的一天，新的借口'];
const dayTasks=['熟悉市场，活到收盘','辨认消息反转','在突发事件中守住计划','决定什么时候收手'];
const shouldAnimate=()=>motion.enabled&&fullMotion;
const quote=value=>value.toFixed(6);
function persist(){const saved=storage.setItem(saveKey,JSON.stringify(state));$('saved').textContent=saved?'✓':'进度仅在本页';$('saved').title=saved?'进度已保存':'浏览器无法保存进度，刷新或关闭后会丢失';$('storage-warning').hidden=saved;}
function currentRisk(){return Math.round(accountMetrics(state).usedMargin/Math.max(accountMetrics(state).tradingEquity,1)*100);}
function selectedOrder(type='long'){return {type,leverage,stop,...(orderMode==='amount'?{amount:orderAmount}:{stake})};}
function setText(id,value){if($(id))$(id).textContent=value;}
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
  $('chart').innerHTML=parts.join('');$('chart').setAttribute('aria-label',`日元兑美元已发生行情，现价 ${quote(state.price)}，今天第 ${Math.min(state.beat+1,beatsPerDay(state))} 个决策点`);
}
function renderPositions(orders,enabled){
  const box=$('position-list');box.replaceChildren();
  for(const p of orders){
    const row=document.createElement('article');row.className='order-row';
    const head=document.createElement('div');head.className='order-row-head';
    const title=document.createElement('b'),tag=document.createElement('span');
    title.textContent=`#${p.id} · ${p.direction===1?'↗ 日元多单':'↘ 日元空单'}`;tag.textContent=`${Number(p.leverage.toFixed(1))}×`;head.append(title,tag);row.append(head);
    const net=positionUnrealized(state,p),notional=p.notional??p.margin*p.leverage,closeFee=notional*.00005;
    const data=[['开仓 → 当前',`${quote(p.entry)} → ${quote(state.price)}`],['保证金 / 名义仓位',`${yen(p.margin)} / ${yen(notional)}`],['浮动盈亏（未扣平仓费）',signed(net)],['已付开仓 / 预计平仓费',`${yen(p.openFee||0)} / ${yen(closeFee)}`],['本笔止损',p.stop===1?'不预设':`−${yen(p.margin*p.stop)}`]];
    for(const [label,value] of data){const line=document.createElement('div');line.className='order-row-data';const key=document.createElement('span'),val=document.createElement('b');key.textContent=label;val.textContent=value;if(label.startsWith('浮动盈亏'))val.className=net>=0?'positive':'negative';line.append(key,val);row.append(line);}
    const actions=document.createElement('div');actions.className='order-row-actions';for(const [action,label] of [['half','本单减半'],['close','本单平仓']]){const b=document.createElement('button');b.dataset.positionId=p.id;b.dataset.positionAction=action;b.textContent=label;b.disabled=!enabled;actions.append(b);}row.append(actions);if(p.stop<1){const bar=document.createElement('div');bar.className='stop-progress';const fill=document.createElement('i'),progress=Math.max(0,-net/(p.margin*p.stop));fill.style.width=Math.min(100,progress*100)+'%';bar.classList.toggle('danger',progress>=.75);bar.setAttribute('aria-label','止损进度 '+Math.round(progress*100)+'%');bar.append(fill);row.append(bar);}box.append(row);
  }
}
function checkAchievements(){
  const result=evaluateAchievements(state,achievementProfile);achievementProfile=result.profile;
  if(result.newlyUnlocked.length){try{storage.setItem(achievementKey,JSON.stringify(achievementProfile));}catch{}for(const def of result.newlyUnlocked){createAchievementToast(def);if(sound)soundEffect('gain',{level:.3});}}
  setText('achievement-count',String(Object.keys(achievementProfile.unlocked||{}).length));
  if($('achievements-dialog').open)renderAchievementBook($('achievement-book'),achievementProfile,state);
}
function openAchievements(){renderAchievementBook($('achievement-book'),achievementProfile,state);$('achievements-dialog').showModal();}
async function openShare(){
  if(state.phase==='playing'||actionBusy)return;
  const request=++shareRequest;const dialog=$('share-dialog');if(!dialog.open)dialog.showModal();
  shareFile=null;$('share-preview').hidden=true;$('share-actions').hidden=true;$('share-native').hidden=true;setText('share-status','正在制作战报…');
  const snapshot=structuredClone(state),em=mood(snapshot);
  try{
    const card=await createShareCard(snapshot,{equity:equity(snapshot),tradingProfit:tradingProfit(snapshot),unrealized:unrealized(snapshot),moodLabel:moodInfo[em]?.[0]||'平静',portraitUrl:$('portrait').src,gameUrl:location.href.split('#')[0],achievementCount:Object.keys(achievementProfile.unlocked||{}).length,report:snapshot.dayReport});
    if(request!==shareRequest){URL.revokeObjectURL(card.url);return;}if(shareUrl)URL.revokeObjectURL(shareUrl);shareUrl=card.url;
    shareFile=buildShareFile(card);$('share-preview').src=shareUrl;$('share-preview').hidden=false;$('share-download').href=shareUrl;$('share-download').download=card.filename||`FX韭留美-第${snapshot.day}天.png`;$('share-original').href=shareUrl;$('share-actions').hidden=false;$('share-native').hidden=!canShareFile(shareFile);$('share-native').disabled=shareBusy;setText('share-status',snapshot.developer?.edited?'开发测试战报 · 不计入成就':'战报已生成，可保存原图');
  }catch(error){setText('share-status','战报生成失败：'+error.message);}
}
function render(){
  const limit=restrictions(state);stake=Math.min(stake,limit.stake);leverage=Math.min(leverage,limit.leverage);stop=Math.min(stop,limit.stop??1);
  const day=state.day,phase=state.phase,position=state.position,marketPlaying=phase==='playing',end=['day_end','resting','ending'].includes(phase),closing=phase==='closing';
  const account=equity(state),event=currentEvent(state),mental=mentalState(state),em=mood(state),info=moodInfo[em]||['平静','calm'];
  const dayNet=account-state.dayOpening-(state.externalFunding-state.dayOpeningFunding)+(state.expenses-state.dayOpeningExpenses);
  setText('stage-name',`第 ${day} 天 · ${dayNames[Math.min(day-1,3)]} / 第 ${Math.floor((day-1)/3)+1} 章`);
  setText('mission-title',`第 ${day} 天 · ${dayTasks[Math.min(day-1,3)]}`);
  setText('mission-copy',end?'窗外已经暗了。':`本日开盘 ${yen(state.dayOpening)} · ${Math.min(state.beat+1,beatsPerDay(state))} / ${beatsPerDay(state)} 次决策`);
  setText('chapter-target',`交易净收益 ${signed(tradingProfit(state))} · 首章目标 +${yen(TARGET_PROFIT)}`);
  setText('emotion-label',info[0]);
  const portraitKey=state.lastReaction?.reversal||(['ending','day_end'].includes(phase)&&account<5000?'blank':info[1]);if($('portrait').dataset.mood!==portraitKey){setImage($('portrait'),`./expressions/kurumi-${portraitKey}.webp`);$('portrait').dataset.mood=portraitKey;$('portrait').alt=`久留美此刻${info[0]}的漫画表情`;}
  const voiceEmotion=state.lastReaction?.reversal||(em==='stunned'?'blank':em);const voiced=$('voice-library-dialog').open?null:voice.sync({enabled:voiceEnabled,emotion:voiceEmotion,speechId:state.speech?.id,run:state.runId});
  setText('speech',voiced?.zh||state.speech?.text||'');setText('voice-caption',voiced?`PV 原声 · ${voiced.speaker||'久留美'} · ${voiced.ja||''}`:'');$('voice-caption').hidden=!voiced;
  const voiceStatus=voiceEnabled?(voice.lastError?UI_COPY.voiceState[voice.lastError]:voice.loading?UI_COPY.voiceState.loading:voice.playing?UI_COPY.voiceState.playing:''):'';for(const id of ['voice-state','voice-library-status']){setText(id,voiceStatus);$(id).hidden=!voiceStatus;}
  setText('voice-toggle',voiceEnabled?'动画原声 · 开':'动画原声 · 关');$('voice-toggle').disabled=false;$('voice-toggle').setAttribute('aria-pressed',String(voiceEnabled));$('voice-replay').hidden=!voiceEnabled||!availableVoices(voiceEmotion).length;

  setText('mental-detail',`累计回撤 ${Math.round(mental.totalDrawdown*100)}% · 近期回撤 ${Math.round(mental.recentDrawdown*100)}% · ${limit.noEntry?'不能新开仓':`新单最多 ${limit.leverage}× · 合计保证金上限 ${Math.round(limit.stake*100)}%`}`);
  setText('sanity-text',`${Math.round(state.sanity)} / 100`);$('sanity-fill').style.width=state.sanity+'%';
  setText('price',quote(state.price));setText('inverse-rate',`1 日元 = ${quote(state.price)} 美元 · 1 美元 ≈ ${(1/state.price).toFixed(2)} 日元`);const base=state.candles.findLast(c=>c.day!==day)?.close||1/150;
  const change=(state.price/base-1)*100;setText('change',`${change>=0?'+':''}${change.toFixed(3)}%`);$('change').className=change>=0?'positive':'negative';
  setText('beat-label',end?'今日收盘':closing?'等待全平收盘':`决策 ${Math.min(state.beat+1,beatsPerDay(state))} / ${beatsPerDay(state)}`);
  setText('candle-label',marketPlaying?`第 ${state.pending.candle+1} / 4 根 · 形成中`:closing||end?'本日 K 线已生成':'下一段：4 根 K 线');
  setText('market-phase',end?'休市':closing?'行情结束 · 请全平收盘':marketPlaying?'行情播放中 · 可以加速':'市场已暂停 · 等待决策');
  setText('news-source',event.source);setText('news-time',`${event.time} JST · 模拟快讯`);setText('news-title',event.title);setText('news-copy',event.copy);
  const metrics=accountMetrics(state),orders=positionsOf(state),canTrade=phase==='decision'&&!actionBusy;
  setText('equity',yen(account));setText('free-cash',yen(state.cash));setText('used-margin',yen(metrics.usedMargin));setText('reserve-amount',yen(state.reserve));setText('external-funding',yen(debtSummary(state).total));
  setText('available-margin',yen(metrics.availableMargin));setText('fees-paid',yen(metrics.feesPaid));
  setText('margin-level',orders.length?`${(metrics.marginLevel*100).toFixed(1)}%`:'— 无持仓');
  $('margin-meter').value=orders.length?Math.min(200,Math.max(0,metrics.marginLevel*100)):200;
  $('margin-level').className=orders.length&&metrics.marginLevel<=1?'negative':'';
  setText('day-pnl',signed(dayNet));$('day-pnl').className=dayNet>=0?'positive':'negative';
  $('order-empty').hidden=end||closing||!orderFormOpen;$('order-form-toggle').hidden=end||closing;$('order-form-toggle').disabled=!canTrade;$('order-form-toggle').setAttribute('aria-expanded',String(orderFormOpen));setText('order-form-toggle',orderFormOpen?'收起订单面板':orders.length?'＋ 追加市价单':'＋ 新建市价单');$('position-card').hidden=!orders.length;
  $('percent-field').hidden=orderMode!=='percent';$('amount-field').hidden=orderMode!=='amount';$('order-amount').disabled=!canTrade;$('stake-slider').disabled=!canTrade;$('stake-slider').max=Math.round(limit.stake*100);$('stake-slider').value=Math.round(stake*100);$('stake-slider').setAttribute('aria-valuetext',Math.round(stake*100)+'%');
  for(const b of document.querySelectorAll('[data-order-mode]')){b.setAttribute('aria-pressed',String(b.dataset.orderMode===orderMode));b.disabled=!canTrade;}
  setText('stake-value',`${Math.round(stake*100)}%`);setText('leverage-value',`${leverage}×`);setText('stop-value',stop===1?'不预设':`保证金 ${Math.round(stop*100)}%`);
  const preview=orderPreview(state,selectedOrder('long')),shortPreview=orderPreview(state,selectedOrder('short'));
  setText('preview-margin',yen(preview.margin||0));setText('preview-notional',yen(preview.notional||0));setText('preview-fee',yen(preview.openFee||0));setText('preview-debit',yen(preview.totalDebit||0));
  setText('risk-amount',stop===1?'不预设':yen((preview.margin||0)*stop));
  const liquidation=p=>Number.isFinite(p.liquidationPrice)&&p.liquidationPrice>0?quote(p.liquidationPrice):'无单一价格线';
  setText('preview-liquidation',`多 ${liquidation(preview)} / 空 ${liquidation(shortPreview)}`);
  setText('order-validation',!preview.valid&&!shortPreview.valid?(preview.error||'当前不能新开仓'): `可追加额度上限 ${yen(Math.max(preview.maxMargin||0,shortPreview.maxMargin||0))} · 开平各收一次费用`);
  $('order-validation').classList.toggle('invalid',!preview.valid&&!shortPreview.valid);
  for(const [attr,value] of [['stake',stake],['leverage',leverage],['stop',stop]])for(const button of document.querySelectorAll(`[data-${attr}]`)){button.setAttribute('aria-pressed',String(Number(button.dataset[attr])===value));button.disabled=!canTrade;}
  for(const id of ['long','short','wait','hold','half','close'])$(id).disabled=!canTrade;
  $('long').disabled ||= !preview.valid;$('short').disabled ||= !shortPreview.valid;
  $('wait').hidden=!!orders.length;
  setText('position-count',`${orders.length} 笔`);setText('floating',signed(metrics.unrealized));$('floating').className=metrics.unrealized>=0?'positive':'negative';
  renderPositions(orders,canTrade);
  renderTools();const limits=restrictions(state);
  for(const b of document.querySelectorAll('[data-leverage]'))b.disabled ||= Number(b.dataset.leverage)>limits.leverage;
  for(const b of document.querySelectorAll('[data-stake]'))b.disabled ||= Number(b.dataset.stake)>limits.stake;
  leverage=Math.min(leverage,limits.leverage);stake=Math.min(stake,limits.stake);
  for(const b of document.querySelectorAll('[data-stop]'))b.disabled ||= Number(b.dataset.stop)>(limits.stop??1);
  for(const b of document.querySelectorAll('[data-amount-step],#amount-max'))b.disabled=!canTrade;
  const amountCap=Math.max(preview.maxMargin||0,shortPreview.maxMargin||0);$('order-amount').max=amountCap;setText('amount-limit',`最大 ${yen(amountCap)} · 开仓费另计`);
  if(limits.noEntry){$('long').disabled=true;$('short').disabled=true;}
  $('effect-list').replaceChildren();for(const effect of state.effects){const def=DEBUFFS[effect.id]||{name:effect.id,copy:''},row=document.createElement('p');row.textContent=`${def.name}${effect.remaining===null?'':` · 剩 ${effect.remaining} 段`}：${def.copy}`;$('effect-list').append(row);}
  if(state.cash<100){$('long').disabled=true;$('short').disabled=true;}
  setText('motion-toggle',fullMotion?'完整动效 · 开':'低动效 · 点此开启');$('motion-toggle').setAttribute('aria-pressed',String(fullMotion));
  setText('heat-label',`交易室 · ${['平稳','升温','升温','火热','沸腾','狂热'][state.heat]}`);$('heat-fill').style.width=`${state.heat*20}%`;document.body.dataset.heat=String(state.heat);
  $('share-open').disabled=marketPlaying||actionBusy;
  $('skip').disabled=!marketPlaying;$('restart').disabled=marketPlaying||actionBusy;$('day-review').hidden=!['day_end','resting'].includes(phase);
  setText('playback-state',marketPlaying?'行情正在形成':closing?'今日行情结束，等待你全平收盘':end?'今日休市':'等待下一笔操作');
  $('settle-day').hidden=!closing;$('settle-day').disabled=actionBusy;
  $('retire').hidden=!['day_end','resting'].includes(phase);
  $('sound').textContent=sound?'♪ 音效开':'♪ 音效关';$('sound').setAttribute('aria-pressed',String(sound));
  $('developer-status').hidden=!state.developer?.edited;$('developer-open').disabled=marketPlaying||actionBusy;
  setText('privacy-toggle',state.developer?.edited?'测试存档 · 不统计':telemetry.dnt?'浏览器已禁用统计':telemetry.enabled?'匿名统计 · 开':'匿名统计 · 关');$('privacy-toggle').disabled=false;
  telemetry.view({screen:$('story-dialog').open?'story':phase==='playing'?'market':phase==='closing'?'closing':phase==='resting'?'resting':phase==='ending'?'ending':end?'day_end':'trading',run:state.runId,day});
  if(lastMood!==em){track('mood_change',em,{mood:em,previousMood:lastMood||'none',sanityBucket:bucket(state.sanity)});lastMood=em;}
  track('news_seen',event.id,{newsId:event.id,day,beat:state.beat},`news:${day}:${state.beat}:${event.id}`);
  track('day_start','day',{day},`day-start:${day}`);
  chart();renderRiskAlerts();checkAchievements();persist();
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
function tradeTotals(trades){const list=(trades||[]).filter(Boolean);return{count:list.length,margin:list.reduce((n,t)=>n+t.margin,0),pnl:list.reduce((n,t)=>n+t.pnl,0),liquidated:list.some(t=>t.type==='liquidation')};}
function afterTick(result){
  if(result.flash){flash(result.flash);if(result.flash.swan)track('black_swan',result.flash.id,{newsId:result.flash.id,day:state.day,beat:result.flash.beat},`swan:${state.day}:${result.flash.id}`);}
  const exits=result.exits||[result.exit],total=tradeTotals(exits);for(const t of exits)trackExit(t);
  if(total.count){const tag=total.liquidated?'强制平仓':'止损已触发';
    toast(`${tag} ${total.count} 笔 · ${signed(total.pnl)}`,total.pnl>=0?'gain':'loss');impact(tag,signed(total.pnl),total.pnl>=0?'gain':'loss');fly('平仓',$('position-card'),$('free-cash'));
    if(total.liquidated)motion.animate($('character-card'),[{transform:'translateX(-6px)'},{transform:'translateX(5px)'},{transform:'translateX(-2px)'},{transform:'none'}],{duration:360});
  }else if(result.candleClosed)soundEffect('rattle',{rate:1+state.heat*.1,level:.12+state.heat*.02});
  render();if(result.candleClosed)motion.animate($('price'),[{transform:'scale(1.04)'},{transform:'none'}],{duration:240});
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function* fastTicks(){while(state.phase==='playing')yield advanceTick(state);}
async function playSegment(){if(playing)return;playing=true;
  try{
    while(state.phase==='playing'){
      if(skip){let lastFlash=null,exits=[];for(const result of fastTicks()){for(const t of result.exits||[result.exit]){if(t){trackExit(t);exits.push(t);}}if(result.flash?.swan)track('black_swan',result.flash.id,{newsId:result.flash.id},`swan:${state.day}:${result.flash.id}`);if(result.flash)lastFlash=result.flash;checkAchievements();}if(lastFlash)flash(lastFlash);render();const total=tradeTotals(exits);if(total.count)toast(`已退出 ${total.count} 笔 · ${signed(total.pnl)}`,total.pnl>=0?'gain':'loss');break;}
      const result=advanceTick(state);afterTick(result);
      if(state.phase==='playing')await delay(360/speed);
    }
  }finally{playing=false;skip=false;render();}
    if(state.phase==='closing')track('market_end','day',{day:state.day},`market-end:${state.day}`);
  continueScenes();

}
async function sendAction(type,positionId=null,sourceButton=null){
  if(state.phase!=='decision'||actionBusy)return;
  const button=sourceButton||$(type),buttonRect=button.getBoundingClientRect(),positionRect=$('position-card').getBoundingClientRect();
  actionBusy=true;audio.unlock();render();
  $('restart').disabled=true;for(const b of document.querySelectorAll('[data-prop]'))b.disabled=true;
  motion.animate(button,[{transform:'scale(1)'},{transform:'scale(.9) rotate(-2deg)'},{transform:'scale(1.06) rotate(1deg)'},{transform:'none'}],{duration:210});
  soundEffect('click',{rate:1+state.heat*.1});
  try{
    if(shouldAnimate())await delay(150);
    track('trade_attempt',type,{direction:type==='short'?'short':'long',stake:stake*100,leverage,stop:stop*100,equityBucket:capitalBucket(equity(state))});
    const result=takeAction(state,{...selectedOrder(type),...(positionId?{positionId}:{})});if(result.trade?.type==='open')orderFormOpen=false;if(result.trade?.type==='open')track('trade_open',type,{direction:type==='long'?'long':'short',stake:stake*100,leverage,stop:stop*100});else for(const t of result.trades||[result.trade])trackExit(t);render();
    if(type==='long'||type==='short'){
      const amount=result.trade.margin,label=type==='long'?'做多':'做空';
      setText('capital-flow',`${type==='long'?'多单':'空单'} · 保证金 ${yen(amount)}`);
      fly(`${label} ${yen(amount)}`,buttonRect,$('position-card'));impact(label,`${leverage}× · ${yen(amount)}`);
    }else if(result.trade){
      if(!positionsOf(state).length)orderFormOpen=true;
      const total=tradeTotals(result.trades||[result.trade]),label=positionId?(type==='half'?'本单减半':'本单平仓'):(type==='half'?'全部减半':'全部平仓');
      setText('capital-flow',`${total.count} 笔 · ${yen(total.margin)} 保证金释放 · 净收益 ${signed(total.pnl)}`);
      fly(`${label} ${signed(total.pnl)}`,positionRect,$('free-cash'));impact(label,signed(total.pnl),total.pnl>=0?'gain':'loss');
    }else if(type==='hold'){impact('继续持有',signed(unrealized(state)),'hold');}
    else toast('空仓');
    if(shouldAnimate())await delay(320);
    actionBusy=false;playSegment();
  }catch(error){actionBusy=false;track('trade_rejected',type,{reason:'unavailable'});toast(error.message,'loss');render();}
}
function showDaySettlement(){if(document.querySelector('.settlement-dialog')||$('day-dialog').open||$('bankrupt-dialog').open)return;
  showSettlement(buildFXReceipt(state.dayReport),{audio,motion,intro:'成交、费用与账户余额。',onDone:showDayDialog,onSkip:()=>{}});
}
function showDayDialog(){
  const r=state.dayReport;if(!r)return;const peak=r.peak,turn=(r.moments||[]).filter(t=>t.reversal).at(-1);
  const big=Math.max(10000,r.opening*.2),dayMood=r.net>0?(r.net>=big?'ecstatic':'relieved'):r.net<0?(r.net<=-big?'despair':'exhausted'):'calm';
  setText('day-title',TRANSITION_COPY.dayTitle);setText('day-subtitle',`第 ${r.day} 天 · 东京收盘`);
  setText('comic-first',r.openingLine||'');setImage($('comic-opening-face'),'./expressions/kurumi-hopeful.webp');
  setText('comic-second',turn?`${turn.reversal==='profit-to-loss'?TRANSITION_COPY.profitToLoss:TRANSITION_COPY.lossToProfit} #${turn.positionId} · 当时浮盈 ${signed(turn.pnl)}`:peak&&Number.isFinite(peak.pnl)?`#${peak.positionId} ${peak.type==='liquidation'?'强平':peak.type==='stop'?'止损':'平仓'} ${signed(peak.pnl)}`:TRANSITION_COPY.noTrade);
  const reaction=turn?turn.reversal:peak&&peak.pnl>0?(peak.nearMiss?'loss-to-profit':'smug'):peak&&peak.pnl<0?(peak.maxUnrealized>0?'profit-to-loss':'shocked'):'calm';
  setImage($('comic-reaction'),`./expressions/kurumi-${reaction}.webp`);$('comic-reaction').alt=turn?turn.reversal==='profit-to-loss'?'盈转亏的惊慌':'亏转盈的释然':peak?.pnl>0?'盈利平仓的表情':'交易后的表情';
  setText('comic-third',`生活费 ${yen(r.livingCost||0)} · 收盘权益 ${yen(r.closing)}`);setImage($('comic-closing-face'),`./expressions/kurumi-${moodInfo[dayMood]?.[1]||'calm'}.webp`);
  $('turnaround-panel').hidden=!turn;if(turn){setImage($('turnaround-comic'),'./comics/event-turnaround.webp');setText('turnaround-caption',turn.reversal==='profit-to-loss'?TRANSITION_COPY.profitToLoss:TRANSITION_COPY.lossToProfit);}
  const homage=r.net>=big?'big-win':r.net<=-big?'big-loss':r.day===1?'first-day':null;$('homage-panel').hidden=!homage;
  if(homage){setImage($('homage-image'),`./homage/demk-${homage}.webp`);$('homage-image').alt=TRANSITION_COPY.homage[homage];$('homage-source').href=homage==='big-loss'?'http://demk.net/1.html':'http://demk.net/3.html';setText('homage-caption',TRANSITION_COPY.homage[homage]);}
  setText('day-total',yen(r.closing));setText('day-net',`今日交易 ${signed(r.net)} · 生活费 ${yen(r.livingCost||0)} · 交易累计 ${signed(tradingProfit(state))}`);
  setText('next-day','休市');$('day-dialog').showModal();
}
function newChapter(){storage.removeItem(saveKey);state=fresh();telemetry.setTestMode(false);voice.stop();state.runId=crypto.randomUUID();lastMood=null;orderFormOpen=true;orderMode='percent';orderAmount=10000;stake=.5;leverage=20;stop=.5;skip=false;playing=false;for(const d of document.querySelectorAll('dialog[open]'))d.close();$('capital-flow').textContent='';$('last-trade').textContent='';render();scrollTo({top:0,behavior:fullMotion?'smooth':'instant'});}
function showProp(id,confirmed=false){
  if(actionBusy||!['decision','day_end','resting'].includes(state.phase))return;
  if(id==='father'&&!confirmed){$('father-take-dialog').showModal();return;}
  audio.unlock();let result;
  try{result=useProp(state,id);}catch(error){toast(error.message,'loss');return;}
  track('item_used',id,{itemId:id,mood:mood(state),equityBucket:capitalBucket(equity(state))});for(const t of result.trades||[result.trade])trackExit(t);for(const e of state.effects)track('debuff_applied',e.id,{debuffId:e.id,itemId:id,duration:e.remaining||0},`effect:${state.day}:${state.beat}:${id}:${e.id}`);
  const spec=PROPS[id];render();$('prop-comic-frame').hidden=!['takeaway','noodles'].includes(id);$('prop-comic-frame').className='food-comic '+(id==='noodles'?'lower-pair':'');if(['takeaway','noodles'].includes(id))setImage($('prop-comic'),'./comics/event-takeaway.webp');setText('prop-title',spec.name);setText('prop-line',id==='father'?approvedQuote('V2-E03-05',state)?.text||'':PROP_LINES[id]||'');setText('prop-rule',spec.copy);
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
    const total=tradeTotals(result.trades||[result.trade]);setText('prop-amount',result.trade?signed(total.pnl):result.cost?`−${yen(result.cost)}`:spec.caption);soundEffect(id==='mochiko'?'defend':'exhaust',{rate:1.1});
    if(result.trade)setText('capital-flow',`${total.count} 笔 · ${yen(total.margin)} 保证金释放 · 净收益 ${signed(total.pnl)}`);
  }
  motion.animate($('prop-dialog'),[{opacity:0,transform:'translateY(30px) scale(.85) rotate(-3deg)'},{opacity:1,transform:'translateY(0) scale(1.03) rotate(1deg)'},{opacity:1,transform:'none'}],{duration:600});
  motion.animate(document.querySelector('.prop-envelope'),[{transform:'rotate(-12deg) scale(.6)'},{transform:'rotate(8deg) scale(1.12)'},{transform:'rotate(-5deg) scale(1)'}],{duration:800});
}
$('stake-slider').oninput=()=>{stake=Number($('stake-slider').value)/100;orderMode='percent';render();};
for(const b of document.querySelectorAll('[data-amount-step]'))b.onclick=()=>{orderAmount=Math.max(100,Math.min(maxOrderAmount(),(Number($('order-amount').value)||0)+Number(b.dataset.amountStep)));$('order-amount').value=orderAmount;render();};
function maxOrderAmount(){return Math.max(orderPreview(state,selectedOrder('long')).maxMargin||0,orderPreview(state,selectedOrder('short')).maxMargin||0);}
$('amount-max').onclick=()=>{orderAmount=maxOrderAmount();$('order-amount').value=orderAmount;render();};
for(const b of document.querySelectorAll('[data-stake],[data-leverage],[data-stop]'))b.addEventListener('click',()=>{if(b.dataset.stake){stake=Number(b.dataset.stake);orderMode='percent';}if(b.dataset.leverage)leverage=Number(b.dataset.leverage);if(b.dataset.stop)stop=Number(b.dataset.stop);render();});
for(const b of document.querySelectorAll('[data-order-mode]'))b.onclick=()=>{orderMode=b.dataset.orderMode;render();};
$('order-form-toggle').onclick=()=>{orderFormOpen=!orderFormOpen;render();};
$('order-amount').oninput=()=>{orderAmount=Number($('order-amount').value);render();};
$('position-list').onclick=e=>{const b=e.target.closest('[data-position-action]');if(b&&!b.disabled)sendAction(b.dataset.positionAction,b.dataset.positionId,b);};
for(const type of ['long','short','wait','hold','half','close'])$(type).addEventListener('click',()=>sendAction(type));
for(const b of document.querySelectorAll('[data-speed]'))b.addEventListener('click',()=>{speed=Number(b.dataset.speed);for(const option of document.querySelectorAll('[data-speed]'))option.setAttribute('aria-pressed',String(option===b));});
$('skip').addEventListener('click',()=>{if(state.phase==='playing')skip=true;});
$('tool-list').addEventListener('click',e=>{const b=e.target.closest('[data-prop]');if(b)showProp(b.dataset.prop);});
$('prop-done').onclick=()=>{cancelAnimationFrame(propFrame);$('prop-dialog').close();continueScenes();};
$('prop-dialog').addEventListener('cancel',()=>{cancelAnimationFrame(propFrame);requestAnimationFrame(continueScenes);});
$('motion-toggle').onclick=()=>{fullMotion=!fullMotion;storage.setItem('fx-girl-motion',fullMotion?'full':'reduce');motion.configure(fullMotion,true);document.body.classList.toggle('motion-full',fullMotion);render();};
$('sound').onclick=()=>{sound=!sound;storage.setItem(settingsKey,sound?'sound':'mute');audio.unlock();audio.configure({sound,soundVolume:.5});soundEffect('click');render();};
$('achievements-open').onclick=openAchievements;$('share-open').onclick=openShare;$('day-share').onclick=openShare;
$('share-dialog').addEventListener('close',()=>{shareRequest++;shareFile=null;if(shareUrl){URL.revokeObjectURL(shareUrl);shareUrl=null;}});
$('share-download').onclick=()=>setText('share-status',UI_COPY.shareSaving);
$('share-native').onclick=async()=>{if(shareBusy||!shareFile)return;const request=shareRequest;shareBusy=true;$('share-native').disabled=true;setText('share-status','正在打开系统分享…');const result=await shareReportFile(shareFile);shareBusy=false;if(request!==shareRequest)return;$('share-native').disabled=false;setText('share-status',UI_COPY.shareResult[result]);};
$('help').onclick=()=>$('help-dialog').showModal();for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>{$(b.dataset.close).close();continueScenes();};
$('restart').onclick=()=>$('restart-dialog').showModal();$('confirm-restart').onclick=newChapter;$('new-chapter').onclick=newChapter;
$('next-day').onclick=()=>{if(state.phase==='resting'){$('day-dialog').close();render();continueScenes();return;}beginRest(state);track('rest_start','night',{day:state.day},`rest:${state.day}`);$('day-dialog').close();render();continueScenes();};
$('settle-day').onclick=()=>{try{audio.unlock();settleDay(state);track('settlement_confirm','close',{day:state.day},`settle:${state.day}`);for(const t of state.dayReport.trades)trackExit(t);track('day_end','day',{mood:mood(state),equityBucket:capitalBucket(equity(state)),pnlBucket:pnlBucket(state.dayReport.net)},`day-end:${state.day}`);render();showDaySettlement();}catch(error){toast(error.message);}};
$('retire').onclick=()=>{try{finishCampaign(state,'walkaway');render();continueScenes();}catch(error){toast(error.message);}};
$('ending-restart').onclick=newChapter;
$('day-review').onclick=()=>showDayDialog();
$('day-dialog').addEventListener('cancel',e=>{e.preventDefault();$('next-day').click();});
function pauseAuditions(){for(const player of $('voice-list').querySelectorAll('audio'))player.pause();}
document.addEventListener('visibilitychange',()=>{audio.sync();if(document.hidden){voice.stop();pauseAuditions();}});window.addEventListener('pagehide',()=>{audio.pause();voice.stop();pauseAuditions();});
function replaceDeveloperState(next){
  state=next;orderFormOpen=!positionsOf(state).length;state.runId=state.developer?.edited?crypto.randomUUID():(state.runId||crypto.randomUUID());telemetry.setTestMode(!!state.developer?.edited);voice.stop();lastMood=null;playing=false;actionBusy=false;skip=false;
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  $('capital-flow').textContent='';$('last-trade').textContent='';render();continueScenes();
}
function openDeveloper(){
  const values=developerValues(state);for(const [key,value] of Object.entries(values))$('dev-'+key).value=value;
  $('dev-auto-sanity').checked=state.developer?.edited&&state.developer.sanityOverride===null;
  $('dev-sanity').disabled=$('dev-auto-sanity').checked;
  $('developer-restore').disabled=!storage.getItem(developerBackupKey);
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
    if(!state.developer?.edited&&!storage.setItem(developerBackupKey,JSON.stringify(state)))throw Error('浏览器无法保存原存档备份，暂不能修改开发数据');
    replaceDeveloperState(next);toast('开发测试数据已应用，原存档可恢复');
  }catch(error){setText('developer-error',error.message);}
};
$('developer-restore').onclick=()=>{try{const original=restoreGame(storage.getItem(developerBackupKey));if(!original)throw Error('没有有效的修改前存档');replaceDeveloperState(original);toast('已恢复修改前存档');}catch(error){setText('developer-error',error.message);}};
let disposeAuditions=null;
$('voice-library-open').onclick=()=>{voice.stop();disposeAuditions?.();setText('voice-library-caption','');$('voice-library-status').hidden=true;disposeAuditions=mountVoiceLibrary($('voice-list'),VOICE_LINES,{beforePlay:()=>voice.stop(),onPlay:line=>track('voice_play',line.id,{dialogueId:line.id}),onError:line=>{setText('voice-library-caption','“'+line.zh+'”暂时无法播放，请重试或试听其他片段。');}});$('voice-library-dialog').showModal();};
$('voice-library-dialog').addEventListener('close',()=>{disposeAuditions?.();disposeAuditions=null;voice.stop();render();});
let marginPositionId=null;
function renderRiskAlerts(){
 const box=$('risk-alerts'),risks=nearStopOrders(state),visible=new Set(risks.map(r=>String(r.positionId)));
 for(const row of [...box.children])if(!visible.has(row.dataset.riskId))row.remove();
 for(const risk of risks){let row=[...box.children].find(r=>r.dataset.riskId===String(risk.positionId));
  if(!row){row=document.createElement('div');row.className='risk-alert';row.dataset.riskId=risk.positionId;const text=document.createElement('b');text.className='risk-copy';row.append(text);for(const [action,label] of [['topup','追加保证金'],['exit','提前平仓']]){const b=document.createElement('button');b.dataset.riskAction=action;b.dataset.riskPosition=risk.positionId;b.textContent=label;row.append(b);}box.append(row);}
  row.querySelector('.risk-copy').textContent=`#${risk.positionId} · ${risk.kind==='stop'?'接近止损':'接近账户强平'} ${Math.round(risk.progress*100)}% · 浮亏 ${yen(risk.loss)}`;
  const b=row.querySelector('[data-risk-action="topup"]');b.hidden=risk.kind!=='stop';b.disabled=!risk.canTopUp||actionBusy||!['decision','playing'].includes(state.phase);
  row.querySelector('[data-risk-action="exit"]').disabled=actionBusy||!['decision','playing'].includes(state.phase);
 }
 if($('margin-dialog').open&&!positionsOf(state).some(p=>p.id===marginPositionId)){setText('margin-error','该持仓已经平仓，无需追加。');$('margin-confirm').disabled=true;}
}
$('risk-alerts').onclick=e=>{const b=e.target.closest('[data-risk-action]');if(!b||b.disabled)return;const id=b.dataset.riskPosition;
 if(b.dataset.riskAction==='topup'){marginPositionId=id;const p=positionsOf(state).find(p=>p.id===id);if(!p)return;const max=Math.floor(accountMetrics(state).availableMargin);$('margin-amount').max=max;$('margin-amount').value=Math.min(max,1000);$('margin-confirm').disabled=false;setText('margin-error','');setText('margin-description',`#${id} · 可追加 ${yen(max)}。现金转为本单抵押，名义仓位不变，止损容许金额随保证金增加；账户保证金率不变。行情继续播放。`);$('margin-dialog').showModal();}
 else try{const r=rescueClose(state,id);trackExit(r.trade);if(!positionsOf(state).length)orderFormOpen=true;setText('capital-flow',`#${id} · 保证金释放 ${yen(r.trade.margin)} · 净收益 ${signed(r.trade.pnl)}`);render();toast(`#${id} 平仓 ${signed(r.trade.pnl)}`,r.trade.pnl>=0?'gain':'loss');}catch(error){toast(error.message,'loss');}
};
$('margin-max').onclick=()=>{$('margin-amount').value=Math.floor(accountMetrics(state).availableMargin);};
$('margin-confirm').onclick=()=>{try{const r=topUpMargin(state,marginPositionId,Number($('margin-amount').value));$('margin-dialog').close();render();toast(`#${marginPositionId} 已追加 ${yen(r.amount)}`);}catch(error){setText('margin-error',error.message);}};
$('loan-open').onclick=()=>{const loan=state.loan;setText('loan-summary',`欠款 ${yen(loan.outstanding)} · 剩余额度 ${yen(Math.max(0,loan.limit-loan.outstanding))} · 日利息 0.05%（借 ¥10,000，每日 ¥5）。未付利息计入欠款。`);setText('loan-error','');$('loan-borrow').disabled=loan.outstanding>=loan.limit;$('loan-repay').disabled=loan.outstanding<=0;$('loan-dialog').showModal();};
for(const [id,action] of [['loan-borrow',borrowNetwork],['loan-repay',repayNetwork]])$(id).onclick=()=>{try{action(state,Number($('loan-amount').value));$('loan-dialog').close();render();}catch(error){setText('loan-error',error.message);}};
let rankingMode='total',rankingRequest=0,rankingBusy=false;
function rankingEligibility(){try{const r=completedLeaderboardScore(state);setText('ranking-eligibility',`第 ${r.day} 天 · 已结算，可提交。`);$('ranking-publish').disabled=rankingBusy;return true;}catch(error){setText('ranking-eligibility',error.message);$('ranking-publish').disabled=true;return false;}}
async function readRanking(){const request=++rankingRequest;setText('ranking-status','正在读取…');$('ranking-table').replaceChildren();for(const b of document.querySelectorAll('[data-ranking]'))b.setAttribute('aria-pressed',String(b.dataset.ranking===rankingMode));
 try{const data=await leaderboard.read({mode:rankingMode,limit:20});if(request!==rankingRequest)return;
  if(!data.rows.length){setText('ranking-status','还没有提交的成绩。');return;}
  const table=document.createElement('table'),head=document.createElement('tr');for(const label of ['排名','玩家','日期','净收益']){const th=document.createElement('th');th.textContent=label;head.append(th);}table.append(head);
  for(const r of data.rows){const row=document.createElement('tr');for(const value of [r.rank,r.name,'第 '+r.day+' 天',signed(r.score)]){const td=document.createElement('td');td.textContent=value;row.append(td);}table.append(row);}$('ranking-table').append(table);setText('ranking-status','已平仓净收益 · 含手续费 · 不含借款、消费与浮盈');
 }catch(error){if(request===rankingRequest)setText('ranking-status',error.message+'，可点击重新读取。');}
}
$('leaderboard-open').onclick=()=>{rankingEligibility();$('leaderboard-dialog').showModal();void readRanking();};
$('leaderboard-dialog').addEventListener('close',()=>{rankingRequest++;continueScenes();});
for(const b of document.querySelectorAll('[data-ranking]'))b.onclick=()=>{rankingMode=b.dataset.ranking;void readRanking();};
$('ranking-retry').onclick=()=>void readRanking();
$('ranking-form').onsubmit=async e=>{e.preventDefault();if(rankingBusy||!rankingEligibility())return;rankingBusy=true;rankingEligibility();setText('ranking-status','正在提交…');try{await leaderboard.publish(structuredClone(state),{alias:$('ranking-name').value.trim()});await readRanking();setText('ranking-status','提交成功。重复提交同一条记录不会重复计分。');}catch(error){setText('ranking-status',error.message);}finally{rankingBusy=false;rankingEligibility();}};

for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{audio.unlock();voice.unlock();},{once:true});
setText('storage-warning',UI_COPY.storageWarning);setText('share-hint',UI_COPY.shareHint);
for(const text of UI_COPY.help){const p=document.createElement('p');p.textContent=text;$('help-copy').append(p);}
render();if(state.phase==='playing')playSegment();else continueScenes();

function renderTools(){
 const box=$('tool-list');box.replaceChildren();const discovered=Object.entries(PROPS).filter(([id])=>itemDiscovered(state,id));
 $('inventory-empty').hidden=!!discovered.length;setText('inventory-empty',UI_COPY.inventoryEmpty);setText('inventory-count',discovered.length?discovered.length+' 件':'');
 for(const [id,spec] of discovered){const unlocked=itemUnlocked(state,id),used=id==='father'?state.fatherUsed:state.itemsUsed?.[id];const b=document.createElement('button');b.id=id;b.dataset.prop=id;const title=document.createElement('b'),small=document.createElement('small');title.textContent=spec.name;small.textContent=(unlocked?used?'已使用 · ':'':'未解锁 · ')+spec.caption;b.classList.toggle('item-locked',!unlocked);b.title=spec.copy;b.append(title,small);b.disabled=actionBusy||!unlocked||used||!(id==='father'?['decision','day_end','resting'].includes(state.phase):state.phase==='decision')||accountMetrics(state).availableMargin<(spec.cost||0);box.append(b);}
 $('family-panel').hidden=!state.fatherUsed;setText('family-debt',`父亲存款欠款 ${yen(state.family.outstanding)} · 已归还 ${yen(state.family.repaid)}`);$('repay-open').disabled=!['decision','day_end','resting'].includes(state.phase)||state.family.outstanding<=0||accountMetrics(state).availableMargin<1;
 $('bankrupt-rescue').hidden=!state.family.unlocked||state.fatherUsed;
 $('loan-panel').hidden=!state.loan?.discovered;setText('loan-state',state.loan?.unlocked?'已开放':'未解锁');setText('loan-effect',`借款上限 ${yen(state.loan?.limit||300000)} · 日利息 0.05% · 当前欠款 ${yen(state.loan?.outstanding||0)}`);$('loan-open').disabled=!state.loan?.unlocked||!['decision','day_end','resting'].includes(state.phase)||actionBusy;
}
function continueScenes(){
 if(['playing','closing'].includes(state.phase)||document.querySelector('dialog[open]')||document.querySelector('.settlement-dialog'))return;
 const event=pendingStory(state);if(event){showStory(event);return;}
 if(state.phase==='day_end')showDaySettlement();else if(state.phase==='ending')showEnding();else if(state.phase==='resting'){track('rest_end','night',{day:state.day},`rest-end:${state.day}`);nextDay(state);render();continueScenes();}else telemetry.view({screen:'trading',run:state.runId,day:state.day});
}
function showCaptions(id,lines){$(id).replaceChildren();lines.forEach((line,i)=>{const p=document.createElement('p');if(line)p.textContent=`${i+1} / ${line}`;$(id).append(p);});}
function showStory(event){
 telemetry.view({screen:'story',run:state.runId,day:state.day});track('story_seen',event.id,{storyId:event.id,mood:mood(state)},`story:${event.id}`);setText('story-title',event.title);
 const father=event.key.startsWith('father')||event.key.startsWith('repay'),comic=father?'event-father':event.key==='friendStudy'?'event-friend':null;
 $('story-comic-frame').hidden=!comic;$('story-captions').hidden=!father&&comic!=='event-friend';$('story-comic-frame').className='story-comic-frame';
 if(comic){setImage($('story-comic'),`./comics/${comic}.webp`);$('story-comic').alt=event.title+'漫画';}
 for(const [selector,visible] of [['.cover-two',state.fatherUsed],['.cover-three',state.family.discovered],['.cover-four',!!state.family.lastRepayment]])document.querySelector(selector).style.display=father&&!visible?'block':'none';
 if(father||comic==='event-friend')showCaptions('story-captions',comicCaptions(father?'father':'friend',state));
 $('story-lines').replaceChildren();for(const [from,text] of [...event.lines,...(event.choices.length===1?event.choices[0].lines:[])]){const p=document.createElement('p');p.textContent=`${from}：${text}`;$('story-lines').append(p);}
 const box=$('story-choices');box.replaceChildren();for(const choice of event.choices){const b=document.createElement('button');b.textContent=state.phase==='resting'?TRANSITION_COPY.restContinue:choice.label;b.dataset.storyChoice=choice.id;box.append(b);}$('story-dialog').showModal();
}
$('story-dialog').addEventListener('cancel',e=>e.preventDefault());
$('story-choices').addEventListener('click',e=>{const b=e.target.closest('[data-story-choice]');if(!b)return;try{const result=chooseStory(state,b.dataset.storyChoice);track('story_choice',result.event.id,{storyId:result.event.id,choiceId:result.choice.id});for(const id of result.unlocked)track('item_unlocked',id,{itemId:id,storyId:result.event.id});$('story-dialog').close();render();continueScenes();}catch(error){toast(error.message);}});
$('privacy-toggle').onclick=()=>{setText('privacy-copy',UI_COPY.privacy);setText('privacy-state',telemetry.dnt?'浏览器 DNT / GPC 已关闭统计':state.developer?.edited?'开发测试局不发送统计':telemetry.enabled?'当前：开启':'当前：关闭');setText('privacy-confirm',telemetry.enabled?'关闭匿名统计':'开启匿名统计');$('privacy-confirm').disabled=telemetry.dnt||!!state.developer?.edited;$('privacy-dialog').showModal();};
$('privacy-confirm').onclick=()=>{const next=!telemetry.enabled;storage.setItem('fx-girl-analytics',next?'on':'off');telemetry.setEnabled(next);$('privacy-dialog').close();render();};
$('repay-open').onclick=()=>{const max=Math.floor(Math.min(accountMetrics(state).availableMargin,state.family.outstanding));$('repay-amount').max=max;$('repay-amount').value=Math.min(max,10000);setText('repay-limit',`可归还资金 ${yen(accountMetrics(state).availableMargin)} · 欠款 ${yen(state.family.outstanding)}`);$('repay-dialog').showModal();};
$('repay-all').onclick=()=>{$('repay-amount').value=Math.floor(Math.min(accountMetrics(state).availableMargin,state.family.outstanding));};
$('repay-confirm').onclick=()=>{try{const r=repayFather(state,Number($('repay-amount').value));track('story_choice','repay',{storyId:r.full?'repayFull':'repayPartial',choiceId:'repay',equityBucket:capitalBucket(equity(state))});$('repay-dialog').close();toast(`归还 ${yen(r.amount)}`);render();continueScenes();}catch(e){setText('repay-limit',e.message);}};
$('bankrupt-rescue').onclick=()=>{$('bankrupt-dialog').close();showProp('father');};
$('voice-toggle').onclick=()=>{voiceEnabled=!voiceEnabled;storage.setItem('fx-girl-voice',voiceEnabled?'on':'off');if(voiceEnabled){voice.unlock?.();voice.lastMood=null;render();}else{voice.stop();render();}};
$('father-take-confirm').onclick=()=>{$('father-take-dialog').close();showProp('father',true);};
$('voice-replay').onclick=()=>{voice.unlock();void voice.play(state.lastReaction?.reversal||(mood(state)==='stunned'?'blank':mood(state)),state.speech?.id);};

function showEnding(){const e=state.ending;track('ending_seen',e.id,{kind:e.id,equityBucket:capitalBucket(e.equity),sanityBucket:bucket(e.sanity)},`ending:${e.id}`);const names={million:'两千万回来了',walkaway:'主动离场',broke:'账户退场',crisis:'最后的坠落'};setText('ending-title',names[e.id]);setText('ending-summary',`第 ${e.day} 天 · 账户 ${yen(e.equity)} · 承受力 ${e.sanity}/100`);setImage($('ending-comic'),`./comics/ending-${e.id}.webp`);$('ending-comic').alt=names[e.id]+'的原创四格漫画';showCaptions('ending-captions',comicCaptions(e.id,state));const before=approvedQuote('Q16',state);setText('ending-before',e.id==='crisis'?before?.text||'':'');$('ending-dialog').showModal();}
