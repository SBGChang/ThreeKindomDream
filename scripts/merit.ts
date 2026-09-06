// 功績的【兩條線分別收多少】，以及那些功績是【從哪來的】。
//
// 使用者的兩條要求都落在這裡：
//   #4 「現在功績我在第一輪的時候就能很快滿了，問題很大」
//   #6 「大部分武將都４星有的五星的時候…才有機會兩條路功績都到最高」
//
// 平均值看不出問題，要看的是【來源分解】——
// 戰役 對 委託事件，因為那決定了「文官線有沒有可能追上」。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import { careerService } from '../src/modules/career.js';
import type { ContentRepository } from '../src/data-runtime/loader.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { POLICIES } from './lib/policies.js';

const RUNS = Number(process.argv[2] ?? 30);
const SCALES = (process.argv[3] ?? '1').split(',').map(Number);

/**
 * 把升階門檻【在載入時】乘上 scale ★
 *
 * 這條有**回授**，所以不能用算的：
 *   門檻↑ → 名義階↓ → hostScale↓ → 兵量↓ → 戰役深度↓ → 功績↓ → 名義階↓↓
 * 實測回授增益約 −1（門檻 +19% 讓收入 −20%），所以要解不動點，
 * 只能掃。`ContentRepository` 只是 `read(path) => string`，包一層就能改。
 */
const scaled = (scale: number): ContentRepository => {
  const disk = diskRepository();
  return {
    read: (path) => {
      const raw = disk.read(path);
      if (!path.endsWith('core/defs.json')) return raw;
      const json = JSON.parse(raw) as Record<string, unknown>[];
      for (const d of json) {
        if (d['kind'] !== 'careerRank') continue;
        d['requiredMerit'] = Math.round((d['requiredMerit'] as number) * scale);
      }
      return JSON.stringify(json);
    },
  };
};

function mk(repo: ContentRepository) {
  const loaded = loadContent(repo);
  if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
  return { defs: loaded.registry, w: compose(loaded.registry) };
}
type World = ReturnType<typeof mk>;

const starMeta = (star: number, defs: World['defs']): MetaState => {
  const base = emptyMeta();
  if (star <= 0) return base;
  const codex: Record<string, { star: number; fragments: number; unlocked: boolean }> = {};
  for (const n of defs.reader('notable').all()) {
    codex[String(n.notableId)] = { star, fragments: 0, unlocked: true };
  }
  return { ...base, notableCodex: codex as MetaState['notableCodex'] };
};

interface Row {
  civil: number; martial: number;
  nCivil: number; nMartial: number;
  fromCampaign: number; capTurn: number; turns: number;
}

/** 戰役給的功績【單獨記帳】—— 那是判斷「文官線追不追得上」的關鍵。 */
const play = (world: World, policyName: string, meta: MetaState): Row[] => {
  const { defs, w } = world;
  const policy = POLICIES.find((x) => x.name === policyName);
  if (policy === undefined) throw new Error(`no policy ${policyName}`);
  const out: Row[] = [];
  for (let r = 0; r < RUNS; r += 1) {
    const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(7000 + r));
    let guard = 0; let fromCampaign = 0; let capTurn = 0;
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
        const before = s.current.currencies.merit.civil
          + s.current.currencies.merit.martial;
        for (let i = 0; i < 8; i += 1) {
          if (s.nextStage() === null) break;
          if (s.engage().defeated) break;
        }
        if (s.needsCampaign) s.withdraw();
        fromCampaign += s.current.currencies.merit.civil
          + s.current.currencies.merit.martial - before;
        continue;
      }
      s.selectSlot(policy.chooseSlot(s));
      let g2 = 0;
      while (s.pendingEvent !== null && g2 < 8) {
        g2 += 1;
        const offer = s.pendingEvent;
        const want = policy.chooseOption(s, offer);
        const i = offer.optionStates[want]?.enabled === true
          ? want : offer.optionStates.findIndex((x) => x.enabled);
        s.resolveEvent(i);
      }
      s.advance();
    }
    out.push({
      civil: s.current.currencies.merit.civil,
      martial: s.current.currencies.merit.martial,
      nCivil: careerService.notionalLevel('civil', s.ctx),
      nMartial: careerService.notionalLevel('martial', s.ctx),
      fromCampaign, capTurn, turns: s.current.progress.turn,
    });
  }
  return out;
};

const avg = (xs: readonly number[]): number =>
  (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const p = (n: number, w2: number): string => n.toFixed(0).padStart(w2);

console.log(`功績來源與兩線分布　${RUNS} 輪／組`);
console.log('');
for (const scale of SCALES) {
  const world = mk(scaled(scale));
  const ranks = world.defs.reader('careerRank').where((x) => x.line === 'martial')
    .map((x) => x.requiredMerit).sort((a, b) => a - b);
  const top = ranks[ranks.length - 1] ?? 0;
  console.log(`══ 門檻 ×${scale}　最高階 ${top} 功績／線 ══`);
  console.log('策略           星   文功  武功   合計  戰役佔  文階 武階');
  for (const name of ['greedy-gain', 'focus-martial', 'focus-civil']) {
    for (const star of [0, 3, 4, 5]) {
      const rows = play(world, name, starMeta(star, world.defs));
      const c = avg(rows.map((x) => x.civil));
      const m = avg(rows.map((x) => x.martial));
      const camp = avg(rows.map((x) => x.fromCampaign));
      console.log(
        `${name.padEnd(14)}${star === 0 ? '無' : `${star}★`}`
        + `${p(c, 7)}${p(m, 6)}${p(c + m, 7)}`
        + `${((camp / Math.max(1, c + m)) * 100).toFixed(0).padStart(6)}%`
        + `${p(avg(rows.map((x) => x.nCivil)), 6)}${p(avg(rows.map((x) => x.nMartial)), 5)}`,
      );
    }
  }
  console.log('');
}
