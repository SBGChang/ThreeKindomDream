import type { FactionDef } from '../../src/contracts/core/definitions.js';
import { notableId, notablePoolId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;

/**
 * 魏。GREYBOX：requirements 為空 —— 魏不設善惡名門檻（GDD §7.2：
 * 大惡名者蜀漢拒收，但魏開放權臣線）。蜀吳的門檻要等它們的 pack 才出現。
 */
export const weiFaction: FactionDef = weiDef('faction', 'faction:wei', {
  faction: WEI_F,
  nameKey: k('faction.wei.name'),
  lordId: notableId('notable:caocao'),
  requirements: [],
  rejectReasonKey: k('faction.wei.reject'),
  superiorPoolId: notablePoolId('pool:wei.superiors'),
  bondSpeechKeys: [
    k('lord.wei.bond.0'), k('lord.wei.bond.1'),
    k('lord.wei.bond.2'), k('lord.wei.bond.3'),
  ],
});
