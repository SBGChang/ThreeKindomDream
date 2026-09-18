import {equipmentEffects} from '../modules/equipment.js';
import type { RunContext } from '../contracts/core/context.js';
import type { EventReward } from '../contracts/core/definitions.js';
import type { SkillId } from '../contracts/core/ids.js';
import { targetId } from '../contracts/core/ids.js';
import type { BattleState, Commander, DemoSkill } from '../contracts/core/realtime-battle.js';
import type { EffectResolver } from '../modules/effect.js';
import * as ability from '../modules/ability.js';
import * as campaign from '../modules/campaign.js';
import { statQuery } from '../modules/stats.js';
import { notableCodex } from '../modules/notable-codex.js';
import { armyCount, createConfiguredBattle } from './realtime-battle-model.js';

export const realtimeSkill=(ctx:RunContext,fx:EffectResolver,id:SkillId,owner:string,index:number,support:boolean,attrs:Readonly<Record<string,number>>,level=1):DemoSkill=>{
  const rule=ctx.defs.single('battleRule'),rt=rule.realtime,t=(key:unknown)=>ctx.defs.text(String(key));
  const def=support?ability.skillDef(id,ctx):ability.battleSkill(id,ctx),a={...def.action,ratio:def.action.ratio*(support?(ctx.defs.single('growthRule').learning.power[level-1]??1):1)};
  const coef=(attrs[a.actorAttr]??0)/rule.actorDivisor;
  const raw=campaign.hostLimits(ctx,fx).troopsMax*a.ratio*coef;
  const damage=a.kind==='physical'||a.kind==='magic'?fx.resolve(targetId('battle.damage.'+a.kind),raw,ctx):a.kind==='heal'?fx.resolve(targetId('battle.heal'),raw,ctx):0;
  const name=t(def.nameKey),kind=a.kind==='buff'||a.kind==='heal'?'inspire':a.kind==='magic'?'fire':a.kind==='debuff'?'pincer':'charge';
  const visual=def.battleMechanic?(['fire','water','rocks','thunder'].includes(def.battleMechanic)?'fire':['mounted','volley','crossbow','longshot'].includes(def.battleMechanic)?'mounted':['pincer','ambush'].includes(def.battleMechanic)?'pincer':kind):kind;
  return {...(def.battleMechanic?{mechanic:def.battleMechanic,level:support?level:ability.levelOf(id,ctx)}:{}),id:(support?'support-':'host-')+index,name,owner,key:(support?['Q','W','E']:['1','2','3'])[index]!,kind:visual,cost:def.supplyCost??rt.skillCost[a.kind],cd:def.cooldownSeconds?Math.round(def.cooldownSeconds/(1+((support?level:ability.levelOf(id,ctx))-1)*.1)*10)/10:rt.skillCooldown[a.kind],damage:Math.max(0,Math.round(damage * (a.kind==='magic' ? 1+equipmentEffects(ctx).reduce((n,e)=>n+(e.strategyDamage??0),0) : 1))),description:def.battleMechanic?t(def.descKey):a.kind==='heal'?`恢復最多 ${Math.round(damage)} 兵力`:a.kind==='buff'||a.kind==='debuff'?`${a.kind==='buff'?'我軍攻擊提升':'敵軍攻擊降低'} ${Math.round(Math.min(.9,a.ratio*coef)*100)}%，持續 ${a.duration*rt.effectSeconds} 秒`:`造成 ${Math.round(damage)} 傷害`,effect:a.kind==='physical'||a.kind==='magic'?'damage':a.kind,power:Math.max(0,Math.min(.9,a.ratio*coef)),effectDuration:a.duration*rt.effectSeconds,support};
 };

export function campaignBattle(ctx:RunContext,fx:EffectResolver):BattleState {
 const st=ctx.state.campaign;if(!st?.loadout)throw new Error('請先完成出戰配置');
 const rule=ctx.defs.single('battleRule'),rt=rule.realtime;
 const t=(key:unknown)=>ctx.defs.text(String(key));
 const skills:DemoSkill[]=[];
 const commanders:Commander[]=[{id:'lord',name:'主角',side:'ally',homeX:125,x:125,y:350,pose:'command',poseTime:0,flip:false}];
 const attrs={lead:statQuery.attr('lead',ctx),war:statQuery.attr('war',ctx),int:statQuery.attr('int',ctx),pol:statQuery.attr('pol',ctx)};
 st.loadout.skills.forEach((id,i)=>skills.push(realtimeSkill(ctx,fx,id,'主角',i,false,attrs)));
 st.loadout.commanders.forEach((slot,i)=>{
  const nd=ctx.defs.reader('notable').get(String(slot.notableId)),name=t(nd.nameKey),art=String(nd.nameKey).split('.')[1]??'lord';
  commanders.push({id:art,name,portrait:art,side:'ally',homeX:125+((i+1)%2)*70,x:125+((i+1)%2)*70,y:350+(i+1)*78,pose:'command',poseTime:i*.35,flip:false});
  skills.push(realtimeSkill(ctx,fx,slot.skillId,name,i,true,nd.abilities.attrs,ctx.defs.single('notableStar').commanderLevelByStar[notableCodex.starOf(slot.notableId,ctx.state.metaSnapshot)]));
 });
 const waves=campaign.stageRows(ctx).map((_,i)=>campaign.nextStagePreview(ctx,i)!);
 commanders.push({id:'enemy',name:waves[0]?.boss?t(waves[0].boss.nameKey):'敵軍指揮官',side:'enemy',homeX:1470,x:1470,y:485,pose:'command',poseTime:0,flip:true});
 const battle=createConfiguredBattle({terrain:/chibi|jing|jiang|shiting/.test(String(ctx.state.progress.chapterId))?'water':/yiling|hunt|hanzhong/.test(String(ctx.state.progress.chapterId))?'mountain':'plain',infantryPercent:st.loadout.infantryPercent??60,rng:(Number(ctx.state.seed)+ctx.state.progress.chapter*997)>>>0,troops:st.host.troops,supply:st.host.supply,supplyMax:st.host.supplyMax,regen:st.host.supplyMax*rt.supplyRegenRatio,duration:rt.duration,skills,commanders,waveTroops:waves.map(w=>w.enemyTroops),waveNames:waves.map(w=>w.boss?t(w.boss.nameKey):'敵軍指揮官'),allyAttack:fx.resolve(targetId('battle.damage.physical'),(attrs.war+attrs.lead)/2/rt.attackDivisor,ctx)*(1+equipmentEffects(ctx).reduce((v,e)=>v+(e.armyDamage??0),0)),enemyAttack:(rule.enemyDamageByChapter[ctx.state.progress.chapter-1]??rule.enemyDamageByChapter.at(-1)!)/rt.enemyAttackDivisor});
 const memberTraits=st.loadout.commanders.flatMap(slot=>{const n=ctx.defs.reader('notable').get(String(slot.notableId));return n.abilities.traits.map(id=>({id,owner:t(n.nameKey),level:ctx.defs.single('notableStar').commanderLevelByStar[notableCodex.starOf(slot.notableId,ctx.state.metaSnapshot)]}));});
 battle.traits=[...ability.activeTraits(ctx).map(id=>({id,owner:'主角',level:ability.levelOf(id,ctx)})),...memberTraits].flatMap(row=>{const d=ability.traitDef(row.id,ctx);return d.battleTrigger?[{id:d.battleTrigger,owner:row.owner,level:row.level??1,name:t(d.nameKey)}]:[];});
 battle.maxWaves=waves.length;return battle;
}

/** Rewards follow actual defeated soldiers. Deep unlocks require completing their wave. */
export function realtimeRewards(ctx:RunContext):{rewards:readonly EventReward[];money:number;cleared:number;defeated:boolean} {
 const b=ctx.state.campaign?.realtime;if(!b)throw new Error('沒有即時戰役');
 const stages=campaign.currentCampaign(ctx).stages;
 // Recruited enemies complete a wave but yield no kill salary. Each wave keeps its own ledger.
 if((b.removed??0)>0){
  let cleared=0;const rewards:EventReward[]=[];
  for(let wave=1;wave<=b.wave;wave++){
   const index=Math.min(wave-1,stages.length-1),troops=b.waveTroops[index]!;
   const kills=b.waveKills?.[wave]??0,removed=b.waveRemoved?.[wave]??0,full=kills+removed>=troops;
   if(full)cleared++;
   for(const r of stages[index]!.rewards){if(r.kind==='money')rewards.push({...r,amount:Math.floor(r.amount*Math.min(1,kills/troops))});else if(full&&(wave<=stages.length||r.kind==='attr'))rewards.push(r);}
  }
  const defeated=armyCount(b,'ally')===0;
  const adjusted=defeated?rewards.flatMap<EventReward>(r=>'amount' in r?[{...r,amount:r.kind==='attr'?Math.round(r.amount/2*100)/100:Math.floor(r.amount/2)}]:'chance' in r?[{...r,chance:r.chance/2}]:[r]):rewards;
  return {rewards:adjusted,money:adjusted.reduce((n,r)=>n+(r.kind==='money'?r.amount:0),0),cleared,defeated};
 }

 let remaining=b.kills,cleared=0;const rewards:EventReward[]=[];
 for(let i=0;remaining>0;i++){
  const index=Math.min(i,stages.length-1),troops=b.waveTroops[index]!;
  const full=remaining>=troops,ratio=Math.min(1,remaining/troops);
  for(const r of stages[index]!.rewards){
   if(r.kind==='money')rewards.push({...r,amount:Math.floor(r.amount*ratio)});
   else if(full&&(i<stages.length||r.kind==='attr'))rewards.push(r);
  }
  if(full)cleared++;remaining-=troops;
 }
 const defeated=armyCount(b,'ally')===0;
 const adjusted=defeated?rewards.flatMap<EventReward>(r=>{
  if('amount' in r){const amount=r.kind==='attr'?Math.round(r.amount/2*100)/100:Math.floor(r.amount/2);return amount>0?[{...r,amount}]:[];}
  if('chance' in r)return [{...r,chance:r.chance/2}];return [r];
 }):rewards;
 return {rewards:adjusted,money:adjusted.reduce((sum,r)=>sum+(r.kind==='money'?r.amount:0),0),cleared,defeated};
}
