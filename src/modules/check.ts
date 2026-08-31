// ⑱ 檢定引擎 —— **只剩小檢定**（RFC-01 ✂️ 縮編）。
//
// 大檢定的職責整體移交 ㉝ 戰役：它不再是一次骰子，而是七關的自動戰役。
// 隨之作廢的有：majorCheck 定義、難度自選、出戰名士、`check.majorValue`、
// 官階加值、失敗處理鏈。
//
// 【保留不動】的是這一整條算式與它的封閉式 —— 事件內的小檢定照舊在用，
// 而「失敗不會夢醒，只是拿不到獎勵」那條規格一個字都沒變（GDD §8.6）。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { CheckRuleDef } from '../contracts/core/definitions.js';
import type { Attr } from '../contracts/core/primitives.js';
import type { EffectResolver } from './effect.js';
import { statQuery } from './stats.js';

const rule = (ctx: RunContext): CheckRuleDef => ctx.defs.single('checkRule');

/**
 * 小檢定只吃單一維，沒有副屬性也沒有出戰名士。
 *
 * `scope` 保留在型別上 —— 效果系統的 `CheckValueBonusDef.scope` 仍然有
 * `minor / major / both` 三種，而道具與特質可能只加其中一邊。
 */
export interface CheckSpec {
  readonly scope: 'minor';
  readonly primaryAttr: Attr;
  readonly dc: number;
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
  spec: CheckSpec, ctx: RunContext, fx: EffectResolver,
): CheckValueParts {
  const r = rule(ctx);
  const base = statQuery.attr(spec.primaryAttr, ctx);
  const bonus = fx.checkValueAdd(spec.primaryAttr, spec.scope, ctx);
  return { base: Math.max(r.baseFloor, Math.round(base)), bonus: Math.round(bonus) };
}

/** 比例擺幅：total = value × (1 + (roll - center) / spread)。 */
export function rollTotal(value: number, roll: number, r: CheckRuleDef): number {
  return Math.round(value * (1 + (roll - r.rollCenter) / r.rollSpread));
}

/**
 * 成功率的封閉式。小檢定的成功率【一律可見】——
 * 事件選項要讓玩家看得出「用哪個方法度過」的取捨（17 §5）。
 *
 * 戰役那一側刻意不給勝率（RFC-01 D8）：在一個玩家不操作但變數眾多的系統裡，
 * 算出來的百分比是假的精確。兩邊的判準不同，是因為兩邊的系統不同。
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
  spec: CheckSpec, ctx: RunContext, fx: EffectResolver,
): CheckPreview {
  const { base, bonus } = checkValue(spec, ctx, fx);
  return { base, bonus, dc: spec.dc, successRate: successRate(base, bonus, spec.dc, rule(ctx)) };
}

export function resolveCheck(
  spec: CheckSpec, ctx: TurnContext, fx: EffectResolver,
): CheckOutcome {
  const r = rule(ctx);
  const { base, bonus } = checkValue(spec, ctx, fx);
  const roll = ctx.rng.int('check.roll', r.rollMin, r.rollMax + 1);
  const total = rollTotal(base + bonus, roll, r);
  return { passed: total >= spec.dc, roll, total, base, bonus, dc: spec.dc };
}

export function specForMinor(attr: Attr, dc: number): CheckSpec {
  return { scope: 'minor', primaryAttr: attr, dc };
}

export const checkRuleOf = rule;
