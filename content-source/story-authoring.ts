import type { StoryBeat, StoryScene } from '../src/contracts/core/story.js';
import { asKey } from './authoring.js';

/** Split authored quotation marks at build time; speakers are explicitly assigned by the script editor. */
export function storyWriter(texts: Record<string, string>) {
  const text = (key: string, body: string) => { texts[key] = body; return asKey(key); };
  const beats = (id: string, body: string, speakers: readonly (string | null)[] = []): StoryBeat[] => {
    const rows: StoryBeat[] = [];
    let cursor = 0, quote = 0;
    const add = (value: string, speaker: string | null) => {
      if (!value.trim()) return;
      const previous = rows.at(-1);
      if (previous && previous.speaker === speaker) texts[String(previous.textKey)] += value.trim();
      else rows.push({ speaker, textKey: text(`${id}.line.${rows.length}`, value.trim()) });
    };
    for (const match of body.matchAll(/「([^」]*)」/g)) {
      add(body.slice(cursor, match.index), null);
      const speaker = speakers[quote++] ?? null;
      add(speaker ? match[1]! : match[0], speaker);
      cursor = match.index! + match[0].length;
    }
    add(body.slice(cursor), null);
    if (speakers.length > quote) throw new Error(`劇本 ${id} 的說話者多於台詞`);
    return rows;
  };
  const scene = (id: string, title: string, body: string, speakers: readonly (string | null)[] = [], teachings?: StoryScene['teachings']): StoryScene => ({
    id, titleKey: text(`${id}.title`, title), bodyKey: text(`${id}.body`, body), beats: beats(id, body, speakers),
    ...(teachings?.length ? { teachings } : {}),
  });
  return { text, beats, scene };
}
