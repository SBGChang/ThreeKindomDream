// ① 效果系統的純函式部分：結算順序與條件求值。
// 兩者都不需要 State 以外的東西，因此可獨立測試。
import type { RunContext } from '../contracts/core/context.js';
import type { Condition, Contribution } from '../contracts/core/effects.js';
import type { StatPath } from '../contracts/core/primitives.js';

export type StatReader = (path: StatPath, ctx: RunContext) => number;

/** 結算順序固定寫在 code，不可由資料改變（01 §4）。 */
export function applyResolveOrder(base: number, cs: readonly Contribution[]): number {
  let add = 0;
  let mul = 1;
  let lo = -Infinity;
  let hi = Infinity;
  for (const c of cs) {
    if (c.op === 'add') add += c.value;
    else if (c.op === 'mulPct') mul *= 1 + c.value;
    else if (c.op === 'clampMin') lo = Math.max(lo, c.value);
    else hi = Math.min(hi, c.value);
  }
  return Math.min(hi, Math.max(lo, (base + add) * mul));
}

export function evaluateCondition(
  c: Condition, ctx: RunContext, readStat: StatReader,
): boolean {
  switch (c.type) {
    case 'phase': return ctx.state.progress.phase === c.value;
    case 'faction': return ctx.state.faction === c.value;
    case 'chapterGte': return ctx.state.progress.chapter >= c.value;
    case 'statGte': return readStat(c.stat, ctx) >= c.value;
    case 'statLte': return readStat(c.stat, ctx) <= c.value;
    case 'glowTier': return ctx.state.turn.training?.finalGlow === c.value;
    case 'difficulty': return ctx.state.lastMajorCheck?.difficulty === c.value;
    case 'and': return c.all.every((x) => evaluateCondition(x, ctx, readStat));
    case 'or': return c.any.some((x) => evaluateCondition(x, ctx, readStat));
    case 'not': return !evaluateCondition(c.of, ctx, readStat);
  }
}
