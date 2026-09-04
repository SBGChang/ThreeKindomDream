// ⑳ 屬性與貨幣。唯一的門檻查詢入口（20 §3）。
//
// 局內只剩【一種】門檻貨幣：功績，文武兩線。名聲與善惡名都已退場 ——
// 前者只有一個一次性消費端，後者是同一個型別的第三種（20 §1.2）。
import type { RunContext } from '../contracts/core/context.js';
import type { AttrLineDef, AttributeCapDef } from '../contracts/core/definitions.js';
import type { RunState } from '../contracts/core/state.js';
import type {
  AffinityStage, Attr, CareerLine, MeritKind, StatPath,
} from '../contracts/core/primitives.js';
import type { EffectResolver } from './effect.js';
import type { NotableId } from '../contracts/core/ids.js';
import { affinityOf, countAtStage } from './roster-query.js';

export interface StatQuery {
  read(path: StatPath, ctx: RunContext): number;
  attr(a: Attr, ctx: RunContext): number;
  merit(k: MeritKind, ctx: RunContext): number;
  totalMerit(ctx: RunContext): number;
  /**
   * 該維算哪一條官階線（20 §1.3）：統與武算武功，智與政算文功。
   *
   * 對照表在資料裡（`attrLine`），這裡只負責查。功績結算、兵量係數、UI
   * 三處都經這個入口 —— 否則「政算哪一條」會有三份各自為政的答案。
   */
  lineOf(a: Attr, ctx: RunContext): CareerLine;
}

export interface StatWriter {
  grantAttr(attr: Attr, amount: number, ctx: RunContext): RunState;
  grantMerit(kind: MeritKind, amount: number, ctx: RunContext): RunState;
}

const attrLine = (ctx: RunContext): AttrLineDef => ctx.defs.single('attrLine');

/**
 * **那一維這一輪的天花板** ★ 全遊戲唯一的來源
 *
 * `attributeCap.attrMax`（100）是【尺度】—— 等級表 G..S 就畫在這條尺上。
 * 這一輪實際爬得到哪裡由【資質】決定：資質是跨輪貨幣，天花板是它買到的東西。
 *
 * 第一輪資質全 D → 四維上限 75（B 帶起點）；把某一維買到 S 才摸得到 100。
 * 兩層一起取 min，所以資質表寫錯也不可能超過尺度本身。
 *
 * ㉜ 兌換與這裡的寫入都走同一個函式 —— 「買得到」與「加得上去」
 * 若各有一份上限，總有一天會不一致（而那不會讓任何測試失敗）。
 */
export function attrCapOf(attr: Attr, ctx: RunContext): number {
  const scale = ctx.defs.single('attributeCap').attrMax;
  const grade = ctx.state.config.aptitudes[attr];
  const def = ctx.defs.reader('aptitudeGrade').all().find((g) => g.grade === grade);
  return Math.min(scale, def?.attrCap ?? scale);
}

export const statQuery: StatQuery = {
  read(path, ctx) {
    const [group, key] = String(path).split('.') as [string, string];
    if (group === 'attr') return ctx.state.attributes.values[key as Attr] ?? 0;
    if (group === 'merit') return ctx.state.currencies.merit[key as MeritKind] ?? 0;
    if (group === 'career') return key === 'civil' ? ctx.state.career.civil : ctx.state.career.martial;
    // roster.<階段> ── 陣容中好感【已達】該階段的人數（19 §5.4）。
    // 經 ⑧ 的 Query 而不直讀 roster：該 slice 有擁有者，
    // 而条件求值那一側不必知道它長什麼樣子。
    if (group === 'roster') return countAtStage(key as AffinityStage, ctx);
    // affinity.<notableId> —— 不在陣容時為 0，因此「他不在」與「好感不夠」
    // 是同一件事：兩者都進不了池（人物委託的門檻靠這個成立）。
    if (group === 'affinity') return affinityOf(key as NotableId, ctx);
    throw new Error(`未知的 StatPath: ${String(path)}`);
  },
  attr: (a, ctx) => ctx.state.attributes.values[a],
  merit: (k, ctx) => ctx.state.currencies.merit[k],
  totalMerit: (ctx) => ctx.state.currencies.merit.civil + ctx.state.currencies.merit.martial,
  lineOf: (a, ctx) => attrLine(ctx).byAttr[a],
};

export function createStatWriter(fx: EffectResolver): StatWriter {
  return {
    grantAttr(attr, amount, ctx) {
      const next = Math.min(attrCapOf(attr, ctx), ctx.state.attributes.values[attr] + amount);
      return {
        ...ctx.state,
        attributes: { values: { ...ctx.state.attributes.values, [attr]: next } },
      };
    },

    grantMerit(kind, amount, ctx) {
      const mul = fx.currencyMul(`merit.${kind}` as StatPath, ctx);
      const next = Math.max(0, ctx.state.currencies.merit[kind] + Math.round(amount * mul));
      return {
        ...ctx.state,
        currencies: {
          ...ctx.state.currencies,
          merit: { ...ctx.state.currencies.merit, [kind]: next },
        },
      };
    },
  };
}
