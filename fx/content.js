import {EXTRA_NEWS_CHAINS} from './story-content.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';
// Simulated market information and functional UI copy, separate from approved character dialogue.
// Bias is the simulated USD/JPY quote tendency: +1 = USD stronger / JPY weaker.
// Economic news can be priced in or overwhelmed by other flows; it never guarantees a trade.
const BASE_NEWS_CHAINS = [
  {id:"boj",name:"日本央行会议",bias:-1,vol:2,source:"模拟·东京政策快讯",
    lead:"日本央行讨论追加加息，日元买盘增加",leadCopy:"市场关注工资与物价数据，日本加息预期可能增加日元买盘。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["日本央行上调政策利率，日元获支撑","会议声明指出工资与物价的循环正在加强。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["日本央行维持利率，会前日元买盘或退潮","声明强调仍需观察经济数据，未给出下一次调整时间。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日本央行维持政策，后续信号未明","会议保留后续调整空间，市场等待记者会。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"cpi",name:"日本物价数据",bias:-1,vol:2,source:"模拟·东京经济数据",
    lead:"日本消费价格超预期，日元获加息预期支持",leadCopy:"投资者重新评估日本利率路径，日元需求可能增加。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["日本服务价格继续上涨，日元支撑增强","价格压力由商品向服务扩散，利率预期上升。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["物价细项偏弱，日元买盘或退潮","剔除短期因素后，基础价格增速低于初步解读。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日本物价分项不一，方向信号减弱","商品价格与服务价格走势出现分化。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"intervention",name:"财务省汇市发言",bias:-1,vol:3,source:"模拟·东京汇市快讯",
    lead:"财务省关注日元贬值，干预预期升温",leadCopy:"官员表示正在监测外汇市场，买入日元的干预预期可能抑制 USD/JPY。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["财务省确认买入日元，USD/JPY 承压","买入日元可能给 USD/JPY 带来下行压力，模拟交易活跃度明显增加。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["财务省未确认干预，日元支撑或减弱","官员表示不评论具体交易，市场重新评估盘中异动。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["财务省重申关注汇率，暂无新增政策","东京汇市未出现新的政策信息。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"payroll",name:"美国就业数据",bias:1,vol:3,source:"模拟·纽约经济数据",
    lead:"美国就业偏强，美元获利率预期支持",leadCopy:"美国利率预期上升，美元需求可能增加。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["美国就业细项强劲，USD/JPY 获支撑","薪资与新增岗位同时增长，利差交易重新活跃。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["美国就业修订值转弱，USD/JPY 承压","前期新增岗位被下修，市场利率预期回落。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["美国就业分项不一，方向信号减弱","市场等待后续经济数据评估利率路径。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"fed",name:"美日利差",bias:1,vol:2,source:"模拟·纽约政策快讯",
    lead:"美国利率预期上升，USD/JPY 获支撑",leadCopy:"美债收益率走高可能扩大美日利差预期，给 USD/JPY 带来上行压力。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["美国官员偏鹰，USD/JPY 上行压力增强","美日利差预期扩大，日元卖盘增加。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["美国官员保留降息空间，USD/JPY 承压","完整讲话强调政策将随经济数据调整。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["美国政策路径未明，方向分歧仍在","市场对利率方向的分歧仍然较大。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"export",name:"东京企业结汇",bias:-1,vol:1,source:"模拟·东京市场观察",
    lead:"日本出口企业结汇增加，日元获买盘支持",leadCopy:"东京时段企业卖出美元、买入日元，可能给 USD/JPY 带来下行压力。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["企业日元需求延续，USD/JPY 承压","市场成交以实际资金需求为主。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["企业结汇告一段落，日元支撑或减弱","买盘减弱后，日元可能重新承压。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["企业买卖趋于平衡，方向信号减弱","东京时段方向性资金需求有限。模拟倾向：方向信号减弱，价格仍会双向波动。"]}
];

export const NEWS_CHAINS = [...BASE_NEWS_CHAINS,...EXTRA_NEWS_CHAINS];
export const MOODS = {
  hopeful:['期待','hopeful'],focused:['专注','focused'],irritated:['烦躁','irritated'],stunned:['震惊','stunned'],exhausted:['疲惫','exhausted'],guilty:['内疚','guilty'],embarrassed:['局促','embarrassed'],lonely:['落寞','lonely'],determined:['坚定','determined'],warm:['温暖','warm'],
  calm:['平静','calm'],smug:['得意','smug'],nervous:['紧张','nervous'],anxious:['焦虑','anxious'],
  ecstatic:['极度亢奋','exhilarated'],despair:['绝望','shocked'],regretful:['懊恼','regretful'],relieved:['如释重负','relieved']
};

export const CANON_QUOTE = {id:'V2-HOPE-01',text:'两千万而已，我会轻松赚回来的！',source:'用户附译；日语原句见动画官方简介',url:'https://fxkurumi-info.com/'};
export {PROPS} from './copy/items.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';
