import type {
  ChapterId, ChargeId, EndingId, EventDefId, FactionId, ItemId, L10nKey,
  NotableId, ParamPoolId, Seed, ShopItemId, TalentId, TurnIndex, ChapterIndex,
} from './ids.js';
import type { EffectRef } from './effects.js';
import type {
  AffinityStage, AptitudeGrade, Attr, CareerLine, Difficulty,
  GlowTier, MeritKind, OptionTier, Phase, Rarity, RngCursors, SlotIndex,
} from './primitives.js';

// ── MetaState（跨 Run 持久）────────────────────────────
/**
 * 名士的跨局進度。`startAffinity` 已移除 —— 它由星階推導（10 §2）。
 * 存兩份會有兩個可能不一致的真相，而「初始好感」本來就只是星階的一個面。
 */
export interface NotableCodexEntry {
  readonly star: number;
  readonly fragments: number;
}

/**
 * 道具的跨局進度（23 §7）。形狀與 `NotableCodexEntry` 對齊 ——
 * 兩者是同一種階梯：碎片累積換階，階給能力。
 */
export interface ItemCodexEntry {
  readonly tier: number;
  readonly fragments: number;
}

export interface ShopState {
  readonly purchased: Readonly<Record<string, number>>;
}

export interface LifetimeStats {
  readonly runsStarted: number;
  readonly runsFullDream: number;
  readonly chaptersPassed: number;
  readonly turnsPlayed: number;
  readonly glowResults: Readonly<Record<GlowTier, number>>;
  /** 累計回合配比：每一維各投入過幾個回合（15 §2）。 */
  readonly actionsByAttr: Readonly<Record<Attr, number>>;
  readonly pointsEarnedTotal: number;
  readonly pointsSpentTotal: number;
}

export interface CollectionState {
  readonly seenEvents: readonly EventDefId[];
  readonly reachedEndings: readonly EndingId[];
}

export interface MetaState {
  readonly schemaVersion: number;
  readonly points: number;
  readonly notableCodex: Readonly<Record<string, NotableCodexEntry>>;
  readonly itemCodex: Readonly<Record<string, ItemCodexEntry>>;
  readonly shop: ShopState;
  readonly collection: CollectionState;
  readonly stats: LifetimeStats;
  readonly runIndex: number;
  readonly settledSeeds: readonly number[];
}

// ── RunState（夢醒即銷毀）──────────────────────────────
export interface DreamEntryConfig {
  readonly aptitudes: Readonly<Record<Attr, AptitudeGrade>>;
  readonly talents: readonly TalentId[];
  readonly designatedCompanions: readonly NotableId[];
  /**
   * 攜帶進場的道具（23 §5）。上限 `gameRules.carrySlots`。
   *
   * 高階道具一輪最多獲得一次，那一次是「首次獲得」而不是重複 ——
   * 因此【不帶就永遠拿不到碎片】。攜帶格的取捨只在高階道具上存在。
   */
  readonly carriedItems: readonly ItemId[];
}

export interface TurnProgress {
  readonly turn: TurnIndex;
  readonly chapter: ChapterIndex;
  readonly chapterId: ChapterId;
  readonly turnInChapter: number;
  readonly phase: Phase;
  readonly chaptersPassed: number;
  readonly pendingMajorCheck: boolean;
  readonly pendingFactionChoice: boolean;
  readonly pendingSuperiorAssign: boolean;
}

export interface AttributeState { readonly values: Readonly<Record<Attr, number>> }
/**
 * 名聲與善惡名都已刪除（GDD §7 改版）：主角從第一回合就在官，
 * 功績從第一回合就有意義。
 *
 * 舊制的名聲只有一個消費端 —— 入朝時讀一次的 `careerInit`—— 之後整條線失效，
 * 卻還持續被發給玩家；善惡名是同一個型別的第三種，一起退場。
 * 於是局內只剩【一種】門檻貨幣：功績，文武兩線。
 */
export interface CurrencyState {
  readonly merit: Readonly<Record<MeritKind, number>>;
}
export interface CareerState { readonly civil: number; readonly martial: number }

/**
 * `firedStages` 已移除 —— 人物事件改成鏈（chainId ＋ step），而鏈上的事件
 * 一律 `unique`，因此「發生過沒有」就是 `turn.seenUniqueIds` 裡有沒有它。
 * 存第二份只會多一個可能不一致的真相（同 15 §2.1 的理由）。
 */
export interface RosterMember {
  readonly notableId: NotableId;
  readonly affinity: number;
  readonly origin: 'companion' | 'superior';
}
export interface RosterState { readonly members: readonly RosterMember[] }

/**
 * 一個固定事件格。四個訊號在【選之前】全部可見（15 §3）★
 *
 *   baseGlow      保底光階（升階留到選完才揭曉，那是驚喜不是資訊）
 *   notables      誰站在這格
 *   hasCommission 選了會不會有委託
 *   hasEncounter  選了會不會有人物事件
 *
 * 兩個旗標是【兩段抽取】的第一段：回合開始逐格擲「會不會有」，
 * 選定之後才抽「是哪一則」。四格各自獨立，因此可能四格全有。
 *
 * 旗標【不能說謊】：`hasEncounter` 只在可抽池非空時才擲 ——
 * 顯示「有」卻抽不出東西，比不顯示更糟。
 */
export interface TrainingSlot {
  readonly attr: Attr;
  readonly labelKey: L10nKey;
  readonly subtitleKey: L10nKey;
  readonly baseGlow: GlowTier;
  readonly notables: readonly NotableId[];
  readonly hasCommission: boolean;
  readonly hasEncounter: boolean;
}
export interface TrainingResult {
  readonly finalGlow: GlowTier;
  readonly upgraded: boolean;
  readonly attr: Attr;
  readonly attrGained: number;
  /** 固定事件自己的功績產出。走 attrLine 對應的那一條（16 §4.2）。 */
  readonly meritGained: MeritGain;
}
export interface AttrGain { readonly attr: Attr; readonly amount: number }

export interface MeritGain { readonly line: CareerLine; readonly amount: number }

export interface OptionState {
  /** 三檔之一。UI 靠它把「高條件高報酬」直接說出來（17 §5）。 */
  readonly tier: OptionTier;
  readonly enabled: boolean;
  readonly blockedReasonKeys: readonly L10nKey[];
  readonly successRate: number | null;
  /** 事上磨練的預期產出（成功時）。 */
  readonly practicePreview: readonly AttrGain[];
  /** 功績的預期產出（成功時）。委託是功績的主要來源，必須看得見。 */
  readonly meritPreview: readonly MeritGain[];
}

/**
 * 一則待處理的事件。玩家【不選事件】——
 * 事件是抽出來的，玩家唯一的決定是「用哪個方法度過它」（GDD §4.2）。
 */
export interface EventOffer {
  readonly eventDefId: EventDefId;
  /** 抽出時的稀有度。委託由光階決定，名士事件沿用該名士的稀有度。 */
  readonly rarity: Rarity;
  readonly params: Readonly<Record<string, L10nKey>>;
  readonly optionStates: readonly OptionState[];
}

export interface ItemGain {
  readonly itemId: ItemId;
  /** 這一次是不是【重複獲得】。重複才產碎片（23 §5）。 */
  readonly duplicate: boolean;
}

export interface EventResolution {
  readonly eventDefId: EventDefId;
  readonly optionIndex: number;
  readonly passed: boolean;
  readonly practiceGained: readonly AttrGain[];
  readonly meritGained: readonly MeritGain[];
  readonly itemsGained: readonly ItemGain[];
}

/**
 * 一個回合的完整狀態（15 §2）。
 *
 * 回合有三拍，但只有【兩個決定】：
 *   1. slots 四選一              → selected / training
 *   2. pending 的隊首怎麼處理  → resolved（可能連續兩次：委託、然後武將事件）
 *
 * `pending` 是【佇列】而不是「一個委託 ＋ 一個可選的名士事件」兩個欄位：
 * 武將事件只是被推進佇列的另一則事件，因此「回合能不能推進」
 * 永遠是同一條判断（佇列空了沒有），不需要為每種追加事件長出一個 if。
 */
export interface TurnState {
  readonly slots: readonly TrainingSlot[];
  readonly selected: SlotIndex | null;
  readonly training: TrainingResult | null;
  readonly pending: readonly EventOffer[];
  readonly resolved: readonly EventResolution[];
  readonly seenUniqueIds: readonly EventDefId[];
}

/**
 * 本輪的回合配比：每一維各花了幾個回合。
 *
 * 舊制量的是「練 vs 做事」，因為那是玩家的拉扯。新制每個回合都同時
 * 做兩件事，那個比值恆為 1:1 —— 真正的拉扯變成【這回合投哪一維】，
 * 所以量的是這個。以 Attr 為鍵：加一維時這裡編不過，不會靜靜漏記。
 */
export type ActionTally = Readonly<Record<Attr, number>>;

/**
 * 本輪的道具持有（23 §5）★
 *
 * `count` ＝ 這一輪【獲得過幾次】，攜帶進場的算第一次。
 * `perRunCap` 用它擋；碎片也用它判斷 —— 第二次以後才算重複。
 */
export interface ItemRunState {
  readonly count: Readonly<Record<string, number>>;
}

/**
 * 【當局獎勵】—— 只在這一輪生效的效果（23 §8）★
 *
 * 賈詡〈獻計〉的「本輪剩餘回合，★1／★2 委託直接升為 ★3」走這條。
 * 它是道具做不到的東西：道具只能持續加速，當局獎勵能【一次性改寫本輪的規則】。
 *
 * 與道具的分工因此很清楚：
 *   遺物是帶得走的，當局獎勵是這一輪爽的。
 *
 * 存成 `EffectRef[]` 而不是逐種欄位 —— 它能給的東西與名士、道具完全同一套語彙，
 * 因此加一種新的當局獎勵不需要動任何程式。
 */
export type BoonState = readonly EffectRef[];

export interface EndingOutcome {
  readonly endingId: EndingId;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly pointsMultiplier: number;
  readonly isFullDream: boolean;
}

export interface RunState {
  readonly schemaVersion: number;
  readonly seed: Seed;
  readonly rngCursors: RngCursors;
  readonly metaSnapshot: MetaState;
  readonly config: DreamEntryConfig;
  readonly progress: TurnProgress;
  readonly faction: FactionId | null;
  readonly attributes: AttributeState;
  readonly currencies: CurrencyState;
  readonly career: CareerState;
  readonly roster: RosterState;
  readonly items: ItemRunState;
  readonly boons: BoonState;
  readonly turn: TurnState;
  readonly actions: ActionTally;
  readonly charges: Readonly<Record<string, number>>;
  readonly ending: EndingOutcome | null;
  readonly lastMajorCheck: MajorCheckLog | null;
}

export interface MajorCheckLog {
  readonly chapterId: ChapterId;
  /** 走的是哪一條路線。失敗的結局由該路線的主屬性決定，因此必須留下紀錄。 */
  readonly line: CareerLine;
  readonly difficulty: Difficulty;
  readonly base: number;
  readonly bonus: number;
  readonly dc: number;
  readonly roll: number;
  readonly total: number;
  readonly passed: boolean;
}

export type SliceKey = keyof RunState;

// ── 摘要（㉖ 結算的唯一輸入）───────────────────────────
export interface RunSummary {
  readonly seed: Seed;
  readonly endingId: EndingId;
  readonly isFullDream: boolean;
  readonly pointsMultiplier: number;
  readonly career: CareerState;
  readonly chaptersPassed: number;
  readonly turnsPlayed: number;
  readonly factionId: FactionId | null;
  readonly notables: readonly { readonly notableId: NotableId; readonly finalStage: AffinityStage }[];
  readonly seenUniqueEvents: readonly EventDefId[];
  /** 每件道具本輪獲得次數。第二次以後才產碎片，換算在 ㉖（23 §7）。 */
  readonly itemsAcquired: Readonly<Record<string, number>>;
  readonly actions: ActionTally;
  readonly glowResults: Readonly<Record<GlowTier, number>>;
  readonly attributes: AttributeState;
}

export type { ChargeId, ParamPoolId, ShopItemId, CareerLine };
