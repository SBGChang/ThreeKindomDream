// 量出各章戰役的實際深度分佈，供敵方曲線與獎勵階梯校準（31 §1、RFC-01 §6）。
//
// ── 舊版量的是什麼、為什麼作廢 ──────────────────────
// 舊版量「大檢定的檢定值（base+bonus）」，用來反推三檔 DC。
// 大檢定改成七關戰役之後那個數字不存在了 —— 現在要校準的是三件事：
//
//   1. 玩家在該章的【兵量與糧量】（＝官階曲線對不對）
//   2. 照著玩能打到【第幾關】（＝ enemyTroopsByRank 對不對）
//   3. 貪心閾值不同的人差多少（＝獎勵階梯該不該再陡）
//
// 第 3 點是新制真正的問題。它由 `--greed` 的兩組取樣給出答案。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import { ATTRS, type Attr } from '../src/contracts/core/primitives.js';
import { POLICIES, playCampaign, type AgentPolicy } from './lib/policies.js';

const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);
const t = (k: unknown): string => defs.text(String(k));

interface Sample {
  readonly troops: number;
  readonly supply: number;
  readonly cleared: number;
  readonly attrs: Readonly<Record<Attr, number>>;
  readonly died: boolean;
}
const samples = new Map<string, Sample[]>();

function run(runSeed: number, policy: AgentPolicy): void {
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
    if (s.needsSuperiors) {
      s.assignSuperiors(s.superiorCandidates().slice(0, s.bondQuota()));
      continue;
    }
    if (s.needsCampaign) {
      const chId = String(s.current.progress.chapterId);
      // 配置前先量兩條資源上限 —— 那是官階曲線的直接產物。
      const lim = s.hostLimits();
      const attrs = { ...s.current.attributes.values };
      const cleared = playCampaign(s, policy);
      const key = `${chId}|${policy.name}`;
      const arr = samples.get(key) ?? [];
      arr.push({
        troops: lim.troopsMax, supply: lim.supplyMax, cleared, attrs, died: s.isOver,
      });
      samples.set(key, arr);
      continue;
    }

    s.selectSlot(policy.chooseSlot(s));
    for (;;) {
      const offer = s.pendingEvent;
      if (offer === null) break;
      s.resolveEvent(policy.chooseOption(s, offer));
    }
    s.advance();
  }
}

/**
 * 兩個對照組：**同樣的打法，只有貪心閾值不同。**
 *   risk-averse   軍勢剩六成就收兵
 *   risk-seeking  剩一成二才收兵
 * 兩者的深度差與死亡率差，就是「貪心的定價」那個問題的實測答案。
 */
const PICKED = ['risk-averse', 'focus-martial', 'risk-seeking'];
const chosen = POLICIES.filter((p) => PICKED.includes(p.name));

const N = Number(process.argv[2] ?? 150);
for (let i = 0; i < N; i += 1) {
  for (const p of chosen) run(3000 + i, p);
}

const q = (xs: readonly number[], p: number): number => {
  const s2 = [...xs].sort((a, b) => a - b);
  return s2[Math.min(s2.length - 1, Math.floor(s2.length * p))] ?? 0;
};
const avg = (xs: readonly number[]): number =>
  xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log(`各章戰役的深度與資源分佈　n=${N}`);
console.log('');
console.log('章節'.padEnd(12) + '策略'.padEnd(16)
  + '兵量   糧量 │ 深度 p10/p50/p90  平均 │ 陣亡率 │ 四維');
for (const chId of defs.reader('chapterSequence').all()
  .flatMap((s2) => s2.chapters).map(String)) {
  const ch = defs.reader('chapter').get(chId);
  for (const p of chosen) {
    const xs = samples.get(`${chId}|${p.name}`) ?? [];
    if (xs.length === 0) continue;
    const cl = xs.map((x) => x.cleared);
    const attrLine = ATTRS
      .map((a) => `${t(`attr.${a}.short`)}${avg(xs.map((x) => x.attrs[a])).toFixed(0)}`)
      .join(' ');
    console.log(
      `${t(ch.titleKey).padEnd(8)}${p.name.padEnd(16)}`
      + `${avg(xs.map((x) => x.troops)).toFixed(0).padStart(5)}`
      + `${avg(xs.map((x) => x.supply)).toFixed(0).padStart(7)} │ `
      + `${String(q(cl, 0.1)).padStart(2)}/${String(q(cl, 0.5)).padStart(2)}`
      + `/${String(q(cl, 0.9)).padStart(2)}`
      + `  ${avg(cl).toFixed(2).padStart(5)} │ `
      + `${((xs.filter((x) => x.died).length / xs.length) * 100).toFixed(1).padStart(5)}% │ `
      + attrLine,
    );
  }
}
