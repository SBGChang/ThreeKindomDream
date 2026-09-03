import type { EndingDef } from '../../../src/contracts/core/definitions.js';
import { endingId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

/**
 * 結局是夢裡真正發生的事，達成之後才夢醒（GDD §2.2）。
 *
 * ── 〈戰歿〉已刪除 ★ ────────────────────────────────
 * 戰役失敗不再夢醒（獎勵減半、章節照過），所以**局內沒有任何死亡路徑**了。
 * 〈戰歿〉的本文寫的是「最後看見的是塵土」—— 那需要一個死亡，
 * 而它已經不存在。留著就是一個永遠拿不到的圖鑑格。
 *
 * 要把它拿回來只需要一個死亡來源（例如「一關未過就戰敗 ＝ 全軍覆沒」），
 * 那是一個設計決定，不是一行程式。
 *
 * 善惡名退場之後：
 *   - 每個結局只有【一段】本文（原本按善惡三分歧）
 *   - 「流放」整個刪除 —— 它唯一的觸發條件是善惡名 ≤ −40，
 *     少了那個條件它就只是兜底結局的複本
 * 每個 trigger 型別都必須有一筆 requirements 為空的兜底 —— 由驗證強制（25 §3.1）。
 * 中央高官（丞相、三公、大將軍）是結局稱號，不是局內可爬的官階。
 */
export const coreEndings: readonly EndingDef[] = [
  // ── 圓夢類 ────────────────────────────────────────
  coreDef('ending', 'ending:pillar', {
    ending: endingId('ending:pillar'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 120,
    requirements: [
      { type: 'statGte', stat: 'career.civil', value: 5 },
      { type: 'statGte', stat: 'career.martial', value: 5 },
    ],
    titleKey: k('ending.pillar.title'), bodyKey: k('ending.pillar.body'),
    pointsMultiplier: 2.0, collectible: true,
  }),
  coreDef('ending', 'ending:chancellor', {
    ending: endingId('ending:chancellor'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 100,
    requirements: [{ type: 'statGte', stat: 'career.civil', value: 6 }],
    titleKey: k('ending.chancellor.title'), bodyKey: k('ending.chancellor.body'),
    pointsMultiplier: 1.8, collectible: true,
  }),
  coreDef('ending', 'ending:grand-general', {
    ending: endingId('ending:grand-general'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 99,
    requirements: [{ type: 'statGte', stat: 'career.martial', value: 6 }],
    titleKey: k('ending.grand-general.title'), bodyKey: k('ending.grand-general.body'),
    pointsMultiplier: 1.8, collectible: true,
  }),
  coreDef('ending', 'ending:minister', {
    ending: endingId('ending:minister'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 50,
    requirements: [{ type: 'statGte', stat: 'career.civil', value: 3 }],
    titleKey: k('ending.minister.title'), bodyKey: k('ending.minister.body'),
    pointsMultiplier: 1.4, collectible: true,
  }),
  coreDef('ending', 'ending:general', {
    ending: endingId('ending:general'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 49,
    requirements: [{ type: 'statGte', stat: 'career.martial', value: 3 }],
    titleKey: k('ending.general.title'), bodyKey: k('ending.general.body'),
    pointsMultiplier: 1.4, collectible: true,
  }),
  // 兜底：走完全部大事件但官階不足 —— 圓夢是進度成就，稱號是養成成就（25 §3.2）
  coreDef('ending', 'ending:accomplished', {
    ending: endingId('ending:accomplished'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 1,
    requirements: [],
    titleKey: k('ending.accomplished.title'), bodyKey: k('ending.accomplished.body'),
    pointsMultiplier: 1.2, collectible: true,
  }),

  // ── 沒有圓夢 ──────────────────────────────────────
  //
  // ★ 這兩筆原本是【中止類】：由 checkFailed 觸發，也就是大檢定失敗夢醒。
  // 戰役失敗不再夢醒之後那個 trigger 沒有來源了，於是它們改成
  // **走完了，但官階低到沒有稱號可領**。
  //
  // 那正是 D7 一直想做的事：**膽小與失手的懲罰是難看的結局，不是死亡。**
  // 現在它是唯一的懲罰，所以這兩階必須真的拿得到 ——
  // 第一輪的玩家撞牆停在第二三關，官階就會落在這裡。
  //
  // 門檻嚴的排前面（priority 高）：白身 > 罷官 > 功成。
  coreDef('ending', 'ending:commoner', {
    ending: endingId('ending:commoner'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 6,
    requirements: [
      { type: 'statLte', stat: 'career.civil', value: 1 },
      { type: 'statLte', stat: 'career.martial', value: 1 },
    ],
    titleKey: k('ending.commoner.title'), bodyKey: k('ending.commoner.body'),
    pointsMultiplier: 1.0, collectible: true,
  }),
  coreDef('ending', 'ending:dismissed', {
    ending: endingId('ending:dismissed'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 5,
    requirements: [
      { type: 'statLte', stat: 'career.civil', value: 2 },
      { type: 'statLte', stat: 'career.martial', value: 2 },
    ],
    titleKey: k('ending.dismissed.title'), bodyKey: k('ending.dismissed.body'),
    pointsMultiplier: 1.05, collectible: true,
  }),

  // ── 無陣營可投 ────────────────────────────────────
  coreDef('ending', 'ending:hermit', {
    ending: endingId('ending:hermit'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'noFactionEligible' }, priority: 0,
    requirements: [],
    titleKey: k('ending.hermit.title'), bodyKey: k('ending.hermit.body'),
    pointsMultiplier: 1.1, collectible: true,
  }),
];
