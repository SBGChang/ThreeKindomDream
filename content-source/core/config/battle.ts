import type { BattleRuleDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

export const battleRule: BattleRuleDef = coreDef('battleRule', 'battle:main', {
  realtime: { duration:60, supplyRegenRatio:0.012, attackDivisor:50, enemyAttackDivisor:65, effectSeconds:3, skillCost:{physical:30,magic:35,heal:26,buff:25,debuff:25}, skillCooldown:{physical:10,magic:12,heal:12,buff:18,debuff:15} },
  castChances: [1, 0.6, 0.3],
  commandChanceByStage: {
    stranger: 0, acquainted: 0.15, friendly: 0.30, close: 0.50, sworn: 0.70,
  },
  troopsBase: 120,
  supplyBase: 120,
  crossLineRatio: 0.5,
  actorDivisor: 50,

  enemyTroopsByChapter: [
    // 金幣版 72 回合敘事可達性校準；前四章保留，樣本見 docs/narrative/gold-story-balance.json。
    515, 920, 1700, 4210, 4500, 4700, 4900, 5100, 5300,
  ],

  enemyDamageByChapter: [
    65, 95, 125, 160, 160, 160, 165, 170, 175,
  ],
  supplyPerTroop: 1,
  rallyRatio: 0.35,
  maxTurns: 120,
  sweepMargin: 4,
});
