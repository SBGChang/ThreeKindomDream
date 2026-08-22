// 魏的八人。灰盒目前唯一的名士陣容 —— 兒時玩伴池與上司池都是這八個人。
//
// ── 每個人由三層構成 ────────────────────────────────
//   base     從第一回合就生效。專長維 ＋ 站位加成 ＋ 出戰加值。
//            這一層決定「他站在這格值不值得選」。
//   unlocks  養好感度／升星換來的【提升】與【新功能】。
//            20 級一律是專長維經驗（提升），30 起才給新功能，60 取代 20（提升）。
//   eventChain  劇情。只有 ★5 有 —— 手寫成本最高的東西給最想追的人。
//
// ── 專長維的分佈 ────────────────────────────────────
//   武 夏侯惇・典韋・樂進　智 郭嘉・程昱　政 荀彧・于禁　魅 曹操
//
// 魏只有主公一人以魅為專長，這是**陣營性格**不是缺漏：曹魏重才幹輕人望。
// 代價是「交遊」格在多數 run 裡沒人站 —— 補蜀（劉關張）時人望型會自然補上。
import type { NotableDef, NotablePoolDef } from '../../src/contracts/core/definitions.js';
import { effectId, eventDefId, notableId, notablePoolId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { notableBase } from '../core/config/notable-base.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;
const e = effectId;

export const weiNotables: readonly NotableDef[] = [
  // ── ★5 三人：各佔一種定位，都有劇情鏈 ──────────────
  weiDef('notable', 'notable:caocao', {
    notableId: notableId('notable:caocao'), rarity: 5, factionId: WEI_F,
    nameKey: k('notable.caocao.name'),
    // 主公。出戰加值最高（他親自上陣是大事），但不常出現在你的練習場。
    base: notableBase(5, 'cha', { sortieBonus: 12, specialtyWeight: 1.6 }),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1031), supersedes: [], descKey: k('notable.caocao.unlock.20') },
      { affinity: 30, funcType: 'EventRewardBonus', referId: e(2001), supersedes: [], descKey: k('notable.caocao.unlock.30') },
      { affinity: 40, funcType: 'CurrencyBonus', referId: e(7003), supersedes: [], descKey: k('notable.caocao.unlock.40') },
      { affinity: 50, funcType: 'CheckValueBonus', referId: e(6001), supersedes: [], descKey: k('notable.caocao.unlock.50') },
      { affinity: 60, funcType: 'StatModifier', referId: e(1032), supersedes: [20], descKey: k('notable.caocao.unlock.60') },
    ],
    eventChain: [{ stage: 'friendly', eventDefId: eventDefId('event:notable.caocao.trust') }],
  }),
  weiDef('notable', 'notable:xunyu', {
    notableId: notableId('notable:xunyu'), rarity: 5, factionId: WEI_F,
    nameKey: k('notable.xunyu.name'),
    // 王佐之才，就在尚書台 —— 站位傾向最強，你天天見得到他。
    base: notableBase(5, 'pol', { specialtyWeight: 2.6 }),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1021), supersedes: [], descKey: k('notable.xunyu.unlock.20') },
      { affinity: 30, funcType: 'EventDrawModify', referId: e(2101), supersedes: [], descKey: k('notable.xunyu.unlock.30') },
      { affinity: 40, funcType: 'CheckValueBonus', referId: e(6004), supersedes: [], descKey: k('notable.xunyu.unlock.40') },
      { affinity: 50, funcType: 'RevealInfo', referId: e(6201), supersedes: [], descKey: k('notable.xunyu.unlock.50') },
      { affinity: 60, funcType: 'StatModifier', referId: e(1022), supersedes: [20], descKey: k('notable.xunyu.unlock.60') },
    ],
    eventChain: [{ stage: 'friendly', eventDefId: eventDefId('event:notable.xunyu.counsel') }],
  }),
  weiDef('notable', 'notable:guojia', {
    notableId: notableId('notable:guojia'), rarity: 5, factionId: WEI_F,
    nameKey: k('notable.guojia.name'),
    // 鬼才是偏才：對位時最強，站錯格子時比同星低。體弱，出戰加值也低。
    base: notableBase(5, 'int', { trainingBonus: 0.09, specialtyBonus: 0.25, sortieBonus: 5 }),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1011), supersedes: [], descKey: k('notable.guojia.unlock.20') },
      { affinity: 30, funcType: 'GlowUpgradeBonus', referId: e(3011), supersedes: [], descKey: k('notable.guojia.unlock.30') },
      { affinity: 40, funcType: 'CheckValueBonus', referId: e(6003), supersedes: [], descKey: k('notable.guojia.unlock.40') },
      { affinity: 50, funcType: 'RevealInfo', referId: e(6201), supersedes: [], descKey: k('notable.guojia.unlock.50') },
      { affinity: 60, funcType: 'StatModifier', referId: e(1012), supersedes: [20], descKey: k('notable.guojia.unlock.60') },
    ],
    eventChain: [{ stage: 'friendly', eventDefId: eventDefId('event:notable.guojia.gambit') }],
  }),

  // ── ★4 ─────────────────────────────────────────────
  weiDef('notable', 'notable:xiahoudun', {
    notableId: notableId('notable:xiahoudun'), rarity: 4, factionId: WEI_F,
    nameKey: k('notable.xiahoudun.name'),
    // 猛將兼屯田 —— 基準值，是「★4 該長什麼樣」的參照點。
    base: notableBase(4, 'war'),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1001), supersedes: [], descKey: k('notable.xiahoudun.unlock.20') },
      { affinity: 30, funcType: 'GlowUpgradeBonus', referId: e(3001), supersedes: [], descKey: k('notable.xiahoudun.unlock.30') },
      { affinity: 40, funcType: 'CheckValueBonus', referId: e(6002), supersedes: [], descKey: k('notable.xiahoudun.unlock.40') },
      { affinity: 50, funcType: 'SlotBias', referId: e(4001), supersedes: [], descKey: k('notable.xiahoudun.unlock.50') },
      { affinity: 60, funcType: 'StatModifier', referId: e(1002), supersedes: [20], descKey: k('notable.xiahoudun.unlock.60') },
    ],
    eventChain: [],
  }),

  // ── ★3 ─────────────────────────────────────────────
  weiDef('notable', 'notable:dianwei', {
    notableId: notableId('notable:dianwei'), rarity: 3, factionId: WEI_F,
    nameKey: k('notable.dianwei.name'),
    // 惡來。護衛不離身 —— 站位傾向與出戰加值都高於同星。
    base: notableBase(3, 'war', { specialtyWeight: 2.4, sortieBonus: 6 }),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1001), supersedes: [], descKey: k('notable.dianwei.unlock.20') },
      { affinity: 40, funcType: 'SlotBias', referId: e(4001), supersedes: [], descKey: k('notable.dianwei.unlock.40') },
      { affinity: 60, funcType: 'StatModifier', referId: e(1002), supersedes: [20], descKey: k('notable.dianwei.unlock.60') },
    ],
    eventChain: [],
  }),

  // ── ★2 兩人 ────────────────────────────────────────
  weiDef('notable', 'notable:yujin', {
    notableId: notableId('notable:yujin'), rarity: 2, factionId: WEI_F,
    nameKey: k('notable.yujin.name'),
    // 毅重，治軍嚴整 —— 專長是政（軍紀是行政），不是武。
    base: notableBase(2, 'pol'),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1021), supersedes: [], descKey: k('notable.yujin.unlock.20') },
      { affinity: 40, funcType: 'GlowUpgradeBonus', referId: e(3003), supersedes: [], descKey: k('notable.yujin.unlock.40') },
    ],
    eventChain: [],
  }),
  weiDef('notable', 'notable:chengyu', {
    notableId: notableId('notable:chengyu'), rarity: 2, factionId: WEI_F,
    nameKey: k('notable.chengyu.name'),
    base: notableBase(2, 'int'),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1011), supersedes: [], descKey: k('notable.chengyu.unlock.20') },
      { affinity: 40, funcType: 'EventRewardBonus', referId: e(2002), supersedes: [], descKey: k('notable.chengyu.unlock.40') },
    ],
    eventChain: [],
  }),

  // ── ★1 保底型：碎片成本最低，工具性強 ────────────────
  // 目標是讓「低星滿級 > 高星低級」的局面確實存在（GDD §6.7）。
  weiDef('notable', 'notable:lejin', {
    notableId: notableId('notable:lejin'), rarity: 1, factionId: WEI_F,
    nameKey: k('notable.lejin.name'),
    // 先鋒。基底加成高於同星但幾乎不吃對位，站位也不偏 ——
    // 「哪一格都行」本身就是他的功能：不必為了用他而改變練功計畫。
    base: notableBase(1, 'war', { trainingBonus: 0.06, specialtyBonus: 0.02, specialtyWeight: 1.0 }),
    unlocks: [
      { affinity: 20, funcType: 'StatModifier', referId: e(1201), supersedes: [], descKey: k('notable.lejin.unlock.20') },
      { affinity: 30, funcType: 'StatModifier', referId: e(1202), supersedes: [], descKey: k('notable.lejin.unlock.30') },
      { affinity: 40, funcType: 'SlotBias', referId: e(4099), supersedes: [], descKey: k('notable.lejin.unlock.40') },
    ],
    eventChain: [],
  }),
];

/**
 * 入朝上司池 ＝ 同樣這八個人。
 *
 * 幼年抽到的不會再抽到（19 §3.1），所以三位玩伴用掉三個名額後，
 * 上司只會從剩下的五人裡出。池的成員數必須 ≥ 玩伴數 ＋ 上司數（驗證會擋）。
 *
 * ★5 權重低 —— 抽到主公本人是驚喜，不是常態。
 */
export const weiSuperiorPool: NotablePoolDef = weiDef('notablePool', 'pool:wei.superiors', {
  poolId: notablePoolId('pool:wei.superiors'),
  factionId: WEI_F,
  entries: [
    { notableId: notableId('notable:caocao'), weight: 8, requirements: [] },
    { notableId: notableId('notable:xunyu'), weight: 12, requirements: [] },
    { notableId: notableId('notable:guojia'), weight: 12, requirements: [] },
    { notableId: notableId('notable:xiahoudun'), weight: 18, requirements: [] },
    { notableId: notableId('notable:dianwei'), weight: 20, requirements: [] },
    { notableId: notableId('notable:yujin'), weight: 22, requirements: [] },
    { notableId: notableId('notable:chengyu'), weight: 22, requirements: [] },
    { notableId: notableId('notable:lejin'), weight: 25, requirements: [] },
  ],
});
