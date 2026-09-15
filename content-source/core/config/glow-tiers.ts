import type { GlowTierDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// 隱藏光階仍影響委託星數；固定行動以不順／一般／成功三種收穫結算。
// none=.8，silver=1，gold/red=1.5；既有稀有度與升階機制保留。
export const glowTiers: readonly GlowTierDef[] = [
  coreDef('glowTier', 'glow:none', {
    tier: 'none', order: 0, yieldMul: 0.8, baseWeight: 45,
    rarityWeights: [72, 25, 3, 0, 0],
  }),
  coreDef('glowTier', 'glow:silver', {
    tier: 'silver', order: 1, yieldMul: 1.0, baseWeight: 35,
    rarityWeights: [30, 48, 20, 2, 0],
  }),
  coreDef('glowTier', 'glow:gold', {
    tier: 'gold', order: 2, yieldMul: 1.5, baseWeight: 16,
    rarityWeights: [6, 28, 48, 16, 2],
  }),
  coreDef('glowTier', 'glow:red', {
    tier: 'red', order: 3, yieldMul: 1.5, baseWeight: 4,
    rarityWeights: [0, 8, 32, 50, 10],
  }),
];
