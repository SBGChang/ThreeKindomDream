// 局內不變量：回合座標、門檻貨幣、supersedes、結局兜底、可重播、結算冪等。
import {
  ATTRS, CHECK_CHOICES, SLOT_INDICES,
  type Attr, type CareerLine, type CheckChoice, type SlotIndex,
} from '../../src/contracts/core/primitives.js';
import { careerService } from '../../src/modules/career.js';
import { candidatesFor, failedByAttr } from '../../src/modules/ending.js';
import { notableCodex } from '../../src/modules/notable-codex.js';
import { statQuery } from '../../src/modules/stats.js';
import { baseOf, notableSlotBonus, trainingMultiplier } from '../../src/modules/roster-query.js';
import { progressOf, sequenceOf } from '../../src/modules/turn.js';
import { describe, eq, it, near, ok, throws } from '../lib/tinytest.js';
import type { Session } from '../../src/app/session.js';
import type { NotableId } from '../../src/contracts/core/ids.js';
import { designateQuota, emptyDraft } from '../../src/modules/dream-entry.js';
import { encounterPool, optionStates } from '../../src/modules/commission.js';
import { preview as trainingPreview } from '../../src/modules/training.js';
import { META, defs, newSession, wiring } from './harness.js';

// 大檢定改成【文武兩路線 × 三難度】（18 §2.2）。這些測試固定走武路 ——
// 它是灰盒四章裡三章的原生路線；換路線會連帶改變檢定值，
// 那是平衡問題，不該混進不變量測試。
const SAFE_MARTIAL: CheckChoice = { line: 'martial', difficulty: 'safe' };
const HARD_MARTIAL: CheckChoice = { line: 'martial', difficulty: 'hard' };

/**
 * 打完一個回合：投入固定事件，再清空它引出的事件佇列。
 *
 * 幾乎每個測試都要走這一步，而「兩拍」是新制的核心形狀 ——
 * 抽成一個 helper，測試裡才不會有十份各自寫一半的迴圈。
 */
const playTurn = (s: Session, slot: SlotIndex = 0, option = 0): void => {
  s.selectSlot(slot);
  let guard = 0;
  while (s.pendingEvent !== null) {
    guard += 1;
    if (guard > 8) throw new Error('事件佇列未收斂');
    const states = s.pendingEvent.optionStates;
    const idx = states[option]?.enabled === true
      ? option
      : states.findIndex((o: { enabled: boolean }) => o.enabled);
    s.resolveEvent(idx);
  }
};

const drive = (sd: number): string => {
  const s = newSession(sd);
  let guard = 0;
  while (!s.isOver && guard < 120) {
    guard += 1;
    if (s.needsFactionChoice) {
      const o = s.factionOptions().filter((x) => x.eligible)[0];
      if (o === undefined) { s.noFactionAvailable(); continue; }
      s.chooseFaction(o.factionId);
      continue;
    }
    if (s.needsSuperiors) { s.assignSuperiors([]); continue; }
    if (s.needsMajorCheck) { s.attemptMajor(SAFE_MARTIAL, s.eligibleSortie().slice(0, 3)); continue; }
    let best: SlotIndex = 0;
    let bg = -1;
    for (const i of SLOT_INDICES) {
      const g = s.previewTraining(i).expectedGain;
      if (g > bg) { bg = g; best = i; }
    }
    playTurn(s, best);
    s.advance();
  }
  return JSON.stringify(s.current);
};

export function run(): void {
  describe('turn · 回合座標（15 §1.1）', () => {
    const ctx = { state: newSession(3).current, defs };
    // 全部從內容推導，不寫死章節 ID —— 章節搬家（虎牢移入陣營包）時
    // 這些測試該繼續成立，因為它們釘的是推導規則不是內容。
    const preSeq = sequenceOf(null, ctx);
    const firstId = preSeq[0];
    if (firstId === undefined) throw new Error('無陣營序列為空');
    const firstLen = defs.reader('chapter').get(String(firstId)).length;

    it('章節由 turn 加章節表推導，不用固定除法', () => {
      eq(progressOf(1, null, 0, ctx).turnInChapter, 1);
      eq(String(progressOf(1, null, 0, ctx).chapterId), String(firstId));
      eq(progressOf(firstLen, null, 0, ctx).turnInChapter, firstLen);
    });

    it('章末標記 pendingMajorCheck', () => {
      ok(progressOf(firstLen, null, 0, ctx).pendingMajorCheck, '章末應標記');
      ok(!progressOf(firstLen - 1, null, 0, ctx).pendingMajorCheck, '章中不應標記');
    });

    it('序列切換：陣營序列從自己的第一章接續下去（15 §1.2）', () => {
      const f = defs.reader('faction').all()[0];
      if (f === undefined) return;
      const seq = sequenceOf(f.faction, ctx);
      const a = seq[0];
      const b = seq[1];
      if (a === undefined) throw new Error('陣營序列為空');
      // 通過一章之後入陣營：本地回合 1 落在陣營序列的第一章，
      // 但 chapter 序號要沿用（chaptersPassed + 1），不能歸 1。
      const p1 = progressOf(1, f.faction, 1, ctx);
      eq(String(p1.chapterId), String(a));
      eq(p1.chapter, 2);
      eq(p1.phase, 'faction');
      if (b === undefined) return;
      const len = defs.reader('chapter').get(String(a)).length;
      eq(String(progressOf(len + 1, f.faction, 1, ctx).chapterId), String(b));
    });
  });

  describe('opening · 開場與陣營時點（GDD §2.1、§4.1）', () => {
    it('無陣營的章節恰好一章，且它的 onPass 就是選陣營', () => {
      const ctx = { state: newSession(3).current, defs };
      const seq = sequenceOf(null, ctx);
      eq(seq.length, 1);
      const only = seq[0];
      if (only === undefined) throw new Error('無陣營序列為空');
      const ch = defs.reader('chapter').get(String(only));
      eq(ch.onPass, 'chooseFaction');
      eq(ch.factionId, null);
    });

    it('每個陣營序列的第一章都是自己包裡的內容（討董三家各寫一份）', () => {
      const ctx = { state: newSession(3).current, defs };
      for (const f of defs.reader('faction').all()) {
        const seq = sequenceOf(f.faction, ctx);
        const head = seq[0];
        if (head === undefined) throw new Error(`${String(f.faction)} 序列為空`);
        eq(defs.reader('chapter').get(String(head)).factionId, f.faction);
      }
    });

    it('選陣營不重設全域回合序號', () => {
      const s = newSession(4242);
      let guard = 0;
      while (!s.isOver && guard < 40 && !s.needsFactionChoice) {
        guard += 1;
        if (s.needsMajorCheck) {
          s.attemptMajor(SAFE_MARTIAL, s.eligibleSortie().slice(0, 3));
          continue;
        }
        playTurn(s);
        s.advance();
      }
      if (!s.needsFactionChoice) return;
      const before = s.current.progress.turn;
      const opt = s.factionOptions().filter((o) => o.eligible)[0];
      if (opt === undefined) return;
      s.chooseFaction(opt.factionId);
      // 舊版讓它歸 1，於是結算的 turnsPlayed 少算了整個前段。
      eq(s.current.progress.turn, before);
      ok(before >= 8, `入陣營時應已走過至少一章，實得 ${before}`);
    });

    it('預設不可自行指定玩伴；「世家門閥」系天賦買回選擇權（14 §3）', () => {
      const draft = emptyDraft(META, defs);
      eq(designateQuota(draft, defs), 0);

      const talents = defs.reader('talent').all()
        .filter((t2) => t2.effects.some((e) => e.funcType === 'DesignateSlots'));
      ok(talents.length > 0, '沒有任何天賦能買到指定權 —— 皇甫嵩的指派沒有出口');
      for (const t2 of talents) {
        const q = designateQuota({ ...draft, talents: [t2.talentId] }, defs);
        ok(q > 0, `${String(t2.talentId)} 沒有提高指定額度`);
        ok(q <= defs.single('gameRules').companionCount,
          `${String(t2.talentId)} 的額度 ${q} 超過玩伴席次`);
      }
    });
  });

  describe('stats · 四維歸線（20 §1.3）', () => {
    it('統武算武功，智政算文功', () => {
      const ctx = { state: newSession(11).current, defs };
      eq(statQuery.lineOf('lead', ctx), 'martial');
      eq(statQuery.lineOf('war', ctx), 'martial');
      eq(statQuery.lineOf('int', ctx), 'civil');
      eq(statQuery.lineOf('pol', ctx), 'civil');
      // 每一維都有歸屬 —— 漏一維就有固定事件的功績掉進虛空
      for (const a of ATTRS) ok(statQuery.lineOf(a, ctx) !== undefined, `${a} 未歸線`);
    });

  });

  describe('notableCodex · 星階累加不取代（10 §3）', () => {
    // 不綁特定名士 —— 找任何一位有多階解鎖條的，內容換人時測試不該跟著壞
    const layered = defs.reader('notable').all()
      .find((n) => new Set(n.unlocks.map((u) => u.star)).size > 1);
    const maxStar = notableCodex.maxStar(defs);
    const metaAt = (id: string, star: number): typeof META => ({
      ...META, notableCodex: { [id]: { star, fragments: 0 } },
    });

    it('內容裡至少有一位名士的解鎖條跨越多個星階', () => {
      ok(layered !== undefined, '每個人的解鎖條都擠在同一階 —— 星階就沒有階梯');
    });

    it('星階越高，解鎖條只增不減（累加不取代）', () => {
      if (layered === undefined) return;
      const id = String(layered.notableId);
      let prev = -1;
      for (let star = 0; star <= maxStar; star += 1) {
        const n = notableCodex.unlockedRows(layered.notableId, metaAt(id, star), defs).length;
        ok(n >= prev, `星 ${star} 的解鎖條 ${n} 少於星 ${star - 1} 的 ${prev}`);
        prev = n;
      }
      const full = notableCodex.unlockedRows(layered.notableId, metaAt(id, maxStar), defs);
      eq(full.length, layered.unlocks.length);
    });

    it('0 星就有一組能力 —— 不是空白起點', () => {
      for (const n of defs.reader('notable').all()) {
        const zero = notableCodex.unlockedRows(n.notableId, META, defs);
        ok(zero.length > 0, `${String(n.notableId)} 的 0 星是空的`);
      }
    });

    it('每位名士的解鎖條星階都在階梯範圍內', () => {
      for (const n of defs.reader('notable').all()) {
        for (const u of n.unlocks) {
          ok(u.star >= 0 && u.star <= maxStar,
            `${String(n.notableId)} 有一條掛在星 ${u.star}，階梯只到 ${maxStar}`);
        }
      }
    });
  });

  describe('ending · 兜底（25 §3.1）', () => {
    it('每個 trigger 都有候選', () => {
      const ctx = { state: newSession(5).current, defs };
      const triggers = [
        { kind: 'sequenceCompleted' as const },
        { kind: 'checkFailed' as const, attr: 'war' as const },
        { kind: 'checkFailed' as const, attr: 'lead' as const },
        { kind: 'noFactionEligible' as const },
      ];
      for (const trig of triggers) {
        ok(candidatesFor(trig, ctx).length > 0, `trigger ${trig.kind} 無候選`);
      }
    });
  });


  describe('turn · 一回合一個固定事件（15 §2）', () => {
    it('選了固定事件之後不能再選', () => {
      const s = newSession(4242);
      s.selectSlot(0);
      throws(() => { s.selectSlot(1); }, '固定事件選第二次應被擋下');
    });

    it('旗標為真的格子必定引出事件，為假的必定不引出（15 §3）', () => {
      // 兩段抽取的核心形狀：回合開始逐格擲「會不會有」，選定之後才抽內容。
      // 旗標【不能說謊】—— 兩個方向都要釘，只釘一邊會漏掉「亮了卻沒東西」。
      let sawFlagged = 0;
      let sawEmpty = 0;
      for (const sd of [1, 7, 4242, 909, 31337]) {
        for (const i of SLOT_INDICES) {
          const s = newSession(sd);
          const slot = s.current.turn.slots[i];
          if (slot === undefined) throw new Error('格子不存在');
          const flagged = slot.hasCommission || slot.hasEncounter;
          s.selectSlot(i);
          if (flagged) {
            sawFlagged += 1;
            ok(s.pendingEvent !== null, `seed ${sd} 格 ${i} 旗標為真卻沒有事件`);
            ok(!s.canAdvance(), '事件未處理不該可推進');
          } else {
            sawEmpty += 1;
            eq(s.pendingEvent, null);
            ok(s.canAdvance(), `seed ${sd} 格 ${i} 沒有旗標，應可直接推進`);
          }
        }
      }
      // 兩種情況都要真的出現過，否則上面那段等於沒測到
      ok(sawFlagged > 0, '沒有任何一格亮旗標 —— 機率或旗標流壞了');
      ok(sawEmpty > 0, '每一格都亮旗標 —— 委託又變回必定觸發了');
    });

    it('沒有旗標的回合：選完就結束，而且真的收得掉（15 §3.4）', () => {
      // 這一條釘的是【呈現層依賴的契約】。委託改成機率觸發之後，一個回合
      // 可能在「選完固定事件」那一刻就結束 —— 那條路徑完全不經過
      // 「選處理方式」那個進入點，而舊版只在那裡推進回合。
      //
      // 症狀：選完沒有推進，畫面看起來完全沒變（同一批格子、同一個回合數），
      // 下一次點擊撞上 assertActable 丟例外，整個凍住。連續兩次選到沒有
      // 旗標的格子就會遇到 —— 第一次沒反應，第二次才卡死。
      let covered = 0;
      for (const sd of [1, 7, 77, 909, 4242, 31337]) {
        const s = newSession(sd);
        const idx = SLOT_INDICES.find((i) => {
          const sl = s.current.turn.slots[i];
          return sl !== undefined && !sl.hasCommission && !sl.hasEncounter;
        });
        if (idx === undefined) continue;
        covered += 1;
        const before = s.current.progress.turn;
        s.selectSlot(idx);
        eq(s.pendingEvent, null);
        ok(s.canAdvance(), `seed ${sd}：沒有旗標的回合選完就該可以推進`);
        s.advance();
        eq(s.current.progress.turn, before + 1);
        ok(!s.hasActed, '推進之後不該還算已行動');
        // 下一回合必須真的能再選 —— 卡住的症狀就是這裡丟例外
        s.selectSlot(0);
      }
      ok(covered > 0, '沒有任何 seed 出現「四格皆無旗標」，這條測試沒測到東西');
    });

    it('人物事件的旗標只在可抽池非空時才會為真（15 §3.2）', () => {
      // 【旗標不能說謊】。開局好感 20，多數人物事件的門檻還沒到 ——
      // 若旗標仍會亮，玩家會為了那個驚嘆號放棄一格紅光，然後什麼都沒發生。
      for (const sd of [1, 7, 4242, 909, 31337]) {
        const s = newSession(sd);
        const pool = encounterPool(s.ctx);
        if (pool.length > 0) continue;
        for (const i of SLOT_INDICES) {
          ok(s.current.turn.slots[i]?.hasEncounter !== true,
            `seed ${sd} 格 ${i} 池是空的卻亮了人物事件旗標`);
        }
      }
    });

    it('未行動不可推進；事件清空後才可推進', () => {
      const s = newSession(77);
      ok(!s.canAdvance(), '未行動時不該可推進');
      throws(() => { s.advance(); }, '未行動就推進應被擋下');
      // 挑一個【旗標為真】的格子 —— 沒有旗標的格子選完就能直接推進，
      // 那是設計要的行為，拿它來測「事件擋住推進」會測不到東西。
      const idx = SLOT_INDICES.find((i) => s.current.turn.slots[i]?.hasCommission === true);
      if (idx === undefined) throw new Error('seed 77 四格都沒有委託旗標，換一個 seed');
      s.selectSlot(idx);
      ok(!s.canAdvance(), '還有待處理事件時不該可推進');
      throws(() => { s.advance(); }, '事件未處理就推進應被擋下');
      while (s.pendingEvent !== null) s.resolveEvent(0);
      ok(s.canAdvance(), '事件清空後應可推進');
    });

    it('推進到章末大檢定回合時，上一回合的行動不得殘留', () => {
      const s = newSession(4242);
      let guard = 0;
      while (!s.isOver && guard < 40 && !s.needsMajorCheck) {
        guard += 1;
        playTurn(s);
        s.advance();
      }
      ok(s.needsMajorCheck, '沒走到章末大檢定');
      // 章末不重抽格子，但「本回合已行動」必須是 false
      ok(!s.hasActed, '大檢定回合不該被視為已行動');
      eq(s.pendingEvent, null);
      ok(!s.canAdvance(), '大檢定回合不該可推進');
    });

    it('回合配比以維累加，總和等於已行動回合數', () => {
      const s = newSession(909);
      let acted = 0;
      for (let i = 0; i < 5 && !s.needsMajorCheck && !s.isOver; i += 1) {
        playTurn(s, (i % 4) as SlotIndex);
        acted += 1;
        s.advance();
      }
      eq(ATTRS.reduce((sum, a) => sum + s.current.actions[a], 0), acted);
    });

    it('固定事件的功績走該維對應的那一條線，且【卡面等於實際入帳】（16 §4.2）', () => {
      for (const i of SLOT_INDICES) {
        const s = newSession(4242);
        const pv = s.previewTraining(i);
        const attr = s.current.turn.slots[i]?.attr;
        if (attr === undefined) throw new Error('格子不存在');
        eq(pv.meritGain.line, statQuery.lineOf(attr, s.ctx));
        ok(pv.meritGain.amount > 0, '固定事件的功績不該為零');
        const before = s.current.currencies.merit[pv.meritGain.line];
        s.selectSlot(i);
        eq(s.current.currencies.merit[pv.meritGain.line] - before, pv.meritGain.amount);
      }
    });
  });

  describe('commission · 光階決定稀有度（17 §2.2）', () => {
    it('每一個可抽到的（維 × 稀有度）都有一則無門檻委託', () => {
      // 這是「執行期不可能抽到空池」的依據。載入期驗證也擋這一條，
      // 兩邊都釘是刻意的：它是新制唯一會在執行期爆的結構洞。
      const events = defs.reader('event').all();
      const reachable = new Set<string>();
      for (const g of defs.reader('glowTier').all()) {
        g.rarityWeights.forEach((wt, i) => {
          if (wt > 0) for (const a of ATTRS) reachable.add(`${a}/${i + 1}`);
        });
      }
      ok(reachable.size > 0, '沒有任何可抽的組合，光階表可能全零');
      for (const key of reachable) {
        const [attr, rarity] = key.split('/');
        const hit = events.filter((e) => e.trigger.kind === 'commission'
          && e.trigger.attr === attr && String(e.trigger.rarity) === rarity);
        ok(hit.length > 0, `桶 ${key} 完全沒有委託`);
        ok(hit.some((e) => e.requirements.length === 0), `桶 ${key} 沒有無門檻的保底委託`);
      }
    });

    it('光階越高，抽到的稀有度期望越高', () => {
      const order = ['none', 'silver', 'gold', 'red'] as const;
      const expect = order.map((tier) => {
        const g = defs.reader('glowTier').all().find((x) => x.tier === tier);
        const ws = g?.rarityWeights ?? [];
        const sum = ws.reduce((a, b) => a + b, 0);
        return ws.reduce((acc, wt, i) => acc + wt * (i + 1), 0) / Math.max(1, sum);
      });
      for (let i = 1; i < expect.length; i += 1) {
        const prev = expect[i - 1] ?? 0;
        const cur = expect[i] ?? 0;
        ok(cur > prev, `${order[i]} 的稀有度期望 ${cur.toFixed(2)} 不高於 ${order[i - 1]}`);
      }
    });
  });

  describe('commission · 三檔選項（17 §5）', () => {
    it('每則委託恰好三檔，且報酬隨檔次遞增', () => {
      const s2 = newSession(4242);
      for (const def of defs.reader('event').all()) {
        if (def.trigger.kind !== 'commission') continue;
        const id = String(def.eventDefId);
        eq(def.options.length, 3);
        eq(def.options.map((o) => o.tier), ['low', 'mid', 'high']);
        // 只有 high 可以有門檻 —— 低中兩檔永遠按得下去
        eq(def.options[0]?.requirements.length, 0);
        eq(def.options[1]?.requirements.length, 0);
        ok((def.options[2]?.requirements.length ?? 0) > 0, `${id} 的 high 檔沒有門檻`);
      }
      void s2;
    });

    it('三檔是一條【費力程度】的階梯：四項全部同向遞增', () => {
      // 善惡軸退場之後，三檔只差在【肯花多少力氣】。
      // 因此難度、功績、磨練、門檻四項都必須同向 ——
      // 任一項反向，那一檔就成了【更便宜又更好】的支配選項。
      const dcHead = new Map<string, number>();
      for (const cv of defs.reader('dcCurve').all()) {
        dcHead.set(String(cv.curveId), cv.byTier[0] ?? -1);
      }
      for (const def of defs.reader('event').all()) {
        if (def.trigger.kind !== 'commission') continue;
        const id = String(def.eventDefId);
        const merit = def.options.map(
          (opt) => opt.rewards.reduce((a, r) => a + (r.kind === 'merit' ? r.amount : 0), 0),
        );
        const weight = def.options.map(
          (opt) => opt.practice.reduce((a, pr) => a + pr.weight, 0),
        );
        const dc = def.options.map(
          (opt) => (opt.check === null ? -1 : dcHead.get(String(opt.check.dcCurveId)) ?? -1),
        );
        const reqs = def.options.map((opt) => opt.requirements.length);
        for (let i = 1; i < def.options.length; i += 1) {
          ok((merit[i] ?? 0) > (merit[i - 1] ?? 0), `${id} 功績未遞增`);
          ok((weight[i] ?? 0) > (weight[i - 1] ?? 0), `${id} 磨練未遞增`);
          ok((dc[i] ?? 0) > (dc[i - 1] ?? 0), `${id} 難度未遞增`);
          ok((reqs[i] ?? 0) >= (reqs[i - 1] ?? 0), `${id} 門檻反向`);
        }
      }
    });

    it('名士事件不是階梯，選項一律標 story', () => {
      let seen = 0;
      for (const def of defs.reader('event').all()) {
        if (def.trigger.kind === 'commission') continue;
        seen += 1;
        for (const opt of def.options) {
          eq(opt.tier, 'story');
        }
      }
      ok(seen > 0, '沒有任何非委託事件 —— 這條測試什麼都沒驗到');
    });

    it('預覽的功績隨檔次遞增（實跑一則）', () => {
      const s2 = newSession(4242);
      s2.selectSlot(0);
      const offer = s2.pendingEvent;
      if (offer === null) throw new Error('固定事件未引出委託');
      const merits = offer.optionStates.map(
        (o) => o.meritPreview.reduce((a, m) => a + m.amount, 0),
      );
      const a = merits[0] ?? 0;
      const b = merits[1] ?? 0;
      const cc = merits[2] ?? 0;
      ok(a < b && b < cc, `功績未遞增：${a} / ${b} / ${cc}`);
      eq(offer.optionStates.map((o) => o.tier), ['low', 'mid', 'high']);
    });

    it('高檔在官階不足時鎖住，但低中兩檔一定開著', () => {
      const s2 = newSession(4242);
      s2.selectSlot(0);
      const offer = s2.pendingEvent;
      if (offer === null) throw new Error('固定事件未引出委託');
      ok(offer.optionStates[0]?.enabled === true, 'low 檔必須可按');
      ok(offer.optionStates[1]?.enabled === true, 'mid 檔必須可按');
      // 開局官階 1，門檻是稀有度＋1 ≥ 2 → 必鎖
      eq(offer.optionStates[2]?.enabled, false);
    });
  });

  describe('commission · 難度依官階線而非章節（17 §4）', () => {
    it('同一則委託：該線官階越低，DC 越低', () => {
      const s2 = newSession(4242);
      const base = s2.current;
      const rate = (civil: number): number => {
        const ctx = { state: { ...base, career: { civil, martial: 1 } }, defs };
        // 找一則文線（智／政）的委託，量它 low 檔的成功率
        const def = defs.reader('event').all().find(
          (e) => e.trigger.kind === 'commission' && e.trigger.attr === 'pol'
            && e.trigger.rarity === 1,
        );
        if (def === undefined) throw new Error('找不到政的 ★1 委託');
        const states = optionStates(def, 1, ctx, wiring.fx);
        return states[0]?.successRate ?? -1;
      };
      // 四維固定不動，只動官階：低官階應更容易。
      // 這正是「後期轉練文政卻永遠 0%」的修法 —— 難度跟著你在那條線的身分走。
      const low = rate(1);
      const high = rate(8);
      ok(low > high, `文官 1 階的成功率 ${low} 應高於 8 階的 ${high}`);
    });

    it('官階抬 base：另一線也算一半，換路不必從新兵重來（16 §4.3）', () => {
      const s2 = newSession(4242);
      const base = s2.current;
      const gain = (civil: number, martial: number, attr: 'pol' | 'war'): number => {
        const ctx = { state: { ...base, career: { civil, martial } }, defs };
        const idx = SLOT_INDICES.find((i) => base.turn.slots[i]?.attr === attr);
        if (idx === undefined) throw new Error(`找不到 ${attr} 的格子`);
        return trainingPreview(idx, ctx, wiring.fx).expectedGain;
      };
      // 武官 8 階、文官 1 階時，改練政的產出【不該】掉回武官 1 階的水準
      const polAsVeteran = gain(1, 8, 'pol');
      const polAsRookie = gain(1, 1, 'pol');
      ok(polAsVeteran > polAsRookie,
        `武官八階改練政 ${polAsVeteran} 應高於新兵 ${polAsRookie}`);
      // 但本行仍然更快 —— 否則專精就沒有意義。
      // 【比同一格】：不同格子的光階與站位都不一樣，跨格比較量到的是別的東西。
      const polOwnLine = gain(8, 1, 'pol');
      ok(polOwnLine > polAsVeteran,
        `文官八階練政 ${polOwnLine} 應高於武官八階改練政 ${polAsVeteran}`);
      // 落差不該大到「換路等於重開」：跨行至少要有本行的六成
      ok(polAsVeteran / polOwnLine > 0.6,
        `跨行只有本行的 ${(polAsVeteran / polOwnLine).toFixed(2)} 倍，轉換道路太難`);
    });
  });

  describe('event · 事上磨練（17 §6.2）', () => {
    it('每個事件選項都宣告了 practice', () => {
      for (const def of defs.reader('event').all()) {
        for (const [i, opt] of def.options.entries()) {
          ok(opt.practice.length > 0, `${String(def.eventDefId)} 選項 ${i} 沒有 practice`);
        }
      }
    });

    it('預覽的磨練值與實際入帳一致', () => {
      const s = newSession(4242);
      s.selectSlot(0);
      const offer = s.pendingEvent;
      if (offer === null) throw new Error('固定事件未引出委託');
      const preview = offer.optionStates[0]?.practicePreview ?? [];
      ok(preview.length > 0, '預覽的磨練值不該為空');
      const before = { ...s.current.attributes.values };
      s.resolveEvent(0);
      const res = s.current.turn.resolved.at(-1);
      if (res === undefined) throw new Error('沒有結算紀錄');
      for (const g of res.practiceGained) {
        const delta = s.current.attributes.values[g.attr] - before[g.attr];
        ok(delta >= g.amount, `${g.attr} 實際入帳 ${delta} 小於回報的 ${g.amount}`);
      }
      if (res.passed) eq(res.practiceGained, preview);
      // failRatio > 0：一回合只有這一次機會，失敗也不該顆粒無收
      ok(res.practiceGained.length > 0, '無論成敗都該有磨練產出');
    });

    it('委託的四維產出小於固定事件 —— 玩家的選擇才是主力（GDD §4.2）', () => {
      const s = newSession(4242);
      const trBest = SLOT_INDICES.reduce<number>(
        (m, i) => Math.max(m, s.previewTraining(i).expectedGain), 0,
      );
      s.selectSlot(0);
      const offer = s.pendingEvent;
      if (offer === null) return;
      const evBest = offer.optionStates
        .flatMap((o) => o.practicePreview).reduce((a, g) => Math.max(a, g.amount), 0);
      ok(evBest < trBest, `委託磨練 ${evBest} 應小於固定事件期望 ${trBest}`);
    });

    it('委託的功績大於固定事件 —— 它才是主要來源', () => {
      const s = newSession(4242);
      const trMerit = s.previewTraining(0).meritGain.amount;
      s.selectSlot(0);
      const offer = s.pendingEvent;
      if (offer === null) return;
      const evMerit = offer.optionStates
        .flatMap((o) => o.meritPreview).reduce((a, m) => Math.max(a, m.amount), 0);
      ok(evMerit > trMerit, `委託功績 ${evMerit} 應大於固定事件的 ${trMerit}`);
    });
  });


  describe('roster · 幼年抽到的成年不會再抽到（19 §3.1）', () => {
    it('一輪之內沒有任何名士出現兩次', () => {
      for (const sd of [11, 202, 3003, 40404]) {
        const s = newSession(sd);
        let guard = 0;
        while (!s.isOver && guard < 60 && !s.needsSuperiors) {
          guard += 1;
          if (s.needsFactionChoice) {
            const o = s.factionOptions().filter((x) => x.eligible)[0];
            if (o === undefined) { s.noFactionAvailable(); break; }
            s.chooseFaction(o.factionId);
            continue;
          }
          if (s.needsMajorCheck) { s.attemptMajor(SAFE_MARTIAL, s.eligibleSortie().slice(0, 3)); continue; }
          playTurn(s, 0 as SlotIndex);
          s.advance();
        }
        if (!s.needsSuperiors) continue;
        const before = s.current.roster.members.map((m) => String(m.notableId));
        s.assignSuperiors(s.superiorCandidates().slice(0, s.bondQuota()));
        const after = s.current.roster.members.map((m) => String(m.notableId));
        eq(after.length, new Set(after).size, `seed ${sd} 陣容有重複成員：`);
        // 玩伴必須全數留在陣容中，而且上司不得是他們任何一位
        for (const id of before) ok(after.includes(id), `seed ${sd} 玩伴 ${id} 消失了`);
      }
    });

    it('上司候選名單已排除現有陣容', () => {
      const s = newSession(11);
      let guard = 0;
      while (!s.isOver && guard < 60 && !s.needsSuperiors) {
        guard += 1;
        if (s.needsFactionChoice) {
          const o = s.factionOptions().filter((x) => x.eligible)[0];
          if (o === undefined) { s.noFactionAvailable(); break; }
          s.chooseFaction(o.factionId);
          continue;
        }
        if (s.needsMajorCheck) { s.attemptMajor(SAFE_MARTIAL, s.eligibleSortie().slice(0, 3)); continue; }
        playTurn(s, 0 as SlotIndex);
        s.advance();
      }
      if (!s.needsSuperiors) return;
      const inRoster = new Set(s.current.roster.members.map((m) => String(m.notableId)));
      for (const cand of s.superiorCandidates()) {
        ok(!inRoster.has(String(cand)), `候選 ${String(cand)} 已在陣容中`);
      }
    });
  });

  describe('roster · 站位效果要好感 60（19 §5.1）', () => {
    const stageMin = (stage: string): number => {
      const row = defs.reader('affinityStage').all().find((x) => x.stage === stage);
      if (row === undefined) throw new Error(`階段不存在: ${stage}`);
      return row.min;
    };
    const gate = stageMin(defs.single('linkBonus').linkStage);

    /** 把某位名士的好感改成指定值之後，再問他的站位加成。 */
    const bonusAt = (
      s: Session, id: NotableId, attr: Attr, affinity: number, star: number,
    ): number => {
      const state = {
        ...s.current,
        metaSnapshot: {
          ...s.current.metaSnapshot,
          notableCodex: { [String(id)]: { star, fragments: 0 } },
        },
        roster: {
          members: s.current.roster.members.map((x) => (
            x.notableId === id ? { ...x, affinity } : x)),
        },
      };
      return notableSlotBonus(id, attr, [id], { state, defs }, wiring.fx);
    };

    it('好感未達門檻時，站位加成恰為零', () => {
      const s = newSession(4242);
      const m = s.current.roster.members[0];
      if (m === undefined) throw new Error('陣容為空');
      const attr = baseOf(m.notableId, s.ctx).specialty;
      const maxStar = notableCodex.maxStar(defs);
      // 滿星也一樣 —— 星買到的是能力，好感決定它開不開（兩件事）
      eq(bonusAt(s, m.notableId, attr, gate - 1, maxStar), 0);
      eq(bonusAt(s, m.notableId, attr, 0, maxStar), 0);
    });

    it('跨過門檻的那一刻，全部一起打開', () => {
      const s = newSession(4242);
      const m = s.current.roster.members[0];
      if (m === undefined) throw new Error('陣容為空');
      const attr = baseOf(m.notableId, s.ctx).specialty;
      const below = bonusAt(s, m.notableId, attr, gate - 1, 0);
      const above = bonusAt(s, m.notableId, attr, gate, 0);
      eq(below, 0);
      ok(above > 0, `好感 ${gate} 時站位加成仍為 0 —— 0 星那條通用加成沒有掛上`);
    });

    it('門檻之上不再隨好感浮動 —— 它是開關不是倍率', () => {
      const s = newSession(4242);
      const m = s.current.roster.members[0];
      if (m === undefined) throw new Error('陣容為空');
      const attr = baseOf(m.notableId, s.ctx).specialty;
      eq(bonusAt(s, m.notableId, attr, gate, 0), bonusAt(s, m.notableId, attr, 100, 0));
    });

    it('升星提高連動（好感已達門檻的前提下）', () => {
      const s = newSession(4242);
      const m = s.current.roster.members[0];
      if (m === undefined) throw new Error('陣容為空');
      const attr = baseOf(m.notableId, s.ctx).specialty;
      const maxStar = notableCodex.maxStar(defs);
      const low = bonusAt(s, m.notableId, attr, 100, 0);
      const high = bonusAt(s, m.notableId, attr, 100, maxStar);
      ok(high > low, `滿星 ${high.toFixed(3)} 未高於未升星 ${low.toFixed(3)}`);
    });

    it('升星階梯的成本隨稀有度變貴 —— 低星滿級才可能贏過高星低級', () => {
      const ladder = defs.single('notableStar');
      const cost = (rarity: 1 | 2 | 3 | 4 | 5): number =>
        ladder.tiers.reduce((sum, t2) => sum + t2.fragmentCost * ladder.costByRarity[rarity], 0);
      ok(cost(1) < cost(5), '★1 滿星應比 ★5 滿星便宜');
      ok(cost(5) > cost(1) * 2, '差距太小，稀有度就沒有取捨');
    });
  });

  describe('roster · 站位相乘（19 §5.2）', () => {
    // 這一段的每個測試都要【好感已達門檻】—— 站位效果本來就只在那之後存在。
    const linked = (): { state: typeof base.state; defs: typeof defs } => {
      const s = newSession(7);
      const cap = defs.reader('affinityStage').all().reduce((m, x) => Math.max(m, x.max), 0);
      return {
        state: {
          ...s.current,
          roster: { members: s.current.roster.members.map((m) => ({ ...m, affinity: cap })) },
        },
        defs,
      };
    };
    const base = { state: newSession(7).current, defs };
    const ctx = linked();
    const fx = wiring.fx;
    /** 把不在陣容裡的名士也塞進來 —— 這一段測的是公式，不是抽人。 */
    const withAll = (ids: readonly NotableId[]): typeof ctx => {
      const cap = defs.reader('affinityStage').all().reduce((m, x) => Math.max(m, x.max), 0);
      return {
        state: {
          ...ctx.state,
          roster: {
            members: ids.map((id) => ({
              notableId: id, affinity: cap, origin: 'companion' as const,
            })),
          },
        },
        defs,
      };
    };

    it('每位名士的結構欄位都合法', () => {
      for (const n of defs.reader('notable').all()) {
        ok(n.base.specialtyWeight >= 1, `${String(n.notableId)} 專長權重 < 1`);
        ok(ATTRS.includes(n.base.specialty), `${String(n.notableId)} 專長維非法`);
      }
    });

    it('每位名士都有一條 0 星的通用同框加成 —— 站上格子必須有意義', () => {
      for (const n of defs.reader('notable').all()) {
        const c = withAll([n.notableId]);
        const fit = notableSlotBonus(n.notableId, n.base.specialty, [n.notableId], c, fx);
        ok(fit > 0, `${String(n.notableId)} 好感滿了站上專長格仍然沒有加成`);
      }
    });

    it('同一位名士站在專長格上，加成不低於非專長格', () => {
      for (const n of defs.reader('notable').all()) {
        const off = ATTRS.find((a2) => a2 !== n.base.specialty) ?? 'war';
        const c = withAll([n.notableId]);
        const fit = notableSlotBonus(n.notableId, n.base.specialty, [n.notableId], c, fx);
        const unfit = notableSlotBonus(n.notableId, off, [n.notableId], c, fx);
        ok(fit >= unfit, `${String(n.notableId)} 對位 ${fit} 低於非對位 ${unfit}`);
      }
    });

    it('空格倍率恰為 1，名士之間【相乘】（19 §5.2）', () => {
      eq(trainingMultiplier([], 'war', ctx, fx), 1);
      const wars = defs.reader('notable').all().filter((n) => n.base.specialty === 'war');
      const a2 = wars[0];
      const b2 = wars[1];
      ok(a2 !== undefined && b2 !== undefined, '缺兩位武專長名士');
      if (a2 === undefined || b2 === undefined) return;
      const pair = [a2.notableId, b2.notableId];
      const c = withAll(pair);
      const lb = defs.single('linkBonus');
      const pile1 = lb.pileMultiplier[1] ?? 1;
      const pile2 = lb.pileMultiplier[2] ?? 1;
      const one = trainingMultiplier([a2.notableId], 'war', c, fx);
      const two = trainingMultiplier(pair, 'war', c, fx);
      const aBonus = notableSlotBonus(a2.notableId, 'war', pair, c, fx);
      const bBonus = notableSlotBonus(b2.notableId, 'war', pair, c, fx);
      near(two, (1 + aBonus) * (1 + bBonus) * pile2, 1e-9, '兩人同格應為相乘：');
      // 相乘（再乘人數倍率）必須嚴格大於相加，否則爆發感不存在
      ok(two > one / pile1 + bBonus, `兩人同格 ${two} 未超過相加`);
    });

    it('同格人數倍率單調不減，且 0/1 人不給加成', () => {
      const lb = defs.single('linkBonus');
      eq(lb.pileMultiplier[0], 1);
      eq(lb.pileMultiplier[1], 1);
      ok(lb.pileMultiplier.length > lb.maxPerSlot,
        `pileMultiplier 長度 ${lb.pileMultiplier.length} 蓋不住 maxPerSlot ${lb.maxPerSlot}`);
      for (let i = 1; i < lb.pileMultiplier.length; i += 1) {
        const prev = lb.pileMultiplier[i - 1] ?? 1;
        const cur = lb.pileMultiplier[i] ?? 1;
        ok(cur >= prev, `人數 ${i} 的倍率 ${cur} 低於 ${i - 1} 人的 ${prev}`);
      }
      ok((lb.pileMultiplier[lb.maxPerSlot] ?? 1) >= 2,
        '全員同格的人數倍率 < 2，談不上爆發');
    });

    it('全員同格必須做得到，且倍率被 maxSlotMultiplier 夾住', () => {
      const rules = defs.single('gameRules');
      const lb = defs.single('linkBonus');
      const roster = rules.companionCount + rules.superiorCount;
      ok(lb.maxPerSlot >= roster,
        `maxPerSlot ${lb.maxPerSlot} < 陣容 ${roster} —— 全員同格根本不可能發生`);

      const all = defs.reader('notable').all().slice(0, roster).map((n) => n.notableId);
      const piled = trainingMultiplier(all, 'war', withAll(all), fx);
      ok(piled > 1.4, `全員同格只有 ×${piled.toFixed(2)}，談不上爆發`);
      ok(piled <= lb.maxSlotMultiplier + 1e-9, `倍率 ${piled} 超出上限 ${lb.maxSlotMultiplier}`);
    });

    it('四維各有至少一位名士以它為專長', () => {
      const owned = new Set(defs.reader('notable').all().map((n) => n.base.specialty));
      for (const a of ATTRS) ok(owned.has(a), `沒有名士以 ${a} 為專長`);
    });
  });

  describe('check · 文武兩路線 × 三難度（18 §2.2）', () => {
    /** 推進到第一場大檢定。avoid 那一維不練 —— 用來造一個確定失敗的局。 */
    const toFirstCheck = (sd: number, avoid: Attr | null) => {
      const s = newSession(sd);
      let guard = 0;
      while (!s.isOver && guard < 30 && !s.needsMajorCheck) {
        guard += 1;
        const idx = avoid === null
          ? 0
          : SLOT_INDICES.find((i) => s.current.turn.slots[i]?.attr !== avoid) ?? 0;
        playTurn(s, idx as SlotIndex);
        s.advance();
      }
      ok(s.needsMajorCheck, `seed ${sd} 未走到章末`);
      return s;
    };

    it('每場大檢定都有六個選項，且兩路線的主屬性不同', () => {
      eq(CHECK_CHOICES.length, 6);
      for (const def of defs.reader('majorCheck').all()) {
        const id = String(def.checkId);
        // 主屬性相同的兩條路線，六個選項其實只是三個選項的兩種記帳方式
        ok(def.routes.civil.primaryAttr !== def.routes.martial.primaryAttr,
          `${id} 兩路線主屬性相同`);
        for (const c of CHECK_CHOICES) {
          ok(def.routes[c.line].tiers[c.difficulty].dc > 0,
            `${id} 缺 ${c.line}/${c.difficulty}`);
        }
      }
    });

    it('第一場大檢定的六個選項全部可用（尚未有門檻）', () => {
      eq(toFirstCheck(4242, null).availableChoices().length, 6);
    });

    it('官階加值只算所走的那一條線', () => {
      const s = newSession(1234);
      let guard = 0;
      // 走到入朝之後，文武兩線的階級才有機會不同
      while (!s.isOver && guard < 60 && s.current.faction === null) {
        guard += 1;
        if (s.needsFactionChoice) {
          const o = s.factionOptions().filter((x) => x.eligible)[0];
          if (o === undefined) { s.noFactionAvailable(); break; }
          s.chooseFaction(o.factionId);
          continue;
        }
        if (s.needsMajorCheck) {
          s.attemptMajor(SAFE_MARTIAL, s.eligibleSortie().slice(0, 3));
          continue;
        }
        playTurn(s, 0 as SlotIndex);
        s.advance();
      }
      if (s.current.faction === null) return;
      const ctx = s.ctx;
      const civil = careerService.rankOf('civil', ctx);
      const martial = careerService.rankOf('martial', ctx);
      eq(careerService.checkBonus('civil', ctx), civil.checkBonus);
      eq(careerService.checkBonus('martial', ctx), martial.checkBonus);
      // 舊版是兩線相加。若退回去，下面這條會抗議：
      // 相加會讓「走文路還是武路」對加值毫無影響。
      if (civil.checkBonus !== martial.checkBonus) {
        ok(careerService.checkBonus('civil', ctx) !== careerService.checkBonus('martial', ctx),
          '兩條線的官階加值不應相同');
      }
    });

    it('失敗的結局由所走路線的主屬性決定', () => {
      // 【為什麼不強制 0%】：新制每個回合都會結算一則委託，而委託的事上磨練
      // 會散到其他維。因此「不練那一維」已經不足以把檢定值壓到 0 ——
      // 改成掃幾個 seed、只檢查【真的失敗的那些】，斷言不會因平衡調整而假綠。
      const seen = new Map<CareerLine, Set<string>>();
      let failures = 0;

      for (const line of ['martial', 'civil'] as const) {
        for (const sd of [4242, 77, 909, 1234, 31337]) {
          const probe = toFirstCheck(sd, null);
          const primary = probe.majorCheck().routes[line].primaryAttr;
          const run = toFirstCheck(sd, primary);
          const choice: CheckChoice = { line, difficulty: 'hard' };
          const before = run.ctx;
          const expected = candidatesFor(failedByAttr(primary), before)[0];
          const passed = run.attemptMajor(choice, []);

          eq(run.current.lastMajorCheck?.line, line);
          if (passed) continue;
          failures += 1;
          // 不寫死結局 ID —— 那是內容。測試釘的是接線：路線 → 主屬性 → 結局。
          eq(String(run.current.ending?.endingId), String(expected?.ending));
          const bucket = seen.get(line) ?? new Set<string>();
          bucket.add(String(run.current.ending?.endingId));
          seen.set(line, bucket);
        }
      }

      ok(failures > 0, '沒有任何一次失敗 —— 這個測試什麼都沒驗到');
      const m = [...(seen.get('martial') ?? [])];
      const cv = [...(seen.get('civil') ?? [])];
      if (m.length > 0 && cv.length > 0) {
        ok(m.every((x) => !cv.includes(x)),
          `兩條路線失敗後導向了同一個結局：武 ${m.join(',')} / 文 ${cv.join(',')}`);
      }
    });
  });


  describe('replay · 可重播（03 §6 不變量 4）', () => {
    it('同 seed 同指令序列產生逐欄位相同的狀態', () => {
      eq(drive(20250821), drive(20250821));
    });
    it('不同 seed 產生不同結果', () => {
      ok(drive(1) !== drive(2), '不同 seed 應產生不同結果');
    });
  });

  describe('settlement · 冪等（26 §5.1）', () => {
    it('同一 seed 重複結算不重複發放', () => {
      const s = newSession(777);
      let guard = 0;
      while (!s.isOver && guard < 120) {
        guard += 1;
        if (s.needsFactionChoice) { s.noFactionAvailable(); continue; }
        if (s.needsSuperiors) { s.assignSuperiors([]); continue; }
        if (s.needsMajorCheck) { s.attemptMajor(HARD_MARTIAL, []); continue; }
        playTurn(s, 0 as SlotIndex);
        s.advance();
      }
      const first = s.settle(META);
      ok(first.pointsGained > 0, '第一次應有產出');
      const second = s.settle(first.meta);
      eq(second.pointsGained, 0);
      eq(second.meta.points, first.meta.points);
    });
  });
}
