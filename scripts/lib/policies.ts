// 模擬器的決策策略。策略是程式碼不是資料 —— 它是分析工具的一部分（31 §3.2）。
//
// ── 為什麼整組策略換掉了 ────────────────────────────
//
// 舊制的軸線是「這一回合要練還是要辦事」，因此策略組以【事件佔比】鋪開。
// 新制每個回合都先做固定事件、再處理它引出的委託 —— 那個比值恆為 1:1，
// 拿它當軸線會量出一整排相同的數字。
//
// 新制玩家真正在決定的是兩件事，策略組因此改以這兩件事鋪開：
//   1. 投哪一維（＝爬哪一條官階、練哪一維、承受哪種光階運氣）
//   2. 委託怎麼處理（穩穩收下，還是賭高報酬的那個選項）
import type { Session } from '../../src/app/session.js';
import type {
  Attr, CareerLine, CheckChoice, SlotIndex,
} from '../../src/contracts/core/primitives.js';
import { ATTRS, SLOT_INDICES } from '../../src/contracts/core/primitives.js';
import type { EventOffer } from '../../src/contracts/core/state.js';

export interface AgentPolicy {
  readonly name: string;
  /** 回合的第一個決定：四個固定事件擇一（15 §2）。 */
  chooseSlot(s: Session): SlotIndex;
  /** 回合的第二個決定：待處理事件用哪個方法度過。 */
  chooseOption(s: Session, offer: EventOffer): number;
  /** 章末大檢定的六個選項擇一（18 §2.2）。 */
  chooseCheck(s: Session): CheckChoice;
}

const GLOW_ORDER = { none: 0, silver: 1, gold: 2, red: 3 } as const;
const FALLBACK: CheckChoice = { line: 'martial', difficulty: 'safe' };

const bestSlot = (s: Session, score: (i: SlotIndex) => number): SlotIndex => {
  let best: SlotIndex = 0;
  let bestScore = -Infinity;
  for (const i of SLOT_INDICES) {
    const v = score(i);
    if (v > bestScore) { bestScore = v; best = i; }
  }
  return best;
};

const slotAttr = (s: Session, i: SlotIndex): Attr | null =>
  s.current.turn.slots[i]?.attr ?? null;

/** 該路線本章的主屬性。六選項制下「主檢定屬性」不再唯一，必須先指定路線。 */
const primaryOf = (s: Session, line: CareerLine): Attr =>
  s.majorCheck().routes[line].primaryAttr;

/** 專精某一維：那一格永遠優先，同維時再比期望值。 */
const focus = (s: Session, attr: Attr): SlotIndex => bestSlot(s, (i) => {
  const bonus = slotAttr(s, i) === attr ? 10000 : 0;
  return bonus + s.previewTraining(i).expectedGain;
});

// ── 選項策略 ────────────────────────────────────────

const enabledIndices = (offer: EventOffer): readonly number[] =>
  offer.optionStates.map((_, i) => i).filter((i) => offer.optionStates[i]?.enabled === true);

const meritOf = (offer: EventOffer, i: number): number =>
  (offer.optionStates[i]?.meritPreview ?? []).reduce((a, m) => a + m.amount, 0);

const rateOf = (offer: EventOffer, i: number): number => offer.optionStates[i]?.successRate ?? 1;

/** 穩：成功率最高的那個。 */
const safest = (offer: EventOffer): number => {
  const on = enabledIndices(offer);
  return on.reduce((best, i) => (rateOf(offer, i) > rateOf(offer, best) ? i : best), on[0] ?? 0);
};

/** 貪：功績最高的那個，不看成功率。失敗仍給四成，所以這不是純自殺。 */
const richest = (offer: EventOffer): number => {
  const on = enabledIndices(offer);
  return on.reduce((best, i) => (meritOf(offer, i) > meritOf(offer, best) ? i : best), on[0] ?? 0);
};

/** 期望值：功績 × 成功率（失敗仍有四成，所以下限不是 0）。 */
const expected = (offer: EventOffer): number => {
  const on = enabledIndices(offer);
  const ev = (i: number): number => meritOf(offer, i) * (0.4 + 0.6 * rateOf(offer, i));
  return on.reduce((best, i) => (ev(i) > ev(best) ? i : best), on[0] ?? 0);
};

// ── 大檢定 ──────────────────────────────────────────

/** 只在指定路線內挑難度。專精者不會臨時換跑道 —— 他沒有另一條線的四維。 */
const pickCheck = (
  s: Session, prefer: 'low' | 'high' | 'rate', line: CareerLine,
): CheckChoice => {
  const avail = s.availableChoices().filter((c) => c.line === line);
  if (avail.length === 0) return { line, difficulty: 'safe' };
  if (prefer === 'low') return avail[0] ?? FALLBACK;
  if (prefer === 'high') return avail[avail.length - 1] ?? FALLBACK;
  const sortie = s.eligibleSortie().slice(0, 3);
  let chosen: CheckChoice = avail[0] ?? FALLBACK;
  for (const c of avail) {
    if (s.previewMajor(c, sortie).successRate >= 0.75) chosen = c;
  }
  return chosen;
};

/**
 * 不挑路線，六個選項裡挑成功率過關的最高 DC。
 *
 * 它度量的是【路線自選值多少】：舊制只有一條路線，主屬性在章節間變化本身
 * 就是對純專精的懲罰。六選項制把那個懲罰拿掉了，這個策略量出差額。
 */
const flexibleCheck = (s: Session): CheckChoice => {
  const avail = s.availableChoices();
  const sortie = s.eligibleSortie().slice(0, 3);
  let byDc: CheckChoice | null = null;
  let bestDc = -Infinity;
  let byRate: CheckChoice | null = null;
  let bestRate = -Infinity;
  for (const c of avail) {
    const pv = s.previewMajor(c, sortie);
    if (pv.successRate > bestRate) { bestRate = pv.successRate; byRate = c; }
    if (pv.successRate >= 0.75 && pv.dc > bestDc) { bestDc = pv.dc; byDc = c; }
  }
  return byDc ?? byRate ?? FALLBACK;
};

// ── 策略組 ──────────────────────────────────────────

/** 專精單線：固定投該路線的主屬性格。這是「純養成」的參照點。 */
const lineFocused = (name: string, line: CareerLine): AgentPolicy => ({
  name,
  chooseSlot: (s) => focus(s, primaryOf(s, line)),
  chooseOption: (s, offer) => expected(offer),
  chooseCheck: (s) => pickCheck(s, 'rate', line),
});

export const POLICIES: readonly AgentPolicy[] = [
  lineFocused('focus-martial', 'martial'),
  lineFocused('focus-civil', 'civil'),
  {
    /**
     * 追期望值：永遠投期望四維最高的那一格，不管是哪一維。
     *
     * 名士相乘之後「全員擠在統御格但我需要武」是真兩難。四維會被打散，
     * 因此它的大檢定走 flexibleCheck —— 分散的人最受益於路線自選。
     */
    name: 'greedy-gain',
    chooseSlot: (s) => bestSlot(s, (i) => s.previewTraining(i).expectedGain),
    chooseOption: (s, offer) => expected(offer),
    chooseCheck: flexibleCheck,
  },
  {
    /**
     * 追光階：永遠投保底光階最高的那一格。
     *
     * 新制下光階同時決定委託稀有度，所以這個策略在問一個新問題：
     * 【為了大委託而放棄專精，值得嗎】？舊制沒有這個抉擇。
     */
    name: 'rarity-chaser',
    chooseSlot: (s) => bestSlot(s, (i) => {
      const slot = s.current.turn.slots[i];
      if (slot === undefined) return -1;
      return GLOW_ORDER[slot.baseGlow] * 1000 + s.previewTraining(i).expectedGain;
    }),
    chooseOption: (s, offer) => richest(offer),
    chooseCheck: flexibleCheck,
  },
  {
    /**
     * 追名士：永遠投站著人最多的那一格。
     *
     * 同台是武將事件的唯一條件，因此這個策略量的是
     * 【名士事件實際觸發得到嗎】—— 舊制那條線實測 0.13–0.45 次/輪，等於不存在。
     */
    name: 'notable-chaser',
    chooseSlot: (s) => bestSlot(s, (i) => {
      const slot = s.current.turn.slots[i];
      if (slot === undefined) return -1;
      return slot.notables.length * 1000 + s.previewTraining(i).expectedGain;
    }),
    chooseOption: (s, offer) => expected(offer),
    chooseCheck: flexibleCheck,
  },
  {
    /**
     * 追驚嘆號：永遠投【有委託旗標】的那一格（15 §3）★
     *
     * 它與 rarity-chaser 是這一版的核心對照組。委託改成每格獨立 50%
     * 之後，【功績收入變成玩家可調的旋鈕】：
     *   一路追驚嘆號  有效觸發率 1−(1−0.5)^4 ≈ 93.8%
     *   一路追光階    只有 50%
     * 兩邊的點數差就是【選高光階 vs 選有委託的格】這個取捨的價碼。
     * 差太多就表示有一邊是陷阱，那就不是取捨。
     */
    name: 'flag-chaser',
    chooseSlot: (s) => bestSlot(s, (i) => {
      const pv = s.previewTraining(i);
      return (pv.hasCommission ? 2000 : 0) + (pv.hasEncounter ? 1000 : 0) + pv.expectedGain;
    }),
    chooseOption: (s, offer) => expected(offer),
    chooseCheck: flexibleCheck,
  },
  {
    /**
     * 追人物事件旗標。量的是【人物事件真的碰得到嗎】——
     * 它们全都卡在好感門檻上，而好感又要靠同格養。
     */
    name: 'encounter-chaser',
    chooseSlot: (s) => bestSlot(s, (i) => {
      const pv = s.previewTraining(i);
      return (pv.hasEncounter ? 2000 : 0) + pv.notableCount * 100 + pv.expectedGain;
    }),
    chooseOption: (s, offer) => expected(offer),
    chooseCheck: flexibleCheck,
  },
  {
    // 平均分配四維：輪流投。四維上限與大檢定副屬性的價值由它量出來。
    name: 'balanced',
    chooseSlot: (s) => {
      const want = ATTRS[s.current.progress.turn % ATTRS.length];
      return want === undefined ? 0 : focus(s, want);
    },
    chooseOption: (s, offer) => expected(offer),
    chooseCheck: flexibleCheck,
  },
  {
    // 專精武，委託一律選最穩的 —— 功績少但幾乎不失敗。
    name: 'option-safe',
    chooseSlot: (s) => focus(s, primaryOf(s, 'martial')),
    chooseOption: (s, offer) => safest(offer),
    chooseCheck: (s) => pickCheck(s, 'rate', 'martial'),
  },
  {
    // 專精武，委託一律選功績最高的 —— 常失敗，但失敗仍給四成。
    // 與 option-safe 的差額就是「賭委託」值不值得。
    name: 'option-greedy',
    chooseSlot: (s) => focus(s, primaryOf(s, 'martial')),
    chooseOption: (s, offer) => richest(offer),
    chooseCheck: (s) => pickCheck(s, 'rate', 'martial'),
  },
  {
    name: 'risk-averse',
    chooseSlot: (s) => focus(s, primaryOf(s, 'martial')),
    chooseOption: (s, offer) => safest(offer),
    chooseCheck: (s) => pickCheck(s, 'low', 'martial'),
  },
  {
    name: 'risk-seeking',
    chooseSlot: (s) => focus(s, primaryOf(s, 'martial')),
    chooseOption: (s, offer) => richest(offer),
    chooseCheck: (s) => pickCheck(s, 'high', 'martial'),
  },
  {
    name: 'random',
    chooseSlot: (s) => {
      const turn = s.current.progress.turn;
      const r = Math.abs(Math.sin(turn * 12.9898) * 43758.5453) % 1;
      return (Math.floor(r * SLOT_INDICES.length) % SLOT_INDICES.length) as SlotIndex;
    },
    chooseOption: (s, offer) => {
      const on = enabledIndices(offer);
      const turn = s.current.progress.turn;
      const r = Math.abs(Math.sin(turn * 78.233) * 43758.5453) % 1;
      return on[Math.floor(r * on.length) % Math.max(1, on.length)] ?? 0;
    },
    chooseCheck: (s) => pickCheck(s, 'low', 'martial'),
  },
];
