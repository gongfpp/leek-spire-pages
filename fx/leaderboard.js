import {runPerformance} from './performance.js?v=6f70e0c664d7edef1bfc803c4656a01056b1edc6';
import {BEATS_PER_DAY,CANDLES_PER_BEAT} from './engine.js?v=6f70e0c664d7edef1bfc803c4656a01056b1edc6';
// Optional public score publishing is independent of anonymous usage statistics.
// Only publish() writes; reading the board never creates a run or an identifier.
const BACKEND = 'https://leek-spire.gongfpp.chatgpt.site';
const ID = /^[a-zA-Z0-9_-]{8,80}$/;
const defaultStorage = () => {try{return globalThis.localStorage;}catch{return null;}};
const get = (storage,key) => {try{return storage?.getItem(key);}catch{return null;}};
const put = (storage,key,value) => {try{storage?.setItem(key,value);}catch{}};
const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function normalizeLeaderboardAlias(value='') {
  if(typeof value !== 'string') throw new Error('昵称最多 16 字，可用中英文、数字、空格、点、横线和下划线');
  const alias=value.normalize('NFKC').trim().replace(/\s+/g,' ');
  if([...alias].length>16 || !/^[\p{L}\p{N} ._-]*$/u.test(alias)) throw new Error('昵称最多 16 字，可用中英文、数字、空格、点、横线和下划线');
  return alias;
}
export function completedLeaderboardScore(state) {
  const report=state?.dayReport,gameMode=state?.mode??'story';
  if(state?.developer?.edited) throw new Error('开发者测试局不能提交排行榜');
  if(!['story','endless'].includes(gameMode))throw new Error('游戏模式不正确');
  if(!Array.isArray(state?.history))throw new Error('本局成绩数据不完整');
  if(gameMode==='story'&&(!report||!Number.isInteger(report.day)||report.day<1||report.day>state.day||!Array.isArray(report.trades)||!report.trades.length))throw new Error('完成至少一笔交易并收盘后，可以提交成绩');
  const day=gameMode==='story'?report.day:state.day;
  const daily=gameMode==='story'?report.trades:state.history.filter(t=>t.day===day),all=state.history.filter(trade=>trade.day<=day);
  if([...daily,...all].some(trade=>!Number.isFinite(trade.pnl)))throw new Error('本局成绩数据不完整');
  const dayProfit=cents(daily.reduce((sum,trade)=>sum+trade.pnl,0));
  // Preserve historical calls from pre-mode saves without inventing extrema.
  if(!state.mode&&!state.performance){
    if(!all.length||all.length>20000)throw new Error('本局成绩数据不完整');
    const totalProfit=cents(all.reduce((sum,trade)=>sum+trade.pnl,0));
    if(Math.abs(dayProfit)>1e10||Math.abs(totalProfit)>1e10)throw new Error('本局成绩超过排行榜范围');
    return {day,dayProfit,totalProfit,closedTrades:all.length};
  }
  // A saved report is a snapshot; current-day beat/bonus rounds must never
  // shorten yesterday's elapsed time or alter its daily return rate.
  const reportBeat=gameMode==='story'?(report.beat??((report.completedDays??0)>=day?BEATS_PER_DAY:Math.max(0,Math.min(BEATS_PER_DAY,((report.completedCandles??day*16)-(day-1)*16)/CANDLES_PER_BEAT)))):0;
  const performance=gameMode==='story'?runPerformance({...state,history:all,performance:report.performance,day,beat:reportBeat,bonusBeats:report.bonusBeats??0,phase:'day_end',pending:null,completedDays:report.completedDays,completedCandles:report.completedCandles}):runPerformance(state);
  const closedTrades=performance.closedTrades??all.length;
  if(!closedTrades)throw new Error(gameMode==='endless'?'完成至少一笔平仓交易后，可以提交成绩':'本局成绩数据不完整');
  if(!Number.isFinite(performance.totalProfit)||Math.abs(performance.totalProfit)>1e10||Math.abs(dayProfit)>1e10)throw new Error('本局成绩超过排行榜范围');
  const totalProfit=cents(performance.totalProfit),initialEquity=performance.initialEquity??state.startEquity??100000,returnRate=totalProfit/initialEquity;
  return {day,dayProfit,totalProfit,closedTrades,gameMode,initialEquity,daysSurvived:performance.daysSurvived,elapsedDays:performance.elapsedDays,returnRate,dailyReturnRate:returnRate/performance.elapsedDays,maxLoss:cents(performance.maxLoss),maxProfit:cents(performance.maxProfit),maxDrawdown:performance.maxDrawdown};
}
export function buildLeaderboardSubmission(state,{campaign=state?.runId,token,alias=''}={}) {
  if(!ID.test(campaign||''))throw new Error('本局缺少游戏标识，请重新打开游戏后再试');
  if(!/^[a-f0-9]{64}$/.test(token||''))throw new Error('本局缺少提交凭证');
  return {campaign,token,...completedLeaderboardScore(state),alias:normalizeLeaderboardAlias(alias),settled:(state?.mode??'story')==='story',developerEdited:false};
}
export class LeaderboardError extends Error {
  constructor(message,code='unavailable',status=0){super(message);this.name='LeaderboardError';this.code=code;this.status=status;}
}
export class FXLeaderboard {
  constructor(options={}) {
    this.fetch=options.fetch??globalThis.fetch?.bind(globalThis);
    this.storage=options.storage??defaultStorage();
    this.crypto=options.crypto??globalThis.crypto;
    this.navigator=options.navigator??globalThis.navigator;
    const location=options.location??globalThis.location;
    this.endpoint=options.endpoint??(location?.origin==='https://gongfpp.github.io'?BACKEND:'')+'/api/fx/leaderboard';
    this.onStatus=options.onStatus??(()=>{});this.timeout=options.timeout??10000;
    this.pending=false;this.capabilities=new Map();this.session=null;
  }
  status(value){try{this.onStatus(value);}catch{}}
  async request(path,{method='GET',data}={}) {
    if(!this.fetch||this.navigator?.onLine===false)throw new LeaderboardError('当前离线，联网后可查看或提交排行榜','offline');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeout);
    try{
      const response=await this.fetch(this.endpoint+path,{method,credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
      let result;try{result=await response.json();}catch{throw new LeaderboardError('排行榜响应不完整，请稍后重试','response',response.status);}
      if(!response.ok)throw new LeaderboardError(result?.error||'排行榜暂时不可用，请稍后重试',response.status===429?'rate-limited':response.status===409?'conflict':'rejected',response.status);
      return result;
    }catch(error){if(error instanceof LeaderboardError)throw error;throw new LeaderboardError(error?.name==='AbortError'?'排行榜连接超时，请重试':'排行榜连接失败，请检查网络后重试',error?.name==='AbortError'?'timeout':'network');}
    finally{clearTimeout(timer);}
  }
  async read({mode='daily',gameMode,sort,limit=20}={}) {
    if(!['daily','total'].includes(mode)||(gameMode!==undefined&&!['story','endless'].includes(gameMode))||(sort!==undefined&&!['survival','returnRate','dailyReturnRate','totalProfit','maxProfit'].includes(sort))||!Number.isInteger(limit)||limit<1||limit>50)throw new LeaderboardError('排行榜参数不正确','input');
    this.status({state:'loading',mode,gameMode});
    const query=new URLSearchParams({mode,limit:String(limit)});if(gameMode!==undefined)query.set('gameMode',gameMode);if(sort!==undefined)query.set('sort',sort);
    try{const result=await this.request(`?${query}`);if(!Array.isArray(result?.rows)||result.verification!=='client-submitted'||(gameMode!==undefined&&result.gameMode!==gameMode))throw new LeaderboardError('排行榜响应不完整，请稍后重试','response');this.status({state:result.rows.length?'ready':'empty',mode,gameMode});return result;}
    catch(error){this.status({state:'error',code:error.code,message:error.message});throw error;}
  }
  tokenFor(campaign) {
    const key='fx-leaderboard-capability-'+campaign;
    let token=this.capabilities.get(campaign)||get(this.storage,key);
    if(!/^[a-f0-9]{64}$/.test(token||'')){const bytes=new Uint8Array(32);this.crypto.getRandomValues(bytes);token=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');put(this.storage,key,token);}
    this.capabilities.set(campaign,token);return token;
  }
  sessionFor() {
    if(this.session)return this.session;const key='fx-leaderboard-submit-session';let session=get(this.storage,key);
    if(!ID.test(session||'')){session=this.crypto.randomUUID();put(this.storage,key,session);}return this.session=session;
  }
  async publish(state,{alias='',campaign=state?.runId}={}) {
    // Validate locally before creating any publishing identity or making a call.
    completedLeaderboardScore(state);normalizeLeaderboardAlias(alias);
    if(!ID.test(campaign||''))throw new LeaderboardError('本局缺少游戏标识，请重新打开游戏后再试','input');
    if(this.pending)throw new LeaderboardError('成绩正在提交，请稍候','pending');
    this.pending=true;this.status({state:'publishing'});
    try{
      const token=this.tokenFor(campaign),submission=buildLeaderboardSubmission(state,{campaign,token,alias});
      await this.request('/run',{method:'POST',data:{campaign,session:this.sessionFor(),token,gameMode:state?.mode??'story'}});
      const result=await this.request('',{method:'POST',data:submission});this.status({state:'published',duplicate:result.duplicate});return result;
    }catch(error){this.status({state:'error',code:error.code||'input',message:error.message});throw error;}
    finally{this.pending=false;}
  }
}
