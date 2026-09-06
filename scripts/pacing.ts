// 玩家實際的節奏：**一路按「再打一關」會打到第幾關**，以及官階何時封頂。
//
// 模擬器的替身在 margin < 1 時會收兵，但人不會 —— 戰敗只掉一半獎勵（D54），
// 所以真人就是一路按下去。玩家回報「第一輪輕鬆到第七關」與模擬器的
// 「深度 2.7」不衝突：**兩邊量的是不同的行為。**
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import { careerService } from '../src/modules/career.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { POLICIES } from './lib/policies.js';

const RUNS = Number(process.argv[2] ?? 40);
const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);

const maxedMeta = (): MetaState => {
  const base = emptyMeta();
  const purchased: Record<string, number> = {};
  for (const it of defs.reader('shopItem').all()) purchased[String(it.item)] = it.levels.length;
  const codex: Record<string, { star: number; fragments: number; unlocked: boolean }> = {};
  const tiers = defs.single('notableStar').tiers;
  for (const n of defs.reader('notable').all()) {
    codex[String(n.notableId)] = { star: tiers.length - 1, fragments: 0, unlocked: true };
  }
  return {
    ...base, points: 999999, shop: { purchased },
    notableCodex: codex as MetaState['notableCodex'],
  };
};

/** 名士全部 N 星（其餘天命為空）—— 量「星階單獨買到多少」。 */
const starMeta = (star: number): MetaState => {
  const base = emptyMeta();
  const codex: Record<string, { star: number; fragments: number; unlocked: boolean }> = {};
  for (const n of defs.reader('notable').all()) {
    codex[String(n.notableId)] = { star, fragments: 0, unlocked: true };
  }
  return { ...base, notableCodex: codex as MetaState['notableCodex'] };
};

interface Row {
  depth: number; lost: boolean; rank: number; capTurn: number;
  meritCivil: number; meritMartial: number; notional: number;
}

const play = (meta: MetaState): Row[] => {
  const policy = POLICIES.find((x) => x.name === 'greedy-gain');
  if (policy === undefined) throw new Error('no policy');
  const out: Row[] = [];
  for (let r = 0; r < RUNS; r += 1) {
    const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(7000 + r));
    let guard = 0;
    let cleared = 0;
    let fights = 0;
    let lost = false;
    let capTurn = 0;
    const cap = meta.points > 0 ? 12 : 5;
    while (!s.isOver && guard < 220) {
      guard += 1;
      if (capTurn === 0 && Math.max(s.current.career.civil, s.current.career.martial) >= cap) {
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
        fights += 1;
        // ★ 一路按下去 —— 這才是真人的玩法（戰敗只掉一半）。
        for (let i = 0; i < 8; i += 1) {
          if (s.nextStage() === null) break;
          if (s.engage().defeated) { lost = true; break; }
          cleared += 1;
        }
        if (s.needsCampaign) s.withdraw();
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
      depth: fights === 0 ? 0 : cleared / fights,
      lost,
      rank: Math.max(s.current.career.civil, s.current.career.martial),
      capTurn,
      meritCivil: s.current.currencies.merit.civil,
      meritMartial: s.current.currencies.merit.martial,
      notional: Math.max(
        careerService.notionalLevel('civil', s.ctx),
        careerService.notionalLevel('martial', s.ctx),
      ),
    });
  }
  return out;
};

const avg = (xs: readonly number[]): number =>
  (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const p = (n: number, w2 = 6): string => n.toFixed(1).padStart(w2);

console.log(`一路按「再打一關」　${RUNS} 輪／組　（greedy-gain）`);
console.log('');
console.log('天命            深度  戰敗率   官階  名義階  封頂於第N回合  文功   武功');
for (const [label, meta] of [
  ['第一輪', emptyMeta()],
  ['名士 3★', starMeta(3)],
  ['名士 4★', starMeta(4)],
  ['名士 5★', starMeta(5)],
  ['天命全滿', maxedMeta()],
] as const) {
  const rows = play(meta);
  const capped = rows.filter((x) => x.capTurn > 0);
  console.log(
    `${label.padEnd(11)}${p(avg(rows.map((x) => x.depth)))}`
    + `${p(avg(rows.map((x) => (x.lost ? 100 : 0))))}%`
    + `${p(avg(rows.map((x) => x.rank)), 7)}`
    + `${p(avg(rows.map((x) => x.notional)), 7)}`
    + `${capped.length === 0 ? '        —' : p(avg(capped.map((x) => x.capTurn)), 9)}`
    + `  (${Math.round((capped.length / rows.length) * 100)}%)`
    + `${p(avg(rows.map((x) => x.meritCivil)), 7)}${p(avg(rows.map((x) => x.meritMartial)), 7)}`,
  );
}
