import type { ChapterDef, ChapterSequenceDef } from '../../src/contracts/core/definitions.js';
import { chapterId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;

// ── 章節本身只有骨架 ★ ──────────────────────────────
// 章節現在只帶【順序、長度、標題】—— 章末那一關是獨立的 `campaign` def
// （見 campaigns.ts），靠 chapterId 對上。這樣「換掉一場戰役」不必動章節。
//
// ── 純專精的反制在價格表裡，不在章節安排裡 ★ ────────
// 舊制靠「章節主屬性會換」懲罰純專精：官渡是智為主，追武的人會撞牆。
// 那條懲罰在戰役制下不存在了 —— 玩家自己選帶哪三招，四條路都能打（D19）。
//
// 現在的反制在 32：**階梯計價 ＋ 混合消耗**。
//   專精者前段階梯便宜 → 高數值，但沒有另外兩類經驗，買不起絕階
//   均衡者四類齊全 → 絕階，但高價位帶讓他上不去
// 實測 focus-martial 收在 武93（不是 100）、特質 2.7；
// 追期望值的 greedy-gain 收在 統82 武82、特質 4.2。那是兩種不同的強。
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
