import type { Attr } from '../../contracts/core/primitives.js';
import { ATTRS } from '../../contracts/core/primitives.js';
import type { Ctx, Rec } from './types.js';

/** tier → 混合消耗的類數（32 §4.1）。純專精買不起絕階，就是這張表夾出來的。 */
const COST_CLASSES: Readonly<Record<string, number>> = { common: 1, fine: 2, peerless: 3 };

const DAMAGING = new Set(['physical', 'magic']);

const checkCost = (c: Ctx, file: string, row: Rec, id: string): void => {
  const raw = row['cost'];
  const pairs = typeof raw === 'object' && raw !== null
    ? Object.entries(raw as Record<string, unknown>) : [];
  const tier = c.s(row['tier']);
  const want = COST_CLASSES[tier];
  if (pairs.length === 0) {
    c.push('rule', file, 'cost', id, '能力專長權重不可為空');
    return;
  }
  if (want !== undefined && pairs.length !== want) {
    c.push('rule', file, 'cost', id,
      `${tier} 階應有 ${want} 類專長權重，實得 ${pairs.length} 類`,
      '權重用於推導訓練營的主要與次要能力門檻');
  }
  for (const [attr, amount] of pairs) {
    if (!ATTRS.includes(attr as Attr)) {
      c.push('reference', file, `cost.${attr}`, id, `未知的維度: ${attr}`);
    }
    if (!(c.n(amount) > 0)) {
      c.push('rule', file, `cost.${attr}`, id, `專長權重必須 > 0（實得 ${c.n(amount)}）`);
    }
  }
};

/**
 * 特質與技能（23 §6）。
 *
 * ── 為什麼要有這一檔 ★ ──────────────────────────────
 * 23 §6 列了七條驗證，實作是零條 —— 於是「統與政沒有任何輸出招」
 * 這種缺口靜靜活了一整版：所有 gate 全綠，只有真的去玩才發現
 * 抽到那兩維最高的人自己打不出傷害（RFC-01 D46）。
 *
 * ── 最後一條是這裡最重要的 ★ ────────────────────────
 * `ability.starterSkill()` 拿【起始四維最高那一維】去找常階輸出招。
 * 那一維若沒有輸出招，它回 null，玩家帶著三個空格走進第一場戰役。
 * 這不會讓任何斷言失敗，只會讓那一輪很爛 —— 正是要靠驗證擋的東西。
 *
 * 刻意【不驗】`kind` 與 `actorAttr` 的對應：四職能約束的是名士的定位
 * （寫在他的 star-0 招裡），不是 def 的性質。〈號令〉是統的物理招。
 */
export function validateAbilities(c: Ctx): void {
  for (const row of c.rows('battleRule')) {
    const values = (row['duel'] as Rec | undefined)?.['genericByChapter'];
    if (!Array.isArray(values) || values.length < 8 || !values.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 100)) {
      c.push('rule', 'battleRule', 'duel.genericByChapter', c.s(row['id']), '單挑指揮官數值需要至少八章、每章 1–100 的有限數值');
    }
  }
  for (const row of c.rows('growthRule')) {
    const id = c.s(row['id']);
    const learning = row['learning'] as Rec | undefined;
    for (const field of ['power']) {
      const values = learning?.[field];
      const valid = Array.isArray(values) && values.length === 5
        && values.every((v, i) => typeof v === 'number' && Number.isFinite(v) && v >= 0
          && (i === 0 || v > values[i - 1]));
      if (!valid) c.push('rule', 'growthRule', `learning.${field}`, id, '需要五個有限、非負、嚴格遞增的等級數值');
    }
  }
  for (const row of c.rows('trait')) {
    const id = c.s(row['id']);
    if (row['duelTrait'] !== undefined && !['momentum', 'steady', 'breathing', 'reversal'].includes(c.s(row['duelTrait']))) {
      c.push('rule', 'trait', 'duelTrait', id, '未知的單挑特性');
    }
    c.text(row['nameKey'], 'trait', 'nameKey', id);
    c.text(row['descKey'], 'trait', 'descKey', id);
    checkCost(c, 'trait', row, id);
    if (c.list(row['effects']).length === 0 && !row['battleTrigger']) {
      c.push('rule', 'trait', 'effects', id, '沒有效果的特質是死內容');
    }
  }

  const armed = new Map<Attr, number>();
  for (const row of c.rows('skill')) {
    const id = c.s(row['id']);
    c.text(row['nameKey'], 'skill', 'nameKey', id);
    c.text(row['descKey'], 'skill', 'descKey', id);
    checkCost(c, 'skill', row, id);

    const action = row['action'];
    if (typeof action !== 'object' || action === null) {
      c.push('rule', 'skill', 'action', id, 'action 缺漏');
      continue;
    }
    const a = action as Rec;
    if (!(c.n(a['ratio']) > 0)) {
      c.push('rule', 'skill', 'action.ratio', id,
        `ratio 必須 > 0（實得 ${c.n(a['ratio'])}）`,
        '零效果的技能佔一個格子卻什麼都不做');
    }
    const attr = c.s(a['actorAttr']) as Attr;
    if (!ATTRS.includes(attr)) {
      c.push('reference', 'skill', 'action.actorAttr', id, `未知的維度: ${attr}`);
      continue;
    }
    if (c.s(row['tier']) === 'common' && DAMAGING.has(c.s(a['kind']))) {
      armed.set(attr, (armed.get(attr) ?? 0) + 1);
    }
  }

  for (const attr of ATTRS) {
    if ((armed.get(attr) ?? 0) > 0) continue;
    c.push('rule', 'skill', `action.actorAttr=${attr}`, null,
      `${attr} 沒有任何常階輸出招（physical／magic）`,
      '起始四維抽到這一維最高的玩家自己打不出傷害；'
      + 'ability.starterSkill() 會回 null，三個技能格全空');
  }
}
