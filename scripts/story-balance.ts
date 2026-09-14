/** Real 72-turn journeys, without changing attributes, troops, choices or rewards in saved state. */
import { Session } from '../src/app/session.js';
import { driveRun } from '../src/app/run-driver.js';
import { factionId, seed } from '../src/contracts/core/ids.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { defs, wiring } from './tests/harness.js';
import { POLICIES } from './lib/policies.js';

const count = Number(process.argv[2] ?? 12);
const prepared: Record<string, string> = { 'S4.A': 'pact', 'S5.B': 'handover', 'S6.A': 'corridor',
  'S6.B': 'handover', 'S7.A': 'rescue', 'S7.B': 'pact', 'S8.A': 'delegate', 'S8.B': 'handover' };
const reports = [];
for (const star of [0, 3, 5]) {
  for (const name of ['greedy-gain', 'focus-martial', 'focus-civil']) {
    const policy = POLICIES.find(p => p.name === name)!;
    const runs: { seed: number; depths: readonly number[]; milestones: readonly string[]; ending: unknown }[] = [];
    for (let n = 0; n < count; n++) {
      const base = emptyMeta();
      const meta: MetaState = star === 0 ? base : { ...base, notableCodex: Object.fromEntries(defs.reader('notable').all()
        .map(d => [d.notableId, { star, fragments: 0, unlocked: true }])) };
      const s = Session.start(wiring, meta, emptyDraft(meta, defs), seed(9000 + n));
      const result = driveRun(s, { ...policy, chooseFaction: () => factionId('faction:shu'),
        chooseStory: run => prepared[run.storyChoice!.id] ?? run.storyChoice!.options[0]!.id });
      runs.push({ seed: 9000 + n, depths: result.depths, milestones: s.storyProgress().milestones,
        ending: s.current.ending?.endingId });
    }
    reports.push({ star, policy: name, runs: count,
      meanDepth: Array.from({ length: 9 }, (_, i) => Number((runs.reduce((sum, r) => sum + r.depths[i]!, 0) / count).toFixed(2))),
      guanyu: runs.filter(r => r.milestones.includes('shu.guanyu-rescued')).length,
      kongming: runs.filter(r => r.milestones.includes('shu.kongming-rested')).length,
      both: runs.filter(r => r.milestones.length === 2).length,
      examples: runs.filter(r => r.milestones.length).slice(0, 2),
    });
  }
}
console.log(JSON.stringify({ seedFrom: 9000, count, reports }, null, 2));
