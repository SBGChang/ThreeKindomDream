import type { NotableStarDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * 升星階梯（GREYBOX）★ 名士系統唯一的跨局投資軸。
 *
 * ── 這張表只管【價格】★ ──────────────────────────────
 *
 * 星是【記憶碎片的突破】，不是稀有度。每一階給什麼是【逐人手寫】的
 * （`NotableDef.unlocks`），不是一張全域表。
 *
 * 舊版把 `linkMultiplier` 與 `startAffinity` 放在這裡，於是同星階的所有名士
 * 數值完全一樣 ——「曹操是統御的好夥伴、荀彧是功績的好夥伴」在資料上
 * 根本無法表達。那兩個欄位已移除：
 *
 *   連動倍率 → `LinkBonus` 解鎖條，逐人逐階手寫
 *   起始好感 → `AffinityGrant` 解鎖條，逐人逐階手寫
 *
 * 因此「典韋二星就到好感 60、曹操二星才到 40」現在寫得出來，
 * 而那正是他們兩人在設計上的差別：典韋賣的是【時間】。
 *
 * ── 累加不取代 ──────────────────────────────────────
 * 曹操 1／3／5 星各給統御同框 +15／+15／+20%，滿星共 +50%。
 * 後階不會把前階蓋掉 ——「升星反而變弱」在結構上不可能發生。
 */
export const notableStar: NotableStarDef = coreDef('notableStar', 'star:main', {
  tiers: [
    { star: 0, fragmentCost: 0 },
    { star: 1, fragmentCost: 20 },
    { star: 2, fragmentCost: 35 },
    { star: 3, fragmentCost: 60 },
    { star: 4, fragmentCost: 100 },
    { star: 5, fragmentCost: 160 },
  ],
  // 成本倍率。★1 滿星 375×0.6 ≈ 225 碎片；★5 滿星 375×2.0 = 750。
  // 一輪約產 60–120 碎片，因此 ★1 兩三輪可滿、★5 要六七輪 ——
  // 「低星滿級 > 高星低級」在這個差距下確實成立（GDD §6.7）。
  costByRarity: { 1: 0.6, 2: 0.8, 3: 1.0, 4: 1.4, 5: 2.0 },
});
