import type {EventChallengeDef} from '../contracts/core/event-challenge.js';
import {DUEL_ACTORS} from '../contracts/core/duel-art.js';
import {validRallyBuild} from '../app/rally-validation.js';
import {validDuelBuild} from './duel-build-validation.js';
/** Shared authoring/save guard; every playable route has an explicit narrative exit. */
export function validEventChallengeDef(value:unknown):value is EventChallengeDef {
 if(!value||typeof value!=='object')return false;
 const d=value as EventChallengeDef;
 if(d.duel!==undefined){
  const b=d.duel?.enemy;
  if(b?.comboEnabled!==undefined&&typeof b.comboEnabled!=='boolean')return false;
  if(d.duel?.ally!==undefined&&(!d.duel.ally||d.duel.ally.comboEnabled!==undefined&&typeof d.duel.ally.comboEnabled!=='boolean'))return false;
  if(d.mode!=='duel'||!validDuelBuild(b))return false;
 }
 if(d.debate!==undefined){
  const b=d.debate;
  if(d.mode!=='debate'||!b||!validRallyBuild(b.enemy))return false;
  if(b.ally!==undefined&&(!b.ally||!validRallyBuild({...b.ally,int:50,pol:50})))return false;
 }
 if(d.stages!==undefined){
  if(d.mode!=='duel'||!d.duel||!Array.isArray(d.stages)||d.stages.length<2||d.stages.length>5||d.stages.some(s=>!s||!Number.isFinite(s.power)||s.power<=0||s.power>3||![s.title,s.opening,s.victory].every(v=>typeof v==='string'&&v.length>0)))return false;
  if(!Array.isArray(d.cashOutGold)||d.cashOutGold.length!==d.stages.length||!d.cashOutGold.every(n=>Number.isSafeInteger(n)&&n>=0))return false;
 }else if(d.cashOutGold!==undefined)return false;
 return ['duel','debate','battle'].includes(d.mode)&&Object.hasOwn(DUEL_ACTORS,d.opponent)&&typeof d.opponentName==='string'&&d.opponentName.length>0&&Number.isInteger(d.ability)&&d.ability>=1&&d.ability<=100&&typeof d.opening==='string'&&d.opening.length>0&&!!d.outcomes&&(['win','lose','draw','retreat'] as const).every(k=>typeof d.outcomes[k]==='string'&&d.outcomes[k].length>0)&&(d.mode!=='battle'||Number.isInteger(d.enemySquads)&&d.enemySquads!>=2&&d.enemySquads!<=4&&Number.isInteger(d.enemyTroops)&&d.enemyTroops!>=d.enemySquads!&&d.enemyTroops!<=2000);
}
