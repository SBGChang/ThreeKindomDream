import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {defs,wiring,emptyMeta,startRun} from '../../src/app/bootstrap.js';
import {Session} from '../../src/app/session.js';
import type {MetaState} from '../../src/contracts/core/state.js';
import {GameFrame} from '../../src/ui/GameFrame.js';
import {ScreenEnd} from '../../src/ui/ScreenEnd.js';
import '../../src/ui/styles.css';
import '../../src/ui/player.css';
import '../../src/ui/game.css';
import '../../src/ui/art.css';
import '../../src/ui/run-refresh.css';
import '../../src/ui/event-dialogue.css';

// Isolated review storage; never reads or writes sgd.meta / sgd.run.
const selected=new URLSearchParams(location.search).get('characters')?.split(',');
const all=defs.reader('notable').all().filter(d=>d.recruitFarewell);
const ids=(selected?all.filter(d=>selected.includes(String(d.notableId).split(':')[1]!)):all).map(d=>String(d.notableId));
const base=startRun(emptyMeta()).current,ending=defs.reader('ending').all().find(e=>e.endingKind==='fullDream')!;
const s=Session.restore(wiring,{...base,runId:'farewell-review',earnedUnlocks:ids,ending:{endingId:ending.ending,isFullDream:true,pointsMultiplier:ending.pointsMultiplier,titleKey:ending.titleKey,bodyKey:ending.bodyKey}});
const key='review.recruit-farewell.'+(selected?.join(',')??'all');
function Review(){
  const [meta,setMeta]=useState<MetaState>(()=>JSON.parse(sessionStorage.getItem(key)??'null')??s.preserveUnlocks(emptyMeta()));
  const [finished,setFinished]=useState(false);
  const commit=(next:MetaState)=>{sessionStorage.setItem(key,JSON.stringify(next));setMeta(next);};
  return <GameFrame meta={meta} session={s} active="run" onGo={()=>{}} saveNotice="結緣試看・不寫入玩家存檔">
    {finished?<section className="game-sheet"><h1>本世結緣完成</h1><p>{meta.recruitFarewells?.completed.length} 位角色的約定已收下</p></section>:<section className="game-sheet"><ScreenEnd s={s} meta={meta} onProgress={commit} onSettled={next=>{commit(next);setFinished(true);}}/></section>}
  </GameFrame>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Review/></StrictMode>);
