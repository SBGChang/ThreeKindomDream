import assert from 'node:assert/strict';
import {duelPresentation,duelActionStart,duelClashDuration,DUEL_REVEAL_SECONDS,DUEL_RESET_SECONDS,DUEL_COLLISION} from '../../src/app/duel-presentation.js';
import { answerContest, beginContest, beginEncounterDemo, createEncounterDemo, replyWindow, revealArgument, tickEncounterDemo, type EncounterDemo, type ContestKind } from '../../src/app/confrontation-demo.js';
import { armyCount } from '../../src/app/realtime-battle-model.js';

const step=(s:EncounterDemo,seconds:number)=>{for(let i=0;i<Math.ceil(seconds*60);i++)tickEncounterDemo(s,1/60);};
const until=(s:EncounterDemo,condition:()=>boolean,max=40)=>{for(let i=0;i<max*60&&!condition();i++)tickEncounterDemo(s,1/60);assert.ok(condition(),'expected phase before deadline');};
const ready=(kind:ContestKind)=>{const s=createEncounterDemo(kind,123);beginEncounterDemo(s);until(s,()=>s.contest?.phase==='read');return s;};
const frozen=(s:EncounterDemo)=>JSON.stringify({time:s.battle.time,supply:s.battle.supply,cd:s.battle.cooldowns,buff:s.battle.buff,units:s.battle.units.map(u=>[u.id,u.hp])});

for(const kind of ['duel','debate'] as const){
  const s=ready(kind),start=frozen(s),allies=armyCount(s.battle,'ally');
  assert.equal(beginContest(s,kind),false,'one contest cannot reenter');
  let rounds=0;
  while(s.contest?.phase==='read'){
    const c=s.contest;rounds++;
    assert.equal(answerContest(s,-1),false);assert.equal(answerContest(s,4),false);
    if(c.duel)c.duel.enemyAction='rest'; // Explicit flow fixture, not a balance policy.
    const choice=kind==='duel'?0:c.challenge.correct;
    assert.equal(answerContest(s,choice),true);
    assert.equal(answerContest(s,choice),false,'double-click cannot award another hit');
    assert.equal(frozen(s),start,'battle, supplies, cooldowns and army HP freeze during contest');
    until(s,()=>s.contest?.phase==='read'||s.contest?.phase==='verdict');
  }
  assert.equal(s.contest?.winner,'ally');assert.ok(rounds>=3&&rounds<=5,'damage-based duel or reasoned debate reaches victory');
  until(s,()=>s.contest?.phase==='retreat');
  const enemyX=s.battle.units.find(u=>u.side==='enemy')!.x;
  const allyX=s.battle.units.find(u=>u.side==='ally')!.x;
  step(s,1);
  assert.ok(s.battle.units.find(u=>u.side==='enemy')!.x>enemyX+500,'whole enemy army retreats');
  assert.equal(s.battle.units.find(u=>u.side==='ally')!.x,allyX);
  assert.equal(armyCount(s.battle,'ally'),allies);
  until(s,()=>s.contest===null);
  assert.equal(s.battle.phase,'cheer');assert.equal(s.battle.defeated,'enemy');assert.equal(s.victories,1);
  assert.equal(s.battle.kills,600,'all enemy soldiers are driven off exactly once');
  const clock=s.battle.time;
  until(s,()=>s.battle.wave===2&&s.battle.phase==='combat');
  assert.equal(s.battle.time,clock);assert.equal(armyCount(s.battle,'ally'),allies,'no hidden replenishment');
  step(s,.1);assert.ok(s.battle.time>clock,'clock resumes only when next-wave combat starts');
}

const lose=ready('debate');
while(lose.contest?.phase==='read'){
  answerContest(lose,(lose.contest.challenge.correct+1)%3);
  until(lose,()=>lose.contest?.phase==='read'||lose.contest?.phase==='verdict');
}
assert.equal(lose.contest?.winner,'enemy');
until(lose,()=>lose.contest?.phase==='retreat');const ownX=lose.battle.units.find(u=>u.side==='ally')!.x;
step(lose,1);assert.ok(lose.battle.units.find(u=>u.side==='ally')!.x<ownX-500);
until(lose,()=>lose.battle.status==='finished');assert.equal(lose.battle.wave,1);assert.equal(lose.retreats,1);assert.equal(armyCount(lose.battle,'ally'),0);

const idle=ready('duel'),idleBattle=frozen(idle),idleDuel=JSON.stringify(idle.contest!.duel);
assert.equal(replyWindow(idle.contest!),Infinity);
const waitingState=JSON.stringify(idle);
step(idle,300);
assert.equal(JSON.stringify(idle),waitingState,'duel waiting does not even accumulate a hidden decision timer');
assert.equal(idle.contest!.phase,'read','duel waits for player without an action deadline');
assert.equal(JSON.stringify(idle.contest!.duel),idleDuel,'waiting does not select an action, reroll the enemy or alter either fighter');
assert.equal(frozen(idle),idleBattle,'unlimited thinking freezes battle, supply and cooldowns');
assert.equal(answerContest(idle,0),true,'can still act after five minutes');
until(idle,()=>idle.contest?.phase==='read');
const secondWait=JSON.stringify(idle);step(idle,600);
assert.equal(JSON.stringify(idle),secondWait,'later rounds also wait for explicit confirmation');
const savedWait=JSON.parse(secondWait) as EncounterDemo;
savedWait.contest!.phaseTime=3600;savedWait.contest!.elapsed=3600;
savedWait.contest!.choice=2;
const savedBefore=JSON.stringify(savedWait);step(savedWait,600);
assert.equal(JSON.stringify(savedWait),savedBefore,'stale elapsed time or selection in a resumed duel cannot submit a move');
const lowStamina=ready('duel');lowStamina.contest!.duel!.ally.stamina=5;
const lowBefore=JSON.stringify(lowStamina);step(lowStamina,300);
assert.equal(JSON.stringify(lowStamina),lowBefore,'low stamina is not fainting and cannot trigger an automatic turn');

const fainted=ready('duel');fainted.contest!.duel!.ally.fainted=true;fainted.contest!.duel!.ally.stamina=0;
step(fainted,1);assert.equal(fainted.contest!.phase,'clash');
assert.equal(fainted.contest!.duel!.last!.ally,null,'fainting still skips a turn automatically');
assert.equal(fainted.contest!.duel!.ally.stamina,24);
const timedDebate=ready('debate');step(timedDebate,replyWindow(timedDebate.contest!)+.1);
assert.equal(timedDebate.contest!.phase,'clash','legacy debate deadline remains in effect');

const insight=ready('debate');assert.equal(revealArgument(insight),true);assert.equal(revealArgument(insight),false);
answerContest(insight,insight.contest!.challenge.correct);until(insight,()=>insight.contest?.phase==='read');assert.equal(revealArgument(insight),true);
answerContest(insight,insight.contest!.challenge.correct);until(insight,()=>insight.contest?.phase==='read');assert.equal(revealArgument(insight),false,'only two hints per contest');

const paused=ready('duel');paused.battle.status='paused';const stopped=JSON.stringify(paused);step(paused,4);assert.equal(JSON.stringify(paused),stopped);assert.equal(answerContest(paused,0),false);
const tied=ready('duel');
for(let i=0;i<24;i++){
  tied.contest!.duel!.enemyAction='rest';assert(answerContest(tied,2));
  until(tied,()=>tied.contest?.phase==='read'||tied.contest?.phase==='verdict');
}
assert.equal(tied.contest!.draw,true);const tieTime=tied.battle.time;until(tied,()=>!tied.contest);
assert.equal(tied.battle.wave,1);assert.equal(tied.battle.time,tieTime);assert.equal(tied.victories,0);assert.equal(tied.battle.phase,'combat');step(tied,.1);assert(tied.battle.time>tieTime);

let triggered=0,missed=0;
for(let seed=1;seed<=100;seed++){
  const s=createEncounterDemo('random',seed*999);beginEncounterDemo(s);
  until(s,()=>s.battle.phase==='combat');
  step(s,7.9);assert.equal(s.contest,null,'random checks use combat time, not render frames');
  step(s,.2);if(s.contest)triggered++;else missed++;
}
assert.ok(triggered>5&&triggered<35&&missed>0,'18% trigger is neither guaranteed nor frame-rate dependent');
const end=createEncounterDemo();beginEncounterDemo(end);until(end,()=>end.battle.phase==='combat');end.battle.time=end.battle.duration;assert.equal(beginContest(end,'duel'),false);
console.log(`Confrontation QA passed: both wins, loss, full-army retreats, wave carry-over, freeze/resume, unlimited duel input, debate timeout, input locking, insight, RPS integration, draw, pause; random triggers ${triggered}/100.`);

// Revelation and evolution must finish before either duelist performs the action.
for(const evolution of [false,true]){
 const e=ready('duel'),c=e.contest!;
 c.duel!.enemyAction='rest';
 // First evolution roll is deterministic; force high/low roll via known LCG seed.
 for(let seed=0;seed<100000;seed++){const roll=((Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000;if(evolution?roll<.01:roll>.8){c.duel!.rng=seed;break;}}
 const before=structuredClone(c.duel!.ally);
 assert(answerContest(e,0));
 assert.equal(!!c.duel!.last!.allyEvolution,evolution);
 assert.deepEqual(c.duelBefore!.ally,before);
 assert.equal(duelPresentation(c).stage,'reveal');
 const round=c.duel!.round,history=c.duel!.history.length,battle=frozen(e);
 step(e,1);assert.equal(duelPresentation(c).stage,'reveal');
 e.battle.status='paused';const paused=JSON.stringify(e);step(e,5);assert.equal(JSON.stringify(e),paused);e.battle.status='running';
 c.phaseTime=DUEL_REVEAL_SECONDS+.1;assert.equal(duelPresentation(c).stage,'reset');
 if(evolution){c.phaseTime=DUEL_REVEAL_SECONDS+DUEL_RESET_SECONDS+.1;assert.equal(duelPresentation(c).stage,'evolution');}
 c.phaseTime=duelActionStart(c)+.01;assert.equal(duelPresentation(c).stage,'combat');
 assert.equal(frozen(e),battle);assert.equal(c.duel!.round,round);assert.equal(c.duel!.history.length,history,'animation must never resolve a turn twice');
 c.phaseTime=duelClashDuration(c)-.01;step(e,.02);assert.equal(c.phase,'read');
}
console.log('Duel presentation passed: reveal, reset, optional evolution, action ordering, snapshot display, pause and exactly-once settlement.');

assert(DUEL_COLLISION.first<DUEL_COLLISION.rebound&&DUEL_COLLISION.rebound<DUEL_COLLISION.second&&DUEL_COLLISION.second<DUEL_COLLISION.flash&&DUEL_COLLISION.flash<DUEL_COLLISION.result&&DUEL_COLLISION.result<DUEL_REVEAL_SECONDS,'both impacts must finish before flash and result');
