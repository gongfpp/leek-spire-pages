// 过场短句及原作单格翻译，直接由页面读取。不要改键名。
export const TRANSITION_COPY = {
  positive:'FX 简单！',negative:'盈利…都去哪里了',
  neutral:'明天开盘',
  dayTitle:'今日结算',noTrade:'本日未成交',
  profitToLoss:'刚才还在盈利，现在已经亏了。',
  lossToProfit:'从亏损转成盈利，终于松了一口气。',
  restContinue:'明天开盘',
  homage:{
    'first-day':'“还在发抖……但勉强撑住了，得救了！”',
    'big-win':'“利益……确定！”',
    'big-loss':'“等一下！跌得太快了！不是说不会跌破 93 日元吗！”'
  }
};
export function dailyContinueLabel(report){
 const net=Number.isFinite(report?.net)?Number(report.net.toFixed(2)):0;
 return net>0?TRANSITION_COPY.positive:net<0?TRANSITION_COPY.negative:TRANSITION_COPY.neutral;
}
