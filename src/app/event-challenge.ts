import type { RunContext } from '../contracts/core/context.js';
import type { EventChallengeState,EventChallengeDef,ChallengeOutcome } from '../contracts/core/event-challenge.js';
import type { EffectResolver } from '../modules/effect.js';
import {statQuery} from '../modules/stats.js';
import {activeTraits,traitDef,levelOf} from '../modules/ability.js';
import {equipDuel,equipmentEffects} from '../modules/equipment.js';
import {hostLimits} from '../modules/campaign.js';
import {skillId,targetId} from '../contracts/core/ids.js';
import {createDuel,resolveDuel,DUEL_ACTIONS} from './duel-model.js';
import {duelClashDuration} from './duel-presentation.js';
import {createRally,actRally} from './debate-rally-model.js';
import {rallyProfile} from './debate-traits.js';
import type {RallyAction,RallySide} from '../contracts/core/debate-rally.js';
import {createConfiguredBattle,startBattle,tickBattle,armyCount,armyComposition} from './realtime-battle-model.js';
import {realtimeSkill} from './realtime-campaign.js';
import {duelTraitBuild} from './duel-trait-build.js';

export function createEventChallenge(eventId:string,option:number,definition:EventChallengeDef,ctx:RunContext):EventChallengeState {
 let seed=(Number(ctx.state.seed)+ctx.state.progress.turn*7919+option)>>>0;
 for(const char of eventId)seed=(Math.imul(seed,31)+char.charCodeAt(0))>>>0;
 return {eventId,option,turn:ctx.state.progress.turn,seed,definition:structuredClone(definition),phase:'opening',paused:false,outcome:null,skills:ctx.state.abilities.skills.slice(0,3).map(String),infantryPercent:60,contest:null,rally:null,battle:null};
}
export function enterEventChallenge(s:EventChallengeState,ctx:RunContext,fx:EffectResolver):void {
 if(s.phase!=='opening'&&s.phase!=='prep')return;
 const d=s.definition,attr=(a:'lead'|'war'|'int'|'pol')=>statQuery.attr(a,ctx);
 if(d.mode==='battle'&&s.phase==='opening'){s.phase='prep';return;}
 if(d.mode==='duel'){
  const enemy=d.duel?.enemy??{war:d.ability,lead:d.ability,trait:'none' as const};
  const stage=d.stages?.[s.stage??0];
  const duel=createDuel({...d.duel?.ally,war:attr('war'),lead:attr('lead'),...duelTraitBuild(activeTraits(ctx),ctx)},{...enemy,...(stage?{power:stage.power}:{})},(s.seed+(s.stage??0)*7919)>>>0);equipDuel(duel.ally,ctx);
  s.contest={duel,kind:'duel',phase:'read',phaseTime:0,round:1,allyHp:100,enemyHp:100,insight:0,revealed:false,challenge:{cue:'',hint:'',choices:['攻擊','防守','休養'],correct:-1,answer:''},choice:null,success:false,perfect:false,feedback:'',winner:null,draw:false,elapsed:0,allyId:'lord',allyName:'你',enemyId:d.opponent,enemyName:d.opponentName};
 }else if(d.mode==='debate'){
  const enemy=d.debate?.enemy??{...rallyProfile(d.opponent).build,int:d.ability,pol:d.ability};
  s.rally=createRally({...d.debate?.ally,int:attr('int'),pol:attr('pol'),passives:d.debate?.ally?.passives??[]},enemy,s.seed);
 }else{
  if(s.skills.length>3||new Set(s.skills).size!==s.skills.length||s.skills.some(id=>!ctx.state.abilities.skills.some(v=>String(v)===id)))throw Error('技能配置無效');
  if(!Number.isInteger(s.infantryPercent)||s.infantryPercent<0||s.infantryPercent>100)throw Error('兵種配比無效');
  const limits=hostLimits(ctx,fx),rt=ctx.defs.single('battleRule').realtime;
  const commanders:import('../contracts/core/realtime-battle.js').Commander[]=[{id:'lord',name:'主角',side:'ally',homeX:125,x:125,y:470,pose:'command',poseTime:0,flip:false}];
  for(let i=0;i<(d.enemySquads??2);i++)commanders.push({id:'enemy-'+i,name:d.opponentName,side:'enemy',homeX:1470,x:1470,y:350+i*80,pose:'command',poseTime:0,flip:true});
  s.battle=createConfiguredBattle({troops:limits.troopsMax,supply:limits.supplyMax,supplyMax:limits.supplyMax,regen:limits.supplyMax*rt.supplyRegenRatio,duration:rt.duration,rng:s.seed,infantryPercent:s.infantryPercent,skills:s.skills.map((id,i)=>realtimeSkill(ctx,fx,skillId(id),'主角',i,false,{lead:attr('lead'),war:attr('war'),int:attr('int'),pol:attr('pol')})),commanders,waveTroops:[d.enemyTroops??180],waveNames:[d.opponentName],allyAttack:fx.resolve(targetId('battle.damage.physical'),(attr('war')+attr('lead'))/2/rt.attackDivisor,ctx)*(1+equipmentEffects(ctx).reduce((n,e)=>n+(e.armyDamage??0),0)),enemyAttack:d.ability/rt.attackDivisor});
  // A single player army faces distinct enemy detachments simultaneously, never extra waves.
  const b=s.battle,template=b.units.find(u=>u.side==='enemy')!,total=d.enemyTroops!,n=d.enemySquads!;
  b.units=b.units.filter(u=>u.side==='ally');for(const u of b.units)u.armyId='lord';
  for(let army=0;army<n;army++){
   const count=Math.floor(total/n)+(army<total%n?1:0),composition=armyComposition(count,b.enemyInfantryPercent);
   for(const kind of ['infantry','archer'] as const)for(let remaining=composition[kind],column=0;remaining>0;column++){
    const hp=Math.min(b.groupSize,remaining),x=(kind==='infantry'?1280:1400)+column*45,id=b.nextId++;
    b.units.push({...template,id,armyId:'enemy-'+army,kind,hp,maxHp:hp,x,homeX:x,y:375+army*64,lane:army,seed:id*.73});remaining-=hp;
   }
  }
  b.traits=activeTraits(ctx).flatMap(id=>{const t=traitDef(id,ctx);return t.battleTrigger?[{id:t.battleTrigger,owner:'主角',level:levelOf(id,ctx),name:ctx.defs.text(String(t.nameKey))}]:[];});
  b.maxWaves=1;startBattle(b);
 }
 s.phase='playing';s.paused=false;
}
export function finishChallenge(s:EventChallengeState,outcome:ChallengeOutcome):void {
 if(s.outcome)return;
 if(outcome==='win'&&s.definition.stages){
  s.completed=(s.stage??0)+1;
  if(s.completed<s.definition.stages.length){s.phase='intermission';s.paused=true;return;}
 }
 s.outcome=outcome;s.phase='result';s.paused=true;
}
export function continueEventChallenge(s:EventChallengeState):void {
 if(s.phase!=='intermission'||!s.definition.stages||s.completed!==(s.stage??0)+1)throw Error('尚未完成本階段');
 s.stage=s.completed;s.phase='opening';s.paused=false;s.contest=null;
}
export function answerEventDuel(s:EventChallengeState,choice:number|null):boolean {
 const c=s.contest;if(s.paused||s.phase!=='playing'||c?.phase!=='read'||!c.duel)return false;
 const action=choice===null?null:DUEL_ACTIONS[choice];if(action===undefined||choice===null&&!c.duel.ally.fainted)return false;
 const before={ally:structuredClone(c.duel.ally),enemy:structuredClone(c.duel.enemy)};
 if(!resolveDuel(c.duel,action))return false;
 c.duelBefore=before;c.phase='clash';c.phaseTime=0;c.choice=choice;c.round=c.duel.round;
 c.allyHp=Math.round(100*(1-c.duel.ally.injury/c.duel.ally.injuryLimit));c.enemyHp=Math.round(100*(1-c.duel.enemy.injury/c.duel.enemy.injuryLimit));return true;
}
export function answerEventDebate(s:EventChallengeState,side:RallySide,a:RallyAction):boolean {return s.phase==='playing'&&!s.paused&&!!s.rally&&actRally(s.rally,side,a);}
export function tickEventChallenge(s:EventChallengeState,dt:number):void {
 if(s.phase!=='playing'||s.paused)return;
 if(s.contest){const c=s.contest;c.phaseTime+=Math.max(0,Math.min(.05,dt));if(c.phase==='read'&&c.duel?.ally.fainted&&c.phaseTime>=.8)answerEventDuel(s,null);
  if(c.phase==='clash'&&c.phaseTime>=duelClashDuration(c)){const r=c.duel!.result;if(r)finishChallenge(s,r==='ally'?'win':r==='enemy'?'lose':'draw');else{c.phase='read';c.phaseTime=0;}}
 }else if(s.battle){tickBattle(s.battle,dt);if(s.battle.status==='finished')finishChallenge(s,armyCount(s.battle,'ally')===0?'lose':armyCount(s.battle,'enemy')===0?'win':'draw');}
}

