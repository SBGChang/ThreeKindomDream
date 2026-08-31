// 戰役關卡的產生器（33 §6）。
//
// ── 為什麼是產生器而不是逐關手寫 ★ ──────────────────
// 七章 × 三陣營 ＝ 21 場戰役 × 7 關 ＝ 147 關。逐關手寫的話，
// 「越深越險」與「獎勵加速遞增」這兩條會在第三場戰役就開始漂移。
//
// 產生器讓【曲線只有一份】，每場戰役只要填三件事：
//   敵人主題（誰在對面）、關底敵將的位置、獎勵的量級。
//
// ── 敵方曲線 ───────────────────────────────────────
// 兵力加速上升、輸出【慢一階】——理由見 DAMAGE_MUL 的註解。
// 兩者相乘之後，第 7 關的總壓力約是第 1 關的 17 倍，
// 而玩家的軍勢是跨關累積的。這就是「風險是你自己一路打出來的」
// 在數字上的樣子（D10）。
import type { CampaignStageDef, EventReward } from '../../../src/contracts/core/definitions.js';
import type { EnemyId, L10nKey } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';

const TROOPS_MUL = [0.55, 0.75, 1.00, 1.35, 1.80, 2.40, 3.20];
/**
 * 敵方輸出【刻意長得比兵力慢】★ 實測依據
 *
 * 兩條一起加速時，深關會變成【一回合暴斃】：第五關的敵人打 288、
 * 玩家只有 651 兵，兩回合就沒了 —— 而玩家在踏進去之前看起來還很健康。
 * 那不是「你自己一步步走過去」，那正是設計要除掉的隨機暴斃。
 *
 * 輸出長得慢、兵力長得快，深關就變成【長而磨人的仗】：
 * 你看著軍勢一格一格掉，然後自己決定要不要再來一關。那才是這個功能。
 */
const DAMAGE_MUL = [0.60, 0.75, 0.90, 1.05, 1.25, 1.50, 1.80];

/**
 * 獎勵的加速曲線（D12）★
 *
 * 第 7 關約值第 1 關的 **18 倍**，不是 7 倍 ——
 * 誘惑的成長速度要追得上風險的成長速度，否則中段就沒人想留。
 */
const REWARD_MUL = [1.0, 1.6, 2.6, 4.2, 6.8, 11.0, 18.0];

export interface StageSpec {
  /** 該場戰役的文案前綴。第 n 關讀 `campaign.<slug>.stage.<n>`。 */
  readonly slug: string;
  /** 關底敵將。index 0..6，null ＝ 雜兵。內容準則：每三關一位有名有姓的。 */
  readonly bosses: readonly (EnemyId | null)[];
  /** 第 1 關的功績量級。其餘關卡由 REWARD_MUL 推導。 */
  readonly baseMerit: number;
  readonly meritKind: 'civil' | 'martial';
  /**
   * 深處的唯一掉落（D12）★
   *
   * 純數量的獎勵會讓玩家算出「我需要 X 功績」然後在剛好夠的那一關收手 ——
   * 貪心又變成查表。**某些東西只存在於深處**，「夠了就停」才不成立。
   */
  readonly deepUnlocks: readonly (EventReward | null)[];
}

export function buildStages(spec: StageSpec): readonly CampaignStageDef[] {
  return TROOPS_MUL.map((troopsMul, i) => {
    const merit: EventReward = {
      kind: 'merit',
      merit: spec.meritKind,
      amount: Math.round(spec.baseMerit * (REWARD_MUL[i] ?? 1)),
    };
    const extra = spec.deepUnlocks[i] ?? null;
    return {
      briefKey: asKey(`campaign.${spec.slug}.stage.${i}`) as L10nKey,
      troopsMul,
      damageMul: DAMAGE_MUL[i] ?? 1,
      boss: spec.bosses[i] ?? null,
      rewards: extra === null ? [merit] : [merit, extra],
    };
  });
}
