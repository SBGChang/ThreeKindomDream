import {debateFrame} from './debate-art.js';
import {drawDebateParticles} from './debate-particles.js';
import {drawEvolutionParticles,effectStamp} from './tactical-particles.js';
import {duelPresentation,DUEL_EVOLUTION_SECONDS} from '../app/duel-presentation.js';
import type { EncounterDemo } from '../app/confrontation-demo.js';
import { drawBattle, type BattleImages } from './realtime-battle-render.js';
import {duelFrame,type DuelPose} from './duel-art.js';

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};

function general(ctx:CanvasRenderingContext2D,images:BattleImages,id:string,x:number,y:number,frame:number,flip:boolean,alpha:number,hit:boolean,tilt=0){
  const img=images['commander-'+id];if(!img)return;
  const cell=img.width/4,size=340;
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#26171365';ctx.beginPath();ctx.ellipse(x,y+6,94,20,0,0,Math.PI*2);ctx.fill();
  ctx.translate(x,y);ctx.rotate(tilt);if(flip)ctx.scale(-1,1);if(hit)ctx.filter='brightness(1.7)';
  ctx.drawImage(img,(frame%4)*cell,Math.floor(frame/4)*cell,cell,cell,-size/2,-size*.88,size,size);ctx.restore();
}

function duelist(ctx:CanvasRenderingContext2D,images:BattleImages,id:string,x:number,y:number,pose:DuelPose,p:number,flip:boolean,alpha:number,hit=false){
 const im=images['duel-'+id];if(!im)return;
 const frame=duelFrame(pose,p),w=im.width/4,h=im.height/8,size=405;
 ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#21170f55';ctx.beginPath();ctx.ellipse(x,y,67.5,13.5,0,0,Math.PI*2);ctx.fill();ctx.translate(x,y);if(flip)ctx.scale(-1,1);if(hit)ctx.filter='brightness(1.65)';ctx.drawImage(im,(frame%4)*w,Math.floor(frame/4)*h,w,h,-size/2,-size*252/320,size,size);ctx.restore();
}

/** Duel and card debate use their dedicated character action sheets. */
export function drawEncounterDemo(ctx:CanvasRenderingContext2D,images:BattleImages,s:{contest:EncounterDemo["contest"];battle?:EncounterDemo["battle"]}):void {
  const c=s.contest;
  if(!c){if(s.battle)drawBattle(ctx,images,s.battle);return;}
  const presentation=duelPresentation(c),duelAnimating=c.duel&&c.phase==='clash',acting=!duelAnimating||presentation.stage==='combat';
  const t=duelAnimating?(acting?presentation.time:0):c.phaseTime;
  const armyOpacity=c.phase==='clear'?1-ease(t/.9):c.phase==='restore'?ease(t/.8):c.phase==='retreat'?1:0;
  const retreatSide=c.winner==='ally'?'enemy' as const:'ally' as const;
  const fleeing=s.battle?.commanders.find(g=>g.side===retreatSide);
  const follow=ease(t/.8);
  const followCamera=fleeing?{x:800+(Math.max(-770,Math.min(2280,fleeing.x))-800)*follow,y:450+(fleeing.y-30-450)*follow,zoom:1+.6*follow}:undefined;
  if(s.battle)drawBattle(ctx,images,s.battle,{armyOpacity,...(c.phase==='retreat'?{retreatSide,...(followCamera?{camera:followCamera}:{})}:{})});
  else if(images.background)ctx.drawImage(images.background,0,0,1600,900);
  ctx.save();ctx.fillStyle=`rgba(8,15,23,${(1-armyOpacity)*.38})`;ctx.fillRect(0,0,1600,900);ctx.restore();
  if(c.phase==='clear'||c.phase==='retreat')return;
  const entry=c.phase==='approach'?ease(t/1.2):1;
  const alpha=c.phase==='restore'?1-ease(t/.8):entry;
  const duel=c.kind==='duel';
  const strike=c.phase==='clash'&&acting?Math.sin(clamp(t/(duel?1.7:.95))*Math.PI):0;
  const impact=c.phase==='clash'&&(duel?t>.72&&t<.99:t>.28&&t<.57);
  const turn=c.duel?.last;
  const hurtA=c.cards?!!c.cards.last?.damageToAlly:duel?!!turn?.damageToAlly:!c.success,hurtB=c.cards?!!c.cards.last?.damageToEnemy:duel?!!turn?.damageToEnemy:c.success;
  const guardA=duel&&turn?.ally==='defend'&&turn.enemy==='attack',guardB=duel&&turn?.enemy==='defend'&&turn.ally==='attack';
  const repelledA=guardB,repelledB=guardA;
  const reactA=(hurtA&&!guardA)||repelledA,reactB=(hurtB&&!guardB)||repelledB;
  let left=320+entry*(duel?307.5:200),right=1280-entry*(duel?307.5:200);
  if(duel&&c.phase==='clash'&&acting){
   // Match the contact to the opposing pose: torso for rest, weapon for guard,
   // and two extended weapons for attack. Non-attacking riders hold their ground.
   const attackers=Number(turn?.ally==='attack')+Number(turn?.enemy==='attack');
   const rush=clamp((t-.18)/.52),returning=1-ease((t-1.02)/.65);
   const target=turn?.ally==='attack'?turn.enemy:turn?.ally;
   const contactGap=(attackers===2?156:target==='defend'?116:82)*1.5;
   const advance=(345-contactGap)/Math.max(1,attackers)*rush*rush*returning;
   if(turn?.ally==='attack')left+=advance*(returning>0?(1-ease((t-1.02)*(1+(c.duel?.ally.retreatSpeed??0))/.65))/returning:0);
   if(turn?.enemy==='attack')right-=advance;
   const recoil=24*ease((t-.79)/.12)*(1-ease((t-1.05)/.55));
   if(reactA)left-=recoil*(repelledA?2:1);
   if(reactB)right+=recoil*(repelledB?2:1);
  }else if(!duel&&!c.cards&&c.phase==='clash'){
   if(hurtA)left-=strike*35;
   if(hurtB)right+=strike*35;
  }
  const frame=c.phase==='approach'?16+Math.floor(t*18)%16:c.phase==='clash'?Math.min(7,Math.floor(t/.95*8)):c.phase==='verdict'&&c.winner==='ally'?8+Math.min(7,Math.floor(t/1.8*8)):Math.min(7,Math.floor((t%3)/3*8));
  const feet=duel?570:592;
  if(duel){
   // Attack frame 2 is the extended strike; frame 6 is already a raised weapon.
   // Keep the actual strike on the contact/HP-change beat, then finish recovery.
   const attackFrame=t<.18?0:t<.42?1:t<.79?2:t<.9?3:t<1.05?4:t<1.25?5:t<1.5?6:7;
   const pose=(action:DuelPose|null|undefined,hurt:boolean,fainted:boolean,guard:boolean):[DuelPose,number]=>{
    if(c.phase!=='clash'||!acting)return fainted?['hurt',.3]:['idle',0];
    if(guard)return ['defend',Math.min(2/8,t/.7*2/8)];
    if(hurt&&t>=.79)return ['hurt',clamp((t-.79)/.8)];
    if(fainted&&!action)return ['hurt',.3];
    return action==='attack'?['attack',attackFrame/8]:[action??'rest',clamp(t/.9)];
   };
   const displayed=!acting&&c.duelBefore?c.duelBefore:c.duel!;
   const a=pose(turn?.ally,reactA,displayed.ally.fainted,guardA),b=pose(turn?.enemy,reactB,displayed.enemy.fainted,guardB);
   if(presentation.stage==='evolution'){
    const et=presentation.time,focus=ease(et/.25)*(1-ease((et-(DUEL_EVOLUTION_SECONDS-.3))/.3));
    // Darken the battlefield first, then paint the halo behind the lit ally.
    ctx.save();ctx.fillStyle=`rgba(3,9,18,${.78*focus})`;ctx.fillRect(0,0,1600,900);ctx.restore();
    if(turn?.enemyEvolution){
     duelist(ctx,images,c.allyId,left,feet,'idle',0,false,alpha*(1-.85*focus));
     const evo=images['evolution-particles'];
     if(evo)drawEvolutionParticles(ctx,evo,et,right,feet,turn.enemyEvolution,false);
     duelist(ctx,images,c.enemyId,right,feet,'rest',clamp(et/.8),true,alpha);
     if(evo)drawEvolutionParticles(ctx,evo,et,right,feet,turn.enemyEvolution,true);
    }else{
    duelist(ctx,images,c.enemyId,right,feet,'idle',0,true,alpha*(1-.85*focus));
    ctx.save();
    const evo=images['evolution-particles'];if(evo)drawEvolutionParticles(ctx,evo,et,left,feet,turn?.allyEvolution??'',false);
    const cheer=images['commander-'+(c.allyId==='npc_soldier'?'enemy':c.allyId)];
    if(cheer){
     const cell=cheer.width/4,frame=et<1.7?8+Math.min(2,Math.floor(et/.18)):11+Math.min(4,Math.floor((et-1.7)/.2)),size=277.5;
     ctx.drawImage(cheer,(frame%4)*cell,Math.floor(frame/4)*cell,cell,cell,left-size/2,feet-size*.88,size,size);
    }else duelist(ctx,images,c.allyId,left,feet,'rest',clamp(et/.8),false,alpha);
    if(evo)drawEvolutionParticles(ctx,evo,et,left,feet,turn?.allyEvolution??'',true);
    ctx.restore();
    }
   }else{
    const hitBeat=acting&&c.phase==='clash'&&t>=.75&&t<.82;
    const drawAlly=()=>duelist(ctx,images,c.allyId,left,feet,a[0],a[1],false,alpha,hitBeat&&hurtA&&!guardA);
    const drawEnemy=()=>duelist(ctx,images,c.enemyId,right,feet,b[0],b[1],true,alpha,hitBeat&&hurtB&&!guardB);
    // The attacking weapon must remain visible across the defender's silhouette.
    if(acting&&c.phase==='clash'&&turn?.ally==='attack'&&turn.enemy!=='attack'){drawEnemy();drawAlly();}
    else{drawAlly();drawEnemy();}
    if(acting&&(turn?.ally==='attack'||turn?.enemy==='attack')&&c.phase==='clash'&&t>=.72&&t<1.15&&images['skill-particles']){const q=(t-.72)/.43;effectStamp(ctx,images['skill-particles'],guardA||guardB?10:6,(left+right)/2,feet-110,90+q*140,90+q*140,1-q);}
   }
  }else if(c.cards){
   for(const side of ['ally','enemy'] as const){
    const im=images['debate-'+(side==='ally'?'guojia':'enemy')];if(!im)continue;
    const f=debateFrame(c.phase==='clash'&&c.cards.last?c.cards.last[side]:null,t),size=360;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(side==='ally'?left:right,feet);
    ctx.fillStyle='#21170f55';ctx.beginPath();ctx.ellipse(0,0,65,12,0,0,Math.PI*2);ctx.fill();
    if(side==='enemy')ctx.scale(-1,1);
    if(c.phase==='clash'&&t>=.65&&t<.76&&(side==='ally'?hurtA:hurtB))ctx.filter='brightness(1.35)';
    ctx.drawImage(im,(f%4)*320,Math.floor(f/4)*320,320,320,-size/2,-size*284/320,size,size);ctx.restore();
   }
  }else{
   general(ctx,images,c.allyId,left,feet,frame,false,alpha,impact&&hurtA);
   general(ctx,images,'enemy',right,feet,c.phase==='verdict'&&c.winner==='enemy'?8+Math.min(7,Math.floor(t/1.8*8)):frame,true,alpha,impact&&hurtB);
  }
  if(c.phase==='clash'&&!duel){
    ctx.save();ctx.globalAlpha=alpha*Math.sin(clamp(t/(duel||c.cards?1.8:1.15))*Math.PI);
    const center=c.success?right-55:left+55;
    ctx.strokeStyle=c.success?'#ffdd85':'#ff8170';ctx.lineWidth=7;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=20;
    if(c.cards?.last){
      const atlas=images['skill-particles'];
      if(atlas){
       const reduced=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
       drawDebateParticles(ctx,atlas,c.cards.last.ally,t,left,right,c.round*137,reduced);
       drawDebateParticles(ctx,atlas,c.cards.last.enemy,t,right,left,c.round*137+71,reduced);
      }
    }else if(!duel){
      const p=ease(t/.65),from=c.success?left:right,to=c.success?right:left;
      for(let i=0;i<3;i++){const x=from+(to-from)*p-i*(c.success?1:-1)*35;ctx.beginPath();ctx.ellipse(x,410,18+i*8,60+i*10,0,-1.2,1.2);ctx.stroke();}
    }
    ctx.font='900 54px "DFKai-SB",serif';ctx.textAlign='center';ctx.lineWidth=7;ctx.strokeStyle='#23170e';
    const card=c.cards?.last;
    const word=card?(card.notes.some(n=>n.includes('舉證失勢'))?'論 據 被 拆':card.ally==='proof'?'據 理 力 爭':card.ally==='claim'?'立 論':card.ally==='rebut'?'反 駁':card.ally==='focus'?'凝 神 整 思':card.ally==='borrow'?'借 題 發 揮':'質 疑'):duel?(turn?.allyEvolution??turn?.enemyEvolution??(turn?.ally==='rest'&&turn.enemy==='rest'?'調 息':turn?.ally==='defend'&&turn.enemy==='defend'?'對 峙':c.success?'得 勢':'交 鋒')):c.success?'駁 倒':'失 言';
    if(!c.cards){ctx.strokeText(word,800,340);ctx.fillStyle=c.success?'#ffe4a1':'#ffa49b';ctx.fillText(word,800,340);}ctx.restore();
  }
}
