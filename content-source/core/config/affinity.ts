import type {
  AffinityCurveDef, AffinityStageDef, LinkBonusDef,
} from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

export const affinityStages: readonly AffinityStageDef[] = [
  coreDef('affinityStage', 'stage:stranger', { stage: 'stranger', min: 0, max: 19 }),
  coreDef('affinityStage', 'stage:acquainted', { stage: 'acquainted', min: 20, max: 39 }),
  coreDef('affinityStage', 'stage:friendly', { stage: 'friendly', min: 40, max: 59 }),
  coreDef('affinityStage', 'stage:close', { stage: 'close', min: 60, max: 79 }),
  coreDef('affinityStage', 'stage:sworn', { stage: 'sworn', min: 80, max: 100 }),
];

// GREYBOX：★5 從 0 養到 60 需 Σ costPerPoint[5][0..59]。
// 目前設計成「前 20 點便宜、後段昂貴」，讓第一次遊玩就能把一位名士推到 20 級解鎖條。
const ramp = (base: number): readonly number[] =>
  Array.from({ length: 60 }, (_, i) => Math.round(base * (1 + Math.floor(i / 10) * 0.8)));

export const affinityCurve: AffinityCurveDef = coreDef('affinityCurve', 'affCurve:main', {
  maxStartAffinity: 60,
  costPerPoint: { 1: ramp(2), 2: ramp(3), 3: ramp(5), 4: ramp(8), 5: ramp(12) },
  designationThreshold: 30,
  fragmentsByStage: { stranger: 0, acquainted: 5, friendly: 15, close: 30, sworn: 50 },
  fullDreamMultiplier: 2,
});

// 好感度階段帶來的【額外】加成，與名士基底相加後成為【該名士自己的倍率】。
// 名士之間相乘 —— 全員同格是刻意保留的爆發時刻（19 §5.2）。
//
// 因此這條曲線比加法制時【更平】：它會被指數放大。
//   單人 ★5 專長對位：陌生 ×1.32 → 知交 ×1.50 → 生死之交 ×1.58
//   同格兩人（常見的好格）：約 ×1.5 – ×1.9
//   同格四人（少見）：約 ×2.5 – ×3.3
//   同格六人（極少）：×5 以上，撞 maxSlotMultiplier
//
// stranger 為 0 是刻意的：陌生人的價值就是他本來的才幹，不含交情。
export const linkBonus: LinkBonusDef = coreDef('linkBonus', 'link:main', {
  trainingBonusByStage: { stranger: 0, acquainted: 0.05, friendly: 0.11, close: 0.18, sworn: 0.26 },
  // 大檢定出戰加值（與基底的 sortieBonus 相加）。這裡仍是加法，不會爆。
  checkBonusByStage: { stranger: 0, acquainted: 4, friendly: 9, close: 14, sworn: 20 },
  gainPerTraining: 6,
  // 陣容上限就是 6（玩伴 3 ＋ 上司 3）。設成 6 ＝ 不設限：
  // 「全員擠進同一格」必須真的做得到，否則爆發感只是空話。
  maxPerSlot: 6,
  // ── 同格人數的額外倍率（index ＝ 人數）★ ────────────
  //
  // 純相乘到不了爆發的量級：實測 400 輪，最高只有 ×2.75。
  // 因為每人的加成必須夠小才不會在六人同格時爆炸，而那個顧慮反過來
  // 壓死了三四人同格的爽感。這條曲線把爆發【只放在人多的時候】。
  //
  // 實測的同格人數分佈（每輪）：
  //   0 人 29 次　1 人 36 次　2 人 19 次　3 人 6.1 次　4 人 1.3 次　5 人 0.2 次　6 人 ~0
  // 所以「四人同格」約每輪一次 —— 那是本作的爆發點，曲線在這裡開始陡。
  // 六人同格約每百輪一次，是傳說級的瞬間，交給 maxSlotMultiplier 兜住。
  pileMultiplier: [1, 1, 1.15, 1.4, 1.8, 2.3, 3.0],
  // 安全閥。沒有它，六人同格 × 滿好感會到 ×9 以上，一回合把四維推上限，
  // 爆發反而被四維上限吃掉。
  maxSlotMultiplier: 8,
});
