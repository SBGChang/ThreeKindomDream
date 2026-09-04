// ㉑ 官階系統。文武雙軌並行，互不排擠（21 §2）。
import type { RunContext } from '../contracts/core/context.js';
import type { CareerRankDef } from '../contracts/core/definitions.js';
import type { CareerLine } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import { statQuery } from './stats.js';

export interface CareerService {
  rankOf(line: CareerLine, ctx: RunContext): CareerRankDef;
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

  reevaluate(ctx) {
    // 本輪的天花板（14 §2）。功績超過它【不浪費】—— 兵量吃 hostScale[官階]，
    // 所以上限同時封住兵量，那是一句可讀的話：「你只是個都尉，帶不了那麼多兵。」
    const cap = this.maxLevel('martial', ctx);
    const step = (line: CareerLine, current: number): number => {
      const all = ranksOf(line, ctx);
      const merit = statQuery.merit(line, ctx);
      let level = current;
      for (;;) {
        const next = all.find((r) => r.level === level + 1);
        if (next === undefined || next.level > cap || merit < next.requiredMerit) break;
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

  /**
   * 本輪爬得到的最高階 ★ **不是內容裡有幾階**
   *
   * 舊版回的是階數總和（12），那是【尺度】不是【這一輪的上限】。
   * 兩者分開之後，官階第一次有了跨輪成長：第一輪 5（都尉／功曹），
   * 天命商店的〈官途〉一路買到 12（四方將軍／軍師將軍）。
   */
  maxLevel: (line, ctx) => Math.min(
    ranksOf(line, ctx).length, ctx.state.config.careerCap,
  ),
};
