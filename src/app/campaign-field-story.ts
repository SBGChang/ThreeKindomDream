import {duelTraitBuild} from './duel-trait-build.js';
import {activeTraits} from '../modules/ability.js';
import type {RunContext} from '../contracts/core/context.js';
import type {RunState} from '../contracts/core/state.js';
import type {BattleStory} from '../contracts/core/battle-story.js';
import {itemId} from '../contracts/core/ids.js';
import {chapterStory,meetsStory} from '../modules/story.js';
import {acquire} from '../modules/item.js';
import {equipmentEffects} from '../modules/equipment.js';
import {transact} from '../modules/economy.js';
import {createStoryField} from './battle-story-field.js';

/** Freeze authored data and current player stats in the save, so a reload never rerolls a duel. */
export function prepareFieldStory(ctx:RunContext):RunState {
 const c=ctx.state.campaign,b=c?.realtime;if(!c||!b)return ctx.state;
 if(c.fieldStory){if(!c.fieldStory.field.triggered&&b.wave>c.fieldStory.data.field.wave){const {fieldStory:old,...rest}=c;return prepareFieldStory({...ctx,state:{...ctx.state,campaign:{...rest,seenFieldStories:[...(c.seenFieldStories??[]),old.data.id]}}});}return ctx.state;}
 const selected=chapterStory(ctx)?.fieldStories?.find(d=>d.field.wave===b.wave&&!(c.seenFieldStories??[]).includes(d.id)&&meetsStory(d.requirements??[],ctx));
 if(!selected)return ctx.state;
 const d:BattleStory=structuredClone(selected);d.playerStats={...ctx.state.attributes.values};d.statCap=ctx.defs.single('attributeCap').attrMax;
 const player=d.actors.player;if(player)player.build={...player.build,...duelTraitBuild(activeTraits(ctx),ctx),war:Math.max(1,d.playerStats.war),lead:Math.max(1,d.playerStats.lead)};
 const eq=equipmentEffects(ctx);d.checkBonuses={};for(const e of eq)for(const tag of e.checkTags??[])d.checkBonuses[tag]=(d.checkBonuses[tag]??0)+(e.checkBonus??0);d.equipment={duelDamage:eq.reduce((v,e)=>v+(e.duelDamage??0),0),retreatSpeed:eq.reduce((v,e)=>v+(e.retreatSpeed??0),0),healThreshold:Math.max(0,...eq.map(e=>e.healThreshold??0)),healRatio:Math.max(0,...eq.map(e=>e.healRatio??0))};
 for(const n of Object.values(d.nodes))if(n.kind==='debate'){n.ally={...n.ally,int:Math.max(1,d.playerStats.int),pol:Math.max(1,d.playerStats.pol)};n.seed=(ctx.state.seed+b.wave*7919)>>>0;}
 if(d.intel&&eq.some(e=>e.seaIntel)){const first=d.nodes[d.entry];if(first?.kind==='dialogue')first.lines.unshift({speaker:'航海圖',text:d.intel});}
 const f=createStoryField(d);f.encounter.battle=b;
 return {...ctx.state,campaign:{...c,fieldStory:{data:d,field:f}}};
}
export function bankFieldRewards(ctx:RunContext):RunState {
 const c=ctx.state.campaign,p=c?.fieldStory;if(!c||!p)return ctx.state;
 let state=ctx.state;const granted=[...(c.fieldRewards??[])];
 for(const n of Object.values(p.data.nodes)){
  if(n.kind!=='reward'||!p.field.story.granted.includes(n.reward.id)||granted.includes(n.reward.id))continue;
  const r=n.reward;granted.push(r.id);
  for(const id of r.items)state=acquire(itemId(id),{...ctx,state}).state;
  if(r.gold)state=transact(r.id,r.gold,r.title,{...ctx,state});
  const values={...state.attributes.values};for(const k of ['lead','war','int','pol'] as const)values[k]=Math.min(p.data.statCap,values[k]+r.allStats);
  state={...state,attributes:{...state.attributes,values},earnedUnlocks:[...new Set([...(state.earnedUnlocks??[]),...r.unlocks])],story:{...state.story,milestones:[...new Set([...state.story.milestones,'field:'+p.data.id])]}};
 }
 return {...state,campaign:{...state.campaign!,fieldRewards:granted}};
}
