import type { AptitudeCostDef, AptitudeGradeDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// shiftSteps 的語意見 16 §2.1 —— 每一步把 shiftStepRatio 比例的權重
// 由最低非零階移轉至次高階。
//
// ── attrCap：資質的第二個職責 ＝ 那一維的天花板 ★★ ────
//
// 實測「第一輪 對 天命全滿」：最高四維 83.1 → 98.2 ——
// **第一輪就拿到全滿的 85%，跨輪成長幾乎不存在。**
// 病因是天命商店賣的全部是【經驗產量】的乘數，而經驗的出口有硬上限，
// 加上階梯計價（85→95 每點 76–136）讓產量的邊際報酬掉得極快。
//
// 天花板改成跨輪貨幣之後：
//   第一輪（資質全 D，配點 0）→ 四維上限 **75**（B 帶起點）
//   天命全滿（某一維 S）      → 那一維上限 **100**
//
// 玩家自己訂的第一輪規格是「兩三個 B，或一個 A，其他 CDE」——
// 上限 75 剛好讓四維都摸得到 B 的門檻，而 A 與 S 要靠跨輪買。
//
// **天花板比倍率好，是因為它看得見。** 養成畫面上寫著「上限 75（資質 D）」，
// 玩家一眼就知道那道牆在哪、以及什麼買得動它；
// 而「產量 +15%」要玩三輪才感覺得出來。
//
// 對照七個價格帶（32 §3.1）：D 帶頂 59、C 帶頂 74、B 帶頂 84、A 帶頂 94。
// 每一階資質剛好開一段新的價格帶。
export const aptitudeGrades: readonly AptitudeGradeDef[] = [
  coreDef('aptitudeGrade', 'apt:F', { grade: 'F', shiftSteps: -2, yieldMul: 0.70, attrCap: 59 }),
  coreDef('aptitudeGrade', 'apt:E', { grade: 'E', shiftSteps: -1, yieldMul: 0.85, attrCap: 67 }),
  coreDef('aptitudeGrade', 'apt:D', { grade: 'D', shiftSteps: 0, yieldMul: 1.00, attrCap: 75 }),
  coreDef('aptitudeGrade', 'apt:C', { grade: 'C', shiftSteps: 1, yieldMul: 1.15, attrCap: 82 }),
  coreDef('aptitudeGrade', 'apt:B', { grade: 'B', shiftSteps: 2, yieldMul: 1.30, attrCap: 88 }),
  coreDef('aptitudeGrade', 'apt:A', { grade: 'A', shiftSteps: 3, yieldMul: 1.45, attrCap: 94 }),
  coreDef('aptitudeGrade', 'apt:S', { grade: 'S', shiftSteps: 4, yieldMul: 1.60, attrCap: 100 }),
];

// 累計成本：從 defaultGrade 升到該階要花多少資質點（14 §2.3）。
export const aptitudeCost: AptitudeCostDef = coreDef('aptitudeCost', 'aptCost:main', {
  defaultGrade: 'D',
  cumulativeCost: { F: -2, E: -1, D: 0, C: 2, B: 5, A: 9, S: 14 },
});
