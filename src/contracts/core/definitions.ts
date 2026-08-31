import type {
  CampaignId, ChapterId, DcCurveId, EndingId, EnemyId, EventChainId, EventDefId,
  FactionId, ItemId, ItemPoolId, L10nKey, MajorCheckId, NotableId, NotablePoolId,
  PackId, ParamPoolId, ShopItemId, SkillId, TalentId, TraitId,
} from './ids.js';
import type {
  AbilityTier, AffinityStage, AptitudeGrade, Attr, AttrGrade, CareerLine, Difficulty,
  GlowTier, MeritKind, OptionTier, Phase, Rarity, SkillKind,
} from './primitives.js';
import type { Condition, EffectRef } from './effects.js';

export type DefinitionKind =
  | 'glowTier' | 'aptitudeGrade' | 'trainingAction' | 'trainingCurve'
  | 'eventYieldCurve' | 'attrLine'
  | 'affinityStage' | 'affinityCurve' | 'linkBonus' | 'attributeCap' | 'notableStar'
  | 'notable' | 'notablePool' | 'talent' | 'aptitudeCost'
  | 'event' | 'paramPool' | 'dcCurve' | 'checkRule'
  | 'chapter' | 'chapterSequence' | 'majorCheck'
  | 'careerRank' | 'faction' | 'ending'
  | 'item' | 'itemPool'
  | 'shopItem' | 'settlementFormula' | 'gameRules'
  // ── ㉜ 養成兌現 ／ ㉓ 特質與技能 ／ ㉝ 戰役（RFC-01）★ ──
  | 'growthRule' | 'trait' | 'skill'
  | 'battleRule' | 'enemy' | 'campaign';

export interface DefHeader {
  readonly id: string;
  readonly kind: DefinitionKind;
  readonly schemaVersion: number;
  readonly packId: PackId;
}

// ── 全域表 ────────────────────────────────────────────
export interface GlowTierDef extends DefHeader {
  readonly kind: 'glowTier';
  readonly tier: GlowTier;
  readonly order: number;
  readonly yieldMul: number;
  readonly baseWeight: number;
  /**
   * 該光階抽出各稀有度委託的權重，index ＝ rarity − 1（17 §2.2）。
   *
   * 光階在新制下有兩個作用：放大四維產出，以及【決定跟著來的委託有多大】。
   * 同一個訊號餵兩個報酬，是刻意的 —— 玩家在選之前就讀得到它，
   * 而「紅光那一格」因此同時意味著數字大與機會大。
   *
   * 權重為 0 的稀有度代表該光階抽不到它。任一光階抽得到的
   * （維 × 稀有度）組合都必須有內容，由載入期驗證強制（不做 runtime 降級）。
   */
  readonly rarityWeights: readonly number[];
}
export interface AptitudeGradeDef extends DefHeader {
  readonly kind: 'aptitudeGrade';
  readonly grade: AptitudeGrade;
  readonly shiftSteps: number;
  readonly yieldMul: number;
}
export interface TrainingActionDef extends DefHeader {
  readonly kind: 'trainingAction';
  readonly attr: Attr;
  readonly phase: Phase;
  readonly labelKey: L10nKey;
  readonly subtitleKeys: readonly L10nKey[];
}
export interface TrainingCurveDef extends DefHeader {
  readonly kind: 'trainingCurve';
  readonly baseByAttr: Readonly<Record<Attr, number>>;
  readonly chapterMultiplier: readonly number[];
  readonly upgradeBaseChance: number;
  readonly shiftStepRatio: number;
  /**
   * 另一條官階線對 base 的貢獻比例（16 §4.3）★
   *
   * 官階抬 base 用的是【該維所屬那條線】的階級。純粹如此的話，
   * 武官八階想轉練文政時 base 只有 10（新兵水準），而武統是 10＋rank8 ——
   * 轉換道路的代價過重，實測「後期幾乎不可能換路」。
   *
   * 這個比例讓另一線的官階也算進來（打折）：你已經是個大官了，
   * 學什麼都比新兵快，只是本行更快。0 ＝ 完全不共用，1 ＝ 兩線等價。
   */
  readonly crossLineRatio: number;
  /**
   * 固定事件自己的功績產出（16 §4.2）。走 `attrLine` 對應的那一條官階。
   *
   * 刻意【少】：委託才是功績的主要來源。但不能是零 ——
   * 若功績完全由抽出來的委託決定，玩家對自己的官途就沒有任何主導權，
   * 「選哪一格」也就不再同時是「選哪條生涯線」。
   */
  readonly meritByAttr: Readonly<Record<Attr, number>>;
}

/**
 * 四維 → 官階線的對照表（20 §1.3）。
 *
 * 統與武算武功、智與政算文功。這是【資料】而不是程式裡的 switch：
 * 換一份平衡包時「政要不要算武功」是可能改的，而寫在程式裡的話
 * 那個決定會散落在功績結算、大檢定路線、UI 三個地方。
 */
export interface AttrLineDef extends DefHeader {
  readonly kind: 'attrLine';
  readonly byAttr: Readonly<Record<Attr, CareerLine>>;
}
export interface AffinityStageDef extends DefHeader {
  readonly kind: 'affinityStage';
  readonly stage: AffinityStage;
  readonly min: number;
  readonly max: number;
}
/**
 * 局內好感度的產出與回收（10 §2）。
 *
 * 【碎片不再直接換初始好感度】—— 它換的是升星，初始好感度由星階推導。
 * 舊版一份碎片同時是「初始好感」與「解鎖條進度」兩件事的貨幣，
 * 玩家看不出自己在買什麼；改成單一階梯之後，一次升星同時給
 * 連動倍率、初始好感、解鎖條，三件事一起前進。
 */
export interface AffinityCurveDef extends DefHeader {
  readonly kind: 'affinityCurve';
  /** 可指定為玩伴所需的最低星階。皇甫嵩指派是預設，指定是特權（14 §3）。 */
  readonly designateStar: number;
  /**
   * 所有名士共通的入夢起始好感（10 §2）★
   *
   * 逐人的差異由星階解鎖條的 `AffinityGrant` 相加而來，不再由一張全域
   * 星階表推導 —— 「典韋二星就到 60、曹操二星才 40」是逐人手寫的設計，
   * 而不是同一階給同一個值。
   */
  readonly baseStartAffinity: number;
  readonly fragmentsByStage: Readonly<Record<AffinityStage, number>>;
  readonly fullDreamMultiplier: number;
}

/**
 * 升星的一階（19 §5.3）★
 *
 * 星是【記憶碎片的突破】，不是稀有度。這張表只管【價格】——
 * 每一階給什麼是【逐人手寫】的（`NotableDef.unlocks`），
 * 不是一張全域表。
 *
 * 舊版把 `linkMultiplier` 與 `startAffinity` 放在這裡，於是同星階的所有名士
 * 數值完全一樣，「曹操是統御的好夥伴、荀彧是功績的好夥伴」在資料上無法表達。
 * 那兩個欄位已移除：連動倍率變成 `LinkBonus` 解鎖條，起始好感變成
 * `AffinityGrant` 解鎖條，兩者都逐人逐階手寫。
 */
export interface NotableStarTierDef {
  readonly star: number;
  /** 從上一階升上來的碎片成本（star 0 為 0），再乘 `costByRarity`。 */
  readonly fragmentCost: number;
}

export interface NotableStarDef extends DefHeader {
  readonly kind: 'notableStar';
  readonly tiers: readonly NotableStarTierDef[];
  /** 成本倍率。★5 升一階比 ★1 貴 —— 「低星滿級 > 高星低級」靠這個成立。 */
  readonly costByRarity: Readonly<Record<Rarity, number>>;
}
export interface LinkBonusDef extends DefHeader {
  readonly kind: 'linkBonus';
  /**
   * 好感度階段帶來的【額外】站位加成，與 `NotableBaseDef.trainingBonus` 相加
   * 之後成為【該名士自己的倍率】：`1 + base + specialty + stage`。
   *
   * 名士之間則是【相乘】—— 全員擠進同一格是本作刻意保留的爆發時刻（19 §5.2）。
   * 因此這條曲線要比加法制時更平：它會被指數放大。
   */
  /**
   * 【已移除 trainingBonusByStage】。站位連動不再隨局內好感變動 ——
   * 它由 `NotableBaseDef` 的基底乘上星階倍率決定（19 §5.1）。
   *
   * 局內好感度剩下的三個作用：出戰加值、名士事件的階段門檻、結算碎片。
   */
  readonly checkBonusByStage: Readonly<Record<AffinityStage, number>>;
  /**
   * 站位效果的好感門檻（19 §5.1）★
   *
   * 名士身上【所有帶 `standing` 的效果】都要好感達到這一階才發放：
   * 連動加成、基礎值、同格格的旗標機率、放大同伴 —— 全部。
   * 跨過之前，把人放進格子的回報是【零】，不是比較少。
   *
   * 這是資料而不是常數：門檻放在哪一階是平衡決定。它同時解釋了
   * 為什麼「起始好感」值得佔掉一整階星 —— 那買的是【時間】。
   *
   * 【道具不吃這道門檻】—— 道具沒有好感可查（effects.ts §StandingReq）。
   */
  readonly linkStage: AffinityStage;
  readonly gainPerTraining: number;
  /** 站位分配的基礎權重。四格都是它，偏好由 `SlotBias` 疊上去（19 §4）。 */
  readonly slotBaseWeight: number;
  /** 一格可容納的名士數。要讓「全員同格」成立，它必須 ≥ 陣容人數。 */
  readonly maxPerSlot: number;
  /**
   * 同格人數的額外倍率，index ＝ 該格人數（0 與 1 應為 1，＝ 沒有加成）。
   *
   * 為什麼需要它：純粹的名士相乘【到不了爆發的量級】。實測（400 輪）
   * 單純相乘的最高倍率只有 ×2.75，四人同格也才 ×2 出頭 ——
   * 因為每個人的加成必須夠小才不會在六人同格時指數爆炸，
   * 而那個上限反過來壓死了三、四人同格的爽感。
   *
   * 這條曲線把爆發【只放在人多的時候】：一兩人同格幾乎不受影響，
   * 四人以上才陡升。於是常見情況不通膨，罕見情況真的爽。
   */
  readonly pileMultiplier: readonly number[];
  /**
   * 格子倍率的上限。乘法疊加的安全閥 ——
   * 沒有它，六位滿好感 ★5 同格會到 ×15 以上，一回合就把四維推上限，
   * 爆發感反而被上限吃掉。訂在「實際玩得到的最高疊加」之上一點點。
   */
  readonly maxSlotMultiplier: number;
}
export interface AttributeCapDef extends DefHeader {
  readonly kind: 'attributeCap';
  readonly attrMax: number;
}
export interface GameRulesDef extends DefHeader {
  readonly kind: 'gameRules';
  readonly maxSortie: number;
  readonly companionCount: number;
  /** 開局可自行指定的玩伴人數。其餘由皇甫嵩指派（14 §3）。 */
  readonly designateBase: number;
  readonly superiorCount: number;
  /**
   * 委託旗標的基礎機率（15 §3）★ 每格【獨立】擲，因此四格可能全有。
   *
   * 它不是「每回合的委託數」：玩家只選一格，所以有效觸發率由玩家決定 ——
   * 一路追驚嘆號約 1-(1-p)^4，一路追光階就只有 p。功績收入因此是
   * 玩家可調的旋鈕，不是系統常數，校準要抓中間值。
   */
  readonly commissionChance: number;
  /** 人物事件旗標的基礎機率。與委託【互相獨立】，同一格可以兩個都亮。 */
  readonly encounterChance: number;
  /** 可攜帶進場的道具格數（23 §5）。高階道具一輪只掉一次，所以這是碎片產線。 */
  readonly carrySlots: number;
}

// ── 名士 ──────────────────────────────────────────────
/**
 * 名士的一條解鎖能力（10 §3）★
 *
 * 門檻是【星階】不是好感度。星＝記憶碎片的突破，是跨局投資；
 * 好感度是局內養出來的，它管的是【站位效果開不開】（`linkBonus.linkStage`）
 * 與事件門檻，不是「解鎖了哪些條」。兩者混用會讓玩家分不清自己在買什麼。
 *
 * 【累加不取代】—— `supersedes` 已移除。曹操 1／3／5 星各給統御同框 +15／+15／+20%，
 * 滿星共 +50%；後階不會把前階蓋掉。取代語意會讓「升星反而變弱」變成可能，
 * 而那是資料寫錯就會發生、卻沒有任何測試會失敗的一類 bug。
 *
 * `star: 0` 的那幾條就是【0 星基礎組】—— 不是空白起點，每人都有。
 */
export interface UnlockRow extends EffectRef {
  readonly star: number;
  readonly descKey: L10nKey;
}
/**
 * 名士的【結構性】資料 —— 不是數值（19 §5.1）★
 *
 * 站位加成不在這裡。它全部走 `unlocks` 的 `LinkBonus`（含 0 星那條通用的），
 * 因為那樣才會【一律吃好感 60 的門檻】。舊版有一個 `trainingBonus` 欄位
 * 直接繞過門檻：同一位名士在好感 0 時站上去照樣給加成，與「跨過之前回報是零」
 * 的規則互相矛盾，而那個矛盾不會讓任何測試失敗。
 *
 * 剩下的三個欄位都不是加成：
 *   specialty       他屬於哪一維。站位分配與 `NotableTarget.specialty` 都靠它
 *   specialtyWeight 專長格的站位權重倍率（機率，不是收益）
 *   sortieBonus     大檢定出戰的基底加值（那是另一套系統）
 */
export interface NotableBaseDef {
  /** 專長維。決定他更常被分配到哪一格，也決定「某類名士」指的是誰。 */
  readonly specialty: Attr;
  /** 專長格的站位權重倍率。> 1 ＝ 更常站在專長格；不是硬性限制（19 §4）。 */
  readonly specialtyWeight: number;
  /** 大檢定出戰的基底加值（與階段加值相加）。 */
  readonly sortieBonus: number;
}

/**
 * 名士的能力表（33 §3）★
 *
 * `attrs` 與玩家同尺（0–100）—— 戰前配置畫面上四個人擺在一起可以直接比，
 * 這是驗收型的資訊層唯一成立的方式。
 *
 * `skills` 逐條帶 `star`：**星階決定他有幾招可選**，玩家從已開放的裡面挑一招帶。
 * 好感則決定他【多常傳令】（33 §4.3）。兩條現成的軸各一個職責，都不碰他的數值。
 */
export interface NotableAbilityDef {
  readonly attrs: Readonly<Record<Attr, number>>;
  /** 他身上的特質。玩家好感達標即可向他學（32 §5）。 */
  readonly traits: readonly TraitId[];
  readonly skills: readonly NotableSkillRow[];
}
export interface NotableSkillRow {
  /** 幾星開放這一招。0 ＝ 一開始就能帶。 */
  readonly star: number;
  readonly skillId: SkillId;
}

export interface NotableDef extends DefHeader {
  readonly kind: 'notable';
  readonly notableId: NotableId;
  readonly rarity: Rarity;
  readonly factionId: FactionId;
  readonly nameKey: L10nKey;
  /** 基底。取代了原本的 `role` —— 那個欄位沒有任何程式讀它，是假裝成資料的註解。 */
  readonly base: NotableBaseDef;
  /**
   * 他的能力表（33 §3.1）★ 同時是他的【教學表】——
   * 他能教你的，就是他自己表上有的（32 §5.1）。不另立一張「誰能教什麼」，
   * 否則同一件事會有兩份可能互相漂移的資料。
   */
  readonly abilities: NotableAbilityDef;
  readonly unlocks: readonly UnlockRow[];
  // 事件鏈【不在這裡】：由 EventDef.trigger 的 notable 分支反查（19 §6）。
  // 兩邊都存會有兩份可能不一致的真相 —— 舊版就是那樣。
}
export interface NotablePoolDef extends DefHeader {
  readonly kind: 'notablePool';
  readonly poolId: NotablePoolId;
  readonly factionId: FactionId;
  readonly entries: readonly PoolEntry[];
}
export interface PoolEntry {
  readonly notableId: NotableId;
  readonly weight: number;
  readonly requirements: readonly Condition[];
}

// ── 天賦與資質 ────────────────────────────────────────
export interface TalentDef extends DefHeader {
  readonly kind: 'talent';
  readonly talentId: TalentId;
  readonly cost: number;
  readonly nameKey: L10nKey;
  readonly descKey: L10nKey;
  readonly exclusiveGroup: string | null;
  readonly effects: readonly EffectRef[];
}
export interface AptitudeCostDef extends DefHeader {
  readonly kind: 'aptitudeCost';
  readonly defaultGrade: AptitudeGrade;
  readonly cumulativeCost: Readonly<Record<AptitudeGrade, number>>;
}

// ── 事件 ──────────────────────────────────────────────
export type EventReward =
  | { readonly kind: 'merit'; readonly merit: MeritKind; readonly amount: number }
  | { readonly kind: 'attr'; readonly attr: Attr; readonly amount: number }
  | { readonly kind: 'affinity'; readonly notableId: NotableId | null; readonly amount: number }
  /** 指名一件道具。`chance` ＝ 1 為保證（鏈末事件），< 1 為機率（人物委託）。 */
  | { readonly kind: 'item'; readonly itemId: ItemId; readonly chance: number }
  /** 從一個道具池裡抽一件。一般委託的低階掉落走這條（23 §6）。 */
  | { readonly kind: 'itemPool'; readonly poolId: ItemPoolId; readonly chance: number }
  /**
   * 當局獎勵：本輪剩餘回合都生效的一條效果（23 §8）。
   *
   * 與道具的分工 —— 遺物帶得走，當局獎勵只在這一輪。它因此能做道具做不到的事：
   * 一次性改寫本輪的規則（賈詡的「★1／★2 委託直接升為 ★3」）。
   */
  | { readonly kind: 'boon'; readonly ref: EffectRef }
  /**
   * 讓一項特質或技能進入【可學清單】（32 §5）★
   *
   * 舊制的 `skill` 獎勵是白給的；RFC-01 D35 之後一切都要先解鎖再花經驗學。
   * 於是「你能學什麼」與「你買不買得起」是兩道獨立的門。
   */
  | { readonly kind: 'unlock'; readonly trait: TraitId | null; readonly skill: SkillId | null };

/**
 * 事上磨練：本選項會鍛鍊到哪些維度、各佔多少權重。
 *
 * 與 `EventReward` 的 `attr` 是兩件事，不可互相取代：
 *   practice  ＝ 做事本身的經驗累積，隨章節倍率縮放，每個選項都有（系統性）
 *   reward.attr ＝ 劇情級的一次性躍升（呂布單挑 +22 武），手寫、不縮放（例外）
 * 混用會讓「事件也會長能力」變成逐條運氣，而不是可依賴的規則。
 */
export interface EventPractice {
  readonly attr: Attr;
  readonly weight: number;
}

export interface EventOptionDef {
  /** 三檔之一。同一則委託必須各有一個，由載入期驗證強制（17 §5）。 */
  readonly tier: OptionTier;
  readonly labelKey: L10nKey;
  readonly requirements: readonly Condition[];
  readonly check: { readonly attr: Attr; readonly dcCurveId: DcCurveId } | null;
  readonly practice: readonly EventPractice[];
  readonly rewards: readonly EventReward[];
}
export interface ParamSlot {
  readonly name: string;
  readonly poolId: ParamPoolId;
}
/**
 * 事件的來源。取代舊的 `eventKind` ＋ `ownerNotable` ＋ `commissionKind`
 * 三個鬆散欄位 —— 那三者的合法組合是隱性的（notable 必須有 owner、
 * commission 必須沒有），只能靠驗證規則事後補。判別聯集讓型別直接說出來。
 *
 * `commissionKind` 順帶刪除：它被寫在每一則委託上，卻【沒有任何程式讀它】,
 * 是假裝成資料的註解（與先前刪掉的 `NotableDef.role` 同一類）。
 */
/**
 * 人物事件的一位出場者（19 §6.2）★
 *
 * `cast` 長度 1 就是單人事件 —— 單人與多人【不需要兩套機制】。
 * 全員都要在陣容中、且各自好感達標，這則事件才進可抽池。
 */
export interface NotableCastRef {
  readonly notableId: NotableId;
  readonly minStage: AffinityStage;
}

export type EventTrigger =
  /** 固定事件引發的立功機會。attr 定位池，rarity 由光階抽出（17 §2.2）。 */
  | { readonly kind: 'commission'; readonly attr: Attr; readonly rarity: Rarity }
  /**
   * 人物事件。獨立的第三拍，與委託【沒有從屬關係】（19 §6）★
   *
   * 觸發與同格【無關】：只要 cast 全員在陣容、各自好感達標、
   * 前一步本輪已發生過，就進可抽池。同格仍然重要 —— 但它餵的是
   * 好感（門檻），不是觸發本身。
   *
   * 多階段用 `chainId ＋ step` 表達：step N 要求同鏈 step N−1 本輪已觸發。
   * 進度【不另存】—— 鏈上的事件一律 `unique`，因此「發生過沒有」
   * 就是 `turn.seenUniqueIds` 裡有沒有它，不需要第二份真相。
   */
  | {
    readonly kind: 'notable';
    readonly chainId: EventChainId;
    readonly step: number;
    readonly cast: readonly NotableCastRef[];
  };

export interface EventDef extends DefHeader {
  readonly kind: 'event';
  readonly eventDefId: EventDefId;
  readonly trigger: EventTrigger;
  readonly unique: boolean;
  readonly collectible: boolean;
  readonly weight: number;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly paramSlots: readonly ParamSlot[];
  readonly requirements: readonly Condition[];
  readonly options: readonly EventOptionDef[];
}
/**
 * 事件的產出曲線 —— 四維（practice）與貨幣（fame／merit）共用同一條章節縮放。
 *
 * 形狀刻意與 `TrainingCurveDef` 對齊：「上課 vs 工作」的差距就是這兩張表
 * baseByAttr 的比值，只有一個平衡旋鈕。
 *
 * `chapterMultiplier` 同時縮放兩者，因為它們是同一件事的兩面：
 * 後期的委託是更大的任務 —— 出的力更多，拿到的名聲功績也更多。
 * 貨幣若留在作者寫死的固定值，第 9 章一則委託的 22 功績對照
 * 官階門檻 1830 等於沒給，事件會在後段自然死掉（與四維同一類問題）。
 *
 * 不寫死成「鍛鍊的 N 成」：委託本來就該能逐類型調校
 * （討伐練武比跑腿練政更兇），做成獨立曲線才留得下這個空間。
 */
export interface EventYieldCurveDef extends DefHeader {
  readonly kind: 'eventYieldCurve';
  readonly baseByAttr: Readonly<Record<Attr, number>>;
  /**
   * 委託產出的縮放，index ＝ 官階階級 − 1（17 §6.4）。
   *
   * 與 DC 曲線【共用同一個索引】是刻意的：難度與報酬必須一起長，
   * 否則「把某一線的官階壓低」會變成刷簡單高報酬委託的農場。
   */
  readonly tierMultiplier: readonly number[];
  /** 檢定失敗時仍給的比例。事情辦砸了，但人還是走過那一趟（17 §6.3）。 */
  readonly failRatio: number;
  /**
   * 稀有度倍率，index ＝ rarity − 1（17 §6.5）。
   *
   * 光階決定抽到多稀有的委託，這張表決定「稀有」值多少。少了它，
   * 紅光帶來的只是不一樣的文字 —— 玩家看到紅光時該期待的是【更大的事】。
   */
  readonly rarityMultiplier: readonly number[];
}

export interface ParamPoolDef extends DefHeader {
  readonly kind: 'paramPool';
  readonly poolId: ParamPoolId;
  readonly entries: readonly L10nKey[];
}
/**
 * 小檢定的 DC 曲線（17 §4）★
 *
 * 【索引是官階階級，不是章節】。這是實測逼出來的改動：
 * 章節索引讓一個後期才開始練文政的玩家，用第 1 章的政去對第 4 章的 DC ——
 * 成功率恆為 0%，那條路等於封死，「轉換道路」在制度上不可能。
 *
 * 改由【該委託所屬官階線的階級】索引之後，文武兩軌各自獨立計時：
 * 你文官一階，朝廷派給你的文事就是一階的難度；武官八階，武事就是八階的難度。
 * 報酬用同一個索引縮放（`tierMultiplier`），所以低階不會變成好賺的農場。
 */
export interface DcCurveDef extends DefHeader {
  readonly kind: 'dcCurve';
  readonly curveId: DcCurveId;
  /** index ＝ 官階階級 − 1。長度必須 ≥ 官階數。 */
  readonly byTier: readonly number[];
}

// ── 章節與檢定 ────────────────────────────────────────
export interface MajorCheckTier {
  readonly dc: number;
  readonly requirements: readonly Condition[];
  readonly rewards: readonly EventReward[];
  readonly briefKey: L10nKey;
}
/**
 * 一條路線＝一種通關方式（18 §2.2）。同一個大事件，文武各有自己的屬性組與 DC：
 * 黃巾之亂可以陣前破賊（武），也可以安民斷糧（文）。
 *
 * 屬性組放在路線上而不是檢定上 —— 否則「兩條路線」只是同一場檢定的兩種記帳方式，
 * 玩家的六個選項實際上仍然只有三個。
 */
export interface MajorCheckRoute {
  readonly primaryAttr: Attr;
  readonly secondaryAttr: Attr | null;
  readonly tiers: Readonly<Record<Difficulty, MajorCheckTier>>;
}
export interface MajorCheckDef extends DefHeader {
  readonly kind: 'majorCheck';
  readonly checkId: MajorCheckId;
  readonly routes: Readonly<Record<CareerLine, MajorCheckRoute>>;
  readonly enemyNotables: readonly NotableId[];
}
export interface ChapterDef extends DefHeader {
  readonly kind: 'chapter';
  readonly chapterId: ChapterId;
  readonly factionId: FactionId | null;
  readonly order: number;
  readonly length: number;
  readonly titleKey: L10nKey;
  readonly majorCheckId: MajorCheckId;
  readonly onPass: 'chooseFaction' | null;
}
export interface ChapterSequenceDef extends DefHeader {
  readonly kind: 'chapterSequence';
  readonly factionId: FactionId | null;
  readonly chapters: readonly ChapterId[];
}
export interface CheckRuleDef extends DefHeader {
  readonly kind: 'checkRule';
  readonly secondaryWeight: number;
  readonly rollMin: number;
  readonly rollMax: number;
  /**
   * 骰子以【比例】而非加法作用：total = value × (1 + (roll - center) / spread)。
   * 加法骰在檢定值放大到數百後，±50 的擺幅只佔數個百分點 ——
   * 成功率會塌成 100% 或 0%，「難度自選」就不再是決策。
   */
  readonly rollCenter: number;
  readonly rollSpread: number;
  /**
   * 檢定值下限。比例骰在 value=0 時任何 DC 都是 0% ——
   * 第 1 回合四維全 0，沒有下限的話開局所有檢定都必敗。
   */
  readonly baseFloor: number;
}

// ── 官階・陣營・結局 ──────────────────────────────────
export interface CareerRankDef extends DefHeader {
  readonly kind: 'careerRank';
  readonly line: CareerLine;
  readonly level: number;
  readonly nameKey: L10nKey;
  readonly requiredMerit: number;
  /**
   * 兵量／糧量的係數（33 5.1）★ 取代 checkBonus 的職責 ——
   * 大檢定不再是單次判定，官階的產出改為【規模】。
   *
   * 兩線各給一個，由 33 依 1.0 / 0.5 的交叉比例組合：
   *   兵量 = 1.0 x hostScale[武階] + 0.5 x hostScale[文階]
   *   糧量 = 0.5 x hostScale[武階] + 1.0 x hostScale[文階]
   *
   * 0.5 那一項自帶防退化底線：純武官的糧量有近八成來自他自己的武官階，
   * 因此零糧秣不可能出現，不需要另加基底常數。
   */
  readonly hostScale: number;
  /**
   * 官階抬高【該線所屬四維】固定事件的基礎值（16 §4.3、21 §3）★
   *
   * 這是官階的主要回報 —— 對照《實況野球》的訓練設施升級：身分變高了，
   * 你練的東西本身就不一樣（有幕僚、有場地、有人替你張羅）。
   *
   * 【相加到 base，不是再乘一層】。乘法會與光階、名士倍率複合成指數
   * （名士單格已可到 ×8），一個回合就把四維推上限；相加只是把整條乘法鏈
   * 的起點往上移，形狀不變。
   *
   * 迴圈是這樣閉合的：
   *   投武統 → 武功 → 武官階 → 武統的固定事件更強 → 更多武功
   * 因此「這一回合投哪一維」同時是「我在養哪一條生涯」，而生涯會回頭養它。
   */
  readonly trainingBaseAdd: number;
}
export interface FactionDef extends DefHeader {
  readonly kind: 'faction';
  readonly faction: FactionId;
  readonly nameKey: L10nKey;
  readonly lordId: NotableId;
  readonly requirements: readonly Condition[];
  readonly rejectReasonKey: L10nKey;
  readonly superiorPoolId: NotablePoolId;
  /** 緣分 0..3 的主公台詞。用主公的口吻解釋玩家的 meta 權限（19 §3.2）。 */
  readonly bondSpeechKeys: readonly L10nKey[];
}
export type EndingTrigger =
  | { readonly kind: 'sequenceCompleted' }
  | { readonly kind: 'checkFailed'; readonly attr: Attr | 'any' }
  | { readonly kind: 'noFactionEligible' };
export interface EndingDef extends DefHeader {
  readonly kind: 'ending';
  readonly ending: EndingId;
  readonly endingKind: 'fullDream' | 'aborted';
  readonly factionId: FactionId | null;
  readonly trigger: EndingTrigger;
  readonly requirements: readonly Condition[];
  readonly priority: number;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly pointsMultiplier: number;
  readonly collectible: boolean;
}

// ── 元層 ──────────────────────────────────────────────
export type ShopGrant =
  | { readonly kind: 'aptitudeCap'; readonly attr: Attr; readonly toGrade: AptitudeGrade }
  | { readonly kind: 'aptitudePoints'; readonly delta: number }
  | { readonly kind: 'talentPoints'; readonly delta: number }
  | { readonly kind: 'factionBond'; readonly faction: FactionId; readonly toLevel: number }
  | { readonly kind: 'unlockTalent'; readonly talentId: TalentId }
  | { readonly kind: 'effect'; readonly ref: EffectRef };

export interface ShopLevel {
  readonly level: number;
  readonly cost: number;
  readonly grant: ShopGrant;
}
export interface ShopItemDef extends DefHeader {
  readonly kind: 'shopItem';
  readonly item: ShopItemId;
  readonly category: 'aptitude' | 'talent' | 'bond' | 'glow';
  readonly nameKey: L10nKey;
  readonly descKey: L10nKey;
  readonly levels: readonly ShopLevel[];
  readonly requiresItems: readonly ShopItemId[];
  readonly requiresPack: PackId | null;
}
export interface SettlementFormulaDef extends DefHeader {
  readonly kind: 'settlementFormula';
  readonly perCareerRank: number;
  readonly perChapterPassed: number;
  readonly perTurnSurvived: number;
  readonly fullDreamBonus: number;
}


// ── 道具 ──────────────────────────────────────────────
/**
 * 道具的一階解放（23 §2）★
 *
 * 形狀刻意與名士的 `UnlockRow` 對齊 —— 兩者是同一種東西的兩個來源：
 * 名士的星階突破與道具的階級解放寫的是同一套 FuncType。因此新增一件道具
 * 不需要新機制，平衡也只有一組旋鈕要調。
 *
 * `tier: 0` 是基底（持有即生效），1–5 由碎片解放。累加不取代。
 */
export interface ItemTierDef {
  readonly tier: number;
  /** 從上一階解放上來的碎片成本（tier 0 為 0）。 */
  readonly fragmentCost: number;
  readonly effects: readonly EffectRef[];
  readonly descKey: L10nKey;
}

/**
 * 一件道具（23 §1）★
 *
 * 【道具不加四維，只改規則】。它能給的是獲取量倍率、基礎值、
 * 各種權重與機率、好感成長 —— 不是「智 +40」。一件道具是一條規則的改寫。
 *
 * 強度由【限制的窄度】決定（見 `NotableTarget`）：條件越窄，效果越強。
 * 廣域件每條都比同階的點名件弱，那是規則不是例外。
 */
export interface ItemDef extends DefHeader {
  readonly kind: 'item';
  readonly itemId: ItemId;
  readonly rarity: Rarity;
  /**
   * 一輪最多獲得幾次（23 §5）★ 這是整個道具系統的核心取捨來源。
   *
   *   低階：無上限（用一個大數表示）—— 一輪內天然重複，不必攜帶，自己會滿
   *   高階：1 —— 那一次是「首次獲得」不是重複，【不帶進場就永遠 0 碎片】
   *
   * 碎片 ＝ 本輪【已持有】再度獲得，不是「圖鑑已有」。因此攜帶格只在
   * 高階道具上才是取捨：帶一件高階＝放棄一格戰力去開碎片產線。
   */
  readonly perRunCap: number;
  readonly nameKey: L10nKey;
  readonly descKey: L10nKey;
  readonly tiers: readonly ItemTierDef[];
}

/** 一組可抽的道具。一般委託的低階掉落指向它，而不是逐條指名（23 §6）。 */
export interface ItemPoolDef extends DefHeader {
  readonly kind: 'itemPool';
  readonly poolId: ItemPoolId;
  readonly entries: readonly { readonly itemId: ItemId; readonly weight: number }[];
}

// ── ㉜ 養成兌現（32）★ ────────────────────────────────
/**
 * 一個價格帶 ＝ 一個等級（32 §3.1）。
 *
 * 邊界對齊是刻意的：玩家看到「武 B」就知道下一階要付約多少，
 * 不必在 UI 另外解釋一條成本曲線。
 */
export interface AttrCostBand {
  readonly grade: AttrGrade;
  readonly min: number;
  readonly max: number;
  readonly costPerPoint: number;
}
export interface GrowthRuleDef extends DefHeader {
  readonly kind: 'growthRule';
  /** 依 min 遞增、無洞無重疊、覆蓋 0..attrMax。由載入期驗證強制。 */
  readonly bands: readonly AttrCostBand[];
  /** 向名士學該階能力所需的好感階（32 §5）。階越高，要越熟。 */
  readonly teachStage: Readonly<Record<AbilityTier, AffinityStage>>;
}

// ── ㉓ 特質與技能（23）★ ──────────────────────────────
/** 混合消耗。類數必須等於 `TIER_COST_KINDS[tier]`（23 §2.2）。 */
export type AbilityCost = Readonly<Partial<Record<Attr, number>>>;

export interface TraitDef extends DefHeader {
  readonly kind: 'trait';
  readonly traitId: TraitId;
  readonly tier: AbilityTier;
  readonly nameKey: L10nKey;
  readonly descKey: L10nKey;
  readonly cost: AbilityCost;
  readonly polarity: 'positive' | 'negative';
  readonly effects: readonly EffectRef[];
}

/**
 * 戰役中的一次施放（23 §2.1）★
 *
 * `actorAttr` 一個欄位同時服務主角與名士：主角施放時讀主角的那一維，
 * 名士傳令時讀該名士的。**同一個欄位，兩種施術者，不需要分岔** ——
 * 這也是四職能可以只寫在資料裡、而不是寫成程式分支的原因。
 */
export interface SkillActionDef {
  readonly kind: SkillKind;
  readonly actorAttr: Attr;
  /** 兵量上限的比例（33 §5.2）。傷害、恢復、Buff 幅度都走它。 */
  readonly ratio: number;
  /** buff / debuff 的持續回合。其餘種類為 0。 */
  readonly duration: number;
}
export interface SkillDef extends DefHeader {
  readonly kind: 'skill';
  readonly skillId: SkillId;
  readonly tier: AbilityTier;
  readonly nameKey: L10nKey;
  readonly descKey: L10nKey;
  readonly cost: AbilityCost;
  readonly action: SkillActionDef;
}

// ── ㉝ 戰役（33）★ ────────────────────────────────────
export interface BattleRuleDef extends DefHeader {
  readonly kind: 'battleRule';
  /**
   * 主角每回合的施放機率，index ＝ 第幾招（33 §4.1）。
   * 第一項必須是 1 —— **保底一招**是機制本體，由驗證強制。
   */
  readonly castChances: readonly number[];
  /** 指揮傳令的機率（33 §4.3）。取代舊的 `linkBonus.checkBonusByStage`。 */
  readonly commandChanceByStage: Readonly<Record<AffinityStage, number>>;
  /** 兵量／糧量的基底。係數由 ㉑ 依官階給（33 §5.1）。 */
  readonly troopsBase: number;
  readonly supplyBase: number;
  /** 另一條官階線的折算比例。沿用 `trainingCurve.crossLineRatio` 的形狀。 */
  readonly crossLineRatio: number;
  /** 施術者係數的分母：`attr / divisor`。0–100 尺度下 50 ＝ ×1.0。 */
  readonly actorDivisor: number;
  /** 敵方兵力基準，index ＝ 官階階級 − 1（33 §5.2，D25：索引官階不索引章節）。 */
  readonly enemyTroopsByRank: readonly number[];
  /** 敵方每回合輸出 ＝ 敵方兵力 × 這個比例 × 該關的 damageMul。 */
  readonly enemyDamageRatio: number;
  /** 恢復 1 點軍勢消耗幾點糧秣。1 ＝ 糧量就是「你能補回多少軍勢」（33 §5.3）。 */
  readonly supplyPerTroop: number;
  /** 天賦〈天命所歸〉原地再起時回復的軍勢比例。 */
  readonly rallyRatio: number;
  /**
   * 一關的回合上限。**不是玩法上的回合上限**（D9 明確不做那個）——
   * 它是安全閥：若玩家一招輸出都沒有，戰鬥不能無限跑。
   * 撞到它視為未能取勝，與軍勢歸零同樣處理。
   */
  readonly maxTurns: number;
}

export interface EnemyDef extends DefHeader {
  readonly kind: 'enemy';
  readonly enemyId: EnemyId;
  readonly nameKey: L10nKey;
  readonly attrs: Readonly<Record<Attr, number>>;
  /** 關底敵將每回合施放的那一招。 */
  readonly skillId: SkillId;
}

/**
 * 一關（33 §6.1）。
 *
 * 內容準則：每三關安排一位有名有姓的關底敵將，其餘填雜兵 ——
 * 否則名士對戰的戲沒了，呂布與顏良不會出現在對面。
 */
export interface CampaignStageDef {
  readonly briefKey: L10nKey;
  readonly troopsMul: number;
  readonly damageMul: number;
  readonly boss: EnemyId | null;
  readonly rewards: readonly EventReward[];
}
export interface CampaignDef extends DefHeader {
  readonly kind: 'campaign';
  readonly campaignId: CampaignId;
  readonly chapterId: ChapterId;
  /** 屬敵方、不可派為指揮（沿用 18 §4 的規則）。 */
  readonly enemyNotables: readonly NotableId[];
  readonly stages: readonly CampaignStageDef[];
}

/** Definition kind → 型別對照。Registry 以此提供型別安全的 Reader。 */
export interface DefByKind {
  glowTier: GlowTierDef; aptitudeGrade: AptitudeGradeDef;
  trainingAction: TrainingActionDef; trainingCurve: TrainingCurveDef;
  affinityStage: AffinityStageDef; affinityCurve: AffinityCurveDef;
  notableStar: NotableStarDef;
  linkBonus: LinkBonusDef; attributeCap: AttributeCapDef; gameRules: GameRulesDef;
  notable: NotableDef; notablePool: NotablePoolDef;
  talent: TalentDef; aptitudeCost: AptitudeCostDef;
  event: EventDef; paramPool: ParamPoolDef; dcCurve: DcCurveDef; checkRule: CheckRuleDef;
  eventYieldCurve: EventYieldCurveDef; attrLine: AttrLineDef;
  chapter: ChapterDef; chapterSequence: ChapterSequenceDef; majorCheck: MajorCheckDef;
  careerRank: CareerRankDef;
  faction: FactionDef; ending: EndingDef;
  item: ItemDef; itemPool: ItemPoolDef;
  shopItem: ShopItemDef; settlementFormula: SettlementFormulaDef;
  growthRule: GrowthRuleDef; trait: TraitDef; skill: SkillDef;
  battleRule: BattleRuleDef; enemy: EnemyDef; campaign: CampaignDef;
}
