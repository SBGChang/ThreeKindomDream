import type {
  AttrLineDef, EventYieldCurveDef, TrainingActionDef, TrainingCurveDef,
} from '../../../src/contracts/core/definitions.js';
import type { Attr, Phase } from '../../../src/contracts/core/primitives.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

// 四維 × 兩階段 = 8 筆。缺一筆就有格子生不出來（驗證會擋）。
const action = (attr: Attr, phase: Phase) =>
  coreDef('trainingAction', `train:${phase}.${attr}`, {
    attr, phase, labelKey: k(`attr.${attr}.${phase}.label`),
    subtitleKeys: [
      k(`attr.${attr}.${phase}.sub.0`),
      k(`attr.${attr}.${phase}.sub.1`),
      k(`attr.${attr}.${phase}.sub.2`),
    ],
  });

export const trainingActions: readonly TrainingActionDef[] = [
  action('lead', 'camp'), action('war', 'camp'),
  action('int', 'camp'), action('pol', 'camp'),
  action('lead', 'faction'), action('war', 'faction'),
  action('int', 'faction'), action('pol', 'faction'),
];

/**
 * 四維 → 官階線（20 §1.3）。
 *
 * 統與武是帶兵打仗的本事，算武功；智與政是案牘廟堂的本事，算文功。
 * 因此「這一回合投哪一格」同時就是「我在爬哪一條官階」——
 * 那是玩家對自己官途的主導權，不能只由抽出來的委託決定。
 */
export const attrLine: AttrLineDef = coreDef('attrLine', 'attrLine:main', {
  byAttr: { lead: 'martial', war: 'martial', int: 'civil', pol: 'civil' },
});

// GREYBOX：32 回合、平均 8 次/維、期望光階 1.57 倍
//   → 單維總量 ≈ 8 × 10 × 1.57 × chapterMul 平均 1.9 ≈ 240
// 四維上限暫定 999（ARCHITECTURE §9-1 待補）。
//
// meritByAttr：固定事件自己的功績（16 §4.2）。
//   對照委託的 22–26（★1，再乘稀有度倍率），固定事件的 6 約是三成 ——
//   委託仍是主要來源，但玩家每一回合都在為自己選定的那條官階添磚。
export const trainingCurve: TrainingCurveDef = coreDef('trainingCurve', 'curve:training', {
  baseByAttr: { lead: 10, war: 10, int: 10, pol: 10 },
  meritByAttr: { lead: 6, war: 6, int: 6, pol: 6 },
  chapterMultiplier: [1.0, 1.3, 1.7, 2.2, 2.8, 3.5, 4.3, 5.2, 6.2],
  upgradeBaseChance: 0.15,
  shiftStepRatio: 0.18,
  // 另一條官階線對 base 的貢獻比例（16 §4.3）★
  //
  // 純本行的話，武官八階想轉練文政時 base 只有 10（新兵水準），
  // 而武統是 10＋rank8 —— 實測「後期幾乎不可能換路」。
  // 0.5 讓另一線的官階算一半：你已經是個大官了，學什麼都比新兵快，
  // 只是本行更快。武8/文1 時 文base 13.5 對 武base 17，比值 0.79（原 0.45）。
  crossLineRatio: 0.5,
});

// ── 固定事件 vs 委託（GDD §4.2）─────────────────────
//
// 兩者【不再互斥】：一個回合先做固定事件，再處理它引出的委託。
// 因此這兩張表的比值不再是「上課 vs 工作」的取捨，而是
// 【一個回合的收益裡有多少來自你選的格子、多少來自運氣】：
//
//   固定事件 = (10 ＋ 官階) × 章節倍率 × 光階 × 名士倍率   會爆發
//   委託     = 4 × 官階倍率 × 稀有度倍率 × 磨練權重        穩定但小，外加功績
//
// 兩邊【用不同的索引縮放】是刻意的：固定事件跟著章節長（世界變大了），
// 委託跟著你在那條線的官階長（朝廷按身分派事）。因此後期轉換道路時，
// 新那條線的委託會回到低階難度，你接得住。
//
// 委託的四維產出刻意小於固定事件：它是附帶的，不該取代玩家的選擇。
// 但它的【功績】是主要來源 —— 兩邊各自主導一種貨幣，才不會有一邊變成裝飾。
export const eventYieldCurve: EventYieldCurveDef = coreDef('eventYieldCurve', 'curve:eventYield', {
  baseByAttr: { lead: 4, war: 4, int: 4, pol: 4 },
  // 索引是【官階階級】不是章節（17 §6.4）★ 與 DC 曲線共用同一個索引 ——
  // 難度與報酬必須一起長，否則壓低某一線的官階會變成刷簡單高報酬的農場。
  //
  // 反推：rank 8→9 需 770 功績；該階一則委託的中檔約 20×9.1×稀有度 1.5 ≈ 273，
  // 因此約三則委託升一階，與「一章八回合」的節奏對得上。
  tierMultiplier: [1.0, 1.4, 1.9, 2.5, 3.2, 4.1, 5.1, 6.3, 7.6, 9.1, 10.7, 12.5],
  // 檢定失敗仍給四成。事情辦砸了，但那一趟還是走過了 ——
  // 一回合只有這一次機會，若失敗＝顆粒無收，玩家永遠只會選最穩的選項。
  failRatio: 0.4,
  /**
   * 稀有度倍率 ★ **已從 9.0 壓回 2.8** —— 兩條倍率不能都很陡
   *
   * 功績同時吃 `tierMultiplier` 與這一條。舊值（19.8 × 9.0）相乘到
   * **178 倍**，於是實測出現「一則 ★4 事件 武功+796」——
   * 官階十二階的門檻總共只要 6405，一則事件就給掉八分之一。
   *
   * 那不只是數字難看：它讓【複利】失控。功績 → 官階 → 事件更值錢
   * → 更多功績，而官階同時決定敵人多強（D25），所以整條線一起飛。
   * 實測四章走完 武功 12217，是十二階上限的兩倍。
   *
   * 兩條各自壓過之後上限 12.5 × 2.8 ≈ 35 倍：
   * 一則 ★4 中檔在 rank 7 約 350，典型的 ★2 約 130 ——
   * 對照 6405 的階梯，那是「幾十則事件爬完一條官途」的量級。
   *
   * ⚠️ 舊註解記著「抬到 5.6 是為了讓追光階與追驚嘆號成為取捨」。
   * 那個實測是戰役制之前做的，而稀有度現在還驅動道具掉落與磨練
   * （`practiceRarityMul`）。壓回去之後要重跑
   * `rarity-chaser` 對 `flag-chaser`，確認兩邊仍是取捨。
   */
  rarityMultiplier: [1.0, 1.3, 1.7, 2.2, 2.8],
  /**
   * 經驗的兩條曲線 —— 【刻意比功績那兩條平緩一個數量級】★
   *
   * 反推：一則事件的磨練應該落在【一次鍛鍊的三成上下】。
   * 鍛鍊一回合約 13（第 1 章）到 29（第 4 章），所以事件要在 4–10 之間。
   *
   *   baseByAttr 4 × practiceTierMul(→2.65) × practiceRarityMul(→2.4) ≈ 25
   *
   * 再乘上 practice 的權重（總和約 0.35–0.5）→ 一則 ★4 名士事件約 9–12。
   *
   * 舊值吃的是功績那兩條（19.8 × 9.0 = 178 倍），於是實測出現
   * 「一則事件 磨練 武+97」—— 那是一整個等級，在玩家還沒做任何選擇之前。
   */
  practiceTierMul: [
    1.0, 1.15, 1.3, 1.45, 1.6, 1.75, 1.9, 2.05, 2.2, 2.35, 2.5, 2.65,
  ],
  practiceRarityMul: [1.0, 1.2, 1.5, 1.9, 2.4],
});
