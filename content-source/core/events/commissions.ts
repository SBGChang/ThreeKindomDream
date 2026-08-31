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
 * 軸線只剩費力程度之後，磨練也必須同向遞增 —— 舊版逐條手寫的結果是
 * 「低 1.2 ／ 中 1.0 ／ 高 1.9」這種不單調的組合：低檔比中檔練得多，
 * 那不是階梯。改成檔次決定之後，這件事在結構上就不可能寫錯。
 *
 *   本維   0.8 → 1.1 → 1.4
 *   順帶   0.3 → 0.4 → 0.5
 *   合計   1.1 → 1.5 → 1.9
 */
const OWN_WEIGHT = { low: 0.8, mid: 1.1, high: 1.4 } as const;
const SUB_WEIGHT = { low: 0.3, mid: 0.4, high: 0.5 } as const;

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
const LOW_MERIT = 12;
const MID_MERIT = 20;
const HIGH_MERIT = 32;

/**
 * 基準值維持 12／20／32 ★
 *
 * 委託改成每格獨立 50% 之後，我曾把它抬到 16／27／43，
 * 理由是「委託觸發得少了，一次就該更有份量」。
 *
 * 【那個前提是錯的】—— 實測：追驚嘆號的玩家有效觸發率 93.8%，
 * 根本沒有少收。抬了之後官階衝到 9.4（舊制 8.3），四章就吃掉十二階梯的四分之三。
 *
 * 因此基準值還原。真正需要補償的不是「量」而是「追光階那一邊」 ——
 * 那件事由 `rarityMultiplier` 承擔（見 core/config/training.ts）。
 *
 * 再降到 9／15／24 也試過了：官階回到 8.7，但圓夢率沒動（四維也吃
 * `rarityMultiplier`，降功績救不回難度），而且策略間的差距反而從 8.9% 拉到 15.7%。
 * 12／20／32 是測出來最平的那一點。
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
