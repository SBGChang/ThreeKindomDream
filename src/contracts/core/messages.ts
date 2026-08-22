import type { L10nKey, TurnIndex } from './ids.js';
import type { AptitudeGrade, Attr, Difficulty, SlotIndex } from './primitives.js';

export type RejectionCode =
  | 'turn.not-ready'
  | 'slot.already-used'
  | 'threshold.not-met'
  | 'faction.not-eligible'
  | 'capability.disabled'
  | 'charge.exhausted'
  | 'content.version-mismatch'
  | 'already-settled'
  | 'invalid-index';

export interface Rejection {
  readonly code: RejectionCode;
  readonly detail: string;
  readonly l10nKey: L10nKey;
}

export interface DomainEvent<P = unknown> {
  readonly kind: string;
  readonly payload: P;
  readonly turn: TurnIndex;
}

export type CommandOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly rejection: Rejection };

export const ok = <T>(value: T, events: readonly DomainEvent[] = []): CommandOutcome<T> =>
  ({ ok: true, value, events });

export const fail = <T>(rejection: Rejection): CommandOutcome<T> =>
  ({ ok: false, rejection });

export const reject = (
  code: RejectionCode, detail: string, key: L10nKey,
): Rejection => ({ code, detail, l10nKey: key });

/** UI 送出的請求：一律以序號指定，不含核心 ID（00 §9.2）。 */
export type GameCommandRequest =
  | { readonly kind: 'config.setAptitude'; readonly attr: Attr; readonly grade: AptitudeGrade }
  | { readonly kind: 'config.toggleTalent'; readonly talentIndex: number }
  | { readonly kind: 'config.designateCompanion'; readonly slot: 0 | 1 | 2; readonly candidateIndex: number | null }
  | { readonly kind: 'config.confirm' }
  | { readonly kind: 'shop.purchase'; readonly itemIndex: number }
  | { readonly kind: 'training.select'; readonly slotIndex: SlotIndex }
  | { readonly kind: 'event.select'; readonly offerIndex: number; readonly optionIndex: number }
  | { readonly kind: 'event.skip' }
  | { readonly kind: 'turn.advance' }
  | { readonly kind: 'majorCheck.attempt'; readonly difficulty: Difficulty; readonly sortieIndices: readonly number[] }
  | { readonly kind: 'faction.choose'; readonly optionIndex: number }
  | { readonly kind: 'roster.assignSuperiors'; readonly candidateIndices: readonly number[] }
  | { readonly kind: 'run.settle' }
  | { readonly kind: 'run.abandon' };
