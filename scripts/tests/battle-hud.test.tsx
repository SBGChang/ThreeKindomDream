import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {SkillButton,BattleBuffs,supplyBagFills} from '../../src/ui/BattleHud.js';
import {battleSkillArt} from '../../src/ui/battle-ui-art.js';
import {createBattle} from '../../src/app/realtime-battle-model.js';
import {defs} from './harness.js';

// All authored tactics have real illustrations, shared by preparation and combat.
for(const skill of defs.reader('skill').all()) {
 const file=battleSkillArt(defs.text(String(skill.nameKey)),skill.battleMechanic);
 assert(existsSync('public/'+file.slice(2)),file);
}
assert.notEqual(battleSkillArt('騎射','mounted'),battleSkillArt('衝鋒','charge'));
assert.deepEqual(supplyBagFills(190,190),[{color:1,black:0},{color:1,black:0},{color:1,black:0},{color:.8,black:0}]);
assert.deepEqual(supplyBagFills(140,190),[{color:1,black:0},{color:1,black:0},{color:1,black:.2},{color:.8,black:1}]);
assert.deepEqual(supplyBagFills(175,190)[3],{color:.8,black:.375});
// Visible colored area must represent the actual remaining amount, including partial capacity.
for(const amount of [0,25,50,99,140,150,175,189,190]) {
 const visible=supplyBagFills(amount,190).reduce((sum,b)=>sum+50*b.color*(1-b.black),0);
 assert(Math.abs(visible-amount)<1e-8);
}
assert(supplyBagFills(0,190).every(b=>b.black===1));
assert(supplyBagFills(200,190).every(b=>b.black===0));
assert.deepEqual(supplyBagFills(0,0),[]);
const state=createBattle();state.status='running';state.phase='combat';
const skill=state.skills[0]!;state.cooldowns[skill.id]=8;
const markup=renderToStaticMarkup(<SkillButton skill={skill} state={state} onCast={()=>{throw new Error('render must not cast');}}/>);
assert.match(markup,/aria-disabled="true"/);
assert(!/\sdisabled(?:=|\s|>)/.test(markup),'cooling skills must remain focusable for their explanation');
assert.match(markup,/aria-describedby="([^"]+)"/);
const description=markup.match(/aria-describedby="([^"]+)"/)![1];
assert(markup.includes(`id="${description}" role="tooltip"`));
assert(!markup.includes(' title='),'use the painted tooltip, not a native browser tooltip');
assert.match(markup,/tactic-fire-v5\.png/);
state.cooldowns[skill.id]=0;
for(const status of ['running','paused'] as const) {
 state.status=status;
 const recovered=renderToStaticMarkup(<SkillButton skill={skill} state={state} onCast={()=>{}}/>);
 assert(!recovered.includes('rt-cooldown-fill'),'recovered skills must not have a grey layer, even while paused');
}
state.buff=4.1;state.buffPower=.5;state.debuff=3;state.debuffPower=.25;state.traitUntil=2;
const buffs=renderToStaticMarkup(<BattleBuffs state={state}/>);
assert.match(buffs,/鼓舞，剩餘 5 秒/);
assert.match(buffs,/我軍攻擊提升 50%/);
assert.match(buffs,/敵軍攻擊降低 25%/);
assert.match(buffs,/trigger-backwater-v1\.png/);
assert.equal((buffs.match(/role="tooltip"/g)??[]).length,3);
console.log('Battle HUD passed: authored art, distinct mounted icon, focusable cooldowns, described painted hints and buff countdowns.');
