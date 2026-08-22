// ⑯ 鍛鍊槽。兩層 RNG、名士站位、只產出四維（16）。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { GlowTierDef, TrainingCurveDef } from '../contracts/core/definitions.js';
import type { Attr, GlowTier, SlotIndex } from '../contracts/core/primitives.js';
import type {
  RunState, TrainingSlot, TrainingSlotState, TurnAction,
} from '../contracts/core/state.js';
import { targetId } from '../contracts/core/ids.js';
import type { EffectResolver } from './effect.js';
import { distributeSlots, gainAffinity, trainingMultiplier } from './roster.js';
import { ATTR_ORDER } from './roster-query.js';
import type { StatWriter } from './stats.js';

const curve = (ctx: RunContext): TrainingCurveDef => ctx.defs.single('trainingCurve');
const tiers = (ctx: RunContext): readonly GlowTierDef[] =>
  ctx.defs.reader('glowTier').all().slice().sort((a, b) => a.order - b.order);

/**
 * 純函式：把 shiftSteps 套到光階權重上。
 * 語意固定在 code —— 每一步把 stepRatio 比例的權重由最低非零階移轉至次高階（16 §2.1）。
 * ⚠️ GDD §5.2 的「±N 檔」對應到 stepRatio 的具體數值尚未定案。
 */
export function applyShift(
  weights: readonly number[], shiftSteps: number, stepRatio: number,
): readonly number[] {
  const w = [...weights];
  const steps = Math.trunc(shiftSteps);
  const dir = steps >= 0 ? 1 : -1;
  for (let s = 0; s < Math.abs(steps); s += 1) {
    const from = dir > 0
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

/** 供 15 組合出「本回合的動作」。本模組只回報自己這一半（15 §2.1）。 */
export const selectedAction = (ctx: RunContext): TurnAction | null => {
  const i = ctx.state.slots.training.selected;
  return i === null ? null : { kind: 'training', index: i };
};

function rollBaseGlow(attr: Attr, ctx: TurnContext, fx: EffectResolver): GlowTier {
  const all = tiers(ctx);
  const shift = fx.glowTierShift(attr, ctx) + aptitudeShift(attr, ctx);
  const shifted = applyShift(all.map((t) => t.baseWeight), shift, curve(ctx).shiftStepRatio);
  const entries = all.map((t, i) => ({ item: t.tier, weight: Math.max(0, shifted[i] ?? 0) }));
  return ctx.rng.weighted('glow.base', entries);
}

function aptitudeShift(attr: Attr, ctx: RunContext): number {
  const grade = ctx.state.config.aptitudes[attr];
  const def = ctx.defs.reader('aptitudeGrade').all().find((g) => g.grade === grade);
  return def?.shiftSteps ?? 0;
}

function aptitudeMul(attr: Attr, ctx: RunContext): number {
  const grade = ctx.state.config.aptitudes[attr];
  const def = ctx.defs.reader('aptitudeGrade').all().find((g) => g.grade === grade);
  return def?.yieldMul ?? 1;
}

/** 第一層可見的是保底值，不是結果值（16 §2）。 */
export function generate(ctx: TurnContext, fx: EffectResolver): TrainingSlotState {
  const phase = ctx.state.progress.phase;
  const actions = ctx.defs.reader('trainingAction').where((a) => a.phase === phase);
  const placed = distributeSlots(ctx, fx);

  const slots: TrainingSlot[] = ATTR_ORDER.map((attr, i) => {
    const action = actions.find((a) => a.attr === attr);
    if (action === undefined) throw new Error(`缺少 ${phase}/${attr} 的鍛鍊行動定義`);
    return {
      attr,
      labelKey: action.labelKey,
      subtitleKey: ctx.rng.pick('event.params', action.subtitleKeys),
      baseGlow: rollBaseGlow(attr, ctx, fx),
      notables: placed[i] ?? [],
    };
  });

  return { slots, selected: null, result: null };
}

export interface TrainingPreview {
  readonly attr: Attr;
  readonly baseGlow: GlowTier;
  readonly expectedGain: number;
  readonly upgradeChance: number;
  readonly notableMultiplier: number;
}

export function preview(index: SlotIndex, ctx: RunContext, fx: EffectResolver): TrainingPreview {
  const slot = ctx.state.slots.training.slots[index];
  if (slot === undefined) throw new Error(`槽位不存在: ${index}`);
  return {
    attr: slot.attr,
    baseGlow: slot.baseGlow,
    expectedGain: computeGain(slot.attr, slot.baseGlow, slot.notables, ctx, fx),
    upgradeChance: curve(ctx).upgradeBaseChance + fx.glowUpgradeChance(slot.attr, ctx),
    notableMultiplier: trainingMultiplier(slot.notables, slot.attr, ctx),
  };
}

function computeGain(
  attr: Attr, tier: GlowTier, notables: readonly import('../contracts/core/ids.js').NotableId[],
  ctx: RunContext, fx: EffectResolver,
): number {
  const c = curve(ctx);
  const glow = tiers(ctx).find((t) => t.tier === tier);
  if (glow === undefined) throw new Error(`光階不存在: ${tier}`);
  const chapterMul = c.chapterMultiplier[ctx.state.progress.chapter - 1] ?? 1;
  const base = (c.baseByAttr[attr] ?? 0) * chapterMul;
  const raw = base * glow.yieldMul * aptitudeMul(attr, ctx)
    * trainingMultiplier(notables, attr, ctx);
  const withFx = fx.resolve(targetId(`training.exp.${attr}`), raw, ctx);
  const noGlowBonus = tier === 'none'
    ? withFx * fx.resolve(targetId('training.noGlowBonus'), 0, ctx)
    : 0;
  return Math.round(withFx + noGlowBonus);
}

/** 第二層：升階判定，選擇後才揭曉（16 §2.2）。 */
export function select(
  index: SlotIndex, ctx: TurnContext, fx: EffectResolver, writer: Pick<StatWriter, 'grantAttr'>,
): RunState {
  const slot = ctx.state.slots.training.slots[index];
  if (slot === undefined) throw new Error(`槽位不存在: ${index}`);

  const all = tiers(ctx);
  const baseOrder = all.find((t) => t.tier === slot.baseGlow)?.order ?? 0;
  const chance = curve(ctx).upgradeBaseChance + fx.glowUpgradeChance(slot.attr, ctx);
  const upgraded = ctx.rng.chance('glow.upgrade', chance);
  const finalOrder = upgraded ? Math.min(all.length - 1, baseOrder + 1) : baseOrder;
  const finalTier = all.find((t) => t.order === finalOrder)?.tier ?? slot.baseGlow;

  const gained = computeGain(slot.attr, finalTier, slot.notables, ctx, fx);
  // ⑯ 只寫 attributes —— 型別上就寫不到 currencies（16 §4.1）
  let next = writer.grantAttr(slot.attr, gained, ctx);
  next = gainAffinity(slot.notables, { state: next, defs: ctx.defs }, fx);

  return {
    ...next,
    slots: {
      ...next.slots,
      training: {
        ...next.slots.training,
        selected: index,
        result: { finalGlow: finalTier, upgraded, attr: slot.attr, attrGained: gained },
      },
    },
  };
}
