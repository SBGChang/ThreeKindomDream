import type {NotableDef} from '../src/contracts/core/definitions.js';
import type {StoryRequirement} from '../src/contracts/core/story.js';
type R=NonNullable<NotableDef['recruitment']>;
const c=(node:string,option:string):StoryRequirement=>({kind:'choice',node,option});
const depth=(chapter:string,min:number):StoryRequirement=>({kind:'depth',chapter:'ch:'+chapter,min});
const initial=new Set('yujin xiahoudun lejin chengyu chenqun maojie zhangfei zhaoyun jiangwan huangzhong weiyan fazheng lusu lumeng taishici huanggai zhangzhao buzhi'.split(' '));
const rules:Record<string,R>={
 caocao:{hint:'首次完成魏國圓夢結算',fullDream:'faction:wei'},liubei:{hint:'首次完成蜀國圓夢結算',fullDream:'faction:shu'},sunquan:{hint:'首次完成吳國圓夢結算',fullDream:'faction:wu'},
 zhangliao:{hint:'主角統御本體達 80',attr:{name:'lead',min:80}},ganning:{hint:'主角武力本體達 85',attr:{name:'war',min:85}},
 xunyu:{hint:'正式文官達第 6 階；先於天命商店提高官階上限',career:{line:'civil',min:6}},machao:{hint:'正式武官達第 6 階；先於天命商店提高官階上限',career:{line:'martial',min:6}},
 jiaxu:{hint:'曾真正取得竹簡與印綬，可分不同夢',items:['item:bamboo','item:seal']},
 jiangwei:{hint:'蜀國北伐通過第 7 關',story:[depth('shu.northern',7)]},
 dianwei:{hint:'宛城備武器、留營門，通過第 3 關',story:[c('W2.A','arms'),c('W2.B','gate'),depth('wei.guandu',3)]},
 guojia:{hint:'河北設驛醫隊、留郭嘉統籌，通過第 4 關',story:[c('W3.A','relay'),c('W3.B','rest'),depth('wei.hebei',4)]},
 guanyu:{hint:'赤壁立盟、漢中留援路，麥城接援通過第 5 關',story:[c('S4.A','pact'),c('S6.A','corridor'),c('S7.A','rescue'),depth('shu.jingzhou',5)]},
 pangtong:{hint:'入蜀勘路與交接，通過落鳳坡第 5 關',story:[c('S5.A','survey'),c('S5.B','handover'),depth('shu.yizhou',5)]},
 zhugeliang:{hint:'入蜀與漢中交接，北伐分權並通過第 5 關',story:[c('S5.B','handover'),c('S6.B','handover'),c('S8.A','delegate'),depth('shu.northern',5)]},
 sunjian:{hint:'江東先設斥候與交接，通過第 2 關',story:[c('U2.A','scouts'),c('U2.B','handover'),depth('wu.jiangdong',2)]},
 sunce:{hint:'江東設斥候，獵場護送並通過第 5 關',story:[c('U2.A','scouts'),c('U3.A','escort'),depth('wu.hunt',5)]},
 zhouyu:{hint:'荊淮設醫舟與交接，通過第 2 關',story:[c('U5.A','medical'),c('U5.B','handover'),depth('wu.jinghuai',2)]},
 luxun:{hint:'石亭立規交接，朝議允許申辯並通過第 5 關',story:[c('U7.A','charter'),c('U7.B','handover'),c('U8.A','hearing'),depth('wu.succession',5)]},
 lvbu:{hint:'虎牢關接受邀戰，單挑擊敗全盛或疲憊呂布'},
};
export function withRecruitment(d:NotableDef):NotableDef{
 const slug=String(d.notableId).split(':')[1]!;const recruitment=initial.has(slug)?{initial:true,hint:'初始相逢資格'}:rules[slug];
 if(!recruitment)throw Error('角色缺少解鎖條件：'+slug);return {...d,recruitment};
}
