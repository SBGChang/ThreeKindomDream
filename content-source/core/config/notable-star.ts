import type { NotableStarDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * 升星階梯（GREYBOX）★ 名士系統唯一的跨局投資軸。
 *
 * ── 價格、每輪碎片上限與在隊指導倍率 ────────────────────
 *
 * 星是【記憶碎片的突破】，不是稀有度。角色專屬解鎖是【逐人手寫】的
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
  perRunCap: 100, completedBase: 40, minimumAttendance: 8,
  growthByStar: [1, 1.25, 1.65, 2.4, 3.6, 5.8],
  meritByStar: [1, 1.1, 1.25, 1.5, 1.9, 2.6],
  commanderLevelByStar: [1, 1, 2, 3, 4, 5],
  tiers: [
    { star: 0, fragmentCost: 0 },
    { star: 1, fragmentCost: 100 },
    { star: 2, fragmentCost: 100 },
    { star: 3, fragmentCost: 200 },
    { star: 4, fragmentCost: 300 },
    { star: 5, fragmentCost: 500 },
  ],
  // 稀有度不再改變培養速度；每輪每人最多 100，累計 1200 滿星。
  costByRarity: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
});
