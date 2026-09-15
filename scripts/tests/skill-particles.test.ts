import assert from 'node:assert/strict';
import {drawSkillParticles,drawBuffAura,type ParticleLayer} from '../../src/ui/skill-particles.js';
import {createBattle,castSkill,DEMO_SKILLS} from '../../src/ui/realtime-battle-model.js';

function recorder(){
 const calls:unknown[][]=[];
 const ctx=new Proxy({} as CanvasRenderingContext2D,{
  get:(_target,key)=>(...args:unknown[])=>{calls.push([key,...args]);},
  set:(_target,key,value)=>{calls.push(['set',key,value]);return true;},
 });return {ctx,calls};
}
const atlas={width:1254,height:1254} as HTMLImageElement;
for(const skill of DEMO_SKILLS){
 const battle=createBattle();battle.status='running';battle.phase='combat';assert(castSkill(battle,skill.id));
 const c=battle.cinematic!,before=JSON.stringify(battle);
 const sample=(time:number,layer:ParticleLayer)=>{const r=recorder();drawSkillParticles(r.ctx,atlas,{...c,time},layer,battle.units);return r.calls;};
 const cells=new Set<number>();let draws=0;
 for(const layer of ['rear','front'] as const){
  assert.equal(sample(0,layer).length,0);assert.equal(sample(4.2,layer).length,0,'particles expire at skill end');
  const frozen=sample(2.7,layer);sample(3.8,layer);sample(.7,layer);assert.deepEqual(sample(2.7,layer),frozen,'rendering is deterministic across pause/replay');
  for(let frame=0;frame<252;frame++)for(const call of sample(frame/60,layer)){
   for(const value of call)if(typeof value==='number')assert(Number.isFinite(value));
   if(call[0]==='set'&&call[1]==='globalAlpha')assert(Number(call[2])>=0&&Number(call[2])<=1);
   if(call[0]==='drawImage'){
    draws++;assert.equal(call[1],atlas,'all effects use the authored texture atlas');
    const [x,y,w,h]=call.slice(2,6).map(Number);
    assert(x!>=0&&y!>=0&&x!+w!<=1254&&y!+h!<=1254);
    cells.add(Math.round(x!/w!)+4*Math.round(y!/h!));
   }
  }
 }
 assert.equal(JSON.stringify(battle),before,'VFX cannot change resources, cooldowns or damage');
 if(skill.kind==='fire'){assert.equal(draws,0,'approved fire stays on its original effect pipeline');continue;}
 assert(draws>0);
 const required=skill.kind==='charge'?[0,2,3,6]:skill.kind==='mounted'?[4,5,6,7]:skill.kind==='pincer'?[8,9,10,11]:[12,13,14,15];
 for(const cell of required)assert(cells.has(cell),`${skill.id} uses its intended art cell ${cell}`);
 if(skill.kind==='inspire'){
  const r=recorder();drawSkillParticles(r.ctx,atlas,{...c,time:3},'front',battle.units.map(u=>({...u,hp:0})));assert.equal(r.calls.length,0,'no rally particles on fallen soldiers');
 }
}
const aura=recorder();drawBuffAura(aura.ctx,atlas,100,400,2,1);assert(aura.calls.some(c=>c[0]==='drawImage'),'ongoing morale buff also uses painted art');
console.log('Skill VFX passed: six skill slots, all effect types, intended textures, atlas bounds, deterministic pause/replay, expiration, survivors-only rally and simulation isolation.');
