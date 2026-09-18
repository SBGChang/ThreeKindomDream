import type {RunContext} from '../contracts/core/context.js';
import type {TraitId} from '../contracts/core/ids.js';
import type {DuelBuild} from '../contracts/core/duel.js';
import {traitDef} from '../modules/ability.js';
/** The exclusive duel trait takes the single duel-trait slot when enabled. */
export function duelTraitBuild(ids:readonly TraitId[],ctx:RunContext):Pick<DuelBuild,'trait'|'traitChance'> {
 const all=ids.map(id=>traitDef(id,ctx));
 const selected=all.find(d=>d.duelTrait==='peerless')??all.find(d=>d.duelTrait);
 return {trait:selected?.duelTrait??'none',...(selected?.duelProcChance!==undefined?{traitChance:selected.duelProcChance}:{})};
}
