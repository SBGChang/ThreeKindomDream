// 敵人輸出的【單一校準常數】—— 掃描 k，找出讓無星停在第 2–3 關的那一個。
//
// ── 為什麼需要這個常數 ★ ────────────────────────────
// `config/battle.ts` 的敵人曲線是從對標表**解出來**的（D64），閉式解是：
//
//   一路打到第 K 關吃到的傷害 ＝ (兵力基準 × 輸出基準 / 我方輸出) × cum(K)
//
// 那個閉式解漏掉三件會**加重**玩家負擔的事，而且三件都難以解析地寫進去：
//   1. 關底敵將【每回合多打一下】，而且那一下也乘 dmgBase
//   2. 兵量掉下去之後我方輸出跟著掉 —— 死亡螺旋，閉式解假設輸出恆定
//   3. 「有效軍勢」裡的糧秣要花招式格去換，那些回合不輸出
//
// 所以：**形狀（章節間的比例、關與關的斜率）由推導決定，
// 絕對高度由這一個常數決定。** 一個常數，量出來的，不是憑感覺調的。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import type { ContentRepository } from '../src/data-runtime/loader.js';
import type { MetaState } from '../src/contracts/core/state.js';
import { POLICIES } from './lib/policies.js';

const RUNS = Number(process.argv[2] ?? 24);
const KS = (process.argv[3] ?? '1,0.5,0.35,0.25,0.2,0.15')
  .split(',').map(Number);

/**
 * 把敵人曲線【在載入時】乘上 k —— 不改檔、不重編。
 * `ContentRepository` 只是 `read(path) => string`，所以包一層就能改。
 */
const scaled = (k: number, troopsK: number): ContentRepository => {
  const disk = diskRepository();
  return {
    read: (path) => {
      const raw = disk.read(path);
      if (!path.endsWith('core/defs.json')) return raw;
      // defs.json 是【扁平陣列】，不是照 kind 分組的物件 —— 踩過一次。
      const json = JSON.parse(raw) as Record<string, unknown>[];
      for (const b of json) {
        if (b['kind'] !== 'battleRule') continue;
        b['enemyDamageByChapter'] = (b['enemyDamageByChapter'] as number[])
          .map((x) => Math.round(x * k));
        b['enemyTroopsByChapter'] = (b['enemyTroopsByChapter'] as number[])
          .map((x) => Math.round(x * troopsK));
      }
      return JSON.stringify(json);
    },
  };
};

const starMeta = (star: number, defs: ReturnType<typeof mk>['defs']): MetaState => {
  const base = emptyMeta();
  if (star <= 0) return base;
  const codex: Record<string, { star: number; fragments: number; unlocked: boolean }> = {};
  for (const n of defs.reader('notable').all()) {
    codex[String(n.notableId)] = { star, fragments: 0, unlocked: true };
  }
  return { ...base, notableCodex: codex as MetaState['notableCodex'] };
};

function mk(repo: ContentRepository) {
  const loaded = loadContent(repo);
  if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
  return { defs: loaded.registry, w: compose(loaded.registry) };
}

interface Row { depth: number; lost: boolean; turns: number; full: number }
/** 每一章分開記【打到第幾關】—— 平均值會把「前段碾、後段拚」抹平。 */
const byChapter: number[][] = [[], [], [], []];

const play = (w: ReturnType<typeof mk>['w'], meta: MetaState): Row[] => {
  const policy = POLICIES.find((x) => x.name === 'greedy-gain');
  if (policy === undefined) throw new Error('no policy');
  const out: Row[] = [];
  for (let r = 0; r < RUNS; r += 1) {
    const s = Session.start(w, meta, emptyDraft(meta, w.defs), mkSeed(7000 + r));
    let guard = 0; let cleared = 0; let fights = 0; let lost = false; let turns = 0;
    let full = 0;
    while (!s.isOver && guard < 220) {
      guard += 1;
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
        let here = 0;
        // ★ 一路按下去 —— 真人的玩法（戰敗只掉一半，D54）。
        for (let i = 0; i < 8; i += 1) {
          if (s.nextStage() === null) break;
          const res = s.engage();
          turns += res.log.filter((l) => l.actor === 'enemy' && l.skillKey === null).length;
          if (res.defeated) { lost = true; break; }
          cleared += 1; here += 1;
        }
        if (here >= 7) full += 1;
        byChapter[Math.min(3, fights - 1)]?.push(here);
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
      depth: fights === 0 ? 0 : cleared / fights, lost,
      turns: turns / Math.max(1, cleared),
      full: fights === 0 ? 0 : full / fights,
    });
  }
  return out;
};

const avg = (xs: readonly number[]): number =>
  (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const p = (n: number, w2 = 6): string => n.toFixed(2).padStart(w2);

const TROOPS_K = Number(process.argv[4] ?? 1);
console.log(`敵人輸出校準　${RUNS} 輪／組　兵力係數 ×${TROOPS_K}`);
console.log('目標：無星 ≈ 2.5 關、4–5★ ≈ 7 關');
console.log('');
// 「穩定過第七關」是玩家講的話 —— 平均深度會被 7 這個天花板壓平，
// 所以真正要看的是【七關全清率】：一場戰役有多少比例是打完七關的。
console.log('   k   　深度（無／3★／4★／5★）　　七關全清率（無／3★／4★／5★）');
for (const k of KS) {
  const { defs, w } = mk(scaled(k, TROOPS_K));
  const rows: Row[][] = [];
  const chap: number[][][] = [];
  for (const st of [0, 3, 4, 5]) {
    for (const b of byChapter) b.length = 0;
    rows.push(play(w, starMeta(st, defs)));
    chap.push(byChapter.map((b) => [...b]));
  }
  console.log(
    `${k.toFixed(2).padStart(5)}  `
    + rows.map((r) => p(avg(r.map((x) => x.depth)))).join('')
    + '   '
    + rows.map((r) => `${(avg(r.map((x) => x.full)) * 100).toFixed(0).padStart(5)}%`).join(''),
  );
  for (const [i, st] of [0, 3, 4, 5].entries()) {
    console.log(
      `        ${st === 0 ? '無星' : `${st}★  `} 每章打到　`
      + (chap[i] ?? []).map((b, c) => `第${c + 1}章 ${avg(b).toFixed(1)}關`).join('　'),
    );
  }
}
