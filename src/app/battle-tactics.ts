import {troopX} from './battlefield-layout.js';
import { traitControl } from './battle-traits.js';
import type { BattleState,Cinematic,Troop,UnitKind } from '../contracts/core/realtime-battle.js';
import { damageTroop,battleRoll } from './realtime-battle-model.js';
export const available=(u:Troop)=>u.hp>0&&!(u.absent&&u.absent>0);
export const effect=(u:Troop,key:string)=>u.effects?.[key]??0;
export function mark(units:Troop[],key:string,seconds:number):void {for(const u of units){if(['confuse','rout','infighting','misreport'].includes(key)&&effect(u,'immune')>0)continue;(u.effects??={})[key]=seconds;}}
function temporary(s:BattleState,kind:UnitKind,count:number,x:number):void {
 const existing=s.units.filter(u=>u.temporary&&u.kind===kind&&u.side==='ally').reduce((n,u)=>n+u.hp,0);
 for(let remaining=Math.max(0,count-existing),i=0;remaining>0;i++){
  const hp=Math.min(50,remaining),id=s.nextId++;remaining-=hp;
  s.units.push({id,side:'ally',kind,temporary:true,hp,maxHp:hp,x:troopX(x-i*55),homeX:troopX(x),y:390+i%4*64,lane:i%4,attack:1.5,targetId:0,struck:false,pose:'run',poseTime:0,deathTime:0,hitTime:0,seed:id*.73});
 }
}
export function tacticalImpact(s:BattleState,c:Cinematic):boolean {
 const m=c.skill.mechanic;if(!m)return false;
 const scale=1; // Higher skill levels scale damage and cooldown in the shared skill resolver.
 const foes=s.units.filter(u=>u.side==='enemy'&&available(u)).sort((a,b)=>a.x-b.x),allies=s.units.filter(u=>u.side==='ally'&&available(u));
 const infantry=foes.filter(u=>u.kind==='infantry'),archers=foes.filter(u=>u.kind==='archer');
 const targetDamage=(targets:Troop[],amount:number)=>{let left=Math.round(amount);for(const u of targets){const n=damageTroop(s,u,left,c.skill.owner);c.damage+=n;left-=n;if(left<=0)break;}};
 const shots=(count:number,targets:Troop[],accuracy=.85)=>{for(let i=0;i<count&&targets.length;i++){
  const target=targets[i%targets.length]!;s.arrows.push({id:s.nextId++,side:'ally',targetId:target.id,x:340,y:320,fromX:340,fromY:320,toX:target.x,toY:target.y-55,elapsed:-i*.07,duration:.6,damage:Math.max(1,Math.round(c.skill.damage/count)),hit:battleRoll(s)<accuracy,friendly:false,owner:c.skill.owner,retarget:['mounted','crossbow','thunder'].includes(m)});
 }};
 switch(m){
  case 'pincer':targetDamage(infantry,c.skill.damage);mark(infantry,'confuse',2*scale);break;
  case 'cavalry':targetDamage(archers,c.skill.damage);mark(archers,'rout',2.5*scale);break;
  case 'longshot':mark(allies.filter(u=>u.kind==='archer'),'longshot',6*scale);break;
  case 'infighting':mark(infantry,'infighting',6*scale);break;
  case 'misreport':mark(archers,'misreport',6*scale);break;
  case 'fire':targetDamage(foes,c.skill.damage*(s.terrain==='plain'?1.3:1));mark(foes.slice(0,4),'burn',4*scale);break;
  case 'inspire':s.buff=7;s.buffPower=.25*scale;break;
  case 'shield':mark(allies.filter(u=>u.kind==='infantry'),'shield',5*scale);break;
  case 'reform':for(const u of allies)for(const key of ['confuse','rout','infighting','misreport'])if(u.effects)delete u.effects[key];mark(allies,'immune',3*scale);break;
  case 'toarcher':case 'toinfantry':{
   const next=m==='toarcher'?'archer':'infantry';
   const selected=allies.filter(u=>u.kind!==next&&(next==='infantry'||!foes.some(e=>Math.abs(e.x-u.x)<105&&Math.abs(e.y-u.y)<45))).sort((a,b)=>next==='archer'?a.x-b.x:b.x-a.x).slice(0,2);
   for(const u of selected){u.kind=next;u.targetId=0;u.pose='guard';(s.traitMarks??={})['conversion:'+u.id]=s.castCount;}mark(selected,'ready',1.5);break;
  }
  case 'pursue':targetDamage(foes,c.skill.damage*(new Set(foes.map(u=>u.kind)).size===1?1.3:1));break;
  case 'mounted':shots(3,foes);break;
  case 'volley':shots(12,foes,.7);break;
  case 'crossbow':shots(6,foes.slice(0,2),.9);break;
  case 'thunder':shots(9,foes,.95);break;
  case 'water':targetDamage(foes,c.skill.damage*(s.terrain==='water'?1.3:1));break;
  case 'rocks':targetDamage(foes,c.skill.damage*(s.terrain==='mountain'?1.3:1));break;
  case 'taunt':mark(foes,'taunt',6*scale);break;
  case 'ambush':if(infantry.length)temporary(s,'infantry',100,Math.max(...infantry.map(u=>u.x))+120);break;
  case 'reinforce':temporary(s,'archer',100,Math.min(480,...allies.map(u=>u.x))-150);break;
  case 'divide':case 'turncoat':{
   const targets=m==='divide'?archers:infantry;let left=50;
   for(const u of targets){const n=Math.min(left,u.hp);if(!n)continue;
    u.hp-=n;left-=n;s.removed=(s.removed??0)+n;(s.waveRemoved??={})[s.wave]=((s.waveRemoved??{})[s.wave]??0)+n;
    // New identity cancels old hostile projectiles; this is not a kill or a permanent recruit.
    temporary(s,'infantry',s.units.filter(a=>a.temporary&&a.kind==='infantry'&&a.side==='ally').reduce((v,a)=>v+a.hp,0)+n,Math.max(200,Math.min(480,...allies.map(a=>a.x))));
    if(u.hp===0){u.pose='dead';u.deathTime=0;}if(left===0)break;
   }break;
  }
  case 'lure':for(const u of infantry)u.absent=10;break;
  case 'sweep':targetDamage(foes,c.skill.damage);break;
  default:return false;
 }
 if(['pincer','cavalry','infighting','misreport'].includes(m))traitControl(s,foes.filter(u=>['confuse','rout','infighting','misreport'].some(key=>effect(u,key)>0)),c.skill.owner);

 s.log.unshift(`${c.skill.owner}・${c.skill.name}${c.damage?'：擊退 '+c.damage+' 人':''}`);s.log=s.log.slice(0,4);return true;
}
export function tickTactics(s:BattleState,dt:number):void {
 for(const u of s.units){
  if(u.absent){u.absent=Math.max(0,u.absent-dt);if(u.absent===0){u.targetId=0;u.attack=Math.max(1,u.attack);}}
  if(!u.effects)continue;
  const before=effect(u,'burn');
  for(const key of Object.keys(u.effects))u.effects[key]=Math.max(0,u.effects[key]!-dt);
  if(available(u)&&Math.floor(before)>Math.floor(effect(u,'burn')))damageTroop(s,u,2);
 }
}
