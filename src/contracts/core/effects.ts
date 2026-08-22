import type {
  ChargeId, EffectId, FlagId, NotableId, TargetId,
} from './ids.js';
import type { AffinityStage, Attr, Difficulty, EventKind, GlowTier, Phase, StatPath } from './primitives.js';

export type FuncType =
  | 'StatModifier'
  | 'GlowUpgradeBonus'
  | 'GlowBaseWeight'
  | 'SlotBias'
  | 'EventRewardBonus'
  | 'EventDrawModify'
  | 'AffinityGrant'
  | 'AffinityGrowth'
  | 'CheckValueBonus'
  | 'CheckRetry'
  | 'RevealInfo'
  | 'CurrencyBonus';

export const FUNC_TYPES: readonly FuncType[] = [
  'StatModifier', 'GlowUpgradeBonus', 'GlowBaseWeight', 'SlotBias',
  'EventRewardBonus', 'EventDrawModify', 'AffinityGrant', 'AffinityGrowth',
  'CheckValueBonus', 'CheckRetry', 'RevealInfo', 'CurrencyBonus',
];

export interface EffectRef {
  readonly funcType: FuncType;
  readonly referId: EffectId;
}

export interface ResolvedEffectRef extends EffectRef {
  readonly sourceId: string;
}

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
export interface SlotBiasDef { readonly attrWeights: Readonly<Partial<Record<Attr, number>>>; readonly condition: Condition | null }
export interface EventRewardBonusDef { readonly eventKind: EventKind | 'all'; readonly mulPct: number; readonly condition: Condition | null }
export interface EventDrawModifyDef { readonly drawCountAdd: number; readonly condition: Condition | null }
export interface AffinityGrantDef { readonly timing: 'onDreamEnter' | 'onChapterStart'; readonly targetRule: 'self' | 'randomRoster' | 'allRoster'; readonly amount: number; readonly condition: Condition | null }
export interface AffinityGrowthDef { readonly scope: 'self' | 'allRoster'; readonly mulPct: number; readonly condition: Condition | null }
export interface CheckValueBonusDef { readonly attr: Attr | 'all'; readonly scope: 'minor' | 'major' | 'both'; readonly add: number; readonly condition: Condition | null }
export interface CheckRetryDef { readonly scope: 'minor' | 'major'; readonly usesPerRun: number; readonly condition: Condition | null }
export interface RevealInfoDef { readonly what: 'nextTurnSlots' | 'checkBreakdown'; readonly condition: Condition | null }
export interface CurrencyBonusDef { readonly currency: StatPath | 'allFame' | 'allMerit'; readonly mulPct: number; readonly condition: Condition | null }

export type EffectDef =
  | StatModifierDef | GlowUpgradeBonusDef | GlowBaseWeightDef | SlotBiasDef
  | EventRewardBonusDef | EventDrawModifyDef | AffinityGrantDef | AffinityGrowthDef
  | CheckValueBonusDef | CheckRetryDef | RevealInfoDef | CurrencyBonusDef;

/** 效果表：funcType → referId → def */
export type EffectTables = Readonly<Record<FuncType, Readonly<Record<number, EffectDef>>>>;

export interface NotableStageRef {
  readonly notableId: NotableId;
  readonly stage: AffinityStage;
}

export const FLAGS = {
  nextTurnSlots: 'flag.nextTurnSlots' as FlagId,
  checkBreakdown: 'flag.checkBreakdown' as FlagId,
} as const;

export const CHARGES = {
  minorRetry: 'charge.minorRetry' as ChargeId,
  majorRetry: 'charge.majorRetry' as ChargeId,
} as const;
