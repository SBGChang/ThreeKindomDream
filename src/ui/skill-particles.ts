import type {Cinematic,Troop} from './realtime-battle-model.js';
type Atlas=HTMLImageElement|HTMLCanvasElement;
export type ParticleLayer='rear'|'front';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
const rand=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function stamp(ctx:CanvasRenderingContext2D,atlas:Atlas,cell:number,x:number,y:number,w:number,h:number,alpha:number,angle=0,add=false,flip=false):void {
 if(alpha<=0)return;
 const cw=atlas.width/4,ch=atlas.height/4;
 ctx.save();ctx.globalAlpha=clamp(alpha);ctx.globalCompositeOperation=add?'lighter':'source-over';ctx.translate(x,y);ctx.rotate(angle);if(flip)ctx.scale(-1,1);
 ctx.drawImage(atlas,(cell%4)*cw,Math.floor(cell/4)*ch,cw,ch,-w/2,-h/2,w,h);ctx.restore();
}
/** Buff indication uses the same authored ring, not a procedural ellipse. */
export function drawBuffAura(ctx:CanvasRenderingContext2D,atlas:Atlas,x:number,y:number,t:number,alpha:number):void {
 stamp(ctx,atlas,12,x,y,78,27,alpha*(.35+.13*Math.sin(t*3)));
}
/** Every birth time and trajectory is derived from cinematic time; no mutable particles or RNG. */
export function drawSkillParticles(ctx:CanvasRenderingContext2D,atlas:Atlas,c:Cinematic,layer:ParticleLayer,allies:readonly Troop[]=[]):void {
 const t=c.time,k=c.skill.kind,end=c.targetX,ground=c.targetY;
 if(t<0||t>=4.2||k==='fire')return;
 const front=layer==='front';
 if(k==='charge'||k==='mounted'||k==='pincer'){
  if(!front){
   const count=k==='pincer'?8:5;
   for(let rider=0;rider<count;rider++)for(let puff=0;puff<18;puff++){
    const born=.42+puff*.105+rand(rider+91)*.055,age=t-born,life=.42+rand(puff+rider*30)*.3;if(age<0||age>life)continue;
    const p=clamp((born-.55)/1.95),q=age/life,side=k==='pincer'?(rider%2===0?-1:1):1,row=k==='pincer'?Math.floor(rider/2):rider;
    const x=k==='pincer'?end+side*(mix(330,55,p)+row*18):k==='charge'?mix(260,end+90,p)-row*53:mix(300,630,p)-row*53;
    const y=k==='pincer'?405+row*48:435+row*25;
    const w=48+q*70;
    stamp(ctx,atlas,puff%3===0?1:0,x-(k==='pincer'?-side:1)*(25+age*60),y-8-age*9,w,w*.55,Math.sin(q*Math.PI)*.55,(rand(puff+200)-.5)*.15,false,side<0);
   }
  }
 }
 if(k==='charge'&&front){
  for(let i=0;i<9;i++){
   const born=.7+i*.18,age=t-born,life=.3;if(age<0||age>life)continue;
   const p=clamp((t-.55)/1.95),x=mix(260,end+90,p)-(i%3)*65;
   stamp(ctx,atlas,3,x,420+(i%3)*46,110+age*100,45,Math.sin(age/life*Math.PI)*.65,-.1,true);
  }
 }
 if(k==='mounted'&&front){
  for(let i=0;i<24;i++){
   const born=1.4+i*.008,age=t-born,p=age/1.1,tx=end+((i%6)-3)*32,ty=ground+(i%4)*25;
   if(p>=0&&p<=1){
    const x=mix(530,tx,p),y=mix(360,ty,p)-Math.sin(p*Math.PI)*200;
    const angle=Math.atan2(ty-360-Math.cos(p*Math.PI)*200*Math.PI,tx-530);
    stamp(ctx,atlas,5,x-Math.cos(angle)*28,y-Math.sin(angle)*28,86,36,.42,angle,true);
    stamp(ctx,atlas,4,x,y,80,80,1,angle);
   }
   const impact=age-1.1;
   if(impact>=0&&impact<.35){const q=impact/.35;stamp(ctx,atlas,7,tx,ty,40+q*45,40,Math.sin(q*Math.PI)*.7);stamp(ctx,atlas,6,tx,ty-18,42,42,(1-q)*.8,i,true);}
  }
 }
 if(k==='pincer'&&front){
  for(const side of [-1,1])for(let i=0;i<4;i++){
   const age=t-(2.02+i*.075),life=.42;if(age<0||age>life)continue;const p=age/life;
   stamp(ctx,atlas,side<0?8:9,end+side*mix(140,20,p),410+i*45,115+p*45,100,Math.sin(p*Math.PI)*.9,side*(.1+p*.5),true,side>0);
  }
 }
 if((k==='charge'||k==='pincer')&&front){
  const age=t-2.5;
  if(age>=0&&age<.42){const q=age/.42;stamp(ctx,atlas,k==='pincer'?10:6,end,ground-55,120+q*130,120+q*110,(1-q)*.95,q*.15,true);}
  for(let i=0;i<30;i++){
   const life=.35+rand(i+3)*.5,p=age/life;if(p<0||p>1)continue;
   const vx=(rand(i+6)-.5)*340,vy=-70-rand(i+9)*190;
   stamp(ctx,atlas,i%3===0?2:k==='pincer'?11:6,end+(rand(i+8)-.5)*160+vx*age,ground-20+vy*age+170*age*age,16+rand(i+4)*25,16+rand(i+4)*25,(1-p)*.8,age*4+i,i%3!==0);
  }
 }
 if(k==='inspire'){
  if(!front){
   for(let beat=0;beat<4;beat++){
    const age=t-(.62+beat*.43),p=age/.8;if(p<0||p>1)continue;
    stamp(ctx,atlas,12,345,490,85+p*490,35+p*165,Math.sin(p*Math.PI)*.72);
   }
   for(let i=0;i<18;i++){
    const age=t-(.55+i*.105),p=age/.85;if(p<0||p>1)continue;
    stamp(ctx,atlas,13,260+rand(i+11)*205,465-age*90,25+p*28,55+p*60,Math.sin(p*Math.PI)*.48,(rand(i+10)-.5)*.2,true);
   }
  }else{
   const recipients=allies.filter(u=>u.side==='ally'&&u.hp>0);
   for(let n=0;n<recipients.length;n++){
    const u=recipients[n]!;
    for(let i=0;i<3;i++){
     const age=t-(2.62+(n%4)*.035+i*.15),p=age/.72;if(p<0||p>1)continue;
     stamp(ctx,atlas,i===0?13:i===1?14:15,u.x+(i-1)*22,u.y-35-age*115,i===0?42:26,i===0?100:26,Math.sin(p*Math.PI)*.8,i===1?age*.5:0,true);
    }
   }
  }
 }
}
