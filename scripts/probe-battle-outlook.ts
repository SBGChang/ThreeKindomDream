/** Reach first campaign legally, then compare a single equipped skill's forecast with real casts. */
import { writeFileSync } from 'node:fs';
import { Session } from '../src/app/session.js';
import { seed } from '../src/contracts/core/ids.js';
import { emptyMeta, emptyDraft } from '../src/modules/dream-entry.js';
import { defs, wiring } from './tests/harness.js';
import { POLICIES } from './lib/policies.js';
const meta=emptyMeta(),s=Session.start(wiring,meta,emptyDraft(meta,defs),seed(9000));
const p=POLICIES.find(p=>p.name==='greedy-gain')!;
for(let guard=0;guard<100&&!s.needsCampaign;guard++){
  if(s.storyScene){s.acknowledgeStory(s.storyScene.id);continue;}
  if(s.storyChoice){s.chooseStory(s.storyChoice.id,s.storyChoice.options[0]!.id);continue;}
  if(!s.hasActed)s.selectSlot(p.chooseSlot(s));
  while(s.pendingEvent)s.resolveEvent(p.chooseOption(s,s.pendingEvent));
  if(s.canAdvance())s.advance();
}
if(!s.needsCampaign)throw Error('First campaign not reached');
const id=s.current.abilities.skills.find(id=>['physical','magic'].includes(defs.reader('skill').get(id).action.kind));
if(!id)throw Error('Missing damage skill');
s.configureCampaign({skills:[id],commanders:[]});
const forecast=s.hostPower(),outcome=s.engage();
const casts=outcome.log.filter(row=>row.actor==='host'&&row.skillKey!==null);
const report={seed:9000,turn:s.current.progress.turn,skill:id,forecast,castChances:defs.single('battleRule').castChances,
  realDamagePerTurn:casts.map(row=>({turn:row.turn,amount:row.amount})),defeated:outcome.defeated};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
