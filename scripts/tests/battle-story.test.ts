import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceStory,createStoryRun,stepStoryCombat,storySpeech,validateBattleStory} from '../../src/app/battle-story.js';
import {createFighter} from '../../src/app/duel-model.js';

const raw=JSON.parse(readFileSync(new URL('../../public/demo/hulao-story.json',import.meta.url),'utf8'));
const d=validateBattleStory(raw);
const next=(s:ReturnType<typeof createStoryRun>,choice?:string)=>assert.equal(advanceStory(d,s,s.revision,choice),true);
function toFirst(){const s=createStoryRun(d);next(s);next(s);return s;}
const full=toFirst();next(full,'accept');
assert.equal(full.node,'full-duel');assert.equal(full.duel!.enemy.injury,0);
assert.equal(full.duel!.enemy.attack,createFighter(d.actors.lvbu!.build).attack);
assert.equal(full.duel!.ally.attack,createFighter(d.actors.player!.build).attack);
assert.equal(stepStoryCombat(d,full,full.revision,'attack'),false,'opening dialogue blocks fighting');
const rev=full.revision;next(full);assert.equal(advanceStory(d,full,rev),false,'stale clicks cannot skip lines');next(full);
assert.equal(stepStoryCombat(d,full,full.revision,'attack'),true);
const old=full.revision-1;assert.equal(stepStoryCombat(d,full,old,'attack'),false);

const tired=toFirst();next(tired,'watch');let guard=0;const npcResults=[];
while(tired.node!=='second-challenge'&&guard++<250){
 const n=d.nodes[tired.node]!;
 if(storySpeech(d,tired)){next(tired);continue;}
 if(n.kind==='combat'){
  for(const f of [tired.duel!.ally,tired.duel!.enemy]){assert.equal(f.progression,false);assert.equal(f.combo,0);assert(Object.values(f.points).every(p=>p===0));}
  if(tired.duel!.result){npcResults.push([tired.node,tired.duel!.result]);assert.equal(tired.duel!.result,'enemy',tired.node+' must end in Lv Bu victory');next(tired);}
  else assert.equal(stepStoryCombat(d,tired,tired.revision),true);
 }else throw Error('unexpected '+tired.node);
}
assert.equal(tired.node,'second-challenge');assert.equal(npcResults.length,3);
next(tired,'accept');const enemyBase=createFighter(d.actors.lvbu!.build),allyBase=createFighter(d.actors.player!.build);
assert.equal(tired.duel!.enemy.injury,tired.duel!.enemy.injuryLimit*.5);
assert.equal(tired.duel!.enemy.attack,enemyBase.attack*.8);
assert.equal(tired.duel!.enemy.defense,enemyBase.defense*.8);
assert.equal(tired.duel!.ally.attack,allyBase.attack*1.2);
assert.equal(tired.duel!.ally.defense,allyBase.defense*1.2);
// Adapter contract: inject terminal engine outcomes to verify every settlement edge.
for(const [entry,kind] of [['full-duel','full'],['tired-duel','tired']] as const){
 for(const outcome of ['ally','enemy','draw'] as const){
  const fixture={...d,entry};const s=createStoryRun(fixture);s.speech=[];s.duel!.result=outcome;next(s);
  for(let i=0;d.nodes[s.node]!.kind!=='end'&&i<30;i++)next(s);
  if(outcome!=='ally'){assert.equal(s.items.length,0);assert.equal(s.gold,0);assert.deepEqual(s.stats,d.playerStats);continue;}
  assert.equal(s.items.length,kind==='full'?4:2);assert.equal(s.gold,kind==='full'?500:0);
  for(const k of ['lead','war','int','pol'] as const)assert.equal(s.stats[k],d.playerStats[k]+(kind==='full'?5:0));
  assert.deepEqual(s.unlocks,['呂布']);
  assert.equal(advanceStory(d,s,s.revision),false);
 }
}
const rewardRun=createStoryRun({...d,entry:'full-recognition'});const original={...rewardRun.stats};
const loop=structuredClone(d);loop.nodes['cao-praise']={kind:'dialogue',lines:[{speaker:'測試',text:'再讀同份獎勵'}],next:'full-recognition'};
assert.equal(advanceStory(loop,rewardRun,rewardRun.revision),true);assert.equal(advanceStory(loop,rewardRun,rewardRun.revision),true);
assert.deepEqual(rewardRun.stats,original);assert.equal(rewardRun.granted.length,1,'reward id is idempotent');
const invalid=structuredClone(raw);invalid.nodes.arrival.next='missing';assert.throws(()=>validateBattleStory(invalid),/斷裂/);
invalid.nodes.arrival.next='first-challenge';invalid.nodes['tired-duel'].enemy.health=2;assert.throws(()=>validateBattleStory(invalid),/戰鬥/);
assert.equal(raw.nodes['tired-duel'].enemy.modifiers[0].power,.8,'source data remains unchanged');
console.log('battle-story passed: NPC outcomes, exact buffs, gates, all outcomes, once-only rewards, validation',npcResults);
