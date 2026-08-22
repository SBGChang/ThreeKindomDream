import type { EventDef } from '../../../src/contracts/core/definitions.js';
import { dcCurveId, eventDefId, paramPoolId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const slot = (name: string, pool: string) => ({ name, poolId: paramPoolId(pool) });
const EASY = dcCurveId('dc:easy');
const NORMAL = dcCurveId('dc:normal');

/**
 * 事上磨練的宣告（17 §6.2）。權重的約定：
 *   1.0  這件事的主要能力
 *   0.4  順帶用到的能力
 *   1.4  高風險／高強度的做法（難的活練得多）
 *
 * 這些選項原本掛的是零星的 `{ kind: 'attr' }` 獎勵（+4 智、+5 武 …）。
 * 那種寫法在後段章節會變成死數字 —— 第 9 章一次鍛鍊給近百點，
 * 委託給 +4 等於沒給。改走 practice 之後隨章節倍率縮放，比值才穩定。
 * `attr` 獎勵保留給劇情級的一次性躍升（見名士事件）。
 */
const practice = (attr: 'war' | 'int' | 'pol' | 'cha', weight: number) => ({ attr, weight });

/**
 * 居民委託模板（全程存在，產名聲）。
 * 模板型：unique=false、collectible=false —— 靠參數池撐起 216 次抽取（17 §2）。
 */
export const residentCommissions: readonly EventDef[] = [
  coreDef('event', 'event:resident.errand', {
    eventDefId: eventDefId('event:resident.errand'),
    eventKind: 'resident', unique: false, collectible: false, weight: 30,
    ownerNotable: null, commissionKind: 'errand',
    titleKey: k('event.resident.errand.title'),
    bodyKey: k('event.resident.errand.body'),
    paramSlots: [slot('patron', 'pool:patron'), slot('place', 'pool:place')],
    requirements: [],
    options: [
      {
        labelKey: k('event.resident.errand.opt.deliver'),
        requirements: [], check: { attr: 'pol', dcCurveId: EASY },
        // 如期送到：辦事的規矩（政）＋ 沿路的人情（魅）
        practice: [practice('pol', 1.0), practice('cha', 0.4)],
        rewards: [{ kind: 'fame', fame: 'civil', amount: 8 }], moralDelta: 1,
      },
      {
        labelKey: k('event.resident.errand.opt.open'),
        requirements: [], check: { attr: 'int', dcCurveId: NORMAL },
        // 先拆開看：讀懂別人的信是很好的智力訓練，代價是名節
        practice: [practice('int', 1.4)],
        rewards: [{ kind: 'fame', fame: 'civil', amount: 14 }], moralDelta: -6,
      },
    ],
  }),
  coreDef('event', 'event:resident.festival', {
    eventDefId: eventDefId('event:resident.festival'),
    eventKind: 'resident', unique: false, collectible: false, weight: 26,
    ownerNotable: null, commissionKind: 'festival',
    titleKey: k('event.resident.festival.title'),
    bodyKey: k('event.resident.festival.body'),
    paramSlots: [slot('place', 'pool:place'), slot('festival', 'pool:festival')],
    // 門檻決定菜單有多豐富（GDD §7.1）。早期只有 errand + strays 可抽。
    requirements: [{ type: 'statGte', stat: 'fame.civil', value: 30 }],
    options: [
      {
        labelKey: k('event.resident.festival.opt.join'),
        requirements: [], check: { attr: 'cha', dcCurveId: EASY },
        practice: [practice('cha', 1.0)],
        rewards: [{ kind: 'fame', fame: 'civil', amount: 6 }],
        moralDelta: 1,
      },
      {
        labelKey: k('event.resident.festival.opt.host'),
        requirements: [{ type: 'statGte', stat: 'attr.cha', value: 30 }],
        check: { attr: 'cha', dcCurveId: NORMAL },
        // 主辦：張羅場面（魅）＋ 調度人力物資（政）
        practice: [practice('cha', 1.0), practice('pol', 0.5)],
        rewards: [{ kind: 'fame', fame: 'civil', amount: 16 }, { kind: 'affinity', notableId: null, amount: 4 }],
        moralDelta: 2,
      },
    ],
  }),
  coreDef('event', 'event:resident.strays', {
    eventDefId: eventDefId('event:resident.strays'),
    eventKind: 'resident', unique: false, collectible: false, weight: 28,
    ownerNotable: null, commissionKind: 'subdue',
    titleKey: k('event.resident.strays.title'),
    bodyKey: k('event.resident.strays.body'),
    paramSlots: [slot('place', 'pool:place'), slot('bandit', 'pool:bandit')],
    requirements: [],
    options: [
      {
        labelKey: k('event.resident.strays.opt.drive'),
        requirements: [], check: { attr: 'war', dcCurveId: EASY },
        practice: [practice('war', 1.0)],
        rewards: [{ kind: 'fame', fame: 'martial', amount: 10 }], moralDelta: 1,
      },
      {
        labelKey: k('event.resident.strays.opt.slay'),
        requirements: [], check: { attr: 'war', dcCurveId: NORMAL },
        // 剿殺：真刀真槍，練得最兇的一種居民委託
        practice: [practice('war', 1.4)],
        rewards: [{ kind: 'fame', fame: 'martial', amount: 18 }], moralDelta: -8,
      },
    ],
  }),
  coreDef('event', 'event:resident.trade', {
    eventDefId: eventDefId('event:resident.trade'),
    eventKind: 'resident', unique: false, collectible: false, weight: 24,
    ownerNotable: null, commissionKind: 'procure',
    titleKey: k('event.resident.trade.title'),
    bodyKey: k('event.resident.trade.body'),
    paramSlots: [slot('patron', 'pool:patron'), slot('goods', 'pool:goods')],
    requirements: [{ type: 'statGte', stat: 'fame.civil', value: 70 }],
    options: [
      {
        labelKey: k('event.resident.trade.opt.fair'),
        requirements: [], check: { attr: 'int', dcCurveId: EASY },
        practice: [practice('int', 1.0)],
        rewards: [{ kind: 'fame', fame: 'civil', amount: 9 }], moralDelta: 2,
      },
      {
        labelKey: k('event.resident.trade.opt.gouge'),
        requirements: [], check: { attr: 'int', dcCurveId: NORMAL },
        // 哄抬：算得精（智）＋ 壓得住場面（政）
        practice: [practice('int', 1.0), practice('pol', 0.4)],
        rewards: [{ kind: 'fame', fame: 'civil', amount: 15 }], moralDelta: -10,
      },
    ],
  }),
];
