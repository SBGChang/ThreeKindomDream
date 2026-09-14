import assert from 'node:assert/strict';
import { armyBarWidth, armyCount, castSkill, createBattle, startBattle, damageTroop, DEMO_SKILLS, CINEMATIC_LENGTH, tickBattle, type BattleState } from '../../src/ui/realtime-battle-model.js';
const advance=(s:BattleState,seconds:number)=>{for(let i=0;i<Math.ceil(seconds*60);i++)tickBattle(s,1/60);};
const until=(s:BattleState,predicate:()=>boolean,max=30)=>{for(let i=0;i<max*60&&!predicate();i++)tickBattle(s,1/60);assert.ok(predicate(),'phase must reach expected state');};
const fighting=(troops=400)=>{const b=createBattle(troops);startBattle(b);until(b,()=>b.phase==='combat');return b;};
const s=createBattle(425);assert.equal(armyCount(s,'ally'),425);assert.equal(s.units.filter(u=>u.side==='ally').length,9);assert.ok(s.units.every(u=>u.hp<=50));
assert.ok(Math.abs(armyBarWidth(600)/armyBarWidth(400)-1.5)<1e-10);
const victim=s.units.find(u=>u.side==='enemy')!;damageTroop(s,victim,49);assert.equal(victim.hp,1);assert.notEqual(victim.pose,'dead');damageTroop(s,victim,99);assert.equal(victim.hp,0);assert.equal(s.kills,50);damageTroop(s,victim,50);assert.equal(s.kills,50);
const intro=createBattle();startBattle(intro);
const introSupply=intro.supply;
for(const phase of ['reveal','start','combat']){until(intro,()=>intro.phase===phase);assert.equal(intro.time,0,'time freezes throughout entrance, reveal and Start');assert.equal(intro.supply,introSupply);}
assert.ok(intro.units.every(u=>u.pose==='run'),'both armies start running before time resumes');advance(intro,.1);assert.ok(intro.time>0);
const rear=intro.commanders.map(c=>c.x);advance(intro,8);assert.deepEqual(intro.commanders.map(c=>c.x),rear,'generals never join infantry combat');
for(const skill of DEMO_SKILLS){
 const b=fighting();assert.ok(b.commanders.some(c=>c.name===skill.owner),'every skill has its own real commander');
 assert.equal(castSkill(b,skill.id),true);assert.equal(castSkill(b,'charge'),false);assert.equal(b.supply,160-skill.cost);
 advance(b,1.2);assert.equal(b.kills,0,'command gesture precedes the skill');assert.equal(b.time,0);
 advance(b,CINEMATIC_LENGTH-1.2);assert.equal(b.kills,skill.damage);assert.equal(b.castCount,1);assert.ok(b.time<.03);
 assert.ok(b.cooldowns[skill.id]!>=skill.cd-.03);
}
const wave=fighting(425);advance(wave,2);wave.cooldowns.fire=7;wave.buff=8;
for(const u of wave.units.filter(u=>u.side==='enemy'))damageTroop(wave,u,50);
const frozen={time:wave.time,supply:wave.supply,buff:wave.buff,cd:wave.cooldowns.fire,ally:armyCount(wave,'ally')};
tickBattle(wave,1/60);assert.equal(wave.phase,'fallen');assert.equal(wave.time,frozen.time);assert.equal(castSkill(wave,'fire'),false);
for(const phase of ['flee','cheer','exit','fade-out','fade-in','entry','reveal','start','combat']){
 until(wave,()=>wave.phase===phase);
 assert.equal(wave.time,frozen.time);assert.equal(wave.supply,frozen.supply);assert.equal(wave.buff,frozen.buff);assert.equal(wave.cooldowns.fire,frozen.cd);
 assert.equal(armyCount(wave,'ally'),frozen.ally,'surviving troops carry across waves without healing');
 if(['flee','cheer','exit','fade-out'].includes(phase))assert.equal(armyCount(wave,'enemy'),0,'no reinforcements mid-wave or during rout');
}
assert.equal(wave.wave,2);assert.equal(armyCount(wave,'enemy'),600);
const partial=fighting();const originalIds=partial.units.filter(u=>u.side==='enemy').map(u=>u.id);
damageTroop(partial,partial.units.find(u=>u.side==='enemy')!,50);advance(partial,5);
assert.equal(partial.wave,1);assert.ok(partial.units.filter(u=>u.side==='enemy').every(u=>originalIds.includes(u.id)),'losses never spawn replacement squads');
const rally=fighting();castSkill(rally,'inspire');advance(rally,CINEMATIC_LENGTH);assert.ok(rally.buff>9.9);advance(rally,10.2);assert.equal(rally.buff,0);
const poor=fighting();poor.supply=24;assert.equal(castSkill(poor,'inspire'),false);assert.equal(poor.supply,24);
for(const phase of ['entry','flee','cheer','fade-out'] as const){const p=fighting();p.phase=phase;p.status='paused';const before=JSON.stringify(p);advance(p,5);assert.equal(JSON.stringify(p),before);}
const deadline=fighting();deadline.time=59.99;advance(deadline,1);assert.equal(deadline.status,'finished');assert.equal(deadline.time,60);const settled=JSON.stringify(deadline);advance(deadline,10);assert.equal(JSON.stringify(deadline),settled);
const wipe=fighting(50);for(const u of wipe.units.filter(u=>u.side==='ally'))damageTroop(wipe,u,50);
until(wipe,()=>wipe.phase==='flee');assert.equal(wipe.time,0);assert.ok(wipe.commanders.filter(c=>c.side==='ally').every(c=>c.flip));
until(wipe,()=>wipe.status==='finished');assert.equal(wipe.wave,1);assert.equal(wipe.reason,'我軍力竭 · 演武結束');
for(const troops of [200,400,600]){
 const sim=fighting(troops);let transitions=0,last=sim.phase;
 for(let i=0;i<180*60&&sim.status==='running';i++){if(i%30===0)for(const skill of DEMO_SKILLS)if(castSkill(sim,skill.id))break;tickBattle(sim,1/60);if(sim.phase!==last){transitions++;last=sim.phase;}}
 assert.equal(sim.status,'finished');assert.equal(armyCount(sim,'ally')+sim.lost,troops);
 assert.ok(sim.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.y)));
 console.log({troops,time:sim.time,kills:sim.kills,waves:sim.wave,transitions,reason:sim.reason});
}
console.log('Battle wave QA passed: no replenishment, frozen transitions, general ownership, six skills, survival carry-over, defeat and deadline.');