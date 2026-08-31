// 效果表的具名編號。
//
// 為什麼要有這一層：`referId` 是裸數字，而一個名士的一條能力是由
// （funcType, referId）兩者定位的。裸數字寫在名士表裡讀不出意思，
// 改動時也很容易撞號。具名之後，「曹操 1 星」寫成 `FX.linkLead15`，
// 意思與唯一性都由編譯器顧著。
//
// ── 號段 ────────────────────────────────────────────
//   1xxx  StatModifier          天賦與商店的四維倍率
//   2xxx  EventRewardBonus      事件獎勵倍率
//   3xxx  Glow                  保底光階 ／ 升階機率
//   40xx  SlotBias              站位分配權重
//   41xx  LinkBonus             站位加成（自己）
//   42xx  LinkAmplify           站位加成（放大同格他人）
//   43xx  SlotBaseAdd           同框時的基礎值
//   44xx  SlotSizeBonus         依同格人數的整格倍率
//   45xx  CommissionChance      委託旗標
//   46xx  EncounterChance       人物事件旗標
//   47xx  RarityWeight          稀有度位移
//   48xx  RarityFloor           稀有度地板
//   49xx  GainMultiplier        某維成長量
//   5xxx  Affinity              起始好感 ／ 好感成長
//   6xxx  Check                 檢定值 ／ 重擲 ／ 揭示
//   65xx  CheckRewardBonus      大檢定獎勵
//   7xxx  CurrencyBonus         功績倍率
//   8xxx  DesignateSlots        指名額度

export const FX = {
  // ── StatModifier（天賦與商店沿用）─────────────────
  expIntUp: 1101,
  expAllUp: 1102,
  noGlowBonus: 1103,
  expWarUp: 1104,

  // ── 光階 ────────────────────────────────────────
  glowWarShift: 2901,
  glowLeadShift: 2902,
  glowPolShift: 2903,
  glowIntShift: 2904,
  glowAllShift: 2905,
  glowUpAll8: 3011,
  glowUpAll10: 3012,
  glowUpAll12: 3013,
  glowUpWar10: 3014,
  shopGlow05: 3101,
  shopGlow10: 3102,
  shopGlow17: 3103,
  shopGlow25: 3104,
  talentGlow10: 3201,

  // ── 站位分配權重（不吃好感門檻）───────────────────
  biasSelfLead15: 4001,
  biasSelfWar15: 4002,
  biasSelfInt18: 4003,
  biasSelfPol16: 4004,
  biasWarClass13: 4011,
  biasWarClass16: 4012,
  biasIntClass13: 4013,
  biasPolClass13: 4014,
  biasCaocaoLead18: 4021,
  biasDianweiAll16: 4022,
  biasGuojiaInt18: 4023,
  biasXunyuAll16: 4024,
  biasZhangliaoLead18: 4025,
  biasZhangliaoAll18: 4026,
  biasYujinAll18: 4027,
  biasLejinAll18: 4028,

  // ── LinkBonus（站位加成，吃好感 60）──────────────
  linkAll10: 4101,
  linkAll12: 4102,
  linkAll8: 4103,
  linkLead15: 4111,
  linkLead20: 4112,
  linkWar15: 4113,
  linkWar20: 4114,
  linkWar10: 4115,
  linkInt15: 4116,
  linkPol15: 4117,

  // ── LinkAmplify（放大同格他人）───────────────────
  amplifyAll15: 4201,
  amplifyAll20: 4202,
  amplifyAll12: 4203,
  amplifyCaocao25: 4211,
  amplifyDianwei25: 4212,
  amplifyGuojia25: 4213,
  amplifyZhangliao25: 4214,
  amplifyZhangliao20: 4215,
  amplifyYujin20: 4216,
  amplifyLejin20: 4217,
  amplifyWarClass10: 4218,

  // ── SlotBaseAdd（同框時的基礎值）─────────────────
  baseLead5: 4301,
  baseLead3: 4302,
  baseLead4: 4303,
  baseWar4: 4311,
  baseInt3: 4321,
  basePol5: 4331,
  basePol3: 4332,
  basePol4: 4333,
  baseAll5: 4341,
  baseAll2: 4342,
  baseAll3: 4343,
  itemBaseInt2: 4351,
  itemBaseInt3: 4352,
  itemBaseWar2: 4353,
  itemBaseWar3: 4354,
  itemBaseWar4: 4355,
  itemBaseWar5: 4356,
  itemBasePol2: 4357,
  itemBaseLead4: 4358,
  itemBaseAll2: 4359,

  // ── SlotSizeBonus（依同格人數）───────────────────
  soloBonus20: 4401,
  soloBonus40: 4402,

  // ── 旗標機率 ────────────────────────────────────
  commSelf15: 4501,
  commSelfSure: 4502,
  commItem10: 4503,
  commItem8: 4504,
  commWarSure: 4505,
  commZhangliaoSure: 4506,
  commYujinSure: 4507,
  commLejinSure: 4508,
  encSelf20: 4601,
  encSelf15: 4602,
  encItem12: 4603,
  encItem20: 4604,
  encItem25: 4605,
  encDianweiSure: 4606,
  encIntSure: 4607,

  // ── 稀有度 ──────────────────────────────────────
  rarity03: 4701,
  rarity04: 4702,
  rarity02: 4703,
  rarity05: 4704,
  rarity06: 4705,
  rarityFloor3: 4801,

  // ── 成長量 ──────────────────────────────────────
  gainInt8: 4901,
  gainInt15: 4902,
  gainWar8: 4903,
  gainWar15: 4904,
  gainWar10: 4905,
  gainWar20: 4906,
  gainLead15: 4907,
  gainLead20: 4908,
  gainPol15: 4909,
  gainAll8: 4910,
  gainAll10: 4911,

  // ── 好感 ────────────────────────────────────────
  startSelf20: 5001,
  startRandom15: 5002,
  startAll10: 5003,
  startCaocao20: 5011,
  startGuojia20: 5012,
  startXunyu20: 5013,
  startZhangliao30: 5014,
  startYujin30: 5015,
  startLejin30: 5016,
  growAll15: 5101,
  growSelf50: 5102,
  growAll20: 5103,
  growWarClass25: 5104,
  growPolClass25: 5105,
  growCaocao80: 5111,
  growDianwei80: 5112,
  growGuojia80: 5113,
  growXunyu80: 5114,
  growZhangliao80: 5115,
  growZhangliao60: 5116,
  growYujin60: 5117,
  growLejin60: 5118,

  // ── 檢定 ────────────────────────────────────────
  sortieAll8: 6001,
  sortieWar6: 6002,
  sortieInt6: 6003,
  sortiePol6: 6004,
  sortieLead6: 6005,
  sortieAll6: 6006,
  sortieAll10: 6007,
  sortieAll16: 6008,
  majorHardWar40: 6011,
  majorWar30: 6012,
  majorCivil45: 6013,
  majorWar60: 6014,
  retryMajor1: 6101,
  retryMinor1: 6102,
  revealCheck: 6201,
  revealSlots: 6202,
  checkReward10: 6501,
  checkReward15: 6502,
  checkReward20: 6503,
  checkReward25: 6504,
  checkRewardHard25: 6511,
  checkRewardHard30: 6512,

  // ── 功績 ────────────────────────────────────────
  meritAll30: 7001,
  meritAll20: 7003,
  meritMartial10: 7011,
  meritCivil10: 7012,
  meritCivil15: 7013,
  meritCivil20: 7014,
  meritCivil8: 7015,
  meritMartial15: 7016,
  meritMartial20: 7017,
  meritCivil5: 7018,
  meritMartial5: 7019,

  // ── 指名額度 ────────────────────────────────────
  designate1: 8001,
  designate3: 8002,
} as const;
