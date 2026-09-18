import type {RunContext} from '../contracts/core/context.js';
/** Bonuses are authored separately from capped ordinary training modifiers. */
export function progressionBonus(kind:'growthBonus'|'meritBonus'|'affinityBonus',ctx:RunContext):number {
 const ids=ctx.state.abilities.activeTraits??ctx.state.abilities.traits.slice(0,ctx.defs.single('growthRule').economy.activeTraits);
 return ids.reduce((sum,id)=>sum+(ctx.defs.reader('trait').get(String(id))[kind]??0),0);
}
