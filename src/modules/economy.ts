import type { RunContext } from '../contracts/core/context.js';
import type { EconomyState, RunState } from '../contracts/core/state.js';
export const economyRule = (ctx: RunContext) =>
  ctx.defs.single('growthRule').economy;
export const purse = (ctx: RunContext): EconomyState => ctx.state.economy;
export const balance = (ctx: RunContext): number => purse(ctx).money;
/** Atomic, replay-safe transaction. Failed debits never enter the journal. */
export function transact(
  id: string,
  amount: number,
  label: string,
  ctx: RunContext,
): RunState {
  const old = purse(ctx);
  if (!Number.isSafeInteger(amount) || old.ledger.some((x) => x.id === id))
    return ctx.state;
  if (old.money + amount < 0) return ctx.state;
  return {
    ...ctx.state,
    economy: {
      ...old,
      money: old.money + amount,
      earned: old.earned + Math.max(0, amount),
      spent: old.spent + Math.max(0, -amount),
      ledger: [...old.ledger, { id, amount, label }],
    },
  };
}
export function setCamp(value: boolean, ctx: RunContext): RunState {
  return { ...ctx.state, economy: { ...purse(ctx), chapterCamp: value } };
}
export const inCamp = (ctx: RunContext): boolean => purse(ctx).chapterCamp;
