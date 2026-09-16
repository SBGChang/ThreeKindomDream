import assert from 'node:assert/strict';
import { defs,newStorySession,wiring } from './harness.js';
import { Session } from '../../src/app/session.js';
import { factionId } from '../../src/contracts/core/ids.js';
import { driveRun } from '../../src/app/run-driver.js';
import { POLICIES } from '../lib/policies.js';
const wu=factionId('faction:wu');
const choices:Record<string,string>={'U2.A':'scouts','U3.A':'escort','U3.B':'handover','U7.A':'charter','U7.B':'handover','U8.A':'hearing','U8.B':'handover'};
function storyFixture(depth:number,overrides:Record<string,string>={}){
 const s=newStorySession(912),picked={...choices,...overrides};let actions=0;
 for(let i=0;i<1000&&!s.isOver;i++){
  if(s.storyScene){s.acknowledgeStory(s.storyScene.id);continue;}
  if(s.needsEndingChoice){s.chooseStoryEnding(String(s.storyEndingOptions()[0]!.ending));continue;}
  if(s.storyChoice){s.chooseStory(s.storyChoice.id,picked[s.storyChoice.id]??s.storyChoice.options[0]!.id);continue;}
  if(s.needsChapterCamp){s.continueChapter();continue;}
  if(s.needsFactionChoice){assert(s.factionOptions().some(o=>o.factionId===wu&&o.eligible));s.chooseFaction(wu);continue;}
  if(s.needsSuperiors){s.assignSuperiors([]);continue;}
  if(s.needsCampaign){
   s.configureCampaign({skills:[],commanders:[],infantryPercent:35});const b=s.startRealtimeCampaign();
   // Explicit outcome fixture: exercise the production settlement and story gates independently of balance.
   b.kills=b.waveTroops.slice(0,depth).reduce((n,v)=>n+v,0);b.wave=depth+1;b.status='finished';
   s.settleRealtimeCampaign();continue;
  }
  if(!s.hasActed){s.selectSlot(0);actions++;}
  while(s.pendingEvent)s.resolveEvent(0);
  if(s.canAdvance())s.advance();
 }
 assert(s.isOver);assert.equal(actions,72);assert.equal(Object.keys(s.current.story.choices).length,18);return s;
}
assert.equal(defs.reader('chapter').all().filter(c=>c.factionId===wu).length,8);
assert.equal(defs.reader('notable').all().filter(n=>n.factionId===wu).length,12);
const success=storyFixture(5);assert(success.current.story.milestones.includes('wu.sunce-rescued'));assert(success.current.story.milestones.includes('wu.hearing-restored'));assert.equal(String(success.current.ending!.endingId),'ending:wu.tomorrow');
const short=storyFixture(4);assert(!short.current.story.milestones.includes('wu.sunce-rescued'));assert(!short.current.story.milestones.includes('wu.hearing-restored'));
const unprepared=storyFixture(7,{'U2.A':'assault','U7.A':'harbor'});assert(!unprepared.current.story.milestones.includes('wu.sunce-rescued'));assert(!unprepared.current.story.milestones.includes('wu.hearing-restored'));
const partial=storyFixture(5,{'U3.B':'personal','U8.B':'guard'});assert(partial.current.story.milestones.includes('wu.sunce-rescued'));assert(partial.current.story.milestones.includes('wu.hearing-restored'));assert(!['ending:wu.tomorrow','ending:wu.brothers'].includes(String(partial.current.ending!.endingId)));
const resumed=Session.restore(wiring,JSON.parse(JSON.stringify(success.current)));assert.deepEqual(resumed.current.story,success.current.story);
const live=newStorySession(515);const result=driveRun(live,{...POLICIES[0]!,chooseFaction:()=>wu},{battle:'realtime'});assert(live.isOver);assert.equal(result.actions,72);assert.equal(result.depths.length,9);
console.log('Wu passed: eight chapters, twelve notables, 72 actions, both fate branches, failed preparation/depth, partial outcomes, save restore and full live headless run.',result.depths);
