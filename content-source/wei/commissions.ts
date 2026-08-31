import type { Condition, EffectRef } from '../../src/contracts/core/effects.js';
import type { EventDef, EventOptionDef, EventReward } from '../../src/contracts/core/definitions.js';
import {
  dcCurveId, effectId, eventDefId, itemId, itemPoolId, paramPoolId,
} from '../../src/contracts/core/ids.js';
import type { Attr, CareerLine, Rarity } from '../../src/contracts/core/primitives.js';
import { asKey } from '../authoring.js';
import { STAGE_MIN } from '../core/config/affinity.js';
import { FX } from '../core/effects/ids.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;
const slot = (name: string, pool: string) => ({ name, poolId: paramPoolId(pool) });
const EASY = dcCurveId('dc:easy');
const NORMAL = dcCurveId('dc:normal');
const HARD = dcCurveId('dc:hard');
// 權重由檔次決定（見 core/events/commissions.ts）：
//   本維 0.8→1.1→1.4，順帶 0.3→0.4→0.5。四項全部同向遞增。
const p = (attr: Attr, weight: number) => ({ attr, weight });

export const IN_WEI: Condition = { type: 'faction', value: WEI_F };

/** high 檔的門檻。與 core 同一條規則：該線官階 ≥ 稀有度 ＋ 1（17 §5）。 */
const gate = (line: CareerLine, rarity: Rarity): Condition =>
  ({ type: 'statGte', stat: `career.${line}`, value: rarity + 1 });

/**
 * 魏的委託。
 *
 * 陣營包【只添菜，不承擔覆蓋責任】：(維 × 稀有度) 每一桶的無門檻保底
 * 一律由 pack:core 提供，否則 pack:core 單獨載入時會有抽不到的組合
 * （ARCHITECTURE §2.12：依賴方向只能是陣營包 → core）。
 */
export const weiCommissions: readonly EventDef[] = [
  weiDef('event', 'event:wei.review', {
    eventDefId: eventDefId('event:wei.review'),
    trigger: { kind: 'commission', attr: 'lead', rarity: 2 },
    unique: false, collectible: false, weight: 34,
    titleKey: k('event.wei.review.title'),
    bodyKey: k('event.wei.review.body'),
    paramSlots: [slot('patron', 'pool:patron')],
    requirements: [IN_WEI],
    options: [
      {
        tier: 'low', labelKey: k('event.wei.review.opt.borrow'), requirements: [],
        check: { attr: 'lead', dcCurveId: EASY },
        practice: [p('lead', 0.8), p('pol', 0.3)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 12 }],
      },
      {
        tier: 'mid', labelKey: k('event.wei.review.opt.drill'), requirements: [],
        check: { attr: 'lead', dcCurveId: NORMAL },
        practice: [p('lead', 1.1), p('war', 0.4)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 20 }],
      },
      {
        tier: 'high', labelKey: k('event.wei.review.opt.contest'), requirements: [gate('martial', 2)],
        check: { attr: 'lead', dcCurveId: HARD },
        practice: [p('lead', 1.4), p('war', 0.5)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 32 }],
      },
    ],
  }),
  weiDef('event', 'event:wei.subdue', {
    eventDefId: eventDefId('event:wei.subdue'),
    trigger: { kind: 'commission', attr: 'war', rarity: 2 },
    unique: false, collectible: false, weight: 34,
    titleKey: k('event.wei.subdue.title'),
    bodyKey: k('event.wei.subdue.body'),
    paramSlots: [slot('place', 'pool:place'), slot('bandit', 'pool:bandit'), slot('patron', 'pool:patron')],
    requirements: [IN_WEI],
    options: [
      {
        tier: 'low', labelKey: k('event.wei.subdue.opt.pacify'), requirements: [],
        check: { attr: 'war', dcCurveId: EASY },
        practice: [p('war', 0.8), p('lead', 0.3)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 12 }],
      },
      {
        tier: 'mid', labelKey: k('event.wei.subdue.opt.strike'), requirements: [],
        check: { attr: 'war', dcCurveId: NORMAL },
        practice: [p('war', 1.1), p('lead', 0.4)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 20 }],
      },
      {
        tier: 'high', labelKey: k('event.wei.subdue.opt.capture'), requirements: [gate('martial', 2)],
        check: { attr: 'war', dcCurveId: HARD },
        practice: [p('war', 1.4), p('lead', 0.5)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 32 }],
      },
    ],
  }),
  weiDef('event', 'event:wei.procure', {
    eventDefId: eventDefId('event:wei.procure'),
    trigger: { kind: 'commission', attr: 'int', rarity: 2 },
    unique: false, collectible: false, weight: 34,
    titleKey: k('event.wei.procure.title'),
    bodyKey: k('event.wei.procure.body'),
    paramSlots: [slot('goods', 'pool:goods'), slot('patron', 'pool:patron')],
    requirements: [IN_WEI],
    options: [
      {
        tier: 'low', labelKey: k('event.wei.procure.opt.requisition'), requirements: [],
        check: { attr: 'int', dcCurveId: EASY },
        practice: [p('int', 0.8), p('pol', 0.3)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 12 }],
      },
      {
        tier: 'mid', labelKey: k('event.wei.procure.opt.buy'), requirements: [],
        check: { attr: 'int', dcCurveId: NORMAL },
        practice: [p('int', 1.1), p('pol', 0.4)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 20 }],
      },
      {
        tier: 'high', labelKey: k('event.wei.procure.opt.route'), requirements: [gate('civil', 2)],
        check: { attr: 'int', dcCurveId: HARD },
        practice: [p('int', 1.4), p('pol', 0.5)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 32 }],
      },
    ],
  }),
  weiDef('event', 'event:wei.reclaim', {
    eventDefId: eventDefId('event:wei.reclaim'),
    trigger: { kind: 'commission', attr: 'pol', rarity: 3 },
    unique: false, collectible: false, weight: 30,
    titleKey: k('event.wei.reclaim.title'),
    bodyKey: k('event.wei.reclaim.body'),
    paramSlots: [slot('place', 'pool:place'), slot('patron', 'pool:patron')],
    // 屯田是有官身才輪得到的差事。core 那一桶有無門檻保底，因此加門檻是安全的。
    requirements: [IN_WEI, { type: 'statGte', stat: 'career.civil', value: 2 }],
    options: [
      {
        tier: 'low', labelKey: k('event.wei.reclaim.opt.conscript'), requirements: [],
        check: { attr: 'pol', dcCurveId: EASY },
        practice: [p('pol', 0.8), p('lead', 0.3)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 12 }],
      },
      {
        tier: 'mid', labelKey: k('event.wei.reclaim.opt.settle'), requirements: [],
        check: { attr: 'pol', dcCurveId: NORMAL },
        practice: [p('pol', 1.1), p('int', 0.4)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 20 }],
      },
      {
        tier: 'high', labelKey: k('event.wei.reclaim.opt.office'), requirements: [gate('civil', 3)],
        check: { attr: 'pol', dcCurveId: HARD },
        practice: [p('pol', 1.4), p('int', 0.5)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 32 }],
      },
    ],
  }),
];

// ══ 人物委託 · 十二則（19 §7）══════════════════════════
//
// 名士的第三個管道。除了人物事件之外，每位名士還【往委託池裡放一則自己的
// 委託】—— 它走委託那一拍，不是人物事件那一拍。
//
// ── 這一整套不需要新機制 ★ ──────────────────────────
//
// 一則人物委託就是「`requirements` 指名了某位名士 ＋ 好感門檻、而且 `unique`」
// 的普通委託。兩者都已經存在，因此它直接落進 (維 × 稀有度) 的桶裡，
// 和其他委託一起抽。每一桶的無門檻保底仍由 core 提供，所以不會被濾空。
//
// ── 好感 40 才進池 ──────────────────────────────────
//
// 那一階原本是空的：20 給入門事件、60 開站位、80 給鏈末。
// 人物委託補上 40，於是在站位層打開【之前】就有回報 ——
// 那七個回合的投資不再全部押在最後一刻。
//
// ── 最難檔掉什麼 ────────────────────────────────────
//
//   ★3 以上的名士  他自己的高階道具（機率）—— 與鏈末的保證掉落是兩條路：
//                   鏈末要莫逆 80 但保證，人物委託只要友好 40 但看運氣
//   ★2 以下的名士  低階道具
//   賈詡・陳群      【當局獎勵】—— 不是每個人都該給道具，十二則裡若八則
//                   都掉遺物那是公式不是設計

/** 這位名士的好感 ≥ 某階。不在陣容時好感為 0，因此同一條也擋掉「他不在」。 */
const needs = (who: string, stage: keyof typeof STAGE_MIN): Condition =>
  ({ type: 'statGte', stat: `affinity.notable:${who}`, value: STAGE_MIN[stage] });

/** 機率掉一件道具。鏈末的保證掉落寫在 notable-events.ts。 */
const dropItem = (name: string, chance: number): EventReward =>
  ({ kind: 'item', itemId: itemId(`item:${name}`), chance });

const dropLow = (chance: number): EventReward =>
  ({ kind: 'itemPool', poolId: itemPoolId('pool:item.low'), chance });

interface NcSpec {
  readonly who: string;
  readonly name: string;
  readonly attr: Attr;
  readonly rarity: Rarity;
  readonly line: CareerLine;
  /** 順帶磨練到的另一維。 */
  readonly sub: Attr;
  /** 最難檔的額外獎勵。 */
  readonly prize: readonly EventReward[];
}

const boon = (funcType: EffectRef['funcType'], referId: number): EventReward =>
  ({ kind: 'boon', ref: { funcType, referId: effectId(referId) } });

const LOW_MERIT = 12;
const MID_MERIT = 20;
const HIGH_MERIT = 32;

/**
 * 三檔一律檢定該委託自己的維，四項同向遞增（與 core 同一條規則）。
 * 差別只在最難檔多掛一份獎勵 —— 那正是人物委託的賣點。
 */
const ncOptions = (s: NcSpec): readonly EventOptionDef[] => [
  {
    tier: 'low', labelKey: k(`event.wei.nc.${s.name}.opt.low`), requirements: [],
    check: { attr: s.attr, dcCurveId: EASY },
    practice: [p(s.attr, 0.8), p(s.sub, 0.3)],
    rewards: [{ kind: 'merit', merit: s.line, amount: LOW_MERIT }],
  },
  {
    tier: 'mid', labelKey: k(`event.wei.nc.${s.name}.opt.mid`), requirements: [],
    check: { attr: s.attr, dcCurveId: NORMAL },
    practice: [p(s.attr, 1.1), p(s.sub, 0.4)],
    rewards: [{ kind: 'merit', merit: s.line, amount: MID_MERIT }],
  },
  {
    tier: 'high', labelKey: k(`event.wei.nc.${s.name}.opt.high`), requirements: [gate(s.line, s.rarity)],
    check: { attr: s.attr, dcCurveId: HARD },
    practice: [p(s.attr, 1.4), p(s.sub, 0.5)],
    rewards: [{ kind: 'merit', merit: s.line, amount: HIGH_MERIT }, ...s.prize],
  },
];

const notableCommission = (s: NcSpec): EventDef =>
  weiDef('event', `event:wei.nc.${s.name}`, {
    eventDefId: eventDefId(`event:wei.nc.${s.name}`),
    trigger: { kind: 'commission', attr: s.attr, rarity: s.rarity },
    // 【一輪最多觸發一次】。unique 已經存在，不需要為它多一個欄位。
    unique: true, collectible: true, weight: 26,
    titleKey: k(`event.wei.nc.${s.name}.title`),
    bodyKey: k(`event.wei.nc.${s.name}.body`),
    paramSlots: [],
    requirements: [IN_WEI, needs(s.who, 'friendly')],
    options: ncOptions(s),
  });

const NOTABLE_COMMISSIONS: readonly NcSpec[] = [
  // 統
  { who: 'caocao', name: 'edict', attr: 'lead', rarity: 4, line: 'martial', sub: 'pol',
    prize: [dropItem('mengde', 0.35)] },
  { who: 'zhangliao', name: 'liaocomes', attr: 'lead', rarity: 4, line: 'martial', sub: 'war',
    prize: [dropItem('xiaoyaojin', 0.35)] },
  { who: 'yujin', name: 'stockade', attr: 'lead', rarity: 3, line: 'martial', sub: 'pol',
    prize: [dropLow(0.5)] },
  // 武
  { who: 'xiahoudun', name: 'oversee', attr: 'war', rarity: 4, line: 'martial', sub: 'lead',
    prize: [dropItem('qinggang', 0.35)] },
  { who: 'dianwei', name: 'nightguard', attr: 'war', rarity: 3, line: 'martial', sub: 'lead',
    prize: [dropItem('halberd', 0.4)] },
  { who: 'lejin', name: 'breach', attr: 'war', rarity: 2, line: 'martial', sub: 'lead',
    prize: [dropLow(0.5)] },
  // 智
  { who: 'guojia', name: 'foresee', attr: 'int', rarity: 4, line: 'civil', sub: 'pol',
    prize: [dropItem('fengxiao', 0.35)] },
  // 賈詡【當局獎勵】：本輪剩餘回合，★1／★2 委託直接升為 ★3。
  // 道具做不到這件事 —— 道具只能持續加速，當局獎勵能一次性改寫本輪的規則。
  { who: 'jiaxu', name: 'counsel', attr: 'int', rarity: 4, line: 'civil', sub: 'war',
    prize: [boon('RarityFloor', FX.rarityFloor3)] },
  { who: 'chengyu', name: 'scout', attr: 'int', rarity: 3, line: 'civil', sub: 'pol',
    prize: [dropLow(0.5)] },
  // 政
  { who: 'xunyu', name: 'recommend', attr: 'pol', rarity: 4, line: 'civil', sub: 'int',
    prize: [dropItem('wangzuo', 0.35)] },
  // 陳群【當局獎勵】：陣容全員好感 +15。一口氣把六個人各推近 2.5 次同框 ——
  // 那是直接打在好感 60 那道門檻上，而道具只能慢慢加速。
  { who: 'chenqun', name: 'rank', attr: 'pol', rarity: 3, line: 'civil', sub: 'int',
    prize: [{ kind: 'affinity', notableId: null, amount: 20 }] },
  { who: 'maojie', name: 'select', attr: 'pol', rarity: 3, line: 'civil', sub: 'int',
    prize: [dropLow(0.5)] },
];

export const weiNotableCommissions: readonly EventDef[] =
  NOTABLE_COMMISSIONS.map(notableCommission);
