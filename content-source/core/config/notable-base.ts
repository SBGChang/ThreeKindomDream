import type { NotableBaseDef } from '../../../src/contracts/core/definitions.js';
import type { Attr, Rarity } from '../../../src/contracts/core/primitives.js';

/**
 * 名士的【結構性】資料 —— 不是加成（19 §5.1）★
 *
 * 站位加成不在這裡。它全部走 `unlocks` 的 `LinkBonus`（含 0 星那條通用的
 * 「所有同框 +10%」），因為那樣才會【一律吃好感 60 的門檻】。
 *
 * 舊版有一個 `trainingBonus` 欄位直接繞過門檻：同一位名士在好感 0 時
 * 站上去照樣給加成，與「跨過之前回報是零」的規則互相矛盾 ——
 * 而那個矛盾不會讓任何測試失敗。移除它是這次改動的一部分。
 *
 * 剩下的三個欄位都不是加成：
 *   specialty       他屬於哪一維。站位分配與「某類名士」的指涉都靠它
 *   specialtyWeight 專長格的站位【權重】倍率（機率，不是收益）
 *   sortieBonus     大檢定出戰的基底加值（那是另一套系統）
 *
 * ── specialtyWeight 一律是 1 ★ ────────────────────────
 *
 * 四格的基礎權重相同（`linkBonus.slotBaseWeight` ＝ 10），
 * 偏好完全由 `SlotBias` 解鎖條疊上去 —— 於是「統系名士更常站統御格」
 * 是星階或道具【買來的】，不是與生俱來的。
 *
 * 這張表因此只剩 `sortieBonus` 隨稀有度變化：主公親自上陣是大事。
 */
const BY_RARITY: Readonly<Record<Rarity, Omit<NotableBaseDef, 'specialty'>>> = {
  1: { specialtyWeight: 1, sortieBonus: 1 },
  2: { specialtyWeight: 1, sortieBonus: 2 },
  3: { specialtyWeight: 1, sortieBonus: 3 },
  4: { specialtyWeight: 1, sortieBonus: 5 },
  5: { specialtyWeight: 1, sortieBonus: 8 },
};

/**
 * 依稀有度取結構欄位，`tweak` 用來寫出角色的性格。
 *
 * 偏離基準【必須寫理由】—— 否則這張表會被逐人微調淹沒。
 */
export const notableBase = (
  rarity: Rarity, specialty: Attr, tweak: Partial<Omit<NotableBaseDef, 'specialty'>> = {},
): NotableBaseDef => ({ specialty, ...BY_RARITY[rarity], ...tweak });
