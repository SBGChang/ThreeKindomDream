import assert from 'node:assert/strict';
import {defs,wiring,newStorySession} from './harness.js';
import {createEventChallenge,enterEventChallenge} from '../../src/app/event-challenge.js';
import {validEventChallengeDef} from '../../src/data-runtime/event-challenge-validation.js';
import type {EventChallengeDef} from '../../src/contracts/core/event-challenge.js';
import {createStoryRun} from '../../src/app/battle-story.js';
import type {BattleStory} from '../../src/contracts/core/battle-story.js';

const ctx={defs,state:newStorySession(713).current};
function run(d:EventChallengeDef){
 assert(validEventChallengeDef(d));
 const state=createEventChallenge('fixture',0,d,ctx);
 enterEventChallenge(state,ctx,wiring.fx);
 return state;
}
const base:EventChallengeDef={mode:'duel',opponent:'npc_soldier',opponentName:'對手',ability:50,opening:'開始',outcomes:{win:'勝',lose:'敗',draw:'平',retreat:'退'}};
const enemy={war:81,lead:63,trait:'steady' as const};
const duel=run({...base,duel:{enemy}});
assert.deepEqual(duel.contest!.duel!.enemy.build,enemy);
assert.equal(run(base).contest!.duel!.enemy.build.trait,'none');

const enemyDebate={int:83,pol:61,specials:['reflect','wild'] as const,passives:['composure'] as const};
const debate:EventChallengeDef={...base,mode:'debate',debate:{enemy:{...enemyDebate,specials:[...enemyDebate.specials],passives:[...enemyDebate.passives]},ally:{specials:['induct','shout'],passives:['scholar','eloquence']}}};
const rally=run(debate).rally!;
assert.equal(rally.enemy.build.int,83);assert.equal(rally.enemy.build.pol,61);
assert.deepEqual(rally.enemy.build.specials,['reflect','wild']);
assert.deepEqual(rally.ally.build.specials,['induct','shout']);
assert.deepEqual(rally.ally.build.passives,['scholar','eloquence']);
assert.equal(rally.ally.build.int,ctx.state.attributes.values.int);
assert.equal(rally.ally.build.pol,ctx.state.attributes.values.pol);
assert.equal(rally.ally.hand.length,4+Math.floor((rally.ally.build.int-1)/20)+1);
assert.equal(run({...base,mode:'debate'}).rally!.enemy.build.int,50);
assert.deepEqual(run(structuredClone(debate)).rally,rally);

// The same authored enemy and player traits reach the same story engine unchanged.
const story={entry:'debate',playerStats:ctx.state.attributes.values,nodes:{debate:{kind:'debate',ally:rally.ally.build,enemy:debate.debate!.enemy,seed:duel.seed,next:{win:'end',lose:'end'}}}} as unknown as BattleStory;
assert.deepEqual(createStoryRun(story).rally!.enemy.build,rally.enemy.build);
assert.deepEqual(createStoryRun(story).rally!.ally.build,rally.ally.build);
for(const invalid of [
 {...base,duel:{enemy:{...enemy,trait:'missing'}}},
 {...base,duel:{enemy:{...enemy,war:NaN}}},
 {...debate,debate:{enemy:{...debate.debate!.enemy,pol:101}}},
 {...debate,debate:{...debate.debate,ally:{specials:['missing'],passives:[]}}},
 {...debate,debate:{...debate.debate,ally:{passives:['missing']}}},
 {...base,debate:debate.debate},
 {...debate,duel:{enemy}},
])assert.equal(validEventChallengeDef(invalid),false);
console.log('event-challenge-builds: custom builds, story parity, legacy fallback and validation passed');
