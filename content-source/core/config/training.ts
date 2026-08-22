import type {
  EventYieldCurveDef, TrainingActionDef, TrainingCurveDef,
} from '../../../src/contracts/core/definitions.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

// 四維 × 兩階段 = 8 筆。缺一筆就有格子生不出來（驗證會擋）。
export const trainingActions: readonly TrainingActionDef[] = [
  coreDef('trainingAction', 'train:nanhua.war', {
    attr: 'war', phase: 'nanhua', labelKey: k('attr.war.nanhua.label'),
    subtitleKeys: [k('attr.war.nanhua.sub.0'), k('attr.war.nanhua.sub.1'), k('attr.war.nanhua.sub.2')],
  }),
  coreDef('trainingAction', 'train:nanhua.int', {
    attr: 'int', phase: 'nanhua', labelKey: k('attr.int.nanhua.label'),
    subtitleKeys: [k('attr.int.nanhua.sub.0'), k('attr.int.nanhua.sub.1'), k('attr.int.nanhua.sub.2')],
  }),
  coreDef('trainingAction', 'train:nanhua.pol', {
    attr: 'pol', phase: 'nanhua', labelKey: k('attr.pol.nanhua.label'),
    subtitleKeys: [k('attr.pol.nanhua.sub.0'), k('attr.pol.nanhua.sub.1'), k('attr.pol.nanhua.sub.2')],
  }),
  coreDef('trainingAction', 'train:nanhua.cha', {
    attr: 'cha', phase: 'nanhua', labelKey: k('attr.cha.nanhua.label'),
    subtitleKeys: [k('attr.cha.nanhua.sub.0'), k('attr.cha.nanhua.sub.1'), k('attr.cha.nanhua.sub.2')],
  }),
  coreDef('trainingAction', 'train:faction.war', {
    attr: 'war', phase: 'faction', labelKey: k('attr.war.faction.label'),
    subtitleKeys: [k('attr.war.faction.sub.0'), k('attr.war.faction.sub.1'), k('attr.war.faction.sub.2')],
  }),
  coreDef('trainingAction', 'train:faction.int', {
    attr: 'int', phase: 'faction', labelKey: k('attr.int.faction.label'),
    subtitleKeys: [k('attr.int.faction.sub.0'), k('attr.int.faction.sub.1'), k('attr.int.faction.sub.2')],
  }),
  coreDef('trainingAction', 'train:faction.pol', {
    attr: 'pol', phase: 'faction', labelKey: k('attr.pol.faction.label'),
    subtitleKeys: [k('attr.pol.faction.sub.0'), k('attr.pol.faction.sub.1'), k('attr.pol.faction.sub.2')],
  }),
  coreDef('trainingAction', 'train:faction.cha', {
    attr: 'cha', phase: 'faction', labelKey: k('attr.cha.faction.label'),
    subtitleKeys: [k('attr.cha.faction.sub.0'), k('attr.cha.faction.sub.1'), k('attr.cha.faction.sub.2')],
  }),
];

// GREYBOX：32 回合、平均 8 次/維、期望光階 1.57 倍
//   → 單維總量 ≈ 8 × 10 × 1.57 × chapterMul 平均 1.9 ≈ 240
// 四維上限暫定 300（ARCHITECTURE §9-1 待補）。
export const trainingCurve: TrainingCurveDef = coreDef('trainingCurve', 'curve:training', {
  baseByAttr: { war: 10, int: 10, pol: 10, cha: 10 },
  chapterMultiplier: [1.0, 1.3, 1.7, 2.2, 2.8, 3.5, 4.3, 5.2, 6.2],
  upgradeBaseChance: 0.15,
  shiftStepRatio: 0.18,
});

// ── 上課 vs 工作（GDD §4.2）─────────────────────────
//
// 一回合只能投一個動作，所以這兩張表的比值就是整個抉擇的形狀：
//
//   鍛鍊期望 = 10 × 光階 1.57（含升階）      ≈ 15.7 ／回合，全押一維
//   事件期望 =  4 × practice 權重 1.0–1.5    ≈  4.8 ／回合，外加名聲或功績
//
// 事件的四維產出約為鍛鍊的【三成】—— 少到不會取代鍛鍊，
// 但多到讓「這章我先去做事賺名聲」不必然拖垮檢定值。
// 這個比值是本制度唯一的核心旋鈕：調高會讓鍛鍊槽失去意義，
// 調低則會讓門檻貨幣變成純懲罰（做事就等於落後）。
//
// chapterMultiplier 刻意與 trainingCurve 同一組數 —— 兩邊同步放大，
// 比值才不會隨章節漂移。門禁會擋長度不足，但擋不了數值漂移，
// 因此改一邊時務必同時改另一邊。
export const eventYieldCurve: EventYieldCurveDef = coreDef('eventYieldCurve', 'curve:eventYield', {
  baseByAttr: { war: 4, int: 4, pol: 4, cha: 4 },
  chapterMultiplier: [1.0, 1.3, 1.7, 2.2, 2.8, 3.5, 4.3, 5.2, 6.2],
  // 檢定失敗仍給四成。事情辦砸了，但那一趟還是走過了 ——
  // 沒有這個下限，高 DC 的事件會被鍛鍊完全支配，事件系統會死。
  failRatio: 0.4,
});
