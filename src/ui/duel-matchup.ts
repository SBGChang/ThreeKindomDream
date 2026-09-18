import {counters,type DuelAction} from '../app/duel-model.js';

export type DuelRelation='win'|'draw'|'lose';
interface ResultCopy {title:string;effect:string}
const outcomes:Record<DuelAction,Record<DuelRelation,ResultCopy>>={
 attack:{
  win:{title:'破綻突襲',effect:'造成完整傷害；對手休養僅恢復一半。'},
  draw:{title:'刀鋒相抵',effect:'雙方攻勢抵銷，較弱一方承受差額傷害。'},
  lose:{title:'攻勢受阻',effect:'我方傷害只剩兩成，攻擊耗體加倍。'},
 },
 defend:{
  win:{title:'穩守卸力',effect:'我方只受兩成傷害，令對手攻擊耗體加倍。'},
  draw:{title:'對峙戒備',effect:'雙方消耗防守體力，下合均無法防守。'},
  lose:{title:'受激失守',effect:'我方遭到嘲諷，下合無法防守；對手恢復體力。'},
 },
 rest:{
  win:{title:'從容挑釁',effect:'我方恢復體力並嘲諷，令對手下合無法防守。'},
  draw:{title:'各自調息',effect:'雙方各自恢復體力，不回復血量。'},
  lose:{title:'調息中斷',effect:'我方恢復一半體力，並承受完整傷害。'},
 },
};
const evolutions:Record<DuelAction,ResultCopy>={
 attack:{title:'攻其不備',effect:'我方造成的傷害再提高 20%。'},
 defend:{title:'借力打力',effect:'完整反彈對手傷害，我方不消耗體力。'},
 rest:{title:'蓄勢待發',effect:'我方本次恢復量提升至 1.5 倍。'},
};
export function duelMatchup(action:DuelAction,enemy:DuelAction|null):{relation:DuelRelation;result:ResultCopy;evolution:ResultCopy|null;evolutionSide:'ally'|'enemy'|null} {
 if(enemy===null)return {relation:'draw',result:{title:action==='attack'?'趁隙追擊':action==='defend'?'持盾觀望':'趁隙調息',effect:action==='attack'?'對手昏厥，承受我方完整攻擊；本合結束時恢復體力。':action==='defend'?'我方照常消耗體力防守；對手本合結束時恢復體力。':'我方正常恢復體力；對手本合結束時恢復體力。'},evolution:null,evolutionSide:null};
 const relation=counters(action,enemy)?'win':counters(enemy,action)?'lose':'draw';
 return {relation,result:outcomes[action][relation],evolution:relation==='win'?evolutions[action]:relation==='lose'?{title:evolutions[enemy].title,effect:evolutions[enemy].effect.replaceAll('我方','敵方').replaceAll('對手','我方')}:null,evolutionSide:relation==='win'?'ally':relation==='lose'?'enemy':null};
}
