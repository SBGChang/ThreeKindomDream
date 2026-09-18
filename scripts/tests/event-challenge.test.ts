import assert from 'node:assert/strict';
import {defs,wiring,newStorySession} from './harness.js';
import {Session} from '../../src/app/session.js';
import {optionStates} from '../../src/modules/commission.js';
import {storyRarity} from '../../src/modules/stories.js';
import {armyCount} from '../../src/app/realtime-battle-model.js';
import {playEventChallenge} from '../../src/app/event-challenge-driver.js';
import {validEventChallengeSnapshot} from '../../src/app/event-challenge-validation.js';
import {validEventChallengeDef} from '../../src/data-runtime/event-challenge-validation.js';
import {saveRun,restoreRun} from '../../src/app/save.js';
import {chooseRallyAction} from '../../src/app/debate-rally-model.js';

function fixture(mode:'duel'|'debate'|'battle'){
 const initial=newStorySession(713),def=defs.reader('event').all().find(d=>d.trigger.kind==='commission'&&d.options.some(o=>o.challenge?.mode===mode))!;
 const attrs={lead:75,war:75,int:75,pol:75},state={...initial.current,attributes:{values:attrs},career:{...initial.current.career,martial:10,civil:10}};
 const ctx={state,defs},offer={eventDefId:def.eventDefId,rarity:storyRarity(def),params:{},optionStates:optionStates(def,storyRarity(def),ctx,wiring.fx)};
 return {s:Session.restore(wiring,{...state,turn:{...state.turn,pending:[offer]}}),option:def.options.findIndex(o=>o.challenge?.mode===mode)};
}
let checks=0;const check=(fn:()=>void)=>{fn();checks++;};
for(const mode of ['duel','debate','battle'] as const){
 check(()=>{const {s,option}=fixture(mode),before=structuredClone(s.current);assert.throws(()=>s.resolveEvent(option));s.beginEventChallenge(option);assert.equal(s.canAdvance(),false);assert.throws(()=>s.advance());assert.throws(()=>s.beginEventChallenge(option));assert.throws(()=>s.resolveEvent(0));assert.throws(()=>s.resolveEvent(option));s.enterEventChallenge();if(mode==='battle'){
 assert.equal(s.current.eventChallenge!.phase,'prep');assert.throws(()=>s.configureEventChallenge(['unknown'],60));assert.throws(()=>s.configureEventChallenge([],101));s.configureEventChallenge([],30);s.enterEventChallenge();const b=s.current.eventChallenge!.battle!;assert.equal(b.commanders.filter(c=>c.side==='ally').length,1);assert.equal(b.commanders.filter(c=>c.side==='enemy').length,3);assert.equal(b.maxWaves,1);assert.equal(new Set(b.units.filter(u=>u.side==='enemy').map(u=>u.armyId)).size,3);assert.equal(armyCount(b,'enemy'),180);assert.equal(b.infantryPercent,30);assert.equal(armyCount(b,'ally'),b.initial);
 }else assert.equal(s.current.eventChallenge!.battle,null);
 assert.equal(s.current.campaign,before.campaign);assert(validEventChallengeSnapshot(s.current));
 const saved=structuredClone(s.current),restored=Session.restore(wiring,saved);assert(restored.current.eventChallenge!.paused);const rng=JSON.stringify(restored.current.eventChallenge);restored.tickEventChallenge(.05);assert.equal(JSON.stringify(restored.current.eventChallenge),rng);restored.pauseEventChallenge(false);restored.retreatEventChallenge();assert.equal(restored.current.eventChallenge!.outcome,'retreat');restored.resolveEvent(option);assert.equal(restored.current.eventChallenge,null);assert.equal(restored.current.turn.resolved.at(-1)!.passed,false);assert.equal(restored.current.progress.turn,before.progress.turn);assert.deepEqual(restored.current.campaign,before.campaign);const after=JSON.stringify(restored.current);assert.throws(()=>restored.resolveEvent(option));assert.equal(JSON.stringify(restored.current),after);
 });
 check(()=>{const a=fixture(mode),b=fixture(mode);playEventChallenge(a.s,a.option);playEventChallenge(b.s,b.option);assert.deepEqual(a.s.current.turn.resolved,b.s.current.turn.resolved);assert.equal(a.s.current.eventChallenge,null);assert.equal(a.s.current.progress.turn,b.s.current.progress.turn);});
}
check(()=>{const {s,option}=fixture('duel');s.beginEventChallenge(option);s.enterEventChallenge();s.answerEventDuel(0);for(let i=0;i<20;i++)s.tickEventChallenge(1/60);assert(validEventChallengeSnapshot(s.current));const b=Session.restore(wiring,structuredClone(s.current));b.pauseEventChallenge(false);for(let i=0;i<500;i++){s.tickEventChallenge(1/60);b.tickEventChallenge(1/60);}assert.deepEqual(s.current.eventChallenge,b.current.eventChallenge);});
check(()=>{const {s,option}=fixture('battle');s.beginEventChallenge(option);s.enterEventChallenge();s.enterEventChallenge();const b=s.current.eventChallenge!.battle!;b.phase='combat';b.time=b.duration-1/120;s.tickEventChallenge(1/60);assert.equal(s.current.eventChallenge!.outcome,'draw');s.resolveEvent(option);assert.equal(s.current.turn.resolved.at(-1)!.passed,false);});
for(const mode of ['battle','duel'] as const)for(const win of [true,false])check(()=>{const {s,option}=fixture(mode);s.beginEventChallenge(option);s.enterEventChallenge();if(mode==='battle'){s.enterEventChallenge();for(const u of s.current.eventChallenge!.battle!.units)if(u.side===(win?'enemy':'ally'))u.hp=0;for(let i=0;i<5000&&s.current.eventChallenge!.phase!=='result';i++)s.tickEventChallenge(1/60);}else{const c=s.current.eventChallenge!.contest!;c.duel!.enemy.injury=win?c.duel!.enemy.injuryLimit:0;c.duel!.ally.injury=win?0:c.duel!.ally.injuryLimit;s.answerEventDuel(0);for(let i=0;i<1200;i++)s.tickEventChallenge(1/60);}assert.equal(s.current.eventChallenge!.outcome,win?'win':'lose');s.resolveEvent(option);assert.equal(s.current.turn.resolved.at(-1)!.passed,win);});
check(()=>{const {s,option}=fixture('debate');s.beginEventChallenge(option);s.enterEventChallenge();const r=s.current.eventChallenge!.rally!;for(let i=0;i<3000&&!r.winner;i++)s.answerEventDebate(r.turn,chooseRallyAction(r));assert(r.winner);s.finishEventDebate();assert.equal(s.current.eventChallenge!.outcome,r.winner==='ally'?'win':'lose');assert.equal(s.current.campaign,null);});
check(()=>{const {s,option}=fixture('duel');s.beginEventChallenge(option);s.enterEventChallenge();const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}});saveRun(s,[]);const restore=restoreRun(wiring);assert(restore.session,restore.notice);assert(restore.session.current.eventChallenge!.paused);const wrong=structuredClone(s.current);wrong.eventChallenge!.eventId='event:missing';assert(!validEventChallengeSnapshot(wrong));wrong.eventChallenge!.eventId=s.current.eventChallenge!.eventId;wrong.eventChallenge!.skills=['unknown'];assert(!validEventChallengeSnapshot(wrong));saveRun(newStorySession(3),[]);assert(restoreRun(wiring).session);delete (globalThis as {localStorage?:unknown}).localStorage;});
check(()=>{for(const d of defs.reader('event').all())for(const o of d.options)if(o.challenge){assert(validEventChallengeDef(o.challenge));assert(!validEventChallengeDef({...o.challenge,ability:NaN}));assert(!validEventChallengeDef({...o.challenge,outcomes:{win:'ok'}}));}});
console.log(`event-challenge: ${checks} checks passed`);

