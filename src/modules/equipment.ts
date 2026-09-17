import type {RunContext} from '../contracts/core/context.js';
import type {ItemId} from '../contracts/core/ids.js';
import type {RunState} from '../contracts/core/state.js';
import type {ItemDef} from '../contracts/core/definitions.js';
import {isHeld,heldItems} from './item.js';
import type {DuelFighter} from '../contracts/core/duel.js';

export type EquipmentSlot='weapon'|'mount'|'treasure';
export function equipped(ctx:RunContext):ItemDef[] {
 return Object.entries(ctx.state.equipment??{}).flatMap(([slot,id])=>{
  const d=ctx.defs.reader('item').get(String(id));return isHeld(id,ctx)&&d.equipment?.slot===slot?[d]:[];
 });
}
export function equip(id:ItemId|null,slot:EquipmentSlot,ctx:RunContext):RunState {
 if(ctx.state.ending||ctx.state.campaign&&ctx.state.campaign.phase!=='configuring'||ctx.state.turn.pending.length)return ctx.state;
 if(id&&(!isHeld(id,ctx)||ctx.defs.reader('item').get(String(id)).equipment?.slot!==slot))return ctx.state;
 const next={...ctx.state.equipment};if(id)next[slot]=id;else delete next[slot];return {...ctx.state,equipment:next};
}
export function autoEquip(ctx:RunContext):RunState {
 const next={...ctx.state.equipment};for(const id of heldItems(ctx)){const e=ctx.defs.reader('item').get(String(id)).equipment;if(e&&!next[e.slot])next[e.slot]=id;}
 return {...ctx.state,equipment:next};
}
export const equipmentEffects=(ctx:RunContext)=>equipped(ctx).map(d=>d.equipment!);
export function equipDuel(f:DuelFighter,ctx:RunContext):void {
 if(f.equipmentDamage!==undefined)return;
 const effects=equipmentEffects(ctx);f.equipmentDamage=effects.reduce((v,e)=>v+(e.duelDamage??0),0);f.retreatSpeed=effects.reduce((v,e)=>v+(e.retreatSpeed??0),0);
 const heal=effects.find(e=>e.healRatio);if(heal)f.emergencyHeal={threshold:heal.healThreshold!,ratio:heal.healRatio!,used:false};
}
export const itemPrice=(base:number,ctx:RunContext)=>Math.round(base*(1-Math.max(0,...equipmentEffects(ctx).map(e=>e.discount??0))));
