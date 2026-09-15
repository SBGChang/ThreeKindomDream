import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DialogueHeaderContext } from './dialogue-header.js';
import { DialogueText } from './DialogueText.js';
import type { TrainingReceipt } from './training-receipt.js';
import './event-dialogue.css';

/** Acknowledged system narration, then actual deltas; no automatic advance. */
export function TrainingDialogue({receipt,onFinish}:{receipt:TrainingReceipt;onFinish:()=>void}):React.ReactElement {
  const [page,setPage]=useState(-1), root=useRef<HTMLDivElement>(null), finished=useRef(false);
  const setHeader=useContext(DialogueHeaderContext);
  useLayoutEffect(()=>{setHeader({title:receipt.title,kind:'固定行動',rarity:0});return()=>setHeader(null);},[setHeader,receipt.title]);
  useEffect(()=>{root.current?.focus({preventScroll:true});},[page]);
  const next=()=>{
    if(finished.current) return;
    if(page<0) setPage(0);
    else if((page+1)*4<receipt.lines.length) setPage(page+1);
    else {finished.current=true;onFinish();}
  };
  useEffect(()=>{
    const stage=root.current?.closest('.game-stage');
    const advance=(event:Event)=>{
      if(root.current?.closest('[inert]') || !(event.target instanceof Element))return;
      if(event.target.closest('button,input,select,a,[role="dialog"],[role="alertdialog"]'))return;
      if(event instanceof MouseEvent && (event.button!==0 || event.detail>1))return;
      next();
    };
    stage?.addEventListener('click',advance);
    return()=>stage?.removeEventListener('click',advance);
  });
  return <div ref={root} className="event-dialogue fixed-result-dialogue" role="region" aria-label="固定行動結算對話" tabIndex={0}
    onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat&&!(e.target as Element).closest('button,input,select')){e.preventDefault();next();}}}>
    <section className={'conversation-box phase-'+(page<0?'outro':'rewards')} aria-label="系統對話框">
      <div className="conversation-content"><div className="dialogue-speaker-name">{page<0?'系統':'獲得與變化'}</div>
        {page<0?<p className="dialogue-line" aria-live="polite"><DialogueText text={receipt.text}/></p>
          :<div className="dialogue-reward-lines" role="log" aria-live="polite" aria-label="固定行動實際變化">{receipt.lines.slice(page*4,page*4+4).map((line,i)=><p key={page+'/'+i}><span className="dialogue-keyword">{line.label}</span>{line.note&&<span>{line.note}</span>}{line.promoted&&<b className="dialogue-gain">{line.promoted}</b>}{line.amount!==undefined&&<b className={line.amount<0?'dialogue-loss':'dialogue-gain'}>{line.amount>0?'+':'−'}{Math.abs(line.amount)}</b>}</p>)}{!receipt.lines.length&&<p>本次沒有數值變化。</p>}</div>}
      </div>
      {page>=0&&receipt.lines.length>4&&<span className="dialogue-reward-page">{page+1} / {Math.ceil(receipt.lines.length/4)}</span>}
    </section>
  </div>;
}
