import type {
  CampaignId, ChapterId, ChargeId, EndingId, EventDefId, FactionId, ItemId,
  L10nKey, NotableId, ParamPoolId, Seed, ShopItemId, SkillId, TalentId, TraitId,
  TurnIndex, ChapterIndex,
} from './ids.js';
import type { EffectRef, EffectTrace } from './effects.js';
import type { EventReward } from './definitions.js';
import type {
  AffinityStage, AptitudeGrade, Attr, CareerLine,
  GlowTier, MeritKind, OptionTier, Phase, Rarity, RngCursors, SkillKind, SlotIndex,
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
  /**
   * **本輪官階能爬到第幾階**（`gameRules.careerCapBase` ＋ 天命買到的）★
   *
   * 放在 config 而不是每次去問 meta：入夢那一刻定案，一輪之內不變 ——
   * 與資質同一個位置、同一個理由（那些也是天命買的，也放在這裡）。
   */
  readonly careerCap: number;
}

export interface TurnProgress {
  readonly turn: TurnIndex;
  readonly chapter: ChapterIndex;
  readonly chapterId: ChapterId;
  readonly turnInChapter: number;
  readonly phase: Phase;
  readonly chaptersPassed: number;
  readonly pendingCampaign: boolean;
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
  readonly expGained: number;
  /** 固定事件自己的功績產出。走 attrLine 對應的那一條（16 §4.2）。 */
  readonly meritGained: MeritGain;
}
/**
 * 一筆經驗產出。RFC-01 D32 之後 ⑯ 與 ⑰ 產出的是【經驗】而不是屬性點 ——
 * 屬性只能經 ㉜ 花經驗買。型別改名讓那件事在呼叫端就看得見。
 */
export interface ExpGain { readonly attr: Attr; readonly amount: number }

export interface MeritGain { readonly line: CareerLine; readonly amount: number }

export interface OptionState {
  /** 三檔之一。UI 靠它把「高條件高報酬」直接說出來（17 §5）。 */
  readonly tier: OptionTier;
  readonly enabled: boolean;
  readonly blockedReasonKeys: readonly L10nKey[];
  readonly successRate: number | null;
  /** 事上磨練的預期產出（成功時）。 */
  readonly practicePreview: readonly ExpGain[];
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
  readonly practiceExp: readonly ExpGain[];
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

// ── ㉜ 養成兌現（32 §2）★ ─────────────────────────────
/**
 * 四類經驗池 ＋ 本輪解鎖清單。
 *
 * 四類【不共用】—— 共用一個池會讓「這回合練哪一格」失去意義，
 * 而那是回合制唯一的長期決策（32 §2.1）。
 *
 * 解鎖清單只在本輪有效。跨輪的預先解鎖若要做，走 ⑨ 天命商店（D37）。
 */
export interface GrowthState {
  readonly exp: Readonly<Record<Attr, number>>;
  readonly unlockedTraits: readonly TraitId[];
  readonly unlockedSkills: readonly SkillId[];
  /** 本輪累計花掉的經驗。用於斷言「產出 − 消耗 ＝ 餘額」（32 §9）。 */
  readonly spent: Readonly<Record<Attr, number>>;
}

// ── ㉓ 特質與技能（23 §2.4）★ ─────────────────────────
/** 只存 ID。效果、消耗、戰役行為全由 Definition 現算。 */
export interface AbilityState {
  readonly traits: readonly TraitId[];
  readonly skills: readonly SkillId[];
}

// ── ㉝ 戰役（33 §2）★ ─────────────────────────────────
export type CampaignPhase = 'configuring' | 'awaitingDecision' | 'resolved';

export interface CommanderSlot {
  readonly notableId: NotableId;
  /** 從該名士星階已開放的池裡挑的那一招（33 §3）。 */
  readonly skillId: SkillId;
}
export interface BattleLoadout {
  readonly skills: readonly SkillId[];
  readonly commanders: readonly CommanderSlot[];
}

/** 一條 buff／debuff。`remaining` 每回合遞減。 */
export interface ActiveBuff {
  readonly kind: 'buff' | 'debuff';
  readonly mulPct: number;
  readonly remaining: number;
  readonly sourceKey: L10nKey;
}

/**
 * 場上只有一支軍隊（33 §2.1）★
 *
 * 三位名士是傳令、不在場，所以【一條軍勢條是設定而非簡化】：
 * 走留決策要一眼可讀 ——「軍勢剩三成，下一關是頭目」就是這個功能的核心畫面。
 */
export interface HostState {
  readonly troops: number;
  readonly troopsMax: number;
  readonly supply: number;
  readonly supplyMax: number;
  readonly buffs: readonly ActiveBuff[];
}

export interface BattleLogEntry {
  readonly turn: number;
  readonly actor: 'host' | 'commander' | 'enemy';
  readonly actorKey: L10nKey | null;
  readonly skillKey: L10nKey | null;
  readonly kind: SkillKind | null;
  readonly amount: number;
  /** 因果鏈摘要，一律可見（33 §7.1）—— 它是玩家改配置的依據，不能鎖。 */
  readonly why: readonly string[];
  /**
   * 完整歸因：每一條加成的來源與數值。需 `flag.battleTrace`（天賦〈慧眼識人〉）。
   *
   * 沒有那個天賦時是【空陣列】而不是「算好了不顯示」——
   * 型別上為空與畫面上不畫是同一件事，中間不需要第二個判斷。
   */
  readonly trace: readonly EffectTrace[];
  readonly troopsAfter: number;
  readonly supplyAfter: number;
  readonly enemyAfter: number;
}

export interface CampaignState {
  readonly campaignId: CampaignId;
  readonly phase: CampaignPhase;
  readonly loadout: BattleLoadout | null;
  readonly host: HostState;
  /** 已通過的關數。0 時收兵合法 ——【按兵不動】，沒有及格線（33 §6.2）。 */
  readonly clearedStages: number;
  /** 已保住的獎勵。戰敗時全部作廢（33 §11.3）。 */
  readonly banked: readonly EventReward[];
  /** 最後一關的戰報。只留一關 —— 玩家要讀的是「剛剛發生什麼」。 */
  readonly log: readonly BattleLogEntry[];
  readonly rallied: boolean;
}

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
  readonly growth: GrowthState;
  readonly abilities: AbilityState;
  readonly campaign: CampaignState | null;
  readonly items: ItemRunState;
  readonly boons: BoonState;
  readonly turn: TurnState;
  readonly actions: ActionTally;
  readonly charges: Readonly<Record<string, number>>;
  readonly ending: EndingOutcome | null;
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
  /** 本輪學過什麼。⑫ 收集圖鑑用（23 §7.5）。 */
  readonly learnedTraits: readonly TraitId[];
  readonly learnedSkills: readonly SkillId[];
  /** 每場戰役打到第幾關。深度是這個設計的主要度量（33）。 */
  readonly stagesCleared: number;
}

export type { ChargeId, ParamPoolId, ShopItemId, CareerLine };
