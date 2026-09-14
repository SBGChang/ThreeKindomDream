import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type {
  EventDef,
  EventOptionDef,
  EventPractice,
  EventYieldCurveDef,
  GlowTierDef,
} from '../contracts/core/definitions.js';
import type {
  EventDefId,
  ItemId,
  L10nKey,
  NotableId,
} from '../contracts/core/ids.js';
import { targetId } from '../contracts/core/ids.js';
import type { Attr, GlowTier, Rarity } from '../contracts/core/primitives.js';
import { RARITIES } from '../contracts/core/primitives.js';
import type {
  AttributeGain,
  EventOffer,
  EventResolution,
  ItemGain,
  MeritGain,
  OptionState,
  RunState,
} from '../contracts/core/state.js';
import { grantBoon, type EffectResolver } from './effect.js';
import { evaluateCondition } from './effect-core.js';
import { acquire, canAcquire, poolCandidates } from './item.js';
import { addAffinity, addAffinityAll, atLeastStage } from './roster.js';
import { preview, resolveCheck, specForMinor } from './check.js';
import { careerService } from './career.js';
import { grantGrowth, grantUnlock, previewGrowth } from './growth.js';
import { statQuery, type StatWriter } from './stats.js';

import { balance, economyRule, transact } from './economy.js';
import * as stories from './stories.js';
const readStat = statQuery.read.bind(statQuery);

const yieldCurve = (ctx: RunContext): EventYieldCurveDef =>
  ctx.defs.single('eventYieldCurve');

const glowOf = (tier: GlowTier, ctx: RunContext): GlowTierDef => {
  const def = ctx.defs
    .reader('glowTier')
    .all()
    .find((g) => g.tier === tier);
  if (def === undefined) throw new Error(`光階不存在: ${tier}`);
  return def;
};

export function commissionTier(def: EventDef, ctx: RunContext): number {
  if (def.trigger.kind === 'commission') {
    return careerService.notionalLevel(
      statQuery.lineOf(def.trigger.attr, ctx),
      ctx,
    );
  }
  return Math.max(
    careerService.notionalLevel('civil', ctx),
    careerService.notionalLevel('martial', ctx),
  );
}

export function rollCommissionFlag(
  attr: Attr,
  standing: readonly NotableId[],
  ctx: TurnContext,
  fx: EffectResolver,
): boolean {
  const base = ctx.defs.single('gameRules').commissionChance;
  const mod = fx.commissionChance(attr, standing, ctx);
  const hit = ctx.rng.chance('slot.flag', base + mod.chance);
  return mod.guaranteed || hit;
}

export function rollEncounterFlag(
  attr: Attr,
  standing: readonly NotableId[],
  ctx: TurnContext,
  fx: EffectResolver,
): boolean {
  if (encounterPool(ctx).length === 0) return false;
  const base = ctx.defs.single('gameRules').encounterChance;
  const mod = fx.encounterChance(attr, standing, ctx);
  const hit = ctx.rng.chance('slot.flag', base + mod.chance);
  return mod.guaranteed || hit;
}

export function rollRarity(
  tier: GlowTier,
  ctx: TurnContext,
  fx: EffectResolver,
): Rarity {
  const weights = glowOf(tier, ctx).rarityWeights;
  const shift = fx.rarityShift(ctx);
  const entries = RARITIES.map((r, i) => ({
    item: r,
    weight: Math.max(0, shiftedWeight(weights, i, shift)),
  })).filter((e) => e.weight > 0);
  if (entries.length === 0) {
    throw new Error(`光階 ${tier} 的 rarityWeights 全為零 —— 它抽不到任何委託`);
  }
  const drawn = ctx.rng.weighted('event.rarity', entries);
  const floor = fx.rarityFloor(ctx);
  return drawn >= floor ? drawn : floor;
}

function shiftedWeight(
  weights: readonly number[],
  index: number,
  shift: number,
): number {
  const own = weights[index] ?? 0;
  if (shift === 0 || own <= 0) return own;
  const src = index - shift;
  const lo = Math.floor(src);
  const hi = lo + 1;
  const f = src - lo;
  return (weights[lo] ?? 0) * (1 - f) + (weights[hi] ?? 0) * f;
}

export function commissionPool(
  attr: Attr,
  rarity: Rarity,
  ctx: RunContext,
): readonly EventDef[] {
  const seen = new Set(ctx.state.turn.seenUniqueIds.map(String));
  return ctx.defs
    .reader('event')
    .all()
    .filter((e) => {
      if (e.trigger.kind !== 'commission') return false;
      if (e.trigger.attr !== attr || e.trigger.rarity !== rarity) return false;
      const rule = economyRule(ctx);
      if (
        ctx.state.progress.chapter < rule.commissionChapter[rarity - 1]! ||
        careerService.notionalLevel(statQuery.lineOf(attr, ctx), ctx) <
          rule.commissionRank[rarity - 1]!
      )
        return false;
      if (stories.blockers(e, ctx).length) return false;
      if (e.unique && seen.has(String(e.eventDefId))) return false;
      return e.requirements.every((c) => evaluateCondition(c, ctx, readStat));
    });
}

export function encounterPool(ctx: RunContext): readonly EventDef[] {
  return ctx.defs
    .reader('event')
    .all()
    .filter(
      (e) =>
        e.trigger.kind === 'notable' &&
        stories.blockers(e, ctx).length === 0 &&
        e.requirements.every((c) => evaluateCondition(c, ctx, readStat)),
    );
}

function fillParams(
  def: EventDef,
  ctx: TurnContext,
): Readonly<Record<string, L10nKey>> {
  const params: Record<string, L10nKey> = {};
  for (const slot of def.paramSlots) {
    const pool = ctx.defs.reader('paramPool').get(String(slot.poolId));
    params[slot.name] = ctx.rng.pick('event.params', pool.entries);
  }
  return params;
}

const offerOf = (
  def: EventDef,
  rarity: Rarity,
  ctx: TurnContext,
  fx: EffectResolver,
): EventOffer => ({
  eventDefId: def.eventDefId,
  rarity,
  params: fillParams(def, ctx),
  optionStates: optionStates(def, rarity, ctx, fx),
});

export function drawCommission(
  attr: Attr,
  tier: GlowTier,
  ctx: TurnContext,
  fx: EffectResolver,
): EventOffer {
  const pools = RARITIES.map((r) => ({
    rarity: r,
    pool: commissionPool(attr, r, ctx),
  })).filter((x) => x.pool.length);
  if (!pools.length) throw new Error('沒有合法的保底委託');
  const weights = glowOf(tier, ctx).rarityWeights;
  const eligible = pools.map((x) => ({
    ...x,
    weight: Math.max(
      0,
      shiftedWeight(weights, x.rarity - 1, fx.rarityShift(ctx)),
    ),
  }));
  const floor = Math.min(
    fx.rarityFloor(ctx),
    Math.max(...pools.map((x) => x.rarity)),
  );
  const masked = eligible.filter((x) => x.rarity >= floor && x.weight > 0);
  const bucket = masked.length
    ? ctx.rng.weighted(
        'event.rarity',
        masked.map((x) => ({ item: x, weight: x.weight })),
      )
    : (pools.filter((x) => x.rarity >= floor).at(-1) ?? pools[0]!);
  const fresh = bucket.pool.filter(
    (e) =>
      ctx.state.progress.turn -
        (stories.history(ctx)[String(e.eventDefId)]?.turn ??
          -economyRule(ctx).commissionCooldown) >=
      economyRule(ctx).commissionCooldown,
  );
  const pool = fresh.length ? fresh : bucket.pool.filter((e) => !e.unique);
  const selected = pool.length ? pool : bucket.pool;
  const chosen = ctx.rng.weighted(
    'event.draw',
    selected.map((e) => ({ item: e, weight: e.weight })),
  );
  return offerOf(chosen, bucket.rarity, ctx, fx);
}

export function drawEncounter(
  ctx: TurnContext,
  fx: EffectResolver,
): EventOffer {
  const pool =
    ctx.state.turn.encounterCandidates?.map((id) =>
      ctx.defs.reader('event').get(String(id)),
    ) ?? encounterPool(ctx);
  if (!pool.length) throw new Error('人物事件池為空');
  const tracked = pool.filter(
    (e) =>
      e.trigger.kind === 'notable' &&
      e.trigger.cast.some((c) => c.notableId === stories.tracked(ctx)),
  );
  const use = stories.pityDue(ctx) && tracked.length ? tracked : pool;
  const owners = [
    ...new Set(
      use.map((e) =>
        e.trigger.kind === 'notable'
          ? String(e.trigger.cast[0]!.notableId)
          : '',
      ),
    ),
  ];
  const owner = ctx.rng.weighted(
    'event.notable',
    owners.map((id) => ({
      item: id,
      weight: id === stories.tracked(ctx) ? 2 : 1,
    })),
  );
  const choices = use.filter(
    (e) =>
      e.trigger.kind === 'notable' &&
      String(e.trigger.cast[0]!.notableId) === owner,
  );
  const chosen = ctx.rng.weighted(
    'event.notable',
    choices.map((e) => ({ item: e, weight: e.weight })),
  );
  return offerOf(chosen, stories.storyRarity(chosen), ctx, fx);
}

export function practiceYield(
  practice: readonly EventPractice[],
  ratio: number,
  rarity: Rarity,
  ctx: RunContext,
  fx: EffectResolver,
  story = false,
): readonly AttributeGain[] {
  const total = practice.reduce((n, p) => n + p.weight, 0);
  return practice
    .map((p) => ({
      attr: p.attr,
      amount: previewGrowth(
        p.attr,
        ((((story
          ? economyRule(ctx).storyGrowth
          : economyRule(ctx).commissionGrowth)[rarity - 1] ?? 0) *
          p.weight) /
          Math.max(total, 1)) *
          ratio,
        ctx,
      ),
    }))
    .filter((g) => g.amount > 0);
}

export function meritYield(
  option: EventOptionDef,
  ratio: number,
  rarity: Rarity,
  ctx: RunContext,
  fx: EffectResolver,
): readonly MeritGain[] {
  const rewards = option.rewards.filter((r) => r.kind === 'merit');
  const total = rewards.reduce((n, r) => n + r.amount, 0);
  const base =
    option.tier === 'story'
      ? economyRule(ctx).storyMerit[rarity - 1]!
      : economyRule(ctx).commissionMerit[rarity - 1]!;
  return rewards
    .map((r) => ({
      line: r.merit,
      amount: Math.round(
        ((base * economyRule(ctx).optionReward[option.tier] * r.amount) /
          Math.max(1, total)) *
          ratio,
      ),
    }))
    .filter((m) => m.amount > 0);
}

export const meritShown = (
  gains: readonly MeritGain[],
  ctx: RunContext,
  fx: EffectResolver,
): readonly MeritGain[] =>
  gains.map((g) => ({
    line: g.line,
    amount: Math.round(g.amount * fx.currencyMul(`merit.${g.line}`, ctx)),
  }));

export function optionStates(
  def: EventDef,
  rarity: Rarity,
  ctx: RunContext,
  fx: EffectResolver,
): readonly OptionState[] {
  const tier = stories.storyRarity(def);
  return def.options.map((o) => {
    const unmet = o.requirements.filter(
      (c) => !evaluateCondition(c, ctx, readStat),
    );
    let rate: number | null = null;
    if (o.check !== null) {
      rate = preview(
        specForMinor(
          o.check.attr,
          Math.round(
            economyRule(ctx).commissionAbility[tier - 1]! *
              economyRule(ctx).optionDc[o.tier],
          ),
        ),
        ctx,
        fx,
      ).successRate;
    }
    return {
      tier: o.tier,
      enabled: unmet.length === 0 && balance(ctx) >= (o.moneyCost ?? 0),
      salary: salaryFor(o, rarity, true, ctx),
      failureSalary: salaryFor(o, rarity, false, ctx),
      moneyCost: o.moneyCost ?? 0,
      blockedReasonKeys: unmet.map(
        () => 'rejection.threshold.not-met' as L10nKey,
      ),
      successRate: rate,
      practicePreview: practiceYield(
        o.practice,
        economyRule(ctx).practiceRatio[o.tier],
        rarity,
        ctx,
        fx,
        o.tier === 'story',
      ),
      meritPreview: meritShown(meritYield(o, 1, rarity, ctx, fx), ctx, fx),
    };
  });
}

export const head = (ctx: RunContext): EventOffer | null =>
  ctx.state.turn.pending[0] ?? null;

export const isClear = (ctx: RunContext): boolean =>
  ctx.state.turn.pending.length === 0;

export const enqueue = (offer: EventOffer, ctx: RunContext): RunState => ({
  ...ctx.state,
  turn: { ...ctx.state.turn, pending: [...ctx.state.turn.pending, offer] },
});

function resolvedKind(
  kind: 'commission' | 'notable',
  ctx: RunContext,
): boolean {
  return ctx.state.turn.resolved.some(
    (r) =>
      ctx.defs.reader('event').get(String(r.eventDefId)).trigger.kind === kind,
  );
}

export function openBeats(ctx: TurnContext, fx: EffectResolver): RunState {
  if (!isClear(ctx)) return ctx.state;
  const index = ctx.state.turn.selected;
  if (index === null) return ctx.state;
  const slot = ctx.state.turn.slots[index];
  if (slot === undefined) return ctx.state;

  if (slot.hasCommission && !resolvedKind('commission', ctx)) {
    const result = ctx.state.turn.training;
    if (result === null) throw new Error('固定事件已選但未留下結果');
    return enqueue(drawCommission(result.attr, result.finalGlow, ctx, fx), ctx);
  }
  if (slot.hasEncounter && !resolvedKind('notable', ctx)) {
    if ((ctx.state.turn.encounterCandidates ?? encounterPool(ctx)).length === 0)
      return ctx.state;
    return enqueue(drawEncounter(ctx, fx), ctx);
  }
  return ctx.state;
}

function grantItems(
  option: EventOptionDef,
  ctx: TurnContext,
): { readonly state: RunState; readonly gains: readonly ItemGain[] } {
  let state = ctx.state;
  const gains: ItemGain[] = [];
  const at = (): TurnContext => ({ state, defs: ctx.defs, rng: ctx.rng });

  for (const r of option.rewards) {
    let target: ItemId | null = null;
    if (r.kind === 'item') {
      if (!ctx.rng.chance('item.drop', r.chance)) continue;
      target = canAcquire(r.itemId, at()) ? r.itemId : null;
    } else if (r.kind === 'itemPool') {
      if (!ctx.rng.chance('item.drop', r.chance)) continue;
      const cands = poolCandidates(r.poolId, at());
      target = cands.length === 0 ? null : ctx.rng.weighted('item.drop', cands);
    } else {
      continue;
    }
    if (target === null) continue;
    const out = acquire(target, at());
    state = out.state;
    if (out.gain !== null) gains.push(out.gain);
  }
  return { state, gains };
}

export function resolveHead(
  optionIndex: number,
  ctx: TurnContext,
  fx: EffectResolver,
  writer: StatWriter,
): RunState {
  const offer = head(ctx);
  if (offer === null) throw new Error('本回合沒有待處理的事件');
  const def = ctx.defs.reader('event').get(String(offer.eventDefId));
  const option = def.options[optionIndex];
  if (option === undefined) throw new Error(`選項不存在: ${optionIndex}`);
  if (!offer.optionStates[optionIndex]?.enabled) {
    throw new Error(`選項門檻不足: ${optionIndex}`);
  }

  const tier = stories.storyRarity(def);
  let passed = true;
  if (option.check !== null) {
    const dc = Math.round(
      economyRule(ctx).commissionAbility[tier - 1]! *
        economyRule(ctx).optionDc[option.tier],
    );
    passed = resolveCheck(specForMinor(option.check.attr, dc), ctx, fx).passed;
  }
  const ratio = passed ? 1 : yieldCurve(ctx).failRatio;
  const practiceGrowth = practiceYield(
    option.practice,
    ratio * economyRule(ctx).practiceRatio[option.tier],
    offer.rarity,
    ctx,
    fx,
    option.tier === 'story',
  );
  const meritRaw = meritYield(option, ratio, offer.rarity, ctx, fx);
  const meritGained = meritShown(meritRaw, ctx, fx);

  const salary = salaryFor(option, offer.rarity, passed, ctx);
  if (balance(ctx) < (option.moneyCost ?? 0)) throw new Error('金錢不足');
  let state = transact(
    'event-cost/' + ctx.state.progress.turn + '/' + def.eventDefId,
    -(option.moneyCost ?? 0),
    '委託投入',
    ctx,
  );
  state = transact(
    'event/' + ctx.state.progress.turn + '/' + def.eventDefId,
    salary,
    ctx.defs.text(String(def.titleKey)),
    { ...ctx, state },
  );
  const at = (): RunContext => ({ state, defs: ctx.defs });
  if (def.trigger.kind === 'notable')
    for (const c of def.trigger.cast)
      state = addAffinity(
        c.notableId,
        economyRule(ctx).storyAffinityGain[optionIndex % 2]!,
        at(),
      );
  for (const g of practiceGrowth)
    state = grantGrowth(g.attr, g.amount, at(), fx);
  for (const m of meritRaw) state = writer.grantMerit(m.line, m.amount, at());
  let itemsGained: readonly ItemGain[] = [];
  if (passed) {
    for (const [rewardIndex, r] of option.rewards.entries()) {
      if (r.kind === 'attr') {
        state = grantGrowth(
          r.attr,
          previewGrowth(r.attr, r.amount, at()),
          at(),
        );
        continue;
      }
      if (r.kind === 'unlock') {
        state = grantUnlock(r.trait, r.skill, at());
        continue;
      }
      if (r.kind === 'money') {
        state = transact(
          'event-extra/' +
            ctx.state.progress.turn +
            '/' +
            def.eventDefId +
            '/' +
            rewardIndex,
          Math.round(r.amount),
          '額外報酬',
          at(),
        );
        continue;
      }
      if (r.kind === 'boon') {
        state = grantBoon(r.ref, at());
        continue;
      }
      if (r.kind !== 'affinity') continue;
      if (r.notableId === null) {
        state = addAffinityAll(r.amount, at());
      } else {
        state = addAffinity(r.notableId, r.amount, at());
      }
    }
    const drop = grantItems(option, { state, defs: ctx.defs, rng: ctx.rng });
    state = drop.state;
    itemsGained = drop.gains;
  }

  const resolution: EventResolution = {
    eventDefId: def.eventDefId,
    optionIndex,
    passed,
    practiceGrowth,
    meritGained,
    itemsGained,
    salary,
    ...(option.resultKey ? { resultKey: option.resultKey } : {}),
  };
  state = stories.record(def, optionIndex, passed, at());
  const seen: readonly EventDefId[] = def.unique
    ? [...state.turn.seenUniqueIds, def.eventDefId]
    : state.turn.seenUniqueIds;

  return {
    ...state,
    turn: {
      ...state.turn,
      pending: state.turn.pending.slice(1),
      resolved: [...state.turn.resolved, resolution],
      seenUniqueIds: seen,
    },
  };
}

export function salaryFor(
  option: EventOptionDef,
  rarity: Rarity,
  passed: boolean,
  ctx: RunContext,
): number {
  const rule = economyRule(ctx);
  return option.tier === 'story'
    ? rule.storySalary[rarity - 1]!
    : Math.round(
        rule.attendance[rarity - 1]! +
          (passed
            ? rule.commissionBonus[rarity - 1]! * rule.optionReward[option.tier]
            : 0),
      );
}
