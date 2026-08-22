import type {
  ChapterDef, ChapterSequenceDef, MajorCheckDef,
} from '../../src/contracts/core/definitions.js';
import { chapterId, majorCheckId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;

// ── 大檢定 DC 反推（單動作回合制）────────────────────
// 舊值反推自「每回合都鍛鍊」的成長模型 —— 雙槽制下事件不花回合，所以那是唯一的成長速度。
// 單動作回合制把事件的代價變成一整個鍛鍊回合，於是【任何參與事件的玩家】
// 都達不到舊模型的檢定值，大檢定會變成「做事就等於死」。
//
// 新值不再用手算的成長模型，而是【量出來的】：以「三成回合做事、專精主檢定屬性」
// 的參考打法跑 150 輪，記下各章「穩」檔的實際檢定值（見 HANDOFF 的掃描表）：
//
//   黃巾 104 ／ 虎牢 252 ／ 官渡 233 ／ 平定河北 660
//
// 官渡低於虎牢不是筆誤 —— 它的主屬性換成【智】，玩家等於從第 3 章才開始練那一維。
// 各檢定的 DC 只能跟同一個主屬性的成長比，不能跨章橫向比較。
//
// 三檔各取參考值的 0.61 ／ 0.96 ／ 1.31 倍
// （＝穩約九成、進約五成半、險約兩成的成功率；比例骰的封閉式見 18 §8.2）。
// 全押鍛鍊者的檢定值遠高於參考值，「進」對他們是可賭的 —— 難度自選才繼續是決策。
//   本檔：官渡＝ch3（主屬性換成智）、平定河北＝ch4
export const weiChecks: readonly MajorCheckDef[] = [
  weiDef('majorCheck', 'check:wei.guandu', {
    checkId: majorCheckId('check:wei.guandu'),
    primaryAttr: 'int', secondaryAttr: 'pol',
    enemyNotables: [],
    tiers: {
      safe: {
        dc: 142, requirements: [], briefKey: k('check.wei.guandu.brief.safe'),
        rewards: [{ kind: 'merit', merit: 'martial', amount: 15 }],
      },
      normal: {
        dc: 224, requirements: [], briefKey: k('check.wei.guandu.brief.normal'),
        rewards: [
          { kind: 'merit', merit: 'martial', amount: 30 },
          { kind: 'attr', attr: 'int', amount: 20 },
        ],
      },
      hard: {
        dc: 305,
        requirements: [{ type: 'statGte', stat: 'career.civil', value: 2 }],
        briefKey: k('check.wei.guandu.brief.hard'),
        rewards: [
          { kind: 'merit', merit: 'martial', amount: 50 },
          { kind: 'merit', merit: 'civil', amount: 18 },
          { kind: 'attr', attr: 'int', amount: 40 },
        ],
      },
    },
  }),
  weiDef('majorCheck', 'check:wei.hebei', {
    checkId: majorCheckId('check:wei.hebei'),
    primaryAttr: 'war', secondaryAttr: 'pol',
    enemyNotables: [],
    tiers: {
      safe: {
        dc: 403, requirements: [], briefKey: k('check.wei.hebei.brief.safe'),
        rewards: [{ kind: 'merit', merit: 'martial', amount: 20 }],
      },
      normal: {
        dc: 634, requirements: [], briefKey: k('check.wei.hebei.brief.normal'),
        rewards: [
          { kind: 'merit', merit: 'martial', amount: 40 },
          { kind: 'attr', attr: 'war', amount: 25 },
        ],
      },
      hard: {
        dc: 865,
        requirements: [{ type: 'statGte', stat: 'career.martial', value: 3 }],
        briefKey: k('check.wei.hebei.brief.hard'),
        rewards: [
          { kind: 'merit', merit: 'martial', amount: 70 },
          { kind: 'merit', merit: 'civil', amount: 25 },
          { kind: 'attr', attr: 'war', amount: 50 },
        ],
      },
    },
  }),
];

export const weiChapters: readonly ChapterDef[] = [
  weiDef('chapter', 'ch:wei.guandu', {
    chapterId: chapterId('ch:wei.guandu'),
    factionId: WEI_F, order: 1, length: 8,
    titleKey: k('chapter.wei.guandu.title'),
    majorCheckId: majorCheckId('check:wei.guandu'),
    onPass: null,
  }),
  weiDef('chapter', 'ch:wei.hebei', {
    chapterId: chapterId('ch:wei.hebei'),
    factionId: WEI_F, order: 2, length: 8,
    titleKey: k('chapter.wei.hebei.title'),
    majorCheckId: majorCheckId('check:wei.hebei'),
    onPass: null,
  }),
];

export const weiSequence: ChapterSequenceDef = weiDef('chapterSequence', 'seq:wei', {
  factionId: WEI_F,
  chapters: [chapterId('ch:wei.guandu'), chapterId('ch:wei.hebei')],
});
