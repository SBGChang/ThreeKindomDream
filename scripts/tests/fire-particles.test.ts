import assert from 'node:assert/strict';
import {drawFireParticles} from '../../src/ui/fire-particles.js';
import {drawBattle,stageSkillCommander,skillStageAnchor,stageSkillTroops} from '../../src/ui/realtime-battle-render.js';
import {createBattle,castSkill,DEMO_SKILLS} from '../../src/ui/realtime-battle-model.js';

function recorder(){
 const calls:unknown[][]=[],gradient={addColorStop:()=>{}};
 const ctx=new Proxy({} as CanvasRenderingContext2D,{
  get:(_target,key)=>String(key).startsWith('create')?()=>gradient:(...args:unknown[])=>{calls.push([key,...args]);},
  set:(_target,key,value)=>{calls.push(['set',key,value]);return true;},
 });
 return {ctx,calls};
}
const atlas={width:1254,height:1254} as HTMLImageElement;
const sample=(t:number)=>{const r=recorder();drawFireParticles(r.ctx,atlas,t,1000,485);return r.calls;};
assert.equal(sample(0).length,0);
assert.equal(sample(4.2).length,0,'all particles expire before returning to battle');
for(let frame=0;frame<=252;frame++){
 const calls=sample(frame/60);
 for(const call of calls){
  for(const value of call)if(typeof value==='number')assert(Number.isFinite(value));
  if(call[0]==='set'&&call[1]==='globalAlpha')assert(Number(call[2])>=0&&Number(call[2])<=1);
  if(call[0]==='drawImage'){
   const [x,y,w,h]=call.slice(2,6).map(Number);
   assert(x!>=0&&y!>=0&&x!+w!<=1254&&y!+h!<=1254,'sprite sampling stays inside its atlas');
  }
 }
}
const frozen=sample(2.6);sample(3.8);sample(.7);
assert.deepEqual(sample(2.6),frozen,'absolute time makes pause/resume and repeated frames identical');
assert(frozen.some(c=>c[0]==='set'&&c[1]==='globalCompositeOperation'&&c[2]==='lighter'));
assert(frozen.some(c=>c[0]==='set'&&c[1]==='globalCompositeOperation'&&c[2]==='source-over'));
for(const skill of DEMO_SKILLS){
 const battle=createBattle();battle.status='running';battle.phase='combat';assert(castSkill(battle,skill.id));
 const commander=battle.commanders.find(g=>g.name===skill.owner)!;
 const ownerAtlas={width:1024,height:2048} as HTMLImageElement;
 const images={'fire-particles':atlas,['commander-'+commander.id]:ownerAtlas};
 battle.cinematic!.time=.2;
 const before=JSON.stringify(battle),r=recorder();drawBattle(r.ctx,images,battle);
 assert.equal(JSON.stringify(battle),before,'drawing never changes simulation or army positions');
 assert(r.calls.some(c=>c[0]==='drawImage'&&c[1]===ownerAtlas&&Number(c[8])<=185/.85),'the owner stays within normal unit scale including wide-camera compensation');
}
console.log('Textured fire passed: atlas bounds, lifetime, alpha, deterministic pause/replay, blend layers, six simultaneous skill owners and read-only rendering.');

for(const skill of DEMO_SKILLS){
 const s=createBattle();s.status='running';s.phase='combat';castSkill(s,skill.id);
 const owner=s.commanders.find(g=>g.name===skill.owner)!,anchor=skillStageAnchor(s);
 for(const t of [0,.2,.35,.7,1.1,1.5,2.5,3.1,3.7,4.2]){
  s.cinematic!.time=t;const before=JSON.stringify(s),view=stageSkillCommander(owner,s,{x:920,y:460,zoom:1.3}),actors=stageSkillTroops(s);
  assert.equal(view.opacity,1);assert.equal(view.size,185);
  assert.equal(JSON.stringify(s),before,'presentation never moves real units or changes battle state');
  if(t>=.7&&t<=3.7){assert.equal(view.unit.x,anchor.x);assert.equal(view.unit.y,anchor.y);}
  if(t>=.35&&t<3.7)for(const g of s.commanders.filter(g=>g!==owner)){
   const other=stageSkillCommander(g,s);assert.equal(other.opacity,0);assert(other.unit.x<0||other.unit.x>1600,'other commanders leave the screen');
  }
  if(t===0||t===4.2){assert.equal(view.unit.x,owner.x);assert.equal(view.unit.y,owner.y);}
  if(t<.7||t>=3.7)assert.equal(actors.length,0);
  if(t===.7)assert(actors.every(a=>a.phase==='enter'&&a.x<0&&a.name===(skill.kind==='charge'?'charge':skill.kind==='mounted'?'mounted':'run')));
  if(t===1.1)assert(actors.every(a=>a.phase==='wait'&&a.x>anchor.x&&a.frame===0));
  if(t===1.5)assert(actors.every(a=>a.phase==='act'));
  if(t===3.1)assert(actors.every(a=>a.phase==='return'&&a.flip&&a.name===(skill.kind==='charge'?'charge':skill.kind==='mounted'?'mounted':'run')));
 }
}
console.log('Formation staging passed: six skill owners, fixed formation center, sequential entry/order/action/return, and unchanged simulation.');

const early=sample(1.43).filter(c=>c[0]==='drawImage'),late=sample(2.1).filter(c=>c[0]==='drawImage');
assert(late.length>early.length*2,'the ember front grows denser before ignition');
assert(Math.max(...late.map(c=>Number(c[9])))>Math.max(...early.map(c=>Number(c[9])))*1.5,'travelling fire grows in size');
console.log('Growing ember front passed: increasing textured density and size before the approved fire burst.');
