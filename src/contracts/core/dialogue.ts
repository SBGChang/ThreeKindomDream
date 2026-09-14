import type { L10nKey } from './ids.js';
/** Presentation only: actor 0 is the protagonist, then the event cast (or clerk). */
export interface DialoguePoint {
  readonly x: number;
  readonly y?: number;
  readonly rotate?: number;
  readonly opacity?: number;
}
export interface DialogueMove {
  readonly actor: number;
  readonly duration: number;
  readonly path: readonly DialoguePoint[];
}
export interface DialogueBeat {
  readonly speaker: number | null;
  readonly textKey: L10nKey;
  readonly moves?: readonly DialogueMove[];
}
export interface EventDialogueDef {
  readonly intro: readonly DialogueBeat[];
  readonly keywords?: readonly L10nKey[];
  readonly outcomes?: readonly {
    readonly option: number;
    readonly passed?: boolean;
    readonly beats: readonly DialogueBeat[];
  }[];
}
