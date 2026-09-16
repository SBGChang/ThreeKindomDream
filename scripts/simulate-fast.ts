import { performance } from 'node:perf_hooks';
import { Session } from '../src/app/session.js';
import { compose } from '../src/app/composition.js';
import { driveRun } from '../src/app/run-driver.js';
import { seed } from '../src/contracts/core/ids.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { POLICIES } from './lib/policies.js';

const runs = Number(process.argv[2] ?? 100);
const policy = POLICIES.find(p => p.name === (process.argv[3] ?? 'flag-chaser'));
if (!Number.isSafeInteger(runs) || runs < 1 || runs > 100000 || policy === undefined) throw new Error('用法：npm run sim:fast -- 100 flag-chaser');
const loaded = loadContent(diskRepository());
if (!loaded.ok) throw new Error(loaded.report);
const w = compose(loaded.registry);
const meta = emptyMeta();
const endingCounts: Record<string, number> = {};
let actionCount = 0;
const depths = [0, 0, 0, 0];
const before = performance.now();
for (let i = 0; i < runs; i++) {
  const s = Session.start(w, meta, emptyDraft(meta, w.defs), seed(1000 + i));
  const result = driveRun(s, policy, {battle:'realtime'});
  actionCount += result.actions;
  result.depths.forEach((n, ch) => { depths[ch] = (depths[ch] ?? 0) + n; });
  const id = String(s.current.ending?.endingId);
  endingCounts[id] = (endingCounts[id] ?? 0) + 1;
}
const milliseconds = Math.round(performance.now() - before);
console.log(JSON.stringify({ runs, policy: policy.name, seedFrom: 1000, milliseconds, runsPerSecond: Math.round(runs / Math.max(1, milliseconds) * 1000),
  actionsPerRun: actionCount / runs, averageDepthByChapter: depths.map(n => n / runs), endingCounts }, null, 2));
