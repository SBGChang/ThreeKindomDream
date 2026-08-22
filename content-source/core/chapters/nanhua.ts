import type {
  ChapterDef, ChapterSequenceDef, MajorCheckDef,
} from '../../../src/contracts/core/definitions.js';
import { chapterId, majorCheckId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

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
//   本檔：黃巾＝ch1、虎牢＝ch2
export const nanhuaChecks: readonly MajorCheckDef[] = [
  coreDef('majorCheck', 'check:yellowturban', {
    checkId: majorCheckId('check:yellowturban'),
    primaryAttr: 'war', secondaryAttr: 'cha',
    // 名士陣容目前只有魏的八人，敵方名士無人可指 ——
    // 「選呂布當玩伴，虎牢關就不能靠他」這條機制留在程式裡等內容（18 §4）。
    enemyNotables: [],
    tiers: {
      safe: {
        dc: 60, requirements: [], briefKey: k('check.yellowturban.brief.safe'),
        rewards: [{ kind: 'fame', fame: 'martial', amount: 20 }],
      },
      normal: {
        dc: 100, requirements: [], briefKey: k('check.yellowturban.brief.normal'),
        rewards: [
          { kind: 'fame', fame: 'martial', amount: 40 },
          { kind: 'attr', attr: 'war', amount: 10 },
        ],
      },
      hard: {
        dc: 135, requirements: [], briefKey: k('check.yellowturban.brief.hard'),
        rewards: [
          { kind: 'fame', fame: 'martial', amount: 70 },
          { kind: 'fame', fame: 'civil', amount: 15 },
          { kind: 'attr', attr: 'war', amount: 25 },
        ],
      },
    },
  }),
  coreDef('majorCheck', 'check:hulao', {
    checkId: majorCheckId('check:hulao'),
    primaryAttr: 'war', secondaryAttr: 'int',
    enemyNotables: [],
    tiers: {
      safe: {
        dc: 155, requirements: [], briefKey: k('check.hulao.brief.safe'),
        rewards: [{ kind: 'fame', fame: 'martial', amount: 35 }],
      },
      normal: {
        dc: 240, requirements: [], briefKey: k('check.hulao.brief.normal'),
        rewards: [
          { kind: 'fame', fame: 'martial', amount: 65 },
          { kind: 'attr', attr: 'war', amount: 18 },
        ],
      },
      hard: {
        dc: 330, requirements: [], briefKey: k('check.hulao.brief.hard'),
        rewards: [
          { kind: 'fame', fame: 'martial', amount: 110 },
          { kind: 'fame', fame: 'civil', amount: 25 },
          { kind: 'attr', attr: 'war', amount: 40 },
        ],
      },
    },
  }),
];

export const nanhuaChapters: readonly ChapterDef[] = [
  coreDef('chapter', 'ch:nanhua.yellowturban', {
    chapterId: chapterId('ch:nanhua.yellowturban'),
    factionId: null, order: 1, length: 8,
    titleKey: k('chapter.nanhua.yellowturban.title'),
    majorCheckId: majorCheckId('check:yellowturban'),
    onPass: null,
  }),
  coreDef('chapter', 'ch:nanhua.hulao', {
    chapterId: chapterId('ch:nanhua.hulao'),
    factionId: null, order: 2, length: 8,
    titleKey: k('chapter.nanhua.hulao.title'),
    majorCheckId: majorCheckId('check:hulao'),
    onPass: 'chooseFaction',
  }),
];

export const nanhuaSequence: ChapterSequenceDef = coreDef('chapterSequence', 'seq:nanhua', {
  factionId: null,
  chapters: [chapterId('ch:nanhua.yellowturban'), chapterId('ch:nanhua.hulao')],
});
