// ㉛ 平衡模擬器。headless 跑 N 次 Run，輸出分佈統計（31）。
// 執行：npm run sim -- [runs] [policy]
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyMeta, emptyDraft } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import type { GlowTier } from '../src/contracts/core/primitives.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { POLICIES, type AgentPolicy } from './lib/policies.js';

const loaded = loadContent(diskRepository());
if (!loaded.ok) {
  console.error(loaded.report);
  process.exit(1);
}
const defs = loaded.registry;
const w = compose(defs);

interface RunRecord {
  readonly endingId: string;
  readonly chaptersPassed: number;
  readonly turns: number;
  readonly points: number;
  readonly attrs: Record<string, number>;
  readonly career: { civil: number; martial: number };
  readonly fame: number;
  readonly moral: number;
  readonly glow: Record<string, number>;
  readonly offerCounts: readonly number[];
  readonly totalTurns: number;
  /** 單動作回合的核心度量：這一輪把回合花在哪一邊。 */
  readonly trainTurns: number;
  readonly eventTurns: number;
  readonly failedAt: string | null;
}

function runOnce(policy: AgentPolicy, runSeed: number, meta: MetaState): RunRecord {
  const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(runSeed));
  const glow: Record<string, number> = { none: 0, silver: 0, gold: 0, red: 0 };
  const offerCounts: number[] = [];
  let totalTurns = 0;
  let failedAt: string | null = null;
  let guard = 0;

  while (!s.isOver && guard < 400) {
    guard += 1;

    if (s.needsFactionChoice) {
      const eligible = s.factionOptions().filter((o) => o.eligible);
      const first = eligible[0];
      if (first === undefined) { s.noFactionAvailable(); break; }
      s.chooseFaction(first.factionId);
      continue;
    }
    if (s.needsSuperiors) {
      const quota = s.bondQuota();
      s.assignSuperiors(s.superiorCandidates().slice(0, quota));
      continue;
    }
    if (s.needsMajorCheck) {
      const d = policy.chooseDifficulty(s);
      const sortie = s.eligibleSortie().slice(0, defs.single('gameRules').maxSortie);
      const passed = s.attemptMajor(d, sortie);
      if (!passed) failedAt = `${String(s.current.progress.chapterId)}/${d}`;
      continue;
    }

    totalTurns += 1;
    offerCounts.push(s.current.slots.event.offers.length);

    // 一回合恰好一個動作。策略回哪一種，這裡就只執行那一種。
    const action = policy.chooseAction(s);
    if (action.kind === 'training') {
      s.selectTraining(action.index);
      const result = s.current.slots.training.result;
      if (result !== null) glow[result.finalGlow] = (glow[result.finalGlow] ?? 0) + 1;
    } else {
      s.selectEvent(action.offerIndex, action.optionIndex);
    }

    s.advance();
  }

  const st = s.current;
  const settled = st.ending === null ? null : s.settle(meta);
  return {
    endingId: st.ending === null ? 'none' : String(st.ending.endingId),
    chaptersPassed: st.progress.chaptersPassed,
    turns: st.progress.turn,
    points: settled?.pointsGained ?? 0,
    attrs: { ...st.attributes.values },
    career: st.career,
    fame: st.currencies.fame.civil + st.currencies.fame.martial,
    moral: st.currencies.fame.moral,
    glow,
    offerCounts,
    totalTurns,
    trainTurns: st.actions.training,
    eventTurns: st.actions.event,
    failedAt,
  };
}

// ── 執行 ────────────────────────────────────────────
const runs = Number(process.argv[2] ?? 300);
const only = process.argv[3];
const meta = emptyMeta();
const pct = (n: number, d: number): string => `${((n / Math.max(1, d)) * 100).toFixed(1)}%`;
const avg = (xs: readonly number[]): number =>
  xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const p = (xs: readonly number[], q: number): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
};

console.log(`模擬 ${runs} 次／策略　內容雜湊 ${defs.contentHash()}`);
console.log(`四維上限 ${defs.single('attributeCap').attrMax}　章節總數 ${defs.reader('chapter').all().length}`);
console.log('');

for (const policy of POLICIES) {
  if (only !== undefined && policy.name !== only) continue;
  const recs: RunRecord[] = [];
  for (let i = 0; i < runs; i += 1) recs.push(runOnce(policy, 1000 + i, meta));

  const full = recs.filter((r) => r.endingId.includes('pillar')
    || r.endingId.includes('chancellor') || r.endingId.includes('general')
    || r.endingId.includes('minister') || r.endingId.includes('accomplished'));
  const chapters = recs.map((r) => r.chaptersPassed);
  const glowTotal: Record<string, number> = { none: 0, silver: 0, gold: 0, red: 0 };
  for (const r of recs) for (const k of Object.keys(glowTotal)) {
    glowTotal[k] = (glowTotal[k] ?? 0) + (r.glow[k] ?? 0);
  }
  const glowSum = Object.values(glowTotal).reduce((a, b) => a + b, 0);
  const allOffers = recs.flatMap((r) => r.offerCounts);
  const fullSlots = allOffers.filter((n) => n >= 3).length;
  const emptySlots = allOffers.filter((n) => n === 0).length;
  const eventShare = avg(recs.map((r) => r.eventTurns / Math.max(1, r.trainTurns + r.eventTurns)));

  const byEnding = new Map<string, number>();
  for (const r of recs) byEnding.set(r.endingId, (byEnding.get(r.endingId) ?? 0) + 1);

  console.log(`── ${policy.name} ${'─'.repeat(Math.max(0, 44 - policy.name.length))}`);
  console.log(`  圓夢率 ${pct(full.length, recs.length)}`
    + `　通過章節 平均 ${avg(chapters).toFixed(2)} / p50 ${p(chapters, 0.5)} / p95 ${p(chapters, 0.95)}`);
  console.log(`  輪迴點數 平均 ${avg(recs.map((r) => r.points)).toFixed(0)}`
    + `　官階 文 ${avg(recs.map((r) => r.career.civil)).toFixed(1)}`
    + ` 武 ${avg(recs.map((r) => r.career.martial)).toFixed(1)}`);
  console.log(`  四維終值 武 ${avg(recs.map((r) => r.attrs['war'] ?? 0)).toFixed(0)}`
    + ` 智 ${avg(recs.map((r) => r.attrs['int'] ?? 0)).toFixed(0)}`
    + ` 政 ${avg(recs.map((r) => r.attrs['pol'] ?? 0)).toFixed(0)}`
    + ` 魅 ${avg(recs.map((r) => r.attrs['cha'] ?? 0)).toFixed(0)}`
    + `　總名聲 ${avg(recs.map((r) => r.fame)).toFixed(0)}`
    + `　善惡 ${avg(recs.map((r) => r.moral)).toFixed(0)}`);
  console.log(`  光階分佈 ${(['none', 'silver', 'gold', 'red'] as GlowTier[])
    .map((g) => `${g} ${pct(glowTotal[g] ?? 0, glowSum)}`).join('  ')}`);
  console.log(`  事件槽 平均 ${avg(allOffers).toFixed(2)} 個`
    + `　滿 3 個 ${pct(fullSlots, allOffers.length)}`
    + `　完全空 ${pct(emptySlots, allOffers.length)}`);
  console.log(`  回合配比 練 ${avg(recs.map((r) => r.trainTurns)).toFixed(1)}`
    + ` ／ 辦事 ${avg(recs.map((r) => r.eventTurns)).toFixed(1)}`
    + `　事件佔比 ${(eventShare * 100).toFixed(1)}%`);
  const top = [...byEnding.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  console.log(`  結局 ${top.map(([k, v]) => `${k.replace('ending:', '')} ${pct(v, recs.length)}`).join('  ')}`);
  console.log('');
}
