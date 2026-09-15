import type { BattleRuleDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

export const battleRule: BattleRuleDef = coreDef('battleRule', 'battle:main', {
  realtime: { duration:60, supplyRegenRatio:0.012, attackDivisor:50, enemyAttackDivisor:65, effectSeconds:3, skillCost:{physical:30,magic:35,heal:26,buff:25,debuff:25}, skillCooldown:{physical:10,magic:12,heal:12,buff:18,debuff:15} },
  duel:{genericByChapter:[43,51,59,67,75,83,90,90]},
  castChances: [1, 0.6, 0.3],
  commandChanceByStage: {
    stranger: 0, acquainted: 0.15, friendly: 0.30, close: 0.50, sworn: 0.70,
  },
  troopsBase: 120,
  supplyBase: 120,
  crossLineRatio: 0.5,
  actorDivisor: 50,

  enemyTroopsByChapter: [
    // 即時戰鬥／十二輪養成校準，魏蜀共用章節進度；見 docs/BALANCE-REALTIME-12-RUNS.md。
    180, 280, 400, 550, 570, 590, 610, 630, 650,
  ],

  enemyDamageByChapter: [
    38, 48, 60, 72, 74, 76, 78, 80, 82,
  ],
  supplyPerTroop: 1,
  rallyRatio: 0.35,
  maxTurns: 120,
  sweepMargin: 4,
});
