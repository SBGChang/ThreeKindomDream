import { ArtControl } from './ArtControl.js';
import { useEffect, useRef } from 'react';
export function Journal({entries,onClose}:{entries:readonly string[];onClose:()=>void}):React.ReactElement{
 const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{close.current?.focus();},[]);
 return <div className="game-modal journal-modal" role="dialog" aria-modal="true" aria-label="行旅手記" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){const targets=e.currentTarget.querySelectorAll<HTMLElement>('button,[tabindex="0"]');const first=targets[0],last=targets[targets.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
  <section className="journal-book"><header><span className="journal-art-icon" aria-hidden="true"/><h1>行旅手記</h1><ArtControl ref={close} kind="close" label="關閉行旅手記" className="panel-close" onClick={onClose}/></header>
  <div className="journal-pages" tabIndex={0} aria-label="手記紀錄">{entries.length?<ol>{entries.map((line,i)=><li key={i}>{line}</li>)}</ol>:<p className="journal-blank">此生尚未留下紀錄。</p>}</div></section>
 </div>;
}
