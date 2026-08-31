import { RARITIES } from '../../contracts/core/primitives.js';
import type { Ctx, Rec } from './types.js';

/**
 * 道具的載入期規則（23）★
 *
 * 這裡擋的全是【不會讓任何測試失敗】的資料錯誤：
 * 效果掛錯號的道具照樣跑、階梯斷掉的道具照樣顯示、
 * 掉落指向不存在的池子只會在某個 seed 才炸。
 */
function validateOneItem(c: Ctx, d: Rec, id: string, maxTier: number): void {
  c.text(d['nameKey'], 'items', 'nameKey', id);
  c.text(d['descKey'], 'items', 'descKey', id);

  const rarity = c.n(d['rarity']);
  if (!(RARITIES as readonly number[]).includes(rarity)) {
    c.push('schema', 'items', 'rarity', id, `稀有度超出範圍: ${rarity}`);
  }

  /**
   * 每輪獲得次數上限（23 §5）★
   *
   * 它是整個道具系統的核心取捨來源，因此不能是 0 或負數 ——
   * 那樣的道具永遠拿不到，而它看起來完全正常。
   */
  const cap = c.n(d['perRunCap']);
  if (!(cap >= 1)) {
    c.push('rule', 'items', 'perRunCap', id, `perRunCap 必須 >= 1（實得 ${cap}）`,
      '上限為 0 的道具永遠拿不到，而它在圖鑑裡看起來完全正常');
  }

  const tiers = c.arr(d['tiers']);
  if (tiers.length === 0) {
    c.push('rule', 'items', 'tiers', id, '沒有任何階 —— 這件道具持有也沒有效果');
    return;
  }

  // 階必須是 0..N 的連續整數。跳號的階永遠解不開，而它看起來很正常。
  tiers.forEach((t, i) => {
    const tier = c.n(t['tier']);
    if (tier !== i) {
      c.push('rule', 'items', `tiers[${i}].tier`, id,
        `階必須是 0 起的連續整數（第 ${i} 筆卻是 ${tier}）`);
    }
    if (tier > maxTier) {
      c.push('rule', 'items', `tiers[${i}].tier`, id, `階 ${tier} 超出上限 ${maxTier}`);
    }
    c.text(t['descKey'], 'items', `tiers[${i}].descKey`, id);

    const effects = c.arr(t['effects']);
    if (effects.length === 0) {
      c.push('rule', 'items', `tiers[${i}].effects`, id, `階 ${tier} 沒有任何效果`,
        '空的一階等於花碎片買了一場空');
    }
    effects.forEach((e, j) => {
      c.effect(e['funcType'], e['referId'], 'items', `tiers[${i}].effects[${j}]`, id);
    });

    // 0 階是持有即生效的基底，成本必須為 0；其餘必須要錢。
    const cost = c.n(t['fragmentCost']);
    if (tier === 0 && cost !== 0) {
      c.push('rule', 'items', `tiers[${i}].fragmentCost`, id, `0 階的成本必須為 0（實得 ${cost}）`);
    }
    if (tier > 0 && !(cost > 0)) {
      c.push('rule', 'items', `tiers[${i}].fragmentCost`, id, `第 ${tier} 階的成本必須 > 0`);
    }
  });
}

export function validateItems(c: Ctx): void {
  const items = c.ids('item');
  // 階梯長度以最長的那件為準 —— 道具不共用一張全域階梯表（與名士的星階不同）。
  const maxTier = c.rows('item').reduce((m, d) => Math.max(m, c.arr(d['tiers']).length - 1), 0);

  for (const d of c.rows('item')) {
    validateOneItem(c, d, c.s(d['id']), maxTier);
  }

  for (const d of c.rows('itemPool')) {
    const id = c.s(d['id']);
    const entries = c.arr(d['entries']);
    if (entries.length === 0) {
      c.push('rule', 'itemPools', 'entries', id, '池不得為空 —— 指向它的掉落會靜靜地什麼都不給');
    }
    entries.forEach((e, i) => {
      if (!items.has(c.s(e['itemId']))) {
        c.push('reference', 'itemPools', `entries[${i}].itemId`, id,
          `道具不存在: ${c.s(e['itemId'])}`);
      }
      if (c.n(e['weight']) <= 0) {
        c.push('rule', 'itemPools', `entries[${i}].weight`, id, 'weight 必須 > 0');
      }
    });
  }

  /**
   * 事件獎勵裡的道具引用 ★
   *
   * 指向不存在的道具或池子只會在某個 seed 抽到那一則時才炸 ——
   * 那是最難重現的一種 bug，所以擋在載入期。
   */
  const pools = c.ids('itemPool');
  for (const d of c.rows('event')) {
    const id = c.s(d['id']);
    c.arr(d['options']).forEach((o, i) => {
      c.arr(o['rewards']).forEach((r, j) => {
        const path = `options[${i}].rewards[${j}]`;
        const kind = c.s(r['kind']);
        if (kind === 'item' && !items.has(c.s(r['itemId']))) {
          c.push('reference', 'events', path, id, `道具不存在: ${c.s(r['itemId'])}`);
        }
        if (kind === 'itemPool' && !pools.has(c.s(r['poolId']))) {
          c.push('reference', 'events', path, id, `道具池不存在: ${c.s(r['poolId'])}`);
        }
        if ((kind === 'item' || kind === 'itemPool')) {
          const chance = c.n(r['chance']);
          if (!(chance > 0 && chance <= 1)) {
            c.push('rule', 'events', path, id, `掉落機率必須落在 (0, 1]（實得 ${chance}）`);
          }
        }
        if (kind === 'boon') {
          const ref = (r['ref'] ?? {}) as Rec;
          c.effect(ref['funcType'], ref['referId'], 'events', `${path}.ref`, id);
        }
      });
    });
  }

  /**
   * 高階道具必須有【保證】的來源 ★
   *
   * `perRunCap === 1` 的道具不帶進場就永遠 0 碎片，因此它至少要有一條
   * 機率為 1 的掉落 —— 否則玩家連第一件都可能永遠拿不到，
   * 而攜帶格的整個取捨就不存在了。
   */
  const guaranteed = new Set<string>();
  for (const d of c.rows('event')) {
    for (const o of c.arr(d['options'])) {
      for (const r of c.arr(o['rewards'])) {
        if (c.s(r['kind']) === 'item' && c.n(r['chance']) >= 1) {
          guaranteed.add(c.s(r['itemId']));
        }
      }
    }
  }
  for (const d of c.rows('item')) {
    const id = c.s(d['id']);
    if (c.n(d['perRunCap']) !== 1) continue;
    if (guaranteed.has(id)) continue;
    c.push('rule', 'items', 'perRunCap', id,
      '一輪一次的道具沒有任何保證掉落的來源',
      '它不帶進場就永遠 0 碎片 —— 至少要有一條 chance: 1 的鏈末掉落');
  }
}
