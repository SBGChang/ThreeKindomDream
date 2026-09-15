import type {DuelAction,DuelTrait,DuelBuild,DuelFighter,DuelTurn,DuelState} from '../contracts/core/duel.js';
export type {DuelAction,DuelTrait,DuelBuild,DuelFighter,DuelTurn,DuelState} from '../contracts/core/duel.js';
/** Simultaneous duel rules. Injury is independent from stamina and army casualties. */
export const DUEL_ACTIONS = ['attack','defend','rest'] as const;
export const DUEL_TRAITS:Record<DuelTrait,{name:string;description:string}> = {
  none:{name:'無特性',description:'用於比較基礎數值'},
  momentum:{name:'乘勝',description:'出招前 Combo ≥ 4，攻擊威力 +12%'},
  steady:{name:'沉毅',description:'防守消耗體力由 12 降為 9'},
  breathing:{name:'調息',description:'休養基礎恢復量 +6，受攻擊時恢復一半'},
  reversal:{name:'借勢',description:'防守克制攻擊時，借力打力機率 +8 個百分點'},
};
export const DUEL_RULES={attackCost:24,defendCost:12,faintBelow:5,comboCap:6,pointsCap:12,streakCap:5,roundLimit:24,baseEvolution:.08,pointEvolution:.025,evolutionCap:.5} as const;
export const ACTION_NAME:Record<DuelAction,string>={attack:'攻擊',defend:'防守',rest:'休養'};
export const DEFAULT_DUEL_BUILD:DuelBuild={war:70,lead:65,trait:'none'};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
/** Remaining health; retain cumulative injury in saved duels for compatibility. */
export const duelHealth=(f:DuelFighter):number=>clamp(f.injuryLimit-f.injury,0,f.injuryLimit);
export function createFighter(build:DuelBuild,progression=true):DuelFighter {
  const war=clamp(Number.isFinite(build.war)?Math.round(build.war):70,1,100);
  const lead=clamp(Number.isFinite(build.lead)?Math.round(build.lead):65,1,100);
  const maxStamina=80+Math.round(lead*.4);
  return {progression,build:{war,lead,trait:build.trait in DUEL_TRAITS?build.trait:'none'},attack:18+war*.32,defense:6+lead*.16,maxStamina,stamina:maxStamina,injury:0,injuryLimit:100+Math.round(lead*.2),recovery:DUEL_RULES.attackCost*2,combo:0,points:{attack:0,defend:0,rest:0},previous:null,streak:0,taunted:false,fainted:false};
}
export const actionCost=(f:DuelFighter,a:DuelAction):number=>a==='attack'?DUEL_RULES.attackCost:a==='defend'?(f.build.trait==='steady'?9:DUEL_RULES.defendCost):0;
export function actionBlock(f:DuelFighter,a:DuelAction):string {
  if(f.fainted)return '昏厥，本回合無法行動';
  if(a==='defend'&&f.taunted)return '本回合禁止防守';
  if(f.stamina<actionCost(f,a))return '體力不足';
  return '';
}
export const counters=(a:DuelAction|null,b:DuelAction|null):boolean=>a==='attack'&&b==='rest'||a==='rest'&&b==='defend'||a==='defend'&&b==='attack';
const roll=(s:DuelState)=>{s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/0x100000000;};
export function evolutionChance(f:DuelFighter,a:DuelAction):number {
  if(f.progression===false)return 0;
  return Math.min(DUEL_RULES.evolutionCap,DUEL_RULES.baseEvolution+f.points[a]*DUEL_RULES.pointEvolution+(a==='defend'&&f.build.trait==='reversal'?.08:0));
}
export const attackPower=(f:DuelFighter):number=>f.attack*(1+(f.progression===false?0:f.combo)*.04)*(f.progression!==false&&f.build.trait==='momentum'&&f.combo>=4?1.12:1);
export const defensePower=(f:DuelFighter):number=>f.defense*(1+(f.progression===false?0:f.combo)*.03);
export const fullDamage=(source:DuelFighter,target:DuelFighter):number=>Math.max(1,Math.round(attackPower(source)/(1+defensePower(target)/100)));
export const restAmount=(f:DuelFighter):number=>Math.max(DUEL_RULES.attackCost*2,f.recovery)+(f.build.trait==='breathing'?6:0);
/** AI uses only public state and previous actions, never the player's current selection. */
function commitEnemy(s:DuelState):void {
  const f=s.enemy,other=s.ally;
  if(f.fainted){s.enemyAction=null;return;}
  if((other.fainted||(actionBlock(other,'attack')&&actionBlock(other,'defend')))&&!actionBlock(f,'attack')){s.enemyAction='attack';return;}
  const weights:Record<DuelAction,number>={attack:1,defend:1,rest:1};
  if(f.stamina<48)weights.rest+=1.1;
  if(f.stamina>f.maxStamina-15)weights.rest*=.35;
  if(other.stamina<24||other.fainted)weights.attack+=1.3;
  if(other.taunted)weights.attack+=.5;
  if(other.previous){const counter=DUEL_ACTIONS.find(a=>counters(a,other.previous))!;weights[counter]+=.35+Math.min(3,other.streak)*.7;}
  if(f.build.trait==='reversal'||f.build.trait==='steady')weights.defend+=.25;
  if(f.build.trait==='breathing')weights.rest+=.2;
  if(f.build.trait==='momentum')weights.attack+=.25;
  const available=DUEL_ACTIONS.filter(a=>!actionBlock(f,a));
  const total=available.reduce((n,a)=>n+weights[a],0);let r=roll(s)*total;
  s.enemyAction=available.at(-1)??'rest';
  for(const a of available){r-=weights[a];if(r<0){s.enemyAction=a;break;}}
}
export function createDuel(ally:DuelBuild=DEFAULT_DUEL_BUILD,enemy:DuelBuild=DEFAULT_DUEL_BUILD,seed=1):DuelState {
  const s:DuelState={ally:createFighter(ally),enemy:createFighter(enemy,false),round:1,rng:seed>>>0,enemyAction:null,last:null,result:null,history:[]};
  commitEnemy(s);return s;
}
function progress(f:DuelFighter,a:DuelAction|null,b:DuelAction|null):void {
  if(a===null){f.combo=0;f.previous=null;f.streak=0;return;}
  const repeated=f.previous===a;
  f.streak=repeated?Math.min(DUEL_RULES.streakCap,f.streak+1):1;
  if(counters(b,a))f.combo=0;
  else{
    const win=counters(a,b);
    f.combo=Math.min(DUEL_RULES.comboCap,f.combo+(win?2:1));
    if(repeated)f.points[a]=Math.min(DUEL_RULES.pointsCap,f.points[a]+f.streak*(win?2:1));
  }
  f.previous=a;
}
/** Both sides use a start-of-round snapshot. Caller cannot submit an illegal action. */
export function resolveDuel(s:DuelState,action:DuelAction|null):boolean {return resolveRound(s,action);}
/** Forecasts choose both non-evolved/evolved branches, never inspect the live RNG outcome. */
function resolveRound(s:DuelState,action:DuelAction|null,forceEvolution?:boolean):boolean {
  if(s.result)return false;
  if(s.ally.fainted?action!==null:action===null||!!actionBlock(s.ally,action))return false;
  const a=s.ally,b=s.enemy,x=action,y=s.enemyAction;
  // Normalize old saved opponents before damage or evolution is computed.
  b.progression=false;b.combo=0;b.points={attack:0,defend:0,rest:0};b.streak=0;
  const before={ally:{stamina:a.stamina,injury:a.injury},enemy:{stamina:b.stamina,injury:b.injury}};
  const allyFainted=a.fainted,enemyFainted=b.fainted;
  const hitA=fullDamage(a,b),hitB=fullDamage(b,a);
  const evoA=x!==null&&counters(x,y)&&(forceEvolution??(roll(s)<evolutionChance(a,x)));
  const evolution=(act:DuelAction|null,evolved:boolean)=>!evolved?null:act==='attack'?'攻其不備':act==='rest'?'蓄勢待發':'借力打力';
  const turn:DuelTurn={ally:x,enemy:y,damageToAlly:0,damageToEnemy:0,allyEvolution:evolution(x,evoA),enemyEvolution:null,allyCost:x?actionCost(a,x):0,enemyCost:y?actionCost(b,y):0,allyRecovery:0,enemyRecovery:0,notes:[]};
  // A previous taunt lasts exactly this decision; a new taunt applies to the next one.
  a.taunted=false;b.taunted=false;a.fainted=false;b.fainted=false;
  if(x==='attack'&&y==='attack'){
    turn.damageToEnemy=Math.max(0,hitA-hitB);turn.damageToAlly=Math.max(0,hitB-hitA);
    turn.notes.push('雙方攻擊抵銷，只承受差額。');
  }else{
    if(x==='attack'){
      if(y==='defend'){
        turn.allyCost*=2;
        turn.damageToEnemy=Math.round(hitA*.2);
      }else turn.damageToEnemy=Math.round(hitA*(evoA?1.2:1));
    }
    if(y==='attack'){
      if(x==='defend'){
        turn.enemyCost*=2;
        if(evoA){turn.damageToEnemy=hitB;turn.allyCost=0;}else turn.damageToAlly=Math.round(hitB*.2);
      }else turn.damageToAlly=hitB;
    }
  }
  const recover=(f:DuelFighter,act:DuelAction|null,opponent:DuelAction|null,evolved:boolean,wasFainted:boolean)=>wasFainted?DUEL_RULES.attackCost:act==='rest'?Math.round(restAmount(f)*(opponent==='attack'?.5:evolved?1.5:1)):0;
  const recoveryA=recover(a,x,y,evoA,allyFainted),recoveryB=recover(b,y,x,false,enemyFainted);
  a.stamina=Math.max(0,a.stamina-turn.allyCost);b.stamina=Math.max(0,b.stamina-turn.enemyCost);
  turn.allyRecovery=Math.min(a.maxStamina-a.stamina,recoveryA);turn.enemyRecovery=Math.min(b.maxStamina-b.stamina,recoveryB);
  a.stamina+=turn.allyRecovery;b.stamina+=turn.enemyRecovery;
  a.injury=Math.min(a.injuryLimit,a.injury+turn.damageToAlly);b.injury=Math.min(b.injuryLimit,b.injury+turn.damageToEnemy);
  if(x==='rest'&&y==='defend'){b.taunted=true;turn.notes.push('敵方受嘲諷，下回合禁防。');}
  if(y==='rest'&&x==='defend'){a.taunted=true;turn.notes.push('我方受嘲諷，下回合禁防。');}
  if(x==='defend'&&y==='defend'){a.taunted=true;b.taunted=true;turn.notes.push('雙方對峙，下回合均禁止防守。');}
  if(x==='rest'&&y==='attack')turn.notes.push('我方休養受阻，恢復一半體力。');
  if(y==='rest'&&x==='attack')turn.notes.push('敵方休養受阻，恢復一半體力。');
  if(x==='attack'&&y==='defend')turn.notes.push('我方攻擊受阻，消耗雙倍體力。');
  if(y==='attack'&&x==='defend')turn.notes.push('敵方攻擊受阻，消耗雙倍體力。');
  progress(a,x,y);b.previous=y;
  for(const [f,label] of [[a,'我方'],[b,'敵方']] as const){
    if(f.stamina<DUEL_RULES.faintBelow&&f.injury<f.injuryLimit){f.fainted=true;turn.notes.push(`${label}力竭昏厥，下回合無法行動。`);}
  }
  if(allyFainted)turn.notes.push('我方昏厥休息，恢復 24 體力。');
  if(enemyFainted)turn.notes.push('敵方昏厥休息，恢復 24 體力。');
  s.last=turn;
  turn.changes={ally:{stamina:a.stamina-before.ally.stamina,injury:a.injury-before.ally.injury},enemy:{stamina:b.stamina-before.enemy.stamina,injury:b.injury-before.enemy.injury}};
  if(a.injury>=a.injuryLimit||b.injury>=b.injuryLimit)s.result=a.injury>=a.injuryLimit?(b.injury>=b.injuryLimit?'draw':'enemy'):'ally';
  else if(s.round>=DUEL_RULES.roundLimit){
    const difference=a.injury/a.injuryLimit-b.injury/b.injuryLimit;
    s.result=Math.abs(difference)<1e-9?'draw':difference<0?'ally':'enemy';
    turn.notes.push(s.result==='draw'?'交鋒已盡，勢均力敵，返回戰場。':'交鋒已盡，以剩餘血量比例判定勝負。');
  }
  s.history.push(structuredClone(turn));
  if(!s.result){s.round++;commitEnemy(s);}
  return true;
}

export interface DuelForecast {
 ally:{health:[number,number];stamina:[number,number]};
 enemy:{health:[number,number];stamina:[number,number]};
 notes:string[];
}
/** Hypothetical public information only; neither live state nor its committed enemy action changes. */
export function forecastDuel(s:DuelState,action:DuelAction,enemy:DuelAction|null):DuelForecast|null {
 if(actionBlock(s.ally,action)||s.result|| (enemy!==null?!!actionBlock(s.enemy,enemy):!s.enemy.fainted))return null;
 const branches=[false,true].map(evolved=>{const copy=structuredClone(s);copy.enemyAction=enemy;resolveRound(copy,action,evolved);return copy;});
 const side=(key:'ally'|'enemy')=>{const before=s[key],normal=branches[0]![key],evolved=branches[1]![key];const hp=[duelHealth(normal)-duelHealth(before),duelHealth(evolved)-duelHealth(before)].sort((a,b)=>a-b),sp=[normal.stamina-before.stamina,evolved.stamina-before.stamina].sort((a,b)=>a-b);return {health:hp as [number,number],stamina:sp as [number,number]};};
 return {ally:side('ally'),enemy:side('enemy'),notes:branches[0]!.last!.notes};
}
/** Stable once per decision, no new rolls on hover, selection or save/resume. */
export function duelReadHint(s:DuelState):DuelAction|null {
 const gap=s.ally.build.war-s.enemy.build.war;
 if(gap<20||s.ally.fainted||s.enemy.fainted||s.result)return null;
 const chance=Math.min(.75,.3+(gap-20)*.015);
 let hash=(s.rng^Math.imul(s.round,0x9e3779b1))>>>0;
 hash=Math.imul(hash^(hash>>>16),0x45d9f3b)>>>0;
 return hash/0x100000000<chance?s.enemyAction:null;
}
