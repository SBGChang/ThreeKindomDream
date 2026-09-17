import type {DebateCard} from '../contracts/core/card-debate.js';
import {effectStamp} from './tactical-particles.js';

export interface DebateParticle {x:number;y:number;size:number;alpha:number;angle:number;cell:number}
const random=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** Birth, velocity, gravity and lifetime derive from simulation time: pause freezes every mote. */
export function debateParticles(card:DebateCard,t:number,from:number,to:number,seed:number):DebateParticle[]{
 if(t<0||t>=1.8)return [];
 const particles:DebateParticle[]=[],support=card==='focus'||card==='rebut',steal=card==='borrow';
 const start=steal?to:from,end=support?from:steal?from:to;
 for(let i=0;i<64;i++){
  const r=random(seed+i*3),r2=random(seed+i*3+1),r3=random(seed+i*3+2);
  const born=support?i*.013:i*.006,life=support?.65+r*.55:.55+r*.28,age=t-born,p=age/life;
  if(p<0||p>1)continue;
  const travel=clamp(age/.62),orbit=i*2.399+age*5;
  const x=support?start+Math.cos(orbit)*(card==='rebut'?85:48)*(1-p*.35):start+(end-start)*travel+Math.sin(p*Math.PI)*(r-.5)*75;
  const y=support?445+Math.sin(orbit)*65-age*(card==='focus'?85:12):415-Math.sin(travel*Math.PI)*(45+r*65)+(r2-.5)*72;
  particles.push({x,y,size:9+r*20+(card==='pressure'?8:0),alpha:Math.sin(p*Math.PI)*.9,angle:r3*6.28+age*(r-.5)*6,cell:card==='focus'?13:card==='rebut'?10:card==='question'?11:6});
 }
 if(!support){
  for(let i=0;i<48;i++){
   const age=t-(.65+random(seed+i+190)*.12),life=.35+random(seed+i+210)*.55,p=age/life;
   if(p<0||p>1)continue;
   const a=random(seed+i+250)*Math.PI*2,speed=70+random(seed+i+290)*230;
   particles.push({x:end+Math.cos(a)*speed*age,y:425+Math.sin(a)*speed*age+95*age*age,size:(7+random(seed+i+310)*24)*(1-p*.6),alpha:(1-p)*.95,angle:a+age*3,cell:i%3===0?11:6});
  }
 }
 return particles;
}
export function drawDebateParticles(ctx:CanvasRenderingContext2D,atlas:HTMLImageElement|HTMLCanvasElement,card:DebateCard,t:number,from:number,to:number,seed:number,reduced=false):void {
 const particles=debateParticles(card,t,from,to,seed);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;
 ctx.filter=card==='focus'?'hue-rotate(55deg)':card==='question'?'hue-rotate(235deg)':card==='rebut'?'hue-rotate(150deg)':card==='pressure'?'hue-rotate(325deg)':'none';
 for(let i=0;i<particles.length;i++){
  if(reduced&&i%12!==0)continue;
  const p=particles[i]!;
  effectStamp(ctx,atlas,p.cell,reduced?(card==='focus'||card==='rebut'?from:to):p.x,reduced?425:p.y,p.size,p.size,p.alpha*(reduced?.35:1),p.angle);
 }
 ctx.restore();
}
