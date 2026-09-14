import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type {
  GlowTierDef,
  TrainingCurveDef,
} from '../contracts/core/definitions.js';
import type { NotableId } from '../contracts/core/ids.js';
import type {
  Attr,
  GlowTier,
  SlotIndex,
} from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import type {
  MeritGain,
  RunState,
  TrainingSlot,
} from '../contracts/core/state.js';
import { targetId } from '../contracts/core/ids.js';
import type { EffectResolver } from './effect.js';
import { distributeSlots, gainAffinity, trainingMultiplier } from './roster.js';
import { rollCommissionFlag, rollEncounterFlag } from './commission.js';
import { grantGrowth, previewGrowth } from './growth.js';
import { economyRule, transact } from './economy.js';
import { stageOf } from './roster-query.js';
import { pityDue } from './stories.js';
import { statQuery, type StatWriter } from './stats.js';

const curve = (ctx: RunContext): TrainingCurveDef =>
  ctx.defs.single('trainingCurve');
const tiers = (ctx: RunContext): readonly GlowTierDef[] =>
  ctx.defs
    .reader('glowTier')
    .all()
    .slice()
    .sort((a, b) => a.order - b.order);

export function applyShift(
  weights: readonly number[],
  shiftSteps: number,
  stepRatio: number,
): readonly number[] {
  const w = [...weights];
  const steps = Math.trunc(shiftSteps);
  const dir = steps >= 0 ? 1 : -1;
  for (let s = 0; s < Math.abs(steps); s += 1) {
    const from =
      dir > 0
        ? w.findIndex((x) => x > 0)
        : w.length - 1 - [...w].reverse().findIndex((x) => x > 0);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= w.length) break;
    const move = (w[from] ?? 0) * stepRatio;
    w[from] = (w[from] ?? 0) - move;
    w[to] = (w[to] ?? 0) + move;
  }
  return w;
}

function rollBaseGlow(
  attr: Attr,
  ctx: TurnContext,
  fx: EffectResolver,
): GlowTier {
  const all = tiers(ctx);
  const shift = fx.glowTierShift(attr, ctx) + aptitudeShift(attr, ctx);
  const shifted = applyShift(
    all.map((t) => t.baseWeight),
    shift,
    curve(ctx).shiftStepRatio,
  );
  const entries = all.map((t, i) => ({
    item: t.tier,
    weight: Math.max(0, shifted[i] ?? 0),
  }));
  return ctx.rng.weighted('glow.base', entries);
}

function aptitudeShift(attr: Attr, ctx: RunContext): number {
  const grade = ctx.state.config.aptitudes[attr];
  const def = ctx.defs
    .reader('aptitudeGrade')
    .all()
    .find((g) => g.grade === grade);
  return def?.shiftSteps ?? 0;
}

function aptitudeMul(attr: Attr, ctx: RunContext): number {
  const grade = ctx.state.config.aptitudes[attr];
  const def = ctx.defs
    .reader('aptitudeGrade')
    .all()
    .find((g) => g.grade === grade);
  return def?.yieldMul ?? 1;
}

export function generate(
  ctx: TurnContext,
  fx: EffectResolver,
): readonly TrainingSlot[] {
  const phase = ctx.state.progress.phase;
  const actions = ctx.defs
    .reader('trainingAction')
    .where((a) => a.phase === phase);
  const placed = distributeSlots(ctx, fx);

  const partial = ATTRS.map((attr, i) => {
    const action = actions.find((a) => a.attr === attr);
    if (action === undefined)
      throw new Error(`缺少 ${phase}/${attr} 的固定事件定義`);
    return {
      attr,
      labelKey: action.labelKey,
      subtitleKey: ctx.rng.pick('event.params', action.subtitleKeys),
      baseGlow: rollBaseGlow(attr, ctx, fx),
      notables: placed[i] ?? [],
    };
  });

  return partial.map((p, i) => ({
    ...p,
    hasCommission: rollCommissionFlag(p.attr, p.notables, ctx, fx),
    hasEncounter:
      rollEncounterFlag(p.attr, p.notables, ctx, fx) ||
      (i === 0 && pityDue(ctx)),
  }));
}

export interface TrainingPreview {
  readonly attr: Attr;
  readonly baseGlow: GlowTier;

  readonly expectedGain: number;

  readonly meritGain: MeritGain;
  readonly notableCount: number;
  readonly hasCommission: boolean;
  readonly hasEncounter: boolean;
}

export const hasSelected = (ctx: RunContext): boolean =>
  ctx.state.turn.selected !== null;

export const slotAt = (index: SlotIndex, ctx: RunContext): TrainingSlot => {
  const slot = ctx.state.turn.slots[index];
  if (slot === undefined) throw new Error(`固定事件不存在: ${index}`);
  return slot;
};

export function preview(
  index: SlotIndex,
  ctx: RunContext,
  fx: EffectResolver,
): TrainingPreview {
  const slot = slotAt(index, ctx);
  return {
    attr: slot.attr,
    baseGlow: slot.baseGlow,
    expectedGain: computeGain(slot.attr, slot.baseGlow, slot.notables, ctx, fx),
    meritGain: shownMerit(computeMerit(slot.attr, ctx, fx), ctx, fx),
    notableCount: slot.notables.length,
    hasCommission: slot.hasCommission,
    hasEncounter: slot.hasEncounter,
  };
}

function computeGain(
  attr: Attr,
  tier: GlowTier,
  notables: readonly NotableId[],
  ctx: RunContext,
  fx: EffectResolver,
): number {
  const glow = tiers(ctx).find((t) => t.tier === tier);
  if (glow === undefined) throw new Error(`光階不存在: ${tier}`);
  const rule = economyRule(ctx);
  const base =
    (rule.fixedGrowth[ctx.state.progress.chapter - 1] ??
      rule.fixedGrowth.at(-1)!) +
    fx.slotBaseAdd(attr, notables, ctx) * rule.legacyBaseRatio;
  const standing = Math.min(
    rule.standingGrowthCap,
    notables.reduce((n, id) => n + rule.standingGrowth[stageOf(id, ctx)], 0),
  );
  const extra = Math.min(
    rule.extraGrowthCap,
    Math.max(0, fx.gainMul(attr, ctx) - 1) +
      Math.max(0, fx.resolve(targetId('training.growth.' + attr), 1, ctx) - 1) +
      Math.max(0, trainingMultiplier(notables, attr, ctx, fx) - 1) *
        rule.legacyBaseRatio,
  );
  const raw =
    base * glow.yieldMul * aptitudeMul(attr, ctx) * (1 + standing + extra);
  return Math.min(rule.fixedGrowthCap, previewGrowth(attr, raw, ctx));
}

function computeMerit(
  attr: Attr,
  ctx: RunContext,
  fx: EffectResolver,
): MeritGain {
  const c = curve(ctx);
  const raw = c.meritByAttr[attr] ?? 0;
  const line = statQuery.lineOf(attr, ctx);
  return {
    line,
    amount: Math.round(
      fx.resolve(targetId(`training.merit.${attr}`), raw, ctx),
    ),
  };
}

const shownMerit = (
  g: MeritGain,
  ctx: RunContext,
  fx: EffectResolver,
): MeritGain => ({
  line: g.line,
  amount: Math.round(g.amount * fx.currencyMul(`merit.${g.line}`, ctx)),
});

export function select(
  index: SlotIndex,
  ctx: TurnContext,
  fx: EffectResolver,
  writer: StatWriter,
): RunState {
  const slot = slotAt(index, ctx);

  const all = tiers(ctx);
  const baseOrder = all.find((t) => t.tier === slot.baseGlow)?.order ?? 0;
  const chance =
    curve(ctx).upgradeBaseChance + fx.glowUpgradeChance(slot.attr, ctx);
  const upgraded = ctx.rng.chance('glow.upgrade', chance);
  const finalOrder = upgraded
    ? Math.min(all.length - 1, baseOrder + 1)
    : baseOrder;
  const finalTier =
    all.find((t) => t.order === finalOrder)?.tier ?? slot.baseGlow;

  const gained = computeGain(slot.attr, finalTier, slot.notables, ctx, fx);
  const merit = computeMerit(slot.attr, ctx, fx);
  let next = grantGrowth(slot.attr, gained, ctx, fx);
  next = writer.grantMerit(merit.line, merit.amount, {
    state: next,
    defs: ctx.defs,
  });
  next = gainAffinity(slot.notables, { state: next, defs: ctx.defs }, fx);
  const salary =
    economyRule(ctx).fixedSalary[ctx.state.progress.chapter - 1] ??
    economyRule(ctx).fixedSalary.at(-1)!;
  next = transact('fixed/' + ctx.state.progress.turn, salary, '日常俸給', {
    ...ctx,
    state: next,
  });
  const meritLogged = shownMerit(merit, ctx, fx);

  return {
    ...next,
    turn: {
      ...next.turn,
      selected: index,
      training: {
        finalGlow: finalTier,
        upgraded,
        attr: slot.attr,
        growthGained: gained,
        meritGained: meritLogged,
        salary,
      },
    },
  };
}
