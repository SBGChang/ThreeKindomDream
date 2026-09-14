import assert from 'node:assert/strict';
import { newSession, defs, wiring } from './harness.js';
import { Session } from '../../src/app/session.js';
import { begin } from '../../src/modules/campaign.js';
import { armyCount, damageTroop, CINEMATIC_LENGTH } from '../../src/app/realtime-battle-model.js';
import type { BattleState } from '../../src/contracts/core/realtime-battle.js';

function setup() {
 const original=newSession(4242).current;
 const skills=defs.reader('skill').all().map(d=>d.skillId);
 const people=defs.reader('notable').all().filter(d=>d.abilities.skills.length).slice(0,3);
 const state={...original,progress:{...original.progress,pendingCampaign:true,turnInChapter:8},abilities:{...original.abilities,skills},economy:{...original.economy,chapterCamp:false},roster:{members:people.map(d=>({notableId:d.notableId,affinity:60,origin:'companion' as const}))},metaSnapshot:{...original.metaSnapshot,notableCodex:Object.fromEntries(people.map(d=>[String(d.notableId),{star:3,fragments:0}]))}};
 const s=Session.restore(wiring,begin(state.progress.chapterId,{state,defs},wiring.fx));
 const loadout={skills:skills.slice(0,3),commanders:people.map(d=>({notableId:d.notableId,skillId:s.commanderSkills(d.notableId)[0]!}))};
 s.configureCampaign(loadout);return s;
}
const step=(s:Session,seconds:number)=>{for(let i=0;i<Math.ceil(seconds*60);i++)s.advanceRealtimeCampaign(1/60);};
const until=(s:Session,b:BattleState,predicate:()=>boolean)=>{for(let i=0;i<20000&&!predicate();i++)s.advanceRealtimeCampaign(1/60);assert.ok(predicate(),`${b.phase} ${b.status}`);};
const s=setup(),b=s.startRealtimeCampaign();
assert.equal(b.initial,s.current.campaign!.host.troops);assert.equal(b.supply,s.current.campaign!.host.supply);
assert.equal(b.skills.length,6);assert.equal(b.skills[0]!.name,defs.text(String(defs.reader('skill').get(String(s.current.campaign!.loadout!.skills[0])).nameKey)));
assert.equal(s.startRealtimeCampaign(),b,'re-entering keeps the same battle');
assert.throws(()=>s.engage());assert.throws(()=>s.withdraw());assert.throws(()=>s.settleRealtimeCampaign());
until(s,b,()=>b.phase==='combat');assert.equal(b.time,0);
const skill=b.skills[0]!;assert.ok(s.castRealtimeSkill(skill.id));assert.equal(b.supply,b.supplyMax-skill.cost);
assert.equal(s.castRealtimeSkill(skill.id),false,'no double casting during cinematic');step(s,1);
const serialized=JSON.parse(JSON.stringify(s.current));
const resumed=Session.restore(wiring,serialized),rb=resumed.startRealtimeCampaign();assert.equal(rb.status,'paused');assert.equal(rb.cinematic!.time,b.cinematic!.time);assert.equal(rb.supply,b.supply);
const frozen=JSON.stringify(rb);step(resumed,1);assert.equal(JSON.stringify(rb),frozen);
resumed.pauseRealtimeCampaign(false);step(resumed,CINEMATIC_LENGTH);assert.equal(rb.castCount,1);assert.ok(rb.kills>0,'resumed cinematic impacts once');
// Completing a real wave keeps troops, supplies and cooldowns through the transition.
for(const u of rb.units.filter(u=>u.side==='enemy'))damageTroop(rb,u,u.hp);
const carried={troops:armyCount(rb,'ally'),supply:rb.supply,time:rb.time};until(resumed,rb,()=>rb.wave===2&&rb.phase==='combat');
assert.equal(armyCount(rb,'ally'),carried.troops);assert.equal(rb.supply,carried.supply);assert.equal(rb.time,carried.time);
assert.equal(rb.enemyInitial,resumed.campaignWaveTroops(1));
rb.time=rb.duration-.001;step(resumed,.1);assert.equal(rb.status,'finished');assert.equal(rb.time,60);
const savedFinish=Session.restore(wiring,JSON.parse(JSON.stringify(resumed.current)));assert.equal(savedFinish.startRealtimeCampaign().status,'finished');
const forecast=savedFinish.realtimeCampaignResult(),before=savedFinish.money,chapter=savedFinish.current.progress.chaptersPassed;
assert.equal(forecast.cleared,1);assert.equal(forecast.money,savedFinish.stageRows()[0]!.salary);
savedFinish.settleRealtimeCampaign();assert.equal(savedFinish.money-before,forecast.money);assert.equal(savedFinish.current.progress.chaptersPassed,chapter+1);assert.ok(savedFinish.needsChapterCamp);assert.equal(savedFinish.current.campaign,null);
assert.throws(()=>savedFinish.settleRealtimeCampaign());assert.equal(savedFinish.money-before,forecast.money);
// A routed army settles partial kills with the same half-reward rule.
const loser=setup(),lb=loser.startRealtimeCampaign();until(loser,lb,()=>lb.phase==='combat');
for(const u of lb.units.filter(u=>u.side==='enemy'))damageTroop(lb,u,Math.floor(u.hp/2));
const unhalved=loser.realtimeCampaignResult().money;
for(const u of lb.units.filter(u=>u.side==='ally'))damageTroop(lb,u,u.hp);
until(loser,lb,()=>lb.status==='finished');assert.ok(loser.realtimeCampaignResult().defeated);assert.equal(loser.realtimeCampaignResult().money,Math.floor(unhalved/2));
// All five learned action kinds carry real cost, cooldown and effect into live combat.
for(const kind of ['physical','magic','heal','buff','debuff'] as const){
 const actor=setup(),id=defs.reader('skill').all().find(d=>d.action.kind===kind)!.skillId;
 actor.rememberCampaign({skills:[id],commanders:[]}); // frozen state ignores this call
 const current=actor.current;const fresh=Session.restore(wiring,{...current,campaign:{...current.campaign!,phase:'configuring',loadout:null}});
 fresh.configureCampaign({skills:[id],commanders:[]});const fb=fresh.startRealtimeCampaign();until(fresh,fb,()=>fb.phase==='combat');
 if(kind==='heal'){for(const u of fb.units.filter(u=>u.side==='ally'))damageTroop(fb,u,10);}
 const kills=fb.kills,allies=armyCount(fb,'ally');assert.ok(fresh.castRealtimeSkill(fb.skills[0]!.id));step(fresh,CINEMATIC_LENGTH);
 if(kind==='heal'){assert.ok(armyCount(fb,'ally')>allies);assert.equal(armyCount(fb,'ally')+fb.lost,fb.initial);assert.equal(fb.kills,kills);}
 if(kind==='buff')assert.ok(fb.buff>0);
 if(kind==='debuff'){assert.ok(fb.debuff>0);assert.equal(fb.kills,kills);}
 if(kind==='physical'||kind==='magic')assert.ok(fb.kills>kills);
}
// Run the integrated commands to their natural endpoint without any saved-player repository.
for(const auto of [false,true]){
 const sim=setup(),sb=sim.startRealtimeCampaign();
 for(let i=0;i<240*60&&sb.status!=='finished';i++){if(auto&&i%30===0)for(const skill of sb.skills)if(sim.castRealtimeSkill(skill.id))break;sim.advanceRealtimeCampaign(1/60);}
 assert.equal(sb.status,'finished');assert.equal(armyCount(sb,'ally')+sb.lost,sb.initial);
 console.log({auto,time:sb.time,kills:sb.kills,wave:sb.wave,result:sim.realtimeCampaignResult().money});
}
console.log('Campaign integration passed: live loadout, skill kinds, no reroll, pause/save/resume, cross-wave carry, deadline, defeat, one-time rewards and chapter camp.');
import { restoreRun, saveRun } from '../../src/app/save.js';
import { validBattleSnapshot } from '../../src/app/realtime-battle-model.js';
const memory=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,value),removeItem:(key:string)=>memory.delete(key)}});
const persisted=setup(),pb=persisted.startRealtimeCampaign();until(persisted,pb,()=>pb.phase==='combat');persisted.castRealtimeSkill(pb.skills[0]!.id);step(persisted,2);
saveRun(persisted,[]);const restored=restoreRun(wiring);assert.equal(restored.notice,'');assert.equal(restored.session!.current.campaign!.realtime!.status,'paused');assert.equal(restored.session!.current.campaign!.realtime!.cinematic!.time,pb.cinematic!.time);
assert.ok(validBattleSnapshot(pb));assert.equal(validBattleSnapshot({...pb,waveTroops:[0]}),false);
const raw=JSON.parse(memory.get('sgd.run.v3')!);raw.state.campaign.realtime.waveTroops=[0];memory.set('sgd.run.v3',JSON.stringify(raw));assert.equal(restoreRun(wiring).session,null,'malformed waves cannot enter reward loops');
const endless=setup(),eb=endless.startRealtimeCampaign(),rows=endless.stageRows();
eb.kills=eb.waveTroops.reduce((n,v)=>n+v,0)+eb.waveTroops.at(-1)!;
const endlessResult=endless.realtimeCampaignResult();assert.equal(endlessResult.cleared,8);assert.equal(endlessResult.money,rows.reduce((n,r)=>n+r.salary,0)+rows.at(-1)!.salary);
console.log('Save and endless-wave QA passed: active-cast resume, invalid snapshot handling, eighth wave rewards.');
