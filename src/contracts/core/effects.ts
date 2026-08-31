import type {
  ChargeId, EffectId, FlagId, ItemId, NotableId, TargetId,
} from './ids.js';
import type {
  AffinityStage, Attr, Difficulty, EventKind, GlowTier, Phase, Rarity, StatPath,
} from './primitives.js';

export type FuncType =
  | 'StatModifier'
  | 'GlowUpgradeBonus'
  | 'GlowBaseWeight'
  | 'SlotBias'
  | 'EventRewardBonus'
  | 'AffinityGrant'
  | 'AffinityGrowth'
  | 'CheckValueBonus'
  | 'CheckRetry'
  | 'RevealInfo'
  | 'CurrencyBonus'
  | 'DesignateSlots'
  // ── 站位層（19 §5）★ ──────────────────────────────
  | 'LinkBonus'
  | 'LinkAmplify'
  | 'SlotBaseAdd'
  | 'SlotSizeBonus'
  // ── 機會層（17 §2、19 §6）★ ───────────────────────
  | 'CommissionChance'
  | 'EncounterChance'
  | 'RarityWeight'
  | 'RarityFloor'
  // ── 產出層 ────────────────────────────────────────
  | 'GainMultiplier'
  | 'CheckRewardBonus';

export const FUNC_TYPES: readonly FuncType[] = [
  'StatModifier', 'GlowUpgradeBonus', 'GlowBaseWeight', 'SlotBias',
  'EventRewardBonus', 'AffinityGrant', 'AffinityGrowth',
  'CheckValueBonus', 'CheckRetry', 'RevealInfo', 'CurrencyBonus', 'DesignateSlots',
  'LinkBonus', 'LinkAmplify', 'SlotBaseAdd', 'SlotSizeBonus',
  'CommissionChance', 'EncounterChance', 'RarityWeight', 'RarityFloor',
  'GainMultiplier', 'CheckRewardBonus',
];

export interface EffectRef {
  readonly funcType: FuncType;
  readonly referId: EffectId;
}

export interface ResolvedEffectRef extends EffectRef {
  readonly sourceId: string;
}

/**
 * 效果作用的對象範圍（19 §5.5、23 §2）★
 *
 * 這個判別聯集就是【限制越窄，效果越強】那條規則的型別形式。
 * 三層由窄到寬：
 *
 *   named     只對指定的那一位名士生效 —— 陣容裡沒有他，這條就是死的
 *   specialty 只對某一維的名士生效
 *   all       全體
 *
 * `self` 是名士自己的解鎖條專用（效果來源本人）。道具不會用到它 ——
 * 道具沒有「自己」。
 *
 * 做成型別而不是三個布林欄位：合法組合由型別直接說出來，
 * 「同時指定 notableId 與 attr」這種矛盾寫不出來。
 */
export type NotableTarget =
  | { readonly kind: 'self' }
  | { readonly kind: 'all' }
  | { readonly kind: 'specialty'; readonly attr: Attr }
  | { readonly kind: 'named'; readonly notableId: NotableId };

/**
 * 這個效果要不要「有人站在這一格」才算數（19 §5.1）★
 *
 * 它同時是【好感 60 門檻】的判準：名士身上任何 `standing.kind !== 'none'`
 * 的效果都要那位名士的好感達到 `linkBonus.linkStage` 才發放。
 * 判斷寫在 ⑩ 的 EffectSource，因此規則只有一處，加新的 FuncType 不必再補。
 *
 * 【道具不吃這道門檻】—— 道具的來源不是名士，沒有好感可查。這正是道具
 * 存在的理由：名士那層要七到十個回合才打得開，道具第一回合就開。
 */
export type StandingReq =
  | { readonly kind: 'none' }
  | { readonly kind: 'self' }
  | { readonly kind: 'named'; readonly notableId: NotableId };

export type Condition =
  | { readonly type: 'phase'; readonly value: Phase }
  | { readonly type: 'faction'; readonly value: string }
  | { readonly type: 'chapterGte'; readonly value: number }
  | { readonly type: 'statGte'; readonly stat: StatPath; readonly value: number }
  | { readonly type: 'statLte'; readonly stat: StatPath; readonly value: number }
  | { readonly type: 'glowTier'; readonly value: GlowTier }
  | { readonly type: 'difficulty'; readonly value: Difficulty }
  | { readonly type: 'and'; readonly all: readonly Condition[] }
  | { readonly type: 'or'; readonly any: readonly Condition[] }
  | { readonly type: 'not'; readonly of: Condition };

export type Op = 'add' | 'mulPct' | 'clampMin' | 'clampMax';

export interface Contribution {
  readonly target: TargetId;
  readonly op: Op;
  readonly value: number;
  readonly sourceId: string;
}

export interface EffectTrace {
  readonly sourceId: string;
  readonly funcType: FuncType;
  readonly op: string;
  readonly value: number;
  readonly applied: boolean;
}

// ── 各 FuncType 的定義形狀 ───────────────────────────────
export interface StatModifierDef { readonly target: TargetId; readonly op: Op; readonly value: number; readonly condition: Condition | null }
export interface GlowUpgradeBonusDef { readonly scope: Attr | 'all'; readonly chanceAdd: number; readonly condition: Condition | null }
export interface GlowBaseWeightDef { readonly scope: Attr | 'all'; readonly tierShift: number; readonly condition: Condition | null }
/**
 * 站位分配的權重（19 §4）★
 *
 * 【不吃好感門檻】—— 它決定的是「他會被分到哪一格」，而好感正是靠同格養出來的。
 * 若連分配都要好感 60，玩家就沒有辦法把人推到想要的格子上去養好感（死結）。
 */
export interface SlotBiasDef {
  readonly target: NotableTarget;
  readonly attrWeights: Readonly<Partial<Record<Attr, number>>>;
  readonly condition: Condition | null;
}
export interface EventRewardBonusDef { readonly eventKind: EventKind | 'all'; readonly mulPct: number; readonly condition: Condition | null }
export interface AffinityGrantDef { readonly timing: 'onDreamEnter' | 'onChapterStart'; readonly target: NotableTarget; readonly amount: number; readonly condition: Condition | null }
/**
 * 好感成長倍率（23 §3）★
 *
 * 站位效果全部卡在好感 60，所以【加快好感成長＝提早解鎖整個站位層】。
 * 它與星階的「起始好感」是同一件事的兩種買法：一個一次性跳過，一個持續加速。
 *
 * 它自己【不能】吃好感門檻 —— 那會是個死結：要好感才給的加成，
 * 作用卻是加快好感。因此 `AffinityGrowth` 沒有 `standing` 欄位。
 */
export interface AffinityGrowthDef { readonly target: NotableTarget; readonly mulPct: number; readonly condition: Condition | null }
export interface CheckValueBonusDef { readonly attr: Attr | 'all'; readonly scope: 'minor' | 'major' | 'both'; readonly add: number; readonly condition: Condition | null }
export interface CheckRetryDef { readonly scope: 'minor' | 'major'; readonly usesPerRun: number; readonly condition: Condition | null }
/**
 * 揭示某一層資訊。`what` 直接推導出 FlagId（`flag.<what>`），
 * 因此新增一種揭示只要加一個字面值，不必動 `hasFlag`。
 *
 * `checkBreakdown` 已退場 —— 大檢定改為戰役之後沒有「檢定值組成」可看了。
 * 取代它的是 `battleTrace`：戰報的完整傷害歸因（33 §7.1）。
 */
export interface RevealInfoDef {
  readonly what: 'nextTurnSlots' | 'battleTrace';
  readonly condition: Condition | null;
}
export interface CurrencyBonusDef { readonly currency: StatPath | 'allMerit'; readonly mulPct: number; readonly condition: Condition | null }
export interface DesignateSlotsDef { readonly slots: number; readonly condition: null }

// ── 站位層 ────────────────────────────────────────────
/**
 * 站位加成（19 §5.1）★
 *
 * `standing: self` ＝ 這位名士自己站在符合 `scope` 的格子上時，
 * 他對該格的加成 ＋mulPct。名士之間【相乘】，因此每條都不能太大。
 */
export interface LinkBonusEffectDef {
  readonly scope: Attr | 'all';
  readonly standing: StandingReq;
  readonly mulPct: number;
  readonly condition: Condition | null;
}
/**
 * 放大【同格其他人】的加成（19 §5.5）★
 *
 * 與 `LinkBonus` 的差別是作用對象：LinkBonus 加自己，LinkAmplify 加別人。
 * 這是唯一直接獎勵「多人同格」的效果 —— 陳群的九品官人法。
 */
export interface LinkAmplifyDef {
  readonly target: NotableTarget;
  readonly standing: StandingReq;
  readonly mulPct: number;
  readonly condition: Condition | null;
}
/**
 * 同格時抬高該維的【基礎值】（16 §4.3）。
 *
 * 走加法、落在乘法鏈之前 —— 與官階的 `trainingBaseAdd` 同一層。
 * 走乘法的話它會與光階、名士倍率複合成指數，一個回合就把四維推上限。
 */
export interface SlotBaseAddDef {
  readonly scope: Attr | 'all';
  readonly standing: StandingReq;
  readonly add: number;
  readonly condition: Condition | null;
}
/**
 * 依同格人數給的倍率（23 §4）★
 *
 * 與 `linkBonus.pileMultiplier`（人越多越強）方向可以【相反】：
 * 逍遙津令寫 `{ min: 1, max: 1 }`，八百破十萬 —— 只有一個人站著時才加成。
 * 做成區間而不是「單人專用」旗標，未來要寫「四人以上再加成」不必改結構。
 */
export interface SlotSizeBonusDef {
  readonly minNotables: number;
  readonly maxNotables: number;
  readonly standing: StandingReq;
  readonly mulPct: number;
  readonly condition: Condition | null;
}

// ── 機會層 ────────────────────────────────────────────
/**
 * 委託旗標的機率修正（15 §3）★
 *
 * 兩段抽取的第一段：回合開始逐格擲「會不會有委託」。基礎值在
 * `gameRules.commissionChance`，這裡只給修正。
 *
 * `guarantee` ＝ 必定觸發。它不是「＋很多％」的簡寫 —— 保證與高機率
 * 對玩家是不同的東西：保證可以拿來計畫，機率只能拿來期待。
 */
export interface ChanceModifierDef {
  readonly scope: Attr | 'all';
  readonly standing: StandingReq;
  readonly addPct: number;
  readonly guarantee: boolean;
  readonly condition: Condition | null;
}
/** 委託稀有度的位移（檔）。小數合法 —— 位移是對權重分佈做的，不是整檔跳。 */
export interface RarityWeightDef { readonly shift: number; readonly condition: Condition | null }
/**
 * 委託稀有度的【地板】。抽出之後才套用 —— 它抬的是結果不是分佈。
 * 與 `RarityWeight` 分開：位移是機率上的偏好，地板是保證。
 */
export interface RarityFloorDef { readonly min: Rarity; readonly condition: Condition | null }

// ── 產出層 ────────────────────────────────────────────
/** 某一維的成長量倍率。作用在 ⑯ 的乘法鏈上，與光階同層。 */
export interface GainMultiplierDef { readonly scope: Attr | 'all'; readonly mulPct: number; readonly condition: Condition | null }
/** 大檢定通過後的獎勵倍率（18 §5）。 */
export interface CheckRewardBonusDef { readonly mulPct: number; readonly condition: Condition | null }

export type EffectDef =
  | StatModifierDef | GlowUpgradeBonusDef | GlowBaseWeightDef | SlotBiasDef
  | EventRewardBonusDef | AffinityGrantDef | AffinityGrowthDef
  | CheckValueBonusDef | CheckRetryDef | RevealInfoDef | CurrencyBonusDef
  | DesignateSlotsDef
  | LinkBonusEffectDef | LinkAmplifyDef | SlotBaseAddDef | SlotSizeBonusDef
  | ChanceModifierDef | RarityWeightDef | RarityFloorDef
  | GainMultiplierDef | CheckRewardBonusDef;

/** 效果表：funcType → referId → def */
export type EffectTables = Readonly<Record<FuncType, Readonly<Record<number, EffectDef>>>>;

/**
 * 這個效果定義是不是【站位範圍】的。
 *
 * 判準只有一條：它有沒有 `standing` 欄位、而且不是 `none`。
 * 好感 60 的門檻因此只寫在一個地方 —— 加新的站位型 FuncType 時
 * 只要帶上 `standing`，門檻自動適用，不必回來補列舉。
 */
export function isStandingScoped(def: EffectDef): boolean {
  const standing = (def as { standing?: StandingReq }).standing;
  return standing !== undefined && standing.kind !== 'none';
}

/** 這個效果要求誰站著。`none` ＝ 不要求。 */
export function standingOf(def: EffectDef): StandingReq {
  return (def as { standing?: StandingReq }).standing ?? { kind: 'none' };
}

export interface NotableStageRef {
  readonly notableId: NotableId;
  readonly stage: AffinityStage;
}

/** 效果的來源種類。`sourceId` 的前綴由此決定（01 §6.1）。 */
export const SOURCE_PREFIX = {
  notable: 'notable',
  item: 'item',
  talent: 'talent',
  shop: 'shop',
} as const;

/** 名士來源的 sourceId：`notable/<id>@<star>`。 */
export const notableSourceId = (id: NotableId, star: number): string =>
  `${SOURCE_PREFIX.notable}/${String(id)}@${star}`;

/** 道具來源的 sourceId：`item/<id>@<tier>`。 */
export const itemSourceId = (id: ItemId, tier: number): string =>
  `${SOURCE_PREFIX.item}/${String(id)}@${tier}`;

/** 從 sourceId 取回名士 ID。不是名士來源時回 null。 */
export function notableOfSource(sourceId: string): string | null {
  const head = `${SOURCE_PREFIX.notable}/`;
  if (!sourceId.startsWith(head)) return null;
  const rest = sourceId.slice(head.length);
  const at = rest.lastIndexOf('@');
  return at < 0 ? rest : rest.slice(0, at);
}

export const FLAGS = {
  nextTurnSlots: 'flag.nextTurnSlots' as FlagId,
  battleTrace: 'flag.battleTrace' as FlagId,
} as const;

export const CHARGES = {
  minorRetry: 'charge.minorRetry' as ChargeId,
  majorRetry: 'charge.majorRetry' as ChargeId,
} as const;
