// 結構性不變量（ARCHITECTURE §2.1）。數值一律在 data，這裡只有結構。
export type Attr = 'war' | 'int' | 'pol' | 'cha';
export const ATTRS: readonly Attr[] = ['war', 'int', 'pol', 'cha'];

export type GlowTier = 'none' | 'silver' | 'gold' | 'red';
export const GLOW_TIERS: readonly GlowTier[] = ['none', 'silver', 'gold', 'red'];

export type AptitudeGrade = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const APTITUDE_GRADES: readonly AptitudeGrade[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

export type Difficulty = 'safe' | 'normal' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['safe', 'normal', 'hard'];

export type Phase = 'nanhua' | 'faction';

export type FameKind = 'civil' | 'martial' | 'moral';
export const FAME_KINDS: readonly FameKind[] = ['civil', 'martial', 'moral'];

export type MeritKind = 'civil' | 'martial';
export const MERIT_KINDS: readonly MeritKind[] = ['civil', 'martial'];

export type CareerLine = 'civil' | 'martial';
export const CAREER_LINES: readonly CareerLine[] = ['civil', 'martial'];

export type EventKind = 'notable' | 'resident' | 'faction';
export type CommissionKind = 'subdue' | 'procure' | 'reclaim' | 'errand' | 'festival';

export type AffinityStage = 'stranger' | 'acquainted' | 'friendly' | 'close' | 'sworn';
export const AFFINITY_STAGES: readonly AffinityStage[] =
  ['stranger', 'acquainted', 'friendly', 'close', 'sworn'];

export type MoralBand = 'veryEvil' | 'neutral' | 'veryGood';

export type SlotIndex = 0 | 1 | 2 | 3;
export const SLOT_INDICES: readonly SlotIndex[] = [0, 1, 2, 3];

/**
 * 一回合恰好投入一個動作，二者互斥（15 §2）。
 * 鍛鍊＝抽象的能力培養；事件＝有具體對象的任務。同一回合只能選一邊。
 */
export type TurnActionKind = 'training' | 'event';
export const TURN_ACTION_KINDS: readonly TurnActionKind[] = ['training', 'event'];

export type Rarity = 1 | 2 | 3 | 4 | 5;

export type StatPath =
  | `attr.${Attr}`
  | `fame.${FameKind}`
  | `merit.${MeritKind}`
  | `career.${CareerLine}`;

export type RngStream =
  | 'glow.base'
  | 'glow.upgrade'
  | 'notable.slot'
  | 'notable.roster'
  | 'event.draw'
  | 'event.params'
  | 'check.roll'
  | 'treasure.drop';

export const RNG_STREAMS: readonly RngStream[] = [
  'glow.base', 'glow.upgrade', 'notable.slot', 'notable.roster',
  'event.draw', 'event.params', 'check.roll', 'treasure.drop',
];

export type RngCursors = Readonly<Record<RngStream, number>>;
export interface Weighted<T> { readonly item: T; readonly weight: number }
