import type {EncounterProgress} from '../contracts/core/confrontation.js';
import type {DuelBuild,DuelFighter,DuelTurn} from '../contracts/core/duel.js';
import {DUEL_ACTORS} from '../contracts/core/duel-art.js';
import {DUEL_TRAITS,DUEL_RULES,DUEL_ACTIONS} from './duel-model.js';
const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const action=(a:unknown)=>a===null||DUEL_ACTIONS.includes(a as never);
const build=(b:DuelBuild)=>b&&finite(b.war)&&finite(b.lead)&&Object.hasOwn(DUEL_TRAITS,b.trait);
const fighter=(f:DuelFighter)=>f&&[f.stamina,f.maxStamina,f.injury,f.injuryLimit,f.attack,f.defense,f.recovery,f.combo,f.streak].every(finite)&&f.maxStamina>0&&f.injuryLimit>0&&f.stamina<=f.maxStamina&&f.injury<=f.injuryLimit&&f.combo<=DUEL_RULES.comboCap&&f.streak<=DUEL_RULES.streakCap&&f.build&&f.build.war>=1&&f.build.war<=100&&f.build.lead>=1&&f.build.lead<=100&&Object.hasOwn(DUEL_TRAITS,f.build.trait)&&typeof f.taunted==='boolean'&&typeof f.fainted==='boolean'&&action(f.previous)&&DUEL_ACTIONS.every(a=>finite(f.points[a])&&f.points[a]<=DUEL_RULES.pointsCap);
const turn=(t:DuelTurn)=>t&&action(t.ally)&&action(t.enemy)&&[t.damageToAlly,t.damageToEnemy,t.allyCost,t.enemyCost,t.allyRecovery,t.enemyRecovery].every(finite)&&Array.isArray(t.notes)&&t.notes.every(n=>typeof n==='string')&&(t.changes===undefined||(['ally','enemy'] as const).every(side=>Number.isFinite(t.changes?.[side].stamina)&&finite(t.changes?.[side].injury)));
/** Reject malformed persisted duel state without re-rolling or repairing player choices. */
export function validEncounterProgress(value:unknown):value is EncounterProgress {
 try{
 const e=value as EncounterProgress;if(!e||!['duel','debate','random','campaign'].includes(e.mode)||![e.rng,e.waveSeen,e.waveTime,e.nextRoll,e.victories,e.retreats].every(finite)||!Number.isInteger(e.waveSeen)||e.waveSeen<1||typeof e.attempted!=='boolean')return false;
 const actors=[e.participants.ally,e.participants.enemy,...e.waveOpponents];
 if(!build(e.duelBuilds.ally)||!build(e.duelBuilds.enemy)||!actors.every(a=>a&&Object.hasOwn(DUEL_ACTORS,a.id)&&typeof a.name==='string'&&build(a.build)))return false;
 const c=e.contest;if(!c)return c===null;
 if(!['clear','approach','read','clash','verdict','restore','retreat'].includes(c.phase)||!finite(c.phaseTime)||!finite(c.elapsed)||!Object.hasOwn(DUEL_ACTORS,c.allyId)||!Object.hasOwn(DUEL_ACTORS,c.enemyId))return false;
 if(c.kind!=='duel'||typeof c.allyName!=='string'||typeof c.enemyName!=='string'||typeof c.feedback!=='string'||typeof c.draw!=='boolean'||!Number.isInteger(c.round)||c.round<1||c.round>24||![null,'ally','enemy'].includes(c.winner)||![null,0,1,2].includes(c.choice))return false;
 if(c.duelBefore&&(!fighter(c.duelBefore.ally)||!fighter(c.duelBefore.enemy)))return false;
 const d=c.duel;if(!d||!fighter(d.ally)||!fighter(d.enemy)||!Number.isInteger(d.round)||d.round<1||d.round>DUEL_RULES.roundLimit||!action(d.enemyAction)||!finite(d.rng)||!Array.isArray(d.history)||d.history.length>DUEL_RULES.roundLimit||!d.history.every(turn)||!(d.last===null||turn(d.last)))return false;
 return [null,'ally','enemy','draw'].includes(d.result)&&(!['verdict','restore','retreat'].includes(c.phase)||d.result!==null);
 }catch{return false;}
}
