import {assetURL} from './assets.js?v=1207f5275a4bb64847e79d8364044d9cc982a5c8';
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const amount=n=>(n<0?'−':'')+'¥'+Math.abs(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':'')+amount(n);
const records=s=>(s.history||[]).filter(t=>t.type!=='open'&&Number.isFinite(t.pnl));
// Completed-trade net P/L, live mark-to-market P/L and debt are deliberately separate.
export function buildShareSummary(state={},options={}) {
  const positions=Array.isArray(state.positions)?state.positions:state.position?[state.position]:[];
  const floating=finite(options.unrealized,positions.reduce((sum,p)=>sum+finite(p.unrealized,finite(p.margin)*finite(p.leverage)*finite(p.direction)*(finite(state.price)/finite(p.entry,1)-1)),0));
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
    feesPaid:totalFees, debt:Math.max(0,finite(state.family?.outstanding)),funding:finite(state.externalFunding),
    tradeCount:realized.length,winRate:realized.length?Math.round(wins/realized.length*100):null,
    positionCount:positions.length,achievementCount:Math.max(0,Math.floor(finite(options.achievementCount))),
    moodLabel:options.moodLabel||'今日心情',sanity:Math.round(finite(state.sanity,100)),edited:!!state.developer?.edited,
    gameUrl:String(options.gameUrl||globalThis.location?.href||''),
    equityTrail:(state.equityTrail||[]).filter(Number.isFinite).slice(-48),
    trailLabel:'交易本金趋势 · 已扣净借入，加回道具支出',
    caption:report?(daily>0?'利润已落袋，手心还没停止冒汗。':daily<0?'账单记下来。明天的我，先看这一页。':'行情走了一天，我也可以先休息。'):
      floating>0?'绿色还不是钱。平仓之前，笑容先收一半。':floating<0?'屏幕关掉了，持仓也不会停下来。':'先把风险看清楚，再决定要不要按下去。'};
}
function rounded(ctx,x,y,w,h,r=18){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){let line='',count=0;for(const char of String(text)){if(ctx.measureText(line+char).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;if(++count>=maxLines)return y;line=char;}else line+=char;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
function loadPortrait(url,timeout=4500){return new Promise(resolve=>{if(!globalThis.Image||!url)return resolve(null);const img=new Image();let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>finish(null),timeout);img.onload=()=>finish(img);img.onerror=()=>finish(null);img.src=url;});}
const fonts={body:'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'};
export async function createShareCard(state,options={}) {
  const doc=options.document||globalThis.document;if(!doc)throw Error('战报图片需要浏览器画布');
  const canvas=doc.createElement('canvas');canvas.width=1080;canvas.height=1400;const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法生成战报图片');
  const s=buildShareSummary(state,options), pink='#dd5b8e', dark='#292434', muted='#766b7e', green='#137c68', negative='#b63c61';
  ctx.fillStyle='#faf6f8';ctx.fillRect(0,0,1080,1400);ctx.fillStyle=pink;ctx.fillRect(0,0,1080,14);
  const font=(size,weight=500)=>{ctx.font=`${weight} ${size}px ${fonts.body}`;};
  font(20,750);ctx.fillStyle=muted;ctx.fillText('DAY REPORT / FX KURUMI',64,77);
  font(64,850);ctx.fillStyle=dark;ctx.fillText(s.title,64,158);
  font(28,600);ctx.fillStyle=muted;ctx.fillText(`第 ${s.day} 天 · ${s.kind} · ${s.moodLabel}`,64,215);
  const emotion=s.kind==='收盘战报'?state.dayReport?.mood||state.speech?.mood||'calm':state.speech?.mood||'calm', portraitKey=emotion==='despair'?'shocked':emotion;
  const portrait=await loadPortrait(options.portraitUrl||assetURL(`expressions/kurumi-${portraitKey}.webp`));
  ctx.fillStyle='#f2d8e5';rounded(ctx,778,62,238,238,28);
  if(portrait){try{ctx.save();ctx.beginPath();ctx.roundRect(778,62,238,238,28);ctx.clip();const scale=Math.max(238/portrait.width,238/portrait.height),w=portrait.width*scale,h=portrait.height*scale;ctx.drawImage(portrait,778+(238-w)/2,62+(238-h)/2,w,h);ctx.restore();}catch{ctx.restore();}}
  else{font(48,800);ctx.fillStyle=pink;ctx.fillText('FX',856,173);}
  if(s.edited){ctx.fillStyle='#a51e4c';rounded(ctx,64,246,640,42,8);font(23,750);ctx.fillStyle='white';ctx.fillText('开发者测试数据 · 不代表正常游戏战绩',82,275);}
  font(25,550);ctx.fillStyle=muted;ctx.fillText('当前账户权益',64,335);font(72,850);ctx.fillStyle=dark;ctx.fillText(amount(s.equity),64,421);
  function panel(x,label,value){ctx.fillStyle='#fff';rounded(ctx,x,459,468,123);font(21,600);ctx.fillStyle=muted;ctx.fillText(label,x+24,497);font(42,780);ctx.fillStyle=value>=0?green:negative;ctx.fillText(signed(value),x+24,553);}
  panel(64,s.dayTradingProfit===null?'当日平仓净收益':'当日交易净收益',s.dayTradingProfit??s.dayRealizedProfit);
  panel(548,'累计交易净收益 · 含手续费',s.tradingProfit);
  const metrics=[['累计平仓净收益',signed(s.realizedProfit)],['持仓浮动损益',signed(s.unrealized)],['累计手续费',amount(s.feesPaid)],['父亲存款待归还',amount(s.debt)],['已平仓 / 胜率',`${s.tradeCount} 笔 / ${s.winRate===null?'—':s.winRate+'%'}`],['当前持仓 / 成就',`${s.positionCount} 单 / ${s.achievementCount} 项`]];
  metrics.forEach(([label,value],i)=>{const x=64+(i%3)*326,y=638+Math.floor(i/3)*107;font(20,550);ctx.fillStyle=muted;ctx.fillText(label,x,y);font(29,750);ctx.fillStyle=dark;ctx.fillText(value,x,y+44);});
  ctx.fillStyle='#fff';rounded(ctx,64,847,952,220,18);font(20,550);ctx.fillStyle=muted;ctx.fillText(s.trailLabel,88,884);
  const trail=s.equityTrail.length>1?s.equityTrail:[100000,s.equity-s.funding+finite(state.expenses)];
  const min=Math.min(...trail),max=Math.max(...trail),range=Math.max(max-min,1000),x0=88,y0=1017,w=904,h=97;
  ctx.strokeStyle='#ded7df';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x0+w,y0);ctx.stroke();
  ctx.strokeStyle=trail.at(-1)>=trail[0]?green:negative;ctx.lineWidth=4;ctx.beginPath();trail.forEach((v,i)=>{const x=x0+i/(trail.length-1)*w,y=y0-(v-min)/range*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  font(34,720);ctx.fillStyle=dark;wrap(ctx,s.caption,64,1125,952,49,2);
  font(20,500);ctx.fillStyle=muted;ctx.fillText('借入资金不算交易收益 · 浮盈不等于已落袋 · 模拟游戏',64,1251);
  ctx.strokeStyle='#ddc7d6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,1274);ctx.lineTo(1016,1274);ctx.stroke();
  font(19,600);ctx.fillStyle=pink;wrap(ctx,s.gameUrl||'FX韭留美 · 你的下一次决定，先留一点余地。',64,1310,952,26,2);
  const blob=await new Promise((resolve,reject)=>{try{canvas.toBlob(value=>value?resolve(value):reject(Error('战报图片生成失败')),'image/png');}catch(error){reject(Error('战报图片生成失败：请使用本地角色图片'));}});
  const url=URL.createObjectURL(blob);return {blob,url,filename:`FX韭留美-第${s.day}天${s.edited?'-测试':''}-战报.png`,summary:s};
}
