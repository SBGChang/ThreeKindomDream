import type { ChapterDef, ChapterSequenceDef } from '../../../src/contracts/core/definitions.js';
import { chapterId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

export const campChapters: readonly ChapterDef[] = [
  coreDef('chapter', 'ch:camp.yellowturban', {
    chapterId: chapterId('ch:camp.yellowturban'),
    factionId: null, order: 1, length: 8,
    titleKey: k('chapter.camp.yellowturban.title'),
    // 平亂之後，袁紹問你要往哪一路去。從討董起就有陣營（GDD §4.1）。
    onPass: 'chooseFaction',
  }),
];

export const campSequence: ChapterSequenceDef = coreDef('chapterSequence', 'seq:camp', {
  factionId: null,
  chapters: [chapterId('ch:camp.yellowturban')],
});
