import type { FactionDef } from '../../src/contracts/core/definitions.js';
import { notableId, notablePoolId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { WEI_F, weiDef } from './pack-id.js';

const k = asKey;

/**
 * 魏。GREYBOX：requirements 為空。
 *
 * 舊註解寫「魏不設善惡名門檻」—— 善惡名已整個退場，那句話描述的機制
 * 不存在了。現在陣營門檻可用的是功績與官階（`StatPath`），
 * 蜀吳的門檻要等它們的 pack 才出現。
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
