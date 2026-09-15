import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defs} from './harness.js';
import {DUEL_ACTORS,duelActorForName} from '../../src/contracts/core/duel-art.js';
import {DUEL_ART_VERSIONS,DUEL_SOURCE_COLUMNS,duelFrame,keepFrameInk} from '../../src/ui/duel-art.js';

const formations=new Set(['曹軍前鋒','曹軍弩陣','益州守軍','江東追軍']);
for(const d of [...defs.reader('notable').all(),...defs.reader('enemy').all()]){
 const name=defs.text(String(d.nameKey)),id=duelActorForName(name);
 assert.ok(id!=='npc_soldier'||formations.has(name),`${name} needs its own attack/defend/rest/hit atlas`);
}
for(const id of Object.keys(DUEL_ACTORS)){
 const png=readFileSync(`public/art/duel/${id}-v${DUEL_ART_VERSIONS[id]??1}.png`);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',id);
 assert.ok(png.readUInt32BE(16)>=(DUEL_SOURCE_COLUMNS[id]??4)*100&&png.readUInt32BE(20)>=800,`${id}: source resolution`);
}
for(const [pose,offset] of [['attack',0],['defend',8],['rest',16],['hurt',24]] as const){
 assert.deepEqual(Array.from({length:8},(_,i)=>duelFrame(pose,i/8)),Array.from({length:8},(_,i)=>offset+i));
 assert.equal(duelFrame(pose,2),offset+7,'actions hold their final frame instead of looping');
}
for(const file of ['action-kit-v1','status-scroll-v1'])assert.ok(readFileSync(`public/art/duel/${file}.png`).length>1000);
console.log(`Duel art coverage passed: ${Object.keys(DUEL_ACTORS).length} actors, all authored people/enemies, four non-looping eight-frame actions.`);

// A weapon extending into the inter-frame gutter must survive; the neighboring actor must not.
const ink={width:60,height:30,data:new Uint8ClampedArray(60*30*4)} as ImageData;
const paint=(x0:number,y0:number,x1:number,y1:number)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)ink.data[(y*60+x)*4+3]=255;};
paint(20,10,30,27);paint(28,13,51,15);paint(34,5,38,8);paint(55,3,60,28);
keepFrameInk(ink,10,35);
assert.equal(ink.data[(13*60+50)*4+3],255,'connected spearhead beyond nominal cell is retained');
assert.equal(ink.data[(6*60+36)*4+3],255,'detached in-frame weapon art is retained');
assert.equal(ink.data[(15*60+57)*4+3],0,'neighbor actor in overscan is excluded');
console.log('Duel weapon gutters passed: extended spear, detached art and neighbor exclusion.');
