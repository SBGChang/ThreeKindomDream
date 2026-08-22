import type { GlowTierDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// GREYBOX 數值：待 GDD §5.3 定案後調整。
// 期望倍率 = 0.45×1.0 + 0.35×1.6 + 0.16×2.5 + 0.04×4.0 = 1.57
export const glowTiers: readonly GlowTierDef[] = [
  coreDef('glowTier', 'glow:none', { tier: 'none', order: 0, yieldMul: 1.0, baseWeight: 45 }),
  coreDef('glowTier', 'glow:silver', { tier: 'silver', order: 1, yieldMul: 1.6, baseWeight: 35 }),
  coreDef('glowTier', 'glow:gold', { tier: 'gold', order: 2, yieldMul: 2.5, baseWeight: 16 }),
  coreDef('glowTier', 'glow:red', { tier: 'red', order: 3, yieldMul: 4.0, baseWeight: 4 }),
];
