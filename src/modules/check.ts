// ⑱ 檢定引擎。小檢定與大檢定共用一套算式，差別只在加值來源與失敗後果（18 §1）。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { CheckRuleDef, MajorCheckDef } from '../contracts/core/definitions.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { Attr, Difficulty } from '../contracts/core/primitives.js';
import { DIFFICULTIES } from '../contracts/core/primitives.js';
import { careerService } from './career.js';
import type { EffectResolver } from './effect.js';
import { evaluateCondition } from './effect-core.js';
import { sortieBonus } from './roster-query.js';
import { statQuery } from './stats.js';

const rule = (ctx: RunContext): CheckRuleDef => ctx.defs.single('checkRule');

export interface CheckSpec {
  readonly primaryAttr: Attr;
  readonly secondaryAttr: Attr | null;
  readonly dc: number;
  readonly scope: 'minor' | 'major';
}

export interface CheckValueParts {
  readonly base: number;
  readonly bonus: number;
}

export interface CheckPreview extends CheckValueParts {
  readonly dc: number;
  readonly successRate: number;
}

export interface CheckOutcome {
  readonly passed: boolean;
  readonly roll: number;
  readonly total: number;
  readonly base: number;
  readonly bonus: number;
  readonly dc: number;
}

export function checkValue(
  spec: CheckSpec, sortie: readonly NotableId[], ctx: RunContext, fx: EffectResolver,
): CheckValueParts {
  const r = rule(ctx);
  const primary = statQuery.attr(spec.primaryAttr, ctx);
  const secondary = spec.secondaryAttr === null ? 0 : statQuery.attr(spec.secondaryAttr, ctx);
  const base = primary + secondary * r.secondaryWeight;

  let bonus = fx.checkValueAdd(spec.primaryAttr, spec.scope, ctx);
  if (spec.scope === 'major') {
    bonus += careerService.checkBonus(ctx);
    bonus += sortieBonus(sortie, ctx);
  }
  return { base: Math.max(r.baseFloor, Math.round(base)), bonus: Math.round(bonus) };
}

/** 比例擺幅：total = value × (1 + (roll - center) / spread)。 */
export function rollTotal(value: number, roll: number, r: CheckRuleDef): number {
  return Math.round(value * (1 + (roll - r.rollCenter) / r.rollSpread));
}

/**
 * 成功率的封閉式。一律可見 —— 若玩家看不到，難度自選就不是決策而是盲賭（18 §3.2）。
 * 解 value × (1 + (roll - center)/spread) >= dc 對 roll 的最小整數解。
 */
export function successRate(
  base: number, bonus: number, dc: number, r: CheckRuleDef,
): number {
  const value = base + bonus;
  const faces = r.rollMax - r.rollMin + 1;
  if (value <= 0) return dc <= 0 ? 1 : 0;
  const need = Math.ceil(r.rollCenter + r.rollSpread * (dc / value - 1));
  if (need <= r.rollMin) return 1;
  if (need > r.rollMax) return 0;
  return (r.rollMax - need + 1) / faces;
}

export function preview(
  spec: CheckSpec, sortie: readonly NotableId[], ctx: RunContext, fx: EffectResolver,
): CheckPreview {
  const { base, bonus } = checkValue(spec, sortie, ctx, fx);
  return { base, bonus, dc: spec.dc, successRate: successRate(base, bonus, spec.dc, rule(ctx)) };
}

export function resolveCheck(
  spec: CheckSpec, sortie: readonly NotableId[], ctx: TurnContext, fx: EffectResolver,
): CheckOutcome {
  const r = rule(ctx);
  const { base, bonus } = checkValue(spec, sortie, ctx, fx);
  const roll = ctx.rng.int('check.roll', r.rollMin, r.rollMax + 1);
  const total = rollTotal(base + bonus, roll, r);
  return { passed: total >= spec.dc, roll, total, base, bonus, dc: spec.dc };
}

/** 難度可用性：功績不足時鎖定但仍顯示所需條件（18 §2.1）。 */
export function availableDifficulties(
  check: MajorCheckDef, ctx: RunContext,
): readonly Difficulty[] {
  const read = (path: Parameters<typeof statQuery.read>[0], c: RunContext): number =>
    statQuery.read(path, c);
  return DIFFICULTIES.filter((d) => {
    const tier = check.tiers[d];
    return tier.requirements.every((cond) => evaluateCondition(cond, ctx, read));
  });
}

export function specForMajor(check: MajorCheckDef, difficulty: Difficulty): CheckSpec {
  return {
    primaryAttr: check.primaryAttr,
    secondaryAttr: check.secondaryAttr,
    dc: check.tiers[difficulty].dc,
    scope: 'major',
  };
}

export function specForMinor(attr: Attr, dc: number): CheckSpec {
  return { primaryAttr: attr, secondaryAttr: null, dc, scope: 'minor' };
}

export const checkRuleOf = rule;
