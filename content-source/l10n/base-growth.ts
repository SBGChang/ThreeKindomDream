import type { SlotBaseAddDef } from '../../src/contracts/core/effects.js';
import { economy } from '../core/config/economy.js';
import { effects } from '../core/effects/tables.js';

/** Display converted growth, not legacy effect units or a guaranteed final reward. */
export function baseGrowthText(prefix: string, referId: number): string {
  const effect = effects.SlotBaseAdd?.[referId] as SlotBaseAddDef | undefined;
  if (!effect) throw new Error(`Missing SlotBaseAdd for growth text: ${referId}`);
  const growth = Number((effect.add * economy.legacyBaseRatio).toFixed(6));
  const experience = Number((growth * 100).toFixed(4));
  return `${prefix} +${experience}（成長 +${growth}）`;
}
