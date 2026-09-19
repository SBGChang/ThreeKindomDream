import {useEffect,useId,useRef,useState} from 'react';
import {ACTION_NAME,DUEL_ACTIONS,actionCost,restAmount,counters,type DuelAction,type DuelState} from '../app/duel-model.js';
import {GuideBackButton} from './GuideBackButton.js';
import {DuelArt,actionCell} from './DuelArt.js';
import {duelMatchup} from './duel-matchup.js';
import './rally-guide.css';
import './duel-guide.css';

type Effect={icon:'health'|'stamina'|'lock'|'attack';text:string};
const effects:Record<DuelAction,Record<DuelAction,Effect[]>>={
 attack:{attack:[{icon:'attack',text:'攻勢相抵'},{icon:'health',text:'弱方受差額'}],defend:[{icon:'health',text:'傷害 ×0.2'},{icon:'stamina',text:'我方耗體 ×2'}],rest:[{icon:'health',text:'完整傷害'},{icon:'stamina',text:'對手回體 ×0.5'}]},
 defend:{attack:[{icon:'health',text:'承傷 ×0.2'},{icon:'stamina',text:'對手耗體 ×2'}],defend:[{icon:'lock',text:'雙方下合禁防'},{icon:'stamina',text:'各耗防守體力'}],rest:[{icon:'lock',text:'我方下合禁防'},{icon:'stamina',text:'對手回體'}]},
 rest:{attack:[{icon:'health',text:'完整承傷'},{icon:'stamina',text:'我方回體 ×0.5'}],defend:[{icon:'stamina',text:'我方回體'},{icon:'lock',text:'對手下合禁防'}],rest:[{icon:'stamina',text:'雙方回體'},{icon:'health',text:'不回血'}]},
};
const evolutionEffect:Record<DuelAction,string>={attack:'傷害再 +20%',defend:'全傷反彈・免耗體',rest:'回體 ×1.5'};
function Action({action,locked=false}:{action:DuelAction;locked?:boolean}){return <span className={`dg-action ${locked?'dg-locked':''}`} role="img" aria-label={locked?'禁止防守':ACTION_NAME[action]}><DuelArt cell={actionCell(action)}/></span>;}
function EffectIcon({kind}:{kind:Effect['icon']}){return kind==='lock'?<Action action="defend" locked/>:kind==='attack'?<Action action="attack"/>:kind==='health'?<span className="dg-health" aria-hidden="true"/>:<DuelArt file="status-icons-v1" cell={0}/>;}

export function DuelGuide({duel:d,onClose,returnFocus}:{duel:DuelState;onClose:()=>void;returnFocus:HTMLElement|null}){
 const [tab,setTab]=useState<DuelAction>('attack'),[back,setBack]=useState(0),panel=useRef<HTMLElement>(null),id=useId();
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const before=returnFocus??document.activeElement as HTMLElement|null;
  panel.current?.querySelector<HTMLButtonElement>('[role=tab]')?.focus();
  const context=(e:MouseEvent)=>{e.preventDefault();e.stopImmediatePropagation();close.current();};
  window.addEventListener('contextmenu',context,true);
  return()=>{window.removeEventListener('contextmenu',context,true);requestAnimationFrame(()=>{if(before?.isConnected)before.focus();});};
 },[]);
 const end=Math.max(4,d.history.length-back*4),start=Math.max(0,end-4),rows=d.history.slice(start,end);
 return <div className="ct-overlay rg-overlay"><section ref={panel} className="rg-book dg-book" role="dialog" aria-modal="true" aria-label="單挑規則" onKeyDown={e=>{
  e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();onClose();}
  if(e.key==='Tab'){
   const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button,[tabindex]')??[]).filter(el=>el.tabIndex>=0&&!el.matches(':disabled'));
   const i=items.indexOf(document.activeElement as HTMLElement);
   if(e.shiftKey&&i<=0){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&i===items.length-1){e.preventDefault();items[0]?.focus();}
  }
 }}>
  <header><h2>單挑圖解</h2><div className="rg-tabs dg-tabs" role="tablist" aria-label="我方招式">{DUEL_ACTIONS.map((a,i)=><button key={a} id={`${id}-${a}`} role="tab" aria-label={ACTION_NAME[a]} aria-selected={tab===a} aria-controls={`${id}-page`} tabIndex={tab===a?0:-1} onClick={()=>setTab(a)} onKeyDown={e=>{
   if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setTab(DUEL_ACTIONS[next]!);panel.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();}
  }}><Action action={a}/>{ACTION_NAME[a]}</button>)}</div><GuideBackButton label="關閉單挑圖解" onClick={onClose}/></header>
  <div className="dg-page" id={`${id}-page`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
   <div className="dg-intro"><span><EffectIcon kind="stamina"/><b>{tab==='rest'?`回體 +${restAmount(d.ally)}`:`耗體 ${actionCost(d.ally,tab)}`}</b></span></div>
   <div className="dg-matchups">{DUEL_ACTIONS.map(enemy=>{const copy=duelMatchup(tab,enemy);return <article className={`dg-matchup dg-${copy.relation}`} key={enemy} aria-label={`${ACTION_NAME[tab]}對上${ACTION_NAME[enemy]}：${copy.result.effect}`}>
    <h3>對手 <b>{ACTION_NAME[enemy]}</b></h3>
    <div className="dg-versus"><div><small>我方</small><Action action={tab}/></div><span className="dg-relation"><DuelArt file="matchup-icons-v1" cell={{win:0,draw:1,lose:2}[copy.relation]}/><b>{({win:'剋制',draw:'相同',lose:'被剋'} as const)[copy.relation]}</b></span><div><small>對手</small><Action action={enemy}/></div></div>
    <div className="dg-effects">{effects[tab][enemy].map(effect=><div key={effect.text}><EffectIcon kind={effect.icon}/><strong>{effect.text}</strong></div>)}</div>
    {copy.evolution?<div className="dg-evolution"><DuelArt file={`evolution-${tab}-v1`}/><div><small>我方機率升變</small><b>{copy.evolution.title}</b><strong>{evolutionEffect[tab]}</strong></div></div>:null}
   </article>;})}</div>
  </div>
  <div className="dg-bottom"><div className="dg-tips"><span><DuelArt file="status-icons-v1" cell={3}/><b>體力 ＜5</b> → 下合停動、回體 24</span></div>{rows.length>0&&<section className="dg-history" aria-label="猜拳歷史"><header><b>最近出招</b><span><button disabled={d.history.length<=(back+1)*4} aria-label="較早出招紀錄" onClick={()=>setBack(back+1)}>‹</button><small>{start+1}–{Math.min(end,d.history.length)}</small><button disabled={!back} aria-label="較新出招紀錄" onClick={()=>setBack(back-1)}>›</button></span></header><div className="dg-history-grid"><div><small>敵</small><small>我</small></div>{rows.map((r,i)=><div className="dx-history-turn" key={start+i} aria-label={`第 ${start+i+1} 合，敵方${r.enemy?ACTION_NAME[r.enemy]:'昏厥'}，我方${r.ally?ACTION_NAME[r.ally]:'昏厥'}`}>{(['enemy','ally'] as const).map(side=><span key={side} className={counters(r[side],r[side==='ally'?'enemy':'ally'])?'dg-history-win':''}>{r[side]?<Action action={r[side]}/>:<DuelArt file="status-icons-v1" cell={3}/>}</span>)}</div>)}</div></section>}</div>
 </section></div>;
}
