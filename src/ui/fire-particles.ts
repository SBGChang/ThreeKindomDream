/** Textured particles sampled from the authored atlas. Absolute age keeps pause/replay deterministic. */
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function quad(ctx:CanvasRenderingContext2D,atlas:CanvasImageSource & {width:number;height:number},cell:number,x:number,y:number,w:number,h:number,alpha:number,rotation=0,add=false):void {
 if(alpha<=0)return;
 const cw=atlas.width/4,ch=atlas.height/4;
 ctx.save();ctx.globalAlpha=clamp(alpha);ctx.globalCompositeOperation=add?'lighter':'source-over';ctx.translate(x,y);ctx.rotate(rotation);
 ctx.drawImage(atlas,(cell%4)*cw,Math.floor(cell/4)*ch,cw,ch,-w/2,-h/2,w,h);ctx.restore();
}
export function drawFireParticles(ctx:CanvasRenderingContext2D,atlas:HTMLImageElement|HTMLCanvasElement,t:number,targetX:number,targetY:number):void {
 const fade=1-clamp((t-3.35)/.65);
 // A growing textured ember front replaces the visible fuse. Emission accelerates
 // toward impact, with larger flame tongues, longer-lived sparks and a brighter core.
 for(let i=0;i<96;i++){
  const q=Math.sqrt(i/95),born=1.35+q*.85,age=t-born,life=.18+q*.24+noise(i)*.1;
  if(age<0||age>life)continue;
  const x=380+(targetX-380)*q,y=510+Math.sin(q*13)*15,p=age/life;
  const spread=35+q*115,size=7+q*13+noise(i+5)*8;
  quad(ctx,atlas,12+i%2,x+(noise(i+2)-.65)*spread*age,y-age*(45+q*130+noise(i+4)*70),size,size*(1.3+q*.6),(1-p)*fade,noise(i+1)*6,true);
  if(i%3===0){
   const h=18+q*52;
   quad(ctx,atlas,Math.min(3,Math.floor(p*4)),x-age*(15+q*50),y-h*.35-age*20,h*.65,h,Math.sin(p*Math.PI)*(.3+.65*q)*fade,(noise(i+7)-.5)*.35);
  }
 }
 if(t>=1.35&&t<2.4){
  const q=clamp((t-1.35)/.85),x=380+(targetX-380)*q,y=510+Math.sin(q*13)*15,blend=1-clamp((t-2.2)/.2);
  const h=22+q*q*65;
  quad(ctx,atlas,Math.floor((t-1.35)*14)%4,x,y-h*.35,h*.8,h,blend);
  quad(ctx,atlas,14,x,y-4,14+q*38,14+q*38,blend*(.55+q*.45),t*2,true);
 }
 // Smoke is emitted behind the tongues of flame, never as an opaque full-screen fog.
 for(let i=0;i<20;i++){
  const born=2.25+noise(i+90)*.8,age=t-born,life=1.05;
  if(age<0||age>life)continue;
  const p=age/life,size=75+p*120;
  quad(ctx,atlas,8+Math.min(3,Math.floor(p*4)),targetX+(noise(i+101)-.5)*350+age*30,targetY-55-age*(60+noise(i+108)*65),size,size,Math.sin(p*Math.PI)*.55*fade,(noise(i+100)-.5)*.3);
 }
 // Staggered bursts lead into independently rising, swaying flame particles.
 for(let i=0;i<48;i++){
  const born=2.2+(i%12)*.018+Math.floor(i/12)*.21,age=t-born,life=.55+noise(i+202)*.35;
  if(age<0||age>life)continue;
  const p=age/life,x=targetX+(noise(i+200)-.5)*340,y=targetY+(noise(i+201)-.5)*130;
  const height=(90+noise(i+203)*80)*(1+.25*Math.sin(p*Math.PI));
  quad(ctx,atlas,Math.min(3,Math.floor(p*4)),x+Math.sin(p*5+i)*9,y-height*.4-age*28,height*.72,height,Math.min(1,p*8)*(1-p)*1.4*fade,(noise(i+204)-.5)*.18);
 }
 for(let i=0;i<7;i++){
  const age=t-(2.2+i*.055),p=age/.55;if(p<0||p>1)continue;
  quad(ctx,atlas,4+Math.min(3,Math.floor(p*4)),targetX-140+i*45,targetY+25+(i%3)*20,120+p*60,120+p*60,Math.sin(p*Math.PI)*.95*fade);
 }
 for(let i=0;i<64;i++){
  const age=t-(2.28+noise(i+300)*.75),life=.45+noise(i+301)*.65;if(age<0||age>life)continue;
  const p=age/life,vx=(noise(i+302)-.5)*230,vy=-100-noise(i+303)*170;
  quad(ctx,atlas,i%4===0?14:12,targetX+(noise(i+304)-.5)*300+vx*age,targetY+vy*age+70*age*age,8+noise(i+305)*13,12+noise(i+306)*17,(1-p)*fade,Math.atan2(vy,vx)+p,true);
 }
}
