import type { Session } from '../app/session.js';
import { useEffect, useId, useLayoutEffect, useState } from 'react';
import type { DialogueHeader } from './dialogue-header.js';
import { RealmIcon, RealmStars } from './RealmArt.js';
import { UiSymbol } from './UiSymbol.js';

function ChapterArt(): React.ReactElement {
  const clip = useId().replace(/:/g, '');
  return <svg className="footer-chapter-art" viewBox="0 0 444 180" preserveAspectRatio="none" aria-hidden="true">
    <defs><clipPath id={clip}><path d="M2 2H385L442 90 385 178H2Z"/></clipPath></defs>
    <image href="./art/ui/demo-match/footer.png" x="0" y="-248" width="2172" height="724" clipPath={`url(#${clip})`}/>
    <path d="M2 2H385L442 90 385 178H2Z" fill="none" stroke="#49280e" strokeWidth="4"/>
    <path d="M5 5H383L438 90 383 175H5Z" fill="none" stroke="#eac175" strokeWidth="2"/>
  </svg>;
}

function GoldIcon({ shop = false }: { shop?: boolean }): React.ReactElement {
  return (
    <svg viewBox="0 0 56 56" aria-hidden="true">
      <g
        fill="#e9b858"
        stroke="#42250e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        {shop ? (
          <>
            <path d="M9 24h38v25H9z" />
            <path d="M7 13h42l4 14H3z" fill="#efc975" />
            <path d="M13 13l-2 14m12-14-1 14m11-14 1 14m9-14 2 14" />
            <path d="M24 33h13v16H24z" fill="#713b1b" />
            <path d="M13 33h7v8h-7z" fill="#fff0a9" />
            <path d="M11 8h34v6H11z" />
          </>
        ) : (
          <>
            <path d="M6 31v12c0 9 28 9 28 0V31" />
            <ellipse cx="20" cy="31" rx="14" ry="6" fill="#ffe397" />
            <path d="M8 39c7 4 18 4 24 0m-23 7c6 3 17 3 22 0" fill="none" />
            <circle cx="36" cy="24" r="17" fill="#f9ce69" />
            <circle cx="36" cy="24" r="12" fill="#d7942f" />
            <path d="M32 20h8v8h-8z" fill="#684117" />
            <path d="M25 18c2-4 5-6 10-6" fill="none" stroke="#fff2ad" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Reuse the original illustrated footer as independently sized artwork slices. */
export function RunFooter({
  s,
  chapter,
  onGo,
  onSettings,
  notice,
  active = 'run',
  dialogue = null,
}: {
  active?: string;
  s: Session;
  chapter: string;
  onGo: (view: string) => void;
  onSettings: () => void;
  notice: string;
  dialogue?: DialogueHeader | null;
}): React.ReactElement {
  const [shownDialogue, setShownDialogue] = useState(dialogue);
  const [travel, setTravel] = useState<'idle' | 'out' | 'in'>('idle');
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const changingEdge = Boolean(dialogue) !== Boolean(shownDialogue);
  useLayoutEffect(() => {
    if (reducedMotion) {
      setShownDialogue(dialogue);
      setTravel('idle');
    } else if (changingEdge) {
      // Finish leaving the current edge before relocating outside the opposite edge.
      if (travel !== 'out') setTravel('out');
    } else if (travel === 'idle') {
      setShownDialogue(dialogue);
    }
  }, [dialogue, changingEdge, travel, reducedMotion]);
  const moving = travel !== 'idle' || changingEdge;
  return (
    <footer className={`game-bottom run-footer ${shownDialogue ? 'dialogue-footer' : ''}`}
      data-travel={travel} inert={moving}
      aria-label={shownDialogue ? '劇情資訊' : '行旅資訊與功能'}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.animationName === 'footer-edge-out') {
          setShownDialogue(dialogue);
          setTravel('in');
        } else if (event.animationName === 'footer-edge-in') {
          setTravel('idle');
        }
      }}>
      <div className="footer-chapter" title={chapter}>
        <ChapterArt/>
        {chapter.split(/[·・]/).map((part, i) => (
          <span key={i}>{part.trim()}</span>
        ))}
      </div>
      <div className="footer-turn" aria-label={`第 ${s.current.progress.turnInChapter} / 8 回合`}>
        <span className="footer-turn-copy" aria-hidden="true">
          <span>第</span><b>{s.current.progress.turnInChapter}</b>
          <span className="footer-turn-divider">/</span><span className="footer-turn-total">8</span><span>回合</span>
        </span>
      </div>
      {shownDialogue ? <div className="footer-event">
        <span className="footer-event-kind" role="img" aria-label={shownDialogue.kind} title={shownDialogue.kind}>
          {['主線劇情','固定行動'].includes(shownDialogue.kind) ? <RealmIcon name="book"/> : <UiSymbol name={shownDialogue.kind === '委託' ? 'commission' : 'event'}/>}
        </span>
        {shownDialogue.rarity > 0 && <RealmStars count={shownDialogue.rarity}/>}
        <h1>{shownDialogue.title}</h1>
      </div> : <div className="footer-money">
        <span>金錢</span>
        <i className="footer-coins">
          <GoldIcon />
        </i>
        <b>{s.money.toLocaleString('en-US')}</b>
      </div>}
      {!shownDialogue && <nav aria-label="遊戲功能">
        <button
          className="footer-button footer-learn"
          aria-pressed={active === 'learn'}
          onClick={() => onGo(active === 'learn' ? 'run' : 'learn')}
        >
          <span className="footer-art" aria-hidden="true" />
          <span className="footer-label">訓練</span>
        </button>
        <button
          className="footer-button footer-market"
          aria-pressed={active === 'market'}
          onClick={() => onGo(active === 'market' ? 'run' : 'market')}
        >
          <span className="footer-art" aria-hidden="true" />
          <i>
            <GoldIcon shop />
          </i>
          <span className="footer-label">商店</span>
        </button>
        <button
          className="footer-button footer-vault"
          aria-pressed={active === 'vault'}
          onClick={() => onGo(active === 'vault' ? 'run' : 'vault')}
        >
          <span className="footer-art" aria-hidden="true" />
          <span className="footer-label">器物</span>
        </button>
        <button
          className="footer-button footer-settings"
          onClick={onSettings}
          aria-label="遊戲設定"
        >
          <span className="footer-art" aria-hidden="true" />
          <span className="footer-label">選單</span>
        </button>
      </nav>}
      {notice && (
        <span className="footer-notice" role="status">
          {notice}
        </span>
      )}
    </footer>
  );
}
