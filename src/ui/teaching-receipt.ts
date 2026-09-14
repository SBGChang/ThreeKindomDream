import type { RunState } from '../contracts/core/state.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type { RewardLine } from './event-receipt.js';

/** Display actual free levels and mastery compensation, never a second simulated award. */
export function teachingRewardLines(before: RunState, after: RunState, defs: DefinitionRegistry): RewardLine[] {
  const rows: RewardLine[] = [];
  for (const kind of ['skill', 'trait'] as const) {
    const old = kind === 'skill' ? before.abilities.skills : before.abilities.traits;
    const current = kind === 'skill' ? after.abilities.skills : after.abilities.traits;
    for (const id of current) {
      const previous = old.some(x => x === id) ? before.abilities.levels?.[id] ?? 1 : 0;
      const level = after.abilities.levels?.[id] ?? 1;
      if (level <= previous) continue;
      rows.push({ label: defs.text(String(defs.reader(kind).get(String(id)).nameKey)),
        amount: level - previous, note: previous ? `突破至 ${level} 級` : `解鎖${kind === 'skill' ? '技能' : '特性'} · 1 級` });
    }
  }
  const oldTransactions = new Set(before.economy.ledger.map(e => e.id));
  for (const entry of after.economy.ledger) {
    if (entry.id.startsWith('teaching/') && entry.amount > 0 && !oldTransactions.has(entry.id))
      rows.push({ label: entry.label, amount: entry.amount, note: '金錢' });
  }
  return rows;
}
