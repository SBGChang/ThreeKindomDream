// Narrative owns choices, irreversible rescues and chapter presentation checkpoints.
import type { RunContext } from '../contracts/core/context.js';
import type { RunState } from '../contracts/core/state.js';
import type { StoryChapterDef, StoryNode, StoryRequirement, StoryScene, StoryState } from '../contracts/core/story.js';
import type { ChapterId } from '../contracts/core/ids.js';
import { grantUnlock } from './growth.js';

export const emptyStory = (enabled = true): StoryState => ({
  enabled, choices: {}, milestones: [], depths: {}, scenes: [], seenScenes: [], awaitingChapterClose: false, awaitingEndingChoice: false,
});

export const chapterStory = (ctx: RunContext): StoryChapterDef | null => ctx.state.story.enabled
  ? ctx.defs.reader('storyChapter').all().find(d => d.chapterId === ctx.state.progress.chapterId) ?? null : null;

export const meetsStory = (requirements: readonly StoryRequirement[], ctx: RunContext): boolean =>
  requirements.length === 0 || (ctx.state.story.enabled && requirements.every(r => r.kind === 'choice'
    ? ctx.state.story.choices[r.node] === r.option : ctx.state.story.milestones.includes(r.id)));

export const scheduledStory = (ctx: RunContext): StoryNode | null => chapterStory(ctx)?.nodes
  .find(n => n.turn === ctx.state.progress.turnInChapter) ?? null;

export const unchosenStory = (ctx: RunContext): StoryNode | null => {
  const node = scheduledStory(ctx);
  return node && ctx.state.story.choices[node.id] === undefined ? node : null;
};

export const pendingScene = (ctx: RunContext): StoryScene | null => ctx.state.story.scenes[0] ?? null;
export const awaitingChapterClose = (ctx: RunContext): boolean => ctx.state.story.awaitingChapterClose;
export const awaitingEndingChoice = (ctx: RunContext): boolean => ctx.state.story.awaitingEndingChoice;
export const setEndingChoice = (waiting: boolean, ctx: RunContext): RunState => ({
  ...ctx.state, story: { ...ctx.state.story, awaitingEndingChoice: waiting },
});

const enqueue = (scenes: readonly StoryScene[], state: RunState): RunState => ({
  ...state, story: { ...state.story, scenes: [...state.story.scenes,
    ...scenes.filter(s => !state.story.seenScenes.includes(s.id) && !state.story.scenes.some(x => x.id === s.id))] },
});

export const enterStory = (ctx: RunContext): RunState => {
  const chapter = chapterStory(ctx);
  return chapter && ctx.state.progress.turnInChapter === 1 ? enqueue([chapter.opening], ctx.state) : ctx.state;
};

export function commitStory(nodeId: string, optionId: string, ctx: RunContext): RunState {
  const node = unchosenStory(ctx);
  if (pendingScene(ctx) || !node || node.id !== nodeId || !node.options.some(o => o.id === optionId)) {
    throw new Error('主線選擇無效或已經完成');
  }
  const state = { ...ctx.state, story: { ...ctx.state.story, choices: { ...ctx.state.story.choices, [node.id]: optionId } } };
  const response = node.options.find(o => o.id === optionId)?.response;
  return response && node.responseTiming !== 'chapterEnd' ? enqueue([response], state) : state;
}

/** Called after every stage, before campaign.clear; later defeat must never erase a rescue. */
export function recordStoryDepth(chapterId: ChapterId, cleared: number, ctx: RunContext): RunState {
  const depth = Math.max(ctx.state.story.depths[String(chapterId)] ?? 0, cleared);
  const milestones = (ctx.state.story.enabled ? chapterStory(ctx) : null)?.milestones.filter(m => depth >= m.minCleared
    && meetsStory(m.requirements, ctx) && !ctx.state.story.milestones.includes(m.id)) ?? [];
  const state: RunState = { ...ctx.state, story: { ...ctx.state.story,
    depths: { ...ctx.state.story.depths, [String(chapterId)]: depth },
    milestones: [...ctx.state.story.milestones, ...milestones.map(m => m.id)],
  } };
  return enqueue(milestones.map(m => m.scene), state);
}

export function closeStoryChapter(ctx: RunContext): RunState {
  const chapter = chapterStory(ctx);
  if (!chapter) return ctx.state;
  const after = chapter.aftermaths.find(a => meetsStory(a.requirements, ctx));
  if (!after) throw new Error('章末劇情缺少兜底');
  const responses = chapter.nodes.filter(n => n.responseTiming === 'chapterEnd').flatMap(n => {
    const response = n.options.find(o => o.id === ctx.state.story.choices[n.id])?.response;
    return response ? [response] : [];
  });
  return enqueue([...responses, after.scene], { ...ctx.state, story: { ...ctx.state.story, awaitingChapterClose: true } });
}

export function acknowledgeStory(sceneId: string, ctx: RunContext): RunState {
  const scene = pendingScene(ctx);
  if (!scene || scene.id !== sceneId) throw new Error('劇情場景已變更');
  const state = grantStoryTeachings(scene, ctx);
  return { ...state, story: { ...state.story, scenes: state.story.scenes.slice(1),
    seenScenes: [...state.story.seenScenes, scene.id] } };
}

/** Pure preview and settlement share the same teaching rules. */
export function grantStoryTeachings(scene: StoryScene, ctx: RunContext): RunState {
  return (scene.teachings ?? []).reduce((state, lesson, index) =>
    grantUnlock(lesson.trait, lesson.skill, { ...ctx, state }, 'story/' + scene.id + '/' + index), ctx.state);
}

export const finishStoryChapter = (ctx: RunContext): RunState => ({
  ...ctx.state, story: { ...ctx.state.story, awaitingChapterClose: false },
});

export const stageStoryKeys = (ctx: RunContext) => chapterStory(ctx)?.battleVariants
  .find(v => meetsStory(v.requirements, ctx))?.briefKeys;

export const storyHistory = (ctx: RunContext) => ctx.state.story;
