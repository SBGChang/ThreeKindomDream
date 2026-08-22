import { factionId, packId } from '../../src/contracts/core/ids.js';
import { defBuilder } from '../authoring.js';

export const WEI = packId('pack:wei');
export const WEI_F = factionId('faction:wei');
export const weiDef = defBuilder(WEI);
