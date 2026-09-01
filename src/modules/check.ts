// ⑱ 檢定引擎。**事件內小檢定**的判定核心（18）。
//
// 章末那一格是 ㉝ 戰役，有自己的算式與自己的失敗後果 —— 與本模組無關。
//
// 小檢定失敗【不會夢醒】，只是產出打折（`eventYieldCurve.failRatio`）：
// 一回合只有這一次機會，若失敗＝顆粒無收，高 DC 的選項會沒人敢碰，
// 「用哪個方法度過」就退化成只選最穩的那個（17 §6.3）。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { CheckRuleDef } from '../contracts/core/definitions.js';
import type { Attr } from '../contracts/core/primitives.js';
import type { EffectResolver } from './effect.js';
import { statQuery } from './stats.js';

const rule = (ctx: RunContext): CheckRuleDef => ctx.defs.single('checkRule');

/** 小檢定只吃單一維，沒有副屬性。 */
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
  const bonus = fx.checkValueAdd(spec.primaryAttr, ctx);
  return { base: Math.max(r.baseFloor, Math.round(base)), bonus: Math.round(bonus) };
}

/** 比例擺幅：total = value × (1 + (roll - center) / spread)。 */
export function rollTotal(value: number, roll: number, r: CheckRuleDef): number {
  return Math.round(value * (1 + (roll - r.rollCenter) / r.rollSpread));
}

/**
 * 成功率的封閉式。小檢定的成功率【一律可見】——
 * 事件選項是一條費力程度的階梯，玩家要看得出取捨（17 §5）。
 *
 * ㉝ 戰役那一側刻意不給勝率：在一個玩家不操作但變數眾多的系統裡，
 * 算出來的百分比是【假的精確】。兩邊的判準不同，是因為兩邊的系統不同。
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
