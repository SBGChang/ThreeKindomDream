import assert from 'node:assert/strict';
import {battleSpriteRect} from '../../src/ui/battle-sprite-framing.js';

// Measurements of the actual opaque boot pixels in the checked-in run atlases.
const clips=[
 {name:'run',guardHeight:137,runHeights:[168,180],feet:[225,224,226,224,211,210,215,211,215,215,212,215,208,212,208,208]},
 {name:'enemy-run',guardHeight:140,runHeights:[171,182],feet:[227,226,228,225,212,211,216,212,216,217,214,216,211,213,210,210]},
];
for(const size of [147.75,150,166.5,170])for(const clip of clips){
 const standing=battleSpriteRect(clip.name==='run'?'slash':'enemy-slash',0,size);
 const baseline=standing.y+214/256*standing.height;
 for(const [frame,foot] of clip.feet.entries()){
  const running=battleSpriteRect(clip.name,frame,size);
  assert(Math.abs(running.y+foot/256*running.height-baseline)<1e-8,'walk/stop must share the same foot baseline');
  assert.equal(running.width,running.height,'no nonuniform sprite distortion');
  for(const h of clip.runHeights)assert(Math.abs(h*running.height/(clip.guardHeight*standing.height)-1)<.06,'run/guard visible size jump must stay below 6%, including authored pose variation');
 }
}
for(const name of ['slash','enemy-slash','hurt','enemy-hurt','archer','archer-motion','mounted','charge','ignite','commander-lord']){
 assert.deepEqual(battleSpriteRect(name,0,150),{x:-75,y:-133.5,width:150,height:150},'other actor classes and collapsed poses keep their authored proportions');
}
console.log('Infantry framing passed: both armies, 32 run frames, shared feet, uniform scale, stage/depth sizes and unaffected non-run clips.');
