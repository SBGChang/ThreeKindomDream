import type {RallyState,RallyBuild,RallyCard,RallyFighter} from '../contracts/core/debate-rally.js';
import {RALLY_SPECIALS,RALLY_PASSIVES,RALLY_COLORS} from './debate-traits.js';
const positive=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export const validRallyBuild=(b:RallyBuild):boolean=>!!b&&positive(b.int)&&b.int>=1&&b.int<=100&&positive(b.pol)&&b.pol>=1&&b.pol<=100&&(b.special===undefined||b.special===null||Object.hasOwn(RALLY_SPECIALS,b.special))&&(b.specials===undefined||Array.isArray(b.specials)&&b.specials.every(k=>Object.hasOwn(RALLY_SPECIALS,k)))&&Array.isArray(b.passives)&&b.passives.every(p=>Object.hasOwn(RALLY_PASSIVES,p));
const card=(c:RallyCard):boolean=>!!c&&Number.isSafeInteger(c.id)&&c.id>=0&&(c.kind==='normal'?Object.hasOwn(RALLY_COLORS,c.color)&&Number.isInteger(c.value)&&c.value>=1&&c.value<=9:c.kind==='special'&&Object.hasOwn(RALLY_SPECIALS,c.special));
const fighter=(f:RallyFighter):boolean=>!!f&&validRallyBuild(f.build)&&positive(f.heart)&&positive(f.maxHeart)&&f.maxHeart>0&&f.heart<=f.maxHeart&&positive(f.combo)&&Array.isArray(f.hand)&&f.hand.every(card)&&['double','reflect','wild','skip'].every(k=>typeof f[k as keyof RallyFighter]==='boolean');
export function validRallySnapshot(s:RallyState):boolean {
 return !!s&&fighter(s.ally)&&fighter(s.enemy)&&['ally','enemy'].includes(s.turn)&&(s.winner===null||['ally','enemy'].includes(s.winner))&&(s.lastPass===null||['ally','enemy'].includes(s.lastPass))&&(s.table===null||s.table.kind==='normal'&&card(s.table))&&[s.rng,s.nextId,s.turnNumber,s.restarts].every(n=>Number.isSafeInteger(n)&&n>=0)&&typeof s.specialUsed==='boolean'&&Array.isArray(s.history);
}
