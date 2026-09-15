/** Summarize genuine real-time journeys without replaying or altering their state. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = process.argv[2] ?? 'artifacts/gameplay-audit/rebalance-v2';
const destination = process.argv[3] ?? 'docs/narrative/realtime-progression-metrics.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const groups = Object.fromEntries(['fresh','journeys','collection','controls'].map(group =>
  [group, read(`${root}/${group}/summary.json`).journeys.map(j => read(`${root}/${group}/${j.id}.json`))]));
const all = Object.values(groups).flat(), lives = all.flatMap(j => j.lives);
const range = values => values.length ? [Math.min(...values), Math.max(...values)] : null;
const stats = values => ({ n:values.length, range:range(values), mean:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length) });
const fresh = groups.fresh.flatMap(j => j.lives);
const freshChapters = fresh[0].depths.map((_, i) => {
  const depths = fresh.map(l => l.depths[i]);
  return {chapter:i+1,...stats(depths),clearedFour:depths.filter(n=>n>=4).length,clearedFive:depths.filter(n=>n>=5).length};
});
const maxStar = l => Math.max(0,...Object.values(l.notableCodex).map(n=>n.star));
const modes = [...new Set(groups.journeys.map(j=>j.mode))].map(mode => {
  const journeys = groups.journeys.filter(j=>j.mode===mode);
  return {mode,profiles:journeys.length,lives:journeys.reduce((n,j)=>n+j.lives.length,0),
    firstFive:journeys.map(j=>j.lives.find(l=>maxStar(l)===5)?.life??null),
    firstHighest:journeys.map(j=>j.lives.find(l=>mode==='balanced'?l.topNarrative&&l.rankSummit:
      l.ending===(mode==='wei-focus-civil'?'ending:chancellor':mode==='wei-focus-martial'?'ending:grand-general':'ending:pillar'))?.life??null),
    firstLifeIncome:stats(journeys.map(j=>j.lives[0].points)),
    firstLifeAttributes:Object.fromEntries(['lead','war','int','pol'].map(attr=>[attr,stats(journeys.map(j=>j.lives[0].chapters.at(-1).attributes[attr]))])),
    endings:[...new Set(journeys.flatMap(j=>j.finalMeta.collection.reachedEndings))]};
});
const definitions = ['core','wei','shu'].flatMap(pack=>read(`content/${pack}/defs.json`));
const shops = definitions.filter(d=>d.kind==='shopItem');
const collection = groups.collection.map(j=>({id:j.id,
  firstCoreEntry:j.lives.find(l=>Object.values(l.config.aptitudes).filter(g=>g==='A'||g==='S').length>=3&&l.config.careerCap>=10)?.life??null,
  shopCompleted:j.lives.find(l=>{
    const purchased={...l.metaPurchasesBefore};
    for(const p of l.destinyPurchases)purchased[p.item]=p.level;
    return shops.every(s=>(purchased[s.item]??0)>=s.levels.length);
  })?.life??null}));
const byStars = {};
for (const j of groups.collection) {
  let codex={};
  for (const l of j.lives) {
    for (const c of l.chapters) {
      const average = c.roster.members.reduce((sum,m)=>sum+(codex[m.notableId]?.star??0),0)/c.roster.members.length;
      const key = average===5?'5':average>=4.5?'4.5–<5':average>=4?'4–<4.5':`${Math.floor(average)}–<${Math.floor(average)+1}`;
      const bucket = byStars[key]??={battles:0,clearedSeven:0};
      bucket.battles++;bucket.clearedSeven+=Number(c.cleared>=7);
    }
    codex=l.notableCodex;
  }
}
for (const bucket of Object.values(byStars))bucket.clearRate=bucket.clearedSeven/bucket.battles;
const controls = ['no-battle','no-spend','blind-story'].map(mode=>{
  const runs=groups.controls.filter(j=>j.mode===mode).flatMap(j=>j.lives);
  return {mode,runs:runs.length,firstLifeIncome:stats(runs.filter(l=>l.life===1).map(l=>l.points)),
    points:stats(runs.map(l=>l.points)),highest:runs.filter(l=>l.multiplier===2).length,
    endings:[...new Set(runs.map(l=>l.ending))]};
});
assert(lives.every(l=>maxStar(l)<5||l.life>=12),'A fresh-account general reached five stars too early');
assert(fresh.every(l=>Math.max(...l.depths)<=4),'Fresh-account fifth wave cleared');
assert(freshChapters.reduce((n,c)=>n+c.clearedFour,0)/(fresh.length*freshChapters.length)<=0.1,'Fresh fourth-wave rate exceeds target');
assert(byStars['5'].clearRate>=0.9,'Five-star seven-wave rate below target');
assert(modes.every(m=>m.firstHighest.every(n=>n!==null)),'A tested strategy failed to reach its ending');
assert(collection.every(j=>j.firstCoreEntry>=14&&j.firstCoreEntry<=22&&j.shopCompleted>=49&&j.shopCompleted<=65),'Destiny pace outside budget');
assert(controls.find(c=>c.mode==='no-battle').highest===0,'No-battle highest reward exploit returned');
for (const j of groups.journeys.filter(j=>j.mode==='wei-balanced'))
  assert.equal(j.lives[0].finalStateHash,groups.fresh.find(f=>f.id===j.id).lives[0].finalStateHash,'Identical initial lives diverged');
const result = {
  date:'2026-09-14',root,
  contentManifest:read('content/manifest.json'),
  fingerprints:Object.fromEntries(['scripts/full-journey-audit.ts','src/app/realtime-battle-model.ts','src/modules/settlement.ts','content/core/defs.json','content/shu/defs.json'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
  method:'Real Session API journeys from emptyMeta; 1/30-second real-time battle ticks, CD/supply checks every six frames; no injected progression or player save access.',
  executed:{profiles:all.length,lives:lives.length,actions:lives.reduce((n,l)=>n+l.actions,0),events:lives.reduce((n,l)=>n+l.events,0),campaigns:lives.reduce((n,l)=>n+l.depths.length,0)},
  freshChapters,modes,collection,byEntryPartyStars:byStars,controls,
  destiny:{catalogCost:shops.flatMap(s=>s.levels).reduce((n,l)=>n+l.cost,0),observedIncome:stats(lives.map(l=>l.points))},
  limitations:['Executed lives include repeated seeds across policies and the overlapping early portions of collection profiles; they are not independent samples.',
    'Star buckets also differ in accumulated items, aptitude and destiny purchases; the rates do not isolate star strength.',
    'The near-five bucket is small. Only four long collection profiles were used. No human reaction time or visual pacing was assessed.',
    'The fresh fourth-wave target is aggregate; chapter two remains easier than the other chapters.',
    'No-battle/no-spend/blind-story controls cover four lives per profile, not long-term optimum strategies.',
    'Highest means the implemented route/career ending criteria, not completion of the unimplemented 42-achievement proposal.']
};
writeFileSync(destination,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({executed:result.executed,modes,collection,byEntryPartyStars:byStars,controls},null,2));
