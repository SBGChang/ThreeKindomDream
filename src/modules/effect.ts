// ① 效果系統。所有加成的唯一表述與結算路徑（01）。
import type { RunContext } from '../contracts/core/context.js';
import type {
  ChanceModifierDef, Condition, Contribution, EffectDef, EffectTrace, FuncType,
  NotableTarget, Op, ResolvedEffectRef, StandingReq, StatModifierDef, UnlockGrantDef,
} from '../contracts/core/effects.js';
import { notableOfSource, standingOf } from '../contracts/core/effects.js';
import type { EffectRef as EffectRefInput } from '../contracts/core/effects.js';
import type { ChargeId, FlagId, NotableId, TargetId } from '../contracts/core/ids.js';
import type { RunState } from '../contracts/core/state.js';
import type { Attr, Rarity, StatPath } from '../contracts/core/primitives.js';
import { applyResolveOrder, evaluateCondition, type StatReader } from './effect-core.js';

export interface EffectSource {
  /** 已完成門檻過濾（01 §6）。名士的站位效果在來源端就擋掉好感不足者。 */
  collect(ctx: RunContext): readonly ResolvedEffectRef[];
}

export interface AffinityGrantOutcome {
  readonly target: NotableTarget;
  readonly amount: number;
  readonly owner: NotableId | null;
}

/** 委託／人物事件旗標的一次擲骰參數（15 §3）。 */
export interface ChanceOutcome {
  readonly chance: number;
  readonly guaranteed: boolean;
}

export interface EffectResolver {
  resolve(target: TargetId, baseValue: number, ctx: RunContext): number;
  hasFlag(flag: FlagId, ctx: RunContext): boolean;
  chargesOf(charge: ChargeId, ctx: RunContext): number;
  explain(target: TargetId, ctx: RunContext): readonly EffectTrace[];
  /** 道具／天賦直接解鎖的能力（32 §5）。**不含學費** —— 學習仍要花經驗。 */
  unlockGrants(ctx: RunContext): readonly UnlockGrantDef[];
  glowUpgradeChance(attr: Attr, ctx: RunContext): number;
  glowTierShift(attr: Attr, ctx: RunContext): number;
  /** 站位分配的權重倍率。不吃好感門檻 —— 好感正是靠同格養出來的（19 §4）。 */
  slotBias(subject: NotableId, attr: Attr, ctx: RunContext): number;
  eventRewardMul(eventKind: string, ctx: RunContext): number;
  affinityGrowthMul(subject: NotableId, ctx: RunContext): number;
  /** 小檢定的檢定值加值（18）。 */
  checkValueAdd(attr: Attr, ctx: RunContext): number;
  currencyMul(path: StatPath, ctx: RunContext): number;
  /**
   * 入夢時的好感補正（10 §2）。`owner` 是效果的來源名士 —— `target: self`
   * 要靠它才知道「自己」是誰；道具與天賦的來源為 null。
   */
  startAffinityGrants(ctx: RunContext): readonly AffinityGrantOutcome[];
  // ── 站位層（全部吃好感門檻，過濾在 EffectSource）★ ────
  /** 某位名士站在某格時，他自己的加成加成率。 */
  linkBonusPct(subject: NotableId, attr: Attr, standing: readonly NotableId[], ctx: RunContext): number;
  /** 同格【其他人】對 subject 的放大率。陳群的九品官人法（19 §5.5）。 */
  linkAmplifyPct(subject: NotableId, standing: readonly NotableId[], ctx: RunContext): number;
  /** 依同格人數的整格倍率。逍遙津令的獨行流走這條（23 §4）。 */
  slotSizeMul(count: number, standing: readonly NotableId[], ctx: RunContext): number;
  /** 同框時抬高的基礎值。加法、落在乘法鏈之前。 */
  slotBaseAdd(attr: Attr, standing: readonly NotableId[], ctx: RunContext): number;
  // ── 機會層 ──────────────────────────────────────
  commissionChance(attr: Attr, standing: readonly NotableId[], ctx: RunContext): ChanceOutcome;
  encounterChance(attr: Attr, standing: readonly NotableId[], ctx: RunContext): ChanceOutcome;
  rarityShift(ctx: RunContext): number;
  rarityFloor(ctx: RunContext): Rarity;
  // ── 產出層 ──────────────────────────────────────
  gainMul(attr: Attr, ctx: RunContext): number;
}

interface Bound { readonly ref: ResolvedEffectRef; readonly def: EffectDef }

/**
 * `<prefix>.all` 對該前綴下的每個 target 都生效
 * —— training.exp.all 涵蓋 training.exp.war，event.practice.all 涵蓋 event.practice.war。
 */
const WILDCARD = 'all';
const matchesTarget = (defTarget: string, wanted: string): boolean => {
  if (defTarget === wanted) return true;
  if (!defTarget.endsWith(`.${WILDCARD}`)) return false;
  return wanted.startsWith(defTarget.slice(0, defTarget.length - WILDCARD.length));
};

/** 效果的來源名士。不是名士來源（道具、天賦）時為 null。 */
const ownerOf = (b: Bound): NotableId | null =>
  notableOfSource(b.ref.sourceId) as NotableId | null;

/**
 * 當局獎勵的效果來源（23 §8）。
 *
 * 它與名士、道具共用同一套 FuncType，因此加一種新的當局獎勵不必動程式 ——
 * 只要在事件的 rewards 裡指一條既有的效果。
 */
export function boonEffectSource(): EffectSource {
  return {
    collect: (ctx: RunContext): readonly ResolvedEffectRef[] => ctx.state.boons.map(
      (ref, i) => ({ ...ref, sourceId: `boon/${i}` }),
    ),
  };
}

/**
 * 消耗一次充能。`charges[id]` 存的是【已用次數】，額度由效果現算 ——
 * 因此這裡只要 +1，不必知道總額是多少（01 §8）。
 *
 * 放在 ① 是因為它擁有 `charges` slice；呼叫端（㉝ 的原地再起）
 * 因此不必跨 slice 直寫。
 */
export function consumeCharge(charge: ChargeId, ctx: RunContext): RunState {
  const key = String(charge);
  return {
    ...ctx.state,
    charges: { ...ctx.state.charges, [key]: (ctx.state.charges[key] ?? 0) + 1 },
  };
}

/** 授予一條當局增益。只有 ⑰ 在結算事件獎勵時呼叫。 */
export function grantBoon(ref: EffectRefInput, ctx: RunContext): RunState {
  return { ...ctx.state, boons: [...ctx.state.boons, ref] };
}

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

  /**
   * 這條效果的「誰必須站著」有沒有滿足（effects.ts §StandingReq）。
   *
   * 只有一處實作 —— 加新的站位型 FuncType 時帶上 `standing` 欄位即可，
   * 不必回來補判斷。
   */
  const standingOk = (
    b: Bound, standing: readonly NotableId[],
  ): boolean => {
    const req: StandingReq = standingOf(b.def);
    if (req.kind === 'none') return true;
    if (req.kind === 'named') return standing.includes(req.notableId);
    const owner = ownerOf(b);
    return owner !== null && standing.includes(owner);
  };

  /**
   * 效果的作用對象範圍。這是【限制越窄效果越強】那條規則的求值處：
   * named 只中一個人、specialty 中一維、all 中全部。
   */
  const targetHits = (
    target: NotableTarget, subject: NotableId, owner: NotableId | null, ctx: RunContext,
  ): boolean => {
    switch (target.kind) {
      case 'all': return true;
      case 'self': return owner !== null && owner === subject;
      case 'named': return target.notableId === subject;
      case 'specialty':
        return ctx.defs.reader('notable').get(String(subject)).base.specialty === target.attr;
    }
  };

  const sumBy = <T>(
    ft: FuncType, ctx: RunContext, pick: (d: T, sourceId: string) => number,
  ): number => active(ctx, ft)
    .reduce((acc, b) => acc + pick(b.def as unknown as T, b.ref.sourceId), 0);

  const contributions = (target: TargetId, ctx: RunContext): readonly Contribution[] =>
    active(ctx, 'StatModifier')
      .map((b) => ({ src: b.ref.sourceId, d: b.def as StatModifierDef }))
      .filter(({ d }) => matchesTarget(String(d.target), String(target)))
      .map(({ src, d }) => ({ target, op: d.op as Op, value: d.value, sourceId: src }));

  /** 委託／人物事件旗標共用同一段求值 —— 兩者的定義形狀相同。 */
  const chanceOf = (
    ft: FuncType, attr: Attr, standing: readonly NotableId[], ctx: RunContext,
  ): ChanceOutcome => {
    let add = 0;
    let guaranteed = false;
    for (const b of active(ctx, ft)) {
      if (!standingOk(b, standing)) continue;
      const d = b.def as ChanceModifierDef;
      if (d.scope !== 'all' && d.scope !== attr) continue;
      add += d.addPct;
      if (d.guarantee) guaranteed = true;
    }
    return { chance: add, guaranteed };
  };

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

    slotBias: (subject, attr, ctx) => active(ctx, 'SlotBias')
      .reduce((acc, b) => {
        const d = b.def as { target: NotableTarget; attrWeights: Partial<Record<Attr, number>> };
        if (!targetHits(d.target, subject, ownerOf(b), ctx)) return acc;
        return acc * (d.attrWeights[attr] ?? 1);
      }, 1),

    eventRewardMul: (eventKind, ctx) => 1 + sumBy<{ eventKind: string; mulPct: number }>(
      'EventRewardBonus', ctx,
      (d) => (d.eventKind === 'all' || d.eventKind === eventKind ? d.mulPct : 0),
    ),

    affinityGrowthMul: (subject, ctx) => 1 + active(ctx, 'AffinityGrowth')
      .reduce((acc, b) => {
        const d = b.def as { target: NotableTarget; mulPct: number };
        return targetHits(d.target, subject, ownerOf(b), ctx) ? acc + d.mulPct : acc;
      }, 0),

    checkValueAdd: (attr, ctx) => sumBy<{ attr: Attr | 'all'; add: number }>(
      'CheckValueBonus', ctx, (d) => (d.attr === 'all' || d.attr === attr ? d.add : 0),
    ),

    unlockGrants: (ctx) => active(ctx, 'UnlockGrant').map((b) => b.def as UnlockGrantDef),

    currencyMul: (path, ctx) => 1 + sumBy<{ currency: string; mulPct: number }>(
      'CurrencyBonus', ctx, (d) => {
        if (d.currency === path) return d.mulPct;
        if (d.currency === 'allMerit' && String(path).startsWith('merit.')) return d.mulPct;
        return 0;
      },
    ),

    startAffinityGrants: (ctx) => active(ctx, 'AffinityGrant')
      .map((b) => ({
        owner: ownerOf(b),
        d: b.def as { timing: string; target: NotableTarget; amount: number },
      }))
      .filter(({ d }) => d.timing === 'onDreamEnter')
      .map(({ owner, d }) => ({ target: d.target, amount: d.amount, owner })),

    // ── 站位層 ──────────────────────────────────────
    linkBonusPct: (subject, attr, standing, ctx) => active(ctx, 'LinkBonus')
      .reduce((acc, b) => {
        if (ownerOf(b) !== subject) return acc;
        if (!standingOk(b, standing)) return acc;
        const d = b.def as { scope: Attr | 'all'; mulPct: number };
        return d.scope === 'all' || d.scope === attr ? acc + d.mulPct : acc;
      }, 0),

    linkAmplifyPct: (subject, standing, ctx) => active(ctx, 'LinkAmplify')
      .reduce((acc, b) => {
        const owner = ownerOf(b);
        // 「放大同框【其他】人」—— 放大自己會變成 LinkBonus 的重複表述。
        if (owner !== null && owner === subject) return acc;
        if (!standingOk(b, standing)) return acc;
        const d = b.def as { target: NotableTarget; mulPct: number };
        return targetHits(d.target, subject, owner, ctx) ? acc + d.mulPct : acc;
      }, 0),

    slotSizeMul: (count, standing, ctx) => active(ctx, 'SlotSizeBonus')
      .reduce((acc, b) => {
        if (!standingOk(b, standing)) return acc;
        const d = b.def as { minNotables: number; maxNotables: number; mulPct: number };
        if (count < d.minNotables || count > d.maxNotables) return acc;
        return acc * (1 + d.mulPct);
      }, 1),

    slotBaseAdd: (attr, standing, ctx) => active(ctx, 'SlotBaseAdd')
      .reduce((acc, b) => {
        if (!standingOk(b, standing)) return acc;
        const d = b.def as { scope: Attr | 'all'; add: number };
        return d.scope === 'all' || d.scope === attr ? acc + d.add : acc;
      }, 0),

    // ── 機會層 ──────────────────────────────────────
    commissionChance: (attr, standing, ctx) => chanceOf('CommissionChance', attr, standing, ctx),
    encounterChance: (attr, standing, ctx) => chanceOf('EncounterChance', attr, standing, ctx),

    rarityShift: (ctx) => sumBy<{ shift: number }>('RarityWeight', ctx, (d) => d.shift),

    rarityFloor: (ctx) => active(ctx, 'RarityFloor')
      .reduce<Rarity>((acc, b) => {
        const min = (b.def as { min: Rarity }).min;
        return min > acc ? min : acc;
      }, 1),

    // ── 產出層 ──────────────────────────────────────
    gainMul: (attr, ctx) => 1 + sumBy<{ scope: Attr | 'all'; mulPct: number }>(
      'GainMultiplier', ctx, (d) => (d.scope === 'all' || d.scope === attr ? d.mulPct : 0),
    ),
  };
}

export { applyResolveOrder, evaluateCondition } from './effect-core.js';
export type { StatReader } from './effect-core.js';
