// 對標表：**每一章、每個星階，玩家實際帶著什麼走進戰役。**
//
// 難度不該憑感覺填。這張表是反推的來源：
//   章節 × 星階 → 預期主維、預期兵量 → 預期每回合輸出
//                                      ↓
//                          敵人兵力 = 輸出 × 目標回合數
//
// ★ 敵人【不得在執行期讀玩家的四維】—— 那是等級同步，練越高對面越強，
// 養成就白做了。對標發生在【設計時】：用這張量出來的表去訂固定的敵人曲線。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import { ATTRS } from '../src/contracts/core/primitives.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { POLICIES } from './lib/policies.js';

const RUNS = Number(process.argv[2] ?? 30);
const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);

/** 名士全部 N 星。其餘天命為空 —— 量的是【星階單獨買到多少】。 */
const starMeta = (star: number): MetaState => {
  const base = emptyMeta();
  if (star <= 0) return base;
  const codex: Record<string, { star: number; fragments: number; unlocked: boolean }> = {};
  for (const n of defs.reader('notable').all()) {
    codex[String(n.notableId)] = { star, fragments: 0, unlocked: true };
  }
  return { ...base, notableCodex: codex as MetaState['notableCodex'] };
};

interface Snap {
  chapter: number; best: number; troops: number; supply: number;
  power: number; sustain: number; skills: number;
}

/** 走到每一章的戰役【配置完成那一刻】量一次，然後直接收兵（不打）。 */
const sample = (meta: MetaState): Snap[] => {
  const policy = POLICIES.find((x) => x.name === 'greedy-gain');
  if (policy === undefined) throw new Error('no policy');
  const out: Snap[] = [];
  for (let r = 0; r < RUNS; r += 1) {
    const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(9000 + r));
    let guard = 0;
    let nth = 0;
    while (!s.isOver && guard < 220) {
      guard += 1;
      if (s.needsFactionChoice) {
        const o = s.factionOptions().filter((x) => x.eligible)[0];
        if (o === undefined) { s.noFactionAvailable(); continue; }
        s.chooseFaction(o.factionId); continue;
      }
      if (s.needsSuperiors) { s.assignSuperiors([]); continue; }
      if (s.needsCampaign) {
        nth += 1;
        policy.spend(s);
        s.configureCampaign(policy.chooseLoadout(s));
        const lim = s.hostLimits();
        out.push({
          chapter: nth,
          best: Math.max(...ATTRS.map((a) => s.current.attributes.values[a])),
          troops: lim.troopsMax,
          supply: lim.supplyMax,
          power: s.hostPower(),
          sustain: s.hostSustain(),
          skills: s.current.abilities.skills.length,
        });
        s.withdraw();
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
  }
  return out;
};

const avg = (xs: readonly number[]): number =>
  (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const p = (n: number, w2 = 7): string => n.toFixed(0).padStart(w2);

console.log(`對標表　${RUNS} 輪／組　（greedy-gain，配置完成那一刻量，不打）`);
console.log('');
console.log('星階  章  主維   兵量   糧量  每回合輸出  糧秣可回  帶招');
for (const star of [0, 1, 2, 3, 4, 5]) {
  const rows = sample(starMeta(star));
  for (let ch = 1; ch <= 4; ch += 1) {
    const g = rows.filter((x) => x.chapter === ch);
    if (g.length === 0) continue;
    console.log(
      `${star === 0 ? ' 無 ' : ` ${star}★ `}${String(ch).padStart(3)}`
      + `${p(avg(g.map((x) => x.best)), 6)}`
      + `${p(avg(g.map((x) => x.troops)))}${p(avg(g.map((x) => x.supply)))}`
      + `${p(avg(g.map((x) => x.power)), 12)}${p(avg(g.map((x) => x.sustain)), 10)}`
      + `${avg(g.map((x) => x.skills)).toFixed(1).padStart(6)}`,
    );
  }
  console.log('');
}
