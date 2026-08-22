// 各 FuncType 的效果表。referId 由名士解鎖條、天賦、商店品項引用。
// 編號慣例：1xxx StatModifier / 2xxx 事件 / 3xxx 光階 / 4xxx 站位 / 5xxx 好感 / 6xxx 檢定 / 7xxx 貨幣
import type { EffectTableInput } from '../../authoring.js';
import { targetId } from '../../../src/contracts/core/ids.js';

const T = targetId;

export const effects: EffectTableInput = {
  StatModifier: {
    // 名士育成型：該維經驗提升
    1001: { target: T('training.exp.war'), op: 'mulPct', value: 0.20, condition: null },
    1002: { target: T('training.exp.war'), op: 'mulPct', value: 0.40, condition: null },
    1011: { target: T('training.exp.int'), op: 'mulPct', value: 0.20, condition: null },
    1012: { target: T('training.exp.int'), op: 'mulPct', value: 0.40, condition: null },
    1021: { target: T('training.exp.pol'), op: 'mulPct', value: 0.20, condition: null },
    1022: { target: T('training.exp.pol'), op: 'mulPct', value: 0.40, condition: null },
    1031: { target: T('training.exp.cha'), op: 'mulPct', value: 0.20, condition: null },
    1032: { target: T('training.exp.cha'), op: 'mulPct', value: 0.40, condition: null },
    // 天賦
    1101: { target: T('training.exp.int'), op: 'mulPct', value: 0.20, condition: null },
    1102: { target: T('training.exp.all'), op: 'mulPct', value: 0.08, condition: null },
    1103: { target: T('training.noGlowBonus'), op: 'add', value: 0.30, condition: null },
    1104: { target: T('training.exp.war'), op: 'mulPct', value: 0.25, condition: null },
    // 保底型名士（低星高工具性）
    1201: { target: T('training.exp.all'), op: 'mulPct', value: 0.05, condition: null },
    1202: { target: T('training.noGlowBonus'), op: 'add', value: 0.30, condition: null },
  },
  GlowUpgradeBonus: {
    // 四維各一條 —— 少了 pol/cha 兩條，以那兩維為專長的名士就沒有對位的解鎖條可掛，
    // 「政與魅是裝飾」有一半是這裡缺料造成的。
    3001: { scope: 'war', chanceAdd: 0.15, condition: null },
    3002: { scope: 'int', chanceAdd: 0.15, condition: null },
    3003: { scope: 'pol', chanceAdd: 0.15, condition: null },
    3004: { scope: 'cha', chanceAdd: 0.15, condition: null },
    3011: { scope: 'all', chanceAdd: 0.08, condition: null },
    // 商店：升階機率 15% → 40%
    3101: { scope: 'all', chanceAdd: 0.05, condition: null },
    3102: { scope: 'all', chanceAdd: 0.10, condition: null },
    3103: { scope: 'all', chanceAdd: 0.17, condition: null },
    3104: { scope: 'all', chanceAdd: 0.25, condition: null },
    // 天賦〈一鳴驚人〉
    3201: { scope: 'all', chanceAdd: 0.10, condition: null },
  },
  GlowBaseWeight: {
    // 天賦〈天生神力〉：等同武資質 +1 階
    2901: { scope: 'war', tierShift: 1, condition: null },
  },
  SlotBias: {
    4001: { attrWeights: { war: 1.6 }, condition: null },
    4002: { attrWeights: { int: 1.6 }, condition: null },
    4003: { attrWeights: { pol: 1.6 }, condition: null },
    4004: { attrWeights: { cha: 1.6 }, condition: null },
    // 保底型：出現率平均化（不偏任何一維）
    4099: { attrWeights: { war: 1, int: 1, pol: 1, cha: 1 }, condition: null },
  },
  EventRewardBonus: {
    2001: { eventKind: 'all', mulPct: 0.20, condition: null },
    2002: { eventKind: 'resident', mulPct: 0.25, condition: null },
  },
  EventDrawModify: {
    2101: { drawCountAdd: 1, condition: null },
  },
  AffinityGrant: {
    5001: { timing: 'onDreamEnter', targetRule: 'randomRoster', amount: 15, condition: null },
    5002: { timing: 'onDreamEnter', targetRule: 'allRoster', amount: 10, condition: null },
  },
  AffinityGrowth: {
    5101: { scope: 'allRoster', mulPct: 0.15, condition: null },
    5102: { scope: 'self', mulPct: 0.50, condition: null },
  },
  CheckValueBonus: {
    6001: { attr: 'all', scope: 'major', add: 8, condition: null },
    6002: { attr: 'war', scope: 'both', add: 6, condition: null },
    6003: { attr: 'int', scope: 'both', add: 6, condition: null },
    6004: { attr: 'pol', scope: 'both', add: 6, condition: null },
    6005: { attr: 'cha', scope: 'both', add: 6, condition: null },
  },
  CheckRetry: {
    6101: { scope: 'major', usesPerRun: 1, condition: null },
  },
  RevealInfo: {
    6201: { what: 'checkBreakdown', condition: null },
    6202: { what: 'nextTurnSlots', condition: null },
  },
  CurrencyBonus: {
    7001: { currency: 'allFame', mulPct: 0.30, condition: null },
    7002: { currency: 'fame.moral', mulPct: 0.50, condition: null },
    7003: { currency: 'allMerit', mulPct: 0.20, condition: null },
  },
};
