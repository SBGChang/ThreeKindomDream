import type { NotableBaseDef } from '../../../src/contracts/core/definitions.js';
import type { Attr, Rarity } from '../../../src/contracts/core/primitives.js';

/**
 * 名士基底的稀有度基準（GREYBOX）。
 *
 * 「基底」是名士從進入陣容第一回合就生效的加成，不需要好感度。
 * 沒有它的話開局 ★5 與 ★1 站在格子上數值完全相同，「這格有誰站著」不構成資訊。
 *
 * ── 反推 ──────────────────────────────────────────
 * 名士【之間相乘】（19 §5.2），所以每個人的加成必須夠小，
 * 疊起來才落在設計的區間裡而不是指數爆炸：
 *
 *   空格                        ×1.00
 *   ★1 非專長・陌生             ×1.04
 *   ★5 專長對位・陌生           ×1.32   ← 開局就看得出差別，這是本表的目的
 *   ★5 專長對位・生死之交       ×1.58
 *   同格兩人（常見的好格）       ×1.5 – ×1.9
 *   同格四人（少見）            ×2.5 – ×3.3
 *   同格六人（極少）            ×5 以上，撞 linkBonus.maxSlotMultiplier
 *
 * `specialtyWeight` 是站位【權重】不是限制：專長格更常有人，但任何名士仍可能
 * 站到任何一格。做成硬性限制，「紅光但沒人站 vs 無光但全員站著」的糾結會消失。
 * 同專長的人會傾向擠在同一格 —— 這是刻意的，它讓爆發時刻更常發生。
 */
const BY_RARITY: Readonly<Record<Rarity, Omit<NotableBaseDef, 'specialty'>>> = {
  1: { trainingBonus: 0.04, specialtyBonus: 0.05, specialtyWeight: 1.4, sortieBonus: 1 },
  2: { trainingBonus: 0.06, specialtyBonus: 0.07, specialtyWeight: 1.6, sortieBonus: 2 },
  3: { trainingBonus: 0.08, specialtyBonus: 0.10, specialtyWeight: 1.8, sortieBonus: 3 },
  4: { trainingBonus: 0.11, specialtyBonus: 0.14, specialtyWeight: 2.0, sortieBonus: 5 },
  5: { trainingBonus: 0.14, specialtyBonus: 0.18, specialtyWeight: 2.2, sortieBonus: 8 },
};

/**
 * 依稀有度取基底，`tweak` 用來寫出角色的性格。
 *
 * 偏離基準【必須寫理由】—— 否則這張表會被逐人微調淹沒，
 * 稀有度就不再是可預期的承諾，玩家也讀不出 ★5 到底代表什麼。
 */
export const notableBase = (
  rarity: Rarity, specialty: Attr, tweak: Partial<Omit<NotableBaseDef, 'specialty'>> = {},
): NotableBaseDef => ({ specialty, ...BY_RARITY[rarity], ...tweak });
