// 量出各章大檢定的實際檢定值分佈，供 DC 校準。
// 這是「數值合理再交手感」的前置步驟（31 §1）。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import {
  CAREER_LINES, SLOT_INDICES,
  type CareerLine, type CheckChoice, type SlotIndex,
} from '../src/contracts/core/primitives.js';

const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);
const t = (k: unknown): string => defs.text(String(k));

type Mode = 'focused' | 'spread';
const samples = new Map<string, number[]>();

// 六選項制之後，同一章有文武兩條路線、各自的屬性組與 DC。
// 取樣必須分路線 —— 兩條合在一起平均出來的數字不對應任何一種打法。
function run(runSeed: number, mode: Mode, line: CareerLine): void {
  const meta = emptyMeta();
  const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(runSeed));
  let guard = 0;

  while (!s.isOver && guard < 200) {
    guard += 1;
    if (s.needsFactionChoice) {
      const opt = s.factionOptions().filter((o) => o.eligible)[0];
      if (opt === undefined) { s.noFactionAvailable(); continue; }
      s.chooseFaction(opt.factionId);
      continue;
    }
    if (s.needsSuperiors) { s.assignSuperiors(s.superiorCandidates().slice(0, s.bondQuota())); continue; }
    if (s.needsMajorCheck) {
      const chId = String(s.current.progress.chapterId);
      const sortie = s.eligibleSortie().slice(0, defs.single('gameRules').maxSortie);
      const choice: CheckChoice = { line, difficulty: 'safe' };
      const pv = s.previewMajor(choice, sortie);
      const key = `${chId}|${mode}|${line}`;
      const arr = samples.get(key) ?? [];
      arr.push(pv.base + pv.bonus);
      samples.set(key, arr);
      // 一律強制通過（我們要量後面章節的值，不是量死亡率）
      s.attemptMajor(choice, sortie);
      if (s.isOver) break;
      continue;
    }
    const primary = s.needsMajorCheck ? null : s.majorCheck().routes[line].primaryAttr;
    let best: SlotIndex = 0;
    let score = -Infinity;
    for (const i of SLOT_INDICES) {
      const slot = s.current.turn.slots[i];
      if (slot === undefined) continue;
      const gain = s.previewTraining(i).expectedGain;
      const v = mode === 'focused' && slot.attr === primary ? gain + 100000 : gain;
      if (v > score) { score = v; best = i; }
    }
    // 一個回合兩拍。委託一律選成功率最高的選項 —— DC 校準要量的是
    // 「照著玩會長到多少」，不是「賭運氣能長到多少」（18 §3）。
    s.selectSlot(best);
    for (;;) {
      const offer = s.pendingEvent;
      if (offer === null) break;
      const on = offer.optionStates.map((o, i) => ({ i, o })).filter((x) => x.o.enabled);
      const first = on[0];
      if (first === undefined) throw new Error('事件無可選項');
      const pick = on.reduce(
        (b, x) => ((x.o.successRate ?? 1) > (b.o.successRate ?? 1) ? x : b), first,
      );
      s.resolveEvent(pick.i);
    }
    s.advance();
  }
}

const N = Number(process.argv[2] ?? 200);
for (let i = 0; i < N; i += 1) {
  for (const line of CAREER_LINES) {
    run(3000 + i, 'focused', line);
    run(7000 + i, 'spread', line);
  }
}

const q = (xs: readonly number[], p: number): number => {
  const s2 = [...xs].sort((a, b) => a - b);
  return s2[Math.min(s2.length - 1, Math.floor(s2.length * p))] ?? 0;
};
const avg = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log('各章大檢定的檢定值（base+bonus）分佈　n=' + N);
console.log('');
console.log('章節'.padEnd(20) + '路線 流派    p10    p50    p90   平均 │ 建議 DC 穩/進/險');
for (const chId of defs.reader('chapterSequence').all()
  .flatMap((s2) => s2.chapters).map(String)) {
  const ch = defs.reader('chapter').get(chId);
  for (const line of CAREER_LINES) {
    for (const mode of ['focused', 'spread'] as const) {
      const xs = samples.get(`${chId}|${mode}|${line}`) ?? [];
      if (xs.length === 0) continue;
      const mid = q(xs, 0.5);
      const label = mode === 'focused' ? '專精' : '均衡';
      const dcs = `${Math.round(mid * 0.75)}/${Math.round(mid * 1.05)}/${Math.round(mid * 1.35)}`;
      console.log(
        `${t(ch.titleKey).padEnd(10)}${' '.repeat(4)}${t(`careerLine.${line}`)}   ${label}  `
        + `${String(q(xs, 0.1)).padStart(5)}  ${String(mid).padStart(5)}  `
        + `${String(q(xs, 0.9)).padStart(5)}  ${avg(xs).toFixed(0).padStart(5)} │ ${dcs}`,
      );
    }
  }
}
