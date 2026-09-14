import type { RunContext } from '../contracts/core/context.js';
import type { SkillId, TraitId } from '../contracts/core/ids.js';
import { targetId } from '../contracts/core/ids.js';
import type { Attr, AbilityTier } from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import * as ability from './ability.js';
import { statQuery } from './stats.js';
import type { EffectResolver } from './effect.js';
import { balance, economyRule, transact } from './economy.js';
export { balance } from './economy.js';
export interface LearningOffer {
  readonly id: SkillId | TraitId;
  readonly kind: 'skill' | 'trait';
  readonly tier: AbilityTier;
  readonly name: string;
  readonly description: string;
  readonly level: number;
  readonly maxLevel: number;
  readonly cost: number;
  readonly attr: Attr;
  readonly need: number;
  readonly value: number;
  readonly secondary: Attr;
  readonly secondaryNeed: number;
  readonly secondaryValue: number;
  readonly chapterNeed: number;
  readonly power: number;
  readonly nextPower: number;
  readonly active: boolean;
  readonly status:
    'ready' | 'locked' | 'attribute' | 'chapter' | 'funds' | 'max' | 'battle';
  readonly teachers: readonly string[];
}
export function offers(
  ctx: RunContext,
  fx: EffectResolver,
): readonly LearningOffer[] {
  const rule = economyRule(ctx);
  return [
    ...ctx.defs.reader('skill').all(),
    ...ctx.defs.reader('trait').all(),
  ].flatMap((def): LearningOffer[] => {
    const kind = def.kind,
      id = kind === 'skill' ? def.skillId : def.traitId;
    const owned =
      kind === 'skill'
        ? ability.hasSkill(id as SkillId, ctx)
        : ability.hasTrait(id as TraitId, ctx);
    const level = owned ? ability.levelOf(id, ctx) : 0;
    const unlocked = owned ||
      (kind === 'skill'
        ? ctx.state.growth.unlockedSkills.includes(id as SkillId)
        : ctx.state.growth.unlockedTraits.includes(id as TraitId));
    if (!unlocked) return [];
    const attr =
      kind === 'skill'
        ? def.action.actorAttr
        : ATTRS.reduce((a, b) =>
            (def.cost[b] ?? 0) > (def.cost[a] ?? 0) ? b : a,
          );
    const secondary = ATTRS.filter((a) => a !== attr).sort(
      (a, b) => (def.cost[b] ?? 0) - (def.cost[a] ?? 0),
    )[0]!;
    const needs = rule.primaryNeeds[def.tier],
      need = needs[level] ?? 0,
      secondaryNeed = rule.secondaryNeeds[def.tier][level] ?? 0,
      chapterNeed = rule.lessonChapters[def.tier][level] ?? 1;
    const base =
      (kind === 'skill' ? rule.skillPrices : rule.traitPrices)[def.tier][
        level
      ] ?? 0;
    const cost = Math.max(
      Math.ceil(base * rule.discountFloor),
      Math.ceil(fx.resolve(targetId('learn.cost.' + attr), base, ctx)),
    );
    const value = statQuery.attr(attr, ctx),
      secondaryValue = statQuery.attr(secondary, ctx);
    const unavailable =
      ctx.state.ending !== null ||
      (ctx.state.campaign !== null &&
        ctx.state.campaign.phase !== 'configuring') ||
      ctx.state.turn.pending.length > 0;
    const status =
      level >= needs.length
        ? 'max'
        : unavailable
          ? 'battle'
          : !unlocked
            ? 'locked'
            : ctx.state.progress.chapter < chapterNeed
              ? 'chapter'
              : value < need || secondaryValue < secondaryNeed
                ? 'attribute'
                : balance(ctx) < cost
                  ? 'funds'
                  : 'ready';
    const powers =
      kind === 'skill'
        ? ctx.defs.single('growthRule').learning.power
        : rule.traitPower;
    const teachers = ctx.defs
      .reader('notable')
      .all()
      .filter((n) =>
        kind === 'skill'
          ? n.abilities.skills.some((x) => x.skillId === id)
          : n.abilities.traits.some((x) => x === id),
      )
      .map((n) => ctx.defs.text(String(n.nameKey)));
    return [{
      id,
      kind,
      tier: def.tier,
      name: ctx.defs.text(String(def.nameKey)),
      description: ctx.defs.text(String(def.descKey)),
      level,
      maxLevel: needs.length,
      cost,
      attr,
      need,
      value,
      secondary,
      secondaryNeed,
      secondaryValue,
      chapterNeed,
      status,
      teachers,
      power: level ? powers[level - 1]! : 0,
      nextPower: powers[level] ?? powers.at(-1)!,
      active:
        kind === 'trait' && ability.activeTraits(ctx).includes(id as TraitId),
    }];
  });
}
export function upgrade(
  id: SkillId | TraitId,
  ctx: RunContext,
  fx: EffectResolver,
): { state: RunState; ok: boolean } {
  const offer = offers(ctx, fx).find((x) => x.id === id);
  if (offer?.status !== 'ready') return { state: ctx.state, ok: false };
  const paid = transact(
    'lesson/' + id + '/' + (offer.level + 1),
    -offer.cost,
    offer.name + ' Lv.' + (offer.level + 1),
    ctx,
  );
  if (paid === ctx.state) return { state: ctx.state, ok: false };
  const at = { ...ctx, state: paid };
  const owned =
    offer.kind === 'skill'
      ? ability.addSkill(id as SkillId, at)
      : ability.addTrait(id as TraitId, at);
  const active = [...ability.activeTraits({ ...ctx, state: owned })];
  if (
    offer.kind === 'trait' &&
    !active.includes(id as TraitId) &&
    active.length < economyRule(ctx).activeTraits
  )
    active.push(id as TraitId);
  return {
    ok: true,
    state: {
      ...owned,
      abilities: {
        ...owned.abilities,
        activeTraits: active,
        levels: { ...owned.abilities.levels, [String(id)]: offer.level + 1 },
      },
    },
  };
}
export function toggleTrait(id: TraitId, ctx: RunContext): RunState {
  if (
    !ability.hasTrait(id, ctx) ||
    ctx.state.ending !== null ||
    ctx.state.turn.pending.length > 0 ||
    (ctx.state.campaign !== null && ctx.state.campaign.phase !== 'configuring')
  )
    return ctx.state;
  const current = ability.activeTraits(ctx);
  const active = current.includes(id)
    ? current.filter((x) => x !== id)
    : current.length < economyRule(ctx).activeTraits
      ? [...current, id]
      : current;
  return {
    ...ctx.state,
    abilities: { ...ctx.state.abilities, activeTraits: active },
  };
}
