import { loadCharacterSprite } from './CharacterArt.js';
import { COMMAND_LEAD, COMMANDERS, type BattleState, type Troop, type Cinematic, type Commander } from './realtime-battle-model.js';
export type BattleImages=Record<string,HTMLImageElement|HTMLCanvasElement>;
const root='./art/units/battle-demo/';
export const BATTLE_ASSETS:Record<string,string>={background:'./art/backgrounds/bg-battle-1.png',run:root+'run-atlas.png',slash:root+'slash-atlas.png',hurt:root+'hurt-atlas.png','enemy-run':root+'enemy-run-atlas.png','enemy-slash':root+'enemy-slash-atlas.png','enemy-hurt':root+'enemy-hurt-atlas.png',mounted:root+'mounted-atlas.png',drum:root+'drum-atlas.png',charge:'./art/units/sequences-v2/charge-atlas.png',ignite:'./art/units/sequences-v2/ignite-atlas.png'};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
for(const commander of COMMANDERS)BATTLE_ASSETS['commander-'+commander.id]=root+'commanders/'+commander.id+'-atlas.png';
const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export async function loadBattleImages(background?:string,commanders:readonly Commander[]=[]):Promise<BattleImages>{const images:BattleImages=await Promise.all(Object.entries({...BATTLE_ASSETS,...(background?{background}:{})}).map(([key,src])=>new Promise<[string,HTMLImageElement]>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([key,img]);img.onerror=()=>reject(new Error(`素材載入失敗：${key}`));img.src=src;}))).then(Object.fromEntries);await Promise.all(commanders.filter(c=>c.portrait&&!images['commander-'+c.id]).map(async c=>{images['portrait-'+c.id]=await loadCharacterSprite(`./art/characters-v2/${c.portrait}.png`);}));return images;}
function sprite(ctx:CanvasRenderingContext2D,images:BattleImages,name:string,frame:number,x:number,y:number,size=150,flip=false,alpha=1,filter='none') {
 const img=images[name];if(!img)return;
 const cell=img.width/4,rows=Math.round(img.height/cell),f=Math.min(rows*4-1,Math.max(0,Math.floor(frame)));
 ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.filter=filter;
 ctx.drawImage(img,(f%4)*cell,Math.floor(f/4)*cell,cell,cell,-size/2,-size*.89,size,size);ctx.restore();
}
function shadow(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,alpha:number){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#35231850';ctx.beginPath();ctx.ellipse(x,y,size*.22,size*.042,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function troop(ctx:CanvasRenderingContext2D,images:BattleImages,u:Troop,s:BattleState,opacity:number){
 const c=s.cinematic,t=c?c.time-COMMAND_LEAD:0,enemy=u.side==='enemy',prefix=enemy?'enemy-':'';
 let name=u.pose==='run'?'run':u.pose==='slash'||u.pose==='guard'?'slash':'hurt';
 let f=u.pose==='guard'?0:u.pose==='run'?Math.floor((u.poseTime+u.seed)*(s.phase==='exit'?22:14))%16:u.pose==='slash'?Math.min(7,Math.floor(u.poseTime/.8*8)):Math.min(3,Math.floor(u.poseTime/.3*4));
 let x=u.x,y=u.y,alpha=opacity,filter='none';
 const size=150+(u.y-390)*.15;
 if(u.hp===0){name='hurt';f=4+Math.min(3,Math.floor(u.deathTime/.55*4));if(u.deathTime>.55){const flash=Math.floor((u.deathTime-.55)/.16)%3;filter=['brightness(0) invert(1)','brightness(0) saturate(100%) invert(24%) sepia(96%) saturate(3500%) hue-rotate(346deg)','brightness(0) invert(85%) sepia(90%) saturate(1500%)'][flash]??'none';alpha*=1-clamp((u.deathTime-.8)/1);}}
 else if(u.hitTime>0){filter='brightness(1.35)';x+=(enemy?1:-1)*Math.sin(u.hitTime*18)*2;}
 if(s.phase==='cheer'&&u.hp>0){name='slash';const p=clamp((s.phaseTime-.8)/1.4);f=p===0||p===1?0:[0,2,3,3,2,0][Math.floor(p*12)%6]!;y-=Math.abs(Math.sin(p*Math.PI*2))*9;}
 if(c&&t>=2.5&&t<3.8){
  if(enemy&&c.skill.kind!=='inspire'){name='hurt';f=u.hp===0?6:1;x+=Math.sin(clamp((t-2.5)/1.3)*Math.PI)*30;}
  if(!enemy&&c.skill.kind==='inspire'&&t>3){name='slash';f=3;y-=Math.abs(Math.sin(clamp((t-3)/.8)*Math.PI*2))*17;}
 }
 shadow(ctx,x,y,size,alpha);
 if(!enemy&&s.buff>0){ctx.save();ctx.strokeStyle='#ffe98b';ctx.globalAlpha=alpha*.75;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,32,9,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 sprite(ctx,images,prefix+name,f,x,y,size,enemy,alpha,filter);
}
function arrow(ctx:CanvasRenderingContext2D,x:number,y:number,angle:number,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle='#ffe7a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-38,0);ctx.lineTo(9,0);ctx.stroke();ctx.fillStyle='#e9e7d7';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(5,-5);ctx.lineTo(5,5);ctx.closePath();ctx.fill();ctx.restore();}
function flame(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,t:number){
 ctx.save();ctx.translate(x,y);const sway=Math.sin(t*18+x)*size*.15;
 const grad=ctx.createLinearGradient(0,0,0,-size);grad.addColorStop(0,'#ffe785');grad.addColorStop(.4,'#ff941e');grad.addColorStop(1,'#ff342a00');ctx.fillStyle=grad;
 ctx.beginPath();ctx.moveTo(-size*.3,0);ctx.bezierCurveTo(-size*.55,-size*.4,size*.05+sway,-size*.55,-size*.08+sway,-size);ctx.bezierCurveTo(size*.65,-size*.55,size*.3,-size*.23,size*.3,0);ctx.closePath();ctx.fill();ctx.fillStyle='#fff6be';ctx.beginPath();ctx.moveTo(-size*.12,0);ctx.quadraticCurveTo(size*.18,-size*.5,0,-size*.6);ctx.quadraticCurveTo(size*.32,-size*.2,size*.13,0);ctx.fill();ctx.restore();
}
function skillCamera(c:Cinematic|null):{x:number;y:number;zoom:number} {
 if(!c)return{x:800,y:450,zoom:1};const t=c.time,k=c.skill.kind,p=clamp((t-.5)/2);
 let x=600,zoom=1.3;
 if(k==='charge')x=mix(450,c.targetX,p);
 if(k==='mounted')x=t<1.4?430:mix(430,c.targetX,ease((t-1.4)/1.1));
 if(k==='fire')x=t<1.4?360:mix(360,c.targetX,ease((t-1.4)/1.1));
 if(k==='inspire'){x=340;zoom=1.55;}
 if(k==='pincer'){x=(650+c.targetX)/2;zoom=.85;}
 const entry=ease(t/.5),out=ease((t-2.5)/.6),weight=entry*(1-out);
 return{x:mix(800,x,weight),y:mix(450,465,weight),zoom:mix(1,zoom,weight)};
}
function camera(s:BattleState):{x:number;y:number;zoom:number} {
 const normal={x:800,y:450,zoom:1},c=s.cinematic,t=s.phaseTime;
 if(c){
  if(c.time<COMMAND_LEAD){const g=s.commanders.find(g=>g.name===c.skill.owner)!;const w=ease(c.time/.3)*(1-ease((c.time-.95)/.35));return {x:mix(800,g.x,w),y:mix(450,g.y-55,w),zoom:mix(1,1.9,w)};}
  return skillCamera({...c,time:c.time-COMMAND_LEAD});
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
function commanderArt(ctx:CanvasRenderingContext2D,images:BattleImages,g:Commander,s:BattleState):void {
 if(s.defeated===g.side&&['cheer','exit','fade-out'].includes(s.phase))return;
 const active=s.cinematic?.skill.owner===g.name;
 const time=g.poseTime;
 // Command has a deliberate resting hold between gestures; movement alone loops continuously.
 const frame=g.pose==='move'?16+Math.floor(time*18)%16:g.pose==='cheer'?8+Math.min(7,Math.floor(Math.max(0,time-.7)/1.4*8)):active?Math.min(7,Math.floor(time/1.15*8)):Math.min(7,Math.floor((time%5.5)/1.6*8));
 const opacity=s.cinematic&&!active?.35:1,size=185;
 shadow(ctx,g.x,g.y,size,opacity);
 const portrait=images['portrait-'+g.id];
 if(portrait){ctx.save();ctx.globalAlpha=opacity;const h=175,w=h*portrait.width/portrait.height;const bob=g.pose==='move'?Math.sin(time*12)*4:active?-Math.sin(Math.min(1,time/1.15)*Math.PI)*8:0;ctx.drawImage(portrait,g.x-w/2,g.y-h+bob,w,h);ctx.restore();}
 else sprite(ctx,images,'commander-'+g.id,frame,g.x,g.y,size,g.flip,opacity);
 ctx.save();ctx.globalAlpha=opacity;ctx.font='bold 16px Microsoft JhengHei';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#16120e';ctx.fillStyle=g.side==='ally'?'#ffe7b3':'#ffa58d';ctx.strokeText(g.name,g.x,g.y+19);ctx.fillText(g.name,g.x,g.y+19);ctx.restore();
}
function cinematicArt(ctx:CanvasRenderingContext2D,images:BattleImages,c:Cinematic){
 const t=c.time,k=c.skill.kind,p=clamp((t-.55)/1.95),a=ease((t-.3)/.25)*(1-ease((t-2.5)/.4));
 if(k==='charge'||k==='mounted'){
  for(let i=0;i<5;i++){const x=(k==='charge'?mix(260,c.targetX+90,p):mix(300,630,p))-i*53,y=435+i*25;
   shadow(ctx,x,y,190,a);sprite(ctx,images,k==='charge'?'charge':'mounted',k==='charge'?Math.floor(t*20+i)%16:Math.min(7,Math.floor(p*8)),x,y,195,false,a);
   if(k==='charge'){ctx.save();ctx.globalAlpha=a*.3;ctx.fillStyle='#ddbf85';ctx.beginPath();ctx.ellipse(x-65,y,25+Math.sin(t*9+i)*8,9,0,0,7);ctx.fill();ctx.restore();}
  }
  if(k==='mounted'&&t>1.4&&t<2.65){const q=clamp((t-1.4)/1.1);for(let i=0;i<24;i++){const aq=clamp(q-i*.008);arrow(ctx,mix(530,c.targetX+((i%6)-3)*32,aq),mix(360,c.targetY+(i%4)*25,aq)-Math.sin(aq*Math.PI)*200,Math.atan2((c.targetY-360)-Math.cos(aq*Math.PI)*200*Math.PI,c.targetX-530),a);}}
 }
 if(k==='fire'){
  sprite(ctx,images,'ignite',Math.min(7,Math.floor(clamp((t-.45)/1.15)*8)),315,505,220,false,a);
  const q=clamp((t-1.35)/1.15),end=c.targetX;
  ctx.save();ctx.strokeStyle='#302119';ctx.lineWidth=5;ctx.beginPath();for(let i=0;i<=60;i++){const f=i/60,x=mix(380,end,f),y=510+Math.sin(f*13)*15;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.restore();
  if(t>1.35&&t<2.6)flame(ctx,mix(380,end,q),510+Math.sin(q*13)*15,45,t);
  if(t>2.2&&t<3.6){ctx.save();ctx.globalAlpha=1-ease((t-3.1)/.5);for(let i=0;i<15;i++)flame(ctx,end-170+i*24,435+(i%4)*48,70+Math.sin(i*3+t*9)*25,t+i);ctx.restore();}
 }
 if(k==='pincer'){
  for(let i=0;i<4;i++)for(const side of [-1,1]){const x=c.targetX+side*mix(330,55,p)+i*side*18,y=405+i*48;sprite(ctx,images,p>.85?'slash':'run',p>.85?Math.min(7,Math.floor((p-.85)/.15*8)):Math.floor(t*20+i)%16,x,y,170,side===1,a);}
 }
 if(k==='inspire'){
  for(let i=0;i<3;i++){sprite(ctx,images,'drum',Math.min(7,Math.floor(clamp((t-.5)/1.85)*8)),260+i*85,420+i*52,225,false,a);}
  for(let r=0;r<3;r++){const q=((t*.9+r*.3)%1);ctx.save();ctx.globalAlpha=a*(1-q)*.7;ctx.strokeStyle='#ffe19b';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(350,470,50+q*170,20+q*55,0,0,7);ctx.stroke();ctx.restore();}
 }
 if(t>2.5&&t<2.7&&k!=='inspire'){ctx.save();ctx.globalAlpha=(1-(t-2.5)/.2)*.65;ctx.strokeStyle='#fff0bf';ctx.lineWidth=6;for(let i=0;i<12;i++){const angle=i/12*Math.PI*2;ctx.beginPath();ctx.moveTo(c.targetX+Math.cos(angle)*25,c.targetY+Math.sin(angle)*20);ctx.lineTo(c.targetX+Math.cos(angle)*130,c.targetY+Math.sin(angle)*85);ctx.stroke();}ctx.restore();}
}
export function drawBattle(ctx:CanvasRenderingContext2D,images:BattleImages,s:BattleState):void {
 ctx.clearRect(0,0,1600,900);const c=s.cinematic,cam=camera(s),local=c?{...c,time:c.time-COMMAND_LEAD}:null;
 // Keep the painted background covering the viewport even when pincer zooms out.
 const bgZoom=Math.max(1,cam.zoom),bgX=Math.max(-250+800/bgZoom,Math.min(1850-800/bgZoom,cam.x));
 ctx.save();ctx.translate(800,450);ctx.scale(bgZoom,bgZoom);ctx.translate(-bgX,-cam.y);
 const bg=images.background;if(bg)ctx.drawImage(bg,-250,-160,2100,1182);ctx.restore();
 if(c){ctx.fillStyle=`rgba(7,12,19,${.64*ease(c.time/.35)*(1-ease((c.time-COMMAND_LEAD-3.6)/.6))})`;ctx.fillRect(0,0,1600,900);}
 ctx.save();ctx.translate(800,450);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);
 const allyOpacity=local?1-ease(local.time/.4)+ease((local.time-2.65)/.4):1;
 const layers=[...s.units.map(u=>({y:u.y,draw:()=>troop(ctx,images,u,s,u.side==='ally'?clamp(allyOpacity):1)})),...s.commanders.map(g=>({y:g.y,draw:()=>commanderArt(ctx,images,g,s)}))];
 layers.sort((a,b)=>a.y-b.y).forEach(layer=>layer.draw());
 if(local&&local.time>=0)cinematicArt(ctx,images,local);
 ctx.restore();
 const vignette=ctx.createLinearGradient(0,0,0,900);vignette.addColorStop(0,'#12100d55');vignette.addColorStop(.2,'#0000');vignette.addColorStop(.72,'#0000');vignette.addColorStop(1,'#0d131bd9');ctx.fillStyle=vignette;ctx.fillRect(0,0,1600,900);
}
