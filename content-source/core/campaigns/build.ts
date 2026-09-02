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
import type { Attr } from '../../../src/contracts/core/primitives.js';
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
const DAMAGE_MUL = [0.55, 0.62, 0.70, 0.78, 0.88, 1.00, 1.15];

/**
 * 獎勵的加速曲線（D12）★★ 這是全檔最關鍵的一組數字
 *
 * 第 7 關值第 1 關的 **45 倍**。前四關加起來 12 個單位，後三關 78 個 ——
 * **一場戰役的價值有八成六在第五關之後。**
 *
 * ── 為什麼要這麼陡 ★ 實測依據 ──────────────────────
 * 這條曲線要對抗的東西是【死掉損失的是剩下所有章節】。
 *
 * 18 倍時實測：risk-seeking（算得剛剛好就上、陣亡 45%）只拿到
 * risk-averse（要 1.5 倍餘裕）的 66% 點數 —— 也就是【貪心是純劣】。
 * 那讓整個 push-your-luck 失去意義：每關都可以走，但沒有人有理由留。
 *
 * 期望值要平手，深入的人在【活下來的那一半】必須拿到約兩倍。
 * 前四關 → 前六關若只從 9.4 漲到 27（18 倍曲線），差距只有 2.9 倍，
 * 而那 2.9 倍還要再乘上「多打兩關的機會成本」。45 倍曲線把它拉到 7 倍。
 *
 * ── 這條曲線同時是 D13 的複利來源 ──────────────────
 * 功績 → 官階 → 兵量與糧量。打得深的人下一章的軍隊【明顯更大】，
 * 於是「早期的貪心」會滾到最後一章 —— 那正是 D13 要的高槓桿。
 */
const REWARD_MUL = [1.0, 1.8, 3.2, 6.0, 11.0, 22.0, 45.0];

/**
 * 一關給的經驗 ＝ **關數 × 這個單位**（第 1 關 30、第 7 關 210，累計 840）★
 *
 * ── 為什麼用「幾個基礎單位」而不是一條倍率 ───────────
 * 線性、數字圓、而且【深度是唯一的變數】—— 不看章節。
 * 於是兩種獎勵各說一件事：
 *
 *   經驗  只看你打了多深    「這一仗你自己練到了多少」
 *   功績  看章節 × 深度      「這一仗有多重要」
 *
 * 對照一次鍛鍊約 13（第 1 章）到 29（第 4 章），
 * **一關 ≈ 一次半的鍛鍊**，打滿七關 ≈ 四十二回合的訓練量。
 */
const STAGE_EXP_UNIT = 30;

export interface StageSpec {
  /** 該場戰役的文案前綴。第 n 關讀 `campaign.<slug>.stage.<n>`。 */
  readonly slug: string;
  /** 關底敵將。index 0..6，null ＝ 雜兵。內容準則：每三關一位有名有姓的。 */
  readonly bosses: readonly (EnemyId | null)[];
  /** 第 1 關的功績量級。其餘關卡由 REWARD_MUL 推導。 */
  readonly baseMerit: number;
  readonly meritKind: 'civil' | 'martial';
  /**
   * 經驗分給哪幾維 ★ **打仗長的是帶兵的本事。**
   *
   * 一場武系戰役給的是武與統的經驗 —— 文系玩家照樣拿得到，
   * 只是拿到的不是他主練的那一維，而那正是
   * 「這一場對我值不值得深入」的一部分。
   *
   * 量由 `STAGE_EXP_UNIT × 關數` 決定，不逐場設定 ——
   * 經驗只看深度，不看章節（見 STAGE_EXP_UNIT）。
   */
  readonly expAttrs: readonly Attr[];
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
    // 第 N 關給 N × 30 經驗，平分給該線的兩維。
    const stageExp = STAGE_EXP_UNIT * (i + 1);
    const exp: readonly EventReward[] = spec.expAttrs.map((attr) => ({
      kind: 'exp' as const,
      attr,
      amount: Math.round(stageExp / spec.expAttrs.length),
    }));
    const extra = spec.deepUnlocks[i] ?? null;
    return {
      briefKey: asKey(`campaign.${spec.slug}.stage.${i}`) as L10nKey,
      troopsMul,
      damageMul: DAMAGE_MUL[i] ?? 1,
      boss: spec.bosses[i] ?? null,
      rewards: extra === null ? [merit, ...exp] : [merit, ...exp, extra],
    };
  });
}
