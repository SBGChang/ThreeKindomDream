// 十一件道具。與名士共用同一套 FuncType —— 一套系統，兩個來源（23）。
//
// ── 兩條規則決定了整張表的形狀 ★ ──────────────────────
//
// 一 · 【道具不加四維，只改規則】
//      沒有一件寫「智 +40」。道具能給的只有四種東西：
//        獲取量倍率、基礎值、各種權重與機率、好感成長。
//      一件道具是一條規則的改寫，不是一根數值棒。
//
// 二 · 【限制越窄，效果越強】
//      廣域件不限對象，因此每一條都比同階的點名件弱 —— 那是規則不是例外。
//
//        廣域      竹簡、鐵槍
//        分類限定  良弓、印綬、青釭劍           限某一維或某類名士
//        點名限定  孟德新書、短戟、奉孝遺書、
//                  王佐印綬、逍遙津令、五子印   只對指定那一位／那一組
//
// ── 每輪獲得次數上限 ★ ───────────────────────────────
//   低階無上限 —— 一輪內天然重複，不必攜帶，自己會滿
//   高階一輪一次 —— 那一次是「首次獲得」不是重複，【不帶進場就永遠 0 碎片】
//
// 因此攜帶格只在高階道具上才是取捨。而高階道具的來源正是人物事件鏈的
// 最後一步與人物委託的最難檔 —— 兩個系統在這裡咬合。
import type { ItemDef, ItemPoolDef, ItemTierDef } from '../../../src/contracts/core/definitions.js';
import type { EffectRef, FuncType } from '../../../src/contracts/core/effects.js';
import type { Rarity } from '../../../src/contracts/core/primitives.js';
import { effectId, itemId, itemPoolId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { FX } from '../effects/ids.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

/** 低階道具的每輪上限。「無上限」在資料上是一個大到碰不到的數。 */
const UNLIMITED = 99;

const ref = (funcType: FuncType, referId: number): EffectRef =>
  ({ funcType, referId: effectId(referId) });

/** 解放一階的碎片成本。與名士的星階同構，但道具的碎片來得慢，所以便宜些。 */
const TIER_COST: readonly number[] = [0, 2, 4, 7, 11, 16];

/**
 * 六階一組。`effects` 逐階累加不取代 ——
 * 「解放反而變弱」在結構上不可能發生（同名士的星階）。
 */
const ladder = (
  name: string, rows: readonly (readonly EffectRef[])[],
): readonly ItemTierDef[] => rows.map((effects, tier) => ({
  tier,
  fragmentCost: TIER_COST[tier] ?? 0,
  effects,
  descKey: k(`item.${name}.tier.${tier}`),
}));

const item = (
  name: string, rarity: Rarity, perRunCap: number,
  rows: readonly (readonly EffectRef[])[],
): ItemDef => coreDef('item', `item:${name}`, {
  itemId: itemId(`item:${name}`),
  rarity,
  perRunCap,
  nameKey: k(`item.${name}.name`),
  descKey: k(`item.${name}.desc`),
  tiers: ladder(name, rows),
});

// ══ 廣域 · 不限對象 ══════════════════════════════════
// 【太平要術暂不收錄】★
// 它的招牌能力（每輪一次重抽四格光階）需要一個玩家主動發動的 charge，
// 是全套設計裡唯一超出現有語彙的東西；而它的來源「圓夢後解鎖」屬於天命商店，
// 而商店目前還不能發道具。兩個洞都補好之前收錄它，只會得到一件
// 永遠拿不到、卻在圖鑑裡看起來很正常的道具 —— 那正是驗證器擋下來的情況。

const broad: readonly ItemDef[] = [
  /** 竹簡 ★1 · 文線入門。程昱〈十萬之眾〉與毛玠〈清議〉掉。 */
  item('bamboo', 1, UNLIMITED, [
    [ref('SlotBaseAdd', FX.itemBaseInt2)],
    [ref('GainMultiplier', FX.gainInt8)],
    [ref('CurrencyBonus', FX.meritCivil5)],
    [ref('SlotBaseAdd', FX.itemBaseInt3)],
    [ref('GlowBaseWeight', FX.glowIntShift)],
    [ref('GainMultiplier', FX.gainInt15)],
  ]),

  /** 鐵槍 ★1 · 武線入門。夏侯惇〈太壽陂〉掉。 */
  item('spear', 1, UNLIMITED, [
    [ref('SlotBaseAdd', FX.itemBaseWar2)],
    [ref('GainMultiplier', FX.gainWar8)],
    [ref('CurrencyBonus', FX.meritMartial5)],
    [ref('SlotBaseAdd', FX.itemBaseWar3)],
    [ref('GlowBaseWeight', FX.glowWarShift)],
    [ref('GainMultiplier', FX.gainWar15)],
  ]),

];

// ══ 分類限定 · 限某維或某類名士 ══════════════════════
const classed: readonly ItemDef[] = [
  /**
   * 良弓 ★2 · 張遼〈勸降〉與樂進〈不言功〉掉。
   * 它不加武，它【讓武將站到武格上】，然後讓他們更快跨過好感 60。
   */
  item('bow', 2, UNLIMITED, [
    [ref('SlotBias', FX.biasWarClass13)],
    [ref('GainMultiplier', FX.gainWar10)],
    [ref('LinkAmplify', FX.amplifyWarClass10)],
    [ref('SlotBaseAdd', FX.itemBaseWar3)],
    [ref('GlowUpgradeBonus', FX.glowUpWar10)],
    [ref('AffinityGrowth', FX.growWarClass25)],
  ]),

  /** 印綬 ★2 · 于禁〈立寨〉、陳群〈九品〉、毛玠〈察舉〉掉。 */
  item('seal', 2, UNLIMITED, [
    [ref('CurrencyBonus', FX.meritCivil8)],
    [ref('SlotBaseAdd', FX.itemBasePol2)],
    [ref('CommissionChance', FX.commItem8)],
    [ref('CurrencyBonus', FX.meritCivil10)],
    [ref('SlotBias', FX.biasPolClass13)],
    [ref('RarityWeight', FX.rarity02)],
  ]),

  /**
   * 青釭劍 ★4 · 夏侯惇〈督軍〉掉。
   * 限制是「只對武」，因此每條都比廣域件重。五階那條是保證而不是機率 ——
   * 而它【不牽涉任何名士】，所以不吃好感門檻：帶進場就開。
   */
  item('qinggang', 4, 1, [
    [ref('SlotBaseAdd', FX.itemBaseWar5)],
    [ref('SlotBias', FX.biasWarClass16)],
    [ref('GainMultiplier', FX.gainWar20)],
    [ref('CurrencyBonus', FX.meritMartial15)],
    [ref('GlowBaseWeight', FX.glowWarShift)],
    [ref('CommissionChance', FX.commWarSure)],
  ]),
];

// ══ 點名限定 · 只對指定的人生效 ══════════════════════
const named: readonly ItemDef[] = [
  /**
   * 孟德新書 ★3 · 曹操〈唯才是舉〉保證掉、〈求賢令〉機率掉。
   * 陣容裡沒有曹操，這件道具有一半是死的 —— 那正是它敢給 +0.6 檔的原因。
   */
  item('mengde', 3, 1, [
    [ref('SlotBias', FX.biasCaocaoLead18)],
    [ref('GainMultiplier', FX.gainLead15)],
    [ref('LinkAmplify', FX.amplifyCaocao25)],
    [ref('SlotBaseAdd', FX.itemBaseLead4)],
    [ref('AffinityGrant', FX.startCaocao20)],
    [ref('RarityWeight', FX.rarity06)],
  ]),

  /**
   * 短戟 ★3 · 宛城〈雙戟不還〉保證掉、典韋〈宿衛〉機率掉。
   * 原本寫〈古錠刀〉是錯的 —— 那是孫堅的刀，典韋用的是短戟。
   */
  item('halberd', 3, 1, [
    [ref('SlotBias', FX.biasDianweiAll16)],
    [ref('SlotBaseAdd', FX.itemBaseWar4)],
    [ref('LinkAmplify', FX.amplifyDianwei25)],
    [ref('AffinityGrowth', FX.growDianwei80)],
    [ref('EncounterChance', FX.encItem20)],
    [ref('EncounterChance', FX.encDianweiSure)],
  ]),

  /** 奉孝遺書 ★4 · 郭嘉〈遺計定遼東〉保證掉、〈料敵〉機率掉。 */
  item('fengxiao', 4, 1, [
    [ref('SlotBias', FX.biasGuojiaInt18)],
    [ref('AffinityGrowth', FX.growGuojia80)],
    [ref('AffinityGrant', FX.startGuojia20)],
    [ref('EncounterChance', FX.encItem25)],
    [ref('LinkAmplify', FX.amplifyGuojia25)],
    [ref('EncounterChance', FX.encIntSure)],
  ]),

  /**
   * 王佐印綬 ★4 · 荀彧〈空盒〉保證掉、〈舉薦〉機率掉。
   * 四階把荀彧推進格子，而荀彧四星那條讓那格必定出委託 ——
   * 兩者相乘就是整套功績流的核心。
   */
  item('wangzuo', 4, 1, [
    [ref('CurrencyBonus', FX.meritCivil15)],
    [ref('AffinityGrant', FX.startXunyu20)],
    [ref('CheckRewardBonus', FX.checkReward20)],
    [ref('AffinityGrowth', FX.growXunyu80)],
    [ref('SlotBias', FX.biasXunyuAll16)],
    [ref('RarityWeight', FX.rarity05)],
  ]),

  /**
   * 逍遙津令 ★4 · 張遼〈遼來〉掉。
   *
   * 曹操留在合肥的那個木匣：「若孫權至者，張遼李典出戰。」
   *
   * 八百破十萬 —— 所以它【獎勵單人站格】，方向和 `pileMultiplier`
   * （人越多越強：2 人 ×1.15、3 人 ×1.4）相反。滿階的單人約等於三人同格。
   * 這是全表唯一的獨行流，也正好是陳群「放大同伴」的反面：
   * 兩件湊在一起會互相抵銷，那是真的取捨。
   */
  item('xiaoyaojin', 4, 1, [
    [ref('SlotBias', FX.biasZhangliaoLead18)],
    [ref('AffinityGrowth', FX.growZhangliao80)],
    [ref('SlotSizeBonus', FX.soloBonus20)],
    [ref('LinkAmplify', FX.amplifyZhangliao25)],
    [ref('GainMultiplier', FX.gainLead20)],
    [ref('SlotSizeBonus', FX.soloBonus40)],
  ]),

  /**
   * 五子印 ★5 · 〈五子良將〉三人皆莫逆才拿得到。
   *
   * 全表限制最窄的一件：要三個指定角色同時在陣容、同時養到莫逆 80。
   * 三人各需十次同框，在一輪 32 回合裡幾乎不可能 —— 它是【跨輪目標】：
   * 第一次得靠星階起始好感硬撐，拿到之後 1 階與 4 階再把下一輪的門檻壓下去。
   * 它是用來讓下一輪更容易拿到它的東西。
   *
   * 每一階都是三條（逐人一條）—— `NotableTarget` 一次只指一人，那是刻意的。
   */
  item('wuzi', 5, 1, [
    [
      ref('SlotBias', FX.biasZhangliaoAll18),
      ref('SlotBias', FX.biasYujinAll18),
      ref('SlotBias', FX.biasLejinAll18),
    ],
    [
      ref('AffinityGrowth', FX.growZhangliao60),
      ref('AffinityGrowth', FX.growYujin60),
      ref('AffinityGrowth', FX.growLejin60),
    ],
    [
      ref('LinkAmplify', FX.amplifyZhangliao20),
      ref('LinkAmplify', FX.amplifyYujin20),
      ref('LinkAmplify', FX.amplifyLejin20),
    ],
    [ref('CurrencyBonus', FX.meritMartial20)],
    [
      ref('AffinityGrant', FX.startZhangliao30),
      ref('AffinityGrant', FX.startYujin30),
      ref('AffinityGrant', FX.startLejin30),
    ],
    [
      ref('CommissionChance', FX.commZhangliaoSure),
      ref('CommissionChance', FX.commYujinSure),
      ref('CommissionChance', FX.commLejinSure),
    ],
  ]),
];

export const coreItems: readonly ItemDef[] = [...broad, ...classed, ...named];

/**
 * 低階道具池（23 §6）★
 *
 * 一般委託（稀有度 ★3 以上）的最難檔機率掉這裡的東西。委託【不吃好感門檻】，
 * 所以它才是真正「一輪能重複多次」的來源 —— 低階道具的定位是
 * 第一輪就能開始堆的東西，不該和名士好感綁在一起。
 */
export const coreItemPools: readonly ItemPoolDef[] = [
  coreDef('itemPool', 'pool:item.low', {
    poolId: itemPoolId('pool:item.low'),
    entries: [
      { itemId: itemId('item:bamboo'), weight: 30 },
      { itemId: itemId('item:spear'), weight: 30 },
      { itemId: itemId('item:bow'), weight: 20 },
      { itemId: itemId('item:seal'), weight: 20 },
    ],
  }),
];
