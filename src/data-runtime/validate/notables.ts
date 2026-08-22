import { ATTRS, type Attr } from '../../contracts/core/primitives.js';
import type { Ctx, Rec } from './types.js';

/**
 * 基底：從第一回合就生效的加成。每位名士都必須有，
 * 否則開局站在格子上的名士就是無差別的裝飾（19 §5.1）。
 */
function validateBase(c: Ctx, d: Rec, id: string, specialtyOwners: Set<string>): void {
  const base = (d['base'] ?? {}) as Rec;
  const specialty = c.s(base['specialty']);
  if (!(ATTRS as readonly string[]).includes(specialty)) {
    c.push('schema', 'notables', 'base.specialty', id, `未知的專長維: ${specialty}`);
  } else {
    specialtyOwners.add(specialty);
  }

  const positive: readonly string[] = ['trainingBonus', 'specialtyBonus', 'sortieBonus'];
  for (const f of positive) {
    const v = c.n(base[f]);
    if (!(v > 0)) {
      c.push('rule', 'notables', `base.${f}`, id,
        `${f} 必須 > 0（實得 ${v}）`,
        '基底為 0 等於這位名士站在格子上沒有意義 —— 那就是要修掉的問題本身');
    }
  }

  const weight = c.n(base['specialtyWeight']);
  if (!(weight >= 1)) {
    c.push('rule', 'notables', 'base.specialtyWeight', id,
      `specialtyWeight 必須 >= 1（實得 ${weight}）`,
      '< 1 會讓他【避開】自己的專長格，與「專長」的語意相反');
  }
}

export function validateNotables(c: Ctx): void {
  const events = c.ids('event');
  const specialtyOwners = new Set<string>();
  for (const d of c.rows('notable')) {
    const id = c.s(d['id']);
    c.text(d['nameKey'], 'notables', 'nameKey', id);
    validateBase(c, d, id, specialtyOwners);

    const unlocks = c.arr(d['unlocks']);
    let prev = -1;
    unlocks.forEach((u, i) => {
      const aff = c.n(u['affinity']);
      if (aff <= prev) {
        c.push('rule', 'notables', `unlocks[${i}].affinity`, id,
          `affinity 必須嚴格遞增（前 ${prev}，本 ${aff}）`);
      }
      prev = aff;
      c.effect(u['funcType'], u['referId'], 'notables', `unlocks[${i}]`, id);
      c.text(u['descKey'], 'notables', `unlocks[${i}].descKey`, id);

      for (const sup of c.list(u['supersedes'])) {
        const v = c.n(sup);
        if (!unlocks.some((o) => c.n(o['affinity']) === v)) {
          c.push('rule', 'notables', `unlocks[${i}].supersedes`, id, `引用不存在的門檻 ${v}`);
        }
        if (v >= aff) {
          c.push('rule', 'notables', `unlocks[${i}].supersedes`, id,
            `只能引用較低門檻（本 ${aff}，引用 ${v}）`);
        }
      }
    });

    c.arr(d['eventChain']).forEach((st, i) => {
      if (!events.has(c.s(st['eventDefId']))) {
        c.push('reference', 'notables', `eventChain[${i}]`, id,
          `事件不存在: ${c.s(st['eventDefId'])}`);
      }
    });
  }

  // 四維各需至少一位以它為專長者，否則那一格永遠沒有「值得為他改計畫」的名士，
  // 該維的鍛鍊格就只剩光階可看（政與魅目前正是這個狀態的受害者）。
  for (const attr of ATTRS as readonly Attr[]) {
    if (!specialtyOwners.has(attr)) {
      c.push('rule', 'notables', `base.specialty/${attr}`, null,
        `沒有任何名士以 ${attr} 為專長`,
        '該維的行動格會永遠沒有對位名士，站位對它失去意義');
    }
  }

  const rules = c.rows('gameRules')[0];
  const needed = rules === undefined
    ? 0
    : c.n(rules['companionCount']) + c.n(rules['superiorCount']);

  for (const d of c.rows('notablePool')) {
    const id = c.s(d['id']);
    const entries = c.arr(d['entries']);
    if (entries.length === 0) c.push('rule', 'notablePools', 'entries', id, '池不得為空');
    // 幼年抽到的成年不會再抽到（19 §3.1）。玩伴與上司來自同一批人，
    // 因此池至少要裝得下兩批，否則上司會靜靜少於應有的數量。
    if (entries.length < needed) {
      c.push('rule', 'notablePools', 'entries', id,
        `池只有 ${entries.length} 人，但一輪要抽 ${needed} 位（玩伴 ＋ 上司）`,
        '幼年抽到的成年不會再抽到，池必須裝得下兩批');
    }
    entries.forEach((e, i) => {
      if (!c.ids('notable').has(c.s(e['notableId']))) {
        c.push('reference', 'notablePools', `entries[${i}].notableId`, id,
          `名士不存在: ${c.s(e['notableId'])}`);
      }
      if (c.n(e['weight']) <= 0) {
        c.push('rule', 'notablePools', `entries[${i}].weight`, id, 'weight 必須 > 0');
      }
    });
  }
}
