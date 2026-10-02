import {ITEM_SCENES,STORY_DEFINITIONS,SCENE_LINES} from './copy/scenes.js?v=42e60038912f95eb620b043e667658eb078c4608';
// Simulated market information is separate from user-approved character dialogue.
import {approvedQuote,dialogueFacts} from './dialogue.js?v=42e60038912f95eb620b043e667658eb078c4608';
// Market directions refer to JPY valued in USD: positive = stronger yen, negative = weaker yen.
// Historical market incidents inspire scenarios only; headlines, timing and moves are fictional.

export const EXTRA_NEWS_CHAINS = [
  {id:'extra_us_inflation',name:'美国通胀意外降温',bias:1,vol:2,source:'模拟·跨洋数据台',
    lead:'美国通胀初值低于预估，日元兑美元走高',leadCopy:'美元利率预期回落，亚洲时段的日元买盘逐渐增加。',
    confirmed:['美国物价降温范围扩大，日元继续上行','租金与服务项目也放缓，美元买盘暂时退潮。'],
    reversed:['物价细项仍有黏性，日元回吐涨幅','能源拖低总体数字，服务价格的变化没有初看那样明显。'],
    muted:['美国物价信号分化，日元转为整理','交易员等待更多分项数据，追价买卖减少。']},
  {id:'extra_japan_wages',name:'春季工资谈判',bias:1,vol:2,source:'模拟·东京经济观察',
    lead:'日本工资谈判传出较强结果，日元获得支撑',leadCopy:'市场猜测工资增长可能带动消费，重新评估日本政策路径。',
    confirmed:['中小企业加薪范围扩大，日元延续强势','后续调查显示工资增长并非只集中在少数大型企业。'],
    reversed:['加薪传闻未获完整数据支持，日元回落','已公布样本偏向大型企业，市场下调先前的预期。'],
    muted:['工资调查仍在汇总，日元涨幅收窄','企业之间的差异较大，结论尚未形成。']},
  {id:'extra_japan_consumption',name:'日本消费恢复',bias:1,vol:1,source:'模拟·街区经济简报',
    lead:'日本零售消费改善，日元小幅走强',leadCopy:'家庭支出与商店销量的初步调查改善，日元需求温和增加。',
    confirmed:['消费改善延续至服务业，日元稳步上行','旅游和餐饮之外，日常购买也出现回暖。'],
    reversed:['消费增长主要来自短期促销，日元转弱','剔除促销影响后，家庭支出的恢复幅度有限。'],
    muted:['消费调查好坏参半，日元保持区间波动','部分品类走强，其他品类仍较疲弱。']},
  {id:'extra_yen_short_cover',name:'日元空头回补',bias:1,vol:3,source:'模拟·汇市持仓观察',
    lead:'拥挤的日元空头开始回补，日元短线急升',leadCopy:'部分基金买回此前卖出的日元，盘中波动明显放大。',
    confirmed:['空头回补波及更多账户，日元继续抬升','触发平仓的买盘接连进入，成交集中在数个价格区间。'],
    reversed:['空头回补告一段落，日元快速回落','新的方向性买盘未能接上，短线获利资金转向卖出。'],
    muted:['基金持仓逐渐平衡，日元高位震荡','回补与新卖盘交错，汇价没有延续单边走势。']},
  {id:'extra_safe_haven',name:'跨市场避险买盘',bias:1,vol:3,source:'模拟·全球风险简报',
    lead:'海外股市突然转弱，避险买盘推高日元',leadCopy:'风险偏好下降，部分资金退出高收益交易并买回日元。',
    confirmed:['跨市场减仓继续，日元避险需求增强','多个交易时段都出现减仓，日元买盘维持活跃。'],
    reversed:['海外股市收复跌幅，日元买盘退潮','担忧暂时缓和，先前退出的资金重新转向风险资产。'],
    muted:['避险交易出现分歧，日元双向波动','股票与债券走势不同，汇市等待更清晰的信号。']},
  {id:'extra_repatriation',name:'海外资金回流',bias:1,vol:1,source:'模拟·企业资金台',
    lead:'日本企业海外收益回流，日元买盘增多',leadCopy:'企业将部分外币收入换回日元，实际结汇需求支撑价格。',
    confirmed:['企业回流安排持续，日元保持上行','多家企业分批完成换汇，买盘没有集中在单一时点。'],
    reversed:['资金回流提前结束，日元支撑减弱','主要换汇需求已完成，美元购买需求重新占上风。'],
    muted:['企业资金收付相抵，日元横向整理','外币收益回流与进口付款需求大致平衡。']},
  {id:'extra_japan_bond_yield',name:'日本长债收益率抬升',bias:1,vol:2,source:'模拟·东京债市快讯',
    lead:'日本长债收益率走高，日元兑美元反弹',leadCopy:'市场调整对本地利率的预期，日元获得短线买盘。',
    confirmed:['债市调整延续，日元继续走强','多期限收益率共同抬升，美日利差预期收窄。'],
    reversed:['长债买盘回归，日元反弹受阻','收益率的上升未能持续，汇市重新评估先前交易。'],
    muted:['日本债市逐渐稳定，日元窄幅整理','收益率变化放缓，交易员等待政策说明。']},
  {id:'extra_us_growth_slow',name:'美国增长放缓',bias:1,vol:2,source:'模拟·纽约经济观察',
    lead:'美国企业订单减弱，日元兑美元上涨',leadCopy:'增长担忧令美国利率预期回落，美元买盘减少。',
    confirmed:['订单走弱扩散至服务业，日元延续涨势','新调查与先前数据相互印证，市场继续降低利率预期。'],
    reversed:['订单下降被后续调查修正，日元回落','样本更新后，经济活动比初值显示的更稳健。'],
    muted:['美国增长数据互有强弱，日元涨幅收窄','订单和家庭支出给出不同信号，方向交易趋于谨慎。']},
  {id:'extra_carry_unwind',name:'利差交易减仓',bias:1,vol:3,source:'模拟·跨境资金观察',
    lead:'杠杆基金削减利差交易，日元买盘突然增加',leadCopy:'以日元融资的部分头寸被关闭，回补需求推升日元。',
    confirmed:['更多利差头寸退出，日元扩大涨幅','融资端的日元买回需求持续，波动仍高于平时。'],
    reversed:['减仓暂告段落，日元重新承压','剩余头寸保持不动，追随回补的短线买盘开始退出。'],
    muted:['基金完成部分调整，日元来回震荡','减仓与重新建仓同时发生，汇价缺乏单一方向。']},
  {id:'extra_us_retail',name:'美国零售走强',bias:-1,vol:2,source:'模拟·纽约数据简报',
    lead:'美国零售初值强劲，日元兑美元下行',leadCopy:'消费韧性提高美国维持较高利率的预期，美元受到追捧。',
    confirmed:['零售增长覆盖更多品类，日元继续承压','后续细项显示消费并非只由单一品类带动。'],
    reversed:['零售增长被下修，日元收复跌幅','修订数据弱于初值，美元利率交易出现回撤。'],
    muted:['零售与消费调查分化，日元止跌整理','市场暂时无法判断增长是否持续。']},
  {id:'extra_import_energy',name:'进口能源付款',bias:-1,vol:1,source:'模拟·贸易资金观察',
    lead:'日本进口商美元付款增加，日元温和走弱',leadCopy:'能源结算需求带来美元买盘，日元兑美元缓慢下行。',
    confirmed:['能源付款需求延续，日元进一步回落','进口商分批购入美元，日元买盘未能完全抵消。'],
    reversed:['进口付款高峰过去，日元重新走强','美元需求减少，出口企业的结汇买盘开始占上风。'],
    muted:['进口与出口换汇相抵，日元维持整理','实际资金收付趋于平衡，盘中振幅缩小。']},
  {id:'extra_japan_output',name:'日本工业调查转弱',bias:-1,vol:2,source:'模拟·产业经济台',
    lead:'日本制造业订单减少，日元兑美元回落',leadCopy:'市场降低对本地增长和利率上行的预期。',
    confirmed:['制造业疲弱扩散，日元卖盘增加','后续调查显示企业仍在削减新增订单与投资。'],
    reversed:['订单减少集中于短期停工，日元反弹','更新信息显示主要产线已恢复，先前的担忧缓和。'],
    muted:['工业数据出现行业分化，日元横向波动','部分行业恢复，其他行业仍承受库存压力。']},
  {id:'extra_us_treasury',name:'美国债券拍卖',bias:-1,vol:2,source:'模拟·纽约债市观察',
    lead:'美国债券拍卖需求偏弱，日元兑美元下跌',leadCopy:'美债收益率上行扩大利差预期，日元遭遇卖盘。',
    confirmed:['美债收益率继续上行，日元跌势延续','债券买盘未能回归，美元利率优势受到更多关注。'],
    reversed:['后续美债买盘增强，日元快速反弹','收益率回落，先前围绕利差的仓位开始退出。'],
    muted:['美债收益率趋稳，日元跌幅收窄','市场消化拍卖结果，买卖双方暂时均衡。']},
  {id:'extra_risk_rebound',name:'风险偏好回升',bias:-1,vol:2,source:'模拟·全球市场观察',
    lead:'海外股市回暖，日元避险买盘减少',leadCopy:'部分资金恢复风险头寸，日元兑美元逐渐走弱。',
    confirmed:['股市反弹范围扩大，日元继续下行','避险仓位被进一步削减，日元融资交易有所恢复。'],
    reversed:['股市反弹未能持续，日元再获买盘','尾盘抛售令风险偏好转弱，资金重新买回日元。'],
    muted:['风险资产涨跌交错，日元恢复区间交易','投资者对反弹的持续性仍有分歧。']},
  {id:'extra_rate_patience',name:'日本政策耐心论',bias:-1,vol:2,source:'模拟·政策记者会',
    lead:'日本政策讨论强调继续观察，日元受到卖压',leadCopy:'市场下调近期加息的预期，日元兑美元走低。',
    confirmed:['后续说明保持审慎，日元延续弱势','政策讨论继续关注增长风险，近期调整预期进一步降温。'],
    reversed:['完整说明保留更早调整空间，日元反弹','市场重新阅读上下文，先前的宽松解读受到修正。'],
    muted:['政策说明未给出时间表，日元低位整理','不同解读并存，价格在日内区间来回波动。']},
  {id:'extra_outbound_funds',name:'海外资产配置',bias:-1,vol:1,source:'模拟·长期资金简报',
    lead:'日本机构增加海外资产配置，日元小幅下行',leadCopy:'部分长期资金卖出日元购买外币，带来温和压力。',
    confirmed:['海外配置计划分批执行，日元继续走弱','换汇需求维持，但没有出现急促的追价交易。'],
    reversed:['机构增加汇率对冲，日元回升','买回日元的对冲需求抵消先前的外币购买。'],
    muted:['海外配置与对冲需求相抵，日元窄幅整理','资金调整逐渐完成，方向性成交减少。']},
  {id:'extra_us_wages',name:'美国薪资压力',bias:-1,vol:3,source:'模拟·劳动力数据台',
    lead:'美国薪资增长超出预估，日元兑美元急跌',leadCopy:'工资压力推高美国利率预期，美元短线买盘集中。',
    confirmed:['薪资压力扩散至多个行业，日元保持弱势','后续细项支持初步解读，美元买盘继续进入。'],
    reversed:['薪资跳升受样本变化影响，日元反弹','可比样本的工资增长更温和，利率预期随之回落。'],
    muted:['薪资与就业数量信号不同，日元振荡整理','投资者等待更完整的数据再作判断。']},
  {id:'extra_quiet_session',name:'清淡时段美元买盘',bias:-1,vol:2,source:'模拟·夜间成交观察',
    lead:'清淡交易时段美元买盘集中，日元突然走低',leadCopy:'报价数量减少，一批美元需求令日元短线振幅扩大。',
    confirmed:['后续美元需求接上，日元继续下行','活跃时段开启后，新成交仍偏向美元购买。'],
    reversed:['流动性恢复后价格折返，日元收复跌幅','较密集的报价令先前清淡时段的异动被部分修正。'],
    muted:['报价恢复正常，日元在低位整理','买卖逐渐平衡，短线波动回到日常范围。']}
];

export const BLACK_SWANS = [
  {id:'peg_break',name:'汇率安排突变',title:'模拟突发｜海外央行意外撤销汇率安排',
    copy:'政策声明来得比预期更早。跨市场避险资金涌入日元，报价突然跳离原先的区间；这段行情是虚构情景。',delta:0.032,speaker:'久留美'},
  {id:'bank_failure',name:'大型机构融资中断',title:'模拟突发｜海外金融机构暂停正常融资',
    copy:'多家机构同时减少风险头寸，美元融资需求挤占流动性。日元兑美元急跌，随后的成交仍很零散。',delta:-0.04,speaker:'安子'},
  {id:'pandemic_emergency',name:'休市期间紧急措施',title:'模拟突发｜多国公布公共卫生紧急措施',
    copy:'消息在休市期间累积，开盘时避险买盘集中进入。日元兑美元出现上行缺口，旧报价已经无法代表当前成交。',delta:0.027,speaker:'萌智子'},
  {id:'gilt_spiral',name:'债市连锁平仓',title:'模拟突发｜海外债市出现连锁卖盘',
    copy:'被迫减仓从债券扩散到汇市。投资者抢购美元补足融资，日元兑美元下行；不同资产的冲击并不相同。',delta:-0.023,speaker:'安子'},
  {id:'liquidity_freeze',name:'银行间报价骤减',title:'模拟突发｜短期融资紧张，汇市报价突然变稀',
    copy:'多家交易对手缩减报价，少量买盘也推动日元大幅跳动。屏幕上的间隔拉长，随后一笔成交明显高于刚才。',delta:0.018,speaker:'久留美'},
  {id:'policy_surprise',name:'政策意外转向',title:'模拟突发｜日本政策会议给出意外宽松措施',
    copy:'声明与会前主流猜测不同，日元卖盘集中涌入。汇价快速下探，记者会开始前市场仍在重新寻找价格。',delta:-0.035,speaker:'久留美'},
  {id:'referendum_night',name:'计票结果逆转',title:'模拟突发｜海外公投结果逆转市场预期',
    copy:'后半夜公布的计票结果打破先前判断，风险头寸迅速收缩。资金买回日元，汇市在很短的时间内跨过数个价位。',delta:0.024,speaker:'芽吹'},
  {id:'commodity_dislocation',name:'交割合约异价',title:'模拟突发｜临近交割的商品合约出现异常报价',
    copy:'商品市场的异常成交引发跨市场减仓与美元需求。日元兑美元下跌；商品合约的价格规则不等于日元汇率规则。',delta:-0.015,speaker:'久留美'}
];

export const STORIES=STORY_DEFINITIONS;
export function getStory(s,key){
  const base=STORIES[key];if(!base)return null;
  const f=dialogueFacts(s),family=s.family||{};
  if(key==='fatherUnlock'&&(s.fatherUsed||f.equity>=30000))return null;
  if(key==='fatherFound'&&(!s.fatherUsed||!family.outstanding||family.informed||family.discovered))return null;
  if(key==='repayPartial'&&(!family.lastRepayment||!(family.outstanding>0)))return null;
  if(key==='repayFull'&&(!family.lastRepayment||family.outstanding!==0||family.lastRepayment.outstanding!==0))return null;
  if(key==='recovery'&&!s.story?.flags?.receiptWinDay)return null;
  const state=['fatherFound','fatherUnlock'].includes(key)?{...s,storyContext:key}:s;
  const lines=ids=>ids.map(id=>approvedQuote(id,state)).filter(Boolean).map(q=>[q.from,q.text]);
  const event={...base,key,lines:[],choices:base.choices.map(c=>({...c,lines:[]}))};
  if(ITEM_SCENES[key]){const scene=ITEM_SCENES[key];event.original=true;event.lines=scene.lines.map(line=>[...line]);for(const c of event.choices)c.lines=(scene.choices[c.id]||[]).map(line=>[...line]);}
  if(key==='fatherUnlock'){
    event.lines=lines(['V2-E03-01']);
    event.choices.find(c=>c.id==='look_at_savings').lines=lines(['V2-E03-02']);

  }
  if(key==='fatherDiscover'){event.original=true;event.lines=SCENE_LINES.fatherDiscover.map(line=>[...line]);}
  if(key==='quietNight'){event.original=true;event.lines=SCENE_LINES.quietNight.map(line=>[...line]);}
  if(key==='fatherFound')event.lines=lines(['V2-E04-01','V2-E04-03']);
  if(key==='repayPartial')event.lines=lines(['V2-E05-05','V2-E05-01','V2-E05-03']);
  if(key==='repayFull')event.lines=lines(['V2-E06-01']);
  return event;
}
