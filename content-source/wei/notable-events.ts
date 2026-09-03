// 魏的三十一則人物事件（19 §6）。
//
// ── 觸發與同格【無關】★ ──────────────────────────────
//
//   一 · cast 全員在陣容中，且各自好感達到 `minStage`
//   二 · 同鏈的前一步本輪已經發生過（step 0 無此限制）
//   三 · 本輪尚未觸發過
//
// 同格仍然重要 —— 但它餵的是【好感】（門檻），不是觸發本身。
// 迴圈是：同格 → 長好感 → 好感過門檻 → 事件進可抽池。
//
// 鏈的進度【不另存】：鏈上的事件一律 `unique`，所以「step N−1 發生過沒有」
// 就是 `turn.seenUniqueIds` 裡有沒有那一則。
//
// ── 三個軸決定獎勵 ──────────────────────────────────
//   人數  cast 一人／兩人／三人 —— 人越多越好
//   階段  step 越後面越好
//   門檻  相識 20 → 友好 40 → 知交 60 → 莫逆 80
//
// 最好的獎勵 ＝ 多人 × 多階段 × 高門檻。〈五子良將〉是那個極端：
// 三位指定角色同時養到莫逆，在一輪 32 回合裡幾乎不可能 —— 它是跨輪目標。
import type { EventDef, EventOptionDef, EventReward, NotableCastRef } from '../../src/contracts/core/definitions.js';
import type { AffinityStage, Attr } from '../../src/contracts/core/primitives.js';
import { eventChainId, eventDefId, itemId, notableId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { IN_WEI } from './commissions.js';
import { weiDef } from './pack-id.js';

const k = asKey;

const cast = (who: string, minStage: AffinityStage): NotableCastRef =>
  ({ notableId: notableId(`notable:${who}`), minStage });

/** 保證掉一件道具。鏈末事件走這條 —— 機率版留給人物委託。 */
const grantItem = (name: string): EventReward =>
  ({ kind: 'item', itemId: itemId(`item:${name}`), chance: 1 });

interface Spec {
  /** 事件短名。ID 與所有文案 key 都由它推導。 */
  readonly name: string;
  readonly chain: string;
  readonly step: number;
  readonly cast: readonly NotableCastRef[];
  /** 兩個選項各自的磨練組合。人物事件是【性格分歧】，沒有高下。 */
  readonly a: readonly [Attr, number][];
  readonly b: readonly [Attr, number][];
  readonly merit: 'civil' | 'martial';
  /** 功績量級。小 12 ／ 中 26 ／ 大 48。多人與鏈末給大的。 */
  readonly amount: number;
  /** 鏈末保證掉的道具。 */
  readonly item?: string;
  /** 額外的當局獎勵：全員好感。陳群那種「一次性改寫本輪」走這條。 */
  readonly affinityAll?: number;
}

/**
 * 兩個選項，都是 `story` 檔。
 *
 * 人物事件不是階梯而是【性格分歧】—— 兩個選項沒有高下，只有不同。
 * 硬塞進 low/mid/high 會讓畫面標出不存在的難度差（見 OptionTier 的註解）。
 */
const options = (s: Spec): readonly EventOptionDef[] => {
  const rewards: EventReward[] = [{ kind: 'merit', merit: s.merit, amount: s.amount }];
  if (s.item !== undefined) rewards.push(grantItem(s.item));
  if (s.affinityAll !== undefined) {
    rewards.push({ kind: 'affinity', notableId: null, amount: s.affinityAll });
  }
  return (['a', 'b'] as const).map((side) => ({
    tier: 'story' as const,
    labelKey: k(`event.wei.${s.name}.opt.${side}`),
    requirements: [],
    check: null,
    practice: (side === 'a' ? s.a : s.b).map(([attr, weight]) => ({ attr, weight })),
    rewards,
  }));
};

const event = (s: Spec): EventDef => weiDef('event', `event:wei.${s.name}`, {
  eventDefId: eventDefId(`event:wei.${s.name}`),
  trigger: {
    kind: 'notable',
    chainId: eventChainId(`chain:${s.chain}`),
    step: s.step,
    cast: s.cast,
  },
  // 鏈上的事件一律 unique —— 那既是「一輪一次」，也是鏈的進度來源。
  unique: true,
  collectible: true,
  weight: 100,
  titleKey: k(`event.wei.${s.name}.title`),
  bodyKey: k(`event.wei.${s.name}.body`),
  paramSlots: [],
  requirements: [IN_WEI],
  options: options(s),
});

// 功績量級 ★ **已從 12／26／48 減半** —— 它們還要再乘官階與稀有度。
// 舊值下一則 ★5 大事件在 rank 12 給 1680，而那一階只要 1330：
// **一則事件跳一階**。減半＋兩條倍率壓平之後約 310，
// 剛好是頂階一步的一半 —— 是個大場面，但不是階梯的替代品。
const SMALL = 6;
const MID = 13;
const BIG = 24;

// ══ 入門 · 十二則（單人，step 0）══════════════════════
const entries: readonly Spec[] = [
  { name: 'caocao-summon', chain: 'caocao', step: 0, cast: [cast('caocao', 'friendly')],
    a: [['lead', 1.4], ['pol', 0.5]], b: [['lead', 1.0], ['int', 0.9]], merit: 'martial', amount: MID },
  { name: 'zhangliao-eight-hundred', chain: 'zhangliao', step: 0, cast: [cast('zhangliao', 'friendly')],
    a: [['lead', 1.4], ['war', 0.5]], b: [['war', 1.2], ['lead', 0.7]], merit: 'martial', amount: MID },
  { name: 'yujin-camp', chain: 'yujin', step: 0, cast: [cast('yujin', 'acquainted')],
    a: [['lead', 1.0], ['pol', 0.4]], b: [['lead', 0.7], ['war', 0.7]], merit: 'martial', amount: SMALL },
  { name: 'xiahoudun-arrow', chain: 'xiahoudun', step: 0, cast: [cast('xiahoudun', 'friendly')],
    a: [['war', 1.4], ['lead', 0.5]], b: [['war', 1.1], ['pol', 0.8]], merit: 'martial', amount: MID },
  { name: 'dianwei-halberds', chain: 'dianwei', step: 0, cast: [cast('dianwei', 'acquainted')],
    a: [['war', 1.1], ['lead', 0.3]], b: [['war', 0.8], ['int', 0.6]], merit: 'martial', amount: SMALL },
  { name: 'lejin-vanguard', chain: 'lejin', step: 0, cast: [cast('lejin', 'acquainted')],
    a: [['war', 1.1], ['lead', 0.3]], b: [['lead', 0.9], ['war', 0.5]], merit: 'martial', amount: SMALL },
  { name: 'guojia-wager', chain: 'guojia', step: 0, cast: [cast('guojia', 'friendly')],
    a: [['int', 1.4], ['pol', 0.5]], b: [['int', 1.0], ['lead', 0.9]], merit: 'civil', amount: MID },
  { name: 'jiaxu-one-word', chain: 'jiaxu', step: 0, cast: [cast('jiaxu', 'friendly')],
    a: [['int', 1.4], ['pol', 0.5]], b: [['int', 1.1], ['war', 0.8]], merit: 'civil', amount: MID },
  { name: 'chengyu-three-days', chain: 'chengyu', step: 0, cast: [cast('chengyu', 'acquainted')],
    a: [['int', 1.0], ['pol', 0.4]], b: [['pol', 0.9], ['int', 0.5]], merit: 'civil', amount: SMALL },
  { name: 'xunyu-night', chain: 'xunyu', step: 0, cast: [cast('xunyu', 'friendly')],
    a: [['pol', 1.4], ['int', 0.5]], b: [['pol', 1.0], ['lead', 0.9]], merit: 'civil', amount: MID },
  { name: 'chenqun-grading', chain: 'chenqun', step: 0, cast: [cast('chenqun', 'acquainted')],
    a: [['pol', 1.0], ['int', 0.4]], b: [['pol', 0.7], ['lead', 0.7]], merit: 'civil', amount: SMALL },
  { name: 'maojie-recommend', chain: 'maojie', step: 0, cast: [cast('maojie', 'acquainted')],
    a: [['pol', 1.0], ['int', 0.4]], b: [['int', 0.8], ['pol', 0.6]], merit: 'civil', amount: SMALL },
];

/**
 * 低星的第二則（知交 60，掉低階道具）★
 *
 * 把事件併進名士卡之後才顯出來的問題：★1–★3 每人只有一則入門事件，
 * 但他們正是碎片最便宜、最早會被養滿的人 —— 投入最少的人反而最早無事可做。
 *
 * 補這一批同時解決另一件事：低階道具需要一條產線才可能「一輪重複多次」。
 */
const seconds: readonly Spec[] = [
  { name: 'zhangliao-persuade', chain: 'zhangliao', step: 1, cast: [cast('zhangliao', 'close')],
    a: [['lead', 1.6], ['int', 0.6]], b: [['int', 1.2], ['lead', 1.0]], merit: 'martial', amount: MID, item: 'bow' },
  { name: 'yujin-changxi', chain: 'yujin', step: 1, cast: [cast('yujin', 'close')],
    a: [['lead', 1.6], ['pol', 0.6]], b: [['lead', 1.2], ['war', 1.0]], merit: 'martial', amount: MID, item: 'seal' },
  { name: 'xiahoudun-farmland', chain: 'xiahoudun', step: 1, cast: [cast('xiahoudun', 'close')],
    a: [['war', 1.6], ['pol', 0.6]], b: [['pol', 1.3], ['war', 0.9]], merit: 'martial', amount: MID, item: 'spear' },
  { name: 'lejin-no-boast', chain: 'lejin', step: 1, cast: [cast('lejin', 'close')],
    a: [['war', 1.6], ['lead', 0.6]], b: [['lead', 1.3], ['war', 0.9]], merit: 'martial', amount: MID, item: 'bow' },
  { name: 'chengyu-hundred-thousand', chain: 'chengyu', step: 1, cast: [cast('chengyu', 'close')],
    a: [['int', 1.6], ['pol', 0.6]], b: [['pol', 1.3], ['int', 0.9]], merit: 'civil', amount: MID, item: 'bamboo' },
  { name: 'chenqun-nine-ranks', chain: 'chenqun', step: 1, cast: [cast('chenqun', 'close')],
    a: [['pol', 1.6], ['int', 0.6]], b: [['int', 1.3], ['pol', 0.9]], merit: 'civil', amount: MID, item: 'seal' },
  { name: 'maojie-pure-talk', chain: 'maojie', step: 1, cast: [cast('maojie', 'close')],
    a: [['pol', 1.6], ['int', 0.6]], b: [['int', 1.3], ['pol', 0.9]], merit: 'civil', amount: MID, item: 'bamboo' },
];

/**
 * 高階道具的【保證來源】★
 *
 * 一輪一次的道具不帶進場就永遠 0 碎片，因此它至少要有一條機率為 1
 * 的掉落 —— 否則玩家連第一件都可能永遠拿不到，攜帶格的取捨就不存在。
 *
 * 青釭劍與逍遙津令原本只挂在人物委託的機率掉落上，是載入期驗證拒揉之後才看見的洞。
 */
const relicChains: readonly Spec[] = [
  { name: 'xiahoudun-one-eye', chain: 'xiahoudun', step: 2, cast: [cast('xiahoudun', 'sworn')],
    a: [['war', 2.4], ['lead', 1.0]], b: [['lead', 2.0], ['war', 1.4]],
    merit: 'martial', amount: BIG, item: 'qinggang' },
  { name: 'zhangliao-hefei', chain: 'zhangliao', step: 2, cast: [cast('zhangliao', 'sworn')],
    a: [['lead', 2.4], ['war', 1.0]], b: [['war', 2.0], ['lead', 1.4]],
    merit: 'martial', amount: BIG, item: 'xiaoyaojin' },
];

// ══ 單人鏈 · 三條（各三階，鏈末保證掉高階道具）══════════
const chains: readonly Spec[] = [
  { name: 'caocao-green-plum', chain: 'caocao', step: 1, cast: [cast('caocao', 'close')],
    a: [['lead', 2.0], ['int', 0.8]], b: [['int', 1.6], ['lead', 1.2]], merit: 'martial', amount: BIG },
  { name: 'caocao-merit-only', chain: 'caocao', step: 2, cast: [cast('caocao', 'sworn')],
    a: [['lead', 2.4], ['pol', 1.0]], b: [['pol', 2.0], ['lead', 1.4]], merit: 'martial', amount: BIG, item: 'mengde' },
  { name: 'guojia-ten-wins', chain: 'guojia', step: 1, cast: [cast('guojia', 'close')],
    a: [['int', 2.0], ['lead', 0.8]], b: [['int', 1.6], ['pol', 1.2]], merit: 'civil', amount: BIG },
  { name: 'guojia-last-plan', chain: 'guojia', step: 2, cast: [cast('guojia', 'sworn')],
    a: [['int', 2.4], ['lead', 1.0]], b: [['int', 2.0], ['war', 1.4]], merit: 'civil', amount: BIG, item: 'fengxiao' },
  { name: 'xunyu-deep-root', chain: 'xunyu', step: 1, cast: [cast('xunyu', 'close')],
    a: [['pol', 2.0], ['int', 0.8]], b: [['pol', 1.6], ['lead', 1.2]], merit: 'civil', amount: BIG },
  { name: 'xunyu-empty-box', chain: 'xunyu', step: 2, cast: [cast('xunyu', 'sworn')],
    a: [['pol', 2.4], ['int', 1.0]], b: [['int', 2.0], ['pol', 1.4]], merit: 'civil', amount: BIG, item: 'wangzuo' },
];

/**
 * 多人 · 三組（獎勵最好）★
 *
 * 十二人抽六人，兩位指定角色全員到齊 22.7%、三位只有 9.1%。
 * 加上好感門檻之後，一般玩法幾乎遇不到 —— 這正好給了〈累世公卿〉
 * （指定三位）一個真正的理由：它從「我想要這個強角」變成
 * 「我要湊出宛城那一段」。那是玩家自己設計的目標。
 */
const multi: readonly Spec[] = [
  { name: 'wancheng-gate', chain: 'wancheng', step: 0,
    cast: [cast('caocao', 'close'), cast('dianwei', 'close')],
    a: [['war', 2.0], ['lead', 1.2]], b: [['lead', 1.8], ['war', 1.4]], merit: 'martial', amount: BIG },
  { name: 'wancheng-halberds', chain: 'wancheng', step: 1,
    cast: [cast('caocao', 'sworn'), cast('dianwei', 'sworn')],
    a: [['war', 2.6], ['lead', 1.4]], b: [['lead', 2.2], ['war', 1.8]], merit: 'martial', amount: BIG, item: 'halberd' },
  { name: 'two-reckonings', chain: 'two-reckonings', step: 0,
    cast: [cast('xunyu', 'close'), cast('jiaxu', 'close')],
    a: [['pol', 2.0], ['int', 1.2]], b: [['int', 2.0], ['pol', 1.2]], merit: 'civil', amount: BIG },
  { name: 'five-generals', chain: 'wuzi', step: 0,
    cast: [cast('zhangliao', 'sworn'), cast('yujin', 'sworn'), cast('lejin', 'sworn')],
    a: [['lead', 2.8], ['war', 1.6]], b: [['war', 2.8], ['lead', 1.6]],
    merit: 'martial', amount: BIG, item: 'wuzi', affinityAll: 10 },
];

export const weiNotableEvents: readonly EventDef[] = [
  ...entries, ...seconds, ...chains, ...relicChains, ...multi,
].map(event);
