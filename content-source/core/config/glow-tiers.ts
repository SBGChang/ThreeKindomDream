import type { GlowTierDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// ── yieldMul 已縮小（原 1.0/1.6/2.5/4.0，期望 1.57）★ ────
//
// 光階現在有兩個作用，四維倍率只是其中一個；權重轉移到 rarityWeights。
// 若兩邊都給滿，光階就成了整局唯一的支配變數 —— 一個訊號同時決定
// 四維、委託大小、功績、官階，那條鏈上的其他決定都會被它蓋掉。
//
// 新期望倍率 = 0.45×1.0 + 0.35×1.3 + 0.16×1.7 + 0.04×2.2 = 1.265
// 擺幅從 1.0–4.0 收到 1.0–2.2：無光回合不再是報廢，紅光回合的價值
// 有一半改由「跟著來的委託更大」兌現。
//
// ── rarityWeights：光階的第二個作用（17 §2.2）★ ────────
//
// 光階同時決定「跟著來的委託有多大」。同一個【選之前就看得見】的訊號
// 餵兩個報酬，於是紅光那一格意味著數字大【而且】機會大。
//
// index ＝ rarity − 1。灰盒只用到 ★1–★4（對齊四個光階），第五格保留給
// 未來的傳說級委託 —— 權重為 0 代表「抽不到」，驗證也就不要求它有內容。
//
// 曲線刻意【重疊】而不是一階對一階：無光偶爾也能撞到 ★2，紅光多數時候是
// ★3–★4 但偶爾只有 ★2。硬對應會讓委託變成光階的複讀，看一眼就知道結果，
// 「選完揭曉」那一下就沒有懸念了。
export const glowTiers: readonly GlowTierDef[] = [
  coreDef('glowTier', 'glow:none', {
    tier: 'none', order: 0, yieldMul: 1.0, baseWeight: 45,
    rarityWeights: [72, 25, 3, 0, 0],
  }),
  coreDef('glowTier', 'glow:silver', {
    tier: 'silver', order: 1, yieldMul: 1.3, baseWeight: 35,
    rarityWeights: [30, 48, 20, 2, 0],
  }),
  coreDef('glowTier', 'glow:gold', {
    tier: 'gold', order: 2, yieldMul: 1.7, baseWeight: 16,
    rarityWeights: [6, 28, 50, 16, 0],
  }),
  coreDef('glowTier', 'glow:red', {
    tier: 'red', order: 3, yieldMul: 2.2, baseWeight: 4,
    rarityWeights: [0, 8, 37, 55, 0],
  }),
];
