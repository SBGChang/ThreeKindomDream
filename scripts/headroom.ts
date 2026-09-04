// 第一輪 對 全滿的天命：**跨輪投資到底買到多少？**
//
// 這是 RFC-01 §5「⬜ 19. 第二輪以後沒有量過」那一條。
// 玩家兩次回報「第一輪就爬到很高的位置、沒有提升的樂趣」——
// 而「太高」與「後面沒東西」是同一個問題的兩種說法，
// 只有把兩端一起量出來才分得清是哪一種。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { shopLimits } from '../src/modules/shop.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import type { AptitudeGrade, Attr } from '../src/contracts/core/primitives.js';
import { ATTRS } from '../src/contracts/core/primitives.js';
import { heldItems } from '../src/modules/item.js';
import { POLICIES, playCampaign } from './lib/policies.js';
import type { DreamEntryConfig, MetaState } from '../src/contracts/core/state.js';
import type { DefinitionRegistry } from '../src/data-runtime/registry.js';

const RUNS = Number(process.argv[2] ?? 60);

const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);

/** 天命商店全買、名士全滿星 —— 跨輪投資的上界。 */
const maxedMeta = (): MetaState => {
  const base = emptyMeta();
  const purchased: Record<string, number> = {};
  for (const it of defs.reader('shopItem').all()) {
    purchased[String(it.item)] = it.levels.length;
  }
  const codex: Record<string, { star: number; fragments: number; unlocked: boolean }> = {};
  const tiers = defs.single('notableStar').tiers;
  for (const n of defs.reader('notable').all()) {
    codex[String(n.notableId)] = { star: tiers.length - 1, fragments: 0, unlocked: true };
  }
  return {
    ...base,
    points: 999999,
    shop: { purchased },
    notableCodex: codex as MetaState['notableCodex'],
  };
};

/**
 * 把資質配點【全部押在主維】，其餘三維砍到 F 換點數。
 *
 * ★ 這一段不能偷懶寫成「全部拉到上限」—— 那會量出一個玩家做不到的狀態。
 * 資質配點是有限的（商店買滿 10 點），而升到 S 要 14 點，
 * 所以想摸到 S 就【必須】把另外三維砍到 F（每維退回 +2 點）。
 * 那個取捨正是資質這條線的內容，量測必須把它算進去。
 */
const bestDraft = (
  meta: MetaState, reg: DefinitionRegistry, bias: Attr,
): DreamEntryConfig => {
  const draft = emptyDraft(meta, reg);
  const cost = reg.single('aptitudeCost');
  const caps = shopLimits(meta, reg).aptitudeCaps;
  const budget = shopLimits(meta, reg).aptitudePoints;

  const apt: Record<string, AptitudeGrade> = { ...draft.aptitudes };
  let pool = budget;
  // 一、其餘三維砍到 F，把點數換出來
  for (const a of ATTRS) {
    if (a === bias) continue;
    apt[a] = 'F';
    pool -= cost.cumulativeCost.F;
  }
  // 二、主維買到買得起的最高階（受商店解放的上限限制）
  for (const g of ['S', 'A', 'B', 'C'] as const) {
    if (APT_ORDER.indexOf(g) > APT_ORDER.indexOf(caps[bias])) continue;
    if (cost.cumulativeCost[g] <= pool) { apt[bias] = g; break; }
  }
  const talents = reg.reader('talent').all();
  return {
    ...draft,
    aptitudes: apt as Record<Attr, AptitudeGrade>,
    talents: talents.map((x) => x.talentId).slice(0, 8),
  };
};

const APT_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;

interface Row {
  rank: number; best: number; attrs: number[]; traits: number; skills: number;
  items: number; depth: number; points: number; full: boolean;
}

const play = (meta: MetaState, name: string): Row[] => {
  const policy = POLICIES.find((x) => x.name === name);
  if (policy === undefined) throw new Error(name);
  const out: Row[] = [];
  for (let r = 0; r < RUNS; r += 1) {
    const cfg = meta.points > 0
      ? bestDraft(meta, defs, name === 'focus-martial' ? 'war' : 'lead')
      : emptyDraft(meta, defs);
    const s = Session.start(w, meta, cfg, mkSeed(4000 + r));
    let guard = 0;
    let cleared = 0;
    let fights = 0;
    while (!s.isOver && guard < 200) {
      guard += 1;
      if (s.needsFactionChoice) {
        const o = s.factionOptions().filter((x) => x.eligible)[0];
        if (o === undefined) { s.noFactionAvailable(); continue; }
        s.chooseFaction(o.factionId);
        continue;
      }
      if (s.needsSuperiors) { s.assignSuperiors([]); continue; }
      if (s.needsCampaign) { cleared += playCampaign(s, policy); fights += 1; continue; }
      s.selectSlot(policy.chooseSlot(s));
      let g2 = 0;
      while (s.pendingEvent !== null) {
        g2 += 1;
        if (g2 > 8) break;
        const offer = s.pendingEvent;
        const want = policy.chooseOption(s, offer);
        const idx = offer.optionStates[want]?.enabled === true
          ? want : offer.optionStates.findIndex((o) => o.enabled);
        s.resolveEvent(idx);
      }
      s.advance();
    }
    const attrs = ATTRS.map((a) => s.current.attributes.values[a]);
    out.push({
      rank: Math.max(s.current.career.civil, s.current.career.martial),
      best: Math.max(...attrs),
      attrs,
      traits: s.current.abilities.traits.length,
      skills: s.current.abilities.skills.length,
      items: heldItems({ state: s.current, defs }).length,
      depth: fights === 0 ? 0 : cleared / fights,
      points: s.settle(meta).pointsGained,
      full: s.current.ending?.isFullDream === true,
    });
  }
  return out;
};

const avg = (xs: readonly number[]): number =>
  (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const p = (n: number, w2 = 6): string => n.toFixed(1).padStart(w2);

for (const name of ['focus-martial', 'encounter-chaser']) {
  console.log(`\n══ ${name}　${RUNS} 輪 ══`);
  console.log('           官階  最高維   四維          特質  技能  道具  深度   點數');
  for (const [label, meta] of [['第一輪', emptyMeta()], ['天命全滿', maxedMeta()]] as const) {
    const rows = play(meta, name);
    console.log(
      `${label.padEnd(9)}${p(avg(rows.map((x) => x.rank)), 5)}`
      + `${p(avg(rows.map((x) => x.best)), 8)}`
      + `　${ATTRS.map((_, k) => p(avg(rows.map((x) => x.attrs[k] ?? 0)), 4)).join('')}`
      + `${p(avg(rows.map((x) => x.traits)), 6)}${p(avg(rows.map((x) => x.skills)), 6)}`
      + `${p(avg(rows.map((x) => x.items)), 6)}${p(avg(rows.map((x) => x.depth)), 6)}`
      + `${p(avg(rows.map((x) => x.points)), 8)}`,
    );
  }
}
