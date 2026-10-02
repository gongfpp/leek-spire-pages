// Original fan-game scenes; these are not quotations from the manga.
export const ITEM_EVENTS={
 threshold75:['mochiko','notebook'],threshold50:['yasuko','airplane'],
 friendStudy:['tea'],roommate:['energy'],classroom:['notebook','mochiko'],
 friendWalk:['amulet'],lonelyEvening:['airplane','yasuko'],recovery:['receipt']
};
export const UNLOCK_HINTS={
 tea:'休市事件「一起休息」后获得',energy:'第 2 天起，休市事件「短暂休息」后获得',
 notebook:'承受力降至 75，或第 3 天起整理笔记',mochiko:'承受力降至 75，或第 3 天起整理笔记',
 airplane:'承受力降至 50，或第 5 天起夜间休息',yasuko:'承受力降至 50，或第 5 天起夜间休息',
 amulet:'第 4 天起，朋友陪伴事件后获得',receipt:'某天交易净盈利，休市复盘后获得',
 father:'绝望且账户不足 ¥30,000，休市后查看柜子'
};
const self=text=>['久留美',text],mochi=text=>['萌智子',text],yasu=text=>['安子',text];
export const ITEM_SCENES={
 friendStudy:{lines:[mochi('休市了。要不要下来买杯热茶？'),self('休市只是市场暂时放过我，不代表我认输。'),mochi('知道。先让手暖一点，你握手机握得太久了。'),self('茶要是也能涨停就好了。')],choices:{review_notes:[self('先买茶。杯子上正好能写明天的计划。'),mochi('那就写一句：茶凉了可以换一杯，订单不用一直换。')],tea_break:[self('我要热的，最热的那种。'),mochi('可以。杯盖揭开一点，别把市场的气撒在舌头上。')]}},
 roommate:{lines:[yasu('便利店第二罐饮料半价，你要吗？'),self('半价？这已经是我今晚听过最可靠的利好。'),yasu('这是饮料，不是让你通宵的许可证。'),self('我只是想把精神留着，行情什么时候来可不一定。')],choices:{help_laundry:[self('先收拾房间。饮料放明天喝。'),yasu('好，空罐子也记得扔。')],put_phone_aside:[self('手机先充电，饮料先收起来。'),yasu('你也充会儿电，别只有手机休息。')]}},
 classroom:{lines:[mochi('给你一本空白笔记。每一笔写一个开仓理由。'),self('空白？怎么没有答案啊。'),mochi('市场也没有答案页。至少别把「不服气」写成理由。'),self('那我用铅笔，留点修改的余地。')],choices:{do_part:[self('我写下了：明天先看止损。'),mochi('下次需要提醒就找我。写下来也要做到。')],request_extension:[self('今天只写日期，明天补理由。'),mochi('可以。笔记和提醒先留着，别拿空白页冒充计划。')]}},
 friendWalk:{lines:[mochi('路过神社，想进去走走吗？'),self('神明能直接把两千万打进账户吗？'),mochi('御守只是让人安心。你得自己管住下单的手。'),self('那我买一个，让它监督我……至少监督两段。')],choices:{cat_story:[self('御守收好。先看看那边的猫。'),mochi('它盯着鱼，比你盯屏幕专心。')],quiet_walk:[self('今晚走慢一点。御守不会催我。'),mochi('我也不会。回去以后记得睡觉。')]}},
 lonelyEvening:{lines:[yasu('手机可以开飞行模式。你本人不用飞去交易所。'),self('万一关掉以后出现机会呢？'),yasu('那就是你今晚没有看到的机会。'),self('你说得这么干脆，我都不好意思继续找借口了。')],choices:{call_friend:[self('好，开之前先打个电话。停手卡也留给我。'),yasu('想聊天就聊天，不用拿行情当开场白。')],open_window:[self('手机放这儿，我去开窗。'),yasu('停手卡收好。窗外不会因为你不刷新就停止。')]}},
 recovery:{lines:[mochi('那天的盈利已经收盘了，要不要把记录存起来？'),self('存起来当然可以，我还想给它裱个框。'),mochi('先用封存袋。截图不会替你保住下一笔浮盈。'),self('下次拍照之前先平一半，剩下一半给我留点发挥空间。')],choices:{walk_home:[self('封存袋收下了。今晚先到这里。'),mochi('那就走吧。路上不用再刷新这张截图。')],notice_flowers:[self('我去看看花，截图明天再欣赏。'),mochi('好。花也不用你替它盯盘。')]}}
};
export function itemUnlocked(s,id){return id==='father'?!!s.family?.unlocked:!!s.itemUnlocks?.[id];}
