import {CARD,CARDS,TRADE_TEXT} from './data.js?v=7d7fa18e58f70c4a565a64b441bc0a1a39c1e810';
export const CATEGORIES={买入:{key:'buy',icon:'↑',color:'#f38d80',hint:'按当前点位建立持仓'},卖出:{key:'sell',icon:'↓',color:'#73d6b1',hint:'只卖可用旧仓，遵守 T+1'},防御:{key:'guard',icon:'◇',color:'#83c5f4',hint:'花成本，减少下跌损失'},技巧:{key:'skill',icon:'≋',color:'#c5ceda',hint:'抽牌、留牌或改变判断'},持续:{key:'power',icon:'∞',color:'#c3a0ef',hint:'跨日触发，提前布局'},股息:{key:'yield',icon:'%',color:'#f0cd79',hint:'按持仓收息，空仓无股息'}};
export const RARITIES={basic:{label:'基础',mark:'·',price:20},common:{label:'普通',mark:'Ⅰ',price:30},uncommon:{label:'罕见',mark:'Ⅱ',price:45},rare:{label:'稀有',mark:'Ⅲ',price:65}};
const roles={buy:['probe','add','bottom','chase','allin','break','volume','confirm','left','dip','gold','limit','leverage','contrary'],sell:['reduce','stop','profit','empty','cashout'],guard:['panic','cash','value'],skill:['watch','hold','inverse','ignore'],power:['faith'],yield:['bank','coal','dividend']};
export function design(id){const d=CARD[id],category=d.category||Object.keys(CATEGORIES).find(k=>(roles[CATEGORIES[k].key]||[]).includes(id))||'技巧',rarity=d.rarity||(['probe','add','reduce','watch'].includes(id)?'basic':['gold','faith','allin','ignore'].includes(id)?'rare':['dividend','value','confirm','cashout','leverage','panic'].includes(id)?'uncommon':'common');return {...CATEGORIES[category],category,rarity,archetype:d.type==='基础'?'基础策略':d.type==='稀有'?'通用策略':d.type+'流派',...RARITIES[rarity],exhaust:d.new&&!['rebalance','retain','scalein','trim','momentum','pullback','harvest','redeploy','buffer','recycle','hedgebuy'].includes(id)};}
export const cardPrice=id=>design(id).price;
const UP={
 probe:'按当前价买入开盘资产 13.5% 的份额。随后本日下一张买入牌的投入金额 +50%，盈亏一起放大。',
 add:'按当前价投入开盘资产 27% 买入，可承接试探加成；不超过可用现金。买入本身不产生收益。',
 reduce:'按当前价卖出相当于开盘资产 27% 的旧仓，不足则全部卖出。今日新仓不能卖。',
 stop:'按当前价卖出相当于开盘资产 27% 的旧仓，并清除心理负面状态。',
 profit:'按当前价卖出相当于开盘资产 27% 的旧仓，贪婪降低 2。',
 watch:'抽 3 张牌，仍占用当前交易时段。手牌上限 10 张。',
 bottom:'按当前价买入，投入按顺序取一项：狂热不能使用；冰点 40.5%；昨日下跌 27%；其余 13.5%。以开盘资产为基准。',
 chase:'按当前价买入：活跃或狂热时投入开盘资产 40.5%，其他情绪 20.25%。',
 break:'按当前价买入：当前判断上涨时投入开盘资产 33.75%，否则 13.5%。',
 volume:'投入开盘资产 13.5% 买入，抽 2 张牌。不增加当前时段的出牌次数。',
 confirm:'投入开盘资产 20.25% 买入。当前判断上涨时，本日下一张买入牌投入金额 +50%。',
 left:'投入开盘资产 13.5% 买入。情绪每低于平静一级，投入比例再加 6.75 个百分点。',
 dip:'按当前价买入：当前判断下跌时投入开盘资产 33.75%，否则 13.5%。',
 panic:'配置 ¥14,000 对冲，收盘扣除 ¥700。冰点或恐慌时再抽 2 张牌。',
 gold:'按当前价买入：冰点或恐慌时投入开盘资产 47.25%，否则 13.5%。',
 bank:'投入开盘资产 13.5% 买入，本场收盘股息率增加 0.405%。',
 coal:'投入开盘资产 20.25% 买入，本场收盘股息率增加 0.27%。',
 dividend:'本场每次收盘股息率增加 0.675%，可叠加，按收盘持仓市值计算。',
 cash:'配置 ¥16,000 对冲，收盘扣除 ¥800 成本。',
 value:'未用完的对冲保留到下一交易日，并抽 3 张牌。',
 limit:'当前判断上涨时可用：投入开盘资产 33.75% 买入，反转仍会亏损。',
 leverage:'投入开盘资产 40.5% 买入，允许融资，最高 150% 仓位。收盘扣 ¥50 开通费及融资余额 0.1% 日息。',
 inverse:'切换策略牌的涨跌判断，并抽 2 张牌；真实价格和持仓盈亏不变。',
 contrary:'按当前价买入：当前判断下跌时投入开盘资产 33.75%，否则 13.5%。',
 cashout:'按当前价卖出相当于开盘资产 40.5% 的旧仓，清空贪婪。'
};
export function description(id,up=false){return up?(CARD[id].upgradeText||UP[id]||TRADE_TEXT[id]):TRADE_TEXT[id];}
export function canUpgrade(id){return !!(CARD[id]?.upgradeText||UP[id]);}
export function effectSummary(e){const suffix=e.remaining===null?'本场持续':`剩余 ${e.remaining} 次${e.trigger==='open'?'开盘':'收盘'}`;const rate=n=>(n*100).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'%';const main=({cashflow:`双向交易收息 ${rate(e.rate||0)}`,discipline:`仓位 ≤ ${e.limit}% · 收息 ${rate(e.rate||0)}`,echo:`首张技巧补抽 ${e.draw} 张`,loyalty:`旧仓股息 ${rate(e.rate||0)}`,annuity:`持仓股息 ${rate(e.rate||0)}`,compound:`股息再投 ${rate(e.ratio||0)}`,moat:`开盘对冲 ¥${(e.amount||0)*1000}`,research:`开盘抽 ${e.draw||0} 张`,dca:`开盘投入 ${e.percent||0}%`,reserve:`现金利息 ${rate(e.rate||0)}`,coupon:`次日股息 ${rate(e.rate||0)}`,ladder:`当前股息 ${rate(e.rate||0)}`,patience:`未卖出时股息 ${rate(e.rate||0)}`,payout:`今日股息 ${rate(e.rate||0)}`,umbrella:`剩余对冲 ¥${Math.round((e.amount||0)*1000)}`,collar:`亏损补偿 ${rate(e.ratio||0)}`,plan:`次日抽 ${e.draw||0} 张`,scalein:`次日买入 ${e.percent||0}%`,trim:`次日卖出 ${e.percent||0}%`})[e.id]||e.id;return `${main} · ${suffix}`;}
// Choose a tier first, then a unique card. Basic cards stay in the starting deck.
export function offerCards(random,count,{elite=false,legacy=false}={}){let pool=CARDS.filter(d=>legacy?!d.new:design(d.id).rarity!=='basic'),result=[];for(let i=0;i<count&&pool.length;i++){if(legacy){const j=Math.floor(random()*pool.length);result.push(pool.splice(j,1)[0].id);continue;}const n=random(),tier=elite&&i===0?'rare':n<.6?'common':n<.92?'uncommon':'rare',subset=pool.filter(d=>design(d.id).rarity===tier),options=subset.length?subset:pool,selected=options[Math.floor(random()*options.length)];result.push(selected.id);pool=pool.filter(x=>x.id!==selected.id);}return result;}

export function comboFor(s,id){const c=s?.combat;if(!c)return null;const sold=c.trades?.some(t=>t.side==='卖出'),lastBuy=c.trades?.filter(t=>t.side==='买入').at(-1);const ready={momentum:c.lastPlayedBuy,pullback:lastBuy&&c.live.price<lastBuy.price,harvest:c.lastDividend>0,redeploy:sold,buffer:sold,recycle:c.block>0,hedgebuy:c.block>=5}[id];const labels={momentum:'追击',pullback:'低价补仓',harvest:'收息止盈',redeploy:'资金接力',buffer:'卖出防守',recycle:'对冲转进攻',hedgebuy:'防守反击'};if(ready)return {label:labels[id]};if(design(id).key==='yield'&&c.yieldBoost>1)return {label:'红利 ×'+c.yieldBoost};if(['buy','yield'].includes(design(id).key)&&c.boost>1&&['probe','add','bank','coal','momentum','pullback','hedgebuy','bottom','chase','allin','break','volume','confirm','left','dip','gold','limit','leverage','contrary','scalein'].includes(id))return {label:'投入 ×'+c.boost.toFixed(2)};return null;}

export const COMBOS=[
{name:'资金接力',ids:['reduce','redeploy','add','cashflow'],text:'卖出旧仓后补牌，再投入买入；一天内双向交易可触发现金利息。'},
{name:'复利循环',ids:['dividendboost','annuity','compound','harvest'],text:'先提高股息率，再连续派息与再投；次日可用收息落袋调整旧仓。'},
{name:'防守反击',ids:['buffer','hedgebuy','recycle'],text:'对冲达到 ¥5,000，反击扩大投入；也可回收部分保护换取抽牌和买入加成。'},
{name:'低位分批',ids:['scalein','pullback','dca'],text:'先建立小仓位，回落时补仓，并预约未来开盘买入。'},
{name:'技巧循环',ids:['echo','watch','retain','research'],text:'回响补抽技巧牌，保留关键手牌，研究笔记持续补充选择。'},
{name:'轻仓收息',ids:['rebalance','discipline','reserve','loyalty'],text:'减仓并配置对冲，用现金收息；保留的旧仓继续派息。'}];
