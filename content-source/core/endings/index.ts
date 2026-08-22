import type { EndingDef } from '../../../src/contracts/core/definitions.js';
import { endingId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const moral = (base: string) => ({
  veryEvil: k(`${base}.evil`),
  neutral: k(`${base}.neutral`),
  veryGood: k(`${base}.good`),
});

/**
 * 結局是夢裡真正發生的事，達成之後才夢醒（GDD §2.2）。
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
    moralVariants: moral('ending.pillar.moral'), pointsMultiplier: 2.0, collectible: true,
  }),
  coreDef('ending', 'ending:chancellor', {
    ending: endingId('ending:chancellor'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 100,
    requirements: [{ type: 'statGte', stat: 'career.civil', value: 6 }],
    titleKey: k('ending.chancellor.title'), bodyKey: k('ending.chancellor.body'),
    moralVariants: moral('ending.chancellor.moral'), pointsMultiplier: 1.8, collectible: true,
  }),
  coreDef('ending', 'ending:grand-general', {
    ending: endingId('ending:grand-general'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 99,
    requirements: [{ type: 'statGte', stat: 'career.martial', value: 6 }],
    titleKey: k('ending.grand-general.title'), bodyKey: k('ending.grand-general.body'),
    moralVariants: moral('ending.grand-general.moral'), pointsMultiplier: 1.8, collectible: true,
  }),
  coreDef('ending', 'ending:minister', {
    ending: endingId('ending:minister'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 50,
    requirements: [{ type: 'statGte', stat: 'career.civil', value: 3 }],
    titleKey: k('ending.minister.title'), bodyKey: k('ending.minister.body'),
    moralVariants: moral('ending.minister.moral'), pointsMultiplier: 1.4, collectible: true,
  }),
  coreDef('ending', 'ending:general', {
    ending: endingId('ending:general'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 49,
    requirements: [{ type: 'statGte', stat: 'career.martial', value: 3 }],
    titleKey: k('ending.general.title'), bodyKey: k('ending.general.body'),
    moralVariants: moral('ending.general.moral'), pointsMultiplier: 1.4, collectible: true,
  }),
  // 兜底：走完全部大事件但官階不足 —— 圓夢是進度成就，稱號是養成成就（25 §3.2）
  coreDef('ending', 'ending:accomplished', {
    ending: endingId('ending:accomplished'), endingKind: 'fullDream', factionId: null,
    trigger: { kind: 'sequenceCompleted' }, priority: 0,
    requirements: [],
    titleKey: k('ending.accomplished.title'), bodyKey: k('ending.accomplished.body'),
    moralVariants: moral('ending.accomplished.moral'), pointsMultiplier: 1.2, collectible: true,
  }),

  // ── 中止類 ────────────────────────────────────────
  coreDef('ending', 'ending:exiled', {
    ending: endingId('ending:exiled'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'checkFailed', attr: 'any' }, priority: 60,
    requirements: [{ type: 'statLte', stat: 'fame.moral', value: -40 }],
    titleKey: k('ending.exiled.title'), bodyKey: k('ending.exiled.body'),
    moralVariants: moral('ending.exiled.moral'), pointsMultiplier: 1.0, collectible: true,
  }),
  coreDef('ending', 'ending:fallen', {
    ending: endingId('ending:fallen'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'checkFailed', attr: 'war' }, priority: 50,
    requirements: [],
    titleKey: k('ending.fallen.title'), bodyKey: k('ending.fallen.body'),
    moralVariants: moral('ending.fallen.moral'), pointsMultiplier: 1.05, collectible: true,
  }),
  coreDef('ending', 'ending:dismissed', {
    ending: endingId('ending:dismissed'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'checkFailed', attr: 'int' }, priority: 49,
    requirements: [],
    titleKey: k('ending.dismissed.title'), bodyKey: k('ending.dismissed.body'),
    moralVariants: moral('ending.dismissed.moral'), pointsMultiplier: 1.05, collectible: true,
  }),
  // 兜底：極早期失敗，官階未起步
  coreDef('ending', 'ending:commoner', {
    ending: endingId('ending:commoner'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'checkFailed', attr: 'any' }, priority: 0,
    requirements: [],
    titleKey: k('ending.commoner.title'), bodyKey: k('ending.commoner.body'),
    moralVariants: moral('ending.commoner.moral'), pointsMultiplier: 1.0, collectible: true,
  }),

  // ── 無陣營可投 ────────────────────────────────────
  coreDef('ending', 'ending:hermit', {
    ending: endingId('ending:hermit'), endingKind: 'aborted', factionId: null,
    trigger: { kind: 'noFactionEligible' }, priority: 0,
    requirements: [],
    titleKey: k('ending.hermit.title'), bodyKey: k('ending.hermit.body'),
    moralVariants: moral('ending.hermit.moral'), pointsMultiplier: 1.1, collectible: true,
  }),
];
