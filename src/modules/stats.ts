// ⑳ 屬性與貨幣。唯一的門檻查詢入口（20 §3）。
import type { RunContext } from '../contracts/core/context.js';
import type { AttributeCapDef } from '../contracts/core/definitions.js';
import type { RunState } from '../contracts/core/state.js';
import type { Attr, FameKind, MeritKind, StatPath } from '../contracts/core/primitives.js';
import type { EffectResolver } from './effect.js';

export interface StatQuery {
  read(path: StatPath, ctx: RunContext): number;
  attr(a: Attr, ctx: RunContext): number;
  fame(k: FameKind, ctx: RunContext): number;
  merit(k: MeritKind, ctx: RunContext): number;
  /** 總名聲＝文名＋武名，不含善惡名（20 §1.2）。 */
  totalFame(ctx: RunContext): number;
  totalMerit(ctx: RunContext): number;
}

export interface StatWriter {
  grantAttr(attr: Attr, amount: number, ctx: RunContext): RunState;
  grantFame(kind: FameKind, amount: number, ctx: RunContext): RunState;
  grantMerit(kind: MeritKind, amount: number, ctx: RunContext): RunState;
}

export const statQuery: StatQuery = {
  read(path, ctx) {
    const [group, key] = String(path).split('.') as [string, string];
    if (group === 'attr') return ctx.state.attributes.values[key as Attr] ?? 0;
    if (group === 'fame') return ctx.state.currencies.fame[key as FameKind] ?? 0;
    if (group === 'merit') return ctx.state.currencies.merit[key as MeritKind] ?? 0;
    if (group === 'career') return key === 'civil' ? ctx.state.career.civil : ctx.state.career.martial;
    throw new Error(`未知的 StatPath: ${String(path)}`);
  },
  attr: (a, ctx) => ctx.state.attributes.values[a],
  fame: (k, ctx) => ctx.state.currencies.fame[k],
  merit: (k, ctx) => ctx.state.currencies.merit[k],
  totalFame: (ctx) => ctx.state.currencies.fame.civil + ctx.state.currencies.fame.martial,
  totalMerit: (ctx) => ctx.state.currencies.merit.civil + ctx.state.currencies.merit.martial,
};

export function createStatWriter(fx: EffectResolver): StatWriter {
  const capOf = (ctx: RunContext): AttributeCapDef => ctx.defs.single('attributeCap');

  return {
    grantAttr(attr, amount, ctx) {
      const cap = capOf(ctx);
      const next = Math.min(cap.attrMax, ctx.state.attributes.values[attr] + amount);
      return {
        ...ctx.state,
        attributes: { values: { ...ctx.state.attributes.values, [attr]: next } },
      };
    },
    grantFame(kind, amount, ctx) {
      const cap = capOf(ctx);
      const mul = fx.currencyMul(`fame.${kind}` as StatPath, ctx);
      const raw = ctx.state.currencies.fame[kind] + Math.round(amount * mul);
      // 善惡名是唯一可為負的軸，且有上下限
      const next = kind === 'moral'
        ? Math.max(cap.moralMin, Math.min(cap.moralMax, raw))
        : Math.max(0, raw);
      return {
        ...ctx.state,
        currencies: { ...ctx.state.currencies, fame: { ...ctx.state.currencies.fame, [kind]: next } },
      };
    },
    grantMerit(kind, amount, ctx) {
      const mul = fx.currencyMul(`merit.${kind}` as StatPath, ctx);
      const next = Math.max(0, ctx.state.currencies.merit[kind] + Math.round(amount * mul));
      return {
        ...ctx.state,
        currencies: { ...ctx.state.currencies, merit: { ...ctx.state.currencies.merit, [kind]: next } },
      };
    },
  };
}
