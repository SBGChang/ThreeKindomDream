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
import type { NotableId } from '../../src/contracts/core/ids.js';
import type { Attr, CareerLine, SlotIndex } from '../../src/contracts/core/primitives.js';
import { ATTRS, SLOT_INDICES } from '../../src/contracts/core/primitives.js';
import type {
  BattleLoadout, CommanderSlot, EventOffer,
} from '../../src/contracts/core/state.js';

export interface AgentPolicy {
  readonly name: string;
  /** 回合的第一個決定：四個固定事件擇一（15 §2）。 */
  chooseSlot(s: Session): SlotIndex;
  /** 回合的第二個決定：待處理事件用哪個方法度過。 */
  chooseOption(s: Session, offer: EventOffer): number;
  /**
   * 經驗怎麼花（32）★ 新軸線之一。
   *
   * 舊制沒有這個決定 —— 鍛鍊直接寫進屬性。現在玩家要在
   * 【數值 vs 特質 vs 技能】之間分配，而混合消耗讓純專精買不起絕階。
   */
  spend(s: Session): void;
  /** 戰役配置（33 §3）：三招 ＋ 三位指揮各一招。 */
  chooseLoadout(s: Session): BattleLoadout;
  /**
   * 走還留（33 §6）★ **這是新制真正要量的東西：貪心的定價。**
   *
   * 舊制的軸線是「六個難度選項挑哪個」，那是一次性的。
   * 現在同一個問題要問七次，而每次的資訊都不同（你剩多少血、下一關是誰）。
   */
  chooseEngage(s: Session): boolean;
}

const GLOW_ORDER = { none: 0, silver: 1, gold: 2, red: 3 } as const;

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

/**
 * 該官階線在戰役裡的主輸出維（33 §5.3）。
 * 武系＝物理（武）、文系＝法術（智）—— 兩線各有自己的贏法。
 */
const LINE_ATTR: Readonly<Record<CareerLine, Attr>> = { martial: 'war', civil: 'int' };

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

// ── 戰役（㉝）★ ─────────────────────────────────────
//
// 三個新方法一起構成一種「戰役性格」。它們由兩個參數推導：
//   bias   經驗優先投哪一維（＝這一輪的主輸出）
//   margin 走還留要的餘裕倍數 —— 見 engageIf
//
// **margin 是這一版策略組的主軸線。** 舊制量的是「事件佔比」，
// 新制要量的是【貪心的定價對不對】：1.05 的人算得剛剛好就上，
// 2.4 的人要有兩倍餘裕才敢打。兩者的點數差就是獎勵曲線該不該再陡的答案。

const cheapestFirst = <T extends { readonly cost: Readonly<Partial<Record<Attr, number>>> }>(
  offers: readonly T[],
): readonly T[] => offers.slice().sort(
  (a, b) => ATTRS.reduce((n, x) => n + (a.cost[x] ?? 0), 0)
    - ATTRS.reduce((n, x) => n + (b.cost[x] ?? 0), 0),
);

const slotCap = (s: Session): number => s.current.abilities.skills.length;

/**
 * 貪心的學習迴圈。順序刻意是【先技能、再數值、最後特質】：
 *   沒有技能就打不出傷害（三格空著的隊伍連第一關都過不了）
 *   數值是所有技能的倍率，先抬它比多學一招划算
 *   特質是餘裕
 */
const spendGreedy = (bias: Attr) => (s: Session): void => {
  for (let guard = 0; guard < 400; guard += 1) {
    let acted = false;

    if (slotCap(s) < 3) {
      const pick = cheapestFirst(s.skillOffers().filter((o) => o.state === 'learnable'))[0];
      if (pick !== undefined && s.learnSkill(pick.def.skillId).ok) acted = true;
    }

    const ng = s.nextGrade(bias);
    if (!acted && ng !== null && s.expOf(bias) >= ng.cost) {
      if (s.learnAttr(bias, ng.at).ok) acted = true;
    }

    if (!acted) {
      const pick = cheapestFirst(s.traitOffers().filter((o) => o.state === 'learnable'))[0];
      if (pick !== undefined && s.learnTrait(pick.def.traitId).ok) acted = true;
    }

    if (!acted) {
      // 主維滿了就往其他維倒 —— 一個人不會讓經驗爛在手上。
      // 這一段是【度量整套經濟有沒有稀缺】的關鍵：若替身只買一維，
      // 「未花的經驗」會被高估，看起來像貨幣過剩其實是 AI 太笨。
      for (const a of [bias, ...ATTRS.filter((x) => x !== bias)]) {
        const cur = s.current.attributes.values[a];
        if (cur >= 100) continue;
        if (s.learnAttr(a, cur + 1).ok) { acted = true; break; }
      }
    }
    if (!acted) break;
  }
};

/** 好感最高的三位當指揮，各帶星階開放的【最後一招】（通常也是最強的那招）。 */
const loadoutOf = (s: Session): BattleLoadout => {
  const skills = s.current.abilities.skills.slice(0, 3);
  const ranked = s.eligibleCommanders().slice().sort(
    (a, b) => affinityOf(s, b) - affinityOf(s, a),
  );
  const commanders: CommanderSlot[] = [];
  for (const id of ranked) {
    if (commanders.length >= 3) break;
    const opts = s.commanderSkills(id);
    const pick = opts.at(-1);
    if (pick !== undefined) commanders.push({ notableId: id, skillId: pick });
  }
  return { skills, commanders };
};

const affinityOf = (s: Session, id: NotableId): number =>
  s.current.roster.members.find((m) => m.notableId === id)?.affinity ?? 0;

/**
 * 走還留的判斷 —— **這是替身玩家最重要的一段程式。**
 *
 * 舊版只看「軍勢還剩幾成」，那不是人在做的判斷：實測下來它會在
 * 「剩四成七、對面每回合打三成二」的時候按下再打一關，然後死掉。
 *
 * 人讀的是螢幕上那兩個數字：**我撐得住幾回合，對面要打幾回合。**
 *
 *   turnsToDie  = 軍勢 ／ 敵方每回合輸出
 *   turnsToKill = 敵方兵力 ／ 我每回合輸出
 *
 * `margin` 就是貪心閾值：1.1 是「算得剛剛好就上」，2.0 是「要有兩倍餘裕」。
 * **它是這一版策略組的主軸線** —— 兩端的點數差就是獎勵曲線該不該再陡的答案。
 */
const engageIf = (margin: number) => (s: Session): boolean => {
  const st = s.current.campaign;
  if (st === null || st.loadout === null) return false;
  const nx = s.nextStage();
  if (nx === null) return false;

  const power = s.hostPower();
  if (power <= 0) return false;              // 一招輸出都沒有 —— 上去也只是送死
  const turnsToKill = nx.enemyTroops / power;
  const turnsToDie = st.host.troops / Math.max(1, nx.enemyDamage);
  // 糧秣能多換幾回合 —— **只有帶了恢復招的人算得到**。
  // 舊版無條件把糧量算進來，於是純武系（糧秣一點都用不到）
  // 誤以為自己還能撐五回合，然後死在第五關。
  const healed = s.hostSustain() / Math.max(1, nx.enemyDamage);
  return (turnsToDie + healed) >= turnsToKill * margin;
};

const campaignOf = (bias: Attr, margin: number) => ({
  spend: spendGreedy(bias),
  chooseLoadout: loadoutOf,
  chooseEngage: engageIf(margin),
});

/**
 * 跑完一場戰役。配置 → 反覆（打一關 → 問走留）→ 收兵。
 * 三個腳本（模擬器、smoke、校準）共用它 —— 流程只有一份。
 */
export function playCampaign(s: Session, policy: AgentPolicy): number {
  policy.spend(s);
  s.configureCampaign(policy.chooseLoadout(s));
  let cleared = 0;
  for (let guard = 0; guard < 12; guard += 1) {
    if (!policy.chooseEngage(s)) break;
    const out = s.engage();
    if (out.defeated) return cleared;
    cleared += 1;
  }
  s.withdraw();
  return cleared;
}

// ── 策略組 ──────────────────────────────────────────

/** 專精單線：固定投該路線的主屬性格。這是「純養成」的參照點。 */
const lineFocused = (name: string, line: CareerLine): AgentPolicy => ({
  name,
  chooseSlot: (s) => focus(s, LINE_ATTR[line]),
  chooseOption: (s, offer) => expected(offer),
  ...campaignOf(LINE_ATTR[line], 1.5),
});

export const POLICIES: readonly AgentPolicy[] = [
  lineFocused('focus-martial', 'martial'),
  lineFocused('focus-civil', 'civil'),
  {
    /**
     * 追期望值：永遠投期望四維最高的那一格，不管是哪一維。
     *
     * 名士相乘之後「全員擠在統御格但我需要武」是真兩難。四維會被打散，
     * 而戰役裡四維都能打（D19），所以它量的是【均衡者的上限】：
     * 四類經驗齊全買得起絕階，但每一維都上不到專精者的高度。
     */
    name: 'greedy-gain',
    chooseSlot: (s) => bestSlot(s, (i) => s.previewTraining(i).expectedGain),
    chooseOption: (s, offer) => expected(offer),
    ...campaignOf('war', 1.5),
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
    ...campaignOf('war', 1.5),
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
    ...campaignOf('war', 1.5),
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
    ...campaignOf('war', 1.5),
  },
  {
    /**
     * 追人物事件旗標。量的是【人物事件真的碰得到嗎】——
     * 它們全都卡在好感門檻上，而好感又要靠同格養。
     */
    name: 'encounter-chaser',
    chooseSlot: (s) => bestSlot(s, (i) => {
      const pv = s.previewTraining(i);
      return (pv.hasEncounter ? 2000 : 0) + pv.notableCount * 100 + pv.expectedGain;
    }),
    chooseOption: (s, offer) => expected(offer),
    ...campaignOf('war', 1.5),
  },
  {
    // 平均分配四維：輪流投。四維上限與「攤平四類經驗」的代價由它量出來。
    name: 'balanced',
    chooseSlot: (s) => {
      const want = ATTRS[s.current.progress.turn % ATTRS.length];
      return want === undefined ? 0 : focus(s, want);
    },
    chooseOption: (s, offer) => expected(offer),
    ...campaignOf('war', 1.5),
  },
  {
    // 專精武，委託一律選最穩的 —— 功績少但幾乎不失敗。
    name: 'option-safe',
    chooseSlot: (s) => focus(s, LINE_ATTR.martial),
    chooseOption: (s, offer) => safest(offer),
    ...campaignOf('war', 1.5),
  },
  {
    // 專精武，委託一律選功績最高的 —— 常失敗，但失敗仍給四成。
    // 與 option-safe 的差額就是「賭委託」值不值得。
    name: 'option-greedy',
    chooseSlot: (s) => focus(s, LINE_ATTR.martial),
    chooseOption: (s, offer) => richest(offer),
    ...campaignOf('war', 1.5),
  },
  {
    name: 'risk-averse',
    chooseSlot: (s) => focus(s, LINE_ATTR.martial),
    chooseOption: (s, offer) => safest(offer),
    ...campaignOf('war', 2.4),
  },
  {
    name: 'risk-seeking',
    chooseSlot: (s) => focus(s, LINE_ATTR.martial),
    chooseOption: (s, offer) => richest(offer),
    ...campaignOf('war', 1.05),
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
    ...campaignOf('war', 2.4),
  },
];
