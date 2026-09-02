// ㉛ 平衡模擬器。headless 跑 N 次 Run，輸出分佈統計（31）。
// 執行：npm run sim -- [runs] [policy]
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyMeta, emptyDraft } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import type { Attr, GlowTier, Rarity } from '../src/contracts/core/primitives.js';
import { ATTRS, RARITIES } from '../src/contracts/core/primitives.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { POLICIES, playCampaign, type AgentPolicy } from './lib/policies.js';

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
  readonly merit: { civil: number; martial: number };
  readonly glow: Record<string, number>;
  /** 抽出的委託稀有度分佈。光階是否真的換到「更大的事」，看這裡。 */
  readonly rarity: Record<string, number>;
  /** 武將事件的觸發次數。舊制實測 0.13–0.45 次/輪，等於不存在。 */
  readonly notableEvents: number;
  /** 本輪各道具獲得次數。第二次以後才是碎片 —— 兩個數字都要看得到。 */
  readonly items: Readonly<Record<string, number>>;
  readonly itemFragments: number;
  /** 委託旗標亮起的比例。它是「功績收入由玩家決定」的直接度量。 */
  readonly commissionHits: number;
  readonly totalTurns: number;
  /** 新制的核心度量：這一輪把回合投在哪幾維。 */
  readonly byAttr: Record<string, number>;
  /**
   * 戰役的深度（33）★ 新制的核心度量。
   *
   * 舊制量「大檢定過不過」，那是二元的。現在要量的是【走了多深】——
   * 那是玩家的貪心與他的配置一起決定的，也是獎勵曲線該不該再陡的依據。
   */
  readonly stagesCleared: number;
  readonly campaigns: number;
  /** 本輪學了幾條特質、幾招技能。經驗分配那條新軸線的直接度量。 */
  readonly traits: number;
  readonly skills: number;
  /**
   * 一輪【產出】的經驗總量 ＝ 已花 ＋ 手上剩的。
   *
   * 這是整套兌換經濟的分母：若它大到四維都練得滿、特質都買得起，
   * 「S 級空手 對 A 級帶特質」那個決策就消失了（32 §4.1）。
   */
  readonly expTotal: number;
  readonly expUnspent: number;
  readonly failedAt: string | null;
}

function runOnce(policy: AgentPolicy, runSeed: number, meta: MetaState): RunRecord {
  const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(runSeed));
  let commissionHits = 0;
  const glow: Record<string, number> = { none: 0, silver: 0, gold: 0, red: 0 };
  const rarity: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let notableEvents = 0;
  let totalTurns = 0;
  let stagesCleared = 0;
  let campaigns = 0;
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
    if (s.needsCampaign) {
      const chapterId = String(s.current.progress.chapterId);
      const cleared = playCampaign(s, policy);
      stagesCleared += cleared;
      campaigns += 1;
      if (s.isOver) failedAt = `${chapterId}/第${cleared + 1}關`;
      continue;
    }

    totalTurns += 1;

    // 一個回合三拍：固定事件 → 委託（旗標為真才有）→ 人物事件（同理）。
    const pick = policy.chooseSlot(s);
    if (s.current.turn.slots[pick]?.hasCommission === true) commissionHits += 1;
    s.selectSlot(pick);
    const result = s.current.turn.training;
    if (result !== null) glow[result.finalGlow] = (glow[result.finalGlow] ?? 0) + 1;

    let inner = 0;
    for (;;) {
      const offer = s.pendingEvent;
      if (offer === null) break;
      inner += 1;
      if (inner > 8) throw new Error('事件佇列未收斂 —— 追加事件可能形成環');
      const def = defs.reader('event').get(String(offer.eventDefId));
      if (def.trigger.kind === 'notable') notableEvents += 1;
      else rarity[String(offer.rarity)] = (rarity[String(offer.rarity)] ?? 0) + 1;
      s.resolveEvent(policy.chooseOption(s, offer));
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
    merit: { civil: st.currencies.merit.civil, martial: st.currencies.merit.martial },
    glow,
    rarity,
    notableEvents,
    items: { ...st.items.count },
    itemFragments: Object.values(st.items.count)
      .reduce((sum, n) => sum + Math.max(0, n - 1), 0),
    commissionHits,
    totalTurns,
    byAttr: { ...st.actions },
    stagesCleared,
    campaigns,
    traits: st.abilities.traits.length,
    skills: st.abilities.skills.length,
    expTotal: ATTRS.reduce((n, a) => n + st.growth.exp[a] + st.growth.spent[a], 0),
    expUnspent: ATTRS.reduce((n, a) => n + st.growth.exp[a], 0),
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
  const rarTotal: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of recs) for (const k of Object.keys(rarTotal)) {
    rarTotal[k] = (rarTotal[k] ?? 0) + (r.rarity[k] ?? 0);
  }
  const rarSum = Object.values(rarTotal).reduce((a, b) => a + b, 0);

  const itemTotal = new Map<string, number>();
  for (const r of recs) {
    for (const [k, v] of Object.entries(r.items)) {
      itemTotal.set(k, (itemTotal.get(k) ?? 0) + v);
    }
  }
  const byEnding = new Map<string, number>();
  for (const r of recs) byEnding.set(r.endingId, (byEnding.get(r.endingId) ?? 0) + 1);

  console.log(`── ${policy.name} ${'─'.repeat(Math.max(0, 44 - policy.name.length))}`);
  console.log(`  圓夢率 ${pct(full.length, recs.length)}`
    + `　通過章節 平均 ${avg(chapters).toFixed(2)} / p50 ${p(chapters, 0.5)} / p95 ${p(chapters, 0.95)}`);
  console.log(`  輪迴點數 平均 ${avg(recs.map((r) => r.points)).toFixed(0)}`
    + `　官階 文 ${avg(recs.map((r) => r.career.civil)).toFixed(1)}`
    + ` 武 ${avg(recs.map((r) => r.career.martial)).toFixed(1)}`);
  console.log(`  四維終值 ${ATTRS.map((a: Attr) => `${defs.text(`attr.${a}.short`)} `
    + `${avg(recs.map((r) => r.attrs[a] ?? 0)).toFixed(0)}`).join(' ')}`
    + `　功績 文 ${avg(recs.map((r) => r.merit.civil)).toFixed(0)}`
    + ` 武 ${avg(recs.map((r) => r.merit.martial)).toFixed(0)}`
);
  console.log(`  光階分佈 ${(['none', 'silver', 'gold', 'red'] as GlowTier[])
    .map((g) => `${g} ${pct(glowTotal[g] ?? 0, glowSum)}`).join('  ')}`);
  console.log(`  委託稀有度 ${RARITIES.filter((r: Rarity) => (rarTotal[String(r)] ?? 0) > 0)
    .map((r: Rarity) => `★${r} ${pct(rarTotal[String(r)] ?? 0, rarSum)}`).join('  ')}`);
  console.log(`  回合配比 ${ATTRS.map((a: Attr) => `${defs.text(`attr.${a}.short`)} `
    + `${avg(recs.map((r) => r.byAttr[a] ?? 0)).toFixed(1)}`).join(' ／ ')}`
    + `　武將事件 ${avg(recs.map((r) => r.notableEvents)).toFixed(2)} 次/輪`);
  /**
   * 道具那一行 ★
   *
   * 【獲得次數】與【碎片】必須分開看：碎片＝第二次以後的獲得。
   * 高階道具一輪一次，因此它的碎片只可能來自攜帶進場 ——
   * 這一行為 0 就代表攜帶格的取捨在實際產出上不存在。
   */
  const itemLine = [...itemTotal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, v]) => `${defs.text(defs.reader('item').get(k).nameKey)} ${(v / recs.length).toFixed(2)}`)
    .join('  ');
  console.log(`  委託命中 ${pct(recs.reduce((a, r) => a + r.commissionHits, 0),
    recs.reduce((a, r) => a + r.totalTurns, 0))}`
    + `　道具 ${avg(recs.map((r) => Object.values(r.items).reduce((a, b) => a + b, 0))).toFixed(2)} 件/輪`
    + `（碎片 ${avg(recs.map((r) => r.itemFragments)).toFixed(2)}）`);
  if (itemLine !== '') console.log(`  最常掉 ${itemLine}`);

  console.log(`  戰役深度 平均 ${avg(recs.map((r) => (r.campaigns === 0 ? 0
    : r.stagesCleared / r.campaigns))).toFixed(2)} 關/場`
    + `　（共 ${avg(recs.map((r) => r.stagesCleared)).toFixed(1)} 關 / `
    + `${avg(recs.map((r) => r.campaigns)).toFixed(1)} 場）`
    + `　特質 ${avg(recs.map((r) => r.traits)).toFixed(1)}`
    + ` 技能 ${avg(recs.map((r) => r.skills)).toFixed(1)}`);
  console.log(`  經驗總量 ${avg(recs.map((r) => r.expTotal)).toFixed(0)}`
    + `（未花 ${avg(recs.map((r) => r.expUnspent)).toFixed(0)}）`);

  const top = [...byEnding.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  console.log(`  結局 ${top.map(([k, v]) => `${k.replace('ending:', '')} ${pct(v, recs.length)}`).join('  ')}`);
  console.log('');
}
