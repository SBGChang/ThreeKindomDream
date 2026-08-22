import type { EventDef } from '../../src/contracts/core/definitions.js';
import { dcCurveId, eventDefId, paramPoolId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { weiDef } from './pack-id.js';

const k = asKey;
const slot = (name: string, pool: string) => ({ name, poolId: paramPoolId(pool) });
const EASY = dcCurveId('dc:easy');
const NORMAL = dcCurveId('dc:normal');
export const IN_WEI = { type: 'faction' as const, value: 'faction:wei' };

/** 事上磨練。權重約定見 core/events/commissions.ts。 */
const practice = (attr: 'war' | 'int' | 'pol' | 'cha', weight: number) => ({ attr, weight });

/** 陣營委託模板（陣營篇起，產功績）。有具體對象的任務，不是抽象訓練。 */
export const weiCommissions: readonly EventDef[] = [
  weiDef('event', 'event:wei.subdue', {
    eventDefId: eventDefId('event:wei.subdue'),
    eventKind: 'faction', unique: false, collectible: false, weight: 30,
    ownerNotable: null, commissionKind: 'subdue',
    titleKey: k('event.wei.subdue.title'), bodyKey: k('event.wei.subdue.body'),
    paramSlots: [slot('place', 'pool:place'), slot('bandit', 'pool:bandit'), slot('patron', 'pool:patron')],
    requirements: [IN_WEI],
    options: [
      {
        labelKey: k('event.wei.subdue.opt.strike'),
        requirements: [], check: { attr: 'war', dcCurveId: NORMAL },
        practice: [practice('war', 1.2)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 22 }], moralDelta: 0,
      },
      {
        labelKey: k('event.wei.subdue.opt.pacify'),
        requirements: [{ type: 'statGte', stat: 'attr.cha', value: 45 }],
        check: { attr: 'cha', dcCurveId: NORMAL },
        // 招撫：說得動人（魅）＋ 安置得下來（政）
        practice: [practice('cha', 1.0), practice('pol', 0.5)],
        rewards: [
          { kind: 'merit', merit: 'martial', amount: 14 },
          { kind: 'fame', fame: 'civil', amount: 12 },
        ],
        moralDelta: 5,
      },
    ],
  }),
  weiDef('event', 'event:wei.procure', {
    eventDefId: eventDefId('event:wei.procure'),
    eventKind: 'faction', unique: false, collectible: false, weight: 28,
    ownerNotable: null, commissionKind: 'procure',
    titleKey: k('event.wei.procure.title'), bodyKey: k('event.wei.procure.body'),
    paramSlots: [slot('goods', 'pool:goods'), slot('patron', 'pool:patron')],
    requirements: [IN_WEI],
    options: [
      {
        labelKey: k('event.wei.procure.opt.buy'),
        requirements: [], check: { attr: 'int', dcCurveId: NORMAL },
        practice: [practice('int', 1.2)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 20 }], moralDelta: 0,
      },
      {
        labelKey: k('event.wei.procure.opt.requisition'),
        requirements: [], check: { attr: 'pol', dcCurveId: EASY },
        // 強徵：省事，於是也學得少
        practice: [practice('pol', 0.8)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 26 }], moralDelta: -9,
      },
    ],
  }),
  weiDef('event', 'event:wei.reclaim', {
    eventDefId: eventDefId('event:wei.reclaim'),
    eventKind: 'faction', unique: false, collectible: false, weight: 26,
    ownerNotable: null, commissionKind: 'reclaim',
    titleKey: k('event.wei.reclaim.title'), bodyKey: k('event.wei.reclaim.body'),
    paramSlots: [slot('place', 'pool:place'), slot('patron', 'pool:patron')],
    // 官階作為陣營委託門檻（21 §3）—— 低階官接不到大任務
    requirements: [IN_WEI, { type: 'statGte', stat: 'career.civil', value: 2 }],
    options: [
      {
        labelKey: k('event.wei.reclaim.opt.settle'),
        requirements: [], check: { attr: 'pol', dcCurveId: NORMAL },
        // 屯田：度田分地（政）＋ 算水利收成（智）
        practice: [practice('pol', 1.2), practice('int', 0.4)],
        rewards: [
          { kind: 'merit', merit: 'civil', amount: 18 },
          { kind: 'fame', fame: 'civil', amount: 8 },
        ],
        moralDelta: 3,
      },
      {
        labelKey: k('event.wei.reclaim.opt.conscript'),
        requirements: [], check: { attr: 'war', dcCurveId: EASY },
        practice: [practice('war', 0.8), practice('pol', 0.6)],
        rewards: [{ kind: 'merit', merit: 'martial', amount: 16 }], moralDelta: -7,
      },
    ],
  }),
];
