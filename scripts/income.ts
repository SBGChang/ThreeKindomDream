// 一輪的【收入分解】：功績與經驗各自從哪裡來。
//
// 平均值與總量都看不出病根 —— 使用者說「人物事件的好像還是過高」，
// 要驗證那句話，就得把四個來源分開記帳：
//
//   固定事件  選格子當下（training.select）
//   委託      trigger.kind === 'commission'
//   人物事件  trigger.kind === 'notable'
//   戰役      engage()（D66 之後【不該有功績】，只有經驗）
//
// 記帳方式：在每一個動作【前後】各量一次總額，差額歸給那個動作。
// 不需要在核心埋任何 hook —— 動作邊界本來就是分得開的。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import { ATTRS } from '../src/contracts/core/primitives.js';
import { careerService } from '../src/modules/career.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { POLICIES } from './lib/policies.js';

const RUNS = Number(process.argv[2] ?? 30);
const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);

type Src = 'fixed' | 'commission' | 'notable' | 'campaign';
const SRCS: readonly Src[] = ['fixed', 'commission', 'notable', 'campaign'];
const LABEL: Record<Src, string> = {
  fixed: '固定事件', commission: '委託', notable: '人物事件', campaign: '戰役',
};

const starMeta = (star: number): MetaState => {
  const base = emptyMeta();
  if (star <= 0) return base;
  const codex: Record<string, { star: number; fragments: number; unlocked: boolean }> = {};
  for (const n of defs.reader('notable').all()) {
    codex[String(n.notableId)] = { star, fragments: 0, unlocked: true };
  }
  return { ...base, notableCodex: codex as MetaState['notableCodex'] };
};

interface Tally {
  readonly merit: Record<Src, number>;
  readonly exp: Record<Src, number>;
  readonly counts: Record<Src, number>;
  readonly nCivil: number;
  readonly nMartial: number;
  readonly capTurn: number;
}

const zero = (): Record<Src, number> =>
  ({ fixed: 0, commission: 0, notable: 0, campaign: 0 });

const play = (policyName: string, meta: MetaState): Tally[] => {
  const policy = POLICIES.find((x) => x.name === policyName);
  if (policy === undefined) throw new Error(`no policy ${policyName}`);
  const out: Tally[] = [];
  for (let r = 0; r < RUNS; r += 1) {
    const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(7000 + r));
    const merit = zero(); const exp = zero(); const counts = zero();
    const mOf = (): number =>
      s.current.currencies.merit.civil + s.current.currencies.merit.martial;
    const eOf = (): number => ATTRS.reduce((n, a) => n + s.expOf(a), 0);
    /** 一個動作的收入 ＝ 它前後的差額。核心不必埋 hook。 */
    const bill = (src: Src, fn: () => void): void => {
      const m0 = mOf(); const e0 = eOf();
      fn();
      merit[src] += mOf() - m0;
      exp[src] += eOf() - e0;
      counts[src] += 1;
    };

    let guard = 0; let capTurn = 0;
    const cap = meta.points > 0 ? 12 : 5;
    while (!s.isOver && guard < 220) {
      guard += 1;
      if (capTurn === 0
        && Math.max(s.current.career.civil, s.current.career.martial) >= cap) {
        capTurn = s.current.progress.turn;
      }
      if (s.needsFactionChoice) {
        const o = s.factionOptions().filter((x) => x.eligible)[0];
        if (o === undefined) { s.noFactionAvailable(); continue; }
        s.chooseFaction(o.factionId); continue;
      }
      if (s.needsSuperiors) { s.assignSuperiors([]); continue; }
      if (s.needsCampaign) {
        policy.spend(s);
        s.configureCampaign(policy.chooseLoadout(s));
        bill('campaign', () => {
          for (let i = 0; i < 8; i += 1) {
            if (s.nextStage() === null) break;
            if (s.engage().defeated) break;
          }
          if (s.needsCampaign) s.withdraw();
        });
        continue;
      }
      // 選格子本身 ＝ 固定事件的產出。委託／人物事件是它【之後】才跳的。
      bill('fixed', () => { s.selectSlot(policy.chooseSlot(s)); });
      let g2 = 0;
      while (s.pendingEvent !== null && g2 < 8) {
        g2 += 1;
        const offer = s.pendingEvent;
        const def = defs.reader('event').get(String(offer.eventDefId));
        const src: Src = def.trigger.kind === 'commission' ? 'commission' : 'notable';
        const want = policy.chooseOption(s, offer);
        const i = offer.optionStates[want]?.enabled === true
          ? want : offer.optionStates.findIndex((x) => x.enabled);
        bill(src, () => { s.resolveEvent(i); });
      }
      s.advance();
    }
    out.push({
      merit, exp, counts, capTurn,
      nCivil: careerService.notionalLevel('civil', s.ctx),
      nMartial: careerService.notionalLevel('martial', s.ctx),
    });
  }
  return out;
};

const avg = (xs: readonly number[]): number =>
  (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const pad = (n: number, w2: number): string => n.toFixed(0).padStart(w2);
const pct = (n: number, total: number): string =>
  `${((n / Math.max(1, total)) * 100).toFixed(0)}%`.padStart(5);

console.log(`一輪的收入分解　${RUNS} 輪／組`);
const ranks = defs.reader('careerRank').where((x) => x.line === 'martial')
  .map((x) => x.requiredMerit).sort((a, b) => a - b);
console.log(`第一輪的 careerCap ＝ 5，需要 ${ranks[4]} 功績／線`);
console.log('');

for (const star of [0, 3, 5]) {
  for (const name of ['greedy-gain', 'balanced']) {
    const rows = play(name, starMeta(star));
    const mAll = avg(rows.map((x) => SRCS.reduce((n, s) => n + x.merit[s], 0)));
    const eAll = avg(rows.map((x) => SRCS.reduce((n, s) => n + x.exp[s], 0)));
    console.log(`══ ${star === 0 ? '無星' : `${star}★`}　${name}　`
      + `名義階 文${avg(rows.map((x) => x.nCivil)).toFixed(1)}`
      + `／武${avg(rows.map((x) => x.nMartial)).toFixed(1)} ══`);
    console.log('  來源        功績   佔比    經驗   佔比    次數   每次功績');
    for (const s of SRCS) {
      const m = avg(rows.map((x) => x.merit[s]));
      const e = avg(rows.map((x) => x.exp[s]));
      const c = avg(rows.map((x) => x.counts[s]));
      console.log(
        `  ${LABEL[s].padEnd(6)}${pad(m, 8)}${pct(m, mAll)}${pad(e, 8)}${pct(e, eAll)}`
        + `${pad(c, 8)}${(m / Math.max(1, c)).toFixed(1).padStart(9)}`,
      );
    }
    console.log(`  ${'合計'.padEnd(6)}${pad(mAll, 8)}${'     '}${pad(eAll, 8)}`);
    console.log('');
  }
}
