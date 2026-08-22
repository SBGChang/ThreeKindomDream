import type {
  AttributeCapDef, CheckRuleDef, GameRulesDef,
} from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// GREYBOX：四維上限 999（ARCHITECTURE §9-1 標記為最優先待補數值）。
// 反推依據：32 回合全押單維 ≈ 880，因此 999 讓專精流不會撞頂而失去意義。
// 善惡名 ±100 為單一有正負號的軸。
export const attributeCap: AttributeCapDef = coreDef('attributeCap', 'cap:main', {
  attrMax: 999,
  moralMin: -100,
  moralMax: 100,
});

export const gameRules: GameRulesDef = coreDef('gameRules', 'rules:main', {
  eventSlotMax: 3,
  maxSortie: 3,
  companionCount: 3,
  superiorCount: 3,
  moralBands: [
    { band: 'veryEvil', min: -100, max: -40 },
    { band: 'neutral', min: -39, max: 39 },
    { band: 'veryGood', min: 40, max: 100 },
  ],
});

// 比例擺幅：roll 1..100 → 倍率 0.51 .. 1.50。
// 因此 DC 應訂在「該章期望檢定值」的 0.75 / 1.05 / 1.35 倍附近，
// 三檔才會落在有意義的機率區間（見 18 §3）。
export const checkRule: CheckRuleDef = coreDef('checkRule', 'checkRule:main', {
  secondaryWeight: 0.5,
  rollMin: 1,
  rollMax: 100,
  rollCenter: 50,
  rollSpread: 100,
  baseFloor: 25,
});
