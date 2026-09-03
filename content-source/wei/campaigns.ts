// 魏線三場戰役（虎牢關 · 官渡 · 平定河北）。
//
// 三場的性格刻意不同 —— 七關的曲線是共用的，變的是【對面是誰】：
//   虎牢關  一路武將，第七關是呂布。純武系打得最順，文系要靠削弱撐過去。
//   官渡    文武交錯（顏良文醜 ／ 郭圖審配）。單一路線的隊伍會在某一關卡住。
//   河北    後段連著兩位敵將。它是這一輪最深的一場，也是唯一給得起絕階的一場。
import type { CampaignDef, EnemyDef } from '../../src/contracts/core/definitions.js';
import {
  campaignId, chapterId, enemyId, skillId, traitId,
} from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { buildStages } from '../core/campaigns/build.js';
import { weiDef } from './pack-id.js';

const k = asKey;
const E = (slug: string) => enemyId(`enemy:${slug}`);

export const weiEnemies: readonly EnemyDef[] = [
  // ── 虎牢關 ──────────────────────────────────────
  weiDef('enemy', 'enemy:huaxiong', {
    enemyId: E('huaxiong'), nameKey: k('enemy.huaxiong.name'),
    attrs: { lead: 70, war: 84, int: 45, pol: 30 },
    skillId: skillId('skill:xianzhen'),
  }),
  weiDef('enemy', 'enemy:lijue', {
    enemyId: E('lijue'), nameKey: k('enemy.lijue.name'),
    attrs: { lead: 72, war: 78, int: 58, pol: 45 },
    skillId: skillId('skill:tuzhen'),
  }),
  /** 呂布。全遊戲最高武 —— 他一個人就是第七關該不該打的全部理由。 */
  weiDef('enemy', 'enemy:lvbu', {
    enemyId: E('lvbu'), nameKey: k('enemy.lvbu.name'),
    attrs: { lead: 78, war: 100, int: 40, pol: 25 },
    skillId: skillId('skill:wanrenzhi'),
  }),

  // ── 官渡 ────────────────────────────────────────
  weiDef('enemy', 'enemy:yanliang', {
    enemyId: E('yanliang'), nameKey: k('enemy.yanliang.name'),
    attrs: { lead: 74, war: 88, int: 48, pol: 40 },
    skillId: skillId('skill:xianzhen'),
  }),
  weiDef('enemy', 'enemy:guotu', {
    enemyId: E('guotu'), nameKey: k('enemy.guotu.name'),
    attrs: { lead: 55, war: 35, int: 80, pol: 72 },
    skillId: skillId('skill:huoji'),
  }),
  weiDef('enemy', 'enemy:yuanshao', {
    enemyId: E('yuanshao'), nameKey: k('enemy.yuanshao.name'),
    attrs: { lead: 88, war: 62, int: 70, pol: 85 },
    skillId: skillId('skill:shuiyan'),
  }),

  // ── 平定河北 ────────────────────────────────────
  weiDef('enemy', 'enemy:yuantan', {
    enemyId: E('yuantan'), nameKey: k('enemy.yuantan.name'),
    attrs: { lead: 70, war: 74, int: 58, pol: 55 },
    skillId: skillId('skill:tuzhen'),
  }),
  weiDef('enemy', 'enemy:shenpei', {
    enemyId: E('shenpei'), nameKey: k('enemy.shenpei.name'),
    attrs: { lead: 68, war: 45, int: 86, pol: 80 },
    skillId: skillId('skill:shuiyan'),
  }),
  weiDef('enemy', 'enemy:tadun', {
    enemyId: E('tadun'), nameKey: k('enemy.tadun.name'),
    attrs: { lead: 82, war: 90, int: 44, pol: 35 },
    skillId: skillId('skill:wanrenzhi'),
  }),
];

export const weiCampaigns: readonly CampaignDef[] = [
  weiDef('campaign', 'campaign:wei.hulao', {
    campaignId: campaignId('campaign:wei.hulao'),
    chapterId: chapterId('ch:wei.hulao'),
    enemyNotables: [],
    stages: buildStages({
      slug: 'wei.hulao',
      bosses: [
        null, null, E('lijue'), null, E('huaxiong'), null, E('lvbu'),
      ],
      baseMerit: 4,
      meritKind: 'martial',
      // 打仗長的是帶兵的本事 —— 武與統各一半。
      deepUnlocks: [
        null, null, null,
        { kind: 'unlock', trait: traitId('trait:chenyi'), skill: null },
        { kind: 'unlock', trait: null, skill: skillId('skill:jiezhi') },
        null,
        { kind: 'unlock', trait: traitId('trait:linzhen'), skill: null },
      ],
    }),
  }),

  weiDef('campaign', 'campaign:wei.guandu', {
    campaignId: campaignId('campaign:wei.guandu'),
    chapterId: chapterId('ch:wei.guandu'),
    enemyNotables: [],
    stages: buildStages({
      slug: 'wei.guandu',
      bosses: [
        null, E('guotu'), null, E('yanliang'), null, E('shenpei'), E('yuanshao'),
      ],
      baseMerit: 7,
      meritKind: 'martial',
      // 打仗長的是帶兵的本事 —— 武與統各一半。
      deepUnlocks: [
        null, null, null,
        { kind: 'unlock', trait: null, skill: skillId('skill:shuiyan') },
        { kind: 'unlock', trait: traitId('trait:liaodi'), skill: null },
        { kind: 'unlock', trait: null, skill: skillId('skill:tuntian') },
        { kind: 'unlock', trait: traitId('trait:zhechong'), skill: null },
      ],
    }),
  }),

  weiDef('campaign', 'campaign:wei.hebei', {
    campaignId: campaignId('campaign:wei.hebei'),
    chapterId: chapterId('ch:wei.hebei'),
    enemyNotables: [],
    stages: buildStages({
      slug: 'wei.hebei',
      bosses: [
        null, null, E('yuantan'), null, E('shenpei'), E('tadun'), E('tadun'),
      ],
      baseMerit: 12,
      meritKind: 'martial',
      // 打仗長的是帶兵的本事 —— 武與統各一半。
      /**
       * 三個絕階全部在這一場的最後三關 ★
       *
       * 它們是【全遊戲唯一】不靠好感就拿得到的絕階來源 ——
       * 荀彧教得起〈王佐〉，但那要好感 60，而好感 60 要七到十個回合同框。
       * 打到第七關的人是用【一次賭】換到那十個回合。
       *
       * 這正是「深處有唯一掉落」要的效果：**你不是在湊數字，你是想要那個東西。**
       */
      deepUnlocks: [
        null, null, null, null,
        { kind: 'unlock', trait: traitId('trait:wanrendi'), skill: null },
        { kind: 'unlock', trait: null, skill: skillId('skill:wanrenzhi') },
        { kind: 'unlock', trait: null, skill: skillId('skill:zhirong') },
      ],
    }),
  }),
];
