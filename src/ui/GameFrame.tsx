import { RunFooter } from './RunFooter.js';
import { useDragScroll } from './useDragScroll.js';
import { SystemMenu } from './SystemMenu.js';
import { applySystemPreferences, readSystemPreferences } from './system-preferences.js';
import { observeDisplayLanguage } from './display-language.js';
import { DialogueHeaderContext, type DialogueHeader } from './dialogue-header.js';
import { CharacterArt } from './CharacterArt.js';
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { defs, t } from '../app/bootstrap.js';

export const art = (name: string): string => `./art/${name}.png`;
export function Landscape(): React.ReactElement { return <img className="landscape" src={art('backgrounds/bg-destiny')} alt="" />; }
export function OfficerPortrait({ name }: { name: string }): React.ReactElement {
  return <span className="officer-portrait"><CharacterArt name={name} portrait /></span>;
}
export function GameFrame({ meta, session, active, onGo, saveNotice, children, onReturnHome, beforeExit }: {
  readonly meta: MetaState; readonly session: Session | null; readonly active: string;
  readonly onGo: (view: string) => void; readonly saveNotice: string; readonly children: ReactNode;
  readonly onReturnHome?: () => void; readonly beforeExit?: () => void;
}): React.ReactElement {
  useDragScroll();
  const [scale, setScale] = useState(() => Math.min(innerWidth / 1280, innerHeight / 800));
  const [viewportHeight, setViewportHeight] = useState(innerHeight);
  const [settings, setSettings] = useState(false);
  const [dialogueHeader, setDialogueHeader] = useState<DialogueHeader | null>(null);
  useEffect(() => {
    const apply = () => applySystemPreferences(readSystemPreferences());
    apply();
    const stage = document.querySelector<HTMLElement>('.game-stage');
    const stopLanguage = stage ? observeDisplayLanguage(stage) : () => {};
    document.addEventListener('play', apply, true);
    document.addEventListener('loadedmetadata', apply, true);
    return () => { stopLanguage(); document.removeEventListener('play', apply, true); document.removeEventListener('loadedmetadata', apply, true); };
  }, []);
  useEffect(() => { const resize = (): void => { setScale(Math.min(innerWidth / 1280, innerHeight / 800)); setViewportHeight(innerHeight); }; addEventListener('resize', resize); return () => removeEventListener('resize', resize); }, []);
  useEffect(() => {
    const back = (): void => {
      // SystemMenu owns its nested pages. Never dismiss an unresolved story or battle.
      if (settings) return;
      const stage = document.querySelector('.game-stage');
      const modal = [...(stage?.querySelectorAll<HTMLElement>('[aria-modal="true"]') ?? [])].at(-1);
      if (modal) { modal.querySelector<HTMLButtonElement>('button[data-game-back]:not(:disabled)')?.click(); return; }
      if (stage?.querySelector('.is-performing') || dialogueHeader || active === 'battle') return;
      const control = stage?.querySelector<HTMLButtonElement>('button[data-game-back]:not(:disabled)');
      if (control && !control.closest('[inert]')) { control.click(); return; }
      if (['learn', 'market', 'vault'].includes(active)) onGo('run');
      else if (!session && active !== 'destiny') onGo('destiny');
      else setSettings(true);
    };
    const key = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault(); back();
    };
    const context = (event: MouseEvent): void => { event.preventDefault(); back(); };
    window.addEventListener('keydown', key);
    window.addEventListener('contextmenu', context);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('contextmenu', context); };
  }, [settings, active, session, onGo, dialogueHeader]);
  const locked = active === 'battle' || session !== null && (session.needsFactionChoice && !session.needsChapterCamp || session.needsSuperiors || session.isOver);
  const chapter = session ? t(defs.reader('chapter').get(String(session.current.progress.chapterId)).titleKey).split('：')[0]! : '輪迴之間';
  const runChrome = session !== null && (dialogueHeader !== null || ['run', 'camp', 'learn', 'market', 'vault'].includes(active) && !locked);
  const nav = session ? [['run','行旅'], ['learn','訓練'], ['market','商店'], ['vault','器物']] : [['destiny','天命'], ['notables','風雲錄'], ['shop','天命閣'], ['items','天工閣']];
  const scene = session?.needsCampaign || active === 'battle' ? `backgrounds/bg-battle-${Math.max(1,Math.min(4,session?.current.progress.chapter??1))}` : session ? (session.current.progress.phase === 'camp' ? 'backgrounds/bg-drill' : 'backgrounds/bg-hall') : 'backgrounds/bg-destiny';
  return <DialogueHeaderContext.Provider value={setDialogueHeader}><div className="game-viewport"><div className={`game-stage ${session ? 'in-dream' : 'out-dream'} ${dialogueHeader ? 'has-dialogue' : ''}`} style={{ transform: `scale(${scale})`, ...(dialogueHeader ? { top: (800 * scale - viewportHeight) / 2 } : {}), backgroundImage: `url('${art(scene)}')` }}>
    {!runChrome && !['entry','notables','shop','items'].includes(active) && <header className="game-top"><div className="chapter-plaque">{chapter}{session && <small>{session.current.progress.turnInChapter}/8</small>}</div><button onClick={() => setSettings(true)} aria-label="遊戲設定">☰</button></header>}
    <main className={`stage-content view-${active} ${session?.needsCampaign ? 'campaign-view' : ''}`} id="main-content">{children}</main>
    {!['entry','notables','shop','items'].includes(active) && (runChrome && session ? <RunFooter active={active} s={session} chapter={chapter} onGo={onGo} onSettings={()=>setSettings(true)} notice={saveNotice} dialogue={dialogueHeader}/> : <footer className="game-bottom"><span className={saveNotice ? 'warn' : ''} role="status">{saveNotice || '◆ 進度已自動保存'}</span><nav aria-label="遊戲功能">{nav.map(([key,label]) => <button key={key} aria-pressed={active === key} disabled={locked} onClick={() => onGo(key!)}>{label}</button>)}</nav>{active==='run'&&<button className="bottom-settings" aria-label="遊戲設定" onClick={()=>setSettings(true)}>選單</button>}<span>Esc 選單</span></footer>)}
    {settings && <SystemMenu onClose={() => setSettings(false)} onHome={onReturnHome ?? (() => onGo('destiny'))} {...(beforeExit ? { beforeExit } : {})}/>}
  </div></div></DialogueHeaderContext.Provider>;
}

