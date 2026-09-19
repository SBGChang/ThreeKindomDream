import type {Contest} from '../app/confrontation-demo.js';
import {duelPresentation,DUEL_COLLISION,DUEL_REVEAL_SECONDS} from '../app/duel-presentation.js';
import {DuelArt,actionCell} from './DuelArt.js';
import {duelMatchup} from './duel-matchup.js';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const p=clamp(n);return p*p*(3-2*p);};
export function DuelReveal({contest:c}:{contest:Contest}):React.ReactElement|null {
 const p=duelPresentation(c),last=c.duel?.last;
 if(!last||!['reveal','evolution'].includes(p.stage))return null;
 const copy=last.ally?duelMatchup(last.ally,last.enemy):null;
 const relation=copy?.relation??(last.enemy==='attack'?'lose':'draw');
 const cell={win:0,draw:1,lose:2}[relation];
 if(p.stage==='evolution'){
  const upgraded=p.time>=1.3,blink=p.time<.5?1:p.time<1.3?(Math.floor((p.time-.5)/.2)%2===0?.12:1):1;
  const fade=1-ease((p.time-2.5)/.3);
  const action=last.ally;
  if(!action)return null;
  const burst=1-ease((p.time-1.3)/.65);
  return <div className={`du-evolution-reveal du-evolution-${action}`} aria-label="我方升變演出" style={{opacity:fade}}><div className={`du-evolution-emblem ${upgraded?'du-evolved':''}`} style={{opacity:upgraded?1:blink,transform:`translate(-50%,-50%) scale(${upgraded?1+.15*(1-ease((p.time-1.3)/.3)):1})`}}>{upgraded&&<i className="du-evolution-halo" style={{opacity:.18+.5*burst,transform:`scale(${1+.32*(1-burst)})`}}/>}<DuelArt file={upgraded?`evolution-${action}-v1`:'action-kit-v1'} {...(upgraded?{}:{cell:actionCell(action)})}/></div>{upgraded&&<strong className="du-reveal-title">{last.allyEvolution}</strong>}</div>;
 }
 const t=p.time,C=DUEL_COLLISION;
 // Accelerate through contact rather than easing to a stop; preserve the two-hit recoil cadence.
 const rush=clamp((t-C.launch)/(C.first-C.launch));
 const distance=t<C.first?30-(30-6.4)*rush*rush:t<C.release?6.4:t<C.rebound?6.4+3.7*ease((t-C.release)/(C.rebound-C.release)):10.1-3.7*ease((t-C.rebound)/(C.second-C.rebound));
 const hit=t>=C.second?Math.max(0,1-(t-C.second)/.12):t>=C.first?Math.max(0,1-(t-C.first)/.1):0;
 const icons=1-ease((t-C.flash)/.13),result=ease((t-C.result)/.2),fade=1-ease((t-(DUEL_REVEAL_SECONDS-.3))/.3);
 const flash=t<C.flash?0:t<C.flash+.035?ease((t-C.flash)/.035):1-ease((t-C.flash-.035)/.205);
 return <div className="du-action-reveal" aria-label="雙方出招揭示" style={{opacity:fade}}><div className="du-reveal-black" style={{opacity:ease(t/.12)}}/>{(['ally','enemy'] as const).map(side=>{const action=last[side],direction=side==='ally'?-1:1;return <div key={side} className={`du-flying-command du-flying-${action??'faint'}`} style={{opacity:icons,transform:`translate3d(calc(-50% + ${direction*distance}cqw),-50%,0) scale(${1-.09*hit},${1+.07*hit}) rotate(${direction*(-3*(1-ease(t/C.first))+hit*4)}deg)`}}>{action?<DuelArt cell={actionCell(action)}/>:<DuelArt file="status-icons-v1" cell={3}/>}</div>;})}{hit>0&&<div className="du-impact-ring" style={{opacity:hit,transform:`translate(-50%,-50%) scale(${1+(1-hit)*1.8})`}}/>}<div className="du-collision-result" style={{opacity:result,transform:`translate(-50%,-50%) scale(${1+.3*(1-result)})`}}><DuelArt file="matchup-icons-v1" cell={cell}/></div>{t>=C.result+.08&&<strong className={`du-reveal-title du-title-${relation==='lose'?'red':relation==='win'?'blue':'neutral'}`}>{copy?.result.title??'力竭失守'}</strong>}<div className="du-impact-flash" style={{opacity:flash*.94}}/></div>;
}
