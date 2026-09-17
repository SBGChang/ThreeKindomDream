import type {RallyAction,RallyBuild,RallyCard,RallyColor,RallyEvent,RallyFighter,RallySide,RallyState} from '../contracts/core/debate-rally.js';
import {RALLY_SPECIALS,RALLY_PASSIVES,rallyProfile,rallySpecialSources} from './debate-traits.js';
export type * from '../contracts/core/debate-rally.js';
const other=(side:RallySide):RallySide=>side==='ally'?'enemy':'ally';
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const random=(s:RallyState)=>{s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;};
export const rallyHandSize=(int:number)=>4+Math.floor((clamp(Number.isFinite(int)?int:50,1,100)-1)/20);
const has=(f:RallyFighter,p:keyof typeof RALLY_PASSIVES)=>f.build.passives.includes(p);
function fighter(input:RallyBuild):RallyFighter {
 const build:RallyBuild={int:clamp(Math.round(Number.isFinite(input.int)?input.int:50),1,100),pol:clamp(Math.round(Number.isFinite(input.pol)?input.pol:50),1,100),specials:rallySpecialSources(input),passives:[...new Set(input.passives)].filter(p=>Object.hasOwn(RALLY_PASSIVES,p)).slice(0,2)};
 const maxHeart=160+Math.round(build.pol*.6);
 return {build,heart:maxHeart,maxHeart,hand:[],combo:0,double:false,reflect:false,wild:false,skip:false};
}
export function drawRallyCard(s:RallyState,side:RallySide,normalOnly=false):RallyCard {
 const f=s[side],id=s.nextId++;
 const sources=rallySpecialSources(f.build);
 if(!normalOnly&&sources.length&&random(s)<.16)return {id,kind:'special',special:sources.length===1?sources[0]!:sources[Math.floor(random(s)*sources.length)]!};
 const color=(['reason','evidence','presence'] as RallyColor[])[Math.floor(random(s)*3)]!;
 // Identical random quantiles increase monotonically with intellect.
 const value=Math.min(9,1+Math.floor(9*Math.pow(random(s),1.65-f.build.int*.011)));
 return {id,kind:'normal',color,value};
}
function deal(s:RallyState,side:RallySide):void {
 const f=s[side],n=rallyHandSize(f.build.int);f.hand=[];
 for(let i=0;i<n;i++)f.hand.push(drawRallyCard(s,side,i<2));
 if(has(f,'scholar'))f.hand.push(drawRallyCard(s,side,true));
}
export function createRally(ally=rallyProfile('guojia').build,enemy=rallyProfile('npc_soldier').build,seed=712):RallyState {
 const s:RallyState={ally:fighter(ally),enemy:fighter(enemy),turn:'ally',table:null,rng:seed>>>0,nextId:1,turnNumber:1,restarts:0,specialUsed:false,lastPass:null,last:null,history:[],winner:null};
 deal(s,'ally');deal(s,'enemy');return s;
}
export function rallyPlayable(s:RallyState,side:RallySide,card:RallyCard):boolean {
 if(s.winner||s.turn!==side||s[side].skip||card.kind!=='normal')return false;
 const t=s.table;return !t||s[side].wild||(card.color===t.color?card.value>t.value:card.value===t.value);
}
export const rallyNormals=(s:RallyState,side=s.turn)=>s[side].hand.filter(c=>rallyPlayable(s,side,c));
export function rallySpecialPlayable(s:RallyState,side:RallySide,card:RallyCard):boolean {
 return !s.winner&&s.turn===side&&!s[side].skip&&!s.specialUsed&&card.kind==='special'&&(card.special!=='induct'||s[side].hand.filter(c=>c.kind==='normal').length>=2);
}
/** A forced pass is available only when neither a normal nor a special can be played. */
export function rallyMustPass(s:RallyState,side=s.turn):boolean {
 return !s.winner&&s.turn===side&&!s[side].hand.some(c=>rallyPlayable(s,side,c)||rallySpecialPlayable(s,side,c));
}
export function rallyDamage(s:RallyState,side:RallySide,card:Extract<RallyCard,{kind:'normal'}>):number {
 const f=s[side],target=s[other(side)],combo=s.lastPass===other(side)?f.combo+1:0;
 const switching=s.table&&s.table.color!==card.color&&s.table.value===card.value;
 return Math.max(1,Math.round((5+f.build.int*.11+card.value*2.2)*(1+combo*.2)*(f.double?2:1)*(has(f,'eloquence')?1.1:1)*(has(f,'precision')&&card.value<=3?1.35:1)*(has(f,'adaptable')&&switching?1.25:1)*(has(f,'momentum')&&combo>0?1.1:1)*(has(target,'composure')?.9:1)));
}
function finishTurn(s:RallyState):void {s.turn=other(s.turn);s.turnNumber++;s.specialUsed=false;}
function restart(s:RallyState,opener:RallySide):void {
 s.table=null;s.lastPass=null;s.specialUsed=false;s.turn=opener;s.restarts++;
 for(const side of ['ally','enemy'] as const){const f=s[side];f.combo=0;deal(s,side);if(has(f,'renewal'))f.heart=Math.min(f.maxHeart,f.heart+8);}
}
export function actRally(s:RallyState,side:RallySide,action:RallyAction):boolean {
 if(s.winner||s.turn!==side)return false;
 const f=s[side],target=s[other(side)],card=action.kind==='pass'?null:f.hand.find(c=>c.id===action.id);
 if(action.kind==='normal'&&(!card||!rallyPlayable(s,side,card)))return false;
 if(action.kind==='special'&&(!card||!rallySpecialPlayable(s,side,card)))return false;
 if(action.kind==='pass'&&!rallyMustPass(s,side))return false;
 let selected:RallyCard[]=[];
 if(action.kind==='special'&&card?.kind==='special'&&card.special==='induct'){
  const ids=action.targets??[];if(ids.length!==2||ids[0]===ids[1])return false;
  selected=ids.map(id=>f.hand.find(c=>c.id===id)).filter((c):c is RallyCard=>!!c&&c.kind==='normal');if(selected.length!==2)return false;
 }
 const event:RallyEvent={side,kind:action.kind,card:card?structuredClone(card):null,damage:0,reflected:false,before:{ally:s.ally.heart,enemy:s.enemy.heart},after:{ally:0,enemy:0},combo:f.combo};
 if(action.kind==='special'&&card?.kind==='special'){
  f.hand=f.hand.filter(c=>c.id!==card.id);s.specialUsed=true;
  if(card.special==='induct'){
   const sum=Math.min(9,selected.reduce((n,c)=>n+(c.kind==='normal'?c.value:0),0));
   for(const c of selected)if(c.kind==='normal')c.value=sum;
  }else if(card.special==='concentrate'){for(let i=0;i<3;i++)f.hand.push(drawRallyCard(s,side));}
  else if(card.special==='shout'){f.double=true;target.skip=true;}
  else if(card.special==='reflect')f.reflect=true;
  else f.wild=true;
  f.hand.push(drawRallyCard(s,side,true));
 }else if(action.kind==='normal'&&card?.kind==='normal'){
  const damage=rallyDamage(s,side,card);f.combo=s.lastPass===other(side)?f.combo+1:0;target.combo=0;event.combo=f.combo;
  const receiver=target.reflect?f:target;event.reflected=target.reflect;if(target.reflect)target.reflect=false;
  event.damage=Math.min(receiver.heart,damage);receiver.heart-=event.damage;
  f.hand=f.hand.filter(c=>c.id!==card.id);s.table={...card};f.double=false;f.wild=false;s.lastPass=null;
  f.hand.push(drawRallyCard(s,side));
  if(receiver.heart<=0)s.winner=receiver===f?other(side):side;
  finishTurn(s);
 }else if(action.kind==='pass'){
  const consecutive=s.lastPass===other(side);f.skip=false;f.combo=0;
  if(has(f,'resourceful')){f.hand.push(drawRallyCard(s,side,true),drawRallyCard(s,side,true));}else f.hand.push(drawRallyCard(s,side));
  if(consecutive){restart(s,side);s.turnNumber++;event.kind='restart';}
  else{s.lastPass=side;finishTurn(s);}
 }
 event.after={ally:s.ally.heart,enemy:s.enemy.heart};s.last=event;s.history.push(event);return true;
}
/** Public projection: never send opponent ranks, special identity, RNG or internal IDs to the HUD. */
export function rallyOpponentHand(s:RallyState,viewer:RallySide):{color:RallyColor|'special'}[]{
 return s[other(viewer)].hand.map((c):{color:RallyColor|'special'}=>({color:c.kind==='normal'?c.color:'special'})).sort((a,b)=>a.color.localeCompare(b.color));
}
export function forecastRally(s:RallyState,side:RallySide,id:number):Record<RallySide,number>|null {
 const card=s[side].hand.find(c=>c.id===id);if(!card||card.kind!=='normal'||!rallyPlayable(s,side,card))return null;
 const result={ally:s.ally.heart,enemy:s.enemy.heart},receiver=s[other(side)].reflect?side:other(side);
 result[receiver]=Math.max(0,result[receiver]-rallyDamage(s,side,card));return result;
}
/** AI inspects only its own hand and public board/buffs; it never reads the opponent's ranks. */
export function chooseRallyAction(s:RallyState,side=s.turn):RallyAction {
 const f=s[side];if(f.skip)return {kind:'pass'};
 const normals=rallyNormals(s,side),specials=f.hand.filter(c=>rallySpecialPlayable(s,side,c));
 for(const c of specials){if(c.kind!=='special')continue;
  if(c.special==='induct'){
   const cards=f.hand.filter((v):v is Extract<RallyCard,{kind:'normal'}>=>v.kind==='normal');
   for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
    const a=cards[i]!,b=cards[j]!,sum=Math.min(9,a.value+b.value);
    if(sum>a.value&&sum>b.value&&(!s.table||sum===s.table.value||sum>s.table.value&&(a.color===s.table.color||b.color===s.table.color)))return {kind:'special',id:c.id,targets:[a.id,b.id]};
   }
  }else if(c.special==='wild'&&!normals.length&&f.hand.some(v=>v.kind==='normal')&&!f.wild||c.special==='shout'&&normals.length&&!f.double||c.special==='reflect'&&!f.reflect||c.special==='concentrate'&&(!normals.length||f.hand.length<7))return {kind:'special',id:c.id};
 }
 const best=normals.filter((c):c is Extract<RallyCard,{kind:'normal'}>=>c.kind==='normal').sort((a,b)=>a.value-b.value)[0];
 if(best)return {kind:'normal',id:best.id};
 const required=specials[0];
 if(required?.kind==='special')return {kind:'special',id:required.id,...(required.special==='induct'?{targets:f.hand.filter(c=>c.kind==='normal').slice(0,2).map(c=>c.id)}:{})};
 return {kind:'pass'};
}
