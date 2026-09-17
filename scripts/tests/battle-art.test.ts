import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DUEL_ACTORS,duelActorForName} from '../../src/contracts/core/duel-art.js';
import {COMMAND_GROUPS,UNIFIED_OFFICERS} from '../../src/contracts/core/officer-motion.js';
import {TACTIC_VFX,drawTacticalParticles,drawEvolutionParticles} from '../../src/ui/tactical-particles.js';
import {createBattle,castSkill,tickBattle,type DemoSkill} from '../../src/app/realtime-battle-model.js';
import {defs} from './harness.js';
const legacy=['lord','npc_soldier','guojia','yujin','xiahoudun'];
assert.equal(new Set([...legacy,...COMMAND_GROUPS.flat(),...UNIFIED_OFFICERS]).size,Object.keys(DUEL_ACTORS).length);
for(const id of Object.keys(DUEL_ACTORS))assert([...legacy,...COMMAND_GROUPS.flat(),...UNIFIED_OFFICERS].includes(id));
for(let i=0;i<COMMAND_GROUPS.length;i++){const png=readFileSync('public/art/duel/commands-group-'+i+'-v1.png');assert(png.readUInt32BE(16)>700);assert(png.readUInt32BE(20)>700);}
assert.equal(duelActorForName('太史慈・交鋒'),'taishici');
const pendingPortraits=new Set(['notable:machao','notable:weiyan','notable:fazheng','notable:jiangwei']);
for(const n of defs.reader('notable').all()){
 if(pendingPortraits.has(String(n.notableId)))assert.equal(n.duelArtId,'npc_soldier','new officers must declare their temporary shared atlas');
 else assert.notEqual(n.duelArtId,'npc_soldier');
}
let calls:number[][]=[];
const ctx={save(){},restore(){},translate(...args:number[]){assert(args.every(Number.isFinite));},rotate(n:number){assert(Number.isFinite(n));},set globalAlpha(n:number){assert(n>=0&&n<=1);},drawImage(_im:unknown,...args:number[]){assert(args.every(Number.isFinite));assert(args[0]!>=0&&args[0]!<400);assert(args[1]!>=0&&args[1]!<400);calls.push(args);}} as unknown as CanvasRenderingContext2D;
const atlas={width:400,height:400} as HTMLCanvasElement;
for(const mechanic of Object.keys(TACTIC_VFX)){
 const b=createBattle();b.phase='combat';b.status='running';const sk:DemoSkill={id:'qa',name:mechanic,owner:'主角',key:'1',kind:'fire',mechanic,cost:0,cd:1,damage:80,description:''};b.skills=[sk];castSkill(b,sk.id);
 for(let t=0;t<3;t+=.05)tickBattle(b,.05);
 assert(b.cinematic);const before=JSON.stringify(b);
 calls=[];drawTacticalParticles(ctx,atlas,b.cinematic!,b);const first=JSON.stringify(calls);calls=[];drawTacticalParticles(ctx,atlas,b.cinematic!,b);assert.equal(JSON.stringify(calls),first);assert.equal(JSON.stringify(b),before);
 calls=[];drawTacticalParticles(ctx,atlas,{...b.cinematic!,time:4.2},b);assert.equal(calls.length,0);
}
for(const kind of ['攻其不備','借力打力','蓄勢待發'])for(const t of [0,.5,1.3,1.8,2.79,2.8]){
 calls=[];drawEvolutionParticles(ctx,atlas,t,800,600,kind);drawEvolutionParticles(ctx,atlas,t,800,600,kind,true);if(t>=2.8)assert.equal(calls.length,0);else assert(calls.length>0);
}
console.log('Battle art passed: 50 command/march actors, 25 deterministic VFX, three evolution types, expiration, atlas bounds and model isolation.');
