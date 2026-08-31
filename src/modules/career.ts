// ㉑ 官階系統。文武雙軌並行，互不排擠（21 §2）。
import type { RunContext } from '../contracts/core/context.js';
import type { CareerRankDef } from '../contracts/core/definitions.js';
import type { CareerLine } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import { statQuery } from './stats.js';

export interface CareerService {
  rankOf(line: CareerLine, ctx: RunContext): CareerRankDef;
  /** 大檢定的官階加值。只算【所走路線】那一條（18 §2.2）。 */
  checkBonus(line: CareerLine, ctx: RunContext): number;
  /** 訂閱功績變動。用 while 而非 if —— 單次獎勵可能一次跨兩階（21 §2.2）。 */
  reevaluate(ctx: RunContext): RunState;
  maxLevel(line: CareerLine, ctx: RunContext): number;
}

const ranksOf = (line: CareerLine, ctx: RunContext): readonly CareerRankDef[] =>
  ctx.defs.reader('careerRank').where((r) => r.line === line)
    .slice().sort((a, b) => a.level - b.level);

export const careerService: CareerService = {
  rankOf(line, ctx) {
    const level = line === 'civil' ? ctx.state.career.civil : ctx.state.career.martial;
    const r = ranksOf(line, ctx).find((x) => x.level === level);
    if (r === undefined) throw new Error(`官階不存在: ${line}.${level}`);
    return r;
  },

  /**
   * 舊版把文武兩線相加。文武各三檔的六選項制之後那是錯的：
   * 相加會讓「走文路還是武路」對加值毫無影響，文武雙軌在檢定上等於單軌，
   * 而「爬哪一條官階」也就不再是決策。
   */
  checkBonus(line, ctx) {
    return this.rankOf(line, ctx).checkBonus;
  },

  reevaluate(ctx) {
    const step = (line: CareerLine, current: number): number => {
      const all = ranksOf(line, ctx);
      const merit = statQuery.merit(line, ctx);
      let level = current;
      for (;;) {
        const next = all.find((r) => r.level === level + 1);
        if (next === undefined || merit < next.requiredMerit) break;
        level = next.level;
      }
      return level;
    };
    return {
      ...ctx.state,
      career: {
        civil: step('civil', ctx.state.career.civil),
        martial: step('martial', ctx.state.career.martial),
      },
    };
  },

  maxLevel: (line, ctx) => ranksOf(line, ctx).length,
};
