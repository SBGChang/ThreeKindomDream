import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBattleStory} from '../../src/app/battle-story.js';
import {duelActionStart,duelPresentation,DUEL_ACTION_SECONDS} from '../../src/app/duel-presentation.js';
import {createStoryField,startStoryField,tickStoryField,armiesEngaged,advanceFieldStory,fieldDialogueVisible,answerFieldDuel,castFieldSkill} from '../../src/app/battle-story-field.js';
const d=validateBattleStory(JSON.parse(readFileSync(new URL('../../public/demo/hulao-story.json',import.meta.url),'utf8')));
const autoData={...d,entry:'zhang-duel'},auto=createStoryField(autoData);startStoryField(auto);
for(let i=0;i<2000&&auto.encounter.contest?.phase!=='clash';i++)tickStoryField(autoData,auto,1/60);
const automatic=auto.encounter.contest!;assert.equal(automatic.phase,'clash');
assert.equal(duelPresentation(automatic).stage,'combat','AI skips the action-reveal wait');
assert.equal(automatic.phaseTime,duelActionStart(automatic));
assert.equal(automatic.duel!.history.length,1);
for(let i=0;i<Math.ceil(DUEL_ACTION_SECONDS*60)+2&&automatic.duel!.history.length===1;i++){
 tickStoryField(autoData,auto,1/60);assert.notEqual(automatic.phase,'read','AI connects exchanges without decision idle');
}
assert.equal(automatic.duel!.history.length,2);
assert.equal(duelPresentation(automatic).stage,'combat');
const s=createStoryField(d),b=s.encounter.battle;startStoryField(s);
assert.equal(fieldDialogueVisible(d,s),false);
for(let i=0;i<1800&&!s.triggered;i++)tickStoryField(d,s,1/60);
assert.equal(s.triggered,true);assert.equal(armiesEngaged(s),true);assert.ok(b.time>0);assert.equal(s.story.node,'arrival');
const frozen=JSON.stringify(b);for(let i=0;i<120;i++)tickStoryField(d,s,1/60);assert.equal(JSON.stringify(b),frozen,'dialogue freezes armies and clock');
assert.equal(castFieldSkill(s,b.skills[0]!.id),false);
const next=(choice?:string)=>assert.equal(advanceFieldStory(d,s,s.story.revision,choice),true);
next();next();next('watch');
let count=0;const seen=new Set<string>();
while(String(s.story.node)!=='second-challenge'&&count++<18000){
 seen.add(s.story.node);
 if(fieldDialogueVisible(d,s))next();else tickStoryField(d,s,1/60);
}
assert.ok(count<18000);assert.ok(seen.has('zhang-duel')&&seen.has('guan-duel')&&seen.has('liu-duel'));
assert.equal(JSON.stringify(b),frozen,'NPC duels never settle the main army');
next('accept');assert.equal(answerFieldDuel(d,s,'attack'),false,'cannot act during entry');
const actions=['defend','attack','defend','attack'] as const;let actionAt=0;count=0;
while(d.nodes[s.story.node]!.kind!=='end'&&count++<12000){
 if(fieldDialogueVisible(d,s)){next();continue;}
 if(s.encounter.contest?.phase==='read'&&!s.story.duel!.result&&actionAt<actions.length){if(answerFieldDuel(d,s,actions[actionAt]!))actionAt++;}
 tickStoryField(d,s,1/60);
}
assert.equal(s.story.node,'tired-end');assert.equal(s.story.items.length,2);assert.equal(b.time,s.contactTime);
next();assert.equal(s.mode,'field');assert.equal(s.encounter.battle,b,'returns to same battlefield instance');assert.equal(b.defeated,'enemy');
for(let i=0;i<600&&String(s.mode)!=='finished';i++)tickStoryField(d,s,1/60);
assert.equal(s.mode,'finished');assert.equal(b.wave,1);assert.equal(s.story.granted.length,1);
const declineData={...d,entry:'second-challenge'},decline=createStoryField(declineData);startStoryField(decline);
for(let i=0;i<1800&&!decline.triggered;i++)tickStoryField(declineData,decline,1/60);
assert.equal(advanceFieldStory(declineData,decline,decline.story.revision,'decline'),true);
assert.equal(advanceFieldStory(declineData,decline,decline.story.revision),true);
const beforeResume=decline.encounter.battle.time;
for(let i=0;i<30;i++)tickStoryField(declineData,decline,1/60);
assert.equal(decline.mode,'field');assert.ok(decline.encounter.battle.time>beforeResume);assert.equal(decline.story.items.length,0);
decline.paused=true;const paused=JSON.stringify(decline.encounter.battle);tickStoryField(declineData,decline,1);assert.equal(JSON.stringify(decline.encounter.battle),paused);
console.log('battle-story-field passed: melee trigger, frozen clock/armies, NPC chain, live duel, same-field return, first-wave settlement');
