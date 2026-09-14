import type { BattleRuleDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

export const battleRule: BattleRuleDef = coreDef('battleRule', 'battle:main', {
  castChances: [1, 0.6, 0.3],
  commandChanceByStage: {
    stranger: 0, acquainted: 0.15, friendly: 0.30, close: 0.50, sworn: 0.70,
  },
  troopsBase: 120,
  supplyBase: 120,
  crossLineRatio: 0.5,
  actorDivisor: 50,

  enemyTroopsByChapter: [
    515, 920, 1700, 4210, 10400, 25800, 64000, 158000, 392000,
  ],

  enemyDamageByChapter: [
    65, 95, 125, 160, 220, 300, 400, 540, 720,
  ],
  supplyPerTroop: 1,
  rallyRatio: 0.35,
  maxTurns: 120,
  sweepMargin: 4,
});
