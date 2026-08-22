// 局內不變量：回合座標、門檻貨幣、supersedes、結局兜底、可重播、結算冪等。
import { ATTRS, SLOT_INDICES, type SlotIndex } from '../../src/contracts/core/primitives.js';
import { candidatesFor } from '../../src/modules/ending.js';
import { notableCodex } from '../../src/modules/notable-codex.js';
import { statQuery } from '../../src/modules/stats.js';
import { notableSlotBonus, trainingMultiplier } from '../../src/modules/roster-query.js';
import { progressOf } from '../../src/modules/turn.js';
import { describe, eq, it, near, ok, throws } from '../lib/tinytest.js';
import { META, defs, newSession } from './harness.js';

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
    if (s.needsMajorCheck) { s.attemptMajor('safe', s.eligibleSortie().slice(0, 3)); continue; }
    let best: SlotIndex = 0;
    let bg = -1;
    for (const i of SLOT_INDICES) {
      const g = s.previewTraining(i).expectedGain;
      if (g > bg) { bg = g; best = i; }
    }
    s.selectTraining(best);
    s.advance();
  }
  return JSON.stringify(s.current);
};

export function run(): void {
  describe('turn · 回合座標（15 §1.1）', () => {
    const ctx = { state: newSession(3).current, defs };
    it('章節由 turn 加章節表推導，不用固定除法', () => {
      eq(progressOf(1, null, 0, ctx).turnInChapter, 1);
      eq(progressOf(8, null, 0, ctx).turnInChapter, 8);
      eq(progressOf(9, null, 0, ctx).turnInChapter, 1);
      eq(String(progressOf(9, null, 0, ctx).chapterId), 'ch:nanhua.hulao');
    });
    it('章末標記 pendingMajorCheck', () => {
      ok(progressOf(8, null, 0, ctx).pendingMajorCheck, 'R8 應為章末');
      ok(!progressOf(7, null, 0, ctx).pendingMajorCheck, 'R7 不應為章末');
    });
  });

  describe('stats · 總名聲（20 §1.2）', () => {
    it('totalFame 為文名加武名，不含 moral', () => {
      const st = newSession(11).current;
      const ctx = {
        state: {
          ...st,
          currencies: {
            fame: { civil: 10, martial: 20, moral: -50 },
            merit: { civil: 0, martial: 0 },
          },
        },
        defs,
      };
      eq(statQuery.totalFame(ctx), 30);
    });
  });

  describe('notableCodex · supersedes（10 §3）', () => {
    // 不綁特定名士 —— 找任何一位有 supersedes 的，內容換人時測試不該跟著壞
    const withSupersede = defs.reader('notable').all()
      .find((n) => n.unlocks.some((u) => u.supersedes.length > 0));

    it('內容裡至少有一位名士用到 supersedes', () => {
      ok(withSupersede !== undefined, '沒有任何解鎖條使用 supersedes，這條機制成了死程式');
    });

    it('高階解鎖條取代低階', () => {
      if (withSupersede === undefined) return;
      const top = Math.max(...withSupersede.unlocks.map((u) => u.affinity));
      const superseded = new Set(withSupersede.unlocks.flatMap((u) => u.supersedes));
      const expected = withSupersede.unlocks
        .map((u) => u.affinity).filter((a) => !superseded.has(a)).sort((a, b) => a - b);
      const high = {
        ...META,
        notableCodex: { [String(withSupersede.notableId)]: { startAffinity: top, fragments: 0 } },
      };
      const affs = notableCodex.unlockedRows(withSupersede.notableId, high, defs)
        .map((r) => r.affinity).sort((a, b) => a - b);
      eq(affs, expected);
      ok(affs.length < withSupersede.unlocks.length, 'supersedes 沒有真的拿掉任何一條');
    });

    it('未達門檻不解鎖', () => {
      if (withSupersede === undefined) return;
      eq(notableCodex.unlockedRows(withSupersede.notableId, META, defs).length, 0);
    });
  });

  describe('ending · 兜底（25 §3.1）', () => {
    it('每個 trigger 都有候選', () => {
      const ctx = { state: newSession(5).current, defs };
      const triggers = [
        { kind: 'sequenceCompleted' as const },
        { kind: 'checkFailed' as const, attr: 'war' as const },
        { kind: 'checkFailed' as const, attr: 'cha' as const },
        { kind: 'noFactionEligible' as const },
      ];
      for (const trig of triggers) {
        ok(candidatesFor(trig, ctx).length > 0, `trigger ${trig.kind} 無候選`);
      }
    });
  });


  describe('turn · 一回合一個動作（15 §2）', () => {
    it('選了鍛鍊之後，事件與鍛鍊都不能再選', () => {
      const s = newSession(4242);
      s.selectTraining(0);
      throws(() => { s.selectTraining(1); }, '鍛鍊選第二次應被擋下');
      const offers = s.current.slots.event.offers;
      if (offers.length > 0) {
        throws(() => { s.selectEvent(0, 0); }, '鍛鍊之後還能做事件，互斥就沒生效');
      }
    });

    it('選了事件之後，鍛鍊不能再選', () => {
      // 找一個開局就有事件的 seed
      let s = newSession(1);
      for (let sd = 1; sd < 40 && s.current.slots.event.offers.length === 0; sd += 1) {
        s = newSession(sd);
      }
      ok(s.current.slots.event.offers.length > 0, '找不到開局就有事件的 seed');
      s.selectEvent(0, 0);
      throws(() => { s.selectTraining(0); }, '事件之後還能鍛鍊，互斥就沒生效');
      throws(() => { s.selectEvent(0, 0); }, '事件選第二次應被擋下');
    });

    it('未行動不可推進，行動後即可推進', () => {
      const s = newSession(77);
      ok(!s.canAdvance(), '未行動時不該可推進');
      throws(() => { s.advance(); }, '未行動就推進應被擋下');
      s.selectTraining(0);
      ok(s.canAdvance(), '行動後應可推進');
    });

    it('推進到章末大檢定回合時，上一回合的行動不得殘留', () => {
      const s = newSession(4242);
      let guard = 0;
      while (!s.isOver && guard < 40 && !s.needsMajorCheck) {
        guard += 1;
        s.selectTraining(0);
        s.advance();
      }
      ok(s.needsMajorCheck, '沒走到章末大檢定');
      // 章末不重抽槽位，但「本回合已行動」必須是 false ——
      // 否則 canAdvance 會在一個還沒行動的回合裡說可以推進
      eq(s.action, null);
      ok(!s.canAdvance(), '大檢定回合不該被視為已行動');
    });

    it('行動配比逐回合累加，總和等於已行動回合數', () => {
      const s = newSession(909);
      let acted = 0;
      for (let i = 0; i < 5 && !s.needsMajorCheck && !s.isOver; i += 1) {
        if (s.current.slots.event.offers.length > 0 && i % 2 === 0) s.selectEvent(0, 0);
        else s.selectTraining(0);
        acted += 1;
        s.advance();
      }
      eq(s.current.actions.training + s.current.actions.event, acted);
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
      let s = newSession(1);
      for (let sd = 1; sd < 40 && s.current.slots.event.offers.length === 0; sd += 1) {
        s = newSession(sd);
      }
      const offer = s.current.slots.event.offers[0];
      ok(offer !== undefined, '找不到事件');
      const preview = offer?.optionStates[0]?.practicePreview ?? [];
      ok(preview.length > 0, '預覽的磨練值不該為空');
      const before = { ...s.current.attributes.values };
      const out = s.selectEvent(0, 0);
      // 成功時應等於預覽；失敗時是 failRatio 折後的值，但必須 > 0（下限存在）
      for (const g of out.practiceGained) {
        const delta = s.current.attributes.values[g.attr] - before[g.attr];
        ok(delta >= g.amount, `${g.attr} 實際入帳 ${delta} 小於回報的 ${g.amount}`);
      }
      if (out.passed) eq(out.practiceGained, preview);
      ok(out.practiceGained.length > 0, '無論成敗都該有磨練產出（failRatio > 0）');
    });

    it('事件的四維產出明顯小於鍛鍊 —— 上課才是主力（GDD §4.2）', () => {
      let s = newSession(1);
      for (let sd = 1; sd < 40 && s.current.slots.event.offers.length === 0; sd += 1) {
        s = newSession(sd);
      }
      const evTotal = (s.current.slots.event.offers[0]?.optionStates ?? [])
        .flatMap((o) => o.practicePreview).reduce((a, g) => Math.max(a, g.amount), 0);
      let trTotal = 0;
      for (const i of SLOT_INDICES) {
        trTotal = Math.max(trTotal, s.previewTraining(i).expectedGain);
      }
      ok(evTotal < trTotal, `事件磨練 ${evTotal} 應小於鍛鍊期望 ${trTotal}`);
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
          if (s.needsMajorCheck) { s.attemptMajor('safe', s.eligibleSortie().slice(0, 3)); continue; }
          s.selectTraining(0);
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
        if (s.needsMajorCheck) { s.attemptMajor('safe', s.eligibleSortie().slice(0, 3)); continue; }
        s.selectTraining(0);
        s.advance();
      }
      if (!s.needsSuperiors) return;
      const inRoster = new Set(s.current.roster.members.map((m) => String(m.notableId)));
      for (const cand of s.superiorCandidates()) {
        ok(!inRoster.has(String(cand)), `候選 ${String(cand)} 已在陣容中`);
      }
    });
  });

  describe('roster · 名士基底（19 §5.1）', () => {
    const ctx = { state: newSession(7).current, defs };

    it('每位名士都有非零基底 —— 站上格子必須有意義', () => {
      for (const n of defs.reader('notable').all()) {
        ok(n.base.trainingBonus > 0, `${String(n.notableId)} 基底加成為 0`);
        ok(n.base.specialtyBonus > 0, `${String(n.notableId)} 對位加成為 0`);
        ok(n.base.specialtyWeight >= 1, `${String(n.notableId)} 專長權重 < 1`);
      }
    });

    it('開局（陌生）時，★5 對位就明顯強於 ★1 非對位', () => {
      const all = defs.reader('notable').all();
      const five = all.find((n) => n.rarity === 5);
      const one = all.find((n) => n.rarity === 1);
      ok(five !== undefined && one !== undefined, '缺 ★5 或 ★1 名士');
      if (five === undefined || one === undefined) return;
      const strong = notableSlotBonus(five.notableId, five.base.specialty, ctx);
      const offAttr = ATTRS.find((a) => a !== one.base.specialty);
      ok(offAttr !== undefined, '找不到非專長維');
      const weak = notableSlotBonus(one.notableId, offAttr ?? 'war', ctx);
      ok(strong > weak * 2, `★5 對位 ${strong} 應遠大於 ★1 非對位 ${weak}`);
    });

    it('同一位名士站在專長格上，加成高於非專長格', () => {
      for (const n of defs.reader('notable').all()) {
        const off = ATTRS.find((a) => a !== n.base.specialty) ?? 'war';
        const fit = notableSlotBonus(n.notableId, n.base.specialty, ctx);
        const unfit = notableSlotBonus(n.notableId, off, ctx);
        ok(fit > unfit, `${String(n.notableId)} 對位 ${fit} 未高於非對位 ${unfit}`);
      }
    });

    it('空格倍率恰為 1，名士之間【相乘】（19 §5.2）', () => {
      eq(trainingMultiplier([], 'war', ctx), 1);
      const wars = defs.reader('notable').all().filter((n) => n.base.specialty === 'war');
      const a = wars[0];
      const b = wars[1];
      ok(a !== undefined && b !== undefined, '缺兩位武專長名士');
      if (a === undefined || b === undefined) return;
      const lb = defs.single('linkBonus');
      const pile1 = lb.pileMultiplier[1] ?? 1;
      const pile2 = lb.pileMultiplier[2] ?? 1;
      const one = trainingMultiplier([a.notableId], 'war', ctx);
      const two = trainingMultiplier([a.notableId, b.notableId], 'war', ctx);
      const bBonus = notableSlotBonus(b.notableId, 'war', ctx);
      // 兩人 ＝ 一人 × 第二人的倍率 × 人數倍率的變化
      near(two, (one / pile1) * (1 + bBonus) * pile2, 1e-9, '兩人同格應為相乘：');
      // 相乘（再乘人數倍率）必須嚴格大於相加，否則爆發感不存在
      ok(two > one + bBonus, `兩人同格 ${two} 未超過相加 ${one + bBonus}`);
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
      // 爆發要真的是爆發：人擠滿時的額外倍率必須明顯 > 1
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
      const piled = trainingMultiplier(all, 'war', ctx);
      ok(piled > 1.4, `全員同格只有 ×${piled.toFixed(2)}，談不上爆發`);
      ok(piled <= lb.maxSlotMultiplier + 1e-9, `倍率 ${piled} 超出上限 ${lb.maxSlotMultiplier}`);
    });

    it('四維各有至少一位名士以它為專長', () => {
      const owned = new Set(defs.reader('notable').all().map((n) => n.base.specialty));
      for (const a of ATTRS) ok(owned.has(a), `沒有名士以 ${a} 為專長`);
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
        if (s.needsMajorCheck) { s.attemptMajor('hard', []); continue; }
        s.selectTraining(0);
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
