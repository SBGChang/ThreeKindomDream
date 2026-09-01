import type { ChapterDef, ChapterSequenceDef } from '../../src/contracts/core/definitions.js';
import { chapterId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;

// ── 大檢定：文武各三檔（18 §2.2）────────────────────
//
// DC 與獎勵線的訂法見 core/chapters/nanhua.ts 的長註解。
// 兩條路線目前同 DC，是【明確的占位值】而非校準結果。
//
// 這裡有一個要特別留意的後果：官渡原本是【智為主】，而 HANDOFF 記過一個
// 意外的好性質 ——「主屬性在章節間變化本身就是對純專精的懲罰」。
// 六選項制把那個懲罰拿掉了：追武的玩家現在可以走官渡的武路，
// 永遠不必面對自己沒練的那一維。純專精的反制需要新的來源（見 HANDOFF）。
//   本檔：虎牢＝ch2（討董，自 core 移入）、官渡＝ch3、平定河北＝ch4
export const weiChapters: readonly ChapterDef[] = [
  weiDef('chapter', 'ch:wei.hulao', {
    chapterId: chapterId('ch:wei.hulao'),
    factionId: WEI_F, order: 1, length: 8,
    titleKey: k('chapter.wei.hulao.title'),
    onPass: null,
  }),
  weiDef('chapter', 'ch:wei.guandu', {
    chapterId: chapterId('ch:wei.guandu'),
    factionId: WEI_F, order: 2, length: 8,
    titleKey: k('chapter.wei.guandu.title'),
    onPass: null,
  }),
  weiDef('chapter', 'ch:wei.hebei', {
    chapterId: chapterId('ch:wei.hebei'),
    factionId: WEI_F, order: 3, length: 8,
    titleKey: k('chapter.wei.hebei.title'),
    onPass: null,
  }),
];

export const weiSequence: ChapterSequenceDef = weiDef('chapterSequence', 'seq:wei', {
  factionId: WEI_F,
  chapters: [
    chapterId('ch:wei.hulao'),
    chapterId('ch:wei.guandu'),
    chapterId('ch:wei.hebei'),
  ],
});
