// Content Pack 宣告：有哪些 pack、版本、相依、載入順序，以及每個 pack 由哪些檔組成。
//
// 分包原則（ARCHITECTURE §2.12）：
//   pack:core        陣營無關的規則骨架 —— 光階、四維、資質、好感度、效果表、
//                    天賦、官階、南華村篇、居民委託、結局骨架
//   pack:<faction>   一個陣營的內容 —— 章節、大檢定、陣營委託、該陣營帶來的名士、
//                    上司池、陣營結局
//
// 驗收標準：加黃巾線 = 新增 pack:huangjin，pack:core 一行不動。
import type { AuthoredManifest, AuthoredPack } from './authoring.js';

import { CORE } from './core/pack-id.js';
import { aptitudeCost, aptitudeGrades } from './core/config/aptitude.js';
import { affinityCurve, affinityStages, linkBonus } from './core/config/affinity.js';
import { glowTiers } from './core/config/glow-tiers.js';
import { attributeCap, checkRule, gameRules } from './core/config/rules.js';
import { eventYieldCurve, trainingActions, trainingCurve } from './core/config/training.js';
import { effects as coreEffects } from './core/effects/tables.js';
import { careerInit, careerRanks } from './core/career/ranks.js';
import { nanhuaChapters, nanhuaChecks, nanhuaSequence } from './core/chapters/nanhua.js';
import { coreEndings } from './core/endings/index.js';
import { residentCommissions } from './core/events/commissions.js';
import { dcCurves, paramPools } from './core/events/pools.js';
import { settlementFormula } from './core/meta/settlement.js';
import { shopItems } from './core/shop/index.js';
import { talents } from './core/talents/index.js';

import { WEI } from './wei/pack-id.js';
import { weiCommissions } from './wei/commissions.js';
import { weiChapters, weiChecks, weiSequence } from './wei/chapters.js';
import { weiFaction } from './wei/faction.js';
import { weiNotableEvents } from './wei/notable-events.js';
import { weiNotables, weiSuperiorPool } from './wei/notables.js';

import { zhTW } from './l10n/index.js';

const corePack: AuthoredPack = {
  packId: CORE,
  version: '0.1.0',
  requiredPacks: [],
  loadOrder: 0,
  defs: [
    ...glowTiers, ...aptitudeGrades, aptitudeCost,
    ...trainingActions, trainingCurve, eventYieldCurve,
    ...affinityStages, affinityCurve, linkBonus,
    attributeCap, gameRules, checkRule,
    ...talents, ...shopItems, settlementFormula,
    ...paramPools, ...dcCurves,
    ...residentCommissions,
    ...nanhuaChecks, ...nanhuaChapters, nanhuaSequence,
    ...careerRanks, careerInit,
    ...coreEndings,
  ],
  effects: coreEffects,
  // GREYBOX：文案暫時全部掛在 core。正式版應隨各 pack 拆分（06 §2.1）。
  texts: zhTW,
};

const weiPack: AuthoredPack = {
  packId: WEI,
  version: '0.1.0',
  requiredPacks: [CORE],
  loadOrder: 10,
  defs: [
    ...weiNotables, weiSuperiorPool,
    weiFaction,
    ...weiCommissions, ...weiNotableEvents,
    ...weiChecks, ...weiChapters, weiSequence,
  ],
  effects: {},
  texts: {},
};

export const AUTHORED_MANIFEST: AuthoredManifest = {
  runtimeVersion: '0.1.0',
  packs: [corePack, weiPack],
};
