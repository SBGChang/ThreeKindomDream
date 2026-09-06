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
  /** 本輪爬得到的最高階（`config.careerCap` ∧ 內容裡的階數）。 */
  maxLevel(line: CareerLine, ctx: RunContext): number;
  /**
   * **名義階級：沒有上限的話你會在第幾階** ★★
   *
   * ── 為什麼需要它（實測抓到的 bug）───────────────
   * 官階同時是三種東西：
   *   一 · 頭銜（稱號、結局門檻）
   *   二 · 規模（`hostScale` → 兵量糧量、`trainingBaseAdd`）
   *   三 · **索引**（敵人強度 D25、委託報酬倍率、小檢定 DC）
   *
   * 加上本輪上限（D59）之後，第三種跟著被封住了 ——
   * 第一輪官階封在 5，於是敵人永遠是 rank 5 的
   * （兵 3040／輸出 49），而舊制第一輪會遇到 rank 9 的
   * （兵 10720／輸出 122）。**敵人只剩 28%**，玩家卻照樣練到 75。
   * 實測結果就是「第一輪輕鬆打到第七關」。
   *
   * 同時功績在爬到上限之後【完全沒有出口】—— 而 rank 5 只要 410 功績，
   * 第一輪單線賺約 1800，第二章就滿了，剩下四分之三的遊戲功績是廢紙。
   *
   * ── 分開之後 ★ ────────────────────────────────
   *   頭銜與規模  吃【真實階級】—— 第一輪你就是個都尉，帶不了那麼多兵
   *   難度與報酬  吃【名義階級】—— 世界照樣變難，委託照樣變大
   *
   * 於是第一輪的感覺變成：**你只是個都尉，卻在打將軍該打的仗。**
   * 那正好解釋了為什麼你打不深 —— 而功績永遠有作用，因為它推動名義階級。
   */
  notionalLevel(line: CareerLine, ctx: RunContext): number;
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

  notionalLevel(line, ctx) {
    const all = ranksOf(line, ctx);
    const merit = statQuery.merit(line, ctx);
    let level = 1;
    for (const r of all) if (merit >= r.requiredMerit) level = r.level;
    return level;
  },
};
