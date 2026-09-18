import type {BattleState,Cinematic} from './realtime-battle-model.js';
type Atlas=HTMLImageElement|HTMLCanvasElement;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const TACTIC_VFX:Readonly<Record<string,number>>={pincer:13,cavalry:11,longshot:12,infighting:10,misreport:10,fire:0,inspire:13,shield:6,reform:9,toarcher:14,toinfantry:14,pursue:12,mounted:12,volley:12,crossbow:12,lightning:4,thunder:4,water:0,rocks:2,taunt:11,ambush:10,reinforce:13,divide:14,turncoat:14,lure:10,sweep:7};
export function effectStamp(ctx:CanvasRenderingContext2D,atlas:Atlas,cell:number,x:number,y:number,w:number,h:number,alpha=1,angle=0):void{
 if(alpha<=0)return;const cw=atlas.width/4,ch=atlas.height/4;
 ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(atlas,cell%4*cw,Math.floor(cell/4)*ch,cw,ch,-w/2,-h/2,w,h);ctx.restore();
}
/** New mechanics have distinct authored particles, on the same fixed impact beat. */
export function drawTacticalParticles(ctx:CanvasRenderingContext2D,atlas:Atlas,c:Cinematic,s:BattleState):void{
 const m=c.skill.mechanic,t=c.time;if(!m||m==='fire'||t<1.5||t>=4.2)return;
 const cell=TACTIC_VFX[m];if(cell===undefined)return;
 const impact=t>=2.5,p=clamp((t-1.5)),fade=1-clamp((t-3.2)/.8),burst=clamp((t-2.5)/.6);
 if(['water','rocks','thunder','lightning'].includes(m)){
  if(!impact){
   for(let i=0;i<(m==='water'?4:5);i++){
    const x=m==='water'?420+(c.targetX-420)*p-i*45:c.targetX+(i-2)*65;
    const y=m==='water'?c.targetY-45:c.targetY-350+290*p-i*18;
    effectStamp(ctx,atlas,cell,x,y,m==='water'?150:85,['thunder','lightning'].includes(m)?230:150,clamp(p*3));
   }
  }else for(let i=0;i<6;i++)effectStamp(ctx,atlas,cell+1,c.targetX+(i-2.5)*65,c.targetY-45,110+burst*80,100+burst*70,fade*(1-burst*.4),i*.13);
  return;
 }
 const friendly=['inspire','shield','reform','toarcher','toinfantry','reinforce','ambush','longshot'].includes(m);
 const units=s.units.filter(u=>u.hp>0&&!u.absent&&u.side===(friendly?'ally':'enemy'));
 const status:Record<string,string>={pincer:'confuse',cavalry:'rout',infighting:'infighting',misreport:'misreport',shield:'shield',reform:'immune',longshot:'longshot',toarcher:'ready',toinfantry:'ready',taunt:'taunt'};
 const recipients=units.filter(u=>status[m]?(u.effects?.[status[m]!]??0)>0:['reinforce','ambush'].includes(m)?u.temporary:(c.hitIds?.length?c.hitIds.includes(u.id):true));
 if(!impact){effectStamp(ctx,atlas,cell,friendly?400:c.targetX,c.targetY-90,80+p*90,80+p*90,Math.sin(p*Math.PI)*.75);return;}
 for(const u of recipients)effectStamp(ctx,atlas,cell,u.x,u.y-55,95+burst*20,110+burst*30,fade*.7);
}
export function drawStatusParticles(ctx:CanvasRenderingContext2D,atlas:Atlas,s:BattleState,fireAtlas?:Atlas):void{
 const traits:Record<string,number>={nature:4,frugal:15,breakline:7,hunters:12,aftershock:13,sighting:12,supply:15,exploit:7,backwater:6,fervor:13,relief:9,laststand:6,drill:14};
 for(const trait of s.traits??[]){const born=s.traitMarks?.['vfx:'+trait.id+':'+trait.owner],cell=traits[trait.id];if(born===undefined||cell===undefined)continue;const age=s.time-born;if(age<0||age>=1.2)continue;const owner=s.commanders.find(g=>g.name===trait.owner);if(owner)effectStamp(ctx,atlas,cell,owner.x,owner.y-85-age*35,95,110,Math.sin(age/1.2*Math.PI));}
 const map:Record<string,number>={break0:7,break1:7,break2:7,shield:6,backwater:6,exposed:7,confuse:10,infighting:10,misreport:10,rout:11,taunt:11,sighting:12,longshot:12,ready:14,immune:9,drill:13,aftershock:13,relief:9};
 for(const u of s.units.filter(u=>u.hp>0&&!u.absent)){
  if(fireAtlas&&(u.effects?.burn??0)>0)effectStamp(ctx,fireAtlas,Math.floor(s.time*10+u.id)%4,u.x,u.y-40,65,90,.7);
  const effects=Object.entries(u.effects??{}).filter(([k,v])=>v>0&&map[k]!==undefined).slice(0,2);
  effects.forEach(([key],i)=>effectStamp(ctx,atlas,map[key]!,u.x+(i?18:-10),u.y-85-i*15,36,42,.5+.2*Math.sin(s.time*5+u.id)));
 }
}
export function drawEvolutionParticles(ctx:CanvasRenderingContext2D,atlas:Atlas,t:number,x:number,y:number,kind:string,front=false):void{
 if(t<0||t>=2.8)return;const fade=1-clamp((t-2.35)/.45);
 if(!front){const cell=t<1.3?Math.min(3,Math.floor(t/1.3*4)):4+Math.min(3,Math.floor((t-1.3)/1*4));effectStamp(ctx,atlas,cell,x,y-100,300,330,fade);}
 else{
  const cell=kind==='攻其不備'?8:12;
  if(t>=1.3)effectStamp(ctx,atlas,cell+Math.min(3,Math.floor((t-1.3)/1.3*4)),x,y-110,260,260,fade*.75);
  for(let i=0;i<16;i++){const p=clamp((t-i*.045)/1.2),angle=i*2.4;effectStamp(ctx,atlas,3,x+Math.cos(angle)*(140*(1-p)),y-80+Math.sin(angle)*(100*(1-p))-p*65,12,12,(1-p)*fade);}
 }
}
