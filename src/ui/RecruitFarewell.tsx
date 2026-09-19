import { useContext, useLayoutEffect, useRef, useState } from 'react';
import type { RecruitFarewell as Farewell } from '../app/recruit-farewell.js';
import { CharacterArt } from './CharacterArt.js';
import { DialogueHeaderContext } from './dialogue-header.js';
import { GameSettingsContext } from './GameFrame.js';
import './recruit-farewell.css';

export function RecruitFarewell({scene,onNext}:{scene:Farewell;onNext:()=>void}):React.ReactElement {
  const header=useContext(DialogueHeaderContext),button=useRef<HTMLButtonElement>(null);
  const settings=useContext(GameSettingsContext);
  const [error,setError]=useState('');
  const page=scene.lines[scene.page],unlocked=!page;
  useLayoutEffect(()=>{header({title:scene.title,kind:'夢盡・再會之約',rarity:0});return()=>header(null);},[header,scene.title]);
  useLayoutEffect(()=>{button.current?.focus({preventScroll:true});},[scene.notableId,scene.page]);
  const next=()=>{try{onNext();setError('');}catch{setError('進度未能保存，請再試一次。');}};
  return <section className={`recruit-farewell ${unlocked?'is-unlocked':''}`} aria-label="夢醒結緣" data-notable={scene.notableId} data-page={scene.page}>
    <div className="farewell-sky" aria-hidden="true"/>
    <button className="farewell-settings" onClick={settings} aria-label="遊戲設定">☰</button>
    <div className="farewell-heading"><span>一世將盡 · 緣未盡</span><h1>{scene.title}</h1></div>
    <div className="farewell-portrait" key={scene.notableId}><CharacterArt name={scene.name}/></div>
    {page?<div className="farewell-conversation" key={scene.page}>
      <span className="farewell-speaker">{page.speaker??'夢境'}</span>
      <p aria-live="polite">{page.text}</p>
    </div>:<div className="farewell-unlock" role="status"><span>再會之約</span><h2>{scene.name} 解鎖</h2><p>往後入夢，有機會與其相逢</p></div>}
    <div className="farewell-controls">{error&&<span role="alert">{error}</span>}<button ref={button} className="primary" onClick={e=>{if(e.detail>1)return;next();}} onKeyDown={e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();}}>{unlocked?'收下約定 →':'繼續 →'}</button></div>
  </section>;
}
