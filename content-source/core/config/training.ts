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

// meritByAttr：固定事件自己的功績（16 §4.2）★ 已從 6 壓到 3
//
// 四章的功績帳（單線專精，實測反推）：
//   固定事件 149 ／ 委託 480 ／ 人物事件 255 ／ 戰役 575  ≈ 1459
// 對照十二階的 2960，四章走完落在 rank 8–9 —— 後五章還有頭上空間。
//
// 固定事件約佔一成：它是【玩家對官途的主導權】（選武統就是在爬武功），
// 不是主要來源。委託與戰役才是 —— 兩者都要你把事情做成。
export const trainingCurve: TrainingCurveDef = coreDef('trainingCurve', 'curve:training', {
  baseByAttr: { lead: 10, war: 10, int: 10, pol: 10 },
  meritByAttr: { lead: 3, war: 3, int: 3, pol: 3 },
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
//   固定事件 經驗 = (10 ＋ 官階) × 章節倍率 × 光階 × 名士倍率
//   委託     經驗 = 20 × 星數 × 磨練權重
//   委託     功績 = 3／10／18 × 官階倍率 × 稀有度倍率
//
// ── 兩種貨幣，兩個索引，不重疊 ★ ────────────────────
//   經驗 只吃【稀有度】—— 事情本身有多大
//   功績 只吃【官階】  —— 你的身分有多重
//
// 舊制兩者都吃兩條鏈（相乘 178 倍），於是同一個決定同時放大兩種貨幣，
// 「追光階 對 追驚嘆號」讀不出差別（實測只差 5.2%）。分開之後那個取捨
// 才有內容：**光階買經驗，委託旗標買功績。**
//
// 固定事件跟著【章節】長（世界變大了），委託跟著【官階】長 ——
// 因此後期轉換道路時，新那條線的委託會回到低階難度，你接得住。
export const eventYieldCurve: EventYieldCurveDef = coreDef('eventYieldCurve', 'curve:eventYield', {
  // 20 × 星數 × Σweight。中檔 Σ1.5 → 一則 ★N 委託給 30N 經驗，
  // 那正好是【N 個基礎事件】（一關戰役的單位也是 30，見 campaigns/build.ts）。
  baseByAttr: { lead: 20, war: 20, int: 20, pol: 20 },
  /**
   * 功績的官階倍率 ★ **已從 →12.5 壓到 →7.6**
   *
   * 索引是【官階階級】，與 DC 曲線共用 —— 難度與報酬必須一起長，
   * 否則壓低某一線的官階會變成刷簡單高報酬的農場（17 §6.4）。
   *
   * ── 為什麼再壓一次 ★ 實測依據 ────────────────────
   * 壓到 12.5 之後【還是爆】：一則 ★5 人物事件在 rank 12 給 1680 功績，
   * 而 rank 11→12 只要 1330 —— **一則事件跳一階**。
   * 四章走完實測 武功 12496，是十二階梯總量 6405 的兩倍。
   *
   * 病根有兩層，這一版兩層一起改：
   *   一 · 倍率鏈太長（本表 × rarityMultiplier）→ 兩條都壓
   *   二 · 階梯訂太高（6405）→ 為了讓人爬得到，收入被迫吹大
   *
   * 新的節奏（對照 career/ranks.ts 的新階梯）：**一階約六到八則委託**，
   * 而且【越高越慢】—— 頂階 600 對每則 77，比一階的 60 對 11.5 慢一截。
   */
  tierMultiplier: [1.0, 1.3, 1.7, 2.1, 2.6, 3.1, 3.7, 4.3, 5.0, 5.8, 6.7, 7.6],
  /**
   * 檢定失敗 ＝ **顆粒無收** ★ 已從 0.4 改為 0
   *
   * 舊註解的理由是「若失敗＝顆粒無收，玩家永遠只會選最穩的選項」。
   * 實測反過來：**0.4 之下玩家永遠只會選最兇的那個。**
   *
   * rank 8、★2 的三檔功績（成功／失敗）：
   *   低  15 ／ 15    期望 15
   *   中  49 ／ 20    期望 35
   *   高  89 ／ 36    期望 49   ← 失敗的 36 還比低檔成功的 15 多兩倍
   *
   * 高檔【怎麼算都贏】，於是三檔又退化成一檔。改成 0 之後：
   *   低 15 ／ 中 25 ／ 高 22 —— **順序由你的四維決定**，
   *   四維夠高高檔才划算，不夠就該退回中檔。那才是一個決定。
   *
   * 代價：一回合只有這一次機會，所以高檔真的會空手。那是它的定價。
   */
  failRatio: 0,
  /**
   * 稀有度對【功績】的倍率 ★ **已從 2.8 壓到 1.7**
   *
   * 稀有度的主業改成【經驗】（見下），所以它對功績只留一點傾斜 ——
   * 兩條倍率相乘的上限從 35 倍降到 12.9 倍。
   *
   * 留一點而非拿掉：★5 委託仍該比 ★1 值錢，否則紅光只是不同的文字。
   */
  rarityMultiplier: [1.0, 1.15, 1.3, 1.5, 1.7],
  /**
   * 稀有度對【經驗】的倍率 ＝ **星數本身** ★ 玩家訂的規矩
   *
   *   「經驗值總值大概是基礎事件值 × 星數」
   *
   * 所以這張表就是 `[1,2,3,4,5]`，沒有第二個乘數 ——
   * 中檔 ★N 委託給 30N 經驗，一眼讀得出來是幾個基礎事件。
   *
   * 官階項（舊 `practiceTierMul`）已刪除：經驗的官階成長由鍛鍊
   * （`trainingCurve`）與戰役深度承擔，事件不必再疊一層看不見的乘數。
   */
  practiceRarityMul: [1, 2, 3, 4, 5],
});
