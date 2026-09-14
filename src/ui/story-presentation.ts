import type { StoryBeat, StoryNode, StoryScene } from '../contracts/core/story.js';

export interface StoryPage { readonly speaker: string | null; readonly text: string }
/** Keep each page inside the compact dialogue box, including unpunctuated text. */
export function storyPages(source: Pick<StoryScene | StoryNode, 'bodyKey' | 'beats'>, text: (key: string) => string): StoryPage[] {
  const beats: readonly StoryBeat[] = source.beats?.length ? source.beats : [{ speaker: null, textKey: source.bodyKey }];
  return beats.flatMap(beat => {
    const parts = text(String(beat.textKey)).match(/[^。！？\n]+[。！？\n]*|[。！？\n]+/g) ?? [];
    const pages: string[] = [];
    for (const part of parts) {
      const previous = pages.at(-1);
      if (previous && previous.length + part.length <= 68) pages[pages.length - 1] += part;
      else for (let i = 0; i < part.length; i += 68) pages.push(part.slice(i, i + 68));
    }
    return pages.filter(p => p.trim()).map(value => ({ speaker: beat.speaker, text: value.trim() }));
  });
}
