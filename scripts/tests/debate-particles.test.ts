import assert from 'node:assert/strict';
import {debateParticles} from '../../src/ui/debate-particles.js';
import type {DebateCard} from '../../src/contracts/core/card-debate.js';
const cards:DebateCard[]=['claim','proof','question','rebut','borrow','focus','pressure'];
for(const card of cards){
 assert.deepEqual(debateParticles(card,-1,400,1200,7),[]);
 assert.deepEqual(debateParticles(card,1.8,400,1200,7),[]);
 for(const t of [.1,.4,.7,1,1.5]){
  const ps=debateParticles(card,t,400,1200,7);
  assert(ps.length<=112);
  assert.deepEqual(ps,debateParticles(card,t,400,1200,7),'a paused frame renders identically');
  for(const p of ps){assert([p.x,p.y,p.size,p.alpha,p.angle].every(Number.isFinite));assert(p.alpha>=0&&p.alpha<=1);assert(p.size>0);}
 }
 assert(debateParticles(card,.4,400,1200,7).length>20,`${card} emits independent particles`);
}
const averageX=(card:DebateCard)=>{const ps=debateParticles(card,.4,400,1200,7);return ps.reduce((a,p)=>a+p.x,0)/ps.length;};
assert(averageX('proof')>400&&averageX('proof')<1200);
assert(averageX('borrow')>400&&averageX('borrow')<1200);
assert(Math.abs(averageX('focus')-400)<85);
assert(Math.abs(averageX('rebut')-400)<85);
assert.notDeepEqual(debateParticles('proof',.2,400,1200,7),debateParticles('proof',.3,400,1200,7));
console.log('Debate particles passed: seven emitters, deterministic pause, travel, support orbit, finite trajectories and lifetime bounds.');
