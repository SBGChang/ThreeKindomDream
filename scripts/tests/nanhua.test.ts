import assert from 'node:assert/strict';
import {defs,wiring,newStorySession} from './harness.js';
import {Session} from '../../src/app/session.js';
import {chapterId,notableId,traitId,skillId} from '../../src/contracts/core/ids.js';
import {nextChapterChallenge,settleChapterChallenge} from '../../src/app/chapter-challenges.js';
import {previewGrowth} from '../../src/modules/growth.js';
import {addAffinity} from '../../src/modules/roster.js';
import {meritMultiplier} from '../../src/modules/stats.js';
import {traitCast} from '../../src/app/battle-traits.js';
import {createBattle,castSkill,tickBattle,startBattle,validBattleSnapshot} from '../../src/app/realtime-battle-model.js';
import {validEventChallengeSnapshot} from '../../src/app/event-challenge-validation.js';
import {optionStates} from '../../src/modules/commission.js';
import {storyRarity} from '../../src/modules/stories.js';
import {realtimeSkill} from '../../src/app/realtime-campaign.js';
import {migrateStoryRun} from '../../src/app/story-save.js';
import {saveRun,restoreRun} from '../../src/app/save.js';

function fixture(lvbu:boolean,nanhua:boolean,marks:string[]=[]){
 const base=newStorySession(771).current;
 return {...base,progress:{...base.progress,chapterId:chapterId('ch:wei.hulao')},attributes:{values:{lead:50,war:50,int:50,pol:50}},story:{...base.story,scenes:[],awaitingChapterClose:true,milestones:marks},roster:{members:[...(lvbu?[{notableId:notableId('notable:lvbu'),affinity:60,origin:'companion' as const}]:[]),...(nanhua?[{notableId:notableId('notable:nanhua'),affinity:60,origin:'companion' as const}]:[])]}};
}
for(const [lvbu,nanhua,marks,expected] of [
 [false,false,[],'chapter:hulao-nanhua'],[false,false,['hulao:challenged'],null],
 [false,true,[],'chapter:hulao-nanhua'],[false,true,['hulao:challenged'],'chapter:hulao-nanhua'],
 [false,true,['hulao:won'],'chapter:hulao-nanhua-wise'],[true,false,[],'chapter:hulao-lvbu'],[true,true,[],'chapter:hulao-lvbu'],
] as const){const state=nextChapterChallenge({defs,state:fixture(lvbu,nanhua,[...marks])});assert.equal(state.eventChallenge?.eventId??null,expected);if(expected)assert(validEventChallengeSnapshot(state));}
const pending=nextChapterChallenge({defs,state:fixture(true,true)});
assert.doesNotThrow(()=>migrateStoryRun(structuredClone(pending),4,defs));
const chapterSession=Session.restore(wiring,pending);chapterSession.enterEventChallenge();assert(validEventChallengeSnapshot(chapterSession.current));
const savedChapter=Session.restore(wiring,migrateStoryRun(structuredClone(chapterSession.current),4,defs));assert.equal(savedChapter.current.eventChallenge?.source,'chapter');
const memory=new Map<string,string>(),originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}});
try{
 for(const run of [Session.restore(wiring,pending),savedChapter]){saveRun(run,[]);const restored=restoreRun(wiring);assert(restored.session,restored.notice);assert.equal(restored.session.current.eventChallenge?.source,'chapter');}
}finally{if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else Reflect.deleteProperty(globalThis,'localStorage');}
const optional=Session.restore(wiring,nextChapterChallenge({defs,state:fixture(false,false)}));assert(optional.current.eventChallenge?.canDecline);optional.retreatEventChallenge();assert(validEventChallengeSnapshot(optional.current));optional.finishChapterChallenge();assert.equal(optional.current.attributes.values.war,50);
const forced=Session.restore(wiring,nextChapterChallenge({defs,state:fixture(false,true)}));forced.retreatEventChallenge();assert.equal(forced.current.eventChallenge?.phase,'opening');
for(const win of [true,false]){
 let state=nextChapterChallenge({defs,state:fixture(true,true)});state.eventChallenge!.phase='result';state.eventChallenge!.outcome=win?'win':'lose';
 state=settleChapterChallenge({defs,state});assert.equal(state.eventChallenge?.eventId,win?'chapter:hulao-nanhua-wise':'chapter:hulao-nanhua');
 state.eventChallenge!.phase='result';state.eventChallenge!.outcome='win';state=settleChapterChallenge({defs,state});
 assert.equal(state.attributes.values.war,win?60:55);assert.equal(state.eventChallenge,null);assert.equal(state.items.count['item:taiping'],1);
 assert.equal(state.abilities.traits.includes(traitId('trait:tianmingzhiren')),win);assert.throws(()=>settleChapterChallenge({defs,state}));
 assert.equal(nextChapterChallenge({defs,state}).eventChallenge,null);
}
const plain=fixture(false,true),blessed={...plain,abilities:{...plain.abilities,traits:[traitId('trait:tianmingzhiren')],activeTraits:[traitId('trait:tianmingzhiren')]}};
assert.equal(previewGrowth('war',2,{defs,state:plain}),1);
assert.equal(previewGrowth('war',2,{defs,state:blessed}),1.15);
assert.equal(addAffinity(notableId('notable:nanhua'),1,{defs,state:blessed}).roster.members[0]!.affinity,64);
assert.equal(addAffinity(notableId('notable:nanhua'),0,{defs,state:blessed}).roster.members[0]!.affinity,60);
assert(Math.abs(meritMultiplier('civil',{defs,state:blessed},wiring.fx)/meritMultiplier('civil',{defs,state:plain},wiring.fx)-1.15)<1e-8);
const skill=skillId('skill:tactic-water'),a=realtimeSkill({defs,state:plain},wiring.fx,skill,'主角',0,false,plain.attributes.values);
const equipped={...plain,equipment:{treasure:'item:taiping' as ReturnType<typeof import('../../src/contracts/core/ids.js').itemId>},items:{...plain.items,count:{...plain.items.count,'item:taiping':1}}};
const boosted=realtimeSkill({defs,state:equipped},wiring.fx,skill,'主角',0,false,plain.attributes.values);assert(boosted.damage>a.damage);
const b=createBattle();b.waveTroops=[600];b.waveNames=['敵軍'];b.traits=[{id:'nature',name:'道法自然',owner:'主角',level:1}];
const sample={...b.skills[0]!,owner:'主角',damage:100};
for(const mechanic of ['water','water','rocks'])traitCast(b,{...sample,mechanic});assert(!b.followupSkill);
traitCast(b,{...sample,mechanic:'fire'});assert.equal((b.followupSkill as import('../../src/contracts/core/realtime-battle.js').DemoSkill|null)?.damage,150);assert.equal((b.followupSkill as import('../../src/contracts/core/realtime-battle.js').DemoSkill|null)?.cost,0);
assert(!b.traitMarks?.['nature:主角:water']);b.followupSkill=null;traitCast(b,{...sample,mechanic:'fire'});assert(!b.followupSkill);
startBattle(b);b.phase='combat';b.cinematic={skill:sample,time:4.19,impacted:true,targetX:1050,targetY:485,damage:0};
traitCast(b,{...sample,mechanic:'water'});traitCast(b,{...sample,mechanic:'rocks'});tickBattle(b,.05);
assert.equal(b.cinematic?.skill.mechanic,'lightning');assert(validBattleSnapshot(b));assert(validBattleSnapshot(JSON.parse(JSON.stringify(b))));

const event=defs.reader('event').get('event:nanhua.trial');let initial=newStorySession(991).current;
const offer={eventDefId:event.eventDefId,rarity:storyRarity(event),params:{},optionStates:optionStates(event,storyRarity(event),{state:initial,defs},wiring.fx)};
let s=Session.restore(wiring,{...initial,turn:{...initial.turn,pending:[offer]}});s.beginEventChallenge(0);s.enterEventChallenge();
assert(s.current.eventChallenge!.rally);s.current.eventChallenge!.rally!.winner='ally';s.finishEventDebate();assert(validEventChallengeSnapshot(s.current));
s=Session.restore(wiring,structuredClone(s.current));s.continueEventChallenge();s.enterEventChallenge();assert.equal(s.current.eventChallenge!.phase,'prep');
assert.equal(s.current.eventChallenge!.skills.length,3);assert.throws(()=>s.configureEventChallenge(['skill:tactic-cavalry'],60));
s.enterEventChallenge();assert(s.current.eventChallenge!.battle);assert(!s.current.eventChallenge!.rally);assert(validEventChallengeSnapshot(s.current));
for(let stage=1;stage<=2;stage++){
 const battle=s.current.eventChallenge!.battle!;for(const u of battle.units)if(u.side==='enemy')u.hp=0;battle.status='finished';
 s.tickEventChallenge(1/60);assert(validEventChallengeSnapshot(s.current));
 if(stage===1){assert.throws(()=>s.resolveEvent(0));s=Session.restore(wiring,structuredClone(s.current));s.continueEventChallenge();s.enterEventChallenge();s.enterEventChallenge();}
}
s.resolveEvent(0);assert(s.current.abilities.traits.includes(traitId('trait:daofaziran')));assert(!s.current.abilities.skills.includes(skillId('skill:tactic-water')));
console.log('nanhua: branches, rewards, growth, equipment, lightning and mixed trials passed');
