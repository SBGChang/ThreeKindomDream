import type { EventDef, EventReward, NotableDef } from '../src/contracts/core/definitions.js';
import { coreSkills, coreTraits } from './core/abilities/index.js';

/** Authoring rule: one lesson per encounter, from the leading character's own repertoire.
 * ★1/2 introduce a common skill/trait, ★3/4 a fine one, ★5 a peerless skill.
 * A teacher with a smaller repertoire revisits their best eligible lesson instead. */
export function withTeaching(event: EventDef, teachers: readonly NotableDef[]): EventDef {
  if (event.trigger.kind !== 'notable') return event;
  const speaker = event.trigger.cast[0]?.notableId;
  const teacher = teachers.find(n => n.notableId === speaker);
  if (!teacher) throw new Error('教學人物不存在：' + speaker);
  const rarity = event.progression?.rarity ?? 1;
  const ceiling = rarity >= 5 ? 2 : rarity >= 3 ? 1 : 0;
  const tiers = { common:0, fine:1, peerless:2 };
  const skill = coreSkills.filter(s => teacher.abilities.skills.some(t=>t.skillId===s.skillId) && tiers[s.tier]<=ceiling)
    .sort((a,b)=>tiers[b.tier]-tiers[a.tier])[0];
  const trait = coreTraits.filter(t => teacher.abilities.traits.includes(t.traitId) && tiers[t.tier]<=ceiling)
    .sort((a,b)=>tiers[b.tier]-tiers[a.tier])[0];
  const lesson: EventReward | null = rarity % 2 === 0 && trait
    ? {kind:'unlock',trait:trait.traitId,skill:null}
    : skill ? {kind:'unlock',skill:skill.skillId,trait:null}
    : trait ? {kind:'unlock',trait:trait.traitId,skill:null} : null;
  if (!lesson) return event;
  return {...event,options:event.options.map(option=>({...option,
    rewards:option.rewards.some(r=>r.kind==='unlock') ? option.rewards : [...option.rewards,lesson],
  }))};
}
