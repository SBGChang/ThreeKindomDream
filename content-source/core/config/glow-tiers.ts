import type { GlowTierDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// 光階影響直接成長與委託星數；抽取前還會遮罩章節、官階及內容門檻。
export const glowTiers: readonly GlowTierDef[] = [
  coreDef('glowTier', 'glow:none', {
    tier: 'none', order: 0, yieldMul: 1.0, baseWeight: 45,
    rarityWeights: [72, 25, 3, 0, 0],
  }),
  coreDef('glowTier', 'glow:silver', {
    tier: 'silver', order: 1, yieldMul: 1.15, baseWeight: 35,
    rarityWeights: [30, 48, 20, 2, 0],
  }),
  coreDef('glowTier', 'glow:gold', {
    tier: 'gold', order: 2, yieldMul: 1.35, baseWeight: 16,
    rarityWeights: [6, 28, 48, 16, 2],
  }),
  coreDef('glowTier', 'glow:red', {
    tier: 'red', order: 3, yieldMul: 1.60, baseWeight: 4,
    rarityWeights: [0, 8, 32, 50, 10],
  }),
];
