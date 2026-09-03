import type { GrowthRuleDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * 養成兌現的規則（32 §3.1）★
 *
 * ── 價格帶 ＝ 等級帶 ─────────────────────────────────
 * 成本區間與等級邊界對齊是刻意的：玩家看到「武 B」就知道下一點要付 44，
 * 七個價格帶 ＝ 七個等級，不需要在 UI 另外解釋一條成本曲線。
 *
 *   評   分數      每點   進入該級的累計
 *   G    0         —      0
 *   F    1–19      4      4
 *   E    20–39     8      84
 *   D    40–59     16     252
 *   C    60–74     28     584
 *   B    75–84     44     1020
 *   A    85–94     76     1492
 *   S    95–100    136    2312   （練滿 100 累計 2992）
 *
 * ── 這張表【與能力消耗表一起 ×1.5】過（2026-09）★ ─────
 * 事件經驗改成「基礎值 × 星數」（玩家訂的規矩）之後收入漲了四成，
 * 舊表下最強的策略四維全部點到 82 以上 —— **買得完，就沒有取捨**。
 *
 * 只動一邊會讓取捨偏向便宜的那一邊，所以兩張表必須同時動
 * （見 core/abilities/index.ts）。
 *
 * ── 實測（13 策略 × 300 輪，四章）★ ─────────────────
 *   專精 focus-martial     統55 武85 智48 政46   特質 4.5
 *   均衡 greedy-gain       統71 武69 智61 政56   特質 5.2
 *   關係 encounter-chaser  統79 武73 智68 政66   特質 6.2
 *
 * **專精者四章走完摸到 A 帶（1492），S 帶（2312）留給後五章。**
 * 均衡者一維都上不了 A，換來的是多一半的特質 ——
 * 這就是「A 級帶特質 對 均衡帶更多特質」那個決策。
 * 所有策略都剩 477–741 未花（總量的 12–13%）：**買不完。**
 */
export const growthRule: GrowthRuleDef = coreDef('growthRule', 'growth:main', {
  bands: [
    { grade: 'G', min: 0, max: 0, costPerPoint: 4 },
    { grade: 'F', min: 1, max: 19, costPerPoint: 4 },
    { grade: 'E', min: 20, max: 39, costPerPoint: 8 },
    { grade: 'D', min: 40, max: 59, costPerPoint: 16 },
    { grade: 'C', min: 60, max: 74, costPerPoint: 28 },
    { grade: 'B', min: 75, max: 84, costPerPoint: 44 },
    { grade: 'A', min: 85, max: 94, costPerPoint: 76 },
    { grade: 'S', min: 95, max: 100, costPerPoint: 136 },
  ],
  /**
   * 向名士學該階能力所需的好感（32 §5）。階越高，要越熟。
   *
   * 絕階訂在「知交」＝ 站位效果的同一道門（好感 60）。那一階本來就是
   * 「這個人真的把你當自己人」的分界，讓最強的一批能力與它對齊，
   * 玩家只要記一個數字。
   */
  teachStage: { common: 'acquainted', fine: 'friendly', peerless: 'close' },
  // 起始四維：逐維獨立擲 15–30。不是 0 ——
  // 全 0 開局的第一場戰役打不出任何傷害，而四個 G 也看不出角色性格。
  startMin: 15,
  startMax: 30,
});
