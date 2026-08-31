import type {
  ChapterDef, ChapterSequenceDef, MajorCheckDef,
} from '../../../src/contracts/core/definitions.js';
import { chapterId, majorCheckId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

// ── 大檢定：文武各三檔，合計六個選項（18 §2.2）────────
//
// 每個大事件有兩條路線。同一場黃巾之亂，可以陣前破賊（武路：武／魅），
// 也可以安民斷糧（文路：智／政）—— 路線各有自己的屬性組、DC 與獎勵線。
//
// 【DC 目前兩路線相同，這是刻意的占位值】：
//   單一路線的舊值是量出來的（以「三成回合做事、專精主檢定屬性」跑 150 輪）：
//     黃巾 104 ／ 虎牢 252 ／ 官渡 233 ／ 平定河北 660
//   三檔取 0.61 ／ 0.96 ／ 1.31 倍（＝穩約九成、進約五成半、險約兩成）。
//   新增的那一條路線【沒有對應的量測值】，因為過去沒有玩家會走它。
//   兩路線同 DC 代表的是最中性的假設 ——「投資對等者，兩路等難」。
//   要訂出真值必須先跑 `tsx scripts/calibrate.ts`（現已分路線取樣）。
//   憑手感填一組看起來像校準過的數字，比留下明確的占位更糟。
//
// 獎勵線刻意跟著路線走：武路產武功，文路產文功。
// 若兩路都產武功，「走文路」就不會累積文官階，文武雙軌等於沒有入口。
//
// 名聲退場之後大檢定直接發功績，量級對齊陣營章（約一則委託的兩倍）——
// 一章只有一次，不該蓋過十六個回合的累積。
//   本檔：黃巾＝ch1 —— 皇甫嵩帳下，唯一一章無陣營
//
// 虎牢關（討董）已移入各陣營包 —— 從討董起就有陣營，而三家在那一戰的
// 位置完全不同（曹操自領一軍、劉備附公孫瓘、孫堅為先鋒）。
// 同一章由三個包各自寫，比讓 core 端出一份誰都不貼的通用版好。
export const campChecks: readonly MajorCheckDef[] = [
  coreDef('majorCheck', 'check:yellowturban', {
    checkId: majorCheckId('check:yellowturban'),
    // 名士陣容目前只有魏的八人，敵方名士無人可指 ——
    // 「選呂布當玩伴，虎牢關就不能靠他」這條機制留在程式裡等內容（18 §4）。
    enemyNotables: [],
    routes: {
      martial: {
        primaryAttr: 'war', secondaryAttr: 'lead',
        tiers: {
          safe: {
            dc: 60, requirements: [], briefKey: k('check.yellowturban.martial.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'martial', amount: 12 }],
          },
          normal: {
            dc: 100, requirements: [], briefKey: k('check.yellowturban.martial.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 24 },
              { kind: 'attr', attr: 'war', amount: 10 },
            ],
          },
          hard: {
            dc: 135, requirements: [], briefKey: k('check.yellowturban.martial.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'martial', amount: 40 },
              { kind: 'merit', merit: 'civil', amount: 8 },
              { kind: 'attr', attr: 'war', amount: 25 },
            ],
          },
        },
      },
      civil: {
        primaryAttr: 'int', secondaryAttr: 'pol',
        tiers: {
          safe: {
            dc: 60, requirements: [], briefKey: k('check.yellowturban.civil.brief.safe'),
            rewards: [{ kind: 'merit', merit: 'civil', amount: 12 }],
          },
          normal: {
            dc: 100, requirements: [], briefKey: k('check.yellowturban.civil.brief.normal'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 24 },
              { kind: 'attr', attr: 'int', amount: 10 },
            ],
          },
          hard: {
            dc: 135, requirements: [], briefKey: k('check.yellowturban.civil.brief.hard'),
            rewards: [
              { kind: 'merit', merit: 'civil', amount: 40 },
              { kind: 'merit', merit: 'martial', amount: 8 },
              { kind: 'attr', attr: 'int', amount: 25 },
            ],
          },
        },
      },
    },
  }),
];

export const campChapters: readonly ChapterDef[] = [
  coreDef('chapter', 'ch:camp.yellowturban', {
    chapterId: chapterId('ch:camp.yellowturban'),
    factionId: null, order: 1, length: 8,
    titleKey: k('chapter.camp.yellowturban.title'),
    majorCheckId: majorCheckId('check:yellowturban'),
    // 平亂之後，袁紹問你要往哪一路去。從討董起就有陣營（GDD §4.1）。
    onPass: 'chooseFaction',
  }),
];

export const campSequence: ChapterSequenceDef = coreDef('chapterSequence', 'seq:camp', {
  factionId: null,
  chapters: [chapterId('ch:camp.yellowturban')],
});
