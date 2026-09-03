import type {
  EventDef, EventOptionDef, EventReward,
} from '../../../src/contracts/core/definitions.js';
import type { Condition } from '../../../src/contracts/core/effects.js';
import {
  dcCurveId, eventDefId, itemPoolId, paramPoolId,
} from '../../../src/contracts/core/ids.js';
import type { Attr, CareerLine, Rarity } from '../../../src/contracts/core/primitives.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const slot = (name: string, pool: string) => ({ name, poolId: paramPoolId(pool) });
const EASY = dcCurveId('dc:easy');
const NORMAL = dcCurveId('dc:normal');
const HARD = dcCurveId('dc:hard');

/**
 * 事上磨練的權重（17 §6.2）★ 由【檔次】決定，作者不逐條手寫。
 *
 * ── 三檔已拉開 ★ 玩家指出「簡單中難差異太小」 ──────
 * 舊值 1.1／1.5／1.9：低檔拿中檔的 73%，而它的過關率是 79% 對 51%。
 * 於是「低」不是交差了事，是【划算】—— 那讓三檔退化成一檔。
 *
 *   本維   0.45 → 1.1 → 1.6
 *   順帶   0.15 → 0.4 → 0.6
 *   合計   0.60 → 1.5 → 2.2   （低是中的四成，高是中的一倍半）
 *
 * 中檔 Σ1.5 × 基礎值 20 ＝ 一則 ★N 委託給 **30N 經驗** ——
 * 那正好是「N 個基礎事件」（一關戰役的單位也是 30）。
 */
const OWN_WEIGHT = { low: 0.45, mid: 1.1, high: 1.6 } as const;
const SUB_WEIGHT = { low: 0.15, mid: 0.4, high: 0.6 } as const;

/**
 * 每則委託恰好三個選項（17 §5）★
 *
 * 三檔的軸線是【費力程度】，不是善惡（善惡名已退場）：
 *   low   交差了事：無門檻、EASY、報酬最少、練得最少
 *   mid   照規矩辦：無門檻、NORMAL、正攻法
 *   high  做到底  ：要官階、HARD、報酬最多、練得最兇
 *
 * 作者只寫【基準值】—— 稀有度倍率與官階倍率由 ⑰ 乘上去。因此三檔寫
 * 12／20／32 就足以表達差距，不必為每個稀有度重寫一組（那種寫法改倍率時全部過期）。
 *
 * high 的門檻是【該線官階 ≥ 稀有度 ＋ 1】。用官階而不是四維門檻，
 * 因為官階會隨遊玩自然成長，四維門檻寫死之後在後期一律形同虛設。
 */
const LOW_MERIT = 3;
const MID_MERIT = 10;
const HIGH_MERIT = 18;

/**
 * 基準值 3／10／18 ★ **已從 12／20／32 重訂**
 *
 * 兩件事一起改：
 *
 * 一 · **量級下修**。功績的階梯頂端從 6405 壓到 2960（career/ranks.ts），
 *      收入必須跟著下來，否則一則事件還是能跳一階。
 *
 * 二 · **比例拉開**。舊的 12／20／32 是 0.6／1／1.6；
 *      新的 3／10／18 是 0.3／1／1.8。低檔從「便宜好用」變成
 *      **真的只是交差了事** —— 它的價值在那個 99% 的過關率，
 *      不在它給的東西。
 *
 * 期望值（rank 8、★2、含 failRatio 0.4）：
 *   低  43 × 1.00 ＝ 43     ← 穩，但少
 *   中 143 × 0.51 ＋ 57 × 0.49 ＝ 101
 *   高 258 × 0.25 ＋ 103 × 0.75 ＝ 142   ← 要官階門檻，且變異大
 * 三檔同向遞增，而且【每一檔都有它自己的理由】。
 */

/**
 * 稀有度 3 以上的委託，最難檔有機率掉低階道具（23 §6）★
 *
 * 低階道具的定位是【第一輪就能開始堆】的東西，不該和名士好感綁在一起 ——
 * 委託不吃好感門檻，那才是真正「一輪能重複多次」的來源。
 *
 * 【中檔也掉】★ 初版只挂在最難檔、且限 ★3 以上，實測碎片只有
 * 0.09–0.42 件/輪 —— 而碎片是【同一輪拿第二次】才產生的。
 * 這個量下，低階道具一輪通常只拿到一件，「自己會滿」從來沒發生過。
 * 放寬到 ★2 以上、中檔與高檔都掉之後，它才真的是一條產線。
 * （低檔不掉 —— 「交差了事」不該有戰利。）
 */
const LOW_DROP_MIN_RARITY = 2;
const LOW_DROP_CHANCE = 0.45;

/** 稀有度夠高時附上低階道具的機率掉落。中檔與高檔共用同一條規則。 */
const withLowDrop = (
  base: readonly EventReward[], rarity: Rarity,
): readonly EventReward[] => (rarity >= LOW_DROP_MIN_RARITY
  ? [...base, { kind: 'itemPool', poolId: itemPoolId('pool:item.low'), chance: LOW_DROP_CHANCE }]
  : base);

const gate = (line: CareerLine, rarity: Rarity): Condition =>
  ({ type: 'statGte', stat: `career.${line}`, value: rarity + 1 });

interface OptSpec {
  readonly key: string;
  /** 這個做法順帶用到的另一維。必須與委託本身的維不同（驗證會擋重複）。 */
  readonly sub: Attr;
}

/**
 * 三檔【一律檢定該委託自己的維】★
 *
 * 曾經讓三檔各檢定不同維（例如武的委託裡「低」檔檢定統），做法的差別是有了，
 * 但實測畫面上出現「低 63% ／ 中 100%」—— 標籤寫著低，玩家讀成最容易。
 * 那不是取捨，是誤導；DC 遞增的驗證也因為跨維比較而失去意義。
 *
 * 三檔的差別由【費力程度】承擔，四項全部同向遞增：
 *   難度 EASY→NORMAL→HARD
 *   功績 12→20→32
 *   本維磨練 0.8→1.1→1.4，順帶磨練 0.3→0.4→0.5
 * 沒有「便宜行事換高報酬」的分支 —— 那需要一個代價軸，而善惡名已退場。
 */
const three = (
  attr: Attr, line: CareerLine, rarity: Rarity,
  low: OptSpec, mid: OptSpec, high: OptSpec,
): readonly EventOptionDef[] => [
  {
    tier: 'low', labelKey: k(low.key), requirements: [],
    check: { attr, dcCurveId: EASY },
    practice: [{ attr, weight: OWN_WEIGHT.low }, { attr: low.sub, weight: SUB_WEIGHT.low }],
    rewards: [{ kind: 'merit', merit: line, amount: LOW_MERIT }],
  },
  {
    tier: 'mid', labelKey: k(mid.key), requirements: [],
    check: { attr, dcCurveId: NORMAL },
    practice: [{ attr, weight: OWN_WEIGHT.mid }, { attr: mid.sub, weight: SUB_WEIGHT.mid }],
    rewards: withLowDrop([{ kind: 'merit', merit: line, amount: MID_MERIT }], rarity),
  },
  {
    tier: 'high', labelKey: k(high.key), requirements: [gate(line, rarity)],
    check: { attr, dcCurveId: HARD },
    practice: [{ attr, weight: OWN_WEIGHT.high }, { attr: high.sub, weight: SUB_WEIGHT.high }],
    rewards: withLowDrop([{ kind: 'merit', merit: line, amount: HIGH_MERIT }], rarity),
  },
];

/**
 * 一則委託。
 *
 * ID 的形狀是 `event:<維>.<稀有度>.<名>` —— 抽取由 (維 × 稀有度) 定位，
 * ID 帶著同一組座標，缺哪一桶用肉眼就看得出來。
 *
 * 每一桶都必須有一則【無門檻】的委託（＝ low 與 mid 兩檔永遠開著）：
 * 抽取時若門檻把整桶濾空，執行期就沒有合法出路了（§2.2）。
 */
const commission = (
  attr: Attr, rarity: Rarity, name: string, line: CareerLine,
  params: readonly { name: string; poolId: ReturnType<typeof paramPoolId> }[],
  specs: readonly [OptSpec, OptSpec, OptSpec],
): EventDef => {
  const base = `event.${attr}.${rarity}.${name}`;
  return coreDef('event', `event:${attr}.${rarity}.${name}`, {
    eventDefId: eventDefId(`event:${attr}.${rarity}.${name}`),
    trigger: { kind: 'commission', attr, rarity },
    unique: false, collectible: false, weight: 30,
    titleKey: k(`${base}.title`),
    bodyKey: k(`${base}.body`),
    paramSlots: params,
    requirements: [],
    options: three(attr, line, rarity, specs[0], specs[1], specs[2]),
  });
};

const PLACE = slot('place', 'pool:place');
const PATRON = slot('patron', 'pool:patron');
const BANDIT = slot('bandit', 'pool:bandit');
const GOODS = slot('goods', 'pool:goods');

const o = (key: string, sub: Attr): OptSpec => ({ key, sub });

// ── 統 · 帶兵治軍（武功）─────────────────────────────
const leadCommissions: readonly EventDef[] = [
  commission('lead', 1, 'muster', 'martial', [PLACE], [
    o('event.lead.1.muster.opt.count', 'pol'),
    o('event.lead.1.muster.opt.purge', 'pol'),
    o('event.lead.1.muster.opt.rebuild', 'pol'),
  ]),
  commission('lead', 2, 'escort', 'martial', [PATRON, GOODS, PLACE], [
    o('event.lead.2.escort.opt.slow', 'war'),
    o('event.lead.2.escort.opt.fast', 'war'),
    o('event.lead.2.escort.opt.ambush', 'war'),
  ]),
  commission('lead', 3, 'quell', 'martial', [PLACE, BANDIT], [
    o('event.lead.3.quell.opt.encircle', 'pol'),
    o('event.lead.3.quell.opt.assault', 'war'),
    o('event.lead.3.quell.opt.enlist', 'pol'),
  ]),
  commission('lead', 4, 'campaign', 'martial', [PLACE], [
    o('event.lead.4.campaign.opt.accept', 'war'),
    o('event.lead.4.campaign.opt.deep', 'war'),
    o('event.lead.4.campaign.opt.seize', 'war'),
  ]),
];

// ── 武 · 廝殺（武功）────────────────────────────────
const warCommissions: readonly EventDef[] = [
  commission('war', 1, 'strays', 'martial', [PLACE, BANDIT], [
    o('event.war.1.strays.opt.drive', 'lead'),
    o('event.war.1.strays.opt.slay', 'lead'),
    o('event.war.1.strays.opt.hunt', 'lead'),
  ]),
  commission('war', 2, 'stronghold', 'martial', [BANDIT, PLACE], [
    o('event.war.2.stronghold.opt.starve', 'lead'),
    o('event.war.2.stronghold.opt.storm', 'lead'),
    o('event.war.2.stronghold.opt.climb', 'lead'),
  ]),
  commission('war', 3, 'duel', 'martial', [PLACE], [
    o('event.war.3.duel.opt.hold', 'lead'),
    o('event.war.3.duel.opt.answer', 'lead'),
    o('event.war.3.duel.opt.wager', 'lead'),
  ]),
  commission('war', 4, 'banner', 'martial', [PLACE], [
    o('event.war.4.banner.opt.array', 'lead'),
    o('event.war.4.banner.opt.charge', 'lead'),
    o('event.war.4.banner.opt.alone', 'lead'),
  ]),
];

// ── 智 · 謀劃（文功）────────────────────────────────
const intCommissions: readonly EventDef[] = [
  commission('int', 1, 'archive', 'civil', [PATRON], [
    o('event.int.1.archive.opt.collate', 'pol'),
    o('event.int.1.archive.opt.rewrite', 'pol'),
    o('event.int.1.archive.opt.recompile', 'pol'),
  ]),
  commission('int', 2, 'ledger', 'civil', [PLACE, GOODS], [
    o('event.int.2.ledger.opt.cover', 'pol'),
    o('event.int.2.ledger.opt.audit', 'pol'),
    o('event.int.2.ledger.opt.impeach', 'pol'),
  ]),
  commission('int', 3, 'counsel', 'civil', [PLACE], [
    o('event.int.3.counsel.opt.silence', 'pol'),
    o('event.int.3.counsel.opt.speak', 'pol'),
    o('event.int.3.counsel.opt.refute', 'pol'),
  ]),
  commission('int', 4, 'stratagem', 'civil', [PLACE], [
    o('event.int.4.stratagem.opt.envoy', 'pol'),
    o('event.int.4.stratagem.opt.forge', 'pol'),
    o('event.int.4.stratagem.opt.parley', 'lead'),
  ]),
];

// ── 政 · 治理（文功）────────────────────────────────
const polCommissions: readonly EventDef[] = [
  commission('pol', 1, 'dispute', 'civil', [PLACE], [
    o('event.pol.1.dispute.opt.mediate', 'int'),
    o('event.pol.1.dispute.opt.rule', 'int'),
    o('event.pol.1.dispute.opt.deeds', 'int'),
  ]),
  commission('pol', 2, 'farming', 'civil', [PLACE], [
    o('event.pol.2.farming.opt.press', 'lead'),
    o('event.pol.2.farming.opt.release', 'lead'),
    o('event.pol.2.farming.opt.petition', 'int'),
  ]),
  commission('pol', 3, 'survey', 'civil', [PLACE], [
    o('event.pol.3.survey.opt.trade', 'int'),
    o('event.pol.3.survey.opt.measure', 'int'),
    o('event.pol.3.survey.opt.seize', 'lead'),
  ]),
  commission('pol', 4, 'pacify', 'civil', [PLACE], [
    o('event.pol.4.pacify.opt.garrison', 'lead'),
    o('event.pol.4.pacify.opt.appease', 'int'),
    o('event.pol.4.pacify.opt.granary', 'int'),
  ]),
];

/**
 * 核心委託：4 維 × 4 稀有度 = 16 桶，每桶一則，每則三檔選項。
 * low 與 mid 永遠無門檻 —— 這是「執行期不可能抽到空池、也不可能無選項可按」
 * 的來源；陣營包只在此之上添菜，不承擔覆蓋責任。
 */
export const coreCommissions: readonly EventDef[] = [
  ...leadCommissions, ...warCommissions, ...intCommissions, ...polCommissions,
];
