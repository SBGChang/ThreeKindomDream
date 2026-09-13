import type { RunContext } from '../contracts/core/context.js';
import type { SkillId, TraitId } from '../contracts/core/ids.js';
import type { Attr } from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import * as ability from './ability.js';
import { statQuery } from './stats.js';
import type { EffectResolver } from './effect.js';
import { targetId } from '../contracts/core/ids.js';

export interface LearningOffer {
  readonly id: SkillId | TraitId;
  readonly kind: 'skill' | 'trait';
  readonly name: string;
  readonly description: string;
  readonly level: number;
  readonly maxLevel: number;
  readonly cost: number;
  readonly attr: Attr;
  readonly need: number;
  readonly value: number;
  readonly power: number;
  readonly nextPower: number;
  readonly status: 'ready' | 'locked' | 'attribute' | 'funds' | 'max' | 'battle';
  readonly teachers: readonly string[];
}

export const balance = (ctx: RunContext): number => ctx.state.growth.learningExp ?? 0;
const offerCache = new WeakMap<RunState, { defs: RunContext['defs']; fx: EffectResolver; values: readonly LearningOffer[] }>();

export function offers(ctx: RunContext, fx: EffectResolver): readonly LearningOffer[] {
  const cached = offerCache.get(ctx.state);
  if (cached?.defs === ctx.defs && cached.fx === fx) return cached.values;
  const rule = ctx.defs.single('growthRule').learning;
  const grants = fx.unlockGrants(ctx);
  const all = [...ctx.defs.reader('skill').all(), ...ctx.defs.reader('trait').all()];
  const values: readonly LearningOffer[] = all.map(def => {
    const kind = def.kind;
    const id = kind === 'skill' ? def.skillId : def.traitId;
    const learned = kind === 'skill' ? ability.hasSkill(id as SkillId, ctx) : ability.hasTrait(id as TraitId, ctx);
    const level = learned ? ability.levelOf(id, ctx) : 0;
    const unlocked = kind === 'skill'
      ? ctx.state.growth.unlockedSkills.includes(id as SkillId) || grants.some(g => g.skill === id)
      : ctx.state.growth.unlockedTraits.includes(id as TraitId) || grants.some(g => g.trait === id);
    const attr = kind === 'skill' ? def.action.actorAttr
      : ATTRS.reduce((a, b) => (def.cost[b] ?? 0) > (def.cost[a] ?? 0) ? b : a);
    const need = rule.requirements[level] ?? 0;
    const baseCost = Math.round((kind === 'skill' ? rule.skillCosts[level] ?? 0 : rule.traitCosts[level] ?? 0) * rule.tierCost[def.tier]);
    const cost = Math.max(0, Math.ceil(fx.resolve(targetId(`learn.cost.${attr}`), baseCost, ctx)));
    const value = statQuery.attr(attr, ctx);
    const lockedBattle = ctx.state.campaign !== null && ctx.state.campaign.phase !== 'configuring';
    const status = level === 0 && !unlocked ? 'locked' : level >= rule.power.length ? 'max'
      : lockedBattle ? 'battle' : value < need ? 'attribute' : balance(ctx) < cost ? 'funds' : 'ready';
    const teachers = ctx.defs.reader('notable').all().filter(n => kind === 'skill'
      ? n.abilities.skills.some(x => String(x.skillId) === String(id))
      : n.abilities.traits.some(x => String(x) === String(id))).map(n => ctx.defs.text(String(n.nameKey)));
    return { id, kind, name: ctx.defs.text(String(def.nameKey)), description: ctx.defs.text(String(def.descKey)),
      level, maxLevel: rule.power.length, cost, attr, need, value, status, teachers,
      power: rule.power[Math.max(0, level - 1)] ?? 1, nextPower: rule.power[level] ?? rule.power.at(-1) ?? 1 };
  });
  offerCache.set(ctx.state, { defs: ctx.defs, fx, values });
  return values;
}

/** One transaction, shared by UI and policies. Never spends attribute experience. */
export function upgrade(id: SkillId | TraitId, ctx: RunContext, fx: EffectResolver): { state: RunState; ok: boolean } {
  const offer = offers(ctx, fx).find(x => String(x.id) === String(id));
  if (ctx.state.ending !== null || offer?.status !== 'ready') return { state: ctx.state, ok: false };
  const owned = offer.kind === 'skill' ? ability.addSkill(id as SkillId, ctx) : ability.addTrait(id as TraitId, ctx);
  return { ok: true, state: { ...owned,
    growth: { ...ctx.state.growth, learningExp: balance(ctx) - offer.cost,
      learningSpent: (ctx.state.growth.learningSpent ?? 0) + offer.cost },
    abilities: { ...owned.abilities, levels: { ...owned.abilities.levels, [String(id)]: offer.level + 1 } },
  } };
}
