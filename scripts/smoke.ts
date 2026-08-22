// 端到端 smoke test：跑一整輪，逐回合印出實際發生的事。
// 這是「灰盒能不能玩」的最小驗收，也是 UI 之外的第二個驗證面。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import { SLOT_INDICES, type SlotIndex } from '../src/contracts/core/primitives.js';
import { stageOf } from '../src/modules/roster-query.js';

const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }
const defs = loaded.registry;
const w = compose(defs);
const t = (k: unknown): string => defs.text(String(k));

const meta = emptyMeta();
const s = Session.start(w, meta, emptyDraft(meta, defs), mkSeed(Number(process.argv[2] ?? 4242)));

console.log('陣容：' + s.current.roster.members
  .map((m) => `${t(defs.reader('notable').get(String(m.notableId)).nameKey)}(${m.affinity})`)
  .join('　'));
console.log('');

let guard = 0;
while (!s.isOver && guard < 200) {
  guard += 1;

  if (s.needsFactionChoice) {
    const opt = s.factionOptions().filter((o) => o.eligible)[0];
    if (opt === undefined) { s.noFactionAvailable(); continue; }
    console.log(`\n【選陣營】→ ${t(opt.nameKey)}`);
    s.chooseFaction(opt.factionId);
    continue;
  }
  if (s.needsSuperiors) {
    const quota = s.bondQuota();
    s.assignSuperiors(s.superiorCandidates().slice(0, quota));
    console.log('【入朝】上司：' + s.current.roster.members.filter((m) => m.origin === 'superior')
      .map((m) => t(defs.reader('notable').get(String(m.notableId)).nameKey)).join('　'));
    console.log(`     官階 文${s.current.career.civil} 武${s.current.career.martial}\n`);
    continue;
  }
  if (s.needsMajorCheck) {
    const ch = defs.reader('chapter').get(String(s.current.progress.chapterId));
    const sortie = s.eligibleSortie().slice(0, defs.single('gameRules').maxSortie);
    const avail = s.availableDifficulties();
    const rows = avail.map((d) => {
      const pv = s.previewMajor(d, sortie);
      return `${t(`difficulty.${d}`)} DC${pv.dc} 值${pv.base}+${pv.bonus} ${(pv.successRate * 100).toFixed(0)}%`;
    });
    // 選成功率 >= 70% 的最高難度
    let pick = avail[0] ?? 'safe';
    for (const d of avail) if (s.previewMajor(d, sortie).successRate >= 0.7) pick = d;
    console.log(`\n【大檢定 ${t(ch.titleKey)}】 ${rows.join('　│　')}`);
    const ok = s.attemptMajor(pick, sortie);
    const log = s.current.lastMajorCheck;
    console.log(`  選 ${t(`difficulty.${pick}`)} → ${ok ? '通過' : '失敗'}`
      + `（${log?.base}+${log?.bonus}+骰${log?.roll}=${log?.total} vs DC${log?.dc}）\n`);
    continue;
  }

  // 一回合恰好一個動作（15 §2）。這裡的替身玩家走【校準出來的參考打法】：
  // 約四回合拿一回合去做事，其餘專精主檢定屬性 —— 平衡掃描顯示這一帶點數最高。
  // 別把門檻設成「有好事件就做」：事件的成功率在早期比鍛鍊穩，
  // 那條規則會退化成「從不鍛鍊」，然後在第一場大檢定原地陣亡。
  const offers = s.current.slots.event.offers;
  const wantsEvent = s.current.progress.turn % 4 === 0;
  const cand = !wantsEvent ? undefined : offers.flatMap((o, oi) => o.optionStates
    .map((st, ii) => ({ oi, ii, rate: st.successRate ?? 1, on: st.enabled })))
    .filter((x) => x.on && x.rate >= 0.5).sort((a, b) => b.rate - a.rate)[0];

  const turn = String(s.current.progress.turn).padStart(2, ' ');
  if (cand === undefined) {
    const primary = s.majorCheck().primaryAttr;
    let best: SlotIndex = 0;
    let bestGain = -Infinity;
    for (const i of SLOT_INDICES) {
      const slotAt = s.current.slots.training.slots[i];
      if (slotAt === undefined) continue;
      const g = (slotAt.attr === primary ? 100000 : 0) + s.previewTraining(i).expectedGain;
      if (g > bestGain) { bestGain = g; best = i; }
    }
    const slot = s.current.slots.training.slots[best];
    // 名士相乘的爆發時刻要看得見（19 §5.2）—— 全員擠一格是本作的高光
    const mul = s.previewTraining(best).notableMultiplier;
    const pile = slot?.notables.length ?? 0;
    const burst = pile > 2 ? `　★${pile} 人同格 ×${mul.toFixed(2)}★` : '';
    s.selectTraining(best);
    const r = s.current.slots.training.result;
    console.log(`R${turn} 【練】${t(slot?.labelKey)} ${t(`glow.${slot?.baseGlow}`)}`
      + `${r?.upgraded === true ? '⬆' : ' '}→${t(`glow.${r?.finalGlow}`)}`
      + ` ${t(`attr.${r?.attr}.short`)}+${r?.attrGained}`
      + `${burst}　│ 事件 ${offers.length} 個未取`);
  } else {
    const def = defs.reader('event').get(String(offers[cand.oi]?.eventDefId));
    const out = s.selectEvent(cand.oi, cand.ii);
    const gained = out.practiceGained
      .map((g) => `${t(`attr.${g.attr}.short`)}+${g.amount}`).join(' ');
    console.log(`R${turn} 【辦】${t(def.titleKey)}·${t(def.options[cand.ii]?.labelKey)}`
      + ` ${out.passed ? '成' : '敗'}　磨練 ${gained === '' ? '—' : gained}`);
  }
  s.advance();
}

const st = s.current;
console.log('');
console.log(`【${t(st.ending?.titleKey)}】${t(st.ending?.bodyKey)}`);
console.log(`  四維 武${st.attributes.values.war} 智${st.attributes.values.int}`
  + ` 政${st.attributes.values.pol} 魅${st.attributes.values.cha}`);
console.log(`  名聲 文${st.currencies.fame.civil} 武${st.currencies.fame.martial}`
  + ` 善惡${st.currencies.fame.moral}`
  + `　功績 文${st.currencies.merit.civil} 武${st.currencies.merit.martial}`);
console.log(`  官階 文${st.career.civil} 武${st.career.martial}　通過章節 ${st.progress.chaptersPassed}`);
console.log(`  回合配比 練 ${st.actions.training} ／ 辦事 ${st.actions.event}`);
console.log('  好感：' + st.roster.members
  .map((m) => `${t(defs.reader('notable').get(String(m.notableId)).nameKey)} ${t(`stage.${stageOf(m.notableId, s.ctx)}`)}(${m.affinity})`)
  .join('　'));
const res = s.settle(meta);
console.log(`  輪迴點數 +${res.pointsGained}`);
console.log('  碎片：' + (Object.entries(res.notableFragments).length === 0 ? '無'
  : Object.entries(res.notableFragments)
    .map(([id, n]) => `${t(defs.reader('notable').get(id).nameKey)} ${n}`
      + (res.affinityRaised[id] === undefined ? '' : ` (初始好感+${res.affinityRaised[id]})`))
    .join('　')));
