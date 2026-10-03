import {description} from './card-design.js?v=88d93a74d3ccac11e74e9918fcd7c0383997bcd5';
import {MARKETS,TRADE_TEXT} from './data.js?v=88d93a74d3ccac11e74e9918fcd7c0383997bcd5';
export const STAGES=[
{at:0,title:'先做一个小决定',description:'上午 09:30、下午 13:00 各出一张牌。先试探、后加仓；点击按钮才推进时间，可以慢慢想。',next:'再收盘两次，开放补牌与三张手牌。',hand:2,energy:2,cards:[]},
{at:2,title:'多一张牌，多一个选择',description:'开放 10:30：一天可以操作三次，每个时段一张牌。「观望」补牌不增加当前时段次数。',next:'再收盘两次，观察市场情绪。',hand:3,energy:3,cards:['add','watch']},
{at:4,title:'同一张牌，也有好时机',description:'开放 14:00：上午、下午各两次机会，约每小时一次。市场情绪影响买入规模。「分红日历」开始教你跨日收息。',next:'再收盘两次，认识盈利后的贪婪。',hand:4,energy:3,cards:['bottom','chase']},
{at:6,title:'赚钱之后，才是考验',description:'「耐心持牌」可以把关键手牌留到明日。「止盈」「落袋为安」卖出旧仓，按实际成交价格计算盈亏。',next:'再收盘两次，选择流派并走进完整市场。',hand:5,energy:3,cards:['profit','cashout']},
{at:8,title:'交易席位，全部开放',description:'选择一套策略，带着它走进市场。地图、经费、投资习惯和应急对冲已开放。',next:'',hand:5,energy:3,cards:[]}
];
export const BUILDS=[
{id:'trend',name:'趋势流',tag:'趁风还在',text:'用分批建仓安排次日买入，研究笔记持续补牌；趋势反转前记得减仓。',cards:['break','volume','confirm'],expandedCards:['scalein','momentum','research']},
{id:'bottom',name:'抄底流',tag:'在恐慌里找机会',text:'回落时补仓，定投分日建仓，备用金跨日保护。',cards:['left','panic','gold'],expandedCards:['pullback','dca','umbrella']},
{id:'dividend',name:'红利流',tag:'慢一点，也能赢',text:'银行股建立持仓，分红日历连续派息，股息再投自动增持；空仓没有股息。',cards:['bank','dividend','cash'],expandedCards:['bank','annuity','compound']},
{id:'limit',name:'打板流',tag:'收益与风险一起加速',text:'融资放大仓位，放量补牌，保本区间付费补偿部分亏损；仍需承担反转风险。',cards:['limit','leverage','allin'],expandedCards:['leverage','volume','collar']},
{id:'inverse',name:'反指流',tag:'把判断反过来',text:'反转判断，腾挪补牌，用回响延续技巧组合。',cards:['inverse','contrary','break'],expandedCards:['inverse','redeploy','echo']},
{id:'rotation',name:'轮动流',tag:'资金不停，节奏要稳',text:'卖出旧仓，腾挪补牌，再买入收取现金利息。',cards:['reduce','watch','cash'],expandedCards:['cashflow','redeploy','buffer']},
{id:'defensive',name:'防守反击流',tag:'留好后手，再出手',text:'对冲转进攻，控制仓位，让闲置现金继续生息。',cards:['panic','value','add'],expandedCards:['buffer','hedgebuy','discipline']}
];
export const TRAINING={id:'training',name:'新手开盘',sub:'先学会交易，再走进市场。',rule:'先用小额收益与仓位练习，每两次收盘开放一种新机制。完成 8 日后选择流派。',sequence:[4,-6,6,-8,8,-10,12,-16],moods:[3,3,3,3,4,1,5,1],goal:0,minAlpha:0,days:8,training:true};
export function stage(s){return [2,3,4].includes(s?.version)?Math.min(4,Math.floor(s.rounds/2)):4;}
export function features(s){const n=stage(s);return {level:n,...STAGES[n],position:n>=1,emotion:n>=2,greed:n>=3,full:n>=4};}
export function marketFor(s){const id=s.combat?.market||s.node?.market;if(id==='training')return TRAINING;const m=MARKETS.find(m=>m.id===id);if(s.version===4&&m)return {...m,days:m.boss?6:Math.min(m.days,4),sequence:m.boss?[8,16,10,-12,-25,-40]:m.sequence,goal:0,minAlpha:0};if(!m||(![2,3].includes(s.version)||s.legacyRoute))return m;return m.boss?{...m,days:6,sequence:[8,16,10,-12,-25,-40],moods:[4,5,4,2,1,0],rule:'六日走完三阶段：人人股神 → 高位震荡 → 退潮。至少获得 80 Alpha 并撑过全部六日。'}:{...m,days:Math.min(m.days,4)};}
export function cardText(s,d,card={}){if(!s||s.version===4)return description(d.id,card.up);if(s?.version<3&&stage(s)===0){if(d.id==='probe')return '获得 5 收益（¥5,000）。';if(d.id==='reduce')return '获得 8 风控，抵挡本次收盘亏损。';}return d.text;}
