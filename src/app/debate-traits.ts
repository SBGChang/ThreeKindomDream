import {DEBATE_OFFICER_STATS} from './debate-roster.js';
import {DUEL_ACTORS} from '../contracts/core/duel-art.js';
import type {RallyBuild,RallySpecial,RallyPassive} from '../contracts/core/debate-rally.js';
export const RALLY_COLORS={reason:{name:'義理',color:'#398caf',motion:'claim'},evidence:{name:'事證',color:'#59956b',motion:'proof'},presence:{name:'聲勢',color:'#b95344',motion:'question'}} as const;
export const RALLY_SPECIALS:Record<RallySpecial,{name:string;trait:string;description:string;motion:'borrow'|'pressure'|'focus'|'rebut'}>={
 induct:{name:'歸納',trait:'融會貫通',description:'選兩張普通牌，兩張都變為點數總和，最高 9；牌色不變。',motion:'borrow'},
 shout:{name:'怒斥',trait:'當頭棒喝',description:'下一張普通牌傷害翻倍，對手下回合跳過並抽一張。',motion:'pressure'},
 concentrate:{name:'集中',trait:'博覽強記',description:'立即抽三張牌。',motion:'focus'},
 reflect:{name:'反論',trait:'以子之矛',description:'反彈下一次普通牌傷害，自己不受該次傷害。',motion:'rebut'},
 wild:{name:'詭辯',trait:'奇辭巧辯',description:'下一張普通牌可無視牌色與點數限制。',motion:'borrow'},
};
export const RALLY_PASSIVES:Record<RallyPassive,{name:string;description:string}>={
 composure:{name:'沉著',description:'受到的傷害降低 10%。'},
 eloquence:{name:'雄辯',description:'普通牌傷害提高 10%。'},
 precision:{name:'以小見大',description:'1～3 點普通牌傷害提高 35%。'},
 adaptable:{name:'借題發揮',description:'同點換色時傷害提高 25%。'},
 momentum:{name:'乘勝追論',description:'有 Combo 時額外提高 10% 傷害。'},
 resourceful:{name:'臨機應變',description:'跳過時抽兩張普通牌，而非一張牌。'},
 renewal:{name:'重整旗鼓',description:'每次另起恢復 8 點心防。'},
 scholar:{name:'博聞',description:'初始及另起多抽一張普通牌。'},
};
export interface RallyProfile {id:string;name:string;build:RallyBuild;reason:string}
// Gameplay assignments, not claims about historical personalities. Unlisted officers get ordinary cards.
const groups:Record<RallySpecial,string[]>={
 induct:['zhugeliang','xunyu','chenqun','zhangzhao','jiangwan','buzhi','maojie'],
 shout:['caocao','zhangfei','zhangjiao','sunce','chengyu','guanyu'],
 concentrate:['zhouyu','luxun','lumeng','lusu'],
 reflect:['simayi','jiaxu','shenpei','huangfusong'],
 wild:['guojia','pangtong','guotu'],
};
const passiveGroups:Record<RallyPassive,string[]>={
 composure:['simayi','xunyu','lusu','zhaoyun','yujin','huangzhong','maojie'],
 eloquence:['caocao','zhugeliang','zhouyu','zhangzhao','zhangjiao','liubei'],
 precision:['guojia','jiaxu','chengyu','chenqun','buzhi'],
 adaptable:['guojia','pangtong','luxun','sunquan','guotu'],
 momentum:['zhangfei','sunce','guanyu','lvbu','ganning','taishici','zhangliao','lejin','yanliang'],
 resourceful:['pangtong','jiaxu','lumeng','caoxiu','xiahouyuan','tadun','lijue'],
 renewal:['liubei','sunquan','sunjian','huangfusong','xiahoudun','huanggai','shenpei','yuanshao'],
 scholar:['zhugeliang','xunyu','zhouyu','luxun','jiangwan','chenqun','zhangzhao','lusu'],
};
export const RALLY_PROFILES:RallyProfile[]=Object.entries(DUEL_ACTORS).map(([id,name])=>{
 const special=(Object.keys(groups) as RallySpecial[]).find(k=>groups[k].includes(id))??null;
 const passives=(Object.keys(passiveGroups) as RallyPassive[]).filter(k=>passiveGroups[k].includes(id)).slice(0,2);
 return {id,name,build:{int:DEBATE_OFFICER_STATS[id]?.int??65,pol:DEBATE_OFFICER_STATS[id]?.pol??65,special,passives},reason:special?RALLY_SPECIALS[special].trait+'：'+passives.map(p=>RALLY_PASSIVES[p].name).join('、'):'普通牌路線'+(passives.length?'：'+passives.map(p=>RALLY_PASSIVES[p].name).join('、'):'，無特殊牌來源')};
});
export const rallyProfile=(id:string)=>RALLY_PROFILES.find(p=>p.id===id)??RALLY_PROFILES.find(p=>p.id==='npc_soldier')!;
