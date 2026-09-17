import { useContext, useEffect, useRef, useState } from 'react';
import type { MetaState } from '../contracts/core/state.js';
import { GameSettingsContext } from './GameFrame.js';
import './main-menu.css';

export type MetaView = 'destiny' | 'entry' | 'shop' | 'notables' | 'items';
export function ScreenDestiny({ meta, onGo, onReset, onResume }: {
  readonly meta: MetaState; readonly onGo: (v: MetaView) => void;
  readonly onReset: () => void; readonly onResume?: () => void;
}): React.ReactElement {
  const [reset, setReset] = useState(false);
  const openSettings = useContext(GameSettingsContext);
  const saveButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeReset = (): void => { setReset(false); requestAnimationFrame(() => saveButton.current?.focus()); };
  useEffect(() => {
    if (!reset) return;
    const trap = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0]!, last = buttons[buttons.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [reset]);
  return <section className="dream-menu" aria-label="三國夢主選單">
    <h1 className="dream-menu-accessible">三國夢</h1>
    <div className="dream-menu-controls" inert={reset}>
      <nav aria-label="主選單">
        <button className="dream-menu-hit dream-menu-enter" onClick={onResume ?? (() => onGo('entry'))}>
          <strong>{onResume ? '繼續遊戲' : '入夢'}</strong>
        </button>
        <button className="dream-menu-hit dream-menu-heroes" onClick={() => onGo('notables')}><strong>風雲錄</strong></button>
        <button className="dream-menu-hit dream-menu-fate" onClick={() => onGo('shop')}><strong>天命閣</strong></button>
        <button className="dream-menu-hit dream-menu-treasury" onClick={() => onGo('items')}><strong>天工閣</strong></button>
      </nav>
      <div className="dream-menu-progress" role="group" aria-label={`輪迴紀錄：已歷 ${meta.runIndex} 世，已見 ${meta.collection.reachedEndings.length} 種結局`}>
        <span className="dream-record-title" aria-hidden="true">記夢</span>
        <div className="dream-record"><span>輪迴歷世</span><strong>{meta.runIndex}<small>世</small></strong></div>
        <div className="dream-record"><span>已識結局</span><strong>{meta.collection.reachedEndings.length}<small>種</small></strong></div>
      </div>
      <button ref={saveButton} className="dream-menu-hit dream-menu-save" disabled={!!onResume} title={onResume ? '本世結束後可管理輪迴存檔' : '管理輪迴存檔'} onClick={() => setReset(true)}>存檔管理</button>
      <button className="dream-menu-hit dream-menu-settings" onClick={openSettings}>遊戲設定</button>
    </div>
    {reset && <div className="game-modal dream-menu-modal" role="dialog" aria-modal="true" aria-labelledby="dream-reset-title" ref={dialog}>
      <div className="dream-menu-paper"><h2 id="dream-reset-title">清除輪迴記憶？</h2><p>所有天命、名士記憶與結局紀錄都會清除。</p>
        <button autoFocus data-game-back onClick={closeReset}>保留存檔</button>
        <button className="dream-menu-danger" onClick={() => { onReset(); closeReset(); }}>確定清除</button>
      </div>
    </div>}
  </section>;
}
