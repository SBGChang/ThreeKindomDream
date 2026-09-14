import { attributeProgress } from '../contracts/core/attribute-progress.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type {
  EventOffer,
  EventResolution,
  RunState,
} from '../contracts/core/state.js';
export interface RewardLine {
  readonly label: string;
  readonly amount?: number;
  readonly note?: string;
  readonly promoted?: string;
}
export interface EventReceipt {
  readonly offer: EventOffer;
  readonly result: EventResolution;
  readonly lines: readonly RewardLine[];
}
/** Actual state differences, including caps, costs, extra rewards and failures. */
export function eventRewardLines(
  before: RunState,
  after: RunState,
  result: EventResolution,
  defs: DefinitionRegistry,
): RewardLine[] {
  const rows: RewardLine[] = [],
    event = defs.reader('event').get(String(result.eventDefId)),
    cost = event.options[result.optionIndex]?.moneyCost ?? 0;
  const text = (key: string) => defs.text(key),
    add = (label: string, amount: number, note?: string) => {
      const value = Math.round(amount * 100) / 100;
      if (value) rows.push({ label, amount: value, ...(note ? { note } : {}) });
    };
  add('委託投入', -cost, '金錢');
  add('薪水', result.salary ?? 0, '金錢');
  add(
    '額外報酬',
    after.economy.money - before.economy.money - (result.salary ?? 0) + cost,
    '金錢',
  );
  for (const attr of ['lead', 'war', 'int', 'pol'] as const) {
    const name = text('attr.' + attr + '.short');
    add(name + '經驗', (after.attributes.values[attr] - before.attributes.values[attr]) * 100);
    add(name, attributeProgress(after.attributes.values[attr]).level - attributeProgress(before.attributes.values[attr]).level, '能力');
  }
  for (const line of ['civil', 'martial'] as const)
    add(
      text('merit.' + line),
      after.currencies.merit[line] - before.currencies.merit[line],
    );
  for (const m of after.roster.members)
    add(
      text(String(defs.reader('notable').get(String(m.notableId)).nameKey)),
      m.affinity -
        (before.roster.members.find((b) => b.notableId === m.notableId)
          ?.affinity ?? 0),
      '好感',
    );
  for (const g of result.itemsGained) {
    const name = text(
      String(defs.reader('item').get(String(g.itemId)).nameKey),
    );
    if (!g.duplicate) rows.push({ label: name, amount: 1, note: '獲得道具' });
  }
  for (const [id, count] of Object.entries(after.items.fragments ?? {}))
    add(
      text(String(defs.reader('item').get(id).nameKey)),
      count - (before.items.fragments?.[id] ?? 0),
      '碎片',
    );
  for (const id of after.growth.unlockedSkills.filter(
    (x) => !before.growth.unlockedSkills.includes(x),
  ))
    rows.push({
      label: text(String(defs.reader('skill').get(String(id)).nameKey)),
      note: '領悟技能 · 可於訓練中學習',
    });
  for (const id of after.growth.unlockedTraits.filter(
    (x) => !before.growth.unlockedTraits.includes(x),
  ))
    rows.push({
      label: text(String(defs.reader('trait').get(String(id)).nameKey)),
      note: '領悟特性 · 可於訓練中學習',
    });
  if (after.boons.length > before.boons.length)
    rows.push({ label: '本輪加成', note: '已生效' });
  for (const line of ['civil', 'martial'] as const)
    if (after.career[line] > before.career[line])
      rows.push({
        label: line === 'civil' ? '文官晉升' : '武官晉升',
        note: '官階',
        promoted: before.career[line] + ' → ' + after.career[line],
      });
  return rows;
}
