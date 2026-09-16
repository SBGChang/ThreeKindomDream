import {loadOfficerCommands,duelActorForName} from './officer-motion.js';
import {drawTacticalParticles,drawStatusParticles} from './tactical-particles.js';
import {loadArcherMotion,archerFrame} from './archer-sprites.js';
import {troopX} from '../app/battlefield-layout.js';
import {drawSkillParticles,drawBuffAura} from './skill-particles.js';
import {drawFireParticles} from './fire-particles.js';
import { loadCharacterSprite } from './CharacterArt.js';
import { COMMAND_LEAD, COMMANDERS, type BattleState, type Troop, type Cinematic, type Commander } from './realtime-battle-model.js';
export type BattleImages=Record<string,HTMLImageElement|HTMLCanvasElement>;
const root='./art/units/battle-demo/';
export const BATTLE_ASSETS:Record<string,string>={'tactics-particles':'./art/vfx/tactics-elements-v1.png','evolution-particles':'./art/vfx/duel-evolution-v1.png',archer:'./art/units/sequences-v2/volley-atlas.png','skill-particles':'./art/vfx/battle-skills-v1.png','fire-particles':'./art/vfx/fire-particles-v1.png',background:'./art/backgrounds/bg-battle-1.png',run:root+'run-atlas.png',slash:root+'slash-atlas.png',hurt:root+'hurt-atlas.png','enemy-run':root+'enemy-run-atlas.png','enemy-slash':root+'enemy-slash-atlas.png','enemy-hurt':root+'enemy-hurt-atlas.png',mounted:root+'mounted-atlas.png',drum:root+'drum-atlas.png',charge:'./art/units/sequences-v2/charge-atlas.png',ignite:'./art/units/sequences-v2/ignite-atlas.png'};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
for(const commander of COMMANDERS)BATTLE_ASSETS['commander-'+commander.id]=root+'commanders/'+commander.id+'-atlas.png';
const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export async function loadBattleImages(background?:string,commanders:readonly Commander[]=[],waveNames:readonly string[]=[]):Promise<BattleImages>{const images:BattleImages=await Promise.all(Object.entries({...BATTLE_ASSETS,...(background?{background}:{})}).map(([key,src])=>new Promise<[string,HTMLImageElement]>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([key,img]);img.onerror=()=>reject(new Error(`素材載入失敗：${key}`));img.src=src;}))).then(Object.fromEntries);images['archer-motion']=await loadArcherMotion();Object.assign(images,await loadOfficerCommands([...commanders.map(c=>duelActorForName(c.name)),...waveNames.map(duelActorForName)]));await Promise.all(commanders.filter(c=>c.portrait&&!images['commander-'+c.id]).map(async c=>{try{images['portrait-'+c.id]=await loadCharacterSprite(`./art/characters-v2/${c.portrait}.png`);}catch{images['commander-'+c.id]=images['commander-lord']!;}}));return images;}
function sprite(ctx:CanvasRenderingContext2D,images:BattleImages,name:string,frame:number,x:number,y:number,size=150,flip=false,alpha=1,filter='none') {
 const img=images[name];if(!img)return;
 const cell=img.width/4,rows=Math.round(img.height/cell),f=Math.min(rows*4-1,Math.max(0,Math.floor(frame)));
 ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.filter=filter;
 ctx.drawImage(img,(f%4)*cell,Math.floor(f/4)*cell,cell,cell,-size/2,-size*.89,size,size);ctx.restore();
}
function shadow(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,alpha:number){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#35231850';ctx.beginPath();ctx.ellipse(x,y,size*.22,size*.042,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function troop(ctx:CanvasRenderingContext2D,images:BattleImages,u:Troop,s:BattleState,opacity:number,retreat=false){
 if(u.absent&&u.absent>0)return;
 const c=s.cinematic,t=c?c.time-COMMAND_LEAD:0,enemy=u.side==='enemy',prefix=enemy?'enemy-':'';
 let name=u.pose==='run'?'run':u.pose==='slash'||u.pose==='guard'?'slash':'hurt';
 let f=u.pose==='guard'?0:u.pose==='run'?Math.floor((u.poseTime+u.seed)*(s.phase==='exit'?22:14))%16:u.pose==='slash'?Math.min(7,Math.floor(u.poseTime/.8*8)):Math.min(3,Math.floor(u.poseTime/.3*4));
 let x=u.x,y=u.y,alpha=opacity,filter='none';
 const size=150+(u.y-390)*.15;
 if(u.hp===0){name='hurt';f=4+Math.min(3,Math.floor(u.deathTime/.55*4));if(u.deathTime>.55){const flash=Math.floor((u.deathTime-.55)/.16)%3;filter=['brightness(0) invert(1)','brightness(0) saturate(100%) invert(24%) sepia(96%) saturate(3500%) hue-rotate(346deg)','brightness(0) invert(85%) sepia(90%) saturate(1500%)'][flash]??'none';alpha*=1-clamp((u.deathTime-.8)/1);}}
 else if(u.hitTime>0){filter='brightness(1.35)';x+=(enemy?1:-1)*Math.sin(u.hitTime*18)*2;}
 if(s.phase==='cheer'&&u.hp>0){name='slash';const p=clamp((s.phaseTime-.8)/1.4);f=p===0||p===1?0:[0,2,3,3,2,0][Math.floor(p*12)%6]!;y-=Math.abs(Math.sin(p*Math.PI*2))*9;}
 if(c&&t>=2.5&&t<3.8){
  if(enemy&&(c.hitIds??[]).includes(u.id)){name='hurt';f=u.hp===0?6:1;x+=Math.sin(clamp((t-2.5)/1.3)*Math.PI)*30;}
  if(!enemy&&c.skill.kind==='inspire'&&t>3){name='slash';f=3;y-=Math.abs(Math.sin(clamp((t-3)/.8)*Math.PI*2))*17;}
 }
 shadow(ctx,x,y,size,alpha);
 if(!enemy&&s.buff>0&&images['skill-particles'])drawBuffAura(ctx,images['skill-particles'],x,y,s.time+u.seed,alpha);
 if(u.kind==='archer'&&u.hp>0){
  const art=archerFrame(u,retreat);
  sprite(ctx,images,art.name,art.frame,x,y,size,art.flip,alpha,filter);
 }else sprite(ctx,images,prefix+name,f,x,y,size,retreat?!enemy:enemy,alpha,filter);
 if(u.hp>0){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=enemy?'#e15e4b':'#54b8da';ctx.fillRect(x-16,y+4,32*u.hp/u.maxHp,4);ctx.restore();}
}
function camera(s:BattleState):{x:number;y:number;zoom:number} {
 const normal={x:800,y:450,zoom:1},c=s.cinematic,t=s.phaseTime;
 if(c){
  return normal;
 }
 if(s.status==='ready')return normal;
 if(s.phase==='entry'||s.phase==='fade-in')return {x:420,y:445,zoom:1.35};
 if(s.phase==='reveal'){const p=ease(t/1.25);return {x:mix(420,800,p),y:mix(445,450,p),zoom:mix(1.35,1,p)};}
 const defeated=s.defeated,winner=defeated==='ally'?'enemy':'ally';
 const fled=defeated==='enemy'?2280:-770;
 const party=[...s.units.filter(u=>u.side===winner&&u.hp>0),...s.commanders.filter(g=>g.side===winner)];
 const center=party.length?party.reduce((v,u)=>v+u.x,0)/party.length:800;
 if(s.phase==='flee'){
  const g=s.commanders.find(g=>g.side===defeated)!;const p=ease(t/.6);return {x:mix(800,Math.max(-770,Math.min(2280,g.x)),p),y:mix(450,g.y-30,p),zoom:mix(1,1.6,p)};
 }
 if(s.phase==='cheer'){const p=ease(t/.8);return {x:mix(fled,center,p),y:mix(defeated==='enemy'?455:320,460,p),zoom:mix(1.6,1.3,p)};}
 if(s.phase==='exit'||s.phase==='fade-out')return {x:Math.max(50,Math.min(1550,center)),y:460,zoom:1.3};
 return normal;
}
function commanderArt(ctx:CanvasRenderingContext2D,images:BattleImages,g:Commander,s:BattleState,armyOpacity=1,size=185):void {
 if(s.defeated===g.side&&['cheer','exit','fade-out'].includes(s.phase))return;
 const active=s.cinematic?.skill.owner===g.name;
 const time=g.poseTime;
 // Command has a deliberate resting hold between gestures; movement alone loops continuously.
 const frame=g.pose==='move'?16+Math.floor(time*18)%16:g.pose==='cheer'?8+Math.min(7,Math.floor(Math.max(0,time-.7)/1.4*8)):active?Math.min(7,Math.floor(time/1.15*8)):Math.min(7,Math.floor((time%5.5)/1.6*8));
 const opacity=armyOpacity;
 if(opacity<=0)return;
 shadow(ctx,g.x,g.y,size,opacity);
 const actor=duelActorForName(g.name),legacy='commander-'+(actor==='npc_soldier'?'enemy':actor);
 const officer=images['officer-'+actor],portrait=officer||images[legacy]?undefined:images['portrait-'+g.id];
 if(portrait){ctx.save();ctx.globalAlpha=opacity;const h=size*175/185,w=h*portrait.width/portrait.height;const bob=g.pose==='move'?Math.sin(time*12)*4:active?-Math.sin(Math.min(1,time/1.15)*Math.PI)*8:0;ctx.drawImage(portrait,g.x-w/2,g.y-h+bob,w,h);ctx.restore();}
 else if(officer){const cell=officer.width/4;ctx.save();ctx.globalAlpha=opacity;ctx.translate(g.x,g.y);if(g.flip)ctx.scale(-1,1);ctx.drawImage(officer,frame%4*cell,Math.floor(frame/4)*cell,cell,cell,-size/2,-size*252/320,size,size);ctx.restore();}
 else sprite(ctx,images,images[legacy]?legacy:'commander-'+g.id,frame,g.x,g.y,size,g.flip,opacity);
 ctx.save();ctx.globalAlpha=opacity;ctx.font='bold 16px Microsoft JhengHei';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#16120e';ctx.fillStyle=g.side==='ally'?'#ffe7b3':'#ffa58d';ctx.strokeText(g.name,g.x,g.y+19);ctx.fillText(g.name,g.x,g.y+19);ctx.restore();
}
/** The command stage belongs to the formation, independently of the camera. */
export function skillStageAnchor(s:BattleState):{x:number;y:number} {
 const owner=s.commanders.find(g=>g.name===s.cinematic?.skill.owner);
 const group=s.commanders.filter(g=>g.side===(owner?.side??'ally'));
 return group.length?{x:group.reduce((n,g)=>n+g.x,0)/group.length,y:group.reduce((n,g)=>n+g.y,0)/group.length}:{x:160,y:467};
}
export type SkillActor={x:number;y:number;name:string;frame:number;flip:boolean;phase:'enter'|'wait'|'act'|'return'};
/** Presentation actors only: entering and returning never add simulation troops. */
export function stageSkillTroops(s:BattleState):SkillActor[] {
 const c=s.cinematic;if(!c||c.time<.7||c.time>=3.7)return [];
 const t=c.time,k=c.skill.kind,anchor=skillStageAnchor(s);
 const phase:SkillActor['phase']=t<1.1?'enter':t<1.5?'wait':t<3.1?'act':'return';
 const count=k==='fire'?1:k==='inspire'?3:k==='pincer'?8:5;
 return Array.from({length:count},(_,i)=>{
  const row=k==='pincer'?i%4:i,side=k==='pincer'&&i>=4?1:-1;
  const home={x:anchor.x+240+(i%2)*55,y:anchor.y-50+row*32};
  const p=ease((t-1.5)/1),endX=troopX(k==='charge'?c.targetX+55-i*30:k==='pincer'?c.targetX+side*(55+row*18):home.x);
  const actionX=mix(home.x,endX,p),offX=-130-i*40;
  const x=phase==='enter'?mix(offX,home.x,ease((t-.7)/.4)):phase==='return'?mix(endX,offX,ease((t-3.1)/.6)):actionX;
  const actionName=k==='charge'?'charge':k==='mounted'?'mounted':k==='fire'&&(!c.skill.mechanic||c.skill.mechanic==='fire')?'ignite':k==='inspire'?'drum':p>.85?'slash':'run';
  const moving=phase==='enter'||phase==='return';
  const name=moving?(k==='charge'?'charge':k==='mounted'?'mounted':'run'):actionName;
  const frame=moving?(k==='mounted'?0:Math.floor(t*20+i)%16):phase==='wait'?0:k==='charge'||(k==='pincer'&&p<=.85)?Math.floor(t*20+i)%16:Math.min(7,Math.floor(clamp((t-1.5)/1)*8));
  return {x,y:home.y+(moving&&k==='mounted'?Math.sin(t*20+i)*3:0),name,frame,flip:phase==='return'||(phase==='act'&&k==='pincer'&&side===1&&p>.85),phase};
 });
}
function cinematicArt(ctx:CanvasRenderingContext2D,images:BattleImages,s:BattleState){
 for(const actor of stageSkillTroops(s).sort((a,b)=>a.y-b.y)){
  shadow(ctx,actor.x,actor.y,170,1);sprite(ctx,images,actor.name,actor.frame,actor.x,actor.y,170,actor.flip);
 }
 const c=s.cinematic;
 if(c&&c.time>=1.5&&c.skill.kind==='fire'&&(!c.skill.mechanic||c.skill.mechanic==='fire')&&images['fire-particles'])drawFireParticles(ctx,images['fire-particles'],skillEffectTime(c.time),c.targetX,c.targetY);
}
// Delay authored effects until the order; keep their impact at the model's 2.5 seconds.
const skillEffectTime=(t:number)=>t<2.5?.5+(t-1.5)*2:t;
export function stageSkillCommander(g:Commander,s:BattleState,_cam?:{x:number;y:number;zoom:number}):{unit:Commander;opacity:number;size:number} {
 const c=s.cinematic;if(!c||c.time>=4.2)return {unit:g,opacity:1,size:185};
 const t=c.time,anchor=skillStageAnchor(s),returning=t>=3.7,back=ease((t-3.7)/.5);
 if(g.name!==c.skill.owner){
  const offX=g.side==='ally'?-180:1780,p=returning?1-back:ease(t/.35);
  return {unit:{...g,x:mix(g.x,offX,p),pose:'move',poseTime:t,flip:returning?g.side==='enemy':g.side==='ally'},opacity:t>=.35&&t<3.7?0:1,size:185};
 }
 const weight=ease((t-.35)/.35)*(1-back),moving=(t>.35&&t<.7)||returning;
 return {unit:{...g,x:mix(g.x,anchor.x,weight),y:mix(g.y,anchor.y,weight),pose:moving?'move':'command',poseTime:moving?t:Math.max(0,t-1.1)*2.875,flip:moving?(returning?g.x<anchor.x:anchor.x<g.x):false},opacity:1,size:185};
}
export function drawBattle(ctx:CanvasRenderingContext2D,images:BattleImages,s:BattleState,presentation:{armyOpacity?:number;retreatSide?:'ally'|'enemy';camera?:{x:number;y:number;zoom:number}}={}):void {
 ctx.clearRect(0,0,1600,900);const c=s.cinematic,cam=presentation.camera??camera(s),local=c?{...c,time:c.time-COMMAND_LEAD}:null;
 // Keep the painted background covering the viewport even when pincer zooms out.
 const bgZoom=Math.max(1,cam.zoom),bgX=Math.max(-250+800/bgZoom,Math.min(1850-800/bgZoom,cam.x));
 ctx.save();ctx.translate(800,450);ctx.scale(bgZoom,bgZoom);ctx.translate(-bgX,-cam.y);
 const bg=images.background;if(bg)ctx.drawImage(bg,-250,-160,2100,1182);ctx.restore();
 if(c){ctx.fillStyle=`rgba(7,12,19,${.64*ease(c.time/.35)*(1-ease((c.time-COMMAND_LEAD-3.6)/.6))})`;ctx.fillRect(0,0,1600,900);}
 ctx.save();ctx.translate(800,450);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);
 const allyOpacity=local?1-ease(local.time/.35)+ease((local.time-3.7)/.5):1;
 const layers=[...s.units.map(u=>({y:u.y,draw:()=>troop(ctx,images,u,s,(u.side==='ally'?clamp(allyOpacity):1)*(presentation.armyOpacity??1),presentation.retreatSide===u.side)})),...s.commanders.map(g=>{const staged=stageSkillCommander(g,s,cam);return {y:staged.unit.y,draw:()=>commanderArt(ctx,images,staged.unit,s,staged.opacity*(presentation.armyOpacity??1),staged.size)};})];
 const skillAtlas=images['skill-particles'],effect=local&&local.time>=1.5?{...local,time:skillEffectTime(local.time)}:null;
 if(effect&&skillAtlas)drawSkillParticles(ctx,skillAtlas,effect,'rear',s.units);
 layers.sort((a,b)=>a.y-b.y).forEach(layer=>layer.draw());
 for(const a of s.arrows??[]){
  if(a.elapsed<0||(c&&!a.owner)||!skillAtlas)continue;
  const p=clamp(a.elapsed/a.duration),dx=a.toX-a.fromX,dy=a.toY-a.fromY-Math.cos(p*Math.PI)*Math.PI*70;
  const cell=skillAtlas.width/4,ch=skillAtlas.height/4;
  ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx));
  // Authored feathered arrow, row two / cell four, with its original aspect ratio.
  ctx.drawImage(skillAtlas,0,ch,cell,ch,-34,-34,68,68);ctx.restore();
 }

 if(local&&local.time>=0)cinematicArt(ctx,images,s);
 if(images['tactics-particles']){if(c)drawTacticalParticles(ctx,images['tactics-particles'],c,s);else drawStatusParticles(ctx,images['tactics-particles'],s,images['fire-particles']);}
 if(effect&&skillAtlas)drawSkillParticles(ctx,skillAtlas,effect,'front',s.units);
 ctx.restore();
 const vignette=ctx.createLinearGradient(0,0,0,900);vignette.addColorStop(0,'#12100d55');vignette.addColorStop(.2,'#0000');vignette.addColorStop(.72,'#0000');vignette.addColorStop(1,'#0d131bd9');ctx.fillStyle=vignette;ctx.fillRect(0,0,1600,900);
}
