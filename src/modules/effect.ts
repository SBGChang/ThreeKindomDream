// ① 效果系統。所有加成的唯一表述與結算路徑（01）。
import type { RunContext } from '../contracts/core/context.js';
import type {
  Condition, Contribution, EffectDef, EffectTrace, FuncType, Op,
  ResolvedEffectRef, StatModifierDef,
} from '../contracts/core/effects.js';
import type { ChargeId, FlagId, TargetId } from '../contracts/core/ids.js';
import type { Attr, StatPath } from '../contracts/core/primitives.js';
import { applyResolveOrder, evaluateCondition, type StatReader } from './effect-core.js';

export interface EffectSource {
  /** 已完成 supersedes 過濾（01 §6）。 */
  collect(ctx: RunContext): readonly ResolvedEffectRef[];
}

export interface EffectResolver {
  resolve(target: TargetId, baseValue: number, ctx: RunContext): number;
  hasFlag(flag: FlagId, ctx: RunContext): boolean;
  chargesOf(charge: ChargeId, ctx: RunContext): number;
  explain(target: TargetId, ctx: RunContext): readonly EffectTrace[];
  glowUpgradeChance(attr: Attr, ctx: RunContext): number;
  glowTierShift(attr: Attr, ctx: RunContext): number;
  slotBias(sourceIdPrefix: string, attr: Attr, ctx: RunContext): number;
  eventRewardMul(eventKind: string, ctx: RunContext): number;
  eventDrawAdd(ctx: RunContext): number;
  affinityGrowthMul(ctx: RunContext): number;
  checkValueAdd(attr: Attr, scope: 'minor' | 'major', ctx: RunContext): number;
  currencyMul(path: StatPath, ctx: RunContext): number;
  startAffinityGrants(ctx: RunContext): readonly { rule: string; amount: number }[];
}

interface Bound { readonly ref: ResolvedEffectRef; readonly def: EffectDef }

/**
 * `<prefix>.all` 對該前綴下的每個 target 都生效
 * —— training.exp.all 涵蓋 training.exp.war，event.practice.all 涵蓋 event.practice.war。
 * 寫成通則而非逐個列舉，新增一族 target 時不必再回來改這裡。
 */
const WILDCARD = 'all';
const matchesTarget = (defTarget: string, wanted: string): boolean => {
  if (defTarget === wanted) return true;
  if (!defTarget.endsWith(`.${WILDCARD}`)) return false;
  // 去掉 'all' 但留下那個點：training.exp.all → training.exp.
  return wanted.startsWith(defTarget.slice(0, defTarget.length - WILDCARD.length));
};

export function createEffectResolver(
  sources: readonly EffectSource[], readStat: StatReader,
): EffectResolver {
  const bind = (ctx: RunContext): readonly Bound[] => {
    const out: Bound[] = [];
    for (const s of sources) {
      for (const ref of s.collect(ctx)) {
        out.push({ ref, def: ctx.defs.effect(ref.funcType, ref.referId) });
      }
    }
    return out;
  };

  const active = (ctx: RunContext, wanted: FuncType): readonly Bound[] =>
    bind(ctx).filter((b) => {
      if (b.ref.funcType !== wanted) return false;
      const cond = (b.def as { condition?: Condition | null }).condition;
      return cond === null || cond === undefined || evaluateCondition(cond, ctx, readStat);
    });

  const sumBy = <T>(
    ft: FuncType, ctx: RunContext, pick: (d: T, sourceId: string) => number,
  ): number => active(ctx, ft)
    .reduce((acc, b) => acc + pick(b.def as unknown as T, b.ref.sourceId), 0);

  const contributions = (target: TargetId, ctx: RunContext): readonly Contribution[] =>
    active(ctx, 'StatModifier')
      .map((b) => ({ src: b.ref.sourceId, d: b.def as StatModifierDef }))
      .filter(({ d }) => matchesTarget(String(d.target), String(target)))
      .map(({ src, d }) => ({ target, op: d.op as Op, value: d.value, sourceId: src }));

  return {
    resolve: (target, base, ctx) => applyResolveOrder(base, contributions(target, ctx)),

    hasFlag: (flag, ctx) => active(ctx, 'RevealInfo')
      .some((b) => `flag.${(b.def as { what: string }).what}` === String(flag)),

    chargesOf: (charge, ctx) => {
      const granted = sumBy<{ scope: string; usesPerRun: number }>(
        'CheckRetry', ctx, (d) => (`charge.${d.scope}Retry` === String(charge) ? d.usesPerRun : 0),
      );
      return Math.max(0, granted - (ctx.state.charges[String(charge)] ?? 0));
    },

    explain: (target, ctx) => contributions(target, ctx).map((c) => ({
      sourceId: c.sourceId,
      funcType: 'StatModifier' as FuncType,
      op: c.op,
      value: c.value,
      applied: true,
    })),

    glowUpgradeChance: (attr, ctx) => sumBy<{ scope: Attr | 'all'; chanceAdd: number }>(
      'GlowUpgradeBonus', ctx, (d) => (d.scope === 'all' || d.scope === attr ? d.chanceAdd : 0),
    ),

    glowTierShift: (attr, ctx) => sumBy<{ scope: Attr | 'all'; tierShift: number }>(
      'GlowBaseWeight', ctx, (d) => (d.scope === 'all' || d.scope === attr ? d.tierShift : 0),
    ),

    slotBias: (prefix, attr, ctx) => active(ctx, 'SlotBias')
      .filter((b) => b.ref.sourceId.startsWith(prefix))
      .reduce((acc, b) => {
        const weights = (b.def as { attrWeights: Partial<Record<Attr, number>> }).attrWeights;
        return acc * (weights[attr] ?? 1);
      }, 1),

    eventRewardMul: (eventKind, ctx) => 1 + sumBy<{ eventKind: string; mulPct: number }>(
      'EventRewardBonus', ctx,
      (d) => (d.eventKind === 'all' || d.eventKind === eventKind ? d.mulPct : 0),
    ),

    eventDrawAdd: (ctx) => sumBy<{ drawCountAdd: number }>(
      'EventDrawModify', ctx, (d) => d.drawCountAdd,
    ),

    affinityGrowthMul: (ctx) => 1 + sumBy<{ scope: string; mulPct: number }>(
      'AffinityGrowth', ctx, (d) => d.mulPct,
    ),

    checkValueAdd: (attr, scope, ctx) => sumBy<
      { attr: Attr | 'all'; scope: 'minor' | 'major' | 'both'; add: number }
    >('CheckValueBonus', ctx, (d) => {
      const attrOk = d.attr === 'all' || d.attr === attr;
      const scopeOk = d.scope === 'both' || d.scope === scope;
      return attrOk && scopeOk ? d.add : 0;
    }),

    currencyMul: (path, ctx) => 1 + sumBy<{ currency: string; mulPct: number }>(
      'CurrencyBonus', ctx, (d) => {
        if (d.currency === path) return d.mulPct;
        if (d.currency === 'allFame' && String(path).startsWith('fame.')) return d.mulPct;
        if (d.currency === 'allMerit' && String(path).startsWith('merit.')) return d.mulPct;
        return 0;
      },
    ),

    startAffinityGrants: (ctx) => active(ctx, 'AffinityGrant')
      .map((b) => b.def as { timing: string; targetRule: string; amount: number })
      .filter((d) => d.timing === 'onDreamEnter')
      .map((d) => ({ rule: d.targetRule, amount: d.amount })),
  };
}

export { applyResolveOrder, evaluateCondition } from './effect-core.js';
export type { StatReader } from './effect-core.js';
