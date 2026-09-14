import type { CareerRankDef } from '../../../src/contracts/core/definitions.js';
import type { CareerLine } from '../../../src/contracts/core/primitives.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const REQUIRED = [0,35,80,135,205,290,390,510,650,810,990,1190];
const HOST_SCALE = [1,1.25,1.55,1.9,2.3,2.8,3.4,4.1,4.9,5.8,6.8,8];
const BASE_ADD = [0,0,0,0,0,0,0,0,0,0,0,0];

const line = (l: CareerLine): readonly CareerRankDef[] =>
  REQUIRED.map((requiredMerit, i) =>
    coreDef('careerRank', `rank:${l}.${i + 1}`, {
      line: l,
      level: i + 1,
      nameKey: k(`career.${l}.${i + 1}`),
      requiredMerit,
      hostScale: HOST_SCALE[i] ?? 1,
      trainingBaseAdd: BASE_ADD[i] ?? 0,
    }));

export const careerRanks: readonly CareerRankDef[] = [...line('civil'), ...line('martial')];
