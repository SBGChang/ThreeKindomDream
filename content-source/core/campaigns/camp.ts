// 黃巾之亂的戰役（core 唯一的一場 —— 那一章沒有陣營）。
import type { CampaignDef, EnemyDef } from '../../../src/contracts/core/definitions.js';
import {
  campaignId, chapterId, enemyId, skillId, traitId,
} from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';
import { buildStages } from './build.js';

const k = asKey;

/**
 * 關底敵將（33 §6.1）★
 *
 * 內容準則：每三關一位有名有姓的，其餘填雜兵 ——
 * 否則名士對戰的戲沒了，波才與張梁不會出現在對面，玩家打的是一團數字。
 *
 * 敵將的數值也在 0–100，與玩家同尺。他每回合施放自己那一招，
 * 強度由【他自己的能力】決定 —— 與名士傳令走完全同一段程式。
 */
export const campEnemies: readonly EnemyDef[] = [
  coreDef('enemy', 'enemy:bocai', {
    enemyId: enemyId('enemy:bocai'), nameKey: k('enemy.bocai.name'),
    attrs: { lead: 58, war: 62, int: 40, pol: 30 },
    skillId: skillId('skill:tuzhen'),
  }),
  coreDef('enemy', 'enemy:zhangliang', {
    enemyId: enemyId('enemy:zhangliang'), nameKey: k('enemy.zhangliang.name'),
    attrs: { lead: 64, war: 70, int: 52, pol: 35 },
    skillId: skillId('skill:tuzhen'),
  }),
  coreDef('enemy', 'enemy:zhangjiao', {
    enemyId: enemyId('enemy:zhangjiao'), nameKey: k('enemy.zhangjiao.name'),
    attrs: { lead: 72, war: 45, int: 84, pol: 60 },
    skillId: skillId('skill:huoji'),
  }),
];

export const campCampaigns: readonly CampaignDef[] = [
  coreDef('campaign', 'campaign:yellowturban', {
    campaignId: campaignId('campaign:yellowturban'),
    chapterId: chapterId('ch:camp.yellowturban'),
    // 名士陣容目前只有魏的八人，敵方名士無人可指 ——
    // 「選呂布當玩伴，虎牢關就不能靠他」這條機制留在程式裡等內容（33 §3）。
    enemyNotables: [],
    stages: buildStages({
      slug: 'yellowturban',
      bosses: [
        null, null, enemyId('enemy:bocai'),
        null, enemyId('enemy:zhangliang'),
        null, enemyId('enemy:zhangjiao'),
      ],
      baseMerit: 2,
      meritKind: 'martial',
      // 打仗長的是帶兵的本事 —— 武與統各一半。
      /**
       * 深處的唯一掉落 —— 這一場給的是【入門的兩招】。
       *
       * 它們也能靠名士教，所以不是唯一來源；但打到第 5、7 關的人
       * 【第一章就拿得到】，而那是靠好感要七到十個回合才換得到的東西。
       * 戰役因此第一次成為「時間」的另一條產線。
       */
      deepUnlocks: [
        null, null, null, null,
        { kind: 'unlock', trait: null, skill: skillId('skill:guwu') },
        { kind: 'unlock', trait: traitId('trait:danshi'), skill: null },
        { kind: 'unlock', trait: null, skill: skillId('skill:xianzhen') },
      ],
    }),
  }),
];
