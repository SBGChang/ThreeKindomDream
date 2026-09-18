import {nanhua,nanhuaTraits,nanhuaTexts,nanhuaTrial,taiping} from './nanhua.js';
import {withEventChallenge,challengeTexts} from './event-challenges.js';
import {lvbuTrial,lvbuTrialTexts} from './lvbu-trial.js';
import { triggeredTexts } from './core/abilities/triggered.js';
import { withTactics } from './tactic-teachers.js';
import { tacticTexts } from './core/abilities/tactics.js';
// Content Pack 宣告：有哪些 pack、版本、相依、載入順序，以及每個 pack 由哪些檔組成。
//
// 分包原則（ARCHITECTURE §2.12）：
//   pack:core        陣營無關的規則骨架 —— 光階、四維、資質、好感度、效果表、
//                    天賦、官階、帳下篇（黃巾）、委託保底池（4 維 × 4 稀有度）、結局骨架
//   pack:<faction>   一個陣營的內容 —— 章節、章末戰役、陣營委託、該陣營帶來的名士、
//                    上司池、陣營結局
//
// 驗收標準：加黃巾線 = 新增 pack:huangjin，pack:core 一行不動。
import type { AuthoredManifest, AuthoredPack } from './authoring.js';

import { CORE } from './core/pack-id.js';
import { aptitudeCost, aptitudeGrades } from './core/config/aptitude.js';
import { affinityCurve, affinityStages, linkBonus } from './core/config/affinity.js';
import { notableStar } from './core/config/notable-star.js';
import { glowTiers } from './core/config/glow-tiers.js';
import { battleRule } from './core/config/battle.js';
import { growthRule } from './core/config/growth.js';
import { attributeCap, checkRule, gameRules } from './core/config/rules.js';
import {
  attrLine, eventYieldCurve, trainingActions, trainingCurve,
} from './core/config/training.js';
import { effects as coreEffects } from './core/effects/tables.js';
import { careerRanks } from './core/career/ranks.js';
import { coreSkills, coreTraits } from './core/abilities/index.js';
import { campCampaigns, campEnemies } from './core/campaigns/camp.js';
import { campChapters, campSequence } from './core/chapters/camp.js';
import { coreEndings } from './core/endings/index.js';
import { coreCommissions } from './core/events/commissions.js';
import { dcCurves, paramPools } from './core/events/pools.js';
import { coreItemPools, coreItems } from './core/items/index.js';
import { settlementFormula } from './core/meta/settlement.js';
import { shopItems } from './core/shop/index.js';
import { talents } from './core/talents/index.js';

import { WEI } from './wei/pack-id.js';
import { weiCommissions, weiNotableCommissions } from './wei/commissions.js';
import { weiChapters, weiSequence } from './wei/chapters.js';
import { weiFaction } from './wei/faction.js';
import { weiNotableEvents } from './wei/notable-events.js';
import { weiCampaigns, weiEnemies } from './wei/campaigns.js';
import { weiNotables, weiSuperiorPool } from './wei/notables.js';

import { variedCommissions,variedTexts } from './core/events/varied.js';
import { earlyStories,earlyTexts } from './wei/early-stories.js';
import { zhTW } from './l10n/index.js';
import { withDialogue, dialogueTexts } from './dialogue.js';
import { WU } from './wu/pack-id.js';
import { wuDefs,wuTexts,wuNotables } from './wu/index.js';
import { SHU } from './shu/pack-id.js';
import { shuDefs, shuTexts, shuNotables } from './shu/index.js';
import { withTeaching } from './teaching.js';
import { commonStories, weiStories, mainStoryTexts } from './main-stories.js';

import {withRecruitment} from './recruitment.js';
import {expandStory,extraWeiChapters,extraWeiCampaigns,extraWeiStories,expansionTexts,expansionEndings} from './narrative-expansion.js';
import {lvbu,lvbuTexts} from './lvbu.js';
import {equipmentItems,equipmentTexts} from './core/items/equipment.js';
const coreDialogueEvents = [...coreCommissions, ...variedCommissions].map(d=>withDialogue(withEventChallenge(d)));
const weiDialogueEvents = [...weiCommissions, ...weiNotableCommissions, ...weiNotableEvents, ...earlyStories].map(d => withDialogue(withEventChallenge(withTeaching(d, weiNotables.map(withTactics)))));
const shuDialogueDefs = shuDefs.map(d => d.kind === 'event' ? withDialogue(withEventChallenge(withTeaching(d, shuNotables.map(withTactics)))) : d.kind==='notable'?withTactics(d):d);
const wuDialogueDefs=wuDefs.map(d=>d.kind==='event'?withDialogue(withEventChallenge(withTeaching(d,wuNotables.map(withTactics)))):d.kind==='notable'?withTactics(d):d);
const expandedWei=[...weiStories,...extraWeiStories].map(expandStory);
const expandedShu=shuDialogueDefs.map(d=>d.kind==='storyChapter'?expandStory(d):d.kind==='notable'?withRecruitment(d):d);
const expandedWu=wuDialogueDefs.map(d=>d.kind==='storyChapter'?expandStory(d):d.kind==='notable'?withRecruitment(d):d);
const corePack: AuthoredPack = {
  packId: CORE,
  version: '0.1.0',
  requiredPacks: [],
  loadOrder: 0,
  defs: [
    ...glowTiers, ...aptitudeGrades, aptitudeCost,
    ...trainingActions, trainingCurve, eventYieldCurve, attrLine,
    ...affinityStages, affinityCurve, linkBonus, notableStar,
    attributeCap, gameRules, checkRule, growthRule, battleRule,
    ...coreTraits, ...nanhuaTraits, taiping, ...coreSkills,
    ...campEnemies, ...campCampaigns,
    ...talents, ...shopItems, settlementFormula,
    ...paramPools, ...dcCurves,
    ...coreItems, ...equipmentItems, ...coreItemPools,
    ...coreDialogueEvents,
    ...campChapters, campSequence,
    ...commonStories,
    ...careerRanks,
    ...coreEndings,
  ],
  effects: coreEffects,
  // GREYBOX：文案暫時全部掛在 core。正式版應隨各 pack 拆分（06 §2.1）。
  texts: {...zhTW,...nanhuaTexts,...lvbuTrialTexts,...challengeTexts,...equipmentTexts,...lvbuTexts,...expansionTexts,...tacticTexts,...triggeredTexts,...earlyTexts,...variedTexts,...dialogueTexts,...mainStoryTexts},
};

const weiPack: AuthoredPack = {
  packId: WEI,
  version: '0.1.0',
  requiredPacks: [CORE],
  loadOrder: 10,
  defs: [
    ...weiNotables.map(withTactics).map(withRecruitment),withRecruitment(lvbu),nanhua, weiSuperiorPool,
    weiFaction,
    ...weiDialogueEvents,
    withDialogue(lvbuTrial),withDialogue(nanhuaTrial),
    ...weiChapters,...extraWeiChapters, {...weiSequence,chapters:[...weiSequence.chapters,...extraWeiChapters.map(c=>c.chapterId)]},
    ...expandedWei,...expansionEndings.filter(e=>e.factionId==='faction:wei'),
    ...weiEnemies, ...weiCampaigns,...extraWeiCampaigns,
  ],
  effects: {},
  texts: {},
};

export const AUTHORED_MANIFEST: AuthoredManifest = {
  runtimeVersion: '0.1.0',
  packs: [corePack, weiPack, {
    packId: SHU, version: '0.1.0', requiredPacks: [CORE], loadOrder: 20,
    defs: [...expandedShu,...expansionEndings.filter(e=>e.factionId==='faction:shu')], effects: {}, texts: shuTexts,
  },{packId:WU,version:'0.1.0',requiredPacks:[CORE],loadOrder:30,defs:[...expandedWu,...expansionEndings.filter(e=>e.factionId==='faction:wu')],effects:{},texts:wuTexts}],
};
