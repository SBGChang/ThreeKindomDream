import assert from 'node:assert/strict';
import {defs,wiring,newStorySession} from './harness.js';
import {Session} from '../../src/app/session.js';
import {optionStates,salaryFor} from '../../src/modules/commission.js';
import {storyRarity,blockers} from '../../src/modules/stories.js';
import {createDuel,resolveDuel,fullDamage,forecastDuel,DEFAULT_DUEL_BUILD} from '../../src/app/duel-model.js';
import {validEventChallengeSnapshot} from '../../src/app/event-challenge-validation.js';
import {validEventChallengeDef} from '../../src/data-runtime/event-challenge-validation.js';
import {withTeaching} from '../../content-source/teaching.js';
import {lvbu} from '../../content-source/lvbu.js';
import {duelTraitBuild} from '../../src/app/duel-trait-build.js';

const trait=defs.reader('trait').all().find(d=>d.duelTrait==='peerless')!;
const event=defs.reader('event').all().find(d=>d.options.some(o=>o.challenge?.stages))!;
const definition=event.options[0]!.challenge!;
for(const side of ['ally','enemy'] as const){
 const attacker={...DEFAULT_DUEL_BUILD,trait:'peerless' as const,traitChance:1,comboEnabled:side==='ally'};
 const defender={...DEFAULT_DUEL_BUILD,trait:'reversal' as const};
 const s=createDuel(side==='ally'?attacker:defender,side==='enemy'?attacker:defender);
 const target=side==='ally'?'enemy':'ally',damage=fullDamage(s[side],s[target]);
 s.enemyAction=side==='ally'?'defend':'attack';
 assert(resolveDuel(s,side==='ally'?'attack':'defend'));
 assert.equal(s.last![side==='ally'?'allyEvolution':'enemyEvolution'],'無雙飛將');
 assert.equal(s.last![side==='ally'?'enemyEvolution':'allyEvolution'],null);
 assert.equal(s.last![side==='ally'?'damageToEnemy':'damageToAlly'],damage);
 assert.equal(s.last![side==='ally'?'allyCost':'enemyCost'],24);
 assert(s[target].fainted);assert(s[target].stamina>5,'forced exhaustion is not artificial stamina loss');
 const saved=structuredClone(s);
 const action=s.ally.fainted?null:'rest';assert(resolveDuel(s,action));assert(resolveDuel(saved,action));assert.deepEqual(saved,s);
 assert.equal(s.last![target],null,'forced exhaustion skips exactly the next command');assert.equal(s[target].fainted,false);
}
const plain=createDuel(),buff=createDuel({...DEFAULT_DUEL_BUILD,power:1.5});
const noProc=createDuel({...DEFAULT_DUEL_BUILD,trait:'peerless',traitChance:0});noProc.enemyAction='defend';resolveDuel(noProc,'attack');assert.notEqual(noProc.last!.allyEvolution,'無雙飛將');assert.equal(noProc.enemy.fainted,false);
for(const action of ['attack','rest'] as const){const duel=createDuel({...DEFAULT_DUEL_BUILD,trait:'peerless',traitChance:1});duel.enemyAction=action;resolveDuel(duel,'attack');assert.notEqual(duel.last!.allyEvolution,'無雙飛將');}
assert.equal(buff.ally.attack,plain.ally.attack*1.5);assert.equal(buff.ally.defense,plain.ally.defense*1.5);assert.equal(buff.ally.build.war,plain.ally.build.war);
for(let seed=0;seed<200;seed++){
 const s=createDuel({...DEFAULT_DUEL_BUILD,trait:'peerless',traitChance:.25},{...DEFAULT_DUEL_BUILD,trait:'reversal'},seed);
 const forecast=forecastDuel(s,'attack','defend')!,before=structuredClone(s);s.enemyAction='defend';resolveDuel(s,'attack');
 for(const side of ['ally','enemy'] as const){const delta=before[side].injury-s[side].injury;assert(delta>=forecast[side].health[0]&&delta<=forecast[side].health[1]);}
}
function fixture(){
 const initial=newStorySession(991),state={...initial.current,attributes:{values:{lead:100,war:100,int:80,pol:80}}};
 const offer={eventDefId:event.eventDefId,rarity:storyRarity(event),params:{},optionStates:optionStates(event,storyRarity(event),{state,defs},wiring.fx)};
 return Session.restore(wiring,{...state,turn:{...state.turn,pending:[offer]}});
}
function win(s:Session){
 const c=s.current.eventChallenge!;s.enterEventChallenge();s.pauseEventChallenge(false);
 const d=c.contest!.duel!;d.enemy.injury=d.enemy.injuryLimit-1;d.enemyAction='rest';
 assert(s.answerEventDuel(0));for(let i=0;i<600&&c.phase==='playing';i++)s.tickEventChallenge(1/60);
 assert(validEventChallengeSnapshot(s.current));
}
for(let cleared=0;cleared<3;cleared++){
 let s=fixture();s.beginEventChallenge(0);
 for(let i=0;i<cleared;i++){win(s);assert.equal(s.current.eventChallenge!.phase,'intermission');assert.throws(()=>s.resolveEvent(0));if(i+1<cleared)s.continueEventChallenge();}
 s=Session.restore(wiring,structuredClone(s.current));assert(validEventChallengeSnapshot(s.current));
 const money=s.money;s.retreatEventChallenge();s.resolveEvent(0);
 assert.equal(s.money-money,salaryFor(event.options[0]!,storyRarity(event),false,s.ctx)+definition.cashOutGold![cleared]!);
 assert(!s.current.abilities.traits.includes(trait.traitId));assert.throws(()=>s.resolveEvent(0));assert(blockers(event,s.ctx).includes('本輪已完成'));
}
const s=fixture();s.beginEventChallenge(0);
for(let i=0;i<3;i++){
 win(s);const c=s.current.eventChallenge!,d=c.contest!.duel!;
 assert.equal(d.enemy.attack,(18+100*.32)*[.5,1,1.5][i]!);assert.equal(d.enemy.build.war,100);assert.equal(d.enemy.progression,false);assert.equal(d.enemy.build.trait,'peerless');
 if(i<2){s.continueEventChallenge();assert.throws(()=>s.continueEventChallenge());}
}
assert.equal(s.current.eventChallenge!.outcome,'win');s.resolveEvent(0);
assert(s.current.abilities.traits.includes(trait.traitId));assert(s.current.growth.unlockedTraits.includes(trait.traitId));
assert.equal(duelTraitBuild([defs.reader('trait').all().find(d=>d.duelTrait==='steady')!.traitId,trait.traitId],s.ctx).trait,'peerless');
const failed=fixture();failed.beginEventChallenge(0);win(failed);failed.continueEventChallenge();failed.enterEventChallenge();
const duel=failed.current.eventChallenge!.contest!.duel!;duel.ally.injury=duel.ally.injuryLimit-1;duel.enemyAction='attack';failed.answerEventDuel(2);for(let i=0;i<600;i++)failed.tickEventChallenge(1/60);
assert.equal(failed.current.eventChallenge!.outcome,'lose');failed.resolveEvent(0);assert(!failed.current.abilities.traits.includes(trait.traitId));
assert(validEventChallengeDef(definition));assert(!validEventChallengeDef({...definition,stages:[{power:NaN}]}));
assert(!validEventChallengeDef({...definition,cashOutGold:[20]}));
const taught=withTeaching({...event,options:[{...event.options[1]!,rewards:[]}]},[lvbu]);
assert(!taught.options.some(o=>o.rewards.some(r=>r.kind==='unlock'&&r.trait===trait.traitId)));
const sources=defs.reader('event').all().flatMap(e=>e.options.flatMap(o=>o.rewards.filter(r=>r.kind==='unlock'&&r.trait===trait.traitId).map(()=>e.eventDefId)));
assert.deepEqual(sources,[event.eventDefId]);
console.log('Lv Bu trial passed: symmetric guard break/exhaustion, forecasts, Buffs, three wins, cashouts, failure, save/restore, exclusive teaching and single settlement');
