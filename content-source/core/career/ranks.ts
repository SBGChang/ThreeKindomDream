import type { CareerRankDef } from '../../../src/contracts/core/definitions.js';
import type { CareerLine } from '../../../src/contracts/core/primitives.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const REQUIRED = [0,50,110,180,260,350,450,570,710,870,1050,1250];
const HOST_SCALE = [1,1.15,1.32,1.52,1.75,2.01,2.31,2.66,3.06,3.52,4.05,4.66];
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
