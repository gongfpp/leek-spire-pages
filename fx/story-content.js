import {ITEM_SCENES,STORY_DEFINITIONS,SCENE_LINES} from './copy/scenes.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';
// Simulated market information is separate from user-approved character dialogue.
import {approvedQuote,dialogueFacts} from './dialogue.js?v=fea4705c1a6785b93918ade2c6a531970e49bb4b';
// USD/JPY is quoted in JPY per USD: positive = stronger USD / weaker JPY.
// Bias is a simulated tendency; seeded noise and reversals can outweigh it.
// Quote convention: https://www.boj.or.jp/about/education/oshiete/intl/g18.htm
// Historical market incidents inspire scenarios only; headlines, timing and moves are fictional.

export const EXTRA_NEWS_CHAINS = [
  {id:"extra_us_inflation",name:"美国通胀意外降温",bias:-1,vol:2,source:"模拟·跨洋数据台",
    lead:"美国通胀低于预估，USD/JPY 承压",leadCopy:"美元利率预期回落，可能减少美元买盘并支持日元。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["美国物价降温范围扩大，日元获支撑","租金与服务项目也放缓，美元买盘暂时退潮。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["美国物价细项仍有黏性，美元或获支撑","能源拖低总体数字，服务价格的变化没有初看那样明显。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["美国物价信号分化，方向分歧仍在","交易员等待更多分项数据，追价买卖减少。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_japan_wages",name:"春季工资谈判",bias:-1,vol:2,source:"模拟·东京经济观察",
    lead:"日本工资谈判结果偏强，日元获支撑",leadCopy:"市场猜测工资增长可能带动消费，重新评估日本政策路径。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["日本加薪范围扩大，日元支撑增强","后续调查显示工资增长并非只集中在少数大型企业。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["加薪传闻缺完整数据支持，日元支撑减弱","已公布样本偏向大型企业，市场下调先前的预期。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日本工资调查仍在汇总，结论未明","企业之间的差异较大，结论尚未形成。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_japan_consumption",name:"日本消费恢复",bias:-1,vol:1,source:"模拟·街区经济简报",
    lead:"日本零售消费改善，日元或获支撑",leadCopy:"家庭支出与商店销量的初步调查改善，日元需求可能温和增加。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["日本消费改善延续，日元支撑增强","旅游和餐饮之外，日常购买也出现回暖。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["消费改善多因短期促销，日元支撑减弱","剔除促销影响后，家庭支出的恢复幅度有限。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日本消费调查好坏参半，方向未明","部分品类走强，其他品类仍较疲弱。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_yen_short_cover",name:"日元空头回补",bias:-1,vol:3,source:"模拟·汇市持仓观察",
    lead:"日元空头开始回补，USD/JPY 面临卖压",leadCopy:"部分基金买回此前卖出的日元，可能放大 USD/JPY 的下行波动。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["日元空头回补扩大，USD/JPY 下行压力增强","触发平仓的买盘接连进入，成交集中在数个价格区间。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["日元空头回补减弱，USD/JPY 或获支撑","新的方向性买盘未能接上，短线获利资金转向卖出。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日元回补与新卖盘交错，方向信号减弱","回补与新卖盘交错，模拟报价缺乏单一方向。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_safe_haven",name:"跨市场避险买盘",bias:-1,vol:3,source:"模拟·全球风险简报",
    lead:"海外股市转弱，本情景日元避险买盘增加",leadCopy:"本模拟情景设定为风险头寸退出、买回日元；现实中的避险需求也可能流向美元。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["跨市场减仓继续，本情景日元需求增强","多个交易时段都出现减仓，日元买盘维持活跃。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["海外股市收复跌幅，日元避险买盘退潮","担忧暂时缓和，先前退出的资金重新转向风险资产。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["避险交易出现分歧，日元买卖交错","股票与债券走势不同，汇市等待更清晰的信号。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_repatriation",name:"海外资金回流",bias:-1,vol:1,source:"模拟·企业资金台",
    lead:"日本企业海外收益回流，日元买盘增多",leadCopy:"企业将部分外币收入换回日元，结汇需求可能给 USD/JPY 带来下行压力。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["日本企业回流持续，USD/JPY 承压","多家企业分批完成换汇，买盘没有集中在单一时点。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["日本企业资金回流结束，日元支撑减弱","主要换汇需求已完成，美元购买需求重新占上风。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日本企业资金收付相抵，方向信号减弱","外币收益回流与进口付款需求大致平衡。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_japan_bond_yield",name:"日本长债收益率抬升",bias:-1,vol:2,source:"模拟·东京债市快讯",
    lead:"日本长债收益率抬升，日元或获支撑",leadCopy:"市场调整本地利率预期，美日利差可能收窄，日元可能获得支持。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["日本债市收益率继续抬升，日元支撑增强","多期限收益率共同抬升，美日利差预期收窄。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["日本长债买盘回归，日元支撑或减弱","收益率的上升未能持续，汇市重新评估先前交易。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日本债市逐渐稳定，汇市等待政策说明","收益率变化放缓，交易员等待政策说明。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_us_growth_slow",name:"美国增长放缓",bias:-1,vol:2,source:"模拟·纽约经济观察",
    lead:"美国企业订单减弱，USD/JPY 承压",leadCopy:"增长担忧可能令美国利率预期回落，减少美元买盘。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["美国订单走弱范围扩大，日元或获支撑","新调查与先前数据相互印证，市场继续降低利率预期。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["美国订单下降被修正，美元或获支撑","样本更新后，经济活动比初值显示的更稳健。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["美国增长数据互有强弱，方向未明","订单和家庭支出给出不同信号，方向交易趋于谨慎。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_carry_unwind",name:"利差交易减仓",bias:-1,vol:3,source:"模拟·跨境资金观察",
    lead:"日元融资交易减仓，日元回补需求增加",leadCopy:"以日元融资的部分头寸被关闭，买回日元可能压低 USD/JPY。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。",
    confirmed:["更多日元融资头寸退出，USD/JPY 承压","融资端的日元买回需求持续，波动仍高于平时。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    reversed:["日元融资减仓暂告段落，日元支撑减弱","剩余头寸保持不动，追随回补的短线买盘开始退出。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    muted:["日元融资头寸双向调整，方向信号减弱","减仓与重新建仓同时发生，汇价缺乏单一方向。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_us_retail",name:"美国零售走强",bias:1,vol:2,source:"模拟·纽约数据简报",
    lead:"美国零售初值强劲，USD/JPY 获支撑",leadCopy:"消费韧性提高美国维持较高利率的预期，美元可能获得支持。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["美国零售增长范围扩大，美元支撑增强","后续细项显示消费并非只由单一品类带动。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["美国零售增长被下修，USD/JPY 承压","修订数据弱于初值，美元利率交易出现回撤。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["美国零售与消费调查分化，方向未明","市场暂时无法判断增长是否持续。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_import_energy",name:"进口能源付款",bias:1,vol:1,source:"模拟·贸易资金观察",
    lead:"日本进口商美元付款增加，日元承压",leadCopy:"能源结算需求带来美元买盘，可能给 USD/JPY 带来上行压力。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["日本能源付款需求延续，美元或获支撑","进口商分批购入美元，日元买盘未能完全抵消。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["日本进口付款高峰过去，日元或获支撑","美元需求减少，出口企业的结汇买盘开始占上风。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["日本进出口换汇相抵，方向信号减弱","实际资金收付趋于平衡，盘中振幅缩小。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_japan_output",name:"日本工业调查转弱",bias:1,vol:2,source:"模拟·产业经济台",
    lead:"日本制造业订单减少，日元承压",leadCopy:"市场降低对日本增长和利率上行的预期，日元可能承压。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["日本制造业疲弱扩散，日元卖压增加","后续调查显示企业仍在削减新增订单与投资。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["日本订单减少多因短暂停工，日元或获支撑","更新信息显示主要产线已恢复，先前的担忧缓和。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["日本工业数据分化，方向信号减弱","部分行业恢复，其他行业仍承受库存压力。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_us_treasury",name:"美国债券拍卖",bias:1,vol:2,source:"模拟·纽约债市观察",
    lead:"美国债券拍卖需求偏弱，美元或获利差支持",leadCopy:"美债收益率上行可能扩大利差预期，美元或获支持。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["美债收益率继续抬升，USD/JPY 获支撑","债券买盘未能回归，美元利率优势受到更多关注。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["后续美债买盘增强，USD/JPY 或承压","收益率回落，先前围绕利差的仓位开始退出。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["美债收益率趋稳，日元买卖暂时均衡","市场消化拍卖结果，买卖双方暂时均衡。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_risk_rebound",name:"风险偏好回升",bias:1,vol:2,source:"模拟·全球市场观察",
    lead:"海外股市回暖，本情景日元避险需求减少",leadCopy:"本模拟情景设定为风险头寸恢复、日元融资增加；现实反应取决于利率及仓位等因素。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["股市反弹范围扩大，日元融资需求增加","避险仓位被进一步削减，日元融资交易有所恢复。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["股市反弹未能持续，日元再获避险买盘","尾盘抛售令风险偏好转弱，资金重新买回日元。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["风险资产涨跌交错，日元买卖分歧仍在","投资者对反弹的持续性仍有分歧。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_rate_patience",name:"日本政策耐心论",bias:1,vol:2,source:"模拟·政策记者会",
    lead:"日本政策强调继续观察，日元承压",leadCopy:"市场下调日本近期加息预期，可能给 USD/JPY 带来上行压力。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["日本政策继续审慎，日元支撑减弱","政策讨论继续关注增长风险，近期调整预期进一步降温。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["日本政策保留较早调整空间，日元或获支撑","市场重新阅读上下文，先前的宽松解读受到修正。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["日本政策未给出时间表，方向信号减弱","不同解读并存，价格在日内区间来回波动。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_outbound_funds",name:"海外资产配置",bias:1,vol:1,source:"模拟·长期资金简报",
    lead:"日本机构增加海外配置，日元承压",leadCopy:"部分长期资金卖出日元购买外币，日元可能受到温和压力。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["日本海外配置分批执行，日元卖压持续","换汇需求维持，但没有出现急促的追价交易。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["日本机构增加汇率对冲，日元或获支撑","买回日元的对冲需求抵消先前的外币购买。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["日本海外配置与对冲相抵，方向信号减弱","资金调整逐渐完成，方向性成交减少。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_us_wages",name:"美国薪资压力",bias:1,vol:3,source:"模拟·劳动力数据台",
    lead:"美国薪资增长超预估，USD/JPY 获支撑",leadCopy:"工资压力推高美国利率预期，美元可能获得短线买盘。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["美国薪资压力扩散，美元支撑增强","后续细项支持初步解读，美元买盘继续进入。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["美国薪资跳升受样本影响，美元支撑减弱","可比样本的工资增长更温和，利率预期随之回落。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["美国薪资与就业信号不同，方向未明","投资者等待更完整的数据再作判断。模拟倾向：方向信号减弱，价格仍会双向波动。"]},
  {id:"extra_quiet_session",name:"清淡时段美元买盘",bias:1,vol:2,source:"模拟·夜间成交观察",
    lead:"清淡时段美元买盘集中，USD/JPY 上行压力增加",leadCopy:"模拟报价变稀时，一批美元需求可能令 USD/JPY 振幅扩大。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。",
    confirmed:["后续美元需求接上，日元卖压持续","活跃时段开启后，新成交仍偏向美元购买。模拟倾向：USD/JPY 偏上行（日元偏弱），仍可能反向波动。"],
    reversed:["报价恢复后追涨需求退潮，USD/JPY 或回落","较密集的报价令先前清淡时段的异动被部分修正。模拟倾向：USD/JPY 偏下行（日元偏强），仍可能反向波动。"],
    muted:["美元买卖渐趋平衡，方向信号减弱","买卖逐渐平衡，短线波动回到日常范围。模拟倾向：方向信号减弱，价格仍会双向波动。"]}
];

export const BLACK_SWANS = [
  {id:"peg_break",name:"汇率安排突变",title:"模拟突发｜海外央行意外撤销汇率安排",
    copy:"本虚构情景设定为避险资金买入日元，USD/JPY 突然向下跳离原区间。其他汇率安排的变化不必然造成同样走势。",delta:-0.032,speaker:"久留美"},
  {id:"bank_failure",name:"大型机构融资中断",title:"模拟突发｜海外金融机构暂停正常融资",
    copy:"本虚构情景中，机构减仓与美元融资需求挤占流动性。美元走强、日元走弱，USD/JPY 向上跳升；随后模拟报价仍很稀疏。",delta:0.04,speaker:"安子"},
  {id:"pandemic_emergency",name:"休市期间紧急措施",title:"模拟突发｜多国公布公共卫生紧急措施",
    copy:"本虚构情景设定为消息在休市期间累积、资金买入日元。日元走强，USD/JPY 开盘向下跳空；此反应并非所有紧急事件的必然结果。",delta:-0.027,speaker:"萌智子"},
  {id:"gilt_spiral",name:"债市连锁平仓",title:"模拟突发｜海外债市出现连锁卖盘",
    copy:"本虚构情景中，被迫减仓从债市扩散到汇市，资金抢购美元补足融资。USD/JPY 向上跳升、日元走弱；不同资产的冲击可能不同。",delta:0.023,speaker:"安子"},
  {id:"liquidity_freeze",name:"银行间报价骤减",title:"模拟突发｜短期融资紧张，汇市报价突然变稀",
    copy:"本虚构情景中，交易对手缩减报价，一批日元买盘推动 USD/JPY 向下跳动。模拟报价变稀，下一报价明显低于刚才；流动性变差并不固定对应一个方向。",delta:-0.018,speaker:"久留美"},
  {id:"policy_surprise",name:"政策意外转向",title:"模拟突发｜日本政策会议给出意外宽松措施",
    copy:"本虚构情景中，日本意外宽松引来集中卖出日元、买入美元的需求。USD/JPY 向上跳升，市场仍在重新评估声明；政策消息不保证后续走势。",delta:0.035,speaker:"久留美"},
  {id:"referendum_night",name:"计票结果逆转",title:"模拟突发｜海外公投结果逆转市场预期",
    copy:"本虚构情景中，计票结果打破先前判断、风险头寸收缩。资金买回日元，USD/JPY 向下跨过数个价位；现实反应也取决于市场预期。",delta:-0.024,speaker:"芽吹"},
  {id:"commodity_dislocation",name:"交割合约异价",title:"模拟突发｜临近交割的商品合约出现异常报价",
    copy:"本虚构情景中，商品异价引发减仓与美元需求，USD/JPY 向上跳升、日元走弱。商品合约的价格规则不等于汇率规则。",delta:0.015,speaker:"久留美"}
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
