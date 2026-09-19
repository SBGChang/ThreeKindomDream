import type {ReactNode} from 'react';
import {DialogueActor} from './DialogueActors.js';
import {DialogueText} from './DialogueText.js';
import type {CareerPresentation} from './career-presentation.js';
import './event-dialogue.css';
import './event-challenge.css';

export function challengeLines(text:string):{speaker:string;body:string}[]{
 return text.split('\n').filter(Boolean).flatMap(line=>{
  const colon=line.indexOf('：'),speaker=colon>=0?line.slice(0,colon):'旁白',body=colon>=0?line.slice(colon+1):line;
  const parts=body.match(/[^。！？]+[。！？]?/g)??[body],pages:string[]=[];
  for(const part of parts){if(pages.length&&pages[pages.length-1]!.length+part.length<=65)pages[pages.length-1]+=part;else for(let i=0;i<part.length;i+=65)pages.push(part.slice(i,i+65));}
  return pages.map(body=>({speaker,body}));
 });
}
/** Shared presentation for playable challenges and the read-only dialogue preview. */
export function ChallengeConversation({text,page,opponent,mode,profile,children}:{text:string;page:number;opponent:string;mode:string;profile:CareerPresentation;children:ReactNode}):React.ReactElement{
 const lines=challengeLines(text),{speaker,body}=lines[page]??lines[0]!,actors=['你',opponent];
 for(const beat of lines.slice(0,page+1))if(![...actors,'旁白','獲得','領悟','試煉','獎勵','系統','戰後'].includes(beat.speaker))actors.push(beat.speaker);
 return <div className="event-challenge ec-conversation" style={{backgroundImage:`url(/art/backgrounds/${mode==='debate'?'bg-study':mode==='duel'?'bg-drill':'bg-battle-1'}.png)`}}>
  <div className="dialogue-cast">{actors.map((name,i)=><DialogueActor key={name} profile={profile} actor={{name,...(i===0?{hero:true}:{})}} index={i} home={{x:i===0?25:actors.length===3?55+(i-1)*25:75,y:0}} cue={String(page)} speaking={speaker===name} reduced={false}/>)}</div>
  <section className="conversation-box" aria-label="劇情對話"><div className="conversation-content"><div className="dialogue-speaker-name">{speaker}</div><p className="dialogue-line" aria-live="polite"><DialogueText text={body}/></p></div>{children}</section>
 </div>;
}
