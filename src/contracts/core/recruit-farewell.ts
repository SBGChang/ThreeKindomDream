import type { StoryRequirement } from './story.js';

export interface RecruitFarewellLine {
  readonly speaker: string | null;
  readonly text: string;
}

export interface RecruitFarewellScript {
  readonly title: string;
  readonly lines: readonly RecruitFarewellLine[];
  readonly variants?: readonly {
    readonly requirements: readonly StoryRequirement[];
    readonly lines: readonly RecruitFarewellLine[];
  }[];
}

/** Presentation progress is durable and independent of recruitment eligibility. */
export interface RecruitFarewellProgress {
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly cursor?: { readonly notableId: string; readonly page: number };
}
