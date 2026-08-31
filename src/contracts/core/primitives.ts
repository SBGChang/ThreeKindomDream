// 結構性不變量（ARCHITECTURE §2.1）。數值一律在 data，這裡只有結構。

/**
 * 四維。統與武歸武功、智與政歸文功 —— 但那張對照表是【資料】（`attrLine`），
 * 不寫在這裡：哪一維算哪條官階是平衡與世界觀的決定，不是結構。
 *
 * 順序即固定事件在畫面上的排列順序。只有一份 —— 舊版另有一個 ATTR_ORDER
 * 副本，那是第二個真相來源。
 */
export type Attr = 'lead' | 'war' | 'int' | 'pol';
export const ATTRS: readonly Attr[] = ['lead', 'war', 'int', 'pol'];

export type GlowTier = 'none' | 'silver' | 'gold' | 'red';
export const GLOW_TIERS: readonly GlowTier[] = ['none', 'silver', 'gold', 'red'];

/**
 * 四維的等級（32 §3.1）。**七個價格帶對齊七個等級** ——
 * 玩家看到「武 B」就知道下一階要付多少，不需要另外解釋成本曲線。
 *
 * 與 `AptitudeGrade` 不是同一把尺：資質是入夢前買的天生偏向（F–S，七階），
 * 這裡是局內練出來的實力（G–S，八階，G ＝ 尚未開始）。
 */
export type AttrGrade = 'G' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const ATTR_GRADES: readonly AttrGrade[] =
  ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S'];

/**
 * 特質與技能的三階（23 §2）。階決定混合消耗的【類數】——
 * 常 1 類、良 2 類、絕 3 類，由載入期驗證強制。
 *
 * 這條就是「純專精買不起絕階」的機制本體：他沒有另外兩類的經驗。
 */
export type AbilityTier = 'common' | 'fine' | 'peerless';
export const ABILITY_TIERS: readonly AbilityTier[] = ['common', 'fine', 'peerless'];
/** 階 → 混合消耗的類數。驗證用；不是可調數值，是 §4.1 的機制定義。 */
export const TIER_COST_KINDS: Readonly<Record<AbilityTier, number>> = {
  common: 1, fine: 2, peerless: 3,
};

/** 戰役中一次施放的種類（33 §5.2）。 */
export type SkillKind = 'physical' | 'magic' | 'heal' | 'buff' | 'debuff';
export const SKILL_KINDS: readonly SkillKind[] =
  ['physical', 'magic', 'heal', 'buff', 'debuff'];

export type AptitudeGrade = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const APTITUDE_GRADES: readonly AptitudeGrade[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

export type Difficulty = 'safe' | 'normal' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['safe', 'normal', 'hard'];

/**
 * 局內的兩個階段。決定四維的換皮名稱（GDD §5.1）。
 *
 *   camp     皇甫嵩帳下平黃巾的新兵。還沒有陣營。
 *   faction  投入諸侯之後的仕途。
 *
 * 舊名是 'nanhua'（南華村）—— 開場改成軍中之後那個名字連同「南華村篇」
 * 這個畫面字樣一起退場。南華老仙只留在【輪迴的框架】上，不再是一個地方。
 */
export type Phase = 'camp' | 'faction';
export const PHASES: readonly Phase[] = ['camp', 'faction'];

export type MeritKind = 'civil' | 'martial';
export const MERIT_KINDS: readonly MeritKind[] = ['civil', 'martial'];

export type CareerLine = 'civil' | 'martial';
export const CAREER_LINES: readonly CareerLine[] = ['civil', 'martial'];

/**
 * 大檢定的一個選項＝【路線 × 難度】。文武各三檔，合計六個（18 §2）。
 *
 * 路線沿用 CareerLine 而不新增列舉：走武路憑的就是武功那一條官階。
 * 若讓兩者各自獨立變化，「文武雙軌」就會有兩份可能互相矛盾的真相。
 */
export interface CheckChoice {
  readonly line: CareerLine;
  readonly difficulty: Difficulty;
}

/** 六個選項的正規列舉順序。UI 與模擬器共用同一份，否則兩邊的「第一個」會不一樣。 */
export const CHECK_CHOICES: readonly CheckChoice[] = CAREER_LINES
  .flatMap((line) => DIFFICULTIES.map((difficulty) => ({ line, difficulty })));

/**
 * 事件的兩種來源（17 §1）。玩家不選事件 —— 事件是【選了固定事件之後發生的事】。
 *   commission ＝ 固定事件引發的立功機會。由所選維度定位池，光階定位稀有度。
 *   notable    ＝ 人物事件。獨立的第三拍，與委託沒有從屬關係（19 §6）。
 */
export type EventKind = 'commission' | 'notable';
export const EVENT_KINDS: readonly EventKind[] = ['commission', 'notable'];

export type AffinityStage = 'stranger' | 'acquainted' | 'friendly' | 'close' | 'sworn';
export const AFFINITY_STAGES: readonly AffinityStage[] =
  ['stranger', 'acquainted', 'friendly', 'close', 'sworn'];

export type SlotIndex = 0 | 1 | 2 | 3;
export const SLOT_INDICES: readonly SlotIndex[] = [0, 1, 2, 3];

/**
 * 稀有度。名士與委託共用同一把尺 —— ★3 的委託與 ★3 的名士是同一個量級的東西。
 *
 * 委託實際用到哪幾階由 `glowTierDef.rarityWeights` 決定，不在這裡寫死：
 * 「灰盒只用到 ★4」是內容進度，不是結構。
 */
/**
 * 選項的檔次（17 §5）。
 *
 * 委託是一條【費力程度】的階梯，恰好三檔，每檔各一個選項：
 *   low   交差了事：無門檻、最容易、拿得最少
 *   mid   照規矩辦：無門檻、正攻法
 *   high  做到底  ：有官階門檻、最難、拿得最多
 *
 * 名士事件不是階梯而是【性格分歧】—— 兩個選項沒有高下，只有不同。
 * 硬塞進 low/mid/high 會讓畫面標出不存在的難度差，因此另立 `story`。
 *
 * 做成列舉而不是「靠作者把選項排好」——
 * 有了它，載入期驗證才能真的擋住「三個選項其實一樣好」。
 */
export type OptionTier = 'low' | 'mid' | 'high' | 'story';
/** 委託階梯的三檔。`story` 不在其中 —— 它不參與遞增檢查。 */
export const OPTION_TIERS: readonly OptionTier[] = ['low', 'mid', 'high'];

export type Rarity = 1 | 2 | 3 | 4 | 5;
export const RARITIES: readonly Rarity[] = [1, 2, 3, 4, 5];

/**
 * 可作為門檻的數值路徑。
 *
 * 善惡名已移除 —— 它是舊 `FameKind` 的第三種，隨名聲一起退場（20 §1.2）。
 * 於是所有門檻貨幣都非負、都能換官階，`StatPath` 也回到單一形狀。
 */
export type StatPath =
  | `attr.${Attr}`
  | `merit.${MeritKind}`
  | `career.${CareerLine}`
  /**
   * 陣容中好感度【已達】該階段的人數（19 §5.4）。
   *
   * 做成 StatPath 而不是新的 Condition：條件求值只吃 `StatReader`，
   * 而 roster 有擁有者。走這條路，讀取仍然經過 ⑲ 的 Query，
   * 條件那一側則完全不必知道 roster 長什麼樣子。
   */
  | `roster.${AffinityStage}`
  /**
   * 某位名士的局內好感值。`affinity.<notableId>`。
   *
   * 人物委託的門檻走它 —— 於是「荀彧好感 ≥ 40 才進委託池」寫成一條
   * 普通的 `statGte`，不必為它新開一種 Condition。名士不在陣容時為 0，
   * 因此「他不在」與「他好感不夠」是同一件事：都進不了池。
   */
  | `affinity.${string}`;

export type RngStream =
  | 'glow.base'
  | 'glow.upgrade'
  | 'notable.slot'
  | 'notable.roster'
  | 'event.rarity'
  | 'event.draw'
  | 'event.params'
  | 'event.notable'
  | 'check.roll'
  /**
   * 兩段抽取的第一段：回合開始時逐格擲「會不會有委託／人物事件」（15 §3）。
   *
   * 與 `event.draw` 分流是必須的 —— 旗標在【選格子之前】就擲完四次，
   * 內容則在選定之後才擲。共用一條流的話，玩家選哪一格會改變後續的
   * 擲骰序，重播就對不上。
   */
  | 'slot.flag'
  | 'item.drop'
  // ── 戰役（33 §9）★ ────────────────────────────────
  // 四條分流，順序固定為 33 §4 的四步。合流的話「這回合主角放了幾招」
  // 會改變指揮的擲骰序，重播就對不上。
  | 'battle.cast'        // 主角施放次數（每回合兩擲）
  | 'battle.pick'        // 從三招中不重複抽取
  | 'battle.command'     // 每位指揮各一擲
  | 'battle.enemy'       // 敵方行動
  | 'battle.drop';       // 關卡獎勵掉落

export const RNG_STREAMS: readonly RngStream[] = [
  'glow.base', 'glow.upgrade', 'notable.slot', 'notable.roster',
  'event.rarity', 'event.draw', 'event.params', 'event.notable',
  'check.roll', 'slot.flag', 'item.drop',
  'battle.cast', 'battle.pick', 'battle.command', 'battle.enemy', 'battle.drop',
];

export type RngCursors = Readonly<Record<RngStream, number>>;
export interface Weighted<T> { readonly item: T; readonly weight: number }
