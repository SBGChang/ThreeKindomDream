import type {
  AttributeCapDef, CheckRuleDef, GameRulesDef,
} from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// GREYBOX：四維上限 999（ARCHITECTURE §9-1 標記為最優先待補數值）。
// 反推依據：32 回合全押單維 ≈ 880，因此 999 讓專精流不會撞頂而失去意義。
export const attributeCap: AttributeCapDef = coreDef('attributeCap', 'cap:main', {
  attrMax: 999,
});

export const gameRules: GameRulesDef = coreDef('gameRules', 'rules:main', {
  maxSortie: 3,
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
  baseFloor: 25,
});
