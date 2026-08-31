import type {
  ChapterDef, ChapterSequenceDef, MajorCheckDef,
} from '../../src/contracts/core/definitions.js';
import { chapterId, majorCheckId } from '../../src/contracts/core/ids.js';
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
export const weiChecks: readonly MajorCheckDef[] = [
  weiDef('majorCheck', 'check:wei.hulao', {
    checkId: majorCheckId('check:wei.hulao'),
    enemyNotables: [],
    routes: {
      martial: {
        primaryAttr: 'war', secondaryAttr: 'int',
        tiers: {
          safe: {
            dc: 155, requirements: [], briefKey: k('check.wei.hulao.martial.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'martial', amount: 16 }],
          },
          normal: {
            dc: 240, requirements: [], briefKey: k('check.wei.hulao.martial.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 32 },
              { kind: 'attr', attr: 'war', amount: 18 },
            ],
          },
          hard: {
            dc: 330, requirements: [], briefKey: k('check.wei.hulao.martial.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 55 },
              { kind: 'merit', merit: 'civil', amount: 12 },
              { kind: 'attr', attr: 'war', amount: 40 },
            ],
          },
        },
      },
      civil: {
        primaryAttr: 'int', secondaryAttr: 'pol',
        tiers: {
          safe: {
            dc: 155, requirements: [], briefKey: k('check.wei.hulao.civil.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'civil', amount: 35 }],
          },
          normal: {
            dc: 240, requirements: [], briefKey: k('check.wei.hulao.civil.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 65 },
              { kind: 'attr', attr: 'int', amount: 18 },
            ],
          },
          hard: {
            dc: 330, requirements: [], briefKey: k('check.wei.hulao.civil.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 110 },
              { kind: 'merit', merit: 'martial', amount: 25 },
              { kind: 'attr', attr: 'int', amount: 40 },
            ],
          },
        },
      },
    },
  }),
  weiDef('majorCheck', 'check:wei.guandu', {
    checkId: majorCheckId('check:wei.guandu'),
    enemyNotables: [],
    routes: {
      martial: {
        primaryAttr: 'war', secondaryAttr: 'pol',
        tiers: {
          safe: {
            dc: 142, requirements: [], briefKey: k('check.wei.guandu.martial.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'martial', amount: 15 }],
          },
          normal: {
            dc: 224, requirements: [], briefKey: k('check.wei.guandu.martial.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 30 },
              { kind: 'attr', attr: 'war', amount: 20 },
            ],
          },
          hard: {
            dc: 305,
            requirements: [{ type: 'statGte', stat: 'career.martial', value: 2 }],
            briefKey: k('check.wei.guandu.martial.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 50 },
              { kind: 'merit', merit: 'civil', amount: 18 },
              { kind: 'attr', attr: 'war', amount: 40 },
            ],
          },
        },
      },
      civil: {
        primaryAttr: 'int', secondaryAttr: 'pol',
        tiers: {
          safe: {
            dc: 142, requirements: [], briefKey: k('check.wei.guandu.civil.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'civil', amount: 15 }],
          },
          normal: {
            dc: 224, requirements: [], briefKey: k('check.wei.guandu.civil.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 30 },
              { kind: 'attr', attr: 'int', amount: 20 },
            ],
          },
          hard: {
            dc: 305,
            requirements: [{ type: 'statGte', stat: 'career.civil', value: 2 }],
            briefKey: k('check.wei.guandu.civil.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 50 },
              { kind: 'merit', merit: 'martial', amount: 18 },
              { kind: 'attr', attr: 'int', amount: 40 },
            ],
          },
        },
      },
    },
  }),
  weiDef('majorCheck', 'check:wei.hebei', {
    checkId: majorCheckId('check:wei.hebei'),
    enemyNotables: [],
    routes: {
      martial: {
        primaryAttr: 'war', secondaryAttr: 'pol',
        tiers: {
          safe: {
            dc: 403, requirements: [], briefKey: k('check.wei.hebei.martial.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'martial', amount: 20 }],
          },
          normal: {
            dc: 634, requirements: [], briefKey: k('check.wei.hebei.martial.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 40 },
              { kind: 'attr', attr: 'war', amount: 25 },
            ],
          },
          hard: {
            dc: 865,
            requirements: [{ type: 'statGte', stat: 'career.martial', value: 3 }],
            briefKey: k('check.wei.hebei.martial.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 70 },
              { kind: 'merit', merit: 'civil', amount: 25 },
              { kind: 'attr', attr: 'war', amount: 50 },
            ],
          },
        },
      },
      civil: {
        primaryAttr: 'int', secondaryAttr: 'pol',
        tiers: {
          safe: {
            dc: 403, requirements: [], briefKey: k('check.wei.hebei.civil.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'civil', amount: 20 }],
          },
          normal: {
            dc: 634, requirements: [], briefKey: k('check.wei.hebei.civil.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 40 },
              { kind: 'attr', attr: 'int', amount: 25 },
            ],
          },
          hard: {
            dc: 865,
            requirements: [{ type: 'statGte', stat: 'career.civil', value: 3 }],
            briefKey: k('check.wei.hebei.civil.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 70 },
              { kind: 'merit', merit: 'martial', amount: 25 },
              { kind: 'attr', attr: 'int', amount: 50 },
            ],
          },
        },
      },
    },
  }),
];

export const weiChapters: readonly ChapterDef[] = [
  weiDef('chapter', 'ch:wei.hulao', {
    chapterId: chapterId('ch:wei.hulao'),
    factionId: WEI_F, order: 1, length: 8,
    titleKey: k('chapter.wei.hulao.title'),
    majorCheckId: majorCheckId('check:wei.hulao'),
    onPass: null,
  }),
  weiDef('chapter', 'ch:wei.guandu', {
    chapterId: chapterId('ch:wei.guandu'),
    factionId: WEI_F, order: 2, length: 8,
    titleKey: k('chapter.wei.guandu.title'),
    majorCheckId: majorCheckId('check:wei.guandu'),
    onPass: null,
  }),
  weiDef('chapter', 'ch:wei.hebei', {
    chapterId: chapterId('ch:wei.hebei'),
    factionId: WEI_F, order: 3, length: 8,
    titleKey: k('chapter.wei.hebei.title'),
    majorCheckId: majorCheckId('check:wei.hebei'),
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
