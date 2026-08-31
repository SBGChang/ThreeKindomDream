// 端到端 smoke test：跑一整輪，逐回合印出實際發生的事。
// 這是「灰盒能不能玩」的最小驗收，也是 UI 之外的第二個驗證面。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import {
  ATTRS, CHECK_CHOICES, SLOT_INDICES, type CheckChoice, type SlotIndex,
} from '../src/contracts/core/primitives.js';
import { stageOf } from '../src/modules/roster-query.js';

const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);
const t = (k: unknown): string => defs.text(String(k));

const meta = emptyMeta();
const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(Number(process.argv[2] ?? 4242)));

console.log('陣容：' + s.current.roster.members
  .map((m) => `${t(defs.reader('notable').get(String(m.notableId)).nameKey)}(${m.affinity})`)
  .join('　'));
console.log('');

let guard = 0;
while (!s.isOver && guard < 200) {
  guard += 1;

  if (s.needsFactionChoice) {
    const opt = s.factionOptions().filter((o) => o.eligible)[0];
    if (opt === undefined) { s.noFactionAvailable(); continue; }
    console.log(`\n【選陣營】→ ${t(opt.nameKey)}`);
    s.chooseFaction(opt.factionId);
    continue;
  }
  if (s.needsSuperiors) {
    const quota = s.bondQuota();
    s.assignSuperiors(s.superiorCandidates().slice(0, quota));
    console.log('【入朝】上司：' + s.current.roster.members.filter((m) => m.origin === 'superior')
      .map((m) => t(defs.reader('notable').get(String(m.notableId)).nameKey)).join('　'));
    console.log(`     官階 文${s.current.career.civil} 武${s.current.career.martial}\n`);
    continue;
  }
  if (s.needsMajorCheck) {
    const ch = defs.reader('chapter').get(String(s.current.progress.chapterId));
    const sortie = s.eligibleSortie().slice(0, defs.single('gameRules').maxSortie);
    const avail = s.availableChoices();
    const isAvail = (c: CheckChoice): boolean =>
      avail.some((a) => a.line === c.line && a.difficulty === c.difficulty);
    // 六個都列出來，門檻不足的標「鎖」——
    // 只列可用的會讓 debug 工具讀起來像「選項本來就不存在」（18 §2.1）。
    const rows = CHECK_CHOICES.map((c) => {
      const pv = s.previewMajor(c, sortie);
      return `${t(`careerLine.${c.line}`)}${t(`difficulty.${c.difficulty}`)}`
        + ` DC${pv.dc} 值${pv.base}+${pv.bonus} ${(pv.successRate * 100).toFixed(0)}%`
        + `${isAvail(c) ? '' : ' 鎖'}`;
    });
    // 六個選項裡挑成功率 >= 70% 的最高 DC —— 路線也一起挑（18 §2.2）
    let pick: CheckChoice = avail[0] ?? { line: 'martial', difficulty: 'safe' };
    let bestDc = -Infinity;
    for (const c of avail) {
      const pv = s.previewMajor(c, sortie);
      if (pv.successRate >= 0.7 && pv.dc > bestDc) { bestDc = pv.dc; pick = c; }
    }
    console.log(`\n【大檢定 ${t(ch.titleKey)}】\n  ${rows.join('\n  ')}`);
    const ok = s.attemptMajor(pick, sortie);
    const log = s.current.lastMajorCheck;
    console.log(`  選 ${t(`careerLine.${pick.line}`)}路 ${t(`difficulty.${pick.difficulty}`)}`
      + ` → ${ok ? '通過' : '失敗'}`
      + `（${log?.base}+${log?.bonus}+骰${log?.roll}=${log?.total} vs DC${log?.dc}）\n`);
    continue;
  }

  // 一個回合兩拍（15 §2）：投入固定事件 → 清空它引出的事件佇列。
  // 替身玩家專精【武路的主屬性】，委託一律選期望值最高的選項。
  const turn = String(s.current.progress.turn).padStart(2, ' ');
  const primary = s.majorCheck().routes.martial.primaryAttr;

  let best: SlotIndex = 0;
  let bestGain = -Infinity;
  for (const i of SLOT_INDICES) {
    const cand = s.current.turn.slots[i];
    if (cand === undefined) continue;
    const g = (cand.attr === primary ? 100000 : 0) + s.previewTraining(i).expectedGain;
    if (g > bestGain) { bestGain = g; best = i; }
  }
  const slot = s.current.turn.slots[best];
  // 四項全中是那一回合的高光：雙驚嘆號 ＋ 金光以上 ＋ 有人站（15 §3.3）
  const pv = s.previewTraining(best);
  const pile = slot?.notables.length ?? 0;
  const flags = `${pv.hasCommission ? '!' : ''}${pv.hasEncounter ? '?' : ''}`;
  const burst = pv.hasCommission && pv.hasEncounter && pile > 0
    ? `　★${pile} 人同格 ${flags}★` : (flags === '' ? '' : `　${flags}`);

  s.selectSlot(best);
  const r = s.current.turn.training;
  console.log(`R${turn} 【${t(slot?.labelKey)}】${t(`glow.${slot?.baseGlow}`)}`
    + `${r?.upgraded === true ? '⬆' : ' '}→${t(`glow.${r?.finalGlow}`)}`
    + ` ${t(`attr.${r?.attr}.short`)}+${r?.attrGained}`
    + ` ${t(`merit.${r?.meritGained.line}`)}+${r?.meritGained.amount}${burst}`);

  // 佇列可能有兩則：委託，以及同台名士追加的武將事件。
  for (;;) {
    const offer = s.pendingEvent;
    if (offer === null) break;
    const def = defs.reader('event').get(String(offer.eventDefId));
    const on = offer.optionStates
      .map((o, i) => ({ i, o }))
      .filter((x) => x.o.enabled);
    const ev = (x: typeof on[number]): number =>
      x.o.meritPreview.reduce((a, m) => a + m.amount, 0)
      * (0.4 + 0.6 * (x.o.successRate ?? 1));
    const first = on[0];
    if (first === undefined) throw new Error('事件無可選項');
    const pick = on.reduce((b, x) => (ev(x) > ev(b) ? x : b), first);
    const tag = def.trigger.kind === 'notable' ? '名士' : `★${offer.rarity}`;
    s.resolveEvent(pick.i);
    const res = s.current.turn.resolved.at(-1);
    const gained = (res?.practiceGained ?? [])
      .map((g) => `${t(`attr.${g.attr}.short`)}+${g.amount}`).join(' ');
    const got = (res?.meritGained ?? [])
      .map((m) => `${t(`merit.${m.line}`)}+${m.amount}`).join(' ');
    console.log(`      └ [${tag}] ${t(def.titleKey)}·${t(def.options[pick.i]?.labelKey)}`
      + ` ${res?.passed === true ? '成' : '敗'}`
      + `　${got === '' ? '—' : got}　磨練 ${gained === '' ? '—' : gained}`);
  }

  s.advance();
}

const st = s.current;
console.log('');
console.log(`【${t(st.ending?.titleKey)}】${t(st.ending?.bodyKey)}`);
console.log('  四維 ' + ATTRS.map((a) => `${t(`attr.${a}.short`)}${st.attributes.values[a]}`).join(' '));
console.log(`  功績 文${st.currencies.merit.civil} 武${st.currencies.merit.martial}`);
console.log(`  官階 文${st.career.civil} 武${st.career.martial}　通過章節 ${st.progress.chaptersPassed}`);
console.log('  回合配比 ' + ATTRS.map((a) => `${t(`attr.${a}.short`)} ${st.actions[a]}`).join(' ／ '));
console.log('  好感：' + st.roster.members
  .map((m) => `${t(defs.reader('notable').get(String(m.notableId)).nameKey)} ${t(`stage.${stageOf(m.notableId, s.ctx)}`)}(${m.affinity})`)
  .join('　'));
const res = s.settle(meta);
console.log(`  輪迴點數 +${res.pointsGained}`);
console.log('  碎片：' + (Object.entries(res.notableFragments).length === 0 ? '無'
  : Object.entries(res.notableFragments)
    .map(([id, n]) => `${t(defs.reader('notable').get(id).nameKey)} ${n}`
      + (res.starRaised[id] === undefined ? '' : ` (升星+${res.starRaised[id]})`))
    .join('　')));
