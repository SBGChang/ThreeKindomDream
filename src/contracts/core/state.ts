import type {
  ChapterId, ChargeId, EndingId, EventDefId, FactionId, L10nKey,
  NotableId, ParamPoolId, Seed, ShopItemId, TalentId, TurnIndex, ChapterIndex,
} from './ids.js';
import type {
  AffinityStage, AptitudeGrade, Attr, CareerLine, Difficulty, FameKind,
  GlowTier, MeritKind, MoralBand, Phase, RngCursors, SlotIndex, TurnActionKind,
} from './primitives.js';

// ── MetaState（跨 Run 持久）────────────────────────────
export interface NotableCodexEntry {
  readonly startAffinity: number;
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
  /** 累計行動配比。跳過事件已不是動作（15 §2），因此記的是「回合花在哪一邊」。 */
  readonly actionsTraining: number;
  readonly actionsEvent: number;
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
export interface CurrencyState {
  readonly fame: Readonly<Record<FameKind, number>>;
  readonly merit: Readonly<Record<MeritKind, number>>;
}
export interface CareerState { readonly civil: number; readonly martial: number }

export interface RosterMember {
  readonly notableId: NotableId;
  readonly affinity: number;
  readonly origin: 'companion' | 'superior';
  readonly firedStages: readonly AffinityStage[];
}
export interface RosterState { readonly members: readonly RosterMember[] }

export interface TrainingSlot {
  readonly attr: Attr;
  readonly labelKey: L10nKey;
  readonly subtitleKey: L10nKey;
  readonly baseGlow: GlowTier;
  readonly notables: readonly NotableId[];
}
export interface TrainingResult {
  readonly finalGlow: GlowTier;
  readonly upgraded: boolean;
  readonly attr: Attr;
  readonly attrGained: number;
}
export interface TrainingSlotState {
  readonly slots: readonly TrainingSlot[];
  readonly selected: SlotIndex | null;
  readonly result: TrainingResult | null;
}

export interface AttrGain { readonly attr: Attr; readonly amount: number }

export interface OptionState {
  readonly enabled: boolean;
  readonly blockedReasonKeys: readonly L10nKey[];
  readonly successRate: number | null;
  /** 事上磨練的預期產出（成功時）。與鍛鍊格的 expectedGain 同單位，供並列比較（17 §6.2）。 */
  readonly practicePreview: readonly AttrGain[];
}
export interface EventOffer {
  readonly eventDefId: EventDefId;
  readonly params: Readonly<Record<string, L10nKey>>;
  readonly optionStates: readonly OptionState[];
}
/**
 * 事件已結算。`skipped` 這個 kind 已移除 —— 一回合只能投一個動作，
 * 「不做事件」不再是獨立動作，它就等於改選鍛鍊（15 §2、17 §1.1）。
 */
export interface EventResolution {
  readonly offerIndex: number;
  readonly optionIndex: number;
  readonly passed: boolean;
  readonly practiceGained: readonly AttrGain[];
}
export interface EventSlotState {
  readonly offers: readonly EventOffer[];
  readonly resolved: EventResolution | null;
  readonly seenUniqueIds: readonly EventDefId[];
}

/**
 * 本回合投入的那一個動作。二者互斥，因此這是個 union 而非兩個獨立欄位。
 * 不另存一份 —— 由 training.selected／event.resolved 推導（15 §2.1）。
 */
export type TurnAction =
  | { readonly kind: 'training'; readonly index: SlotIndex }
  | { readonly kind: 'event'; readonly offerIndex: number; readonly optionIndex: number };

export interface SlotState {
  readonly training: TrainingSlotState;
  readonly event: EventSlotState;
}

/**
 * 本輪的行動配比。「練了幾回合、做事幾回合」是單動作回合制的核心度量。
 * 以 TurnActionKind 為鍵 —— 加一種動作型別時這裡編不過，不會靜靜漏記。
 */
export type ActionTally = Readonly<Record<TurnActionKind, number>>;

export interface EndingOutcome {
  readonly endingId: EndingId;
  readonly moralBand: MoralBand;
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
  readonly slots: SlotState;
  readonly actions: ActionTally;
  readonly charges: Readonly<Record<string, number>>;
  readonly ending: EndingOutcome | null;
  readonly lastMajorCheck: MajorCheckLog | null;
}

export interface MajorCheckLog {
  readonly chapterId: ChapterId;
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
  readonly actions: ActionTally;
  readonly glowResults: Readonly<Record<GlowTier, number>>;
  readonly attributes: AttributeState;
}

export type { ChargeId, ParamPoolId, ShopItemId, CareerLine };
