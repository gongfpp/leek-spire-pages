import {TRANSITION_COPY} from './copy/transitions.js?v=8f7f3448ba2b52155eb3a84fe2fa0e01e184f22c';
const yen=value=>`${value<0?'−':''}¥${Math.abs(value).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
const signed=value=>`${value>0?'+':''}${yen(value)}`;
const quote=value=>Number.isFinite(value)?value.toFixed(6):'—';
export function buildFXReceipt(report){
  const labels={half:'减半平仓',close:'平仓',rescue:'提前平仓',stop:'止损',liquidation:'强平',closing:'收盘平仓'};
  const net=report.closing-report.opening-report.funding;
  const rows=report.trades.filter(t=>Number.isFinite(t.pnl)).map(t=>({label:`#${t.positionId||'—'} · 日元${t.direction===1?'多':'空'}单 · ${labels[t.type]||'交易'}`,amount:t.pnl,formula:`${yen(t.margin)} 保证金 · ${Number((t.leverage||0).toFixed(1))}× · ${quote(t.entry)} → ${quote(t.exit)} · 费用 ${yen((t.openFee||0)+(t.closeFee||0))}${t.lossReduction?' · 萌智子减免 '+yen(t.lossReduction):''}`}));
  if(report.funding)rows.push({label:'借还款变动',amount:report.funding,formula:'不计交易收益'});
  const shopping=Math.max(0,report.costs-(report.livingCost||0)-(report.interest||0));
  if(shopping)rows.push({label:'消费物品',amount:-shopping});
  if(report.livingCost)rows.push({label:'生活费',amount:-report.livingCost});
  if(report.interest)rows.push({label:'网络贷款利息',amount:-report.interest,formula:report.interestAccrued?'其中 '+yen(report.interestAccrued)+' 计入欠款':''});
  return{title:TRANSITION_COPY.dayTitle,opening:report.opening,closing:report.closing,tradingNet:report.net,funding:report.funding,closingLabel:'21:30 JST / TRADING STATEMENT',rows,doneLabel:net>=0?TRANSITION_COPY.positive:TRANSITION_COPY.negative,summary:`交易净收益 ${signed(report.net)} · 生活费 ${yen(report.livingCost||0)}`};
}
