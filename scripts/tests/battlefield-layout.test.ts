import assert from 'node:assert/strict';
import {createBattle,createConfiguredBattle,startBattle,tickBattle} from '../../src/app/realtime-battle-model.js';
import {BATTLEFIELD,troopX} from '../../src/app/battlefield-layout.js';
for(const total of [50,200,600,1200])for(const ratio of [0,50,60,100]){
 const base=createBattle();
 const s=createConfiguredBattle({...base,troops:total,infantryPercent:ratio,enemyInfantryPercent:ratio,skills:[],duration:60,waveTroops:[total],waveNames:['test']});
 for(const u of s.units)assert.equal(u.x,troopX(u.x));
 startBattle(s);
 for(let i=0;i<160;i++){
  tickBattle(s,.05);
  if(s.phase==='entry')for(const u of s.units.filter(u=>u.side==='ally'))for(const c of s.commanders.filter(c=>c.side==='ally')){
   if(u.x>0&&c.x>0&&Math.abs(u.y-c.y)<120)assert(u.x-c.x>180,'visible troops lead commanders with full sprite clearance');
  }
 }
 for(const u of s.units){u.x=u.side==='ally'?-50:1800;u.effects={rout:3};}
 for(let i=0;i<80;i++){
  tickBattle(s,.05);
  for(const u of s.units)assert(u.x>=BATTLEFIELD.left+BATTLEFIELD.padding&&u.x<=BATTLEFIELD.right-BATTLEFIELD.padding,'combat movement and rout respect sprite-safe edges');
 }
}
console.log('Battlefield passed: mixed/full archer formations, large armies, entry separation, legacy out-of-bounds positions and routed troops.');

const {archerFrame}=await import('../../src/ui/archer-sprites.js');
for(const side of ['ally','enemy'] as const){
 const s=createBattle(),u=s.units.find(u=>u.kind==='archer'&&u.side===side)!;
 u.pose='run';u.seed=0;u.poseTime=0;u.facingLeft=side==='ally';
 const first=archerFrame(u);u.poseTime=.1;assert.notEqual(archerFrame(u).frame,first.frame);
 assert.equal(first.flip,side==='ally','retreat follows actual movement direction');
 assert.equal(first.frame,side==='enemy'?8:0,'enemy and ally use distinct run frames');
 u.pose='slash';assert.equal(archerFrame(u).name,side==='enemy'?'archer-motion':'archer');
 if(side==='enemy')assert(archerFrame(u).frame>=16);
}
console.log('Archers passed: distinct team sprites, animated run frames and retreat facing.');
