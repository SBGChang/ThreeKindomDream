import { useEffect,useState } from 'react';
import { CareerTheater,CareerHero } from './CareerTheater.js';
import { careerPresentation,CAREER_LABELS,THEATER_STEPS } from './career-presentation.js';
import type { Attr } from '../contracts/core/primitives.js';
export function InspectionReview():React.ReactElement{
 const [rank,setRank]=useState(1),[attr,setAttr]=useState<Attr>('war');
 const profile=careerPresentation(attr,{civil:rank,martial:rank});
 const [playing,setPlaying]=useState(false),[replay,setReplay]=useState(0),[frame,setFrame]=useState(0),[scrubbing,setScrubbing]=useState(false);
 const [scale,setScale]=useState(()=>Math.min(innerWidth/1280,(innerHeight-70)/800));
 useEffect(()=>{const resize=():void=>setScale(Math.min(innerWidth/1280,(innerHeight-70)/800));addEventListener('resize',resize);return()=>removeEventListener('resize',resize);},[]);
 return <main className="inspection-review"><div className="inspection-controls"><select aria-label="身分階段" value={rank} onChange={e=>setRank(Number(e.target.value))}>{[1,2,4,8].map((n,i)=><option key={n} value={n}>{CAREER_LABELS[i]}</option>)}</select><select aria-label="行動項目" value={attr} onChange={e=>setAttr(e.target.value as Attr)}>{(['lead','war','int','pol'] as const).map(a=><option key={a} value={a}>{careerPresentation(a,{civil:rank,martial:rank}).action}</option>)}</select><button onClick={()=>{setScrubbing(false);setReplay(n=>n+1);setPlaying(true);}}>播放演出</button><button onClick={()=>{setPlaying(false);setScrubbing(false);}}>收起</button><label>逐格 <input type="range" min={0} max={THEATER_STEPS.length-1} value={frame} onChange={e=>{setFrame(Number(e.target.value));setPlaying(false);setScrubbing(true);}}/>{frame+1}/{THEATER_STEPS.length}</label><a href="./">返回遊戲</a></div><div className="game-viewport"><div className="game-stage" style={{transform:'scale('+scale+')',backgroundImage:"url('./art/backgrounds/bg-drill.png')"}}><div className="stage-content"><div className={'run-screen inspection-preview '+(playing?'task-playing':'')}>
 <aside className="preview-ui preview-left">此生修為<div/></aside><aside className="preview-ui preview-right">{profile.action}</aside><div className="preview-ui preview-bottom">官階小劇場</div>
 {playing?<CareerTheater key={rank+attr+replay} profile={profile}/>:scrubbing?<CareerTheater profile={profile} paused frameOverride={frame}/>:<div className="training-stage"><div className="training-hero"><CareerHero profile={profile}/></div></div>}
 </div></div></div></div></main>;
}
