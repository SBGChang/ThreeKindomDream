// 端到端 smoke test：跑一整輪，逐回合印出實際發生的事。
// 這是「灰盒能不能玩」的最小驗收，也是 UI 之外的第二個驗證面。
import { compose } from '../src/app/composition.js';
import { Session } from '../src/app/session.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed as mkSeed } from '../src/contracts/core/ids.js';
import { ATTRS } from '../src/contracts/core/primitives.js';
import { stageOf } from '../src/modules/roster-query.js';
import { POLICIES } from './lib/policies.js';

/** 替身玩家 ＝ 專精武路那條策略。與模擬器共用同一份行為，不另寫一套。 */
const policy = POLICIES.find((x) => x.name === 'focus-martial') ?? POLICIES[0];
if (policy === undefined) throw new Error('沒有可用的策略');

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
  if (s.needsCampaign) {
    const ch = defs.reader('chapter').get(String(s.current.progress.chapterId));
    // 先花經驗、再配置、然後一關一關打。走留的判準只有一條：軍勢還剩幾成。
    policy.spend(s);
    const lo = policy.chooseLoadout(s);
    s.configureCampaign(lo);
    const lim = s.hostLimits();
    console.log(`【戰役 ${t(ch.titleKey)}】兵量 ${lim.troopsMax}　糧量 ${lim.supplyMax}`);
    console.log(`  四維 ${ATTRS.map((a) => `${t(`attr.${a}.short`)}${s.current.attributes.values[a]}`
      + `(${s.gradeOf(a)})`).join(' ')}`);
    console.log(`  帶招 ${lo.skills.map((x) => t(defs.reader('skill').get(String(x)).nameKey)).join('／') || '無'}`);
    console.log(`  特質 ${s.current.abilities.traits
      .map((x) => t(defs.reader('trait').get(String(x)).nameKey)).join('／') || '無'}`);
    console.log(`  指揮 ${lo.commanders.map((c) => {
      const nd = defs.reader('notable').get(String(c.notableId));
      return `${t(nd.nameKey)}(${stageOf(c.notableId, s.ctx)}·`
        + `${t(defs.reader('skill').get(String(c.skillId)).nameKey)})`;
    }).join('　') || '無'}`);

    for (let k = 0; k < 12; k += 1) {
      const nx = s.nextStage();
      if (nx === null || !policy.chooseEngage(s)) break;
      const bossName = nx.boss === null ? '雜兵' : t(nx.boss.nameKey);
      const out = s.engage();
      const st = s.current.campaign;
      console.log(`  第${nx.index + 1}關 ${bossName}`
        + ` 敵 ${nx.enemyTroops}／輸出 ${nx.enemyDamage}`
        + ` → ${out.cleared ? '通過' : '敗'}`
        + ` 軍勢 ${out.host.troops}/${out.host.troopsMax}`
        + ` 糧 ${out.host.supply}　${out.log.length} 條戰報`);
      if (out.defeated) break;
      void st;
    }
    if (!s.isOver) {
      const cleared = s.current.campaign?.clearedStages ?? 0;
      s.withdraw();
      console.log(`  收兵 —— 保住 ${cleared} 關的獎勵`
        + `　官階 文${s.current.career.civil} 武${s.current.career.martial}`);
      console.log('');
    } else {
      console.log('  夢醒。');
    }
    continue;
  }

  // 一個回合兩拍（15 §2）：投入固定事件 → 清空它引出的事件佇列。
  // 替身玩家專精【武路的主屬性】，委託一律選期望值最高的選項。
  const turn = String(s.current.progress.turn).padStart(2, ' ');
  const best = policy.chooseSlot(s);
  const slot = s.current.turn.slots[best];
  // 四項全中是那一回合的高光：雙驚嘆號 ＋ 金光以上 ＋ 有人站（15 §3.3）
  const pv = s.previewTraining(best);
  const pile = slot?.notables.length ?? 0;
  const flags = `${pv.hasCommission ? '!' : ''}${pv.hasEncounter ? '?' : ''}`;
  const burst = pv.hasCommission && pv.hasEncounter && pile > 0
    ? `　★${pile} 人同格 ${flags}★` : (flags === '' ? '' : `　${flags}`);

  s.selectSlot(best);
  const r = s.current.turn.training;
  console.log(`R${turn} 【${t(slot?.labelKey)}】${t(`glow.${slot?.baseGlow}`)}`
    + `${r?.upgraded === true ? '⬆' : ' '}→${t(`glow.${r?.finalGlow}`)}`
    + ` ${t(`attr.${r?.attr}.short`)}+${r?.expGained}`
    + ` ${t(`merit.${r?.meritGained.line}`)}+${r?.meritGained.amount}${burst}`);

  // 佇列可能有兩則：委託，以及同台名士追加的武將事件。
  for (;;) {
    const offer = s.pendingEvent;
    if (offer === null) break;
    const def = defs.reader('event').get(String(offer.eventDefId));
    const on = offer.optionStates
      .map((o, i) => ({ i, o }))
      .filter((x) => x.o.enabled);
    const ev = (x: typeof on[number]): number =>
      x.o.meritPreview.reduce((a, m) => a + m.amount, 0)
      * (0.4 + 0.6 * (x.o.successRate ?? 1));
    const first = on[0];
    if (first === undefined) throw new Error('事件無可選項');
    const pick = on.reduce((b, x) => (ev(x) > ev(b) ? x : b), first);
    const tag = def.trigger.kind === 'notable' ? '名士' : `★${offer.rarity}`;
    s.resolveEvent(pick.i);
    const res = s.current.turn.resolved.at(-1);
    const gained = (res?.practiceExp ?? [])
      .map((g) => `${t(`attr.${g.attr}.short`)}+${g.amount}`).join(' ');
    const got = (res?.meritGained ?? [])
      .map((m) => `${t(`merit.${m.line}`)}+${m.amount}`).join(' ');
    console.log(`      └ [${tag}] ${t(def.titleKey)}·${t(def.options[pick.i]?.labelKey)}`
      + ` ${res?.passed === true ? '成' : '敗'}`
      + `　${got === '' ? '—' : got}　磨練 ${gained === '' ? '—' : gained}`);
  }

  s.advance();
}

const st = s.current;
console.log('');
console.log(`【${t(st.ending?.titleKey)}】${t(st.ending?.bodyKey)}`);
console.log('  四維 ' + ATTRS.map((a) => `${t(`attr.${a}.short`)}${st.attributes.values[a]}`).join(' '));
console.log(`  功績 文${st.currencies.merit.civil} 武${st.currencies.merit.martial}`);
console.log(`  官階 文${st.career.civil} 武${st.career.martial}　通過章節 ${st.progress.chaptersPassed}`);
console.log('  回合配比 ' + ATTRS.map((a) => `${t(`attr.${a}.short`)} ${st.actions[a]}`).join(' ／ '));
console.log('  好感：' + st.roster.members
  .map((m) => `${t(defs.reader('notable').get(String(m.notableId)).nameKey)} ${t(`stage.${stageOf(m.notableId, s.ctx)}`)}(${m.affinity})`)
  .join('　'));
const res = s.settle(meta);
console.log(`  輪迴點數 +${res.pointsGained}`);
console.log('  碎片：' + (Object.entries(res.notableFragments).length === 0 ? '無'
  : Object.entries(res.notableFragments)
    .map(([id, n]) => `${t(defs.reader('notable').get(id).nameKey)} ${n}`
      + (res.starRaised[id] === undefined ? '' : ` (升星+${res.starRaised[id]})`))
    .join('　')));
