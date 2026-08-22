import type { EventDef } from '../../src/contracts/core/definitions.js';
import { dcCurveId, eventDefId, notableId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { IN_WEI } from './commissions.js';
import { weiDef } from './pack-id.js';

const k = asKey;
const NORMAL = dcCurveId('dc:normal');
const HARD = dcCurveId('dc:hard');

/** 事上磨練。權重約定見 core/events/commissions.ts。 */
const practice = (attr: 'war' | 'int' | 'pol' | 'cha', weight: number) => ({ attr, weight });

/** 三位 ★5 的名士事件（friendly 階段解鎖）。選項的善惡分歧是刻意的。 */
export const weiNotableEvents: readonly EventDef[] = [
  weiDef('event', 'event:notable.caocao.trust', {
    eventDefId: eventDefId('event:notable.caocao.trust'),
    eventKind: 'notable', unique: true, collectible: true, weight: 100,
    ownerNotable: notableId('notable:caocao'), commissionKind: null,
    titleKey: k('event.notable.caocao.trust.title'),
    bodyKey: k('event.notable.caocao.trust.body'),
    paramSlots: [], requirements: [IN_WEI],
    options: [
      {
        labelKey: k('event.notable.caocao.trust.opt.loyal'),
        requirements: [], check: { attr: 'pol', dcCurveId: HARD },
        practice: [practice('pol', 1.5)],
        rewards: [
          { kind: 'merit', merit: 'civil', amount: 40 },
          { kind: 'affinity', notableId: notableId('notable:caocao'), amount: 18 },
        ],
        moralDelta: 8,
      },
      {
        labelKey: k('event.notable.caocao.trust.opt.ambitious'),
        requirements: [], check: { attr: 'int', dcCurveId: HARD },
        practice: [practice('int', 1.5)],
        rewards: [
          { kind: 'merit', merit: 'civil', amount: 34 },
          { kind: 'attr', attr: 'pol', amount: 15 },
        ],
        moralDelta: -12,
      },
    ],
  }),
  weiDef('event', 'event:notable.xunyu.counsel', {
    eventDefId: eventDefId('event:notable.xunyu.counsel'),
    eventKind: 'notable', unique: true, collectible: true, weight: 100,
    ownerNotable: notableId('notable:xunyu'), commissionKind: null,
    titleKey: k('event.notable.xunyu.counsel.title'),
    bodyKey: k('event.notable.xunyu.counsel.body'),
    paramSlots: [], requirements: [IN_WEI],
    options: [
      {
        labelKey: k('event.notable.xunyu.counsel.opt.accept'),
        requirements: [], check: { attr: 'int', dcCurveId: NORMAL },
        // 受教於荀彧：這條選項的重心本來就是「學到東西」
        practice: [practice('int', 1.6)],
        rewards: [
          { kind: 'attr', attr: 'int', amount: 18 },
          { kind: 'affinity', notableId: notableId('notable:xunyu'), amount: 16 },
        ],
        moralDelta: 4,
      },
      {
        labelKey: k('event.notable.xunyu.counsel.opt.dissent'),
        requirements: [], check: { attr: 'pol', dcCurveId: HARD },
        practice: [practice('pol', 1.4), practice('int', 0.4)],
        rewards: [
          { kind: 'merit', merit: 'civil', amount: 30 },
          { kind: 'fame', fame: 'civil', amount: 14 },
        ],
        moralDelta: -4,
      },
    ],
  }),
  weiDef('event', 'event:notable.guojia.gambit', {
    eventDefId: eventDefId('event:notable.guojia.gambit'),
    eventKind: 'notable', unique: true, collectible: true, weight: 100,
    ownerNotable: notableId('notable:guojia'), commissionKind: null,
    titleKey: k('event.notable.guojia.gambit.title'),
    bodyKey: k('event.notable.guojia.gambit.body'),
    paramSlots: [], requirements: [IN_WEI],
    options: [
      {
        labelKey: k('event.notable.guojia.gambit.opt.gamble'),
        requirements: [], check: { attr: 'int', dcCurveId: HARD },
        practice: [practice('int', 1.6), practice('war', 0.5)],
        rewards: [
          { kind: 'attr', attr: 'int', amount: 26 },
          { kind: 'merit', merit: 'martial', amount: 24 },
          { kind: 'affinity', notableId: notableId('notable:guojia'), amount: 20 },
        ],
        moralDelta: 0,
      },
      {
        labelKey: k('event.notable.guojia.gambit.opt.safe'),
        requirements: [], check: { attr: 'pol', dcCurveId: dcCurveId('dc:easy') },
        // 穩打穩紮：拿得少，也練得少
        practice: [practice('pol', 0.7)],
        rewards: [{ kind: 'merit', merit: 'civil', amount: 12 }],
        moralDelta: 0,
      },
    ],
  }),
];
