import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defs} from './harness.js';
import {DUEL_ACTORS,duelActorForName} from '../../src/contracts/core/duel-art.js';
import {COMMAND_GROUPS,UNIFIED_OFFICERS} from '../../src/contracts/core/officer-motion.js';
import {CHARACTERS} from '../../src/ui/CharacterArt.js';
import {CHARACTER_FRAMING} from '../../src/ui/portrait-framing.js';
import {DEBATE_SOURCES} from '../../src/ui/debate-art.js';
import {DUEL_ART_VERSIONS} from '../../src/ui/duel-art.js';
import {LEGACY_COMMANDERS} from '../../src/ui/officer-motion.js';

const png=(source:string)=>{
 const bytes=readFileSync('public/'+source);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',source);
 assert(bytes.readUInt32BE(16)>=400&&bytes.readUInt32BE(20)>=400,source);
 return createHash('sha256').update(bytes).digest('hex');
};
const portraits=new Set<string>(),debates=new Set<string>();
for(const [id,name] of Object.entries(DUEL_ACTORS)){
 assert.equal(CHARACTERS[name],id,`${name}: missing name registration`);
 const framing=CHARACTER_FRAMING[id];assert(framing,`${name}: missing portrait`);
 assert(!framing.sourceRegion,`${name}: needs standalone full-body art`);
 const portrait=png(framing.source);assert(!portraits.has(portrait),`${name}: copied portrait`);portraits.add(portrait);
 png(`art/duel/${id}-v${DUEL_ART_VERSIONS[id]??1}.png`);
 const debate=png(DEBATE_SOURCES[id]!);assert(!debates.has(debate),`${name}: copied debate actor`);debates.add(debate);
 const group=COMMAND_GROUPS.findIndex(g=>(g as readonly string[]).includes(id));
 assert((UNIFIED_OFFICERS as readonly string[]).includes(id)||group>=0||LEGACY_COMMANDERS[id],`${name}: no command/run sequence`);
 if(group>=0)png(`art/duel/commands-group-${group}-v1.png`);
 if(LEGACY_COMMANDERS[id])png(`art/units/battle-demo/commanders/${LEGACY_COMMANDERS[id]}-atlas.png`);
}
for(const n of defs.reader('notable').all()){
 const name=defs.text(String(n.nameKey)),id=n.duelArtId??duelActorForName(name);
 assert(id!=='npc_soldier',`${name}: named notable must not explicitly opt into generic soldier art`);
 assert.equal(CHARACTERS[name],id,`${name}: story and combat identity diverged`);
}
// Role-only extras deliberately share a soldier. Named people cannot use this escape hatch.
const extras=new Set(['阿禾','傷兵','你','戰場','追軍先鋒','關中使者','守軍使者','禁軍校尉','西域使者','吳軍使者','魏軍先鋒','船隊領航','領航官','異域使者']);
function walk(value:unknown){
 if(!value||typeof value!=='object')return;
 const record=value as Record<string,unknown>;
 if(typeof record.speaker==='string'&&!extras.has(record.speaker)){
  assert(CHARACTERS[record.speaker],`${record.speaker}: story speaker has no portrait`);
  assert(CHARACTERS[record.speaker]!=='npc_soldier',`${record.speaker}: named speaker uses soldier`);
 }
 Object.values(record).forEach(walk);
}
defs.reader('storyChapter').all().forEach(walk);
console.log(`Art coverage: ${Object.keys(DUEL_ACTORS).length} distinct portraits, duel, command/run and standing debate actors; all notables and story speakers covered.`);
