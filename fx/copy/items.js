// 玩家可直接编辑名称与效果说明；cost 为游戏价格。
export const PROPS = {
 takeaway:{name:'点一份外卖',caption:'¥800 · 承受力 +10',copy:'吃顿好的。心理承受力永久增加 10 点，每天可点一次。',speaker:'久留美',cost:800},
 noodles:{name:'关灯吃泡面',caption:'¥150 · 今日生活费 −40%',copy:'今晚省一点：本日结算的生活费减少 40%，不影响交易收益。',speaker:'久留美',cost:150},
 energy:{name:'魔爪能量饮料',caption:'¥300 · 今日多一轮交易',copy:'增加本日一轮真实行情与交易决策，不增加持仓收益或改变价格。每天一罐。',speaker:'久留美',cost:300},
 celebration:{name:'预约温泉与按摩',caption:'¥8,000 · 承受力 +20',copy:'花钱放松一下。心理承受力永久增加 20 点，每天一次。',speaker:'久留美',cost:8000},
 father:{name:'父亲的贵重存款',caption:'¥3,000,000 · 整章一次',copy:'取出 ¥3,000,000，计为欠款，不计交易收益。可随时归还。未还清时心理压力增加。',speaker:'久留美'},
 mochiko:{name:'萌智子帮忙盯盘',caption:'¥500 · 本日爆仓损失减免 25%',copy:'本日强平时，实际爆仓净亏损只承担 75%；减免单独记账，保护后的亏损不超过账户可用权益，不穿仓。普通止损和平仓不享受减免。',speaker:'萌智子',cost:500}
};
export const PROP_LINES={takeaway:'这顿我请自己。',noodles:'灯就不开了。',energy:'今晚再来一轮。',celebration:'今天花一点。',mochiko:'我帮你看着。'};
