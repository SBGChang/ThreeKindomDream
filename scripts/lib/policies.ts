// 模擬器的決策策略。策略是程式碼不是資料 —— 它是分析工具的一部分（31 §3.2）。
//
// 單動作回合制之後，策略的核心不再是「練哪一格」，而是
// 【這一回合要練，還是要去做事】。整組策略因此改以這個抉擇為軸線鋪開：
// 從「只練不做事」到「只做事不練」，中間放幾種混合，用來校準
// eventYieldCurve 與 trainingCurve 的比值（見 core/config/training.ts）。
import type { Session } from '../../src/app/session.js';
import type { Difficulty, SlotIndex } from '../../src/contracts/core/primitives.js';
import { DIFFICULTIES, SLOT_INDICES } from '../../src/contracts/core/primitives.js';
import type { TurnAction } from '../../src/contracts/core/state.js';

export interface AgentPolicy {
  readonly name: string;
  /** 一回合恰好一個動作 —— 策略介面直接反映這條規則（15 §2）。 */
  chooseAction(s: Session): TurnAction;
  chooseDifficulty(s: Session): Difficulty;
}

const GLOW_ORDER = { none: 0, silver: 1, gold: 2, red: 3 } as const;

const bestBy = (s: Session, score: (i: SlotIndex) => number): SlotIndex => {
  let best: SlotIndex = 0;
  let bestScore = -Infinity;
  for (const i of SLOT_INDICES) {
    const v = score(i);
    if (v > bestScore) { bestScore = v; best = i; }
  }
  return best;
};

const train = (s: Session, score: (i: SlotIndex) => number): TurnAction =>
  ({ kind: 'training', index: bestBy(s, score) });

const byExpectedGain = (s: Session) => (i: SlotIndex): number => s.previewTraining(i).expectedGain;

/** 事件：成功率 ≥ 門檻且啟用的選項中挑最高者。沒有合格的就回 null。 */
const bestEvent = (s: Session, minRate: number): TurnAction | null => {
  interface Pick { offerIndex: number; optionIndex: number; rate: number }
  const picks: Pick[] = [];
  s.current.slots.event.offers.forEach((o, oi) => {
    o.optionStates.forEach((st, ii) => {
      if (!st.enabled) return;
      const rate = st.successRate ?? 1;
      if (rate < minRate) return;
      picks.push({ offerIndex: oi, optionIndex: ii, rate });
    });
  });
  const best = picks.sort((a, b) => b.rate - a.rate)[0];
  return best === undefined
    ? null
    : { kind: 'event', offerIndex: best.offerIndex, optionIndex: best.optionIndex };
};

/** 事件優先，抽不到合格事件才退回鍛鍊。 */
const eventFirst = (s: Session, minRate: number): TurnAction =>
  bestEvent(s, minRate) ?? train(s, byExpectedGain(s));

const pickDifficulty = (s: Session, prefer: 'low' | 'high' | 'rate'): Difficulty => {
  const avail = s.availableDifficulties();
  if (avail.length === 0) return 'safe';
  if (prefer === 'low') return avail[0] ?? 'safe';
  if (prefer === 'high') return avail[avail.length - 1] ?? 'safe';
  // rate：挑成功率 >= 0.75 的最高難度
  const sortie = s.eligibleSortie().slice(0, 3);
  let chosen: Difficulty = avail[0] ?? 'safe';
  for (const d of DIFFICULTIES) {
    if (!avail.includes(d)) continue;
    if (s.previewMajor(d, sortie).successRate >= 0.75) chosen = d;
  }
  return chosen;
};

/**
 * 專精主檢定屬性。校準「事件佔比」時，訓練的挑格方式必須固定 ——
 * 否則「押單維 vs 平均分配」的差距會蓋掉事件佔比的影響，兩個變數混在一起就讀不出結論。
 */
const focusedTraining = (s: Session): TurnAction => {
  const primary = s.majorCheck().primaryAttr;
  return train(s, (i) => {
    const slot = s.current.slots.training.slots[i];
    if (slot === undefined) return -1;
    const bonus = slot.attr === primary ? 10000 : 0;
    return bonus + s.previewTraining(i).expectedGain;
  });
};

/** 固定比例的事件胃口：每 period 回合拿 take 回合去做事，其餘專精鍛鍊。 */
const mixed = (name: string, take: number, period: number): AgentPolicy => ({
  name,
  chooseAction: (s) => {
    const wantsEvent = s.current.progress.turn % period < take;
    if (wantsEvent) {
      const ev = bestEvent(s, 0.4);
      if (ev !== null) return ev;
    }
    return focusedTraining(s);
  },
  chooseDifficulty: (s) => pickDifficulty(s, 'rate'),
});

export const POLICIES: readonly AgentPolicy[] = [
  {
    // 只上課，不打工。四維最大化，但名聲功績永遠是 0 起跳 ——
    // 官階上不去，圓夢也只拿到兜底稱號。這是「純養成」的上界。
    name: 'train-only',
    chooseAction: focusedTraining,
    chooseDifficulty: (s) => pickDifficulty(s, 'rate'),
  },
  mixed('mix-25', 1, 4),
  mixed('mix-50', 1, 2),
  mixed('mix-75', 3, 4),
  {
    // 只打工，不上課。四維全靠事上磨練 —— 用來看 practice 的下限。
    name: 'event-only',
    chooseAction: (s) => eventFirst(s, 0),
    chooseDifficulty: (s) => pickDifficulty(s, 'rate'),
  },
  {
    /**
     * 機會主義：只在【這一回合的主維格值得】的時候練，否則去辦事。
     *
     * 「值得」＝ 主維格有金光以上，或有名士站著。兩者都在選擇前可見
     * （兩層 RNG 的第一層 ＋ 名士基底），所以這是玩家真的做得出來的判斷。
     *
     * 它存在的目的是回答一個設計問題：
     * 【逐回合看情況決定】會不會贏過【固定比例】？
     * 若不會，那「這格有誰站著、光階多少」就沒有轉化成決策價值。
     */
    name: 'opportunistic',
    chooseAction: (s) => {
      const primary = s.majorCheck().primaryAttr;
      const idx = SLOT_INDICES.find((i) => s.current.slots.training.slots[i]?.attr === primary);
      const slot = idx === undefined ? undefined : s.current.slots.training.slots[idx];
      if (idx !== undefined && slot !== undefined) {
        const goodGlow = GLOW_ORDER[slot.baseGlow] >= GLOW_ORDER.gold;
        if (goodGlow || slot.notables.length > 0) return { kind: 'training', index: idx };
      }
      return bestEvent(s, 0.4) ?? focusedTraining(s);
    },
    chooseDifficulty: (s) => pickDifficulty(s, 'rate'),
  },
  {
    /**
     * 追爆發：永遠練期望值最高的那一格，不管它是哪一維。
     *
     * 名士相乘之後，「全員擠在交遊格但我需要武」成了真正的兩難。
     * 這個策略選擇追爆發並放棄專精 —— 它與 mix-* 的差別就是
     * 【爽感 vs 效率】的答案。舊版（加法制）追期望值明顯輸給專精，
     * 因為四維分散過不了大檢定；乘法制把賭注加大，值得重測。
     */
    name: 'jackpot-chaser',
    chooseAction: (s) => {
      if (s.current.progress.turn % 4 === 0) {
        const ev = bestEvent(s, 0.4);
        if (ev !== null) return ev;
      }
      return train(s, byExpectedGain(s));
    },
    chooseDifficulty: (s) => pickDifficulty(s, 'rate'),
  },
  {
    // 名士站位優先：有人站就練（養好感度），沒人站才去做事。
    name: 'notable-gated',
    chooseAction: (s) => {
      const best = bestBy(s, (i) => {
        const slot = s.current.slots.training.slots[i];
        return slot === undefined ? -1 : slot.notables.length;
      });
      const slot = s.current.slots.training.slots[best];
      if (slot !== undefined && slot.notables.length > 0) return { kind: 'training', index: best };
      return bestEvent(s, 0.4) ?? focusedTraining(s);
    },
    chooseDifficulty: (s) => pickDifficulty(s, 'rate'),
  },
  {
    name: 'risk-averse',
    chooseAction: (s) => (bestEvent(s, 0.85) ?? focusedTraining(s)),
    chooseDifficulty: (s) => pickDifficulty(s, 'low'),
  },
  {
    name: 'risk-seeking',
    chooseAction: (s) => eventFirst(s, 0.2),
    chooseDifficulty: (s) => pickDifficulty(s, 'high'),
  },
  {
    name: 'random',
    chooseAction: (s) => {
      const turn = s.current.progress.turn;
      const r = Math.abs(Math.sin(turn * 12.9898) * 43758.5453) % 1;
      if (r < 0.5) {
        const ev = bestEvent(s, 0);
        if (ev !== null) return ev;
      }
      const n = s.current.slots.training.slots.length;
      const idx = Math.floor(r * n) % Math.max(1, n);
      return { kind: 'training', index: (idx as SlotIndex) };
    },
    chooseDifficulty: (s) => pickDifficulty(s, 'low'),
  },
];
