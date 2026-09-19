import {useState} from 'react';
import {createPortal} from 'react-dom';
import {defs,t} from '../app/bootstrap.js';
import {dialogueReview} from '../app/dialogue-review.js';
import type {EventChallengeDef} from '../contracts/core/event-challenge.js';
import {ChallengeConversation,challengeLines} from './ChallengeConversation.js';
import {careerPresentation} from './career-presentation.js';
import {GameFrame} from './GameFrame.js';
import './mentor-dialogue-review.css';

type Scene={title:string;opponent:string;mode:string;parts:{title:string;text:string}[]};
const scene=(title:string,d:EventChallengeDef):Scene=>({title,opponent:d.opponentName,mode:d.mode,parts:[
 {title:'開場',text:d.stages?.[0]?.opening??d.opening},
 ...(d.stages??[]).flatMap((stage,i)=>[...(i?[{title:stage.title+'・開場',text:stage.opening}]:[]),...(i<d.stages!.length-1?[{title:stage.title+'・過關',text:stage.victory}]:[])]),
 ...(['win','lose','draw','retreat'] as const).map(key=>({title:{win:'勝利',lose:'落敗',draw:'平手',retreat:'收手／告退'}[key],text:d.outcomes[key]})),
]});

/** Reads compiled production dialogue; never advances a run or writes player saves. */
export function MentorDialogueReview():React.ReactElement{
 const [s]=useState(()=>dialogueReview('notable'));
 const [scenes]=useState(()=>{
  const chapter=defs.reader('storyChapter').all().find(d=>d.afterChallenges?.length===3)!;
  const names=['呂布・夢中一戰','南華・智勇雙全','南華・燈下問道'];
  const rows=chapter.afterChallenges!.map((c,i)=>scene(names[i]!,c.challenge));
  for(const opponent of ['lvbu','nanhua']){const event=defs.reader('event').all().find(e=>e.options.some(o=>o.challenge?.opponent===opponent&&o.challenge.stages))!;rows.push(scene(t(event.titleKey),event.options.find(o=>o.challenge?.stages)!.challenge!));}
  return rows;
 });
 const [selection,setSelection]=useState(0),[part,setPart]=useState(0),[page,setPage]=useState(0);
 const row=scenes[selection]!,beat=row.parts[part]!,length=challengeLines(beat.text).length;
 const next=()=>{if(page+1<length)setPage(page+1);else{setPage(0);setPart((part+1)%row.parts.length);}};
 return <GameFrame meta={s.current.metaSnapshot} session={null} active="entry" onGo={()=>{}} saveNotice=""><div className="mentor-review" onKeyDown={e=>{if((e.key==='ArrowRight'||e.key===' ')&&!(e.target as Element).closest('select,button')){e.preventDefault();next();}}} tabIndex={0}>
  <ChallengeConversation text={beat.text} page={page} opponent={row.opponent} mode={row.mode} profile={careerPresentation('war',s.current.career)}>
   <button className="ec-control mentor-prev" disabled={!page} onClick={()=>setPage(page-1)}>上一句</button><span className="mentor-count">{page+1} / {length}</span><button className="ec-control ec-next" onClick={next}>{page+1<length?'繼續':'下一段'}</button>
  </ChallengeConversation>
  {createPortal(<nav className="mentor-review-nav" aria-label="劇情試看"><strong>劇情試看</strong><select aria-label="選擇劇情" value={selection} onChange={e=>{setSelection(Number(e.target.value));setPart(0);setPage(0);}}>{scenes.map((v,i)=><option key={i} value={i}>{v.title}</option>)}</select><select aria-label="選擇段落" value={part} onChange={e=>{setPart(Number(e.target.value));setPage(0);}}>{row.parts.map((v,i)=><option key={i} value={i}>{v.title}</option>)}</select><button onClick={()=>setPage(0)}>重播本段</button><small>直接看對話・不影響存檔</small></nav>,document.body)}
 </div></GameFrame>;
}
