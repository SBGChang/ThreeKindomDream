import assert from 'node:assert/strict';
import {defs,wiring,newStorySession} from './harness.js';
import {emptyMeta} from '../../src/modules/dream-entry.js';
import {preserveRecruitment} from '../../src/modules/recruitment.js';
import {Session} from '../../src/app/session.js';
import {advanceRecruitFarewell,nextRecruitFarewell} from '../../src/app/recruit-farewell.js';
import type {RunState} from '../../src/contracts/core/state.js';

const fresh=emptyMeta(),initial=newStorySession(81579).current;
const ending=defs.reader('ending').all().find(e=>e.endingKind==='fullDream')!;
const recruits=defs.reader('notable').all().filter(d=>!d.recruitment?.initial);
assert.equal(recruits.length,20);
for(const d of recruits){
  assert(d.recruitFarewell,`${d.notableId} has a farewell`);
  assert(d.recruitFarewell.lines.length>=5);
  assert(d.recruitFarewell.lines.some(l=>l.speaker==='你'));
  assert(d.recruitFarewell.lines.every(l=>l.text.trim()&&(!l.speaker||l.speaker==='你'||l.speaker===defs.text(String(d.nameKey)))));
}
const ids=['notable:guanyu','notable:ganning','notable:nanhua'];
const earned:RunState={...initial,earnedUnlocks:ids};
const ctx={state:earned,defs};
let meta=preserveRecruitment(fresh,ctx);
assert.deepEqual(meta.recruitFarewells!.pending,ids);
assert.equal(nextRecruitFarewell(earned,meta,defs),null,'no mid-life playback');
assert.deepEqual(preserveRecruitment(meta,ctx),meta,'autosave never duplicates the queue');
const ended:RunState={...earned,ending:{endingId:ending.ending,isFullDream:true,pointsMultiplier:ending.pointsMultiplier,titleKey:ending.titleKey,bodyKey:ending.bodyKey}};
assert.equal(nextRecruitFarewell(ended,meta,defs),null,'ending alone is not settlement');
const session=Session.restore(wiring,ended);
meta=session.settle(meta).meta;
assert.equal(nextRecruitFarewell(ended,meta,defs)!.notableId,ids[0]);
let scene=nextRecruitFarewell(ended,meta,defs)!;
const advanced=advanceRecruitFarewell(ended,meta,defs,scene.notableId,scene.page);
assert.equal(nextRecruitFarewell(ended,JSON.parse(JSON.stringify(advanced)),defs)!.page,1,'reload resumes the current line');
assert.deepEqual(advanceRecruitFarewell(ended,advanced,defs,scene.notableId,scene.page),advanced,'duplicate input is ignored');
meta=advanced;
const shown:string[]=[];
for(let guard=0;guard<40;guard++){
  const current=nextRecruitFarewell(ended,meta,defs);if(!current)break;
  if(current.page===current.lines.length)shown.push(current.notableId);
  meta=advanceRecruitFarewell(ended,meta,defs,current.notableId,current.page);
}
assert.deepEqual(shown,ids,'each character ends on its own unlock card');
assert.deepEqual(meta.recruitFarewells!.completed,ids);
assert.equal(nextRecruitFarewell(ended,meta,defs),null);
assert.equal(nextRecruitFarewell(ended,session.settle(meta).meta,defs),null,'resettlement cannot replay');
assert.equal(preserveRecruitment(meta,ctx).recruitFarewells!.pending.length,0,'re-earning next life cannot replay');
assert.equal(meta.points,session.settle(meta).meta.points,'resuming never grants points twice');
for(const old of [{...fresh,unlockedNotables:ids},{...fresh,notableCodex:Object.fromEntries(ids.map(id=>[id,{star:0,fragments:0}]))}])
  assert.equal(preserveRecruitment(old,ctx).recruitFarewells!.pending.length,0,'old unlocked characters are not re-announced');
const oldWithNew=preserveRecruitment({...fresh,unlockedNotables:[ids[0]!]},ctx);
assert.deepEqual(oldWithNew.recruitFarewells!.pending,ids.slice(1));
const firstMeta=session.settle(preserveRecruitment(fresh,ctx)).meta;
const alliance:RunState={...ended,story:{...ended.story,choices:{'S4.A':'pact','S6.A':'corridor'},depths:{'ch:shu.hanzhong':7}}};
assert.match(nextRecruitFarewell(ended,firstMeta,defs)!.lines[1]!.text,/麥城/);
assert.match(nextRecruitFarewell(alliance,firstMeta,defs)!.lines[1]!.text,/荊襄/);
// A full-dream lord is first discovered at settlement, after the last story.
const lord=defs.reader('notable').all().find(d=>d.recruitment?.fullDream)!;
const lordRun={...ended,faction:lord.recruitment!.fullDream as RunState['faction'],earnedUnlocks:[]};
const lordMeta=Session.restore(wiring,lordRun).settle(fresh).meta;
assert(lordMeta.recruitFarewells!.pending.includes(String(lord.notableId)));
console.log('PASS: 20 scripts, settlement-only playback, first-time queue, sequential cards, resume, duplicate input, old saves, repeated lives and alliance branch.');
