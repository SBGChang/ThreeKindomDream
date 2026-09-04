import type {
  AttributeCapDef, CheckRuleDef, GameRulesDef,
} from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * 四維上限 ＝ 100（RFC-01 D30）★
 *
 * 實況的規格，而它順帶帶來等級制：`growthRule.bands` 的七個價格帶
 * 與七個等級 G–S 一對一，玩家看到「武 B」就知道下一階要付約 200 點。
 *
 * 舊值 999 的反推依據（「32 回合全押單維 ≈ 880」）連同它一起作廢 ——
 * 鍛鍊產出的已經不是屬性點而是經驗，屬性只能經 ㉜ 買。
 *
 * 名士的能力表也在同一把尺上（0–100）。戰前配置畫面上四個人擺在一起
 * 可以直接比 —— 驗收型的資訊層靠這個成立。
 */
export const attributeCap: AttributeCapDef = coreDef('attributeCap', 'cap:main', {
  attrMax: 100,
});

export const gameRules: GameRulesDef = coreDef('gameRules', 'rules:main', {
  /**
   * 第一輪的官階上限 ＝ **第 5 階**（都尉／功曹）★
   *
   * 十二階裡的第 5 階：帶得動一支兵、進得了幕府，但還不是將軍。
   * 那正是「第一輪你走到哪裡」該有的答案 —— 而它是一道
   * **看得見的牆**：狀態列會寫「都尉（本輪上限）」。
   *
   * 實測第一輪原本爬到 rank 6.2–7.5，而天命商店有 0 個品項碰官階 ——
   * 那條線在第一輪與第五十輪完全一樣。上限訂在這裡、成長賣進商店
   * （`shop:career`），官階才第一次有跨輪的意義。
   */
  careerCapBase: 5,
  companionCount: 3,
  // 可【自行指定】的玩伴人數。0 ＝ 皇甫嵩三名全部替你指派（GDD §6.5）。
  // 「世家門閥」之類的天賦買回來的是選擇權，不是數值 ——
  // 因此這個基準值刻意是 0，而不是「先給一個再讓天賦加」。
  designateBase: 0,
  superiorCount: 3,
  /**
   * 委託旗標的基礎機率（15 §3）★ 每格【獨立】擲，因此四格可能全有。
   *
   * 它不是「每回合的委託數」：玩家只選一格，所以有效觸發率由玩家決定 ——
   *   一路追驚嘆號  1−(1−0.5)^4 ≈ 93.8%
   *   一路追光階    50%
   * 功績收入因此是【玩家可調的旋鈕】而不是系統常數，
   * 校準要抓中間值（約 75%）—— 見 `LOW/MID/HIGH_MERIT` 的反推。
   */
  commissionChance: 0.5,
  /**
   * 人物事件旗標的基礎機率。與委託【互相獨立】，同一格可以兩個都亮。
   *
   * 四項全中（雙驚嘆號 ＋ 金光以上 ＋ 有人站）約 3.1%，
   * 一回合四格至少一格全中約 11.8% —— 一輪 32 回合平均碰到 3.8 次。
   * 稀有到值得記住，又不會整輪遇不到。
   */
  encounterChance: 0.5,
  /**
   * 可攜帶進場的道具格數（23 §5）。
   *
   * 高階道具一輪最多獲得一次，而那一次是「首次獲得」不是重複 ——
   * 因此【不帶就永遠拿不到碎片】。攜帶格的取捨只在高階道具上存在：
   * 低階不必帶，它自己會重複。
   */
  carrySlots: 2,
});

// 比例擺幅：roll 1..100 → 倍率 0.51 .. 1.50。
// 因此 DC 應訂在「該章期望檢定值」的 0.75 / 1.05 / 1.35 倍附近，
// 三檔才會落在有意義的機率區間（見 18 §3）。
export const checkRule: CheckRuleDef = coreDef('checkRule', 'checkRule:main', {
  secondaryWeight: 0.5,
  rollMin: 1,
  rollMax: 100,
  rollCenter: 50,
  rollSpread: 100,
  // 0–100 尺度下的地板（原 25 是 999 尺度的）。它只防退化：
  // 四維全 0 的玩家仍有一點機會，但那個機會小得看得出來。
  baseFloor: 10,
});
