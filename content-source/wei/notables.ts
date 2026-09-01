// 魏的十二人。四維各三人（高／中／低）。
//
// ── 每個人由兩層構成 ────────────────────────────────
//   base     結構性資料：專長維、站位權重、出戰加值。【沒有任何加成】。
//   unlocks  逐人逐階手寫的能力條。star 0 那幾條就是【0 星基礎組】——
//            不是空白起點，每人都有。累加不取代。
//
// ── 三條共通的底線 ──────────────────────────────────
//   每人 star 0 都有「所有同框加成 +10%」（樂進 +12%）與一條事件功績結算。
//   其餘是各自的特色 —— 那才是「曹操是統御的好夥伴、荀彧是功績的好夥伴」。
//
// ── 吃格 ↔ 不吃格 ★ ─────────────────────────────────
//   陣容六人、格子四個，誰跟誰搶格子取決於能力有多少比例綁在站位上。
//   這條軸真正分的是【生效時機】：不吃格的條第一回合就有，
//   吃格的條要等好感 60（約七回合同框）。
//
//     偏全域      賈詡、郭嘉
//     想站不挑格  荀彧、典韋、樂進
//     混合        張遼、程昱
//     重度吃格    曹操、于禁、夏侯惇、陳群、毛玠
//
// 劇情鏈不在這裡 —— 人物事件由 EventDef.trigger 的 notable 分支反查（19 §6）。
import type { NotableDef, NotablePoolDef, UnlockRow } from '../../src/contracts/core/definitions.js';
import type { FuncType } from '../../src/contracts/core/effects.js';
import { effectId, notableId, notablePoolId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { notableBase } from '../core/config/notable-base.js';
import { WEI_ABILITIES } from './abilities.js';
import { FX } from '../core/effects/ids.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;

/**
 * 一條解鎖能力。`descKey` 由名字與序號推導 —— 逐條手寫 key 只會寫錯，
 * 而寫錯的 key 會安靜地顯示成空白。
 */
const row = (
  who: string, n: number, star: number, funcType: FuncType, referId: number,
): UnlockRow => ({
  star, funcType, referId: effectId(referId), descKey: k(`notable.${who}.kit.${n}`),
});

export const weiNotables: readonly NotableDef[] = [
  // ══ 統 · 帶兵治軍（武功）══════════════════════════
  /**
   * 曹操 ★5 · 統御比例。
   * 滿星站統御格：同框加成 +60%、基礎值 +5。【只有統御格算】——
   * 他是全表最偏科的一位，與于禁（加底）走相反的路。
   */
  weiDef('notable', 'notable:caocao', {
    notableId: notableId('notable:caocao'), rarity: 5, factionId: WEI_F,
    nameKey: k('notable.caocao.name'),
    base: notableBase(5, 'lead'),
    abilities: WEI_ABILITIES.caocao,
    unlocks: [
      row('caocao', 0, 0, 'LinkBonus', FX.linkAll10),
      row('caocao', 1, 0, 'CurrencyBonus', FX.meritMartial10),
      row('caocao', 2, 0, 'SlotBaseAdd', FX.baseLead5),
      row('caocao', 3, 1, 'LinkBonus', FX.linkLead15),
      row('caocao', 4, 2, 'AffinityGrant', FX.startSelf20),
      row('caocao', 5, 3, 'LinkBonus', FX.linkLead15),
      row('caocao', 6, 4, 'SlotBias', FX.biasSelfLead15),
      row('caocao', 7, 5, 'LinkBonus', FX.linkLead20),
    ],
  }),

  /**
   * 張遼 ★4 · 兵量與委託機率。逍遙津。
   * 他替你帶兵：滿星兵量上限 +23%，而且把物理輸出推上去 —— 武系的骨幹。
   */
  weiDef('notable', 'notable:zhangliao', {
    notableId: notableId('notable:zhangliao'), rarity: 4, factionId: WEI_F,
    nameKey: k('notable.zhangliao.name'),
    base: notableBase(4, 'lead'),
    abilities: WEI_ABILITIES.zhangliao,
    unlocks: [
      row('zhangliao', 0, 0, 'LinkBonus', FX.linkAll10),
      row('zhangliao', 1, 0, 'CurrencyBonus', FX.meritMartial10),
      row('zhangliao', 2, 0, 'StatModifier', FX.battleTroops08),
      row('zhangliao', 3, 1, 'CommissionChance', FX.commSelf15),
      row('zhangliao', 4, 2, 'StatModifier', FX.battlePhys10),
      row('zhangliao', 5, 3, 'AffinityGrant', FX.startSelf20),
      row('zhangliao', 6, 4, 'LinkBonus', FX.linkLead15),
      row('zhangliao', 7, 5, 'StatModifier', FX.battleTroops15),
      row('zhangliao', 8, 5, 'StatModifier', FX.battlePhys20),
    ],
  }),

  /**
   * 于禁 ★2 · 統御底盤。持軍嚴整。
   * 滿星統御基礎值 +10 —— 對照 `baseByAttr` ＝ 10，等於翻倍。
   * 與曹操同維但走相反的路：他加底、曹操加比例。
   */
  weiDef('notable', 'notable:yujin', {
    notableId: notableId('notable:yujin'), rarity: 2, factionId: WEI_F,
    nameKey: k('notable.yujin.name'),
    base: notableBase(2, 'lead'),
    abilities: WEI_ABILITIES.yujin,
    unlocks: [
      row('yujin', 0, 0, 'LinkBonus', FX.linkAll10),
      row('yujin', 1, 0, 'CurrencyBonus', FX.meritMartial10),
      row('yujin', 2, 0, 'SlotBaseAdd', FX.baseLead3),
      row('yujin', 3, 1, 'SlotBaseAdd', FX.baseLead3),
      row('yujin', 4, 2, 'AffinityGrant', FX.startSelf20),
      row('yujin', 5, 3, 'GlowBaseWeight', FX.glowLeadShift),
      row('yujin', 6, 4, 'SlotBaseAdd', FX.baseLead4),
      row('yujin', 7, 5, 'LinkBonus', FX.linkLead15),
    ],
  }),

  // ══ 武 · 廝殺（武功）════════════════════════════════
  /**
   * 夏侯惇 ★4 · 武比例。
   * 與曹操同型但【更早】買到站位權重 —— 他會頻繁出現在武格，連動更容易疊。
   */
  weiDef('notable', 'notable:xiahoudun', {
    notableId: notableId('notable:xiahoudun'), rarity: 4, factionId: WEI_F,
    nameKey: k('notable.xiahoudun.name'),
    base: notableBase(4, 'war'),
    abilities: WEI_ABILITIES.xiahoudun,
    unlocks: [
      row('xiahoudun', 0, 0, 'LinkBonus', FX.linkAll10),
      row('xiahoudun', 1, 0, 'CurrencyBonus', FX.meritMartial10),
      row('xiahoudun', 2, 0, 'SlotBaseAdd', FX.baseWar4),
      row('xiahoudun', 3, 1, 'LinkBonus', FX.linkWar15),
      row('xiahoudun', 4, 2, 'SlotBias', FX.biasSelfWar15),
      row('xiahoudun', 5, 3, 'LinkBonus', FX.linkWar15),
      row('xiahoudun', 6, 4, 'AffinityGrant', FX.startSelf20),
      row('xiahoudun', 7, 5, 'LinkBonus', FX.linkWar20),
    ],
  }),

  /**
   * 典韋 ★3 · 入夢即開。
   * 他賣的是【時間】：二星起始好感就到 60，前八回合就在收成，
   * 別人還在養好感。這正是「星階買的是時間不是強度」最直接的一例。
   */
  weiDef('notable', 'notable:dianwei', {
    notableId: notableId('notable:dianwei'), rarity: 3, factionId: WEI_F,
    nameKey: k('notable.dianwei.name'),
    base: notableBase(3, 'war'),
    abilities: WEI_ABILITIES.dianwei,
    unlocks: [
      row('dianwei', 0, 0, 'AffinityGrant', FX.startSelf20),
      row('dianwei', 1, 0, 'LinkBonus', FX.linkAll10),
      row('dianwei', 2, 0, 'CurrencyBonus', FX.meritMartial10),
      row('dianwei', 3, 0, 'StatModifier', FX.battlePhys06),
      row('dianwei', 4, 1, 'LinkBonus', FX.linkAll8),
      row('dianwei', 5, 2, 'AffinityGrant', FX.startSelf20),
      row('dianwei', 6, 3, 'StatModifier', FX.battlePhys10),
      row('dianwei', 7, 4, 'LinkBonus', FX.linkWar15),
      row('dianwei', 8, 5, 'SlotBaseAdd', FX.baseAll5),
    ],
  }),

  /**
   * 樂進 ★1 · 不挑格。
   * 滿星在【任何格】+38%、基礎值 +5。對照曹操 +60% 但只有統御格。
   * 碎片單價最低 —— 這就是「低星滿級 > 高星低級」的取捨。
   */
  weiDef('notable', 'notable:lejin', {
    notableId: notableId('notable:lejin'), rarity: 1, factionId: WEI_F,
    nameKey: k('notable.lejin.name'),
    base: notableBase(1, 'war'),
    abilities: WEI_ABILITIES.lejin,
    unlocks: [
      row('lejin', 0, 0, 'LinkBonus', FX.linkAll12),
      row('lejin', 1, 0, 'CurrencyBonus', FX.meritMartial10),
      row('lejin', 2, 0, 'SlotBaseAdd', FX.baseAll2),
      row('lejin', 3, 1, 'LinkBonus', FX.linkAll8),
      row('lejin', 4, 2, 'AffinityGrant', FX.startSelf20),
      row('lejin', 5, 3, 'LinkBonus', FX.linkAll8),
      row('lejin', 6, 4, 'SlotBaseAdd', FX.baseAll3),
      row('lejin', 7, 5, 'LinkBonus', FX.linkAll10),
    ],
  }),

  // ══ 智 · 謀劃（文功）════════════════════════════════
  /**
   * 郭嘉 ★5 · 機會與事件等級。
   * 唯一會【複利】的一位：稀有度 → 功績 → 官階 → 委託階級 → 功績。
   * 越早養越划算。一星那條又直接餵養所有人的事件鏈。
   */
  weiDef('notable', 'notable:guojia', {
    notableId: notableId('notable:guojia'), rarity: 5, factionId: WEI_F,
    nameKey: k('notable.guojia.name'),
    base: notableBase(5, 'int'),
    abilities: WEI_ABILITIES.guojia,
    unlocks: [
      row('guojia', 0, 0, 'LinkBonus', FX.linkAll10),
      row('guojia', 1, 0, 'CurrencyBonus', FX.meritCivil10),
      row('guojia', 2, 0, 'RarityWeight', FX.rarity03),
      row('guojia', 3, 1, 'EncounterChance', FX.encSelf20),
      row('guojia', 4, 2, 'RarityWeight', FX.rarity03),
      row('guojia', 5, 3, 'AffinityGrant', FX.startSelf20),
      row('guojia', 6, 4, 'CheckRetry', FX.retryMinor1),
      row('guojia', 7, 5, 'RarityWeight', FX.rarity04),
    ],
  }),

  /**
   * 賈詡 ★4 · 檢定與算無遺策。
   * 與張遼是一對：張遼放大險檔的【獎勵】，賈詡提高險檔的【成功率】。
   * 兩人齊備才敢一路走險。
   */
  weiDef('notable', 'notable:jiaxu', {
    notableId: notableId('notable:jiaxu'), rarity: 4, factionId: WEI_F,
    nameKey: k('notable.jiaxu.name'),
    base: notableBase(4, 'int'),
    abilities: WEI_ABILITIES.jiaxu,
    unlocks: [
      row('jiaxu', 0, 0, 'LinkBonus', FX.linkAll10),
      row('jiaxu', 1, 0, 'CurrencyBonus', FX.meritCivil10),
      row('jiaxu', 2, 0, 'StatModifier', FX.battleMagic08),
      row('jiaxu', 3, 1, 'RarityWeight', FX.rarity03),
      row('jiaxu', 4, 2, 'AffinityGrant', FX.startSelf20),
      row('jiaxu', 5, 3, 'LinkBonus', FX.linkInt15),
      row('jiaxu', 6, 4, 'StatModifier', FX.battleMagic12),
      row('jiaxu', 7, 5, 'StatModifier', FX.battleMagic25),
    ],
  }),

  /** 程昱 ★2 · 混合。荀彧的平價版加一點底盤 —— 早期最容易養滿的文線夥伴。 */
  weiDef('notable', 'notable:chengyu', {
    notableId: notableId('notable:chengyu'), rarity: 2, factionId: WEI_F,
    nameKey: k('notable.chengyu.name'),
    base: notableBase(2, 'int'),
    abilities: WEI_ABILITIES.chengyu,
    unlocks: [
      row('chengyu', 0, 0, 'LinkBonus', FX.linkAll10),
      row('chengyu', 1, 0, 'CurrencyBonus', FX.meritCivil15),
      row('chengyu', 2, 0, 'SlotBaseAdd', FX.baseInt3),
      row('chengyu', 3, 1, 'CurrencyBonus', FX.meritCivil10),
      row('chengyu', 4, 2, 'SlotBaseAdd', FX.baseInt3),
      row('chengyu', 5, 3, 'AffinityGrant', FX.startSelf20),
      row('chengyu', 6, 4, 'GlowUpgradeBonus', FX.glowUpAll8),
      row('chengyu', 7, 5, 'LinkBonus', FX.linkInt15),
    ],
  }),

  // ══ 政 · 治理（文功）════════════════════════════════
  /**
   * 荀彧 ★5 · 功績與檢定獎勵。
   *
   * 滿星文功 +40%、檢定獎勵 +50%，全部【不吃站位】。四星那條是全表
   * 唯一由名士給的【保證】：他所站的格必定觸發委託（基礎 50% → 100%）。
   *
   * 那一條把他從全域端拉回軸線上：他變成「想站、但不挑哪一格」的類型，
   * 因此與非統御格不可的曹操可以共存。而它仍然要好感 60 ——
   * 在那之前站他純粹是繳學費，繳完的那一刻觸發率翻倍。
   */
  weiDef('notable', 'notable:xunyu', {
    notableId: notableId('notable:xunyu'), rarity: 5, factionId: WEI_F,
    nameKey: k('notable.xunyu.name'),
    base: notableBase(5, 'pol'),
    abilities: WEI_ABILITIES.xunyu,
    unlocks: [
      row('xunyu', 0, 0, 'LinkBonus', FX.linkAll10),
      row('xunyu', 1, 0, 'CurrencyBonus', FX.meritCivil20),
      row('xunyu', 2, 0, 'StatModifier', FX.battleSupply12),
      row('xunyu', 3, 1, 'CurrencyBonus', FX.meritCivil20),
      row('xunyu', 4, 2, 'AffinityGrant', FX.startSelf20),
      row('xunyu', 5, 3, 'StatModifier', FX.battleHeal20),
      row('xunyu', 6, 4, 'CommissionChance', FX.commSelfSure),
      row('xunyu', 7, 5, 'StatModifier', FX.battleSupply30),
    ],
  }),

  /**
   * 陳群 ★3 · 品評與放大同伴。九品官人法。
   * 他自己不強，但【讓同格的人都變強】—— 十二人裡沒有第二個這種角色，
   * 也是唯一直接獎勵「多人同格」的人。與逍遙津令的獨行流剛好相反。
   */
  weiDef('notable', 'notable:chenqun', {
    notableId: notableId('notable:chenqun'), rarity: 3, factionId: WEI_F,
    nameKey: k('notable.chenqun.name'),
    base: notableBase(3, 'pol'),
    abilities: WEI_ABILITIES.chenqun,
    unlocks: [
      row('chenqun', 0, 0, 'LinkBonus', FX.linkAll10),
      row('chenqun', 1, 0, 'CurrencyBonus', FX.meritCivil10),
      row('chenqun', 2, 0, 'LinkAmplify', FX.amplifyAll15),
      row('chenqun', 3, 1, 'CommissionChance', FX.commSelf15),
      row('chenqun', 4, 2, 'AffinityGrant', FX.startSelf20),
      row('chenqun', 5, 3, 'LinkAmplify', FX.amplifyAll15),
      row('chenqun', 6, 4, 'SlotBaseAdd', FX.basePol5),
      row('chenqun', 7, 5, 'LinkAmplify', FX.amplifyAll20),
    ],
  }),

  /**
   * 毛玠 ★2 · 政底盤與人物事件機率。典選舉。
   * 他認識所有人 —— 想追人物事件鏈的玩家會先養他。
   * 與郭嘉一星那條疊起來，旗標機率 +50%。
   */
  weiDef('notable', 'notable:maojie', {
    notableId: notableId('notable:maojie'), rarity: 2, factionId: WEI_F,
    nameKey: k('notable.maojie.name'),
    base: notableBase(2, 'pol'),
    abilities: WEI_ABILITIES.maojie,
    unlocks: [
      row('maojie', 0, 0, 'LinkBonus', FX.linkAll10),
      row('maojie', 1, 0, 'CurrencyBonus', FX.meritCivil10),
      row('maojie', 2, 0, 'EncounterChance', FX.encSelf15),
      row('maojie', 3, 1, 'SlotBaseAdd', FX.basePol3),
      row('maojie', 4, 2, 'AffinityGrant', FX.startSelf20),
      row('maojie', 5, 3, 'EncounterChance', FX.encSelf15),
      row('maojie', 6, 4, 'SlotBaseAdd', FX.basePol4),
      row('maojie', 7, 5, 'LinkBonus', FX.linkPol15),
    ],
  }),
];

/**
 * 入朝上司池 ＝ 同樣這十二個人。
 *
 * 幼年抽到的不會再抽到（19 §3.1），所以三位玩伴用掉三個名額後，
 * 上司只會從剩下的九人裡出。池的成員數必須 ≥ 玩伴數 ＋ 上司數（驗證會擋）。
 *
 * ── 擴編到十二人的代價 ★ ────────────────────────────
 * 六人陣容抽十二人 → 特定名士出場率從 75% 降到 50%。
 * 兩人事件全員到齊 22.7%、三人事件只有 9.1% ——
 * 三人事件因此【必須靠指名才湊得到】，而那正好給了〈累世公卿〉
 * 一個真正的理由：它從「我想要這個強角」變成「我要湊出五子良將那一段」。
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
    { notableId: notableId('notable:zhangliao'), weight: 16, requirements: [] },
    { notableId: notableId('notable:jiaxu'), weight: 16, requirements: [] },
    { notableId: notableId('notable:xiahoudun'), weight: 18, requirements: [] },
    { notableId: notableId('notable:dianwei'), weight: 20, requirements: [] },
    { notableId: notableId('notable:chenqun'), weight: 20, requirements: [] },
    { notableId: notableId('notable:yujin'), weight: 22, requirements: [] },
    { notableId: notableId('notable:chengyu'), weight: 22, requirements: [] },
    { notableId: notableId('notable:maojie'), weight: 22, requirements: [] },
    { notableId: notableId('notable:lejin'), weight: 25, requirements: [] },
  ],
});
