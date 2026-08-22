import { attrTexts } from './attrs.js';
import { careerTalentTexts } from './career-talents.js';
import { chapterTexts } from './chapters.js';
import { endingTexts } from './endings.js';
import { eventTexts } from './events.js';
import { notableTexts } from './notables.js';
import { paramTexts } from './params.js';

/** 全部繁體中文文案。缺 key 是建置期問題，不是執行期（06 §3）。 */
export const zhTW: Readonly<Record<string, string>> = {
  ...attrTexts,
  ...paramTexts,
  ...notableTexts,
  ...chapterTexts,
  ...eventTexts,
  ...careerTalentTexts,
  ...endingTexts,
};
