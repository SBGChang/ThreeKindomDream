import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const dir=process.argv[2]??'artifacts/gameplay-audit/2026-09-14';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const base=read(`${dir}/summary.json`),recovered=read(`${dir}/recovered/summary.json`),controls=read(`${dir}/controls/summary.json`);
const finale=read(`${dir}/finale/summary.json`);
const groups=[...base.journeys,...recovered.journeys,...controls.journeys,...finale.journeys];
const all=groups.flatMap(j=>j.lives);
const avg=a=>a.length?Math.round(a.reduce((s,n)=>s+n,0)/a.length*100)/100:0;
const range=a=>[Math.min(...a),Math.max(...a)];
const stats=js=>{
  const rs=js.flatMap(j=>j.lives),first=js.map(j=>j.lives[0]);
  return {journeys:js.length,runs:rs.length,actions:rs.reduce((n,r)=>n+r.actions,0),firstTopLives:js.map(j=>j.firstTop),firstSummitLives:js.map(j=>j.firstSummit),
    both:rs.filter(r=>r.both).length,topNarrative:rs.filter(r=>r.topNarrative).length,kongming:rs.filter(r=>r.milestones.includes('shu.kongming-rested')).length,
    firstPoints:range(first.map(r=>r.points)),firstMeanDepth:avg(first.flatMap(r=>r.depths)),meanDepth:avg(rs.flatMap(r=>r.depths)),
    firstBoth:first.filter(r=>r.both).length,firstMeanUpgrades:avg(first.map(r=>r.upgrades)),firstMeanItems:avg(first.map(r=>r.boughtItems)),firstMeanFragments:avg(first.map(r=>r.boughtFragments)),
    firstMeanEarned:avg(first.map(r=>r.earned)),firstMeanSpent:avg(first.map(r=>r.spent)),firstMeanMoney:avg(first.map(r=>r.finalMoney)),
    firstMeanEvents:avg(first.map(r=>r.events)),firstMeanUnique:avg(first.map(r=>r.uniqueEvents)),maxNoSkillTurns:Math.max(...rs.map(r=>r.noSkillTurns)),
    firstMeanDepthByChapter:Array.from({length:first[0].depths.length},(_,i)=>avg(first.map(r=>r.depths[i]))),
    endings:Object.fromEntries([...new Set(rs.map(r=>r.ending))].map(e=>[e,rs.filter(r=>r.ending===e).length]))};
};
const byMode=Object.fromEntries([...new Set(base.journeys.map(j=>j.mode))].map(m=>[m,stats(base.journeys.filter(j=>j.mode===m))]));
for(const m of [...new Set(controls.journeys.map(j=>j.mode))])byMode[m]=stats(controls.journeys.filter(j=>j.mode===m));
byMode.recovered=stats(recovered.journeys);
byMode.finale=stats(finale.journeys);
const detailed=[];
for(const sub of ['', '/recovered','/controls','/finale'])for(const f of readdirSync(dir+sub).filter(f=>/^(greedy-gain|focus-martial|focus-civil|no-battle|no-spend|blind-story|wei)-\d+\.json$/.test(f))){
  detailed.push(...read(`${dir+sub}/${f}`).lives);
}
const integrityErrors=[];
for(const r of detailed){
  if(r.actions!==(r.depths.length*8))integrityErrors.push([r.runSeed,'actions']);
  if(r.finalMoney!==r.earned-r.spent||r.finalMoney!==r.ledger.reduce((n,x)=>n+x.amount,0)||r.finalMoney<0)integrityErrors.push([r.runSeed,'money']);
  if(new Set(r.ledger.map(x=>x.id)).size!==r.ledger.length)integrityErrors.push([r.runSeed,'duplicate']);
}
const teaching=rs=>{
  const entries=rs.flatMap(r=>r.ledger.filter(e=>e.id.startsWith('teaching/')));
  return {lessons:entries.length,compensated:entries.filter(e=>e.amount>0).length,money:entries.reduce((n,e)=>n+e.amount,0)};
};
const example=read(`${dir}/greedy-gain-1.json`);
const replay=read(`${dir}/replay/greedy-gain-1.json`);
const repeatIdentical=example.lives.every((r,i)=>r.finalStateHash===replay.lives[i]?.finalStateHash);
if(integrityErrors.length||!repeatIdentical)throw Error('Audit integrity failure');
const metadata=JSON.parse(readFileSync('content/manifest.json','utf8'));
const defs=metadata.packs.flatMap(p=>read(`content/${p.dir}/defs.json`));
const defList=Array.isArray(defs[0])?defs.flat():defs;
const contentHash=createHash('sha256');
for(const p of metadata.packs)contentHash.update(readFileSync(`content/${p.dir}/defs.json`));
const result={seedFamilies:'9000..9007, subsequent lives add 100; identical seeds across strategies',contentSHA256:contentHash.digest('hex'),
  totalRuns:all.length,totalActions:all.reduce((n,r)=>n+r.actions,0),totalEvents:all.reduce((n,r)=>n+r.events,0),totalScenes:all.reduce((n,r)=>n+r.scenes,0),
  actualStagesCleared:all.reduce((n,r)=>n+r.depths.reduce((a,b)=>a+b,0),0),reportedStagesCleared:all.reduce((n,r)=>n+r.stagesInSummary,0),
  byMode,accountingChecked:detailed.length,integrityErrors,repeatIdentical,teaching:teaching(detailed),
  representative:example.lives.map(r=>({life:r.life,depths:r.depths,career:r.career,ending:r.ending,milestones:r.milestones,money:r.finalMoney,earned:r.earned,spent:r.spent,points:r.points,lessons:teaching([r]),upgrades:r.upgrades,items:r.boughtItems,fragments:r.boughtFragments,
    firstCapChapter:r.chapters.findIndex(c=>c.career.civil===r.config.careerCap||c.career.martial===r.config.careerCap)+1,
    nextCareerCap:5+r.destinyPurchases.filter(p=>p.item==='shop:career').reduce((n,p)=>Math.max(n,p.level),r.metaPurchasesBefore['shop:career']??0)})),
  definitionKinds:Object.fromEntries([...new Set(defList.map(d=>d.kind))].map(k=>[k,defList.filter(d=>d.kind===k).length]))};
result.notableEventsByPackAndRarity=defList.filter(d=>d.kind==='event'&&d.trigger.kind==='notable').reduce((out,d)=>{
  const key=d.packId+'/'+(d.progression?.rarity??1);out[key]=(out[key]??0)+1;return out;
},{});
result.preparationOptions=defList.filter(d=>d.kind==='storyChapter').flatMap(d=>d.nodes)
  .filter(n=>['S4.A','S5.B','S6.A','S6.B','S7.A','S7.B','S8.A','S8.B'].includes(n.id))
  .map(n=>({node:n.id,first:n.options[0].id,chosen:example.lives[0].choices[n.id]}));
result.completedMainJourneys=base.journeys.map(j=>{
  const tail=[...recovered.journeys,...finale.journeys].find(x=>x.id===j.id);
  const lives=[...j.lives,...(tail?.lives??[])],seen=new Set();let first=null;
  for(const r of lives){seen.add(r.ending);if(first===null&&r.topNarrative&&r.rankSummit&&seen.has('ending:shu.reunion')&&seen.has('ending:shu.dawn'))first=r.life;}
  const last=lives.at(-1);
  return {id:j.id,firstSameLifeMaximumAndCollection:first,lastLife:last.life,lastCareer:last.career,lastEnding:last.ending,lastMilestones:last.milestones,success:last.topNarrative&&last.rankSummit&&seen.has('ending:shu.reunion')&&seen.has('ending:shu.dawn')};
});
if(result.completedMainJourneys.some(j=>!j.success))throw Error('Main journey target incomplete');
writeFileSync(`${dir}/metrics.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
