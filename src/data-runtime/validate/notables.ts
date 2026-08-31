import { ATTRS, type Attr } from '../../contracts/core/primitives.js';
import type { Ctx, Rec } from './types.js';

/**
 * 名士的結構欄位。【沒有加成】—— 站位加成全部走 `unlocks` 的 LinkBonus，
 * 因為那樣才會一律吃好感 60 的門檻（19 §5.1）。
 */
function validateBase(c: Ctx, d: Rec, id: string, specialtyOwners: Set<string>): void {
  const base = (d['base'] ?? {}) as Rec;
  const specialty = c.s(base['specialty']);
  if (!(ATTRS as readonly string[]).includes(specialty)) {
    c.push('schema', 'notables', 'base.specialty', id, `未知的專長維: ${specialty}`);
  } else {
    specialtyOwners.add(specialty);
  }

  if (!(c.n(base['sortieBonus']) > 0)) {
    c.push('rule', 'notables', 'base.sortieBonus', id,
      `sortieBonus 必須 > 0（實得 ${c.n(base['sortieBonus'])}）`);
  }

  const weight = c.n(base['specialtyWeight']);
  if (!(weight >= 1)) {
    c.push('rule', 'notables', 'base.specialtyWeight', id,
      `specialtyWeight 必須 >= 1（實得 ${weight}）`,
      '< 1 會讓他【避開】自己的專長格，與「專長」的語意相反');
  }
}

/**
 * 解鎖條的星階。門檻是【星】不是好感度 —— 星是跨局投資，
 * 好感管的是站位效果開不開（`linkBonus.linkStage`）。
 *
 * 三條規則，每一條都擋掉一種「不會讓任何測試失敗」的資料錯誤：
 *   一 · star 必須落在階梯內。掛在星 7 的條永遠解不開，而它看起來很正常。
 *   二 · star 必須不遞減。作者亂序寫時讀起來像階梯，其實不是。
 *   三 · 每人至少要有一條 star 0。0 星是一組能力不是空白起點 ——
 *        少了它，那位名士在升星之前站上格子完全沒有意義。
 */
function validateUnlocks(c: Ctx, d: Rec, id: string, maxStar: number): void {
  const unlocks = c.arr(d['unlocks']);
  if (unlocks.length === 0) {
    c.push('rule', 'notables', 'unlocks', id, '沒有任何解鎖條',
      '0 星本身就該是一組能力，不是空白起點');
    return;
  }

  let prev = -1;
  let hasZero = false;
  unlocks.forEach((u, i) => {
    const star = c.n(u['star']);
    if (star === 0) hasZero = true;
    if (star < 0 || star > maxStar) {
      c.push('rule', 'notables', `unlocks[${i}].star`, id,
        `star ${star} 超出階梯範圍 0..${maxStar}`,
        '掛在階梯之外的條永遠解不開，而它看起來完全正常');
    }
    if (star < prev) {
      c.push('rule', 'notables', `unlocks[${i}].star`, id,
        `star 必須不遞減（前 ${prev}，本 ${star}）`,
        '亂序寫的解鎖條讀起來像階梯，其實不是');
    }
    prev = star;
    c.effect(u['funcType'], u['referId'], 'notables', `unlocks[${i}]`, id);
    c.text(u['descKey'], 'notables', `unlocks[${i}].descKey`, id);
  });

  if (!hasZero) {
    c.push('rule', 'notables', 'unlocks', id, '沒有任何 star 0 的解鎖條',
      '0 星是一組能力 —— 少了它，升星之前站上格子完全沒有意義');
  }
}

/**
 * 站位加成必須真的存在 ★
 *
 * `NotableBaseDef` 移除 `trainingBonus` 之後，「這位名士站上格子有沒有意義」
 * 完全取決於他有沒有一條 `LinkBonus`。少寫一條不會讓任何測試失敗 ——
 * 他只是安靜地變成裝飾品。
 */
function validateHasLink(c: Ctx, d: Rec, id: string): void {
  const has = c.arr(d['unlocks']).some(
    (u) => c.s(u['funcType']) === 'LinkBonus' && c.n(u['star']) === 0,
  );
  if (!has) {
    c.push('rule', 'notables', 'unlocks', id, '0 星沒有任何 LinkBonus',
      '站位加成全部走 LinkBonus。少了它，他站在格子上就是無差別的裝飾');
  }
}

export function validateNotables(c: Ctx): void {
  const specialtyOwners = new Set<string>();
  const ladder = c.rows('notableStar')[0];
  const maxStar = ladder === undefined ? 0 : c.arr(ladder['tiers']).length - 1;

  for (const d of c.rows('notable')) {
    const id = c.s(d['id']);
    c.text(d['nameKey'], 'notables', 'nameKey', id);
    validateBase(c, d, id, specialtyOwners);
    validateUnlocks(c, d, id, maxStar);
    validateHasLink(c, d, id);
  }

  // 四維各需至少一位以它為專長者，否則那一格永遠沒有「值得為他改計畫」的名士。
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
