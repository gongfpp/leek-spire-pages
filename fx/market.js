export const PAIR='USD/JPY',QUOTE_UNIT='日元/1 美元',PIP_SIZE=.01;
export const formatQuote=n=>Number.isFinite(n)?n.toFixed(3):'—';
export const formatQuantity=n=>Number.isFinite(n)?n.toLocaleString('zh-CN',{maximumFractionDigits:2}):'—';
export const directionLabel=d=>d===1?'做多美元':'做空美元';
export const isLegacyPosition=p=>p?.pnlModel==='legacy-inverse-v5';
export const positionQuantity=p=>isLegacyPosition(p)?null:(p.notional??p.margin*p.leverage)/p.entry;
export function grossPnlAt(p,price){if(!p)return 0;const n=p.notional??p.margin*p.leverage;return isLegacyPosition(p)?n*p.direction*(1-p.entry/price):positionQuantity(p)*p.direction*(price-p.entry);}
export function pnlCoefficients(p){const n=(p.notional??p.margin*p.leverage)*p.direction;return isLegacyPosition(p)?{linear:0,reciprocal:-n*p.entry,constant:n}:{linear:n/p.entry,reciprocal:0,constant:-n};}
