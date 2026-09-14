import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '../app/session.js';
import type { StoryNode, StoryScene } from '../contracts/core/story.js';
import { defs, t } from '../app/bootstrap.js';
import { teachingRewardLines } from './teaching-receipt.js';
import { DialogueHeaderContext } from './dialogue-header.js';
import { actorHome, DialogueActor, DialogueFace, type SceneActor } from './DialogueActors.js';
import { DialogueText } from './DialogueText.js';
import { careerPresentation } from './career-presentation.js';
import { storyPages } from './story-presentation.js';
import './event-dialogue.css';

/** The story director only presents text; all durable choices remain Session commands. */
export function StoryDialogue({ s, source, onDone }: { s: Session; source: StoryScene | StoryNode; onDone: (option?: string) => void }): React.ReactElement {
  const setHeader = useContext(DialogueHeaderContext);
  const title = t(source.titleKey);
  useLayoutEffect(() => { setHeader({ title, kind: '主線劇情', rarity: 0 }); return () => setHeader(null); }, [setHeader, title]);
  const root = useRef<HTMLDivElement>(null), completed = useRef(false);
  const [index, setIndex] = useState(0), [choosing, setChoosing] = useState(false), [answer, setAnswer] = useState<string>();
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [profile] = useState(() => careerPresentation('lead', s.current.career));
  const entries = useMemo(() => [0, 1].map(i => ({ actor:i, duration:650, path:[{x:i===0?-25:125},actorHome(i,2)] })), []);
  const pages = useMemo(() => [...storyPages(source, t),
    ...('teachings' in source ? teachingRewardLines(s.current, s.previewStoryTeachings(source), defs).map(row => ({
      speaker: null, text: `${row.label} +${row.amount ?? 0}　${row.note ?? ''}`,
    })) : []),
  ], [source, s]);
  const options = 'options' in source ? source.options : [];
  const selected = options.find(o => o.id === answer);
  const page = selected ? { speaker: '你', text: t(selected.labelKey) } : pages[index] ?? { speaker: null, text: '' };
  // Narration keeps the last interlocutor on stage, but never creates a portrait.
  const npc = [...pages.slice(0, index + 1)].reverse().find(p => p.speaker && p.speaker !== '你')?.speaker
    ?? pages.find(p => p.speaker && p.speaker !== '你')?.speaker;
  const actors: SceneActor[] = [{ name: '你', hero: true }, ...(npc ? [{ name: npc }] : [])];
  const words = [...new Set(pages.flatMap(p => p.speaker ? [p.speaker] : [])), '郭嘉', '關羽', '諸葛亮', '孔明', '阿禾'];
  const finish = () => { if (!completed.current) { completed.current = true; onDone(answer); } };
  const next = () => {
    if (completed.current || choosing) return;
    if (answer) finish();
    else if (index + 1 < pages.length) setIndex(index + 1);
    else if (options.length) setChoosing(true);
    else finish();
  };
  useEffect(() => {
    if (choosing) root.current?.querySelector<HTMLButtonElement>('.dialogue-choice')?.focus();
    else root.current?.focus({ preventScroll: true });
  }, [index, choosing, answer]);
  useEffect(() => {
    const stage = root.current?.closest('.game-stage');
    const click = (e: Event) => {
      if (!(e.target instanceof Element) || root.current?.closest('[inert]') || e.target.closest('button,input,select,a,[role="dialog"],[role="alertdialog"]')) return;
      if (e instanceof MouseEvent && e.detail > 1) return;
      next();
    };
    stage?.addEventListener('click', click);
    return () => stage?.removeEventListener('click', click);
  });
  return <div ref={root} tabIndex={0} role="region" aria-label={title + '對話演出'} data-story-id={source.id}
    className={`event-dialogue story-dialogue ${choosing ? 'decision-open' : ''} ${reduced ? 'is-reduced' : ''}`}
    onKeyDown={e => { if (['Enter',' '].includes(e.key) && !e.repeat && !(e.target as Element).closest('button,input,select')) { e.preventDefault(); next(); } }}>
    <div className="dialogue-tools"><button aria-pressed={reduced} onClick={() => setReduced(!reduced)}>簡化動作</button></div>
    <div className="dialogue-cast" aria-label="劇情人物">{actors.map((actor,i) => <DialogueActor key={actor.name} actor={actor} index={i} home={actorHome(i,2)} cue={actor.name}
      move={entries[i]!} speaking={page.speaker === actor.name} profile={profile} reduced={reduced}/>)}</div>
    {choosing && <section className="dialogue-decision" aria-label="選擇回應">
      <div className="decision-heading"><span aria-hidden="true">◆</span>選擇回應<span aria-hidden="true">◆</span></div>
      <div className="dialogue-options">{options.map((o,i) => <button className="dialogue-choice" key={o.id} onClick={() => { setAnswer(o.id); setChoosing(false); }}>
        <span className="dialogue-choice-label"><span className="dialogue-choice-number">{i+1}</span><DialogueText text={t(o.labelKey)} keywords={words}/></span>
        <span className="dialogue-choice-reward"><DialogueText text={t(o.consequenceKey)} keywords={words}/></span>
      </button>)}</div>
    </section>}
    <section className="conversation-box" aria-label="對話框">
      {page.speaker !== null && <DialogueFace actor={{name:page.speaker,hero:page.speaker === '你'}} profile={profile}/>}
      <div className="conversation-content"><div className="dialogue-speaker-name">{page.speaker ?? '系統'}</div>
        <p className="dialogue-line" aria-live="polite"><DialogueText text={page.text} keywords={words}/></p>
      </div>
    </section>
  </div>;
}

export function PendingStory({ s, bump }: {s:Session; bump:()=>void}): React.ReactElement {
  const scene = s.storyScene;
  if (scene) return <StoryDialogue key={scene.id} s={s} source={scene} onDone={() => { s.acknowledgeStory(scene.id); bump(); }}/>;
  const endings = s.storyEndingOptions();
  const source: StoryNode = { id:'ending-intent', turn:0, titleKey:'story.ending.title' as StoryNode['titleKey'], bodyKey:'story.ending.body' as StoryNode['bodyKey'],
    options:endings.map(e=>({id:String(e.ending),labelKey:e.titleKey,consequenceKey:'story.ending.hint' as StoryNode['bodyKey']})) };
  return <StoryDialogue key={source.id} s={s} source={source} onDone={id => { if(id) { s.chooseStoryEnding(id); bump(); } }}/>;
}
