import type {DuelBuild} from '../contracts/core/duel.js';
import {DUEL_TRAITS} from '../app/duel-model.js';
export function validDuelBuild(b:unknown):b is DuelBuild {
 if(!b||typeof b!=='object')return false;
 const d=b as DuelBuild;
 return [d.war,d.lead].every(n=>Number.isFinite(n)&&n>=1&&n<=100)&&Object.hasOwn(DUEL_TRAITS,d.trait)
  &&(d.comboEnabled===undefined||typeof d.comboEnabled==='boolean')
  &&(d.power===undefined||Number.isFinite(d.power)&&d.power>0&&d.power<=3)
  &&(d.traitChance===undefined?d.trait!=='peerless':Number.isFinite(d.traitChance)&&d.traitChance>=0&&d.traitChance<=1);
}
