import type { Side, DemoSkill, Troop, WavePhase, Commander, Cinematic, BattleState } from '../contracts/core/realtime-battle.js';
export type { Side, SkillKind, DemoSkill, Troop, WavePhase, Commander, Cinematic, BattleState } from '../contracts/core/realtime-battle.js';
/** Standalone battle prototype. Never reads or writes campaign saves. */
export const DEMO_SKILLS:readonly DemoSkill[] = [
 {id:'fire',name:'火計',owner:'主角',key:'1',kind:'fire',cost:35,cd:12,damage:95,description:'點燃引線，烈焰席捲敵陣'},
 {id:'charge',name:'衝鋒',owner:'主角',key:'2',kind:'charge',cost:30,cd:10,damage:80,description:'騎兵突進，撞散敵方前陣'},
 {id:'mounted',name:'騎射',owner:'主角',key:'3',kind:'mounted',cost:26,cd:9,damage:65,description:'策馬放箭，箭雨覆蓋敵陣'},
 {id:'pincer',name:'夾擊',owner:'郭嘉',key:'Q',kind:'pincer',cost:40,cd:15,damage:110,description:'前後合圍，同時夾擊敵軍'},
 {id:'ally-charge',name:'衝鋒',owner:'夏侯惇',key:'W',kind:'charge',cost:30,cd:14,damage:80,description:'友軍騎兵入陣突擊'},
 {id:'inspire',name:'鼓舞',owner:'于禁',key:'E',kind:'inspire',cost:25,cd:18,damage:0,description:'擂鼓振軍威：攻擊 +50%，持續 10 秒'},
];
export const COMMANDERS=[{id:'lord',name:'主角'},{id:'xiahoudun',name:'夏侯惇'},{id:'guojia',name:'郭嘉'},{id:'yujin',name:'于禁'},{id:'enemy',name:'敵軍指揮官'}] as const;
/** Commander and troops now enter the skill shot together. */
export const COMMAND_LEAD=0;
export const MAX_GROUP=50;
export const CINEMATIC_LENGTH=4.2+COMMAND_LEAD;
export function armyCount(s:BattleState,side:Side):number {return s.units.filter(u=>u.side===side).reduce((n,u)=>n+u.hp,0);}
export function armyBarWidth(troops:number):number {return Math.max(0,troops)*.68;}
function spawn(s:BattleState,side:Side,count:number):void {
 for(let i=0;i<Math.ceil(count/s.groupSize);i++) {
  const lane=i%4, column=Math.floor(i/4),id=s.nextId++;
  const homeX=side==='ally'?480-column*90:1100+column*90;
  s.units.push({id,side,hp:Math.min(s.groupSize,count-i*s.groupSize),maxHp:Math.min(s.groupSize,count-i*s.groupSize),x:homeX,homeX,y:375+lane*64+column*8,lane,attack:.15+(i%5)*.14,targetId:0,struck:false,pose:'guard',poseTime:0,deathTime:0,hitTime:0,seed:id*.73});
 }
}
export function createBattle(troops=400):BattleState {
 const initial=Math.max(50,Math.min(600,Math.floor(troops)));
 const commanders:Commander[]=COMMANDERS.map((c,i)=>({ ...c,side:i===4?'enemy':'ally',homeX:i===4?1470:125+(i%2)*70,x:i===4?1470:125+(i%2)*70,y:i===4?485:350+i*78,pose:'command',poseTime:i*.35,flip:i===4}));
 const s:BattleState={skills:DEMO_SKILLS,groupSize:MAX_GROUP,supplyMax:200,regen:2.4,allyAttack:1,enemyAttack:1,buffPower:.5,debuff:0,debuffPower:0,waveTroops:[],waveNames:[],units:[],commanders,phase:'entry',phaseTime:0,defeated:null,enemyInitial:600,time:0,duration:60,supply:160,kills:0,lost:0,initial,nextId:1,wave:1,cooldowns:{},buff:0,cinematic:null,status:'ready',reason:'',castCount:0,traitUntil:0,traitReady:true,log:[]};
 spawn(s,'ally',initial);spawn(s,'enemy',s.enemyInitial);return s;
}
export function startBattle(s:BattleState):void {if(s.status!=='ready')return;s.status='running';prepareEntry(s);}
function prepareEntry(s:BattleState):void {
 s.units=s.units.filter(u=>u.hp>0);
 const allies=s.units.filter(u=>u.side==='ally');
 allies.forEach((u,i)=>{u.lane=i%4;u.y=375+u.lane*64+Math.floor(i/4)*8;u.homeX=480-Math.floor(i/4)*90;u.x=u.homeX-850;u.pose='run';u.poseTime=0;u.targetId=0;u.hitTime=0;});
 for(const c of s.commanders){c.x=c.homeX-(c.side==='ally'?850:0);c.flip=c.side==='enemy';c.pose=c.side==='ally'?'move':'command';c.poseTime=0;}
 s.phase='entry';s.phaseTime=0;s.defeated=null;
}
export function damageTroop(s:BattleState,u:Troop,damage:number):number {
 if(u.hp<=0)return 0;
 const hit=Math.min(u.hp,Math.max(0,Math.floor(damage)));
 if(hit===0)return 0;
 u.hp-=hit;u.hitTime=.16;
 if(u.side==='enemy')s.kills+=hit;else s.lost+=hit;
 if(u.hp===0){u.pose='dead';u.poseTime=0;u.deathTime=0;}
 else if(u.pose!=='slash'){u.pose='hit';u.poseTime=0;}
 return hit;
}
export function skillBlock(s:BattleState,skill:DemoSkill):string {
 if(s.status!=='running')return s.status==='paused'?'已暫停':s.status==='finished'?'戰鬥結束':'尚未交戰';
 if(s.phase!=='combat')return '過場中';
 if(s.cinematic)return '演出中';
 if((s.cooldowns[skill.id]??0)>0)return `冷卻 ${Math.ceil(s.cooldowns[skill.id]??0)} 秒`;
 if(s.supply<skill.cost)return '軍糧不足';
 if(!s.units.some(u=>u.side==='enemy'&&u.hp>0)&&skill.kind!=='inspire')return '等待敵軍';
 return '';
}
export function castSkill(s:BattleState,id:string):boolean {
 const skill=s.skills.find(k=>k.id===id);if(!skill||skillBlock(s,skill))return false;
 const foes=s.units.filter(u=>u.side==='enemy'&&u.hp>0);
 s.supply-=skill.cost;s.cooldowns[id]=skill.cd;s.castCount++;
 const commander=s.commanders.find(c=>c.name===skill.owner);if(commander){commander.pose='command';commander.poseTime=0;}
 s.cinematic={skill,time:0,impacted:false,targetX:foes.length?foes.reduce((n,u)=>n+u.x,0)/foes.length:1050,targetY:485,damage:0};return true;
}
function impact(s:BattleState,c:Cinematic):void {
 c.impacted=true;
 if(c.skill.effect==='heal'){
  let remaining=c.skill.damage;
  for(const u of s.units.filter(u=>u.side==='ally'&&u.hp>0)){const n=Math.min(u.maxHp-u.hp,remaining);u.hp+=n;remaining-=n;c.damage+=n;}
  // Re-form depleted squads only when the skill really restores their soldiers.
  const room=s.initial-armyCount(s,'ally'),revive=Math.min(room,remaining);
  if(revive>0){spawn(s,'ally',revive);c.damage+=revive;}
  s.lost-=c.damage;s.log.unshift(`${c.skill.name}：恢復 ${c.damage} 人`);return;
 }
 if(c.skill.effect==='debuff'){s.debuff=c.skill.effectDuration??10;s.debuffPower=c.skill.power??.25;s.log.unshift(`${c.skill.name}：敵軍攻擊降低`);return;}
 if(c.skill.effect==='buff'||c.skill.kind==='inspire'&&!c.skill.effect){s.buff=c.skill.effectDuration??10;s.buffPower=c.skill.power??.5;s.log.unshift(`${c.skill.name}：我軍攻擊提升`);return;}
 let remaining=c.skill.damage;
 // Concentrated, front-to-back casualties make a 50-person group fall only on actual depletion.
 const foes=s.units.filter(u=>u.side==='enemy'&&u.hp>0).sort((a,b)=>a.x-b.x||a.hp-b.hp);
 for(const u of foes){const n=damageTroop(s,u,remaining);remaining-=n;c.damage+=n;if(remaining<=0)break;}
 for(const u of foes) if(u.hp>0){u.hitTime=.5;u.pose='hit';u.poseTime=0;}
 s.log.unshift(`${c.skill.name}：擊退 ${c.damage} 人`);s.log=s.log.slice(0,4);
}
function finish(s:BattleState,reason:string):void {s.status='finished';s.reason=reason;s.cinematic=null;}
function setPhase(s:BattleState,phase:WavePhase):void {
 s.phase=phase;s.phaseTime=0;
 const winner=s.defeated==='ally'?'enemy':'ally';
 for(const u of s.units)if(u.hp>0){u.pose=phase==='exit'||phase==='combat'?'run':'guard';u.poseTime=0;u.hitTime=0;}
 for(const c of s.commanders){
  c.poseTime=0;
  c.pose=phase==='exit'&&c.side===winner?'move':phase==='cheer'&&c.side===winner?'cheer':'command';
  if(phase==='flee'&&c.side===s.defeated)c.flip=c.side==='ally';
 }
}
function detectRout(s:BattleState):boolean {
 const ally=armyCount(s,'ally'),enemy=armyCount(s,'enemy');
 if(ally>0&&enemy>0)return false;
 s.defeated=ally===0?'ally':'enemy';setPhase(s,'fallen');
 s.log.unshift(s.defeated==='enemy'?'敵陣已破・追擊！':'我軍潰散・撤退！');return true;
}
function corpses(s:BattleState,dt:number):void {
 for(const u of s.units)if(u.hp===0)u.deathTime+=dt;
 s.units=s.units.filter(u=>u.hp>0||u.deathTime<1.8);
}
function tickTransition(s:BattleState,dt:number):void {
 s.phaseTime+=dt;corpses(s,dt);
 for(const u of s.units)if(u.hp>0)u.poseTime+=dt;
 for(const c of s.commanders)c.poseTime+=dt;
 const winner=s.defeated==='ally'?'enemy':'ally',dir=winner==='ally'?1:-1;
 switch(s.phase){
  case 'entry':
   for(const u of s.units)if(u.side==='ally'){u.x=Math.min(u.homeX,u.x+340*dt);u.pose=u.x<u.homeX?'run':'guard';}
   for(const c of s.commanders)if(c.side==='ally'){c.x=Math.min(c.homeX,c.x+340*dt);c.pose=c.x<c.homeX?'move':'command';}
   if(s.phaseTime>=2.6)setPhase(s,'reveal');
   break;
  case 'reveal':if(s.phaseTime>=1.25)setPhase(s,'start');break;
  case 'start':if(s.phaseTime>=1.45)setPhase(s,'combat');break;
  case 'fallen':if(s.phaseTime>=1.9)setPhase(s,'flee');break;
  case 'flee':
   // First focus the routed commander, then follow the retreat.
   if(s.phaseTime>.6)for(const c of s.commanders)if(c.side===s.defeated){if(c.pose!=='move'){c.pose='move';c.poseTime=0;}c.x+=(s.defeated==='enemy'?1:-1)*460*dt;}
   if(s.phaseTime>=3)setPhase(s,'cheer');
   break;
  case 'cheer':if(s.phaseTime>=2.3)setPhase(s,'exit');break;
  case 'exit':{
   const march=[...s.units.filter(u=>u.hp>0&&u.side===winner),...s.commanders.filter(c=>c.side===winner)];
   for(const u of march)u.x+=dir*490*dt;
   if(march.every(u=>winner==='ally'?u.x>2500:u.x< -900))setPhase(s,'fade-out');
   break;
  }
  case 'fade-out':
   if(s.phaseTime>=.65){
    if(s.defeated==='ally'){finish(s,s.waveTroops.length?'我軍力竭 · 敗軍收整':'我軍力竭 · 演武結束');return;}
    s.units=s.units.filter(u=>u.side==='ally'&&u.hp>0);s.wave++;
    s.enemyInitial=s.waveTroops[Math.min(s.wave-1,s.waveTroops.length-1)]??s.enemyInitial;const general=s.commanders.find(c=>c.side==='enemy');if(general)general.name=s.waveNames[Math.min(s.wave-1,s.waveNames.length-1)]??general.name;spawn(s,'enemy',s.enemyInitial);prepareEntry(s);setPhase(s,'fade-in');
   }
   break;
  case 'fade-in':if(s.phaseTime>=.65){s.phase='entry';s.phaseTime=0;for(const u of s.units)if(u.side==='ally')u.pose='run';for(const c of s.commanders)if(c.side==='ally')c.pose='move';}break;
 }
}
function setPose(u:Troop,pose:Troop['pose']):void {if(u.pose!==pose){u.pose=pose;u.poseTime=0;}}
export function tickBattle(s:BattleState,delta:number):void {
 if(s.status!=='running')return;
 const dt=Math.max(0,Math.min(delta,.05));if(dt===0)return;
 if(s.phase!=='combat'){tickTransition(s,dt);return;}
 if(s.cinematic){
  const c=s.cinematic;c.time+=dt;
  const commander=s.commanders.find(g=>g.name===c.skill.owner);if(commander)commander.poseTime+=dt;
  if(!c.impacted&&c.time>=2.5+COMMAND_LEAD)impact(s,c);
  if(c.time>=CINEMATIC_LENGTH){s.cinematic=null;detectRout(s);}
  return;
 }
 // Check before advancing the clock: a rout never spends extra battle time.
 if(detectRout(s))return;
 const step=Math.min(dt,s.duration-s.time);s.time+=step;
 if(s.time>=s.duration){s.time=s.duration;finish(s,'號角響起 · 時間到');return;}
 s.supply=Math.min(s.supplyMax,s.supply+step*s.regen);s.buff=Math.max(0,s.buff-step);s.debuff=Math.max(0,s.debuff-step);s.traitUntil=Math.max(0,s.traitUntil-step);
 for(const id of Object.keys(s.cooldowns))s.cooldowns[id]=Math.max(0,(s.cooldowns[id]??0)-step);
 if(s.traitReady&&armyCount(s,'ally')<=s.initial*.6){s.traitReady=false;s.traitUntil=8;s.log.unshift('特性・背水：兵力低於六成，8 秒內傷害減少 25%');}
 for(const c of s.commanders)c.poseTime+=step;
 const living=s.units.filter(u=>u.hp>0);
 for(const u of living){
  if(u.hp<=0)continue;
  u.poseTime+=step;u.hitTime=Math.max(0,u.hitTime-step);u.attack=Math.max(0,u.attack-step);
  // Keep a target until it falls. Never retarget on tiny distance changes.
  let target=living.find(t=>t.id===u.targetId&&t.hp>0);
  if(!target){
   target=living.filter(t=>t.side!==u.side&&t.hp>0).sort((a,b)=>
    (Math.abs(a.x-u.x)+Math.abs(a.lane-u.lane)*300)-(Math.abs(b.x-u.x)+Math.abs(b.lane-u.lane)*300))[0];
   u.targetId=target?.id??0;
  }
  if(!target){setPose(u,'guard');continue;}
  if(u.pose==='slash'){
   if(!u.struck&&u.poseTime>=.32){
    u.struck=true;
    const base=(u.side==='ally'?(5+(u.id%2))*s.allyAttack:(3+(u.id%2))*s.enemyAttack)*(u.maxHp/MAX_GROUP);
    damageTroop(s,target,Math.max(1,Math.round(base*(u.side==='ally'&&s.buff>0?1+s.buffPower:1)*(target.side==='ally'&&s.traitUntil>0?.75:1)*(u.side==='enemy'&&s.debuff>0?Math.max(0,1-s.debuffPower):1))));
   }
   if(u.poseTime<.8)continue;
   setPose(u,'guard');
  }
  if(u.pose==='hit'&&u.poseTime<.25)continue;
  const dx=target.x-u.x,dy=target.y-u.y,dir=Math.sign(dx);
  if(Math.abs(dx)>82||Math.abs(dy)>32){
   // Back ranks wait behind allies instead of repeatedly being pushed apart.
   const blocker=living.some(a=>a.id!==u.id&&a.side===u.side&&a.hp>0&&(a.x-u.x)*dir>0&&(a.x-u.x)*dir<88&&Math.abs(a.y-u.y)<28);
   if(blocker&&Math.abs(dy)<32){setPose(u,'guard');continue;}
   setPose(u,'run');
   if(Math.abs(dx)>78)u.x+=dir*Math.min(Math.abs(dx)-78,95*step);
   u.y+=Math.sign(dy)*Math.min(Math.abs(dy),step*12);
  }else if(u.attack<=0){setPose(u,'slash');u.struck=false;u.attack=1.2+(u.id%4)*.1;}
  else setPose(u,'guard');
 }
 corpses(s,step);detectRout(s);
}

/** Session supplies the frozen army and learned skills; demo defaults stay isolated. */
export function createConfiguredBattle(options: {troops:number;supply:number;supplyMax:number;regen:number;duration:number;skills:readonly DemoSkill[];commanders:Commander[];waveTroops:readonly number[];waveNames:readonly string[];allyAttack:number;enemyAttack:number}):BattleState {
 const s=createBattle();Object.assign(s,options,{initial:options.troops,enemyInitial:options.waveTroops[0]??600,units:[],nextId:1,traitReady:false});
 // One squad always represents at most fifty actual soldiers on both sides.
 s.groupSize=MAX_GROUP;
 spawn(s,'ally',s.initial);spawn(s,'enemy',s.enemyInitial);return s;
}

/** Reject malformed live snapshots before timers, rendering or reward loops consume them. */
export function validBattleSnapshot(value:unknown):value is BattleState {
 if(!value||typeof value!=='object')return false;
 const b=value as BattleState;
 const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 return ['ready','running','paused','finished'].includes(b.status)
  && ['entry','reveal','start','combat','fallen','flee','cheer','exit','fade-out','fade-in'].includes(b.phase)
  && [b.time,b.duration,b.supply,b.supplyMax,b.kills,b.lost,b.initial,b.groupSize,b.enemyInitial,b.wave,b.phaseTime,b.nextId,b.regen,b.allyAttack,b.enemyAttack,b.buff,b.buffPower,b.debuff,b.debuffPower,b.traitUntil].every(finite)
  && b.duration>0&&b.time<=b.duration&&b.initial>0&&b.groupSize>0&&b.enemyInitial>0&&Number.isInteger(b.wave)&&b.wave>=1
  && Array.isArray(b.waveTroops)&&b.waveTroops.length>0&&b.waveTroops.every(n=>finite(n)&&n>0)
  && Array.isArray(b.waveNames)&&b.waveNames.length===b.waveTroops.length
  && Array.isArray(b.units)&&b.units.length<=128&&b.units.every(u=>['ally','enemy'].includes(u.side)&&finite(u.hp)&&finite(u.maxHp)&&u.hp<=u.maxHp&&Number.isFinite(u.x)&&Number.isFinite(u.y))
  && Array.isArray(b.commanders)&&b.commanders.length>=2&&b.commanders.some(c=>c.side==='enemy')&&b.commanders.every(c=>typeof c.name==='string'&&Number.isFinite(c.x)&&Number.isFinite(c.y))
  && Array.isArray(b.skills)&&b.skills.length<=6&&b.skills.every(k=>typeof k.id==='string'&&typeof k.name==='string'&&typeof k.owner==='string'&&finite(k.cost)&&finite(k.cd)&&k.cd>0&&finite(k.damage))
  && !!b.cooldowns&&Object.values(b.cooldowns).every(finite)&&Array.isArray(b.log)
  && (!b.cinematic||(finite(b.cinematic.time)&&b.skills.some(k=>k.id===b.cinematic!.skill?.id)))
  && Math.abs(armyCount(b,'ally')+b.lost-b.initial)<1;
}

/** The existing one-use major-check retry reforms real troops without resetting the battle. */
export function rallyArmy(b:BattleState,ratio:number):void {
 const restored=Math.max(1,Math.round(b.initial*ratio));
 b.units=b.units.filter(u=>u.side!=='ally');spawn(b,'ally',restored);
 b.lost=b.initial-restored;b.defeated=null;b.phase='combat';b.phaseTime=0;
 b.log.unshift('天命護佑 · 我軍再起');
}
