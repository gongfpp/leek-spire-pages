import {EXTRA_NEWS_CHAINS} from './story-content.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
// Simulated market information and functional UI copy, separate from approved character dialogue.
const BASE_NEWS_CHAINS = [
  {id:'boj',name:'日本央行会议',bias:1,vol:2,source:'东京政策快讯',
    lead:'日本央行讨论追加加息，日元买盘增加',leadCopy:'市场关注工资与物价数据。东京时段日元兑美元走强。',
    confirmed:['日本央行上调政策利率，日元扩大涨幅','会议声明指出工资与物价的循环正在加强。'],
    reversed:['日本央行维持利率，日元回吐会前涨幅','声明强调仍需观察经济数据，未给出下一次调整时间。'],
    muted:['日本央行维持政策，日元窄幅整理','会议保留后续调整空间，市场等待记者会。']},
  {id:'cpi',name:'日本物价数据',bias:1,vol:2,source:'东京经济数据',
    lead:'日本消费价格增速高于市场预估，日元上涨',leadCopy:'投资者重新评估日本利率路径，日元兑美元买盘活跃。',
    confirmed:['日本服务价格继续上涨，日元保持强势','价格压力由商品向服务扩散，利率预期上升。'],
    reversed:['物价数据细项偏弱，日元回落','剔除短期因素后，基础价格增速低于初步解读。'],
    muted:['日本物价分项表现不一，日元涨幅收窄','商品价格与服务价格走势出现分化。']},
  {id:'intervention',name:'财务省汇市发言',bias:1,vol:3,source:'东京汇市快讯',
    lead:'财务省关注日元过快贬值，汇市波动扩大',leadCopy:'官员表示正在监测外汇市场。日元盘中买卖交错。',
    confirmed:['财务省确认实施日元买入干预','日元兑美元短线急升，市场交易量明显增加。'],
    reversed:['财务省未确认干预，日元回吐急升幅度','官员表示不评论具体交易，市场重新评估盘中异动。'],
    muted:['财务省重申关注汇率，日元区间震荡','东京汇市未出现新的政策信息。']},
  {id:'payroll',name:'美国就业数据',bias:-1,vol:3,source:'纽约经济数据',
    lead:'美国就业数据偏强，日元兑美元承压',leadCopy:'美国利率预期上升，日元在纽约时段走弱。',
    confirmed:['美国就业细项强劲，日元延续跌势','薪资与新增岗位同时增长，利差交易重新活跃。'],
    reversed:['美国就业修订值转弱，日元收复跌幅','前期新增岗位被下修，市场利率预期回落。'],
    muted:['美国就业分项互有强弱，日元跌幅收窄','市场等待后续经济数据评估利率路径。']},
  {id:'fed',name:'美日利差',bias:-1,vol:2,source:'纽约政策快讯',
    lead:'美国利率预期上升，美日利差令日元承压',leadCopy:'美国国债收益率走高，日元兑美元下行。',
    confirmed:['美国官员强调维持限制性利率，日元走弱','美日利差预期扩大，日元卖盘增加。'],
    reversed:['美国官员保留降息空间，日元反弹','完整讲话强调政策将随经济数据调整。'],
    muted:['美国政策路径未明，日元恢复区间交易','市场对利率方向的分歧仍然较大。']},
  {id:'export',name:'东京企业结汇',bias:1,vol:1,source:'东京市场观察',
    lead:'日本出口企业结汇增加，日元获得买盘支持',leadCopy:'东京时段企业卖出美元、买入日元，汇价小幅上行。',
    confirmed:['企业日元需求延续，日元稳步上涨','市场成交以实际资金需求为主。'],
    reversed:['企业结汇告一段落，日元涨幅回吐','买盘减弱后，日元兑美元转为下行。'],
    muted:['企业买卖趋于平衡，日元窄幅波动','东京时段汇价维持在日内区间。']}
];

export const NEWS_CHAINS = [...BASE_NEWS_CHAINS,...EXTRA_NEWS_CHAINS];
export const MOODS = {
  hopeful:['期待','hopeful'],focused:['专注','focused'],irritated:['烦躁','irritated'],stunned:['震惊','stunned'],exhausted:['疲惫','exhausted'],guilty:['内疚','guilty'],embarrassed:['局促','embarrassed'],lonely:['落寞','lonely'],determined:['坚定','determined'],warm:['温暖','warm'],
  calm:['平静','calm'],smug:['得意','smug'],nervous:['紧张','nervous'],anxious:['焦虑','anxious'],
  ecstatic:['极度亢奋','exhilarated'],despair:['绝望','shocked'],regretful:['懊恼','regretful'],relieved:['如释重负','relieved']
};

export const CANON_QUOTE = {id:'V2-HOPE-01',text:'两千万而已，我会轻松赚回来的！',source:'用户附译；日语原句见动画官方简介',url:'https://fxkurumi-info.com/'};
export {PROPS} from './copy/items.js?v=8bd148e8f3204d5942611a3e07d66648e5f58ce6';
