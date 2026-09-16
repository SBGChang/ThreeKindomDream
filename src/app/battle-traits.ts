import type { BattleState,DemoSkill,Troop,BattleTrait } from '../contracts/core/realtime-battle.js';
import { battleRoll } from './realtime-battle-model.js';
import { effect,mark,available } from './battle-tactics.js';
const potency=(t:BattleTrait)=>1+(t.level-1)*.15;
const owners=(s:BattleState,id:string,owner?:string)=>(s.traits??[]).filter(t=>t.id===id&&(!owner||t.owner===owner));
function flash(s:BattleState,t:BattleTrait){(s.traitMarks??={})['vfx:'+t.id+':'+t.owner]=s.time;s.log.unshift(`${t.owner}・${t.name} 發動`);s.log=s.log.slice(0,4);}
function gate(s:BattleState,key:string,seconds:number){const m=s.traitMarks??={};if((m[key]??-1)>s.time)return false;m[key]=s.time+seconds;return true;}
const army=(s:BattleState)=>s.units.filter(u=>u.side==='ally'&&available(u));
export function traitCast(s:BattleState,skill:DemoSkill):void {
 for(const t of owners(s,'frugal',skill.owner))if(battleRoll(s)<.25*potency(t)){s.supply=Math.min(s.supplyMax,s.supply+skill.cost*.3);flash(s,t);break;}
}
export function traitKill(s:BattleState,u:Troop,owner?:string):void {
 if(u.side!=='enemy'||u.temporary)return;
 if(u.kind==='infantry')for(const t of owners(s,'breakline'))if(gate(s,'breakline',1)){const units=army(s).filter(a=>a.kind==='infantry');if(units.length){const slot=[0,1,2].sort((a,b)=>Math.max(...units.map(u=>effect(u,'break'+a)))-Math.max(...units.map(u=>effect(u,'break'+b))))[0]!;mark(units,'break'+slot,5*potency(t));flash(s,t);}}
 if(u.kind==='archer')for(const t of owners(s,'hunters'))if(gate(s,'hunters',3)){let changed=false;for(const sk of s.skills)if(['cavalry','longshot','divide'].includes(sk.mechanic??'')&&sk.id!==s.cinematic?.skill.id&&(s.cooldowns[sk.id]??0)>0){s.cooldowns[sk.id]=Math.max(0,s.cooldowns[sk.id]!-potency(t));changed=true;}if(changed)flash(s,t);}
 if(owner)for(const t of owners(s,'aftershock',owner))if(gate(s,'aftershock:'+s.castCount,10000)){mark(army(s),'aftershock',4*potency(t));flash(s,t);}
}
export function traitArrow(s:BattleState,source:Troop|undefined,hit:boolean):void {
 if(!source||source.side!=='ally')return;
 const key='miss:'+source.id,m=s.traitMarks??={};m[key]=hit?0:(m[key]??0)+1;
 if(m[key]>=2)for(const t of owners(s,'sighting')){mark([source],'sighting',4*potency(t));m[key]=0;flash(s,t);break;}
 if(hit&&s.supply<s.supplyMax)for(const t of owners(s,'supply'))if((m.supply??0)<=s.time&&battleRoll(s)<.05*potency(t)){s.supply=Math.min(s.supplyMax,s.supply+2);m.supply=s.time+2;flash(s,t);break;}
}
export function traitControl(s:BattleState,targets:Troop[],owner:string):void {
 if(!targets.length)return;for(const t of owners(s,'exploit',owner)){mark(targets,'exposed',3*potency(t));flash(s,t);break;}
}
export function tickTraits(s:BattleState):void {
 const allies=army(s),original=allies.filter(u=>!u.temporary),marks=s.traitMarks??={};
 if(original.reduce((n,u)=>n+u.hp,0)<s.initial*.3)for(const t of owners(s,'backwater'))if(gate(s,'backwater',100000)){mark(allies,'backwater',6*potency(t));flash(s,t);}
 for(const t of owners(s,'fervor')){const key='fervor:'+s.wave,baseKey='waveStart:'+s.wave;marks[baseKey]??=s.time;const count=Math.min(5,Math.floor((s.time-marks[baseKey]!)/(8/potency(t))));if(count>(marks[key]??0)){marks[key]=count;flash(s,t);}}
 if(original.filter(u=>u.kind==='infantry').reduce((n,u)=>n+u.hp,0)<s.initial*.2)for(const t of owners(s,'relief'))if(gate(s,'relief:'+s.wave,100000)){const archers=allies.filter(u=>u.kind==='archer');if(archers.length){mark(archers,'relief',2*potency(t));flash(s,t);}}
 for(const t of owners(s,'laststand'))for(const u of allies.filter(u=>u.kind==='infantry'&&u.hp<u.maxHp*.25))if(gate(s,'laststand:'+s.wave+':'+u.id,100000)){mark([u],'shield',3*potency(t));flash(s,t);}
 for(const t of owners(s,'drill'))for(const u of allies)if(u.effects?.ready===0&&gate(s,'drill:'+s.wave+':'+u.id+':'+(marks['conversion:'+u.id]??0),100000)){mark([u],'drill',4*potency(t));delete u.effects.ready;flash(s,t);}
}
export function traitAttack(s:BattleState,u:Troop):number {if(u.side!=='ally')return 1;return 1+(effect(u,'backwater')>0?.2:0)+(effect(u,'aftershock')>0?.15:0)+(effect(u,'drill')>0?.15:0)+[0,1,2].filter(i=>effect(u,'break'+i)>0).length*.08+(s.traitMarks?.['fervor:'+s.wave]??0)*.04;}
