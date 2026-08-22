import type {
  ChapterId, DcCurveId, EndingId, EventDefId, FactionId, L10nKey,
  MajorCheckId, NotableId, NotablePoolId, PackId, ParamPoolId, ShopItemId, TalentId,
} from './ids.js';
import type {
  AffinityStage, AptitudeGrade, Attr, CareerLine, CommissionKind, Difficulty,
  EventKind, FameKind, GlowTier, MeritKind, MoralBand, Phase, Rarity,
} from './primitives.js';
import type { Condition, EffectRef } from './effects.js';

export type DefinitionKind =
  | 'glowTier' | 'aptitudeGrade' | 'trainingAction' | 'trainingCurve'
  | 'eventYieldCurve'
  | 'affinityStage' | 'affinityCurve' | 'linkBonus' | 'attributeCap'
  | 'notable' | 'notablePool' | 'talent' | 'aptitudeCost'
  | 'event' | 'paramPool' | 'dcCurve' | 'checkRule'
  | 'chapter' | 'chapterSequence' | 'majorCheck'
  | 'careerRank' | 'careerInit' | 'faction' | 'ending'
  | 'shopItem' | 'settlementFormula' | 'gameRules';

export interface DefHeader {
  readonly id: string;
  readonly kind: DefinitionKind;
  readonly schemaVersion: number;
  readonly packId: PackId;
}

// ── 全域表 ────────────────────────────────────────────
export interface GlowTierDef extends DefHeader {
  readonly kind: 'glowTier';
  readonly tier: GlowTier;
  readonly order: number;
  readonly yieldMul: number;
  readonly baseWeight: number;
}
export interface AptitudeGradeDef extends DefHeader {
  readonly kind: 'aptitudeGrade';
  readonly grade: AptitudeGrade;
  readonly shiftSteps: number;
  readonly yieldMul: number;
}
export interface TrainingActionDef extends DefHeader {
  readonly kind: 'trainingAction';
  readonly attr: Attr;
  readonly phase: Phase;
  readonly labelKey: L10nKey;
  readonly subtitleKeys: readonly L10nKey[];
}
export interface TrainingCurveDef extends DefHeader {
  readonly kind: 'trainingCurve';
  readonly baseByAttr: Readonly<Record<Attr, number>>;
  readonly chapterMultiplier: readonly number[];
  readonly upgradeBaseChance: number;
  readonly shiftStepRatio: number;
}
export interface AffinityStageDef extends DefHeader {
  readonly kind: 'affinityStage';
  readonly stage: AffinityStage;
  readonly min: number;
  readonly max: number;
}
export interface AffinityCurveDef extends DefHeader {
  readonly kind: 'affinityCurve';
  readonly maxStartAffinity: number;
  readonly costPerPoint: Readonly<Record<Rarity, readonly number[]>>;
  readonly designationThreshold: number;
  readonly fragmentsByStage: Readonly<Record<AffinityStage, number>>;
  readonly fullDreamMultiplier: number;
}
export interface LinkBonusDef extends DefHeader {
  readonly kind: 'linkBonus';
  /**
   * 好感度階段帶來的【額外】站位加成，與 `NotableBaseDef.trainingBonus` 相加
   * 之後成為【該名士自己的倍率】：`1 + base + specialty + stage`。
   *
   * 名士之間則是【相乘】—— 全員擠進同一格是本作刻意保留的爆發時刻（19 §5.2）。
   * 因此這條曲線要比加法制時更平：它會被指數放大。
   */
  readonly trainingBonusByStage: Readonly<Record<AffinityStage, number>>;
  readonly checkBonusByStage: Readonly<Record<AffinityStage, number>>;
  readonly gainPerTraining: number;
  /** 一格可容納的名士數。要讓「全員同格」成立，它必須 ≥ 陣容人數。 */
  readonly maxPerSlot: number;
  /**
   * 同格人數的額外倍率，index ＝ 該格人數（0 與 1 應為 1，＝ 沒有加成）。
   *
   * 為什麼需要它：純粹的名士相乘【到不了爆發的量級】。實測（400 輪）
   * 單純相乘的最高倍率只有 ×2.75，四人同格也才 ×2 出頭 ——
   * 因為每個人的加成必須夠小才不會在六人同格時指數爆炸，
   * 而那個上限反過來壓死了三、四人同格的爽感。
   *
   * 這條曲線把爆發【只放在人多的時候】：一兩人同格幾乎不受影響，
   * 四人以上才陡升。於是常見情況不通膨，罕見情況真的爽。
   */
  readonly pileMultiplier: readonly number[];
  /**
   * 格子倍率的上限。乘法疊加的安全閥 ——
   * 沒有它，六位滿好感 ★5 同格會到 ×15 以上，一回合就把四維推上限，
   * 爆發感反而被上限吃掉。訂在「實際玩得到的最高疊加」之上一點點。
   */
  readonly maxSlotMultiplier: number;
}
export interface AttributeCapDef extends DefHeader {
  readonly kind: 'attributeCap';
  readonly attrMax: number;
  readonly moralMin: number;
  readonly moralMax: number;
}
export interface GameRulesDef extends DefHeader {
  readonly kind: 'gameRules';
  readonly eventSlotMax: number;
  readonly maxSortie: number;
  readonly companionCount: number;
  readonly superiorCount: number;
  readonly moralBands: readonly { readonly band: MoralBand; readonly min: number; readonly max: number }[];
}

// ── 名士 ──────────────────────────────────────────────
export interface UnlockRow extends EffectRef {
  readonly affinity: number;
  readonly supersedes: readonly number[];
  readonly descKey: L10nKey;
}
export interface NotableEventStage {
  readonly stage: AffinityStage;
  readonly eventDefId: EventDefId;
}
/**
 * 名士的基底 —— 從進入陣容的【第一回合】就生效，不需要任何好感度。
 *
 * 為什麼需要它：解鎖條（`unlocks`）最早在好感度 20 才觸發，而連動加成原本
 * 只看好感度階段。結果是開局時 ★5 與 ★1 站在格子上【數值完全相同】——
 * 「這格有誰站著」不構成資訊，玩家沒有理由在意站位（GDD §6.1）。
 *
 * 基底與解鎖條的分工：
 *   base    ＝ 他【本來就會的事】。恆定、可見、逐人不同。
 *   unlocks ＝ 養出來的提升與新功能。階段性、需要投資。
 */
export interface NotableBaseDef {
  /** 專長維。站在該維的格子上加成更高，也更常被分配到那一格。 */
  readonly specialty: Attr;
  /** 站位加成：踩到他站的格子，鍛鍊收益 ＋this（與階段加成【相加】）。 */
  readonly trainingBonus: number;
  /** 專長對位時的額外加成。 */
  readonly specialtyBonus: number;
  /** 專長格的站位權重倍率。> 1 ＝ 更常站在專長格；不是硬性限制（19 §4）。 */
  readonly specialtyWeight: number;
  /** 大檢定出戰的基底加值（與階段加值相加）。 */
  readonly sortieBonus: number;
}

export interface NotableDef extends DefHeader {
  readonly kind: 'notable';
  readonly notableId: NotableId;
  readonly rarity: Rarity;
  readonly factionId: FactionId;
  readonly nameKey: L10nKey;
  /** 基底。取代了原本的 `role` —— 那個欄位沒有任何程式讀它，是假裝成資料的註解。 */
  readonly base: NotableBaseDef;
  readonly unlocks: readonly UnlockRow[];
  readonly eventChain: readonly NotableEventStage[];
}
export interface NotablePoolDef extends DefHeader {
  readonly kind: 'notablePool';
  readonly poolId: NotablePoolId;
  readonly factionId: FactionId;
  readonly entries: readonly PoolEntry[];
}
export interface PoolEntry {
  readonly notableId: NotableId;
  readonly weight: number;
  readonly requirements: readonly Condition[];
}

// ── 天賦與資質 ────────────────────────────────────────
export interface TalentDef extends DefHeader {
  readonly kind: 'talent';
  readonly talentId: TalentId;
  readonly cost: number;
  readonly nameKey: L10nKey;
  readonly descKey: L10nKey;
  readonly exclusiveGroup: string | null;
  readonly effects: readonly EffectRef[];
}
export interface AptitudeCostDef extends DefHeader {
  readonly kind: 'aptitudeCost';
  readonly defaultGrade: AptitudeGrade;
  readonly cumulativeCost: Readonly<Record<AptitudeGrade, number>>;
}

// ── 事件 ──────────────────────────────────────────────
export type EventReward =
  | { readonly kind: 'fame'; readonly fame: FameKind; readonly amount: number }
  | { readonly kind: 'merit'; readonly merit: MeritKind; readonly amount: number }
  | { readonly kind: 'attr'; readonly attr: Attr; readonly amount: number }
  | { readonly kind: 'affinity'; readonly notableId: NotableId | null; readonly amount: number };

/**
 * 事上磨練：本選項會鍛鍊到哪些維度、各佔多少權重。
 *
 * 與 `EventReward` 的 `attr` 是兩件事，不可互相取代：
 *   practice  ＝ 做事本身的經驗累積，隨章節倍率縮放，每個選項都有（系統性）
 *   reward.attr ＝ 劇情級的一次性躍升（呂布單挑 +22 武），手寫、不縮放（例外）
 * 混用會讓「事件也會長能力」變成逐條運氣，而不是可依賴的規則。
 */
export interface EventPractice {
  readonly attr: Attr;
  readonly weight: number;
}

export interface EventOptionDef {
  readonly labelKey: L10nKey;
  readonly requirements: readonly Condition[];
  readonly check: { readonly attr: Attr; readonly dcCurveId: DcCurveId } | null;
  readonly practice: readonly EventPractice[];
  readonly rewards: readonly EventReward[];
  readonly moralDelta: number;
}
export interface ParamSlot {
  readonly name: string;
  readonly poolId: ParamPoolId;
}
export interface EventDef extends DefHeader {
  readonly kind: 'event';
  readonly eventDefId: EventDefId;
  readonly eventKind: EventKind;
  readonly unique: boolean;
  readonly collectible: boolean;
  readonly weight: number;
  readonly ownerNotable: NotableId | null;
  readonly commissionKind: CommissionKind | null;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly paramSlots: readonly ParamSlot[];
  readonly requirements: readonly Condition[];
  readonly options: readonly EventOptionDef[];
}
/**
 * 事件的產出曲線 —— 四維（practice）與貨幣（fame／merit）共用同一條章節縮放。
 *
 * 形狀刻意與 `TrainingCurveDef` 對齊：「上課 vs 工作」的差距就是這兩張表
 * baseByAttr 的比值，只有一個平衡旋鈕。
 *
 * `chapterMultiplier` 同時縮放兩者，因為它們是同一件事的兩面：
 * 後期的委託是更大的任務 —— 出的力更多，拿到的名聲功績也更多。
 * 貨幣若留在作者寫死的固定值，第 9 章一則委託的 22 功績對照
 * 官階門檻 1830 等於沒給，事件會在後段自然死掉（與四維同一類問題）。
 *
 * 不寫死成「鍛鍊的 N 成」：委託本來就該能逐類型調校
 * （討伐練武比跑腿練政更兇），做成獨立曲線才留得下這個空間。
 */
export interface EventYieldCurveDef extends DefHeader {
  readonly kind: 'eventYieldCurve';
  readonly baseByAttr: Readonly<Record<Attr, number>>;
  readonly chapterMultiplier: readonly number[];
  /** 檢定失敗時仍給的比例。事情辦砸了，但人還是走過那一趟（17 §6.3）。 */
  readonly failRatio: number;
}

export interface ParamPoolDef extends DefHeader {
  readonly kind: 'paramPool';
  readonly poolId: ParamPoolId;
  readonly entries: readonly L10nKey[];
}
export interface DcCurveDef extends DefHeader {
  readonly kind: 'dcCurve';
  readonly curveId: DcCurveId;
  readonly byChapter: readonly number[];
}

// ── 章節與檢定 ────────────────────────────────────────
export interface MajorCheckTier {
  readonly dc: number;
  readonly requirements: readonly Condition[];
  readonly rewards: readonly EventReward[];
  readonly briefKey: L10nKey;
}
export interface MajorCheckDef extends DefHeader {
  readonly kind: 'majorCheck';
  readonly checkId: MajorCheckId;
  readonly primaryAttr: Attr;
  readonly secondaryAttr: Attr | null;
  readonly tiers: Readonly<Record<Difficulty, MajorCheckTier>>;
  readonly enemyNotables: readonly NotableId[];
}
export interface ChapterDef extends DefHeader {
  readonly kind: 'chapter';
  readonly chapterId: ChapterId;
  readonly factionId: FactionId | null;
  readonly order: number;
  readonly length: number;
  readonly titleKey: L10nKey;
  readonly majorCheckId: MajorCheckId;
  readonly onPass: 'chooseFaction' | null;
}
export interface ChapterSequenceDef extends DefHeader {
  readonly kind: 'chapterSequence';
  readonly factionId: FactionId | null;
  readonly chapters: readonly ChapterId[];
}
export interface CheckRuleDef extends DefHeader {
  readonly kind: 'checkRule';
  readonly secondaryWeight: number;
  readonly rollMin: number;
  readonly rollMax: number;
  /**
   * 骰子以【比例】而非加法作用：total = value × (1 + (roll - center) / spread)。
   * 加法骰在檢定值放大到數百後，±50 的擺幅只佔數個百分點 ——
   * 成功率會塌成 100% 或 0%，「難度自選」就不再是決策。
   */
  readonly rollCenter: number;
  readonly rollSpread: number;
  /**
   * 檢定值下限。比例骰在 value=0 時任何 DC 都是 0% ——
   * 第 1 回合四維全 0，沒有下限的話開局所有檢定都必敗。
   */
  readonly baseFloor: number;
}

// ── 官階・陣營・結局 ──────────────────────────────────
export interface CareerRankDef extends DefHeader {
  readonly kind: 'careerRank';
  readonly line: CareerLine;
  readonly level: number;
  readonly nameKey: L10nKey;
  readonly requiredMerit: number;
  readonly checkBonus: number;
}
export interface CareerInitDef extends DefHeader {
  readonly kind: 'careerInit';
  readonly byTotalFame: readonly {
    readonly minTotalFame: number;
    readonly civilLevel: number;
    readonly martialLevel: number;
  }[];
}
export interface FactionDef extends DefHeader {
  readonly kind: 'faction';
  readonly faction: FactionId;
  readonly nameKey: L10nKey;
  readonly lordId: NotableId;
  readonly requirements: readonly Condition[];
  readonly rejectReasonKey: L10nKey;
  readonly superiorPoolId: NotablePoolId;
  /** 緣分 0..3 的主公台詞。用主公的口吻解釋玩家的 meta 權限（19 §3.2）。 */
  readonly bondSpeechKeys: readonly L10nKey[];
}
export type EndingTrigger =
  | { readonly kind: 'sequenceCompleted' }
  | { readonly kind: 'checkFailed'; readonly attr: Attr | 'any' }
  | { readonly kind: 'noFactionEligible' };
export interface EndingDef extends DefHeader {
  readonly kind: 'ending';
  readonly ending: EndingId;
  readonly endingKind: 'fullDream' | 'aborted';
  readonly factionId: FactionId | null;
  readonly trigger: EndingTrigger;
  readonly requirements: readonly Condition[];
  readonly priority: number;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly moralVariants: Readonly<Record<MoralBand, L10nKey>>;
  readonly pointsMultiplier: number;
  readonly collectible: boolean;
}

// ── 元層 ──────────────────────────────────────────────
export type ShopGrant =
  | { readonly kind: 'aptitudeCap'; readonly attr: Attr; readonly toGrade: AptitudeGrade }
  | { readonly kind: 'aptitudePoints'; readonly delta: number }
  | { readonly kind: 'talentPoints'; readonly delta: number }
  | { readonly kind: 'factionBond'; readonly faction: FactionId; readonly toLevel: number }
  | { readonly kind: 'unlockTalent'; readonly talentId: TalentId }
  | { readonly kind: 'effect'; readonly ref: EffectRef };

export interface ShopLevel {
  readonly level: number;
  readonly cost: number;
  readonly grant: ShopGrant;
}
export interface ShopItemDef extends DefHeader {
  readonly kind: 'shopItem';
  readonly item: ShopItemId;
  readonly category: 'aptitude' | 'talent' | 'bond' | 'glow';
  readonly nameKey: L10nKey;
  readonly descKey: L10nKey;
  readonly levels: readonly ShopLevel[];
  readonly requiresItems: readonly ShopItemId[];
  readonly requiresPack: PackId | null;
}
export interface SettlementFormulaDef extends DefHeader {
  readonly kind: 'settlementFormula';
  readonly perCareerRank: number;
  readonly perChapterPassed: number;
  readonly perTurnSurvived: number;
  readonly fullDreamBonus: number;
}

/** Definition kind → 型別對照。Registry 以此提供型別安全的 Reader。 */
export interface DefByKind {
  glowTier: GlowTierDef; aptitudeGrade: AptitudeGradeDef;
  trainingAction: TrainingActionDef; trainingCurve: TrainingCurveDef;
  affinityStage: AffinityStageDef; affinityCurve: AffinityCurveDef;
  linkBonus: LinkBonusDef; attributeCap: AttributeCapDef; gameRules: GameRulesDef;
  notable: NotableDef; notablePool: NotablePoolDef;
  talent: TalentDef; aptitudeCost: AptitudeCostDef;
  event: EventDef; paramPool: ParamPoolDef; dcCurve: DcCurveDef; checkRule: CheckRuleDef;
  eventYieldCurve: EventYieldCurveDef;
  chapter: ChapterDef; chapterSequence: ChapterSequenceDef; majorCheck: MajorCheckDef;
  careerRank: CareerRankDef; careerInit: CareerInitDef;
  faction: FactionDef; ending: EndingDef;
  shopItem: ShopItemDef; settlementFormula: SettlementFormulaDef;
}
