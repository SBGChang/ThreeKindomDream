import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './desktop-api.js';
import { applySystemPreferences, playMenuSound, readSystemPreferences, saveSystemPreferences, type SystemPreferences } from './system-preferences.js';

type Page = 'menu' | 'settings' | 'home' | 'abandon' | 'quit' | 'exited';
type IconKind = 'settings' | 'home' | 'quit' | 'resume' | 'back' | 'sound' | 'music' | 'screen' | 'text' | 'alert';
function SystemIcon({ kind }: { kind: IconKind }): React.ReactElement {
  const paths: Record<IconKind, React.ReactNode> = {
    settings: <><path d="m13 4 1-2h4l1 2 3 2 3-1 2 4-2 2v4l2 2-2 4-3-1-3 2-1 3h-4l-1-3-3-2-3 1-2-4 2-2v-4L5 9l2-4 3 1z"/><circle cx="16" cy="13.5" r="4"/></>,
    home: <><path d="m3 15 13-11 13 11M7 13v15h18V13M13 28V18h6v10"/></>,
    quit: <><path d="M16 3v13M9 7a12 12 0 1 0 14 0"/></>,
    resume: <path d="m10 5 17 11-17 11z"/>,
    back: <path d="m14 6-10 10 10 10M5 16h23"/>,
    sound: <><path d="M4 12h6l7-7v22l-7-7H4zM22 10q6 6 0 12M26 5q11 11 0 22"/></>,
    music: <><path d="M12 23V7l15-3v16M12 11l15-3"/><ellipse cx="8" cy="24" rx="4" ry="3"/><ellipse cx="23" cy="21" rx="4" ry="3"/></>,
    screen: <><rect x="3" y="5" width="26" height="19" rx="2"/><path d="M16 24v5M10 29h12"/></>,
    text: <><path d="M4 7h24M16 3v4M9 7q1 13 18 21M23 7Q21 19 5 28"/></>,
    alert: <><path d="m16 3 14 25H2zM16 11v8"/><circle cx="16" cy="23" r=".7"/></>,
  };
  return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}
export function SystemMenu({ onClose, onHome, onAbandon, beforeExit }: {
  onClose: () => void;
  onHome: () => void;
  onAbandon?: () => void;
  beforeExit?: () => void;
}): React.ReactElement {
  const [page, setPage] = useState<Page>('menu');
  const [prefs, setPrefs] = useState(readSystemPreferences);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const siblings = [...(panel.current?.closest('.game-stage')?.children ?? [])].filter((node): node is HTMLElement => node instanceof HTMLElement && !node.classList.contains('system-overlay'));
    const previous = siblings.map(node => node.inert);
    siblings.forEach(node => { node.inert = true; });
    return () => { siblings.forEach((node, i) => { node.inert = previous[i] ?? false; }); trigger?.focus(); };
  }, []);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
  }, [page]);
  useEffect(() => {
    const sync = () => {
      if (window.gameDesktop) void window.gameDesktop.isFullscreen().then(setFullscreen).catch(() => {});
      else setFullscreen(Boolean(document.fullscreenElement));
    };
    sync(); document.addEventListener('fullscreenchange', sync); window.addEventListener('resize', sync);
    return () => { document.removeEventListener('fullscreenchange', sync); window.removeEventListener('resize', sync); };
  }, []);
  const go = (next: Page) => { setMessage(''); setPage(next); };
  const back = () => {
    if (busy) return;
    if (page === 'menu' || page === 'exited') onClose();
    else go('menu');
  };
  useEffect(() => {
    const context = (event: MouseEvent) => { event.preventDefault(); back(); };
    window.addEventListener('contextmenu', context);
    return () => window.removeEventListener('contextmenu', context);
  }, [page, busy, onClose]);
  const update = (change: Partial<SystemPreferences>) => {
    const next = { ...prefs, ...change }; setPrefs(next); applySystemPreferences(next);
    try { saveSystemPreferences(next); setMessage(''); } catch { setMessage('本次設定已套用，但無法儲存至裝置。'); }
  };
  const display = async (enabled: boolean) => {
    setBusy(true); setMessage('');
    try {
      if (window.gameDesktop) setFullscreen(await window.gameDesktop.setFullscreen(enabled));
      else if (enabled && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      else if (!enabled && document.fullscreenElement) await document.exitFullscreen();
    } catch { setMessage('未能切換螢幕模式，請再試一次。'); }
    finally { setBusy(false); }
  };
  const leave = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (page === 'abandon') { onAbandon?.(); onClose(); return; }
      beforeExit?.();
      if (page === 'home') { onHome(); onClose(); }
      else {
        document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause());
        if (window.gameDesktop) await window.gameDesktop.quit();
        else go('exited');
      }
    } catch { setMessage(page === 'abandon' ? '未能完成放棄本輪，請留在此頁並重試。' : '未能保存進度，請留在遊戲中並重試。'); }
    finally { setBusy(false); }
  };
  const title = page === 'settings' ? '系統設定' : page === 'home' ? '返回主選單？' : page === 'abandon' ? '放棄本輪？' : page === 'quit' ? '離開遊戲？' : page === 'exited' ? '已離開遊戲' : '遊戲選單';
  const isConfirm = page === 'home' || page === 'quit' || page === 'abandon';
  return <div className="game-modal system-overlay" onClickCapture={event => {
    if ((event.target as HTMLElement).closest('button')) playMenuSound(prefs.sfx);
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); back(); }
    if (event.key === 'Tab') {
      const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)') ?? [])];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <div ref={panel} className={`system-panel system-${page}${isConfirm ? ' system-art-confirm' : ''}`} role={isConfirm ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="system-title" aria-describedby={isConfirm ? 'system-confirm-copy' : undefined} aria-busy={busy}>
      {page === 'menu' ? <h1 id="system-title" className="system-accessible-title">{title}</h1> : !isConfirm && <header className="system-heading"><SystemIcon kind={page === 'settings' ? 'settings' : 'quit'}/><h1 id="system-title">{title}</h1></header>}
      {page === 'menu' && <>
        <div className="system-menu-list">
          <button className="system-row tone-blue" data-initial-focus onClick={() => go('settings')}><span className="system-row-art" aria-hidden="true"/><span>系統設定</span></button>
          <button className="system-row tone-gold" onClick={() => go('home')}><span className="system-row-art" aria-hidden="true"/><span>返回主選單</span></button>
          {onAbandon && <button className="system-row system-row-abandon" onClick={() => go('abandon')}><span className="system-row-art" aria-hidden="true"/><span>放棄本輪</span></button>}
          <button className="system-row tone-red" onClick={() => go('quit')}><span className="system-row-art" aria-hidden="true"/><span>離開遊戲</span></button>
          <button className="system-row tone-green" onClick={onClose}><span className="system-row-art" aria-hidden="true"/><span>繼續遊戲</span></button>
        </div>
      </>}
      {page === 'settings' && <>
        <div className="system-controls">
          {(['sfx', 'music'] as const).map((channel, i) => <label className="system-setting" key={channel}>
            <span className="system-setting-label"><SystemIcon kind={channel === 'sfx' ? 'sound' : 'music'}/>{channel === 'sfx' ? '音效' : '音樂'}</span>
            <span className="system-volume"><input data-initial-focus={i === 0 ? true : undefined} type="range" min="0" max="100" step="1" value={prefs[channel]} style={{ '--volume': `${prefs[channel]}%` } as CSSProperties} onChange={event => update({ [channel]: Number(event.target.value) })} onPointerUp={() => { if (channel === 'sfx') playMenuSound(prefs.sfx); }} onKeyUp={() => { if (channel === 'sfx') playMenuSound(prefs.sfx); }} aria-label={channel === 'sfx' ? '音效音量' : '音樂音量'}/><output>{prefs[channel]}<small>%</small></output></span>
          </label>)}
          <div className="system-setting"><span className="system-setting-label"><SystemIcon kind="screen"/>螢幕選擇</span><div className="system-segment" role="group" aria-label="螢幕模式"><button disabled={busy} aria-pressed={fullscreen} onClick={() => void display(true)}>全螢幕</button><button disabled={busy} aria-pressed={!fullscreen} onClick={() => void display(false)}>視窗</button></div></div>
          <label className="system-setting"><span className="system-setting-label"><SystemIcon kind="text"/>文字選擇</span><span className="system-select"><select aria-label="文字選擇" value={prefs.language} onChange={event => update({ language: event.target.value as SystemPreferences['language'] })}><option value="zh-TW" translate="no">繁體中文</option><option value="zh-CN" translate="no">简体中文</option></select></span></label>
        </div>
        <footer className="system-settings-footer"><span>調整即套用・自動記住設定</span><button className="system-button" onClick={() => go('menu')}><SystemIcon kind="back"/>返回選單</button></footer>
      </>}
      {isConfirm && <>
        <div className="system-confirm-content">
          <img className="system-confirm-art" src="./art/ui/system/return-gate-v1.png" alt="" aria-hidden="true"/>
          <div className="system-confirm-letter">
            <h1 id="system-title">{title}</h1>
            <p id="system-confirm-copy" className="system-confirm-copy">{page === 'abandon' ? '清除本輪進度並返回主選單？' : page === 'quit' ? '是否結束本次遊戲？' : '是否離開目前畫面？'}<small>{page === 'abandon' ? <>本輪無法繼續，也不會獲得結算獎勵。<br/>永久解鎖與天命進度會保留。</> : <>目前進度會保留，<br/>下次可繼續此生行旅。</>}</small></p>
          </div>
        </div>
        <div className="system-confirm-actions">
          <button className="system-painted-button" disabled={busy} data-initial-focus onClick={() => go('menu')}><span className="system-button-art" aria-hidden="true"/><span>取消</span></button>
          <button className={`system-painted-button ${page === 'home' ? 'tone-gold' : 'tone-red'}`} disabled={busy} onClick={() => void leave()}><span className="system-button-art" aria-hidden="true"/><span>{busy ? '處理中…' : page === 'abandon' ? '確認放棄' : page === 'quit' ? '確認離開' : '返回主選單'}</span></button>
        </div>
      </>}
      {page === 'exited' && <><p className="system-exited-copy">進度已保留，可以關閉此分頁。</p><button className="system-button tone-green" data-initial-focus onClick={onClose}>繼續遊戲</button></>}
      {message && <p className="system-message" role="alert">{message}</p>}
    </div>
  </div>;
}
