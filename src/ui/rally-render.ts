import type {RallyState,RallyEvent} from '../contracts/core/debate-rally.js';
import type {BattleImages} from './realtime-battle-render.js';
import {debateFrame} from './debate-art.js';
import {drawDebateParticles} from './debate-particles.js';
import {RALLY_COLORS,RALLY_SPECIALS} from '../app/debate-traits.js';
export function rallyMotion(event:RallyEvent){return event.card?.kind==='normal'?RALLY_COLORS[event.card.color].motion:event.card?.kind==='special'?RALLY_SPECIALS[event.card.special].motion:'focus';}
export function drawRally(ctx:CanvasRenderingContext2D,images:BattleImages,s:RallyState,t:number,animating:boolean,reduced=false):void {
 ctx.clearRect(0,0,1600,900);const bg=images.background;if(bg)ctx.drawImage(bg,-250,-160,2100,1182);
 ctx.fillStyle='#07131b78';ctx.fillRect(0,0,1600,900);
 const event=s.last,active=animating&&event;
 for(const side of ['ally','enemy'] as const){
  const im=images['debate-'+(side==='ally'?'guojia':'enemy')];if(!im)continue;
  const hurt=active&&event.after[side]<event.before[side]&&t>=.7&&t<1.4;
  const x=side==='ally'?465:1135,feet=568,size=345;
  const f=debateFrame(active&&event.side===side?rallyMotion(event):null,active?t:0);
  ctx.save();ctx.translate(x,feet);ctx.fillStyle='#16110c65';ctx.beginPath();ctx.ellipse(0,0,62,12,0,0,Math.PI*2);ctx.fill();
  if(side==='enemy')ctx.scale(-1,1);
  if(hurt&&!reduced){const p=Math.sin((t-.7)/.7*Math.PI);ctx.translate(-p*10,0);ctx.rotate(-p*.045);}
  if(hurt&&t<.82)ctx.filter='brightness(1.4)';
  if(!s[side].heart){ctx.globalAlpha=.65;ctx.rotate(-.08);}
  ctx.drawImage(im,(f%4)*320,Math.floor(f/4)*320,320,320,-size/2,-size*284/320,size,size);ctx.restore();
 }
 const atlas=images['skill-particles'];
 if(active&&atlas&&event.card){const from=event.side==='ally'?465:1135,to=1600-from;
  drawDebateParticles(ctx,atlas,rallyMotion(event),t,from,to,s.history.length*137,reduced);
  if(event.reflected&&t>.65)drawDebateParticles(ctx,atlas,'rebut',t-.65,to,from,s.history.length*139,reduced);
 }
}
