import assert from 'node:assert/strict';
import {createCardDebate,resolveCardDebate,DEBATE_RECOVER,type DebateCard} from '../../src/app/card-debate-model.js';
import {forecastCardDebate,debateForecastSegments,beforeDebateTurn,settledDebateForecast} from '../../src/app/card-debate-forecast.js';
const cards:DebateCard[]=['claim','proof','question','rebut','borrow','focus','pressure'];
const resources=['heart','mind','evidence','momentum'] as const;
for(const ally of cards)for(const enemy of cards){
 const state=createCardDebate();state.ally.hand[0]=ally;state.ally.evidence=4;state.ally.momentum=3;state.ally.mind=45;
 state.enemy.evidence=4;state.enemy.momentum=3;state.enemy.mind=45;
 const snapshot=JSON.stringify(state),forecast=forecastCardDebate(state,0,[enemy]);assert(forecast);
 assert.equal(JSON.stringify(state),snapshot,'preview cannot mutate state, RNG, hand or committed reply');
 const outcome=structuredClone(state);outcome.enemy.hand[0]=enemy;outcome.enemyChoice=0;assert(resolveCardDebate(outcome,0));
 for(const side of ['ally','enemy'] as const)for(const k of resources){
  const [low,high]:readonly [number,number]=forecast[side][k];const actual:number=outcome[side][k];assert(low<=actual&&actual<=high,`${ally}/${enemy}: ${side}.${k}`);
  if(enemy!=='focus')assert.equal(low,high,'fixed hypothetical matchup gives an exact result');
  const max=k==='heart'?state[side].maxHeart:k==='mind'?state[side].maxMind:k==='evidence'?5:4;
  assert(low>=0&&high<=max);
  const segments=debateForecastSegments(state[side][k],max,forecast[side][k]);assert(segments.lossStart+segments.loss<=max);assert(segments.gainStart+segments.gain<=max);
 }
 const hidden=structuredClone(state);hidden.enemyChoice=DEBATE_RECOVER;hidden.rng=44;hidden.enemy.hand=['focus'];
 assert.deepEqual(forecastCardDebate(hidden,0,[enemy]),forecast,'hypothetical reply never leaks hidden hand, AI choice or RNG');
 const before=beforeDebateTurn(outcome.ally,outcome.last!.allyChange);
 for(const k of resources)assert.equal(before[k],state.ally[k]);
 assert.deepEqual(settledDebateForecast(outcome.ally).heart,[outcome.ally.heart,outcome.ally.heart]);
}
const state=createCardDebate();assert.equal(forecastCardDebate(state,1,['claim']),null,'unaffordable evidence card does not blink');
assert.equal(forecastCardDebate(state,99,['claim']),null);assert.equal(forecastCardDebate(state,0,[]),null);
const full=forecastCardDebate(state,DEBATE_RECOVER,['focus'])!;assert.deepEqual(full.ally.mind,[state.ally.maxMind,state.ally.maxMind]);
assert.equal(debateForecastSegments(state.ally.mind,state.ally.maxMind,full.ally.mind).gain,0,'full bars do not falsely promise recovery');
state.ally.mind=3;state.enemy.momentum=3;
const recovered=forecastCardDebate(state,DEBATE_RECOVER,['pressure'])!;assert(recovered.ally.mind[0]>state.ally.mind);
assert.deepEqual(debateForecastSegments(3,5,[1,5]),{steady:1,lossStart:1,loss:2,gainStart:3,gain:2},'mixed range can blink losses and gains together');
assert.deepEqual(debateForecastSegments(3,5,[0,0]),{steady:0,lossStart:0,loss:3,gainStart:3,gain:0});
assert.deepEqual(debateForecastSegments(5,5,[5,5]),{steady:5,lossStart:5,loss:0,gainStart:5,gain:0});
console.log('Debate forecast passed: 49 matchups, real resolution, caps, fallback, blocked choices, immutable hidden state, reveal snapshots and flashing segments.');
