import type { CampaignStageDef, EventReward } from '../../../src/contracts/core/definitions.js';
import type { EnemyId, L10nKey } from '../../../src/contracts/core/ids.js';
import { economy } from '../config/economy.js';
import { asKey } from '../../authoring.js';

const TROOPS_MUL = [0.66, 0.76, 0.87, 1.00, 1.15, 1.32, 1.52];

const DAMAGE_MUL = [0.45, 0.51, 0.58, 0.66, 0.74, 0.84, 0.95];

const GROWTH_ATTRS = ['lead', 'war', 'int', 'pol'] as const;

export interface StageSpec {

  readonly slug: string;

  readonly bosses: readonly (EnemyId | null)[];

  readonly deepUnlocks: readonly (EventReward | null)[];
}

export function buildStages(spec: StageSpec): readonly CampaignStageDef[] {
  return TROOPS_MUL.map((troopsMul, i) => {
    const growth: readonly EventReward[] = GROWTH_ATTRS.map((attr) => ({
      kind: 'attr' as const,
      attr,
      amount: 0.15,
    }));
    const extra = spec.deepUnlocks[i] ?? null;
    return {
      briefKey: asKey(`campaign.${spec.slug}.stage.${i}`) as L10nKey,
      troopsMul,
      damageMul: DAMAGE_MUL[i] ?? 1,
      boss: spec.bosses[i] ?? null,
      rewards: [...growth,{kind:'money' as const,amount:economy.campaignSalary[i]!},...(extra===null?[]:[extra])],
    };
  });
}
