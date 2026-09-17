import {useEffect,useRef} from 'react';
import {DialogueActor,DialogueFace,actorHome} from './DialogueActors.js';
import {DialogueText} from './DialogueText.js';
import type {CareerPresentation} from './career-presentation.js';
import type {BattleStory,StoryRun} from '../contracts/core/battle-story.js';
import {storySpeech} from '../app/battle-story.js';
import './event-dialogue.css';

const profile:CareerPresentation={attr:'war',line:'martial',rank:0,tier:0,row:1,label:'演武',action:'受訓'};
/** Same dialogue actors, portraits, text and CSS surface used by the training story. */
export function BattleStoryDialogue({data,run,onNext}:{data:BattleStory;run:StoryRun;onNext:(choice?:string)=>void}):React.ReactElement {
 const root=useRef<HTMLDivElement>(null),lastNpc=useRef<string|null>(null),n=data.nodes[run.node]!,line=storySpeech(data,run);
 const realSpeaker=line&&Object.values(data.actors).some(a=>a.name===line.speaker);
 if(realSpeaker&&line.speaker!=='你')lastNpc.current=line.speaker;
 const speaker=line?.speaker??(n.kind==='choice'?lastNpc.current??'軍中':n.kind==='reward'?'戰功':'軍中');
 const text=line?.text??(n.kind==='choice'?n.prompt:n.kind==='reward'?[n.reward.title,n.reward.allStats?`全屬性各＋${n.reward.allStats}`:'',...n.reward.items,...n.reward.unlocks.map(name=>'開放相逢：'+name),n.reward.gold?`黃金${n.reward.gold}`:''].filter(Boolean).join('　'):n.kind==='end'?n.text:'');
 const npc=lastNpc.current,actors=[{name:'你',hero:true},...(npc?[{name:npc}]:[])];
 const words=Object.values(data.actors).map(a=>a.name);
 useEffect(()=>{root.current?.focus({preventScroll:true});},[run.revision]);
 const choosing=n.kind==='choice';
 return <div ref={root} tabIndex={0} role="region" aria-label="戰場對話演出" className={`event-dialogue story-dialogue ${choosing?'decision-open':''}`}
  onClick={e=>{if(!(e.target as Element).closest('button')&&!choosing&&e.detail<=1)onNext();}}
  onKeyDown={e=>{if(['Enter',' '].includes(e.key)&&!e.repeat&&!(e.target as Element).closest('button')){e.preventDefault();e.stopPropagation();if(!choosing)onNext();}}}>
  <div className="dialogue-cast" aria-label="劇情人物">{actors.map((actor,i)=><DialogueActor key={actor.name} actor={actor} index={i} home={actorHome(i,2)} cue={actor.name} speaking={speaker===actor.name} profile={profile} reduced={false}/>)}</div>
  {n.kind==='choice'&&<section className="dialogue-decision" aria-label="選擇回應"><div className="decision-heading">◆ 選擇回應 ◆</div><div className="dialogue-options">{n.options.map((o,i)=><button className="dialogue-choice" key={o.id} onClick={()=>onNext(o.id)}><span className="dialogue-choice-label"><span className="dialogue-choice-number">{i+1}</span><DialogueText text={o.label} keywords={words}/></span><span className="dialogue-choice-reward"><DialogueText text={o.detail} keywords={words}/></span></button>)}</div></section>}
  <section className="conversation-box" aria-label="對話框">{realSpeaker&&<DialogueFace actor={{name:speaker,hero:speaker==='你'}} profile={profile}/>}<div className="conversation-content"><div className="dialogue-speaker-name">{speaker}{line?.thought?' · 心聲':''}</div><p className="dialogue-line" aria-live="polite"><DialogueText text={text} keywords={words}/></p></div>{!choosing&&<button className="bsf-next" onClick={()=>onNext()}>{n.kind==='end'?'返回戰場':'繼續'} ▸</button>}</section>
 </div>;
}
