import type { DefHeader } from './definitions.js';
import type { ChapterId, L10nKey, SkillId, TraitId } from './ids.js';

export interface StoryTeaching { readonly skill: SkillId | null; readonly trait: TraitId | null }

export type StoryRequirement =
  | { readonly kind: 'choice'; readonly node: string; readonly option: string }
  | { readonly kind: 'milestone'; readonly id: string };

export interface StoryScene {
  readonly id: string;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly beats?: readonly StoryBeat[];
  /** Granted once after this scene, including branch responses and chapter aftermaths. */
  readonly teachings?: readonly StoryTeaching[];
}

/** A null speaker is system narration and must never render a portrait. */
export interface StoryBeat {
  readonly speaker: string | null;
  readonly textKey: L10nKey;
}

export interface StoryOption {
  readonly id: string;
  readonly labelKey: L10nKey;
  readonly consequenceKey: L10nKey;
  readonly response?: StoryScene;
}

export interface StoryNode {
  readonly id: string;
  readonly turn: number;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly beats?: readonly StoryBeat[];
  readonly options: readonly StoryOption[];
  readonly responseTiming?: 'immediate' | 'chapterEnd';
}

export interface StoryMilestone {
  readonly id: string;
  readonly minCleared: number;
  readonly requirements: readonly StoryRequirement[];
  readonly scene: StoryScene;
  readonly hintKey: L10nKey;
}

export interface StoryChapterDef extends DefHeader {
  readonly kind: 'storyChapter';
  readonly chapterId: ChapterId;
  readonly opening: StoryScene;
  readonly nodes: readonly StoryNode[];
  readonly milestones: readonly StoryMilestone[];
  /** First matching variant wins; the final unconditional scene is mandatory. */
  readonly aftermaths: readonly {
    readonly requirements: readonly StoryRequirement[];
    readonly scene: StoryScene;
  }[];
  /** Only the situation changes; the campaign's seven-stage rules stay identical. */
  readonly battleVariants: readonly {
    readonly requirements: readonly StoryRequirement[];
    readonly briefKeys: readonly L10nKey[];
  }[];
}

export interface StoryState {
  /** false is an explicit migration policy for already-started legacy runs. */
  readonly enabled: boolean;
  readonly choices: Readonly<Record<string, string>>;
  readonly milestones: readonly string[];
  readonly depths: Readonly<Record<string, number>>;
  readonly scenes: readonly StoryScene[];
  readonly seenScenes: readonly string[];
  readonly awaitingChapterClose: boolean;
  readonly awaitingEndingChoice: boolean;
}
