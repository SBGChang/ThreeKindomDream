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
  tierMultiplier: [1.0, 1.5, 2.2, 3.1, 4.2, 5.6, 7.2, 9.1, 11.3, 13.8, 16.6, 19.8],
  // 檢定失敗仍給四成。事情辦砸了，但那一趟還是走過了 ——
  // 一回合只有這一次機會，若失敗＝顆粒無收，玩家永遠只會選最穩的選項。
  failRatio: 0.4,
  /**
   * 稀有度倍率。★4 約為 ★1 的 5.6 倍。
   *
   * ── 為什麼從 2.6 抬到 5.6 ★ ─────────────────
   *
   * 委託改成每格獨立 50% 之後，玩家多了一個取捨：
   * 追驚嘆號（委託【多】）還是追光階（委託【大】）。
   * 舊值下實測的結果是前者壓倒性優勢：
   *
   *   追驚嘆號  委託命中 93.8%、★4 率 12.4%、點數 8256
   *   追光階    委託命中 47.0%、★4 率 22.0%、點數 6984
   *
   * 因為官階倍率（tierMultiplier 1.0 → 19.8）會【複利】：
   * 多一則委託 → 多功績 → 官階高 → 下一則更值錢。
   * 稀有度只能乘一次，而舊值的兩端只差 3.4 倍 ——
   * 提不起兩倍的委託次數差距，於是「追光階」成了純粋的下位選項。
   *
   * 抬到 5.6 之後，一則 ★4 約等於兩則 ★1，兩邊才真的是取捨。
   * 它仍然不至於「一次爆發抵過整章」：一則 ★4 的功績約是一章穩定累積的五分之一。
   */
  rarityMultiplier: [1.0, 1.7, 2.9, 5.6, 9.0],
});
