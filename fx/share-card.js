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
  const total=realized.reduce((sum,t)=>sum+t.pnl,0), daily=realized.filter(t=>t.day===day).reduce((sum,t)=>sum+t.pnl,0);
  const totalFees=finite(state.feesPaid,finite(state.totalFees,(state.history||[]).reduce((sum,t)=>sum+(t.type==='open'?finite(t.fee):finite(t.closeFee,finite(t.fee))),0)));
  const wins=realized.filter(t=>t.pnl>0).length;
  return {title:'FX韭留美',day,kind:report?'收盘战报':'盘中战报',equity:eq,
    realizedProfit:total,dayRealizedProfit:daily,unrealized:floating,
    tradingProfit:finite(options.tradingProfit,eq-100000-finite(state.externalFunding)+finite(state.expenses)-finite(state.developer?.profitOffset)),
    dayTradingProfit:report?finite(report.net):null,
    feesPaid:totalFees, debt:Math.max(0,finite(state.family?.outstanding)+finite(state.loan?.outstanding)),livingCost:finite(report?.livingCost),funding:finite(state.externalFunding),
    tradeCount:realized.length,winRate:realized.length?Math.round(wins/realized.length*100):null,
    positionCount:positions.length,achievementCount:Math.max(0,Math.floor(finite(options.achievementCount))),
    moodLabel:options.moodLabel||'今日心情',sanity:Math.round(finite(state.sanity,50)),edited:!!state.developer?.edited,
    gameUrl:String(options.gameUrl||globalThis.location?.href||''),
    equityTrail:(state.equityTrail||[]).filter(Number.isFinite).slice(-48),
    trailLabel:'交易本金趋势 · 已扣净借入，加回道具支出',
    caption:''};
}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){let line='',count=0;for(const char of String(text)){if(ctx.measureText(line+char).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;if(++count>=maxLines)return y;line=char;}else line+=char;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
const fonts={body:'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'};
export async function createShareCard(state,options={}) {
 const doc=options.document||globalThis.document;if(!doc)throw Error('战报图片需要浏览器画布');const canvas=doc.createElement('canvas');canvas.width=1080;canvas.height=1320;const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法生成战报图片');
 const s=buildShareSummary(state,options),ink='#e4edf1',muted='#8b9ba8',green='#7fddbb',red='#fa91aa';
 ctx.fillStyle='#111b23';ctx.fillRect(0,0,1080,1320);
 const font=(size,weight=500)=>ctx.font=`${weight} ${size}px ${fonts.body}`;
 const label=(text,x,y,size=20,color=muted)=>{font(size);ctx.fillStyle=color;ctx.fillText(text,x,y);};
 const num=(text,x,y,size=32,color=ink)=>{font(size,750);ctx.fillStyle=color;ctx.fillText(text,x,y);};
 const rule=y=>{ctx.strokeStyle='#33444f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(1032,y);ctx.stroke();};
 num('FX韭留美',48,82,40);label('JPY / USD',808,80,26,green);label(`第 ${s.day} 天 · ${s.kind}${s.edited?' · 开发测试数据':''}`,48,126,21);rule(151);
 label('账户权益 / EQUITY',48,200);num(amount(s.equity),48,274,70);label('日元保证金账户',800,201,18);
 const metrics=[['当日平仓净收益',s.dayTradingProfit??s.dayRealizedProfit],['累计平仓净收益',s.realizedProfit],['未平仓浮动损益',s.unrealized]];
 metrics.forEach(([key,val],i)=>{const x=48+i*334;label(key,x,335);num(signed(val),x,385,32,val>=0?green:red);});rule(420);
 label('交易本金曲线',48,466,21);const trail=s.equityTrail.length>1?s.equityTrail:[100000,s.equity-s.funding+finite(state.expenses)];const lo=Math.min(...trail),range=Math.max(1000,Math.max(...trail)-lo);
 for(let i=0;i<4;i++){ctx.strokeStyle='#263642';ctx.beginPath();ctx.moveTo(48,501+i*45);ctx.lineTo(1032,501+i*45);ctx.stroke();}
 ctx.strokeStyle=trail.at(-1)>=trail[0]?green:red;ctx.lineWidth=4;ctx.beginPath();trail.forEach((v,i)=>{const x=48+i/(trail.length-1)*984,y=638-(v-lo)/range*135;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
 label('净借入已剔除，生活费与消费已加回',48,681,17);rule(709);
 num('最近成交 / CLOSED ORDERS',48,752,23);const cols=[48,194,408,690,1032],labels=['订单','方向 / 杠杆','成交价格','手续费','净收益'];labels.forEach((v,i)=>{ctx.textAlign=i===4?'right':'left';label(v,cols[i],799,17);});ctx.textAlign='left';
 const rows=records(state).slice(-5);if(!rows.length)label('暂无已平仓订单',48,856,21);
 rows.forEach((t,i)=>{const y=846+i*43;label('#'+(t.positionId||i+1),48,y,18,ink);label((t.direction===1?'买入':'卖出')+' '+Number(finite(t.leverage).toFixed(1))+'×',194,y,18,ink);label(finite(t.entry).toFixed(6)+' → '+finite(t.exit).toFixed(6),408,y,17,ink);label(amount(finite(t.openFee)+finite(t.closeFee)),690,y,18,muted);ctx.textAlign='right';num(signed(t.pnl),1032,y,20,t.pnl>=0?green:red);ctx.textAlign='left';});rule(1068);
 const footer=[['累计手续费',amount(s.feesPaid)],['今日生活费',amount(s.livingCost)],['未还借款',amount(s.debt)]];footer.forEach(([k,v],i)=>{const x=48+i*334;label(k,x,1111,18);num(v,x,1153,27);});
 label(`已平仓 ${s.tradeCount} 笔 · 胜率 ${s.winRate===null?'—':s.winRate+'%'} · 持仓 ${s.positionCount} 单`,48,1201,19);rule(1227);label('模拟交易游戏',48,1271,18);font(17);ctx.fillStyle=muted;wrap(ctx,s.gameUrl,350,1271,682,24,2);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('战报图片生成失败')),'image/png'));return{blob,url:URL.createObjectURL(blob),filename:`FX韭留美-第${s.day}天${s.edited?'-测试':''}-战报.png`,summary:s};
}
