import {runPerformance} from './performance.js?v=0903e0cb2ec6498c86db15a635dd58970cd555e4';
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const amount=n=>(n<0?'−':'')+'¥'+Math.abs(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':'')+amount(n);
const records=s=>(s.history||[]).filter(t=>t.type!=='open'&&Number.isFinite(t.pnl));
// Completed-trade net P/L, live mark-to-market P/L and debt are deliberately separate.
export function buildShareSummary(state={},options={}) {
  const positions=Array.isArray(state.positions)?state.positions:state.position?[state.position]:[];
  const floating=finite(options.unrealized,positions.reduce((sum,p)=>sum+finite(p.unrealized,finite(p.notional,finite(p.margin)*finite(p.leverage))*finite(p.direction)*(finite(state.price)/finite(p.entry,1)-1)),0));
  const realized=records(state), day=Math.max(1,Math.floor(finite(state.day,1))), candidate=options.report===null?null:options.report||state.dayReport;
  const report=['day_end','resting','ending'].includes(state.phase)&&candidate?.day===day?candidate:null;
  const eq=finite(options.equity,Math.max(0,finite(state.cash)+finite(state.reserve)+positions.reduce((sum,p)=>sum+finite(p.margin),0)+floating));
  const performance=runPerformance(state),total=performance.totalProfit, daily=realized.filter(t=>t.day===day).reduce((sum,t)=>sum+t.pnl,0);
  const totalFees=finite(state.feesPaid,finite(state.totalFees,(state.history||[]).reduce((sum,t)=>sum+(t.type==='open'?finite(t.fee):finite(t.closeFee,finite(t.fee))),0)));
  const wins=realized.filter(t=>t.pnl>0).length;
  return {title:'FX韭留美',day,kind:options.variant==='ranking'?'大洋榜战绩':state.mode==='endless'?'操盘战报':report?'收盘战报':'盘中战报',equity:eq,...performance,
    realizedProfit:total,dayRealizedProfit:daily,unrealized:floating,
    tradingProfit:finite(options.tradingProfit,eq-100000-finite(state.externalFunding)+finite(state.expenses)-finite(state.developer?.profitOffset)),
    dayTradingProfit:report?finite(report.net):null,
    feesPaid:totalFees, debt:Math.max(0,finite(state.family?.outstanding)+finite(state.loan?.outstanding)),livingCost:finite(report?.livingCost),funding:finite(state.externalFunding),
    tradeCount:performance.closedTrades,winRate:realized.length?Math.round(wins/realized.length*100):null,
    positionCount:positions.length,achievementCount:Math.max(0,Math.floor(finite(options.achievementCount))),
    moodLabel:options.moodLabel||'今日心情',sanity:Math.round(finite(state.sanity,50)),edited:!!state.developer?.edited,
    gameUrl:String(options.gameUrl||globalThis.location?.href||''),
    equityTrail:(state.equityTrail||[]).filter(Number.isFinite).slice(-48),
    trailLabel:'交易本金趋势 · 已扣净借入，加回道具支出',
    caption:''};
}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){let line='',count=0;for(const char of String(text)){if(ctx.measureText(line+char).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;if(++count>=maxLines)return y;line=char;}else line+=char;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
const fonts={body:'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'};
async function portraitImage(url,doc){
 if(!url)return null;const ImageClass=doc.defaultView?.Image||globalThis.Image;if(!ImageClass)return null;
 return new Promise(resolve=>{const image=new ImageClass();let timer;const done=value=>{clearTimeout(timer);image.onload=image.onerror=null;resolve(value);};image.onload=()=>done(image);image.onerror=()=>done(null);timer=setTimeout(()=>done(null),5000);image.src=url;});
}
export async function createShareCard(state,options={}) {
 const doc=options.document||globalThis.document;if(!doc)throw Error('战报图片需要浏览器画布');const canvas=doc.createElement('canvas');canvas.width=1080;canvas.height=1480;const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法生成战报图片');
 const s=buildShareSummary(state,options),ink='#282431',muted='#876f7f',pink='#f16f9f',darkPink='#ba3e78',green='#198c67',red='#c34179',line='#e7cbd9';
 ctx.fillStyle='#fff7fb';ctx.fillRect(0,0,1080,1480);ctx.fillStyle=pink;ctx.fillRect(0,0,1080,18);
 const font=(size,weight=500)=>ctx.font=`${weight} ${size}px ${fonts.body}`;
 const label=(text,x,y,size=20,color=muted)=>{font(size);ctx.fillStyle=color;ctx.fillText(String(text),x,y);};
 const num=(text,x,y,size=32,color=ink,maxWidth=1032-x)=>{font(size,800);while(size>18&&ctx.measureText(String(text)).width>maxWidth){size--;font(size,800);}ctx.fillStyle=color;ctx.fillText(String(text),x,y);};
 const rule=y=>{ctx.strokeStyle=line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(1032,y);ctx.stroke();};
 num('FX韭留美',48,87,42);label(`${s.mode==='endless'?'操盘 · 无尽':'剧情模式'} / ${s.kind}`,48,129,23,darkPink);if(s.edited)label('开发测试数据',770,85,22,red);
 const image=await portraitImage(options.portraitUrl,doc);ctx.fillStyle='#ffe0ed';ctx.fillRect(48,169,178,178);
 if(image){ctx.save();ctx.beginPath();ctx.rect(48,169,178,178);ctx.clip();const scale=Math.max(178/image.naturalWidth,178/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,48+(178-w)/2,169,w,h);ctx.restore();}else num('久留美',66,266,28,darkPink);
 num(s.moodLabel,252,229,36,darkPink);label(`心理承受力 ${s.sanity} / 100`,252,275,22);label(`已存活 ${s.daysSurvived} 天`,252,319,24,ink);label(`第 ${s.day} 个模拟日`,772,319,21);
 rule(375);label('总收益率',48,425,24);num((s.returnRate>=0?'+':'')+(s.returnRate*100).toFixed(2)+'%',48,512,82,s.returnRate>=0?green:red);
 label('账户权益',720,429,23);num(amount(s.equity),720,491,40);label(`已平仓 ${s.tradeCount} 笔`,720,536,22);
 const metrics=[['日均收益率',(s.dailyReturnRate*100).toFixed(2)+'%'],['交易总收益',signed(s.realizedProfit)],['最大盈利',signed(s.maxProfit)],['最大亏损',signed(s.maxLoss)],['最大回撤',(s.maxDrawdown*100).toFixed(2)+'%'],['当前浮动盈亏',signed(s.unrealized)]];
 metrics.forEach(([key,value],i)=>{const x=48+(i%3)*334,y=592+Math.floor(i/3)*102;label(key,x,y,21);num(value,x,y+42,30,ink,310);});rule(758);
 label('交易本金曲线',48,804,23);const trail=s.equityTrail.length>1?s.equityTrail:[100000,100000+s.realizedProfit],lo=Math.min(...trail),range=Math.max(1000,Math.max(...trail)-lo);
 for(let i=0;i<4;i++){ctx.strokeStyle='#f0dfe7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(48,833+i*40);ctx.lineTo(1032,833+i*40);ctx.stroke();}
 ctx.strokeStyle=darkPink;ctx.lineWidth=5;ctx.beginPath();trail.forEach((v,i)=>{const x=48+i/(trail.length-1)*984,y=956-(v-lo)/range*120;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();rule(987);
 num(options.variant==='ranking'?'本局战绩':'最近成交',48,1033,27);
 if(options.variant==='ranking'){
   label('净交易收益 · 开平费用已扣除',48,1092,25,ink);label('借款、消费、生活费与浮盈不计入收益率',48,1139,23);label(`累计手续费 ${amount(s.feesPaid)}`,48,1200,23);label(`未还借款 ${amount(s.debt)}`,48,1244,23);
 }else{
   const rows=records(state).slice(-4);if(!rows.length)label('暂无已平仓订单',48,1100,23);
   rows.forEach((t,i)=>{const y=1094+i*48;label('#'+(t.positionId||i+1),48,y,20,ink);label((t.direction===1?'日元多单':'日元空单')+' · '+Number(finite(t.leverage).toFixed(1))+'×',310,y,22,ink);ctx.textAlign='right';num(signed(t.pnl),1032,y,26,t.pnl>=0?green:red);ctx.textAlign='left';});
   label(`今日生活费 ${amount(s.livingCost)} · 累计手续费 ${amount(s.feesPaid)}`,48,1310,22);
 }
 rule(1346);label('模拟交易游戏',48,1394,20);font(18);ctx.fillStyle=muted;wrap(ctx,s.gameUrl,320,1394,710,25,2);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('战报图片生成失败')),'image/png'));return{blob,url:URL.createObjectURL(blob),filename:`FX韭留美-${s.mode==='endless'?'操盘':'剧情'}-第${s.day}天-${s.kind}${s.edited?'-测试':''}.png`,summary:s};
}
