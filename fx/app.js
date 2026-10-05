import {ACHIEVEMENTS,evaluateAchievements,createAchievementToast,renderAchievementBook} from './achievements.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {selectDailyScene} from './daily-scene.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {createShareCard} from './share-card.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {buildShareFile,canShareFile,shareReportFile} from './share-export.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {createGameStorage} from './storage.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {createSaveSession} from './save-session.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {clampOrderAmount,sliderOrderAmount,randomOrderAmount} from './amount-controls.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {runPerformance} from './performance.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {TERMINAL_HELP,OPENING_STORY} from './copy/terminal-help.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {PROP_LINES} from './copy/items.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {UI_COPY} from './copy/ui.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {TRANSITION_COPY,dailyContinueLabel} from './copy/transitions.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {FXLeaderboard,completedLeaderboardScore} from './leaderboard.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {setImage} from './assets.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {itemUnlocked,itemDiscovered} from './item-events.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {createGame, takeAction, advanceTick, nextDay, equity, unrealized, mood, currentEvent, useProp, mentalState, tradingProfit, restoreGame, START, TARGET_PROFIT, settleDay, beginRest, finishCampaign, pendingStory, chooseStory, restrictions, DEBUFFS, repayFather,beatsPerDay,nearStopOrders,topUpMargin,rescueClose,borrowNetwork,repayNetwork,debtSummary,positionsOf,positionUnrealized,positionStopLoss,accountMetrics,orderPreview,accountLiquidationEstimate,enableRealtime,advanceMarket,tradingOpen} from './engine.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {FXAudio} from './audio.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {MarketClock} from './market-clock.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {bindMarketLifecycle} from './page-lifecycle.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {GameMotion} from '../feedback.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {MOODS, PROPS} from './content.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {VoicePlayer,availableVoices,VOICE_LINES} from './voice.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {mountVoiceLibrary} from './voice-library.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {FXTelemetry,capitalBucket,pnlBucket} from './telemetry.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {applyDeveloperPatch,developerValues} from './developer.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
import {comicCaptions,approvedQuote} from './dialogue.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';

const $ = id => document.getElementById(id);
const storage=createGameStorage();
const yen = value => `${value<0?'−':''}¥${Math.abs(value).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
const signed = value => `${value>0?'+':''}${yen(value)}`;
const saveKeyFor=mode=>mode==='endless'?'fx-girl-endless-v1':'fx-girl-campaign-v3';
let selectedMode=storage.getItem('fx-girl-mode')==='endless'?'endless':'story';
let saveKey=saveKeyFor(selectedMode);
const settingsKey = 'fx-girl-settings';
let developerBackupKey=selectedMode==='endless'?'fx-endless-developer-backup-v1':'fx-girl-developer-backup-v3';
const fresh = (mode=selectedMode) => createGame(crypto.getRandomValues(new Uint32Array(1))[0],{mode});
const saveSessions=new Map(),modeStates=new Map();
function sessionFor(mode){if(!saveSessions.has(mode))saveSessions.set(mode,createSaveSession({storage,key:saveKeyFor(mode),legacyKey:mode==='story'?'fx-girl-campaign-v2':null,restore:raw=>{const saved=restoreGame(raw);return saved?.mode===mode?saved:null;}}));return saveSessions.get(mode);}
let saveSession=sessionFor(selectedMode);
const initialSave=saveSession.raw;
let state=enableRealtime(restoreGame(initialSave)||fresh());
const firstVisit=!initialSave&&!storage.getItem('fx-girl-mode');
let orderMode='percent',orderAmount=10000, shareUrl=null,shareFile=null,shareBusy=false,shareRequest=0,stateGeneration=0;
const achievementKey='fx-jiuliumei-achievements-v1';
let achievementProfile;try{achievementProfile=JSON.parse(storage.getItem(achievementKey)||'{}');}catch{achievementProfile={};}
let stake=.5, leverage=25, stop=.5, stopPips=30, speed=1, actionBusy=false,  shownFlashTimer, toastTimer, propFrame;
let sound = storage.getItem(settingsKey)!=='mute';
let voiceEnabled=storage.getItem('fx-girl-voice')!=='off';
let fullMotion=storage.getItem('fx-girl-motion')!=='reduce';
const telemetry=new FXTelemetry({enabled:storage.getItem('fx-girl-analytics')!=='off',testMode:!!state.developer?.edited,build:'fx-runtime-polish-v6'});
const leaderboard=new FXLeaderboard();
state.runId ||= crypto.randomUUID();let lastMood=null;
const bucket=n=>n<25?'0-24':n<50?'25-49':n<75?'50-74':'75-100';
function track(name,target,detail={},key){if(key)telemetry.emit(name,target,{detail,dedupeKey:state.runId+':'+key});else telemetry.action(name,target,detail);}
function trackExit(t){if(t)track('trade_close',t.type,{direction:t.direction===1?'long':'short',pnlBucket:pnlBucket(t.pnl),leverage:t.leverage},`exit:${state.day}:${t.positionId||t.id||'legacy'}:${t.type}:${t.margin}:${t.pnl}`);}
const audio = new FXAudio();
audio.configure({sound,soundVolume:.5});
const voice=new VoicePlayer({onUpdate:()=>render(),onPlay:line=>track('voice_play',line.id,{mood:mood(state),dialogueId:line.id}),onReject:line=>track('voice_rejected',line.id,{reason:'playback-unavailable',dialogueId:line.id})});
const motion = new GameMotion();motion.configure(fullMotion,true);document.body.classList.toggle('motion-full',fullMotion);
const moodInfo = MOODS;
const dayNames=['我就试一下','赚钱好像不难','今晚有大事','新的一天，新的借口'];
const dayTasks=['熟悉市场，活到收盘','辨认消息反转','在突发事件中守住计划','决定什么时候收手'];
const shouldAnimate=()=>motion.enabled&&fullMotion;
const quote=value=>value.toFixed(6);
const marketClock=new MarketClock({
  canRun:()=>!saveSession.blocked&&tradingOpen(state)&&!state.marketPaused&&!document.hidden,
  canStep:()=>!actionBusy&&!document.querySelector('dialog[open]'),
  interval:()=>1000/speed,
  step:()=>{if(!guardProgress())return;const result=advanceMarket(state);afterTick(result);if(!tradingOpen(state))continueScenes();},
  onError:error=>{state.marketPaused=true;render();toast('行情暂缓：'+error.message,'loss');}
});
function marketStatus(){
  const paused=state.marketPaused,modal=!!document.querySelector('dialog[open]');
  setText('market-phase',saveSession.blocked?'存档已变更 · 本页暂停':tradingOpen(state)?paused?'行情已暂停':document.hidden?'后台暂缓':modal?'查看窗口 · 行情暂缓':'实时模拟行情 · 运行中':state.phase==='closing'?'今日收盘':'休市');
  setText('skip',paused?'继续行情':'暂停行情');$('skip').disabled=!tradingOpen(state);$('skip').setAttribute('aria-pressed',String(paused));
  setText('market-cadence',`模拟行情 · 每 ${(1/speed).toFixed(speed===1?0:2)} 秒报价 · ${(6/speed).toFixed(speed===1?0:1)} 秒一根 K 线`);
}

function updateSaveStatus(){
  const blocked=saveSession.blocked,saved=saveSession.status==='saved',pending=saveSession.status==='pending';
  $('saved').textContent=blocked?'存档待处理':saved?'✓':pending?'保存中':'进度仅在本页';
  $('saved').title=blocked?'已暂停本页，未覆盖其他页面的进度':saved?'进度已保存':pending?'正在保存，完成前请勿刷新或关闭':'浏览器暂时无法安全保存，刷新或关闭后本页进度会丢失';
  $('storage-warning').hidden=saved||pending;$('storage-warning-panel').hidden=saved||pending;
  setText('storage-warning',blocked?'检测到存档变化。本页已暂停，请先处理存档。':saveSession.reason==='coordination'?'浏览器暂不支持安全的跨页保存。本页仍可游玩，请勿刷新或关闭；可下载本页进度备份。':UI_COPY.storageWarning);
  if(blocked){
    marketClock.stop();audio.pause();voice.stop();marketStatus();
    setText('save-conflict-copy',saveSession.status==='invalid'?'当前存档损坏、模式不匹配，或来自更新版本。为保护原数据，本页不会覆盖它。请先下载备份，修复后再重试载入。':'其他页面已更新此模式的存档。本页已暂停，未覆盖最新进度。你可以先下载本页备份，再载入最新存档；载入会替换本页进度。');
    if(!$('save-conflict-dialog').open)$('save-conflict-dialog').showModal();
  }
}
function guardProgress(){const ok=saveSession.check();if(!ok)updateSaveStatus();return ok;}
function persist(){const session=saveSession,pending=session.save(state);updateSaveStatus();return pending.then(saved=>{if(session===saveSession)updateSaveStatus();return saved;});}
// All state-changing controls, including keyboard-triggered clicks and forms,
// are checked before their handlers. Timer/scene mutations also check explicitly.
for(const type of ['click','submit','input','change','cancel'])document.addEventListener(type,event=>{
  if(event.target.closest?.('#save-conflict-dialog')||event.target.closest?.('[data-save-backup]'))return;
  if(!guardProgress()){event.preventDefault();event.stopImmediatePropagation();}
},true);
window.addEventListener('storage',event=>{if(event.key===null||event.key===saveKey||event.key===saveSession.legacyKey)guardProgress();});
function downloadProgressBackup(){
  const url=URL.createObjectURL(new Blob([JSON.stringify(saveSession.backup(state),null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.dataset.saveBackup='';link.href=url;link.download=`FX-${selectedMode}-进度备份.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const button of document.querySelectorAll('[data-save-backup]'))button.onclick=downloadProgressBackup;
$('save-retry').onclick=()=>void persist();
$('save-conflict-dialog').addEventListener('cancel',event=>event.preventDefault());
$('save-load-latest').onclick=()=>{
  const loaded=saveSession.reload();
  if(!loaded.ok){setText('save-conflict-copy',loaded.reason==='storage'?'浏览器仍无法读取存档。请保留本页，可先下载进度备份，再重试。':'当前存档仍无法识别，未覆盖任何数据。请先下载备份，修复后再重试。');return;}
  stateGeneration++;marketClock.stop();state=enableRealtime(loaded.state||fresh());state.runId||=crypto.randomUUID();
  telemetry.setTestMode(!!state.developer?.edited);voice.stop();lastMood=null;actionBusy=false;
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  $('last-trade').textContent='';render();continueScenes();marketClock.start();
};
function currentRisk(){return Math.round(accountMetrics(state).usedMargin/Math.max(accountMetrics(state).tradingEquity,1)*100);}
function selectedOrder(type='long'){return {type,leverage,stop,stopPips,...(orderMode==='amount'?{amount:orderAmount}:{stake})};}
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
  $('chart').innerHTML=parts.join('');$('chart').setAttribute('aria-label',`日元兑美元已发生行情，现价 ${quote(state.price)}，当日第 ${Math.min(state.beat*4+(state.pending?.candle||0)+1,beatsPerDay(state)*4)} 根 K 线`);
}
function renderPositions(orders,enabled){
  const box=$('position-list'),ids=new Set(orders.map(p=>p.id));
  for(const row of [...box.children])if(!ids.has(row.dataset.orderId))row.remove();
  for(const p of orders){
    let row=[...box.children].find(el=>el.dataset.orderId===p.id);
    if(!row){
      row=document.createElement('article');row.className='order-row';row.dataset.orderId=p.id;
      const head=document.createElement('div');head.className='order-row-head';
      const title=document.createElement('b'),tag=document.createElement('span'),detail=document.createElement('button');
      title.dataset.orderTitle='';tag.dataset.orderLeverage='';detail.className='help-dot';detail.textContent='?';detail.dataset.positionDetail=p.id;detail.setAttribute('aria-label',`查看订单 ${p.id} 详情`);head.append(title,tag,detail);row.append(head);
      for(const [field,label] of [['pnl','浮动盈亏'],['margin','保证金'],['stop','止损']]){
        const line=document.createElement('div');line.className='order-row-data';const key=document.createElement('span'),val=document.createElement('b');key.textContent=label;val.dataset.orderField=field;if(field==='pnl')line.classList.add('order-live-pnl');line.append(key,val);row.append(line);
      }
      const actions=document.createElement('div');actions.className='order-row-actions';
      for(const [action,label] of [['half','本单减半'],['close','本单平仓']]){const b=document.createElement('button');b.dataset.positionId=p.id;b.dataset.positionAction=action;b.textContent=label;actions.append(b);}row.append(actions);
      const bar=document.createElement('div');bar.className='stop-progress';bar.append(document.createElement('i'));row.append(bar);box.append(row);
    }
    row.querySelector('[data-order-title]').textContent=`#${p.id} · ${p.direction===1?'↗ 日元多单':'↘ 日元空单'}`;
    row.querySelector('[data-order-leverage]').textContent=`${Number(p.leverage.toFixed(1))}×`;
    const net=positionUnrealized(state,p),loss=positionStopLoss(p),pnl=row.querySelector('[data-order-field="pnl"]');
    pnl.textContent=signed(net);pnl.className=net>=0?'positive':'negative';
    row.querySelector('[data-order-field="margin"]').textContent=yen(p.margin);
    row.querySelector('[data-order-field="stop"]').textContent=Object.hasOwn(p,'stopPips')&&p.stopPips!==null?`${p.stopPips} 点 · 约 −${yen(loss)}`:p.stop===1?'不预设':`约 −${yen(loss)}`;
    for(const b of row.querySelectorAll('[data-position-action]'))b.disabled=!enabled;
    const bar=row.querySelector('.stop-progress'),hasStop=Number.isFinite(loss)&&loss>0;bar.hidden=!hasStop;
    if(hasStop){const progress=Math.max(0,-net/loss);bar.firstElementChild.style.width=Math.min(100,progress*100)+'%';bar.classList.toggle('danger',progress>=.75);bar.setAttribute('aria-label','止损进度 '+Math.round(progress*100)+'%');}
  }
}
function openDetails(title,lines,source=null,extra=null){
  setText('detail-title',title);const box=$('detail-copy');box.replaceChildren();for(const text of lines){const p=document.createElement('p');p.textContent=text;box.append(p);}if(extra){const copy=extra.cloneNode(true);copy.hidden=false;copy.removeAttribute('id');for(const node of copy.querySelectorAll('[id]'))node.removeAttribute('id');box.append(copy);}if(source){const a=document.createElement('a');a.textContent=source[0]+' ↗';a.href=source[1];a.target='_blank';a.rel='noopener';box.append(a);}$('detail-dialog').showModal();
}
function openPositionDetail(id){const p=positionsOf(state).find(p=>p.id===id);if(!p)return;const notional=p.notional??p.margin*p.leverage;openDetails('订单 #'+p.id,[`开仓 JPY / USD ${quote(p.entry)}，当前 ${quote(state.price)}。`,`保证金 ${yen(p.margin)}，名义仓位 ${yen(notional)}。`,`已付开仓费用 ${yen(p.openFee||0)}，预计平仓费用 ${yen(notional*.00005)}。`,Number.isFinite(p.stopPrice)?`止损价 JPY / USD ${quote(p.stopPrice)}（USD / JPY ${(1/p.stopPrice).toFixed(2)}）。`:'未设置固定止损价。','浮动盈亏尚未扣除预计平仓费用。']);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-help]');if(!b)return;const key=b.dataset.help,h=TERMINAL_HELP[key];if(h)openDetails(h.title,h.lines,h.source,key==='account'?$('account-details'):key==='order'?$('order-details'):key==='mental'?$('mental-detail'):null);});
let openingPage=0;
function showOpening(){openingPage=0;renderOpening();if(!$('opening-dialog').open)$('opening-dialog').showModal();}
function renderOpening(){const page=OPENING_STORY[openingPage];setText('opening-count',`序章 / ${openingPage+1} · ${OPENING_STORY.length}`);setText('opening-title',page.title);setText('opening-copy',page.text);setImage($('opening-face'),`./expressions/kurumi-${page.face}.webp`);setText('opening-next',openingPage===OPENING_STORY.length-1?'打开交易软件':'继续');}
function finishOpening(){if(!guardProgress())return;state.openingSeen=true;$('opening-dialog').close();persist();continueScenes();}
$('opening-next').onclick=()=>{if(++openingPage>=OPENING_STORY.length)finishOpening();else renderOpening();};$('opening-skip').onclick=finishOpening;$('opening-dialog').addEventListener('cancel',e=>{e.preventDefault();finishOpening();});
$('mode-open').onclick=()=>$('mode-dialog').showModal();
for(const b of document.querySelectorAll('[data-play-mode]'))b.onclick=async()=>{
  if(actionBusy||!guardProgress())return;const mode=b.dataset.playMode,generation=stateGeneration,session=saveSession;actionBusy=true;marketClock.stop();await persist();if(generation!==stateGeneration||session!==saveSession)return;actionBusy=false;if(saveSession.blocked)return;stateGeneration++;modeStates.set(selectedMode,state);selectedMode=mode;saveKey=saveKeyFor(mode);saveSession=sessionFor(mode);developerBackupKey=mode==='endless'?'fx-endless-developer-backup-v1':'fx-girl-developer-backup-v3';storage.setItem('fx-girl-mode',mode);state=enableRealtime(modeStates.get(mode)||restoreGame(saveSession.raw)||fresh(mode));state.runId||=crypto.randomUUID();telemetry.setTestMode(!!state.developer?.edited);voice.stop();lastMood=null;leverage=25;stake=.5;stopPips=30;stop=.5;orderMode='percent';orderAmount=10000;$('order-amount').value=orderAmount;$('mode-dialog').close();if(!guardProgress())return;render();if(mode==='story'&&!state.openingSeen)showOpening();else continueScenes();marketClock.start();
};
function checkAchievements(){
  const result=evaluateAchievements(state,achievementProfile);achievementProfile=result.profile;
  if(result.newlyUnlocked.length){try{storage.setItem(achievementKey,JSON.stringify(achievementProfile));}catch{}for(const def of result.newlyUnlocked){createAchievementToast(def);if(sound)soundEffect('gain',{level:.3});}}
  setText('achievement-count',String(Object.keys(achievementProfile.unlocked||{}).length));
  if($('achievements-dialog').open)renderAchievementBook($('achievement-book'),achievementProfile,state);
}
function openAchievements(){renderAchievementBook($('achievement-book'),achievementProfile,state);$('achievements-dialog').showModal();}
async function openShare(variant='report'){
  if(typeof variant!=='string')variant='report';setText('share-title',variant==='ranking'?'我的大洋榜战绩':'这次的战报');
  if(actionBusy)return;
  const request=++shareRequest;const dialog=$('share-dialog');if(!dialog.open)dialog.showModal();
  shareFile=null;$('share-preview').hidden=true;$('share-actions').hidden=true;$('share-native').hidden=true;setText('share-status','正在制作战报…');
  const snapshot=structuredClone(state),em=mood(snapshot);
  try{
    const card=await createShareCard(snapshot,{variant,equity:equity(snapshot),tradingProfit:tradingProfit(snapshot),unrealized:unrealized(snapshot),moodLabel:$('emotion-label').textContent||moodInfo[em]?.[0]||'平静',portraitUrl:$('portrait').src,gameUrl:location.href.split('#')[0],achievementProfile:structuredClone(achievementProfile),report:snapshot.dayReport});
    if(request!==shareRequest){URL.revokeObjectURL(card.url);return;}if(shareUrl)URL.revokeObjectURL(shareUrl);shareUrl=card.url;
    shareFile=buildShareFile(card);$('share-preview').src=shareUrl;$('share-preview').hidden=false;$('share-download').href=shareUrl;$('share-download').download=card.filename||`FX韭留美-第${snapshot.day}天.png`;$('share-original').href=shareUrl;$('share-actions').hidden=false;$('share-native').hidden=!canShareFile(shareFile);$('share-native').disabled=shareBusy;setText('share-status',snapshot.developer?.edited?'开发测试战报 · 不计入成就':'战报已生成，可保存原图');
  }catch(error){setText('share-status','战报生成失败：'+error.message);}
}
function render(){
  if(!guardProgress())return;
  const mental=mentalState(state),limit=restrictions(state);stake=Math.min(stake,limit.stake);leverage=Math.max(limit.minLeverage,Math.min(leverage,limit.leverage));if(![5,10,25,50,100].includes(leverage))leverage=leverage<25?10:25;if(limit.forceNoStop){stopPips=null;stop=1;}
  const day=state.day,phase=state.phase,position=state.position,marketPlaying=phase==='playing',end=['day_end','resting','ending'].includes(phase),closing=phase==='closing';
  const account=equity(state),event=currentEvent(state),em=mood(state),info=moodInfo[em]||['平静','calm'];
  const dayNet=account-state.dayOpening-(state.externalFunding-state.dayOpeningFunding)+(state.expenses-state.dayOpeningExpenses);
  const endless=state.mode==='endless',stats=runPerformance(state);
  setText('mode-open',endless?'操盘模式 ▾':'剧情模式 ▾');setText('restart',endless?'重新操盘':'重新开始章节');
  setText('stage-name',endless?`操盘 · 无尽 / 已存活 ${stats.daysSurvived} 天`:`第 ${day} 天 · ${dayNames[Math.min(day-1,3)]} / 第 ${Math.floor((day-1)/3)+1} 章`);
  setText('mission-title',endless?'市场继续，账户还在':`第 ${day} 天 · ${dayTasks[Math.min(day-1,3)]}`);
  setText('mission-copy',endless?`第 ${day} 个模拟日 · 已平仓 ${stats.closedTrades} 笔`:end?'窗外已经暗了。':`本日开盘 ${yen(state.dayOpening)} · ${state.beat*4+(state.pending?.candle||0)} / ${beatsPerDay(state)*4} 根 K 线`);
  setText('chapter-target',endless?`总收益率 ${(stats.returnRate*100).toFixed(2)}% · 交易收益 ${signed(stats.totalProfit)}`:`交易净收益 ${signed(tradingProfit(state))} · 首章目标 +${yen(TARGET_PROFIT)}`);
  setText('emotion-label',info[0]);
  const reversal=state.lastReaction?.day===state.day?state.lastReaction?.reversal:null;
  const portraitKey=reversal||(['ending','day_end'].includes(phase)&&account<5000?'blank':info[1]);if($('portrait').dataset.mood!==portraitKey){setImage($('portrait'),`./expressions/kurumi-${portraitKey}.webp`);$('portrait').dataset.mood=portraitKey;$('portrait').alt=`久留美此刻${info[0]}的漫画表情`;}
  const voiceEmotion=reversal||(em==='stunned'?'blank':em);const voiced=$('voice-library-dialog').open?null:voice.sync({enabled:voiceEnabled,emotion:voiceEmotion,speechId:state.speech?.id,run:state.runId});
  setText('speech',voiced?.zh||state.speech?.text||'');setText('voice-caption',voiced?`PV 原声 · ${voiced.speaker||'久留美'} · ${voiced.ja||''}`:'');$('voice-caption').hidden=!voiced;
  const voiceStatus=voiceEnabled?(voice.lastError?UI_COPY.voiceState[voice.lastError]:voice.loading?UI_COPY.voiceState.loading:voice.playing?UI_COPY.voiceState.playing:''):'';for(const id of ['voice-state','voice-library-status']){setText(id,voiceStatus);$(id).hidden=!voiceStatus;}
  setText('voice-toggle',voiceEnabled?'动画原声 · 开':'动画原声 · 关');$('voice-toggle').disabled=false;$('voice-toggle').setAttribute('aria-pressed',String(voiceEnabled));$('voice-replay').hidden=!voiceEnabled||!availableVoices(voiceEmotion).length;

  setText('mental-detail',`累计回撤 ${Math.round(mental.totalDrawdown*100)}% · 近期回撤 ${Math.round(mental.recentDrawdown*100)}% · ${limit.noEntry?'不能新开仓':`新单最多 ${limit.leverage}× · 合计保证金上限 ${Math.round(limit.stake*100)}%`}`);
  setText('sanity-text',`${Math.round(state.sanity)} / 100`);$('sanity-fill').style.width=state.sanity+'%';
  setText('price',quote(state.price));setText('inverse-rate',`1 日元 = ${quote(state.price)} 美元 · 1 美元 ≈ ${(1/state.price).toFixed(2)} 日元`);const base=state.candles.findLast(c=>c.day!==day)?.close||1/150;
  const change=(state.price/base-1)*100;setText('change',`${change>=0?'+':''}${change.toFixed(3)}%`);$('change').className=change>=0?'positive':'negative';
  setText('beat-label',end||closing?'今日收盘':`当日 K 线 ${Math.min(state.beat*4+(state.pending?.candle||0)+1,beatsPerDay(state)*4)} / ${beatsPerDay(state)*4}`);
  setText('candle-label',marketPlaying?(state.candles.at(-1)?.closed?'下一根 K 线 · 等待报价':`本根报价 ${state.pending.tick} / 6 · 形成中`):closing||end?'本日 K 线已生成':'开盘中');
  marketStatus();
  setText('news-source',event.source);setText('news-time',`${event.time} JST · 模拟快讯`);setText('news-title',event.title);setText('news-copy',event.copy);
  const metrics=accountMetrics(state),orders=positionsOf(state),canTrade=tradingOpen(state)&&!actionBusy;
  setText('equity',yen(account));setText('free-cash',yen(state.cash));setText('used-margin',yen(metrics.usedMargin));setText('reserve-amount',yen(state.reserve));setText('external-funding',yen(debtSummary(state).total));
  setText('available-margin',yen(metrics.availableMargin));setText('fees-paid',yen(metrics.feesPaid));
  setText('margin-level',orders.length?`${(metrics.marginLevel*100).toFixed(1)}%`:'— 无持仓');
  $('margin-meter').value=orders.length?Math.min(200,Math.max(0,metrics.marginLevel*100)):200;
  $('margin-level').className=orders.length&&metrics.marginLevel<=1?'negative':'';
  const displayPnl=endless?stats.totalProfit:dayNet;setText('pnl-period',endless?'累计交易收益':'今日收益');setText('day-pnl',signed(displayPnl));$('day-pnl').className=displayPnl>=0?'positive':'negative';
  $('position-card').hidden=false;$('position-empty').hidden=!!orders.length;for(const id of ['hold','half','close'])$(id).hidden=!orders.length;
  $('percent-field').hidden=orderMode!=='percent';$('amount-field').hidden=orderMode!=='amount';$('order-amount').disabled=!canTrade;$('stake-slider').disabled=!canTrade;$('stake-slider').max=Math.round(limit.stake*100);$('stake-slider').value=Math.round(stake*100);$('stake-slider').setAttribute('aria-valuetext',Math.round(stake*100)+'%');
  for(const b of document.querySelectorAll('[data-order-mode]')){b.setAttribute('aria-pressed',String(b.dataset.orderMode===orderMode));b.disabled=!canTrade;}
  setText('stake-value',`${Math.round(stake*100)}%`);setText('leverage-value',`${leverage}×`);setText('stop-value',stopPips===null?'不预设':`${stopPips} 点`);
  $('emotion-order-rule').hidden=!limit.forceNoStop;setText('emotion-order-rule',`${info[0]}：只能不设止损，杠杆至少 25×`);
  const preview=orderPreview(state,selectedOrder('long')),shortPreview=orderPreview(state,selectedOrder('short'));
  setText('preview-margin',yen(preview.margin||0));setText('preview-notional',yen(preview.notional||0));setText('preview-fee',yen(preview.openFee||0));setText('preview-debit',yen(preview.totalDebit||0));
  setText('risk-amount',stopPips===null?'不预设':yen(preview.stopLossAmount||0));
  const liquidation=p=>Number.isFinite(p.liquidationPrice)&&p.liquidationPrice>0?quote(p.liquidationPrice):'无单一价格线';
  setText('preview-liquidation',`多 ${liquidation(preview)} / 空 ${liquidation(shortPreview)}`);
  renderLiquidation('liquidation-long',preview.liquidation,preview.valid);renderLiquidation('liquidation-short',shortPreview.liquidation,shortPreview.valid);
  $('account-liquidation').hidden=!orders.length;renderLiquidation('account-liquidation-value',accountLiquidationEstimate(state),true);
  setText('order-validation',!preview.valid&&!shortPreview.valid?(preview.error||'当前不能新开仓'):'');$('order-validation').hidden=preview.valid||shortPreview.valid;
  $('order-validation').classList.toggle('invalid',!preview.valid&&!shortPreview.valid);
  for(const [attr,value] of [['stake',stake],['leverage',leverage],['stop',stop]])for(const button of document.querySelectorAll(`[data-${attr}]`)){button.setAttribute('aria-pressed',String(Number(button.dataset[attr])===value));button.disabled=!canTrade;}
  for(const id of ['long','short','wait','hold','half','close'])$(id).disabled=!canTrade;for(const b of document.querySelectorAll('[data-stop-pips]')){b.setAttribute('aria-pressed',String(b.dataset.stopPips===(stopPips===null?'none':String(stopPips))));b.disabled=!canTrade||(limit.forceNoStop&&b.dataset.stopPips!=='none');}
  $('long').disabled ||= !preview.valid;$('short').disabled ||= !shortPreview.valid;
  $('wait').hidden=true;$('hold').hidden=true;
  setText('position-count',`${orders.length} 笔`);setText('floating',signed(metrics.unrealized));$('floating').className=metrics.unrealized>=0?'positive':'negative';
  renderPositions(orders,canTrade);
  renderTools();const limits=restrictions(state);
  for(const b of document.querySelectorAll('[data-leverage]'))b.disabled ||= (Number(b.dataset.leverage)>limits.leverage||Number(b.dataset.leverage)<limits.minLeverage);
  for(const b of document.querySelectorAll('[data-stake]'))b.disabled ||= Number(b.dataset.stake)>limits.stake;
  leverage=Math.min(leverage,limits.leverage);stake=Math.min(stake,limits.stake);
  for(const b of document.querySelectorAll('[data-stop]'))b.disabled ||= Number(b.dataset.stop)>(limits.stop??1);
  const amountCap=Math.max(preview.maxMargin||0,shortPreview.maxMargin||0),canPickAmount=canTrade&&!limits.noEntry&&amountCap>=100;
  for(const b of document.querySelectorAll('[data-amount-step],#amount-max,#amount-random,#amount-slider'))b.disabled=!canPickAmount;
  $('order-amount').disabled=!canPickAmount;
  $('amount-slider').max=Math.max(100,amountCap);$('amount-slider').value=Number.isFinite(orderAmount)?Math.max(100,Math.min(amountCap,orderAmount)):100;$('amount-slider').setAttribute('aria-valuetext',Number.isFinite(orderAmount)?yen(orderAmount):'请输入有效额度');
  setText('amount-slider-max',yen(amountCap));setText('amount-selected',Number.isFinite(orderAmount)?yen(orderAmount):'—');setText('amount-limit',amountCap>=100?`最大 ${yen(amountCap)} · 开仓费另计`:'当前可开仓额度不足 ¥100');
  if(limits.noEntry){$('long').disabled=true;$('short').disabled=true;}
  $('effect-list').replaceChildren();for(const effect of state.effects){const def=DEBUFFS[effect.id]||{name:effect.id,copy:''},row=document.createElement('p');row.textContent=`${def.name}${effect.remaining===null?'':` · 剩 ${effect.remaining} 段`}：${def.copy}`;$('effect-list').append(row);}
  if(state.cash<100){$('long').disabled=true;$('short').disabled=true;}
  setText('motion-toggle',fullMotion?'完整动效 · 开':'低动效 · 点此开启');$('motion-toggle').setAttribute('aria-pressed',String(fullMotion));
  setText('heat-label',`交易室 · ${['平稳','升温','升温','火热','沸腾','狂热'][state.heat]}`);$('heat-fill').style.width=`${state.heat*20}%`;document.body.dataset.heat=String(state.heat);
  $('share-open').disabled=actionBusy;$('mode-open').disabled=actionBusy;
  $('restart').disabled=actionBusy;$('day-review').hidden=!['day_end','resting'].includes(phase);
  setText('playback-state',marketPlaying?'行情正在形成':closing?'今日行情结束，等待你全平收盘':end?'今日休市':'行情持续运行 · 可以随时交易');
  $('settle-day').hidden=!closing;$('settle-day').disabled=actionBusy;
  $('retire').hidden=!['day_end','resting'].includes(phase);
  $('sound').textContent=sound?'♪ 音效开':'♪ 音效关';$('sound').setAttribute('aria-pressed',String(sound));
  $('developer-status').hidden=!state.developer?.edited;$('developer-open').disabled=actionBusy;
  setText('privacy-toggle',state.developer?.edited?'测试存档 · 不统计':telemetry.dnt?'浏览器已禁用统计':telemetry.enabled?'匿名统计 · 开':'匿名统计 · 关');$('privacy-toggle').disabled=false;
  telemetry.view({screen:$('story-dialog').open?'story':phase==='playing'?'market':phase==='closing'?'closing':phase==='resting'?'resting':phase==='ending'?'ending':end?'day_end':'trading',run:state.runId,day});
  if(lastMood!==em){track('mood_change',em,{mood:em,previousMood:lastMood||'none',sanityBucket:bucket(state.sanity)});lastMood=em;}
  track('news_seen',event.id,{newsId:event.id,day,beat:state.beat},`news:${day}:${state.beat}:${event.id}`);
  track('day_start','day',{day},`day-start:${day}`);
  chart();renderRiskAlerts();checkAchievements();persist();marketClock.start();
}
function soundEffect(kind,opts){audio.effect(kind,opts);}
document.addEventListener('click',e=>{const b=e.target.closest('button:not(:disabled)');if(b&&!['long','short','half','close'].includes(b.id)&&!b.dataset.positionAction&&!b.dataset.riskAction){audio.unlock();soundEffect('click');}},true);
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
function sendAction(type,positionId=null,sourceButton=null){
  if(!guardProgress())return;
  if(!tradingOpen(state)||actionBusy)return;
  const button=sourceButton||$(type),buttonRect=button.getBoundingClientRect(),positionRect=$('position-card').getBoundingClientRect();
  actionBusy=true;audio.unlock();render();
  $('restart').disabled=true;for(const b of document.querySelectorAll('[data-prop]'))b.disabled=true;
  motion.animate(button,[{transform:'scale(1)'},{transform:'scale(.9) rotate(-2deg)'},{transform:'scale(1.06) rotate(1deg)'},{transform:'none'}],{duration:210});
  if(['long','short'].includes(type))soundEffect('play',{level:.7});
  try{
    track('trade_attempt',type,{direction:type==='short'?'short':'long',stake:stake*100,leverage,stop:stop*100,equityBucket:capitalBucket(equity(state))});
    const result=takeAction(state,{...selectedOrder(type),...(positionId?{positionId}:{})});if(result.trade?.type==='open')track('trade_open',type,{direction:type==='long'?'long':'short',stake:stake*100,leverage,stop:stop*100});else for(const t of result.trades||[result.trade])trackExit(t);render();
    if(type==='long'||type==='short'){
      const amount=result.trade.margin,label=type==='long'?'做多':'做空';

      fly(`${label} ${yen(amount)}`,buttonRect,$('position-card'));impact(label,`${leverage}× · ${yen(amount)}`);
    }else if(result.trade){
      const total=tradeTotals(result.trades||[result.trade]),label=positionId?(type==='half'?'本单减半':'本单平仓'):(type==='half'?'全部减半':'全部平仓');

      fly(`${label} ${signed(total.pnl)}`,positionRect,$('free-cash'));impact(label,signed(total.pnl),total.pnl>=0?'gain':'loss');
    }else if(type==='hold'){impact('继续持有',signed(unrealized(state)),'hold');}
    else toast('空仓');
    actionBusy=false;render();marketClock.start();
  }catch(error){actionBusy=false;track('trade_rejected',type,{reason:'unavailable'});toast(error.message,'loss');render();}
}
function renderLiquidation(id,estimate,valid){
 const box=$(id);box.replaceChildren();
 if(!valid){box.textContent='当前设置无法开仓';return;}
 if(!estimate||estimate.reason){box.textContent=estimate?.reason==='hedged'?'多空抵消，无单一强平价':'当前仓位无可达强平价';return;}
 const price=document.createElement('b'),move=document.createElement('b'),loss=document.createElement('b');price.textContent=quote(estimate.price);move.textContent=`${estimate.movePercent<0?'下跌':'上涨'} ${Math.abs(estimate.movePercent).toFixed(2)}%`;loss.textContent=yen(estimate.lossThreshold);
 box.append(price,' · ',move,document.createElement('br'),'账户浮亏达到 ',loss,'，触发强平');
}
function showDaySettlement(){if($('day-dialog').open||$('bankrupt-dialog').open)return;showDayDialog();}
$('day-dialog').addEventListener('cancel',e=>e.preventDefault());
function showDayDialog(){
 const r=state.dayReport;if(!r)return;
 if(state.day===r.day&&state.phase==='day_end'){beginRest(state);render();}
 const scene=selectDailyScene(state),event=scene?.event;
 setText('day-title',scene?.kind==='story'&&event?event.title:TRANSITION_COPY.dayTitle);setText('day-subtitle',`第 ${r.day} 天 · 东京收盘`);
 const frame=$('day-story-comic-frame');frame.hidden=true;frame.replaceChildren();$('day-story-lines').replaceChildren();
 $('turnaround-panel').hidden=scene?.kind!=='turnaround';$('homage-panel').hidden=scene?.kind!=='homage';
 if(event)track('story_seen',event.id,{storyId:event.id,mood:mood(state)},`story:${event.id}`);
 if(scene?.kind==='story'&&event){renderStoryFrame(frame,event);for(const [from,text] of [...event.lines,...event.choices[0].lines]){const p=document.createElement('p');p.textContent=`${from}：${text}`;$('day-story-lines').append(p);}}
 if(scene?.kind==='turnaround'){setImage($('turnaround-comic'),'./comics/event-turnaround.webp');setText('turnaround-caption',scene.turn.reversal==='profit-to-loss'?TRANSITION_COPY.profitToLoss:TRANSITION_COPY.lossToProfit);}
 if(scene?.kind==='homage'){setImage($('homage-image'),`./homage/demk-${scene.homage}.webp`);$('homage-image').alt=scene.caption;$('homage-source').href=scene.homage==='big-loss'?'http://demk.net/1.html':'http://demk.net/3.html';setText('homage-caption',scene.caption);}
 setText('day-total',yen(r.closing));setText('day-net',`今日交易 ${signed(r.net)} · 生活费 ${yen(r.livingCost||0)} · 交易累计 ${signed(tradingProfit(state))}`);
 setText('next-day',dailyContinueLabel(r));$('day-dialog').showModal();
}
function newChapter(){if(!guardProgress())return;stateGeneration++;actionBusy=false;marketClock.stop();state=enableRealtime(fresh());telemetry.setTestMode(false);voice.stop();state.runId=crypto.randomUUID();lastMood=null;orderMode='percent';orderAmount=10000;$('order-amount').value=orderAmount;stake=.5;leverage=25;stop=.5;stopPips=30;for(const d of document.querySelectorAll('dialog[open]'))d.close();$('last-trade').textContent='';render();if(state.mode==='story')showOpening();marketClock.start();scrollTo({top:0,behavior:fullMotion?'smooth':'instant'});}
function showProp(id,confirmed=false){
  if(actionBusy||!tradingOpen(state)&&!['day_end','resting'].includes(state.phase))return;
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

  }else{
    const total=tradeTotals(result.trades||[result.trade]);setText('prop-amount',result.trade?signed(total.pnl):result.cost?`−${yen(result.cost)}`:spec.caption);soundEffect(id==='mochiko'?'defend':'exhaust',{rate:1.1});
  }
  motion.animate($('prop-dialog'),[{opacity:0,transform:'translateY(30px) scale(.85) rotate(-3deg)'},{opacity:1,transform:'translateY(0) scale(1.03) rotate(1deg)'},{opacity:1,transform:'none'}],{duration:600});
  motion.animate(document.querySelector('.prop-envelope'),[{transform:'rotate(-12deg) scale(.6)'},{transform:'rotate(8deg) scale(1.12)'},{transform:'rotate(-5deg) scale(1)'}],{duration:800});
}
$('stake-slider').oninput=()=>{stake=Number($('stake-slider').value)/100;orderMode='percent';render();};
function selectOrderAmount(value){orderAmount=clampOrderAmount(value,maxOrderAmount());$('order-amount').value=orderAmount;render();}
for(const b of document.querySelectorAll('[data-amount-step]'))b.onclick=()=>selectOrderAmount((Number($('order-amount').value)||0)+Number(b.dataset.amountStep));
function maxOrderAmount(){return Math.max(orderPreview(state,selectedOrder('long')).maxMargin||0,orderPreview(state,selectedOrder('short')).maxMargin||0);}
$('amount-max').onclick=()=>selectOrderAmount(maxOrderAmount());
$('amount-slider').oninput=()=>selectOrderAmount(sliderOrderAmount(Number($('amount-slider').value),maxOrderAmount()));
$('amount-random').onclick=()=>{selectOrderAmount(randomOrderAmount(maxOrderAmount()));setText('amount-random-status',`随机选择 ${yen(orderAmount)}`);};
for(const b of document.querySelectorAll('[data-stake],[data-leverage],[data-stop]'))b.addEventListener('click',()=>{if(b.dataset.stake){stake=Number(b.dataset.stake);orderMode='percent';}if(b.dataset.leverage)leverage=Number(b.dataset.leverage);if(b.dataset.stop)stop=Number(b.dataset.stop);render();});
for(const b of document.querySelectorAll('[data-order-mode]'))b.onclick=()=>{orderMode=b.dataset.orderMode;render();};
$('order-amount').oninput=()=>{orderAmount=Number($('order-amount').value);render();};
$('order-amount').onchange=()=>{if(Number.isFinite(orderAmount))selectOrderAmount(orderAmount);};
$('position-list').onclick=e=>{const detail=e.target.closest('[data-position-detail]');if(detail){openPositionDetail(detail.dataset.positionDetail);return;}const b=e.target.closest('[data-position-action]');if(b&&!b.disabled)sendAction(b.dataset.positionAction,b.dataset.positionId,b);};
for(const b of document.querySelectorAll('[data-stop-pips]'))b.onclick=()=>{stopPips=b.dataset.stopPips==='none'?null:Number(b.dataset.stopPips);stop=stopPips===null?1:.5;render();};
for(const type of ['long','short','wait','hold','half','close'])$(type).addEventListener('click',()=>sendAction(type));
for(const b of document.querySelectorAll('[data-speed]'))b.addEventListener('click',()=>{speed=Number(b.dataset.speed);for(const option of document.querySelectorAll('[data-speed]'))option.setAttribute('aria-pressed',String(option===b));marketStatus();marketClock.reschedule();});
$('skip').addEventListener('click',()=>{if(tradingOpen(state)){state.marketPaused=!state.marketPaused;render();marketClock.reschedule();}});
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
$('next-day').onclick=()=>{try{if(state.phase==='resting'){const event=pendingStory(state);if(event){const result=chooseStory(state,event.choices[0].id);for(const id of result.unlocked)track('item_unlocked',id,{itemId:id,storyId:result.event.id});track('story_choice',result.event.id,{storyId:result.event.id,choiceId:result.choice.id});}}$('day-dialog').close();render();continueScenes();}catch(error){toast(error.message);}};
$('settle-day').onclick=()=>{try{audio.unlock();settleDay(state);track('settlement_confirm','close',{day:state.day},`settle:${state.day}`);for(const t of state.dayReport.trades)trackExit(t);track('day_end','day',{mood:mood(state),equityBucket:capitalBucket(equity(state)),pnlBucket:pnlBucket(state.dayReport.net)},`day-end:${state.day}`);render();showDaySettlement();}catch(error){toast(error.message);}};
$('retire').onclick=()=>{try{finishCampaign(state,'walkaway');render();continueScenes();}catch(error){toast(error.message);}};
$('ending-restart').onclick=newChapter;
$('day-review').onclick=()=>showDayDialog();
$('day-dialog').addEventListener('cancel',e=>{e.preventDefault();$('next-day').click();});
function pauseAuditions(){for(const player of $('voice-list').querySelectorAll('audio'))player.pause();}
bindMarketLifecycle({clock:marketClock,
 onSuspend:()=>{persist();audio.pause();voice.stop();pauseAuditions();marketStatus();},
 onResume:()=>{if(!guardProgress())return false;audio.sync();marketStatus();}
});
function replaceDeveloperState(next){
  stateGeneration++;marketClock.stop();state=enableRealtime(next);state.runId=state.developer?.edited?crypto.randomUUID():(state.runId||crypto.randomUUID());telemetry.setTestMode(!!state.developer?.edited);voice.stop();lastMood=null;actionBusy=false;
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  $('last-trade').textContent='';render();continueScenes();marketClock.start();
}
function openDeveloper(){
  state.marketPaused=true;marketClock.stop();render();
  const values=developerValues(state);for(const [key,value] of Object.entries(values))$('dev-'+key).value=value;
  $('dev-auto-sanity').checked=state.developer?.edited&&state.developer.sanityOverride===null;
  $('dev-sanity').disabled=$('dev-auto-sanity').checked;
  for(const option of $('dev-phase').options)option.disabled=option.hidden=state.mode==='endless'&&option.value!=='decision';
  if(state.mode==='endless')$('dev-phase').value='decision';
  $('developer-restore').disabled=!storage.getItem(developerBackupKey);
  setText('developer-error',state.position?'请先平仓并等行情暂停，再应用数据。':'');$('developer-dialog').showModal();
}
$('developer-open').onclick=openDeveloper;$('ending-developer').onclick=openDeveloper;
$('dev-auto-sanity').onchange=()=>{$('dev-sanity').disabled=$('dev-auto-sanity').checked;};
$('developer-form').onsubmit=e=>{
  e.preventDefault();try{
    if(actionBusy)throw Error('请等交易操作完成');
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
  const b=row.querySelector('[data-risk-action="topup"]'),p=positionsOf(state).find(p=>p.id===risk.positionId);b.hidden=risk.kind!=='stop'||Object.hasOwn(p||{},'stopPips');b.disabled=!risk.canTopUp||actionBusy||!['decision','playing'].includes(state.phase);
  row.querySelector('[data-risk-action="exit"]').disabled=actionBusy||!['decision','playing'].includes(state.phase);
 }
 if($('margin-dialog').open&&!positionsOf(state).some(p=>p.id===marginPositionId)){setText('margin-error','该持仓已经平仓，无需追加。');$('margin-confirm').disabled=true;}
}
$('risk-alerts').onclick=e=>{const b=e.target.closest('[data-risk-action]');if(!b||b.disabled)return;const id=b.dataset.riskPosition;
 if(b.dataset.riskAction==='topup'){marginPositionId=id;const p=positionsOf(state).find(p=>p.id===id);if(!p)return;const max=Math.floor(accountMetrics(state).availableMargin);$('margin-amount').max=max;$('margin-amount').value=Math.min(max,1000);$('margin-confirm').disabled=false;setText('margin-error','');setText('margin-description',`#${id} · 可追加 ${yen(max)}。现金转为本单抵押，名义仓位不变，止损容许金额随保证金增加；账户保证金率不变。行情继续播放。`);$('margin-dialog').showModal();}
 else try{const r=rescueClose(state,id);trackExit(r.trade);render();toast(`#${id} 平仓 ${signed(r.trade.pnl)}`,r.trade.pnl>=0?'gain':'loss');}catch(error){toast(error.message,'loss');}
};
$('margin-max').onclick=()=>{$('margin-amount').value=Math.floor(accountMetrics(state).availableMargin);};
$('margin-confirm').onclick=()=>{try{const r=topUpMargin(state,marginPositionId,Number($('margin-amount').value));$('margin-dialog').close();render();toast(`#${marginPositionId} 已追加 ${yen(r.amount)}`);}catch(error){setText('margin-error',error.message);}};
$('loan-open').onclick=()=>{const loan=state.loan;setText('loan-summary',`欠款 ${yen(loan.outstanding)} · 剩余额度 ${yen(Math.max(0,loan.limit-loan.outstanding))} · 日利息 0.05%（借 ¥10,000，每日 ¥5）。未付利息计入欠款。`);setText('loan-error','');$('loan-borrow').disabled=loan.outstanding>=loan.limit;$('loan-repay').disabled=loan.outstanding<=0;$('loan-dialog').showModal();};
for(const [id,action] of [['loan-borrow',borrowNetwork],['loan-repay',repayNetwork]])$(id).onclick=()=>{try{action(state,Number($('loan-amount').value));$('loan-dialog').close();render();}catch(error){setText('loan-error',error.message);}};
let rankingMode='total',rankingGameMode=state.mode||'story',rankingSort='survival',rankingRequest=0,rankingBusy=false;
function rankingEligibility(){try{const r=completedLeaderboardScore(state);setText('ranking-eligibility',`${r.gameMode==='endless'?'操盘':'剧情'} · 存活 ${r.daysSurvived} 天 · 可提交本局成绩。`);$('ranking-publish').disabled=rankingBusy;return true;}catch(error){setText('ranking-eligibility',error.message);$('ranking-publish').disabled=true;return false;}}
const percent=value=>Number.isFinite(value)?(value*100).toFixed(2)+'%':'—';
async function readRanking(){const request=++rankingRequest;setText('ranking-status','正在读取…');$('ranking-table').replaceChildren();for(const b of document.querySelectorAll('[data-ranking-game]'))b.setAttribute('aria-pressed',String(b.dataset.rankingGame===rankingGameMode));
 try{const data=await leaderboard.read({mode:rankingMode,gameMode:rankingGameMode,sort:rankingSort,limit:20});if(request!==rankingRequest)return;
  if(!data.rows.length){setText('ranking-status','这个模式还没有提交的成绩。');return;}
  const box=$('ranking-table');for(const r of data.rows){const card=document.createElement('article');card.className='ranking-entry';const header=document.createElement('div');header.className='ranking-entry-head';const name=document.createElement('b');name.textContent=`${r.rank}. ${r.name}`;const days=document.createElement('strong');days.textContent=`存活 ${r.daysSurvived} 天`;header.append(name,days);card.append(header);const hero=document.createElement('div');hero.className='ranking-return';hero.textContent=percent(r.returnRate);const sub=document.createElement('span');sub.textContent='总收益率';hero.prepend(sub);hero.classList.add(r.returnRate>=0?'positive':'negative');card.append(hero);const grid=document.createElement('div');grid.className='ranking-metrics';for(const [label,value] of [['日均收益率',percent(r.dailyReturnRate)],['总收益',signed(r.totalProfit)],['最大盈利',r.maxProfit===null?'—':signed(r.maxProfit)],['最大亏损',r.maxLoss===null?'—':signed(r.maxLoss)],['最大回撤',percent(r.maxDrawdown)]]){const cell=document.createElement('div'),key=document.createElement('span'),val=document.createElement('b');key.textContent=label;val.textContent=value;cell.append(key,val);grid.append(cell);}card.append(grid);box.append(card);}setText('ranking-status',`${rankingGameMode==='endless'?'操盘':'剧情'}模式 · ${data.rows.length} 位玩家`);
 }catch(error){if(request===rankingRequest)setText('ranking-status',error.message+'，可点击重新读取。');}
}
$('leaderboard-open').onclick=()=>{rankingGameMode=state.mode||'story';rankingEligibility();$('leaderboard-dialog').showModal();void readRanking();};
$('leaderboard-dialog').addEventListener('close',()=>{rankingRequest++;continueScenes();});
for(const b of document.querySelectorAll('[data-ranking-game]'))b.onclick=()=>{rankingGameMode=b.dataset.rankingGame;void readRanking();};
$('ranking-sort').onchange=()=>{rankingSort=$('ranking-sort').value;void readRanking();};
$('ranking-share').onclick=()=>openShare('ranking');
$('ranking-retry').onclick=()=>void readRanking();
$('ranking-form').onsubmit=async e=>{e.preventDefault();if(rankingBusy||!rankingEligibility())return;rankingBusy=true;rankingEligibility();setText('ranking-status','正在提交…');try{await leaderboard.publish(structuredClone(state),{alias:$('ranking-name').value.trim()});await readRanking();setText('ranking-status','提交成功。重复提交同一条记录不会重复计分。');}catch(error){setText('ranking-status',error.message);}finally{rankingBusy=false;rankingEligibility();}};

for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{audio.unlock();voice.unlock();},{once:true});
setText('storage-warning',UI_COPY.storageWarning);setText('share-hint',UI_COPY.shareHint);
for(const text of UI_COPY.help){const p=document.createElement('p');p.textContent=text;$('help-copy').append(p);}
render();if(guardProgress()){if(firstVisit)$('mode-dialog').showModal();else if(state.mode==='story'&&!state.openingSeen)showOpening();else continueScenes();}
new MutationObserver(()=>{marketStatus();marketClock.reschedule();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});marketClock.start();

function renderTools(){
 const box=$('tool-list');const discovered=Object.entries(PROPS).filter(([id])=>itemDiscovered(state,id)&&(state.mode!=='endless'||!['energy','noodles','father'].includes(id)));
 $('inventory-empty').hidden=!!discovered.length;setText('inventory-empty',UI_COPY.inventoryEmpty);setText('inventory-count',discovered.length?discovered.length+' 件':'');
 const discoveredIds=new Set(discovered.map(([id])=>id));for(const b of [...box.children])if(!discoveredIds.has(b.dataset.prop))b.remove();
 for(const [id,spec] of discovered){const unlocked=itemUnlocked(state,id),used=id==='father'?state.fatherUsed:state.itemsUsed?.[id];let b=[...box.children].find(el=>el.dataset.prop===id);if(!b){b=document.createElement('button');b.id=id;b.dataset.prop=id;b.append(document.createElement('b'),document.createElement('small'));box.append(b);}const title=b.firstElementChild,small=b.lastElementChild;title.textContent=spec.name;small.textContent=(unlocked?used?'已使用 · ':'':'未解锁 · ')+spec.caption;b.classList.toggle('item-locked',!unlocked);b.title=spec.copy;b.disabled=actionBusy||!unlocked||used||!(id==='father'?(tradingOpen(state)||['day_end','resting'].includes(state.phase)):tradingOpen(state))||accountMetrics(state).availableMargin<(spec.cost||0);box.append(b);}
 $('family-panel').hidden=state.mode==='endless'||!state.fatherUsed;setText('family-debt',`父亲存款欠款 ${yen(state.family.outstanding)} · 已归还 ${yen(state.family.repaid)}`);$('repay-open').disabled=!tradingOpen(state)&&!['day_end','resting'].includes(state.phase)||state.family.outstanding<=0||accountMetrics(state).availableMargin<1;
 $('bankrupt-rescue').hidden=!state.family.unlocked||state.fatherUsed;
 $('loan-panel').hidden=!state.loan?.discovered;setText('loan-state',state.loan?.unlocked?'已开放':'未解锁');setText('loan-effect',`借款上限 ${yen(state.loan?.limit||300000)} · 日利息 0.05% · 当前欠款 ${yen(state.loan?.outstanding||0)}`);$('loan-open').disabled=!state.loan?.unlocked||!tradingOpen(state)&&!['day_end','resting'].includes(state.phase)||actionBusy;
}
function continueScenes(){
  if(!guardProgress())return;
  if(state.realtime&&state.phase==='closing'){settleDay(state);track('settlement_confirm','close',{day:state.day},`settle:${state.day}`);for(const t of state.dayReport.trades)trackExit(t);render();}

 if(['playing','closing'].includes(state.phase)||document.querySelector('dialog[open]')||document.querySelector('.settlement-dialog'))return;
 if(state.mode==='story'&&!state.openingSeen){showOpening();return;}
 if(state.phase==='resting'&&state.dayReport?.day===state.day&&state.story?.presentedDay!==state.day){showDayDialog();return;}
 const event=pendingStory(state);if(event){showStory(event);return;}
 if(state.phase==='day_end')showDaySettlement();else if(state.phase==='ending')showEnding();else if(state.phase==='resting'){track('rest_end','night',{day:state.day},`rest-end:${state.day}`);nextDay(state);render();continueScenes();}else telemetry.view({screen:'trading',run:state.runId,day:state.day});
}
function showCaptions(id,lines){$(id).replaceChildren();lines.forEach((line,i)=>{const p=document.createElement('p');if(line)p.textContent=`${i+1} / ${line}`;$(id).append(p);});}
function renderStoryFrame(frame,event){
 const father=event.key.startsWith('father')||event.key.startsWith('repay'),comic=father?'event-father':event.key==='friendStudy'?'event-friend':null;
 frame.hidden=!comic;frame.className='story-comic-frame revealed-comic';frame.replaceChildren();
 if(comic){const captions=comicCaptions(father?'father':'friend',state);const panels=father?[0,...(state.fatherUsed?[1]:[]),...(state.family.discovered?[2]:[]),...(state.family.lastRepayment?[3]:[])]:[0,1,2,3];frame.classList.toggle('single-panel',panels.length===1);
  for(const index of panels){const figure=document.createElement('figure'),crop=document.createElement('div'),img=document.createElement('img'),caption=document.createElement('figcaption');crop.className='revealed-comic-crop';setImage(img,`./comics/${comic}.webp`);img.alt=`${event.title} · 第 ${index+1} 格`;img.style.left=(index%2?-100:0)+'%';img.style.top=(index>=2?-100:0)+'%';crop.append(img);figure.append(crop);if(captions[index]){caption.textContent=captions[index];figure.append(caption);}frame.append(figure);}
 }
}
function showStory(event){
 telemetry.view({screen:'story',run:state.runId,day:state.day});track('story_seen',event.id,{storyId:event.id,mood:mood(state)},`story:${event.id}`);setText('story-title',event.title);
 renderStoryFrame($('story-comic-frame'),event);$('story-captions').hidden=true;
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
$('voice-replay').onclick=()=>{voice.unlock();void voice.play((state.lastReaction?.day===state.day?state.lastReaction?.reversal:null)||(mood(state)==='stunned'?'blank':mood(state)),state.speech?.id);};

function showEnding(){const e=state.ending;track('ending_seen',e.id,{kind:e.id,equityBucket:capitalBucket(e.equity),sanityBucket:bucket(e.sanity)},`ending:${e.id}`);const names={million:'两千万回来了',walkaway:'主动离场',broke:'账户退场',crisis:'最后的坠落'};setText('ending-title',names[e.id]);setText('ending-summary',`第 ${e.day} 天 · 账户 ${yen(e.equity)} · 承受力 ${e.sanity}/100`);setImage($('ending-comic'),`./comics/ending-${e.id}.webp`);$('ending-comic').alt=names[e.id]+'的原创四格漫画';showCaptions('ending-captions',comicCaptions(e.id,state));const before=approvedQuote('Q16',state);setText('ending-before',e.id==='crisis'?before?.text||'':'');$('ending-dialog').showModal();}
