// 各 FuncType 的效果表。referId 由名士解鎖條、道具階、天賦、商店品項引用。
//
// ── 名士與道具共用同一套語彙 ★ ────────────────────────
//
// 名士的星階突破與道具的階級解放寫的是【同一種東西】。因此新增一件道具
// 不需要新機制，平衡也只有一組旋鈕要調。兩者只有兩個差別：
//
//   一 · 名士的站位效果（帶 `standing`）要好感 60；道具【不吃任何門檻】。
//   二 · 道具有每輪獲得次數上限，名士沒有。
//
// ── 限制越窄，效果越強 ★ ──────────────────────────────
//
// `NotableTarget` 的三層就是這條規則的型別形式：
//   all       全體 —— 每條都最弱
//   specialty 某一維的名士 —— 中等
//   named     點名某一位 —— 最強（陣容裡沒有他，這條就是死的）
//
// 底下的數值一律照這個梯度給：同樣是「同框加成再 +N%」，
// all 版給 15%、點名版給 25%。
import type { EffectTableInput } from '../../authoring.js';
import { notableId, targetId } from '../../../src/contracts/core/ids.js';
import type { Condition, NotableTarget, StandingReq } from '../../../src/contracts/core/effects.js';
import { FX } from './ids.js';

const T = targetId;
const N = notableId;

// ── 作用對象的三層 ──────────────────────────────────
const ALL: NotableTarget = { kind: 'all' };
const SELF: NotableTarget = { kind: 'self' };
const named = (id: string): NotableTarget => ({ kind: 'named', notableId: N(id) });
const clazz = (attr: 'lead' | 'war' | 'int' | 'pol'): NotableTarget =>
  ({ kind: 'specialty', attr });

/** 四格權重一致地抬高 —— 「他更常出現，但不挑哪一格」。 */
const ALL_ATTRS_18 = { lead: 1.8, war: 1.8, int: 1.8, pol: 1.8 } as const;

// ── 站位前提 ────────────────────────────────────────
const STAND_SELF: StandingReq = { kind: 'self' };
const STAND_NONE: StandingReq = { kind: 'none' };
const stands = (id: string): StandingReq => ({ kind: 'named', notableId: N(id) });

/** 大檢定走【險】檔時才生效。張遼與賈詡那一對靠它成立。 */
const HARD: Condition = { type: 'difficulty', value: 'hard' };

export const effects: EffectTableInput = {
  StatModifier: {
    [FX.expIntUp]: { target: T('training.exp.int'), op: 'mulPct', value: 0.20, condition: null },
    [FX.expAllUp]: { target: T('training.exp.all'), op: 'mulPct', value: 0.08, condition: null },
    [FX.noGlowBonus]: { target: T('training.noGlowBonus'), op: 'add', value: 0.30, condition: null },
    [FX.expWarUp]: { target: T('training.exp.war'), op: 'mulPct', value: 0.25, condition: null },
  },

  GlowBaseWeight: {
    [FX.glowWarShift]: { scope: 'war', tierShift: 1, condition: null },
    [FX.glowLeadShift]: { scope: 'lead', tierShift: 1, condition: null },
    [FX.glowPolShift]: { scope: 'pol', tierShift: 1, condition: null },
    [FX.glowIntShift]: { scope: 'int', tierShift: 1, condition: null },
    [FX.glowAllShift]: { scope: 'all', tierShift: 1, condition: null },
  },

  GlowUpgradeBonus: {
    [FX.glowUpAll8]: { scope: 'all', chanceAdd: 0.08, condition: null },
    [FX.glowUpAll10]: { scope: 'all', chanceAdd: 0.10, condition: null },
    [FX.glowUpAll12]: { scope: 'all', chanceAdd: 0.12, condition: null },
    [FX.glowUpWar10]: { scope: 'war', chanceAdd: 0.10, condition: null },
    [FX.shopGlow05]: { scope: 'all', chanceAdd: 0.05, condition: null },
    [FX.shopGlow10]: { scope: 'all', chanceAdd: 0.10, condition: null },
    [FX.shopGlow17]: { scope: 'all', chanceAdd: 0.17, condition: null },
    [FX.shopGlow25]: { scope: 'all', chanceAdd: 0.25, condition: null },
    [FX.talentGlow10]: { scope: 'all', chanceAdd: 0.10, condition: null },
  },

  // ── 站位分配。【不吃好感門檻】—— 好感正是靠同格養出來的（死結）。
  SlotBias: {
    [FX.biasSelfLead15]: { target: SELF, attrWeights: { lead: 1.5 }, condition: null },
    [FX.biasSelfWar15]: { target: SELF, attrWeights: { war: 1.5 }, condition: null },
    [FX.biasSelfInt18]: { target: SELF, attrWeights: { int: 1.8 }, condition: null },
    [FX.biasSelfPol16]: { target: SELF, attrWeights: { pol: 1.6 }, condition: null },
    [FX.biasWarClass13]: { target: clazz('war'), attrWeights: { war: 1.3 }, condition: null },
    [FX.biasWarClass16]: { target: clazz('war'), attrWeights: { war: 1.6 }, condition: null },
    [FX.biasIntClass13]: { target: clazz('int'), attrWeights: { int: 1.3 }, condition: null },
    [FX.biasPolClass13]: { target: clazz('pol'), attrWeights: { pol: 1.3 }, condition: null },
    // 點名版最強：權重 10 → 18
    [FX.biasCaocaoLead18]: { target: named('notable:caocao'), attrWeights: { lead: 1.8 }, condition: null },
    [FX.biasDianweiAll16]: {
      target: named('notable:dianwei'),
      attrWeights: { lead: 1.6, war: 1.6, int: 1.6, pol: 1.6 },
      condition: null,
    },
    [FX.biasGuojiaInt18]: { target: named('notable:guojia'), attrWeights: { int: 1.8 }, condition: null },
    [FX.biasXunyuAll16]: {
      target: named('notable:xunyu'),
      attrWeights: { lead: 1.6, war: 1.6, int: 1.6, pol: 1.6 },
      condition: null,
    },
    [FX.biasZhangliaoLead18]: { target: named('notable:zhangliao'), attrWeights: { lead: 1.8 }, condition: null },
    // 五子印點名三人。三條同型【不合併】—— 合併就得多一種「多人目標」的形狀，
    // 而那種形狀只有這一件道具會用到。逐人一條反而讓資料自己說得清楚。
    [FX.biasZhangliaoAll18]: { target: named('notable:zhangliao'), attrWeights: ALL_ATTRS_18, condition: null },
    [FX.biasYujinAll18]: { target: named('notable:yujin'), attrWeights: ALL_ATTRS_18, condition: null },
    [FX.biasLejinAll18]: { target: named('notable:lejin'), attrWeights: ALL_ATTRS_18, condition: null },
  },

  // ── 站位加成。全部帶 standing，因此全部吃好感 60。
  LinkBonus: {
    [FX.linkAll10]: { scope: 'all', standing: STAND_SELF, mulPct: 0.10, condition: null },
    [FX.linkAll12]: { scope: 'all', standing: STAND_SELF, mulPct: 0.12, condition: null },
    [FX.linkAll8]: { scope: 'all', standing: STAND_SELF, mulPct: 0.08, condition: null },
    [FX.linkLead15]: { scope: 'lead', standing: STAND_SELF, mulPct: 0.15, condition: null },
    [FX.linkLead20]: { scope: 'lead', standing: STAND_SELF, mulPct: 0.20, condition: null },
    [FX.linkWar15]: { scope: 'war', standing: STAND_SELF, mulPct: 0.15, condition: null },
    [FX.linkWar20]: { scope: 'war', standing: STAND_SELF, mulPct: 0.20, condition: null },
    [FX.linkWar10]: { scope: 'war', standing: STAND_SELF, mulPct: 0.10, condition: null },
    [FX.linkInt15]: { scope: 'int', standing: STAND_SELF, mulPct: 0.15, condition: null },
    [FX.linkPol15]: { scope: 'pol', standing: STAND_SELF, mulPct: 0.15, condition: null },
  },

  // ── 放大同格【其他】人。陳群的九品官人法，唯一直接獎勵多人同格的效果。
  LinkAmplify: {
    [FX.amplifyAll15]: { target: ALL, standing: STAND_SELF, mulPct: 0.15, condition: null },
    [FX.amplifyAll20]: { target: ALL, standing: STAND_SELF, mulPct: 0.20, condition: null },
    // 道具版：來源不是名士，所以不要求誰站著（陳群本人不必在場）。
    [FX.amplifyAll12]: { target: ALL, standing: STAND_NONE, mulPct: 0.12, condition: null },
    [FX.amplifyCaocao25]: { target: named('notable:caocao'), standing: STAND_NONE, mulPct: 0.25, condition: null },
    [FX.amplifyDianwei25]: { target: named('notable:dianwei'), standing: STAND_NONE, mulPct: 0.25, condition: null },
    [FX.amplifyGuojia25]: { target: named('notable:guojia'), standing: STAND_NONE, mulPct: 0.25, condition: null },
    [FX.amplifyZhangliao25]: { target: named('notable:zhangliao'), standing: STAND_NONE, mulPct: 0.25, condition: null },
    [FX.amplifyZhangliao20]: { target: named('notable:zhangliao'), standing: STAND_NONE, mulPct: 0.20, condition: null },
    [FX.amplifyYujin20]: { target: named('notable:yujin'), standing: STAND_NONE, mulPct: 0.20, condition: null },
    [FX.amplifyLejin20]: { target: named('notable:lejin'), standing: STAND_NONE, mulPct: 0.20, condition: null },
    [FX.amplifyWarClass10]: { target: clazz('war'), standing: STAND_NONE, mulPct: 0.10, condition: null },
  },

  // ── 同框時的基礎值。加法、落在乘法鏈之前，與官階同一層。
  SlotBaseAdd: {
    [FX.baseLead5]: { scope: 'lead', standing: STAND_SELF, add: 5, condition: null },
    [FX.baseLead3]: { scope: 'lead', standing: STAND_SELF, add: 3, condition: null },
    [FX.baseLead4]: { scope: 'lead', standing: STAND_SELF, add: 4, condition: null },
    [FX.baseWar4]: { scope: 'war', standing: STAND_SELF, add: 4, condition: null },
    [FX.baseInt3]: { scope: 'int', standing: STAND_SELF, add: 3, condition: null },
    [FX.basePol5]: { scope: 'pol', standing: STAND_SELF, add: 5, condition: null },
    [FX.basePol3]: { scope: 'pol', standing: STAND_SELF, add: 3, condition: null },
    [FX.basePol4]: { scope: 'pol', standing: STAND_SELF, add: 4, condition: null },
    [FX.baseAll5]: { scope: 'all', standing: STAND_SELF, add: 5, condition: null },
    [FX.baseAll2]: { scope: 'all', standing: STAND_SELF, add: 2, condition: null },
    [FX.baseAll3]: { scope: 'all', standing: STAND_SELF, add: 3, condition: null },
    // ── 道具版：`standing: none`，因此不吃好感門檻（23 §1）★
    // 這不是遺漏，是兩層的分工 —— 道具就是「不用再等一次」的那一層。
    [FX.itemBaseInt2]: { scope: 'int', standing: STAND_NONE, add: 2, condition: null },
    [FX.itemBaseInt3]: { scope: 'int', standing: STAND_NONE, add: 3, condition: null },
    [FX.itemBaseWar2]: { scope: 'war', standing: STAND_NONE, add: 2, condition: null },
    [FX.itemBaseWar3]: { scope: 'war', standing: STAND_NONE, add: 3, condition: null },
    [FX.itemBaseWar4]: { scope: 'war', standing: STAND_NONE, add: 4, condition: null },
    [FX.itemBaseWar5]: { scope: 'war', standing: STAND_NONE, add: 5, condition: null },
    [FX.itemBasePol2]: { scope: 'pol', standing: STAND_NONE, add: 2, condition: null },
    [FX.itemBaseLead4]: { scope: 'lead', standing: STAND_NONE, add: 4, condition: null },
    [FX.itemBaseAll2]: { scope: 'all', standing: STAND_NONE, add: 2, condition: null },
  },

  /**
   * 依同格人數的整格倍率 ★
   *
   * `{min:1, max:1}` ＝ 只有一位名士站著時才加成 —— 逍遙津令的八百破十萬。
   * 它與 `linkBonus.pileMultiplier`（人越多越強）方向【相反】，
   * 因此玩家有兩種互斥的站位流派可以選。
   */
  SlotSizeBonus: {
    [FX.soloBonus20]: {
      minNotables: 1, maxNotables: 1, standing: STAND_NONE, mulPct: 0.20, condition: null,
    },
    [FX.soloBonus40]: {
      minNotables: 1, maxNotables: 1, standing: STAND_NONE, mulPct: 0.40, condition: null,
    },
  },

  /**
   * 委託旗標的修正 ★
   *
   * `guarantee` 不是「＋很多％」的簡寫：保證可以拿來計畫，機率只能拿來期待。
   * 荀彧四星那條是全表唯一由名士給的保證 —— 而它仍然要好感 60。
   */
  CommissionChance: {
    [FX.commSelf15]: { scope: 'all', standing: STAND_SELF, addPct: 0.15, guarantee: false, condition: null },
    [FX.commSelfSure]: { scope: 'all', standing: STAND_SELF, addPct: 0, guarantee: true, condition: null },
    [FX.commItem10]: { scope: 'all', standing: STAND_NONE, addPct: 0.10, guarantee: false, condition: null },
    [FX.commItem8]: { scope: 'all', standing: STAND_NONE, addPct: 0.08, guarantee: false, condition: null },
    // 青釭劍五階：不牽涉任何名士，所以不吃站位也不吃好感。
    [FX.commWarSure]: { scope: 'war', standing: STAND_NONE, addPct: 0, guarantee: true, condition: null },
    // 五子印五階：三人任一所站的格必定觸發委託。逐人一條。
    [FX.commZhangliaoSure]: {
      scope: 'all', standing: stands('notable:zhangliao'), addPct: 0, guarantee: true, condition: null,
    },
    [FX.commYujinSure]: {
      scope: 'all', standing: stands('notable:yujin'), addPct: 0, guarantee: true, condition: null,
    },
    [FX.commLejinSure]: {
      scope: 'all', standing: stands('notable:lejin'), addPct: 0, guarantee: true, condition: null,
    },
  },

  EncounterChance: {
    [FX.encSelf20]: { scope: 'all', standing: STAND_SELF, addPct: 0.20, guarantee: false, condition: null },
    [FX.encSelf15]: { scope: 'all', standing: STAND_SELF, addPct: 0.15, guarantee: false, condition: null },
    [FX.encItem12]: { scope: 'all', standing: STAND_NONE, addPct: 0.12, guarantee: false, condition: null },
    [FX.encItem20]: { scope: 'all', standing: STAND_NONE, addPct: 0.20, guarantee: false, condition: null },
    [FX.encItem25]: { scope: 'all', standing: STAND_NONE, addPct: 0.25, guarantee: false, condition: null },
    [FX.encDianweiSure]: {
      scope: 'all', standing: stands('notable:dianwei'), addPct: 0, guarantee: true, condition: null,
    },
    [FX.encIntSure]: { scope: 'int', standing: STAND_NONE, addPct: 0, guarantee: true, condition: null },
  },

  // ── 稀有度。位移作用在分佈上，地板作用在結果上（兩件事）。
  RarityWeight: {
    [FX.rarity02]: { shift: 0.2, condition: null },
    [FX.rarity03]: { shift: 0.3, condition: null },
    [FX.rarity04]: { shift: 0.4, condition: null },
    [FX.rarity05]: { shift: 0.5, condition: null },
    [FX.rarity06]: { shift: 0.6, condition: null },
  },
  RarityFloor: {
    // 亂武：抽到 ★1／★2 的委託時直接升為 ★3。抬地板，不是抬天花板。
    [FX.rarityFloor3]: { min: 3, condition: null },
  },

  GainMultiplier: {
    [FX.gainInt8]: { scope: 'int', mulPct: 0.08, condition: null },
    [FX.gainInt15]: { scope: 'int', mulPct: 0.15, condition: null },
    [FX.gainWar8]: { scope: 'war', mulPct: 0.08, condition: null },
    [FX.gainWar15]: { scope: 'war', mulPct: 0.15, condition: null },
    [FX.gainWar10]: { scope: 'war', mulPct: 0.10, condition: null },
    [FX.gainWar20]: { scope: 'war', mulPct: 0.20, condition: null },
    [FX.gainLead15]: { scope: 'lead', mulPct: 0.15, condition: null },
    [FX.gainLead20]: { scope: 'lead', mulPct: 0.20, condition: null },
    [FX.gainPol15]: { scope: 'pol', mulPct: 0.15, condition: null },
    [FX.gainAll8]: { scope: 'all', mulPct: 0.08, condition: null },
    [FX.gainAll10]: { scope: 'all', mulPct: 0.10, condition: null },
  },

  /**
   * 起始好感 ★ 【不是站位效果】，因此不吃好感門檻 —— 那會是個死結。
   * 逐人逐階手寫，於是「典韋二星就到 60、曹操二星才 40」寫得出來。
   */
  AffinityGrant: {
    [FX.startSelf20]: { timing: 'onDreamEnter', target: SELF, amount: 20, condition: null },
    [FX.startRandom15]: { timing: 'onDreamEnter', target: ALL, amount: 8, condition: null },
    [FX.startAll10]: { timing: 'onDreamEnter', target: ALL, amount: 10, condition: null },
    [FX.startCaocao20]: { timing: 'onDreamEnter', target: named('notable:caocao'), amount: 20, condition: null },
    [FX.startGuojia20]: { timing: 'onDreamEnter', target: named('notable:guojia'), amount: 20, condition: null },
    [FX.startXunyu20]: { timing: 'onDreamEnter', target: named('notable:xunyu'), amount: 20, condition: null },
    [FX.startZhangliao30]: {
      timing: 'onDreamEnter', target: named('notable:zhangliao'), amount: 30, condition: null,
    },
    [FX.startYujin30]: {
      timing: 'onDreamEnter', target: named('notable:yujin'), amount: 30, condition: null,
    },
    [FX.startLejin30]: {
      timing: 'onDreamEnter', target: named('notable:lejin'), amount: 30, condition: null,
    },
  },

  /**
   * 好感成長 ★ 加快成長 ＝ 提早解鎖整個站位層。
   * 它與「起始好感」是同一件事的兩種買法：一次性跳過 vs 持續加速。
   */
  AffinityGrowth: {
    [FX.growAll15]: { target: ALL, mulPct: 0.15, condition: null },
    [FX.growSelf50]: { target: SELF, mulPct: 0.50, condition: null },
    [FX.growAll20]: { target: ALL, mulPct: 0.20, condition: null },
    [FX.growWarClass25]: { target: clazz('war'), mulPct: 0.25, condition: null },
    [FX.growPolClass25]: { target: clazz('pol'), mulPct: 0.25, condition: null },
    [FX.growCaocao80]: { target: named('notable:caocao'), mulPct: 0.80, condition: null },
    [FX.growDianwei80]: { target: named('notable:dianwei'), mulPct: 0.80, condition: null },
    [FX.growGuojia80]: { target: named('notable:guojia'), mulPct: 0.80, condition: null },
    [FX.growXunyu80]: { target: named('notable:xunyu'), mulPct: 0.80, condition: null },
    [FX.growZhangliao80]: { target: named('notable:zhangliao'), mulPct: 0.80, condition: null },
    [FX.growZhangliao60]: { target: named('notable:zhangliao'), mulPct: 0.60, condition: null },
    [FX.growYujin60]: { target: named('notable:yujin'), mulPct: 0.60, condition: null },
    [FX.growLejin60]: { target: named('notable:lejin'), mulPct: 0.60, condition: null },
  },

  CheckValueBonus: {
    [FX.sortieAll8]: { attr: 'all', scope: 'major', add: 8, condition: null },
    [FX.sortieWar6]: { attr: 'war', scope: 'both', add: 6, condition: null },
    [FX.sortieInt6]: { attr: 'int', scope: 'both', add: 6, condition: null },
    [FX.sortiePol6]: { attr: 'pol', scope: 'both', add: 6, condition: null },
    [FX.sortieLead6]: { attr: 'lead', scope: 'both', add: 6, condition: null },
    [FX.sortieAll6]: { attr: 'all', scope: 'major', add: 6, condition: null },
    [FX.sortieAll10]: { attr: 'all', scope: 'major', add: 10, condition: null },
    [FX.sortieAll16]: { attr: 'all', scope: 'major', add: 16, condition: null },
    // 賈詡五階：只在【險】檔生效。他提高險檔的成功率，張遼放大險檔的獎勵。
    [FX.majorHardWar40]: { attr: 'all', scope: 'major', add: 40, condition: HARD },
    [FX.majorWar30]: { attr: 'war', scope: 'major', add: 30, condition: null },
    [FX.majorCivil45]: { attr: 'int', scope: 'major', add: 45, condition: null },
    [FX.majorWar60]: { attr: 'war', scope: 'major', add: 60, condition: null },
  },

  CheckRetry: {
    [FX.retryMajor1]: { scope: 'major', usesPerRun: 1, condition: null },
    [FX.retryMinor1]: { scope: 'minor', usesPerRun: 1, condition: null },
  },

  CheckRewardBonus: {
    [FX.checkReward10]: { mulPct: 0.10, condition: null },
    [FX.checkReward15]: { mulPct: 0.15, condition: null },
    [FX.checkReward20]: { mulPct: 0.20, condition: null },
    [FX.checkReward25]: { mulPct: 0.25, condition: null },
    [FX.checkRewardHard25]: { mulPct: 0.25, condition: HARD },
    [FX.checkRewardHard30]: { mulPct: 0.30, condition: HARD },
  },

  RevealInfo: {
    [FX.revealCheck]: { what: 'checkBreakdown', condition: null },
    [FX.revealSlots]: { what: 'nextTurnSlots', condition: null },
  },

  CurrencyBonus: {
    [FX.meritAll30]: { currency: 'allMerit', mulPct: 0.30, condition: null },
    [FX.meritAll20]: { currency: 'allMerit', mulPct: 0.20, condition: null },
    [FX.meritMartial5]: { currency: 'merit.martial', mulPct: 0.05, condition: null },
    [FX.meritMartial10]: { currency: 'merit.martial', mulPct: 0.10, condition: null },
    [FX.meritMartial15]: { currency: 'merit.martial', mulPct: 0.15, condition: null },
    [FX.meritMartial20]: { currency: 'merit.martial', mulPct: 0.20, condition: null },
    [FX.meritCivil5]: { currency: 'merit.civil', mulPct: 0.05, condition: null },
    [FX.meritCivil8]: { currency: 'merit.civil', mulPct: 0.08, condition: null },
    [FX.meritCivil10]: { currency: 'merit.civil', mulPct: 0.10, condition: null },
    [FX.meritCivil15]: { currency: 'merit.civil', mulPct: 0.15, condition: null },
    [FX.meritCivil20]: { currency: 'merit.civil', mulPct: 0.20, condition: null },
  },

  // 可自行指定的玩伴人數。配置階段求值，因此 condition 恆為 null。
  DesignateSlots: {
    [FX.designate1]: { slots: 1, condition: null },
    [FX.designate3]: { slots: 3, condition: null },
  },
};
