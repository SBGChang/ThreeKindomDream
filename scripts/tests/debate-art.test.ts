import assert from 'node:assert/strict';
import {DEBATE_CARDS} from '../../src/app/card-debate-model.js';
import {debateFrame,DEBATE_MOTION_ROWS} from '../../src/ui/debate-art.js';
import type {DebateCard} from '../../src/contracts/core/card-debate.js';
assert.deepEqual(Object.keys(DEBATE_MOTION_ROWS).sort(),Object.keys(DEBATE_CARDS).sort());
const frames=new Set<number>();
for(const card of Object.keys(DEBATE_CARDS) as DebateCard[]){
 const sequence=[0,.2,.65,1.2].map(t=>debateFrame(card,t));
 assert.equal(new Set(sequence).size,4);
 sequence.forEach(f=>{assert(f>=0&&f<28);assert(!frames.has(f));frames.add(f);});
 assert.equal(debateFrame(card,1.8),sequence[3],'hold recovery, never restart command');
 assert.equal(debateFrame(card,20),sequence[3]);
 assert.equal(debateFrame(card,-1),sequence[0]);
 assert.equal(debateFrame(card,.65),debateFrame(card,.65),'paused playback is deterministic');
}
for(const t of [0,.6,1.2,1.8,2.4,100])assert(debateFrame(null,t)>=28&&debateFrame(null,t)<32);
console.log('Debate motion: all seven commands have four exclusive poses, timed emphasis, held recovery and separate idle frames.');
