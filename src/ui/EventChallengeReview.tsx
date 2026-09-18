import {eventChallengeReview} from '../app/event-challenge-review.js';
import {useState} from 'react';
import {GameFrame} from './GameFrame.js';
import {ScreenRun} from './ScreenRun.js';
/** Uses the production event flow, in memory; never reads or overwrites the player's saved run. */
export function EventChallengeReview():React.ReactElement {
 const [s]=useState(()=>eventChallengeReview(new URLSearchParams(location.search).get('mode')??'battle'));
 const [,render]=useState(0),[log,setLog]=useState<string[]>([]);
 return <GameFrame meta={s.current.metaSnapshot} session={s} active="run" onGo={()=>{}} saveNotice="體驗局，不影響正式存檔"><ScreenRun s={s} bump={()=>render(n=>n+1)} log={log} onLog={line=>setLog(v=>[...v,line])} onLearn={()=>{}} onVault={()=>{}}/></GameFrame>;
}

