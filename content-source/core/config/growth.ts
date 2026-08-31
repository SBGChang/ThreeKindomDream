import type { GrowthRuleDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * 養成兌現的規則（32 §3.1）★
 *
 * ── 價格帶 ＝ 等級帶 ─────────────────────────────────
 * 成本區間與等級邊界對齊是刻意的：玩家看到「武 B」就知道下一階要付約 200 點，
 * 七個價格帶 ＝ 七個等級，不需要在 UI 另外解釋一條成本曲線。
 *
 *   評   分數      每點   累計到該級下界
 *   G    0         —      0
 *   F    1–19      1      0
 *   E    20–39     2      20
 *   D    40–59     4      60
 *   C    60–74     7      140
 *   B    75–84     12     245
 *   A    85–94     20     365
 *   S    95–100    35     565   （練滿 100 累計 740）
 *
 * ── GREYBOX 反推 ★ ──────────────────────────────────
 * 一輪總經驗約 800–1000 點（每回合 `10 × 章節倍率 × 光階` ≈ 30，32 回合，
 * 隨官階再長）。專精者集中在單一類約 650–700，於是：
 *
 *   S 級（565）需近乎全押  ／  A 級（365）留得下約 300 給特質
 *
 * **「S 級空手」對「A 級帶特質」就是這張表要產出的決策。**
 * 總經驗量本身未實測 —— 校準時要先驗證它（RFC-01 §6）。
 */
export const growthRule: GrowthRuleDef = coreDef('growthRule', 'growth:main', {
  bands: [
    { grade: 'G', min: 0, max: 0, costPerPoint: 1 },
    { grade: 'F', min: 1, max: 19, costPerPoint: 1 },
    { grade: 'E', min: 20, max: 39, costPerPoint: 2 },
    { grade: 'D', min: 40, max: 59, costPerPoint: 4 },
    { grade: 'C', min: 60, max: 74, costPerPoint: 7 },
    { grade: 'B', min: 75, max: 84, costPerPoint: 12 },
    { grade: 'A', min: 85, max: 94, costPerPoint: 20 },
    { grade: 'S', min: 95, max: 100, costPerPoint: 35 },
  ],
  /**
   * 向名士學該階能力所需的好感（32 §5）。階越高，要越熟。
   *
   * 絕階訂在「知交」＝ 站位效果的同一道門（好感 60）。那一階本來就是
   * 「這個人真的把你當自己人」的分界，讓最強的一批能力與它對齊，
   * 玩家只要記一個數字。
   */
  teachStage: { common: 'acquainted', fine: 'friendly', peerless: 'close' },
});
