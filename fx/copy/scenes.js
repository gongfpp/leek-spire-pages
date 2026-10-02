// 休市场景文案与按钮名称。原作引文由 script-lines.js 管理。
export const ITEM_SCENES={
 friendStudy:{lines:[['萌智子','还在看？我帮你盯一会儿。'],['久留美','拜托了。']],choices:{continue:[['萌智子','真撑不住的时候，我会帮忙。']]}},
 roommate:{lines:[['安子','给你带了罐魔爪。'],['久留美','今晚还有行情吗？']],choices:{continue:[['安子','喝完记得睡。']]}}
};
const choice=(id,label,mood,stress=0,trust=0)=>({id,label,lines:[],mood,stress,trust});
// Static metadata is safe for journals; runtime text always comes from getStory.
export const STORY_DEFINITIONS={
 fatherDiscover:{id:'father_discover',title:'父亲的存款',lines:[],choices:[choice('continue','继续','calm')]},
 fatherUnlock:{id:'father_unlock',title:'父亲的贵重存款',lines:[],choices:[choice('look_at_savings','继续','guilty',2)]},
 fatherFound:{id:'father_discovered',title:'父亲发现了',lines:[],choices:[choice('admit','继续','guilty',6,-2)]},
 repayPartial:{id:'father_repay_partial',title:'部分归还完成',lines:[],choices:[choice('record_payment','继续','determined',-4,1)]},
 repayFull:{id:'father_repay_full',title:'全部归还完成',lines:[],choices:[choice('close_envelope','继续','relieved',-6,2)]},
 friendStudy:{id:'friend_study',title:'休市后的消息',lines:[],choices:[choice('continue','继续','warm',-3,1)]},
 roommate:{id:'roommate',title:'休市后的消息',lines:[],choices:[choice('continue','继续','warm',-3,1)]},
 quietNight:{id:'quiet_night',title:'休市了',lines:[],choices:[choice('continue','继续','calm',-3)]}
};
export const SCENE_LINES={fatherDiscover:[['久留美','柜子里……爸爸的存款。']],quietNight:[['久留美','今天到这里。睡了。']]};
