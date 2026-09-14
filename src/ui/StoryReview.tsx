import { useMemo, useState } from 'react';
import { Session } from '../app/session.js';
import { defs, emptyMeta, startRun, t, wiring } from '../app/bootstrap.js';
import { chapterIndex } from '../contracts/core/ids.js';
import { GameFrame } from './GameFrame.js';
import { StoryDialogue } from './StoryDialogue.js';
import { CharacterArt } from './CharacterArt.js';
import './story-review.css';

/** Script audition only. This route neither restores nor persists a player run. */
export function StoryReview(): React.ReactElement {
  const chapters = defs.reader('storyChapter').all();
  const [chapterAt, setChapterAt] = useState(0), [sceneAt, setSceneAt] = useState(0), [take, setTake] = useState(0), [finished, setFinished] = useState(false);
  const [base] = useState(() => startRun(emptyMeta()));
  const chapter = chapters[chapterAt]!, definition = defs.reader('chapter').get(String(chapter.chapterId));
  const sources = [chapter.opening,...chapter.nodes,...chapter.nodes.flatMap(n=>n.options.flatMap(o=>o.response?[o.response]:[])),...chapter.milestones.map(m=>m.scene),...chapter.aftermaths.map(a=>a.scene)];
  const source = sources[sceneAt] ?? sources[0]!;
  const turn = chapter.nodes.find(n => n.id === source.id)?.turn ?? 1;
  const s = useMemo(() => Session.restore(wiring, {...base.current, progress:{...base.current.progress, chapterId:chapter.chapterId,phase:definition.factionId?'faction':'camp',turnInChapter:turn,chapter:chapterIndex(definition.order + (definition.factionId ? 1:0))}}), [base,chapter,definition,turn]);
  if(new URLSearchParams(location.search).get('cast') === '1') return <GameFrame session={null} meta={s.current.metaSnapshot} active="entry" onGo={()=>{}} saveNotice=""><section className="story-cast-review" aria-label="故事人物立繪驗收">{['劉備','關羽','張飛','趙雲','諸葛亮','蔣琬','龐統','黃忠','魯肅'].map(name=><figure key={name}><CharacterArt name={name}/><CharacterArt name={name} portrait/><figcaption>{name}</figcaption></figure>)}</section></GameFrame>;
  return <GameFrame session={s} meta={s.current.metaSnapshot} active="run" onGo={()=>{}} saveNotice="">
    <aside className="story-review-nav" aria-label="劇本試播控制">
      <span>劇本試播 · 不寫入存檔</span>
      <select aria-label="選擇劇本章節" value={chapterAt} onChange={e=>{setChapterAt(Number(e.target.value));setSceneAt(0);setFinished(false);}}>{chapters.map((c,i)=><option key={String(c.id)} value={i}>{t(c.opening.titleKey)}</option>)}</select>
      <select aria-label="選擇劇情片段" value={sceneAt} onChange={e=>{setSceneAt(Number(e.target.value));setFinished(false);}}>{sources.map((c,i)=><option key={c.id} value={i}>{'options' in c ? '抉擇 · ' : ''}{t(c.titleKey)} · {i+1}</option>)}</select>
      <button onClick={()=>{setTake(take+1);setFinished(false);}}>重播</button>
      <a href="?art=story-play">從開場試玩</a>
      {finished && <span role="status">本段完 · 可切換片段或重播</span>}
    </aside>
    <StoryDialogue key={source.id+'/'+take} s={s} source={source} onDone={()=>setFinished(true)}/>
  </GameFrame>;
}
