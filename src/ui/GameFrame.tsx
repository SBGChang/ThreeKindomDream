import { useDragScroll } from './useDragScroll.js';
import { ArtControl } from './ArtControl.js';
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
export function GameFrame({ meta, session, active, onGo, saveNotice, children }: {
  readonly meta: MetaState; readonly session: Session | null; readonly active: string;
  readonly onGo: (view: string) => void; readonly saveNotice: string; readonly children: ReactNode;
}): React.ReactElement {
  useDragScroll();
  const [scale, setScale] = useState(() => Math.min(innerWidth / 1280, innerHeight / 800));
  const [settings, setSettings] = useState(false);
  useEffect(() => { const resize = (): void => setScale(Math.min(innerWidth / 1280, innerHeight / 800)); addEventListener('resize', resize); return () => removeEventListener('resize', resize); }, []);
  useEffect(() => { const key = (e: KeyboardEvent): void => { if (document.querySelector('.is-performing')) return; if (e.key === 'Escape') { if (settings) setSettings(false); else if (document.querySelector<HTMLButtonElement>('.run-screen .panel-close')) document.querySelector<HTMLButtonElement>('.run-screen .panel-close')?.click(); else if (active !== 'run' && session) onGo('run'); else setSettings(true); } }; addEventListener('keydown', key); return () => removeEventListener('keydown', key); }, [settings, active, session, onGo]);
  const locked = active === 'battle' || session !== null && (session.needsFactionChoice || session.needsSuperiors || session.isOver);
  const chapter = session ? t(defs.reader('chapter').get(String(session.current.progress.chapterId)).titleKey) : '輪迴之間';
  const nav = session ? [['run','行旅'], ['learn','修習'], ['vault','器物']] : [['destiny','天命'], ['notables','風雲錄'], ['shop','天命閣'], ['items','天工閣']];
  const scene = session?.needsCampaign || active === 'battle' ? `backgrounds/bg-battle-${Math.max(1,Math.min(4,session?.current.progress.chapter??1))}` : session ? (active === 'learn' ? 'backgrounds/bg-study' : active === 'vault' ? 'backgrounds/bg-field' : session.current.progress.phase === 'camp' ? 'backgrounds/bg-drill' : 'backgrounds/bg-hall') : 'backgrounds/bg-destiny';
  return <div className="game-viewport"><div className={`game-stage ${session ? 'in-dream' : 'out-dream'}`} style={{ transform: `scale(${scale})`, backgroundImage: `url('${art(scene)}')` }}>
    {!['entry','notables','shop','items'].includes(active) && <header className="game-top"><div className="chapter-plaque">{chapter}{session && <small>{session.current.progress.turnInChapter}/8</small>}</div><button onClick={() => setSettings(true)} aria-label="遊戲設定">☰</button></header>}
    <main className={`stage-content view-${active} ${session?.needsCampaign ? 'campaign-view' : ''}`} id="main-content">{children}</main>
    {saveNotice && <span className="campaign-save-notice" role="status">{saveNotice}</span>}
    {!['entry','notables','shop','items'].includes(active) && <footer className="game-bottom">{active==='run'&&session&&<div className="run-bottom-info"><b title={chapter}>{chapter.split(/[·・]/).map((part,i)=><span key={i}>{part.trim()}</span>)}</b><span>第 <b>{session.current.progress.turnInChapter}</b> / 8 回合</span><strong><span>學習點</span><b>{session.learningExp}</b></strong></div>}<span className={saveNotice ? 'warn' : ''} role="status">{saveNotice || '◆ 進度已自動保存'}</span><nav aria-label="遊戲功能">{nav.map(([key,label]) => <button key={key} aria-pressed={active === key} disabled={locked} onClick={() => onGo(key!)}>{label}</button>)}</nav>{active==='run'&&<button className="bottom-settings" aria-label="遊戲設定" onClick={()=>setSettings(true)}>選單</button>}<span>Esc 選單</span></footer>}
    {settings && <div className="game-modal" role="dialog" aria-modal="true" aria-label="遊戲設定"><div className="settings-paper"><ArtControl kind="close" autoFocus label="關閉設定" className="panel-close" onClick={()=>setSettings(false)}/><h1>暫歇片刻</h1><p>此生進度會隨每次行動自動保存。</p><button onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => {}); }}>切換全螢幕</button><p className="sub">視窗會等比例縮放，保持完整橫向畫面。</p></div></div>}
  </div></div>;
}
