import {useEffect,useMemo,useRef,useState} from 'react';
import {DEBATE_CARDS,DEBATE_TRAITS,DEBATE_RECOVER,debateBlock,debateIntent,type Debater,type DebateCard} from '../app/card-debate-model.js';
import type {Contest} from '../contracts/core/confrontation.js';
import {forecastCardDebate,beforeDebateTurn,settledDebateForecast,debateForecastSegments,type DebateResourceForecast} from '../app/card-debate-forecast.js';
import {DuelPortrait} from './DuelPortrait.js';
import {DebateIcon,ResourceIcon,RESOURCE_NAMES,CARD_PURPOSE,cardEffects} from './DebateVisuals.js';
import './duel-hud.css';
import './card-debate.css';

function Stock({kind,value,range,side}:{kind:'evidence'|'momentum';value:number;range:readonly [number,number]|undefined;side:string}):React.ReactElement {
 const capacity=kind==='evidence'?5:4,segments=debateForecastSegments(value,capacity,range);
 return <span className="db-stock-group" role="img" aria-label={`${side}${RESOURCE_NAMES[kind]} ${value}/${capacity}${range?`，預估 ${range[0]} 至 ${range[1]}`:''}`} title={`${RESOURCE_NAMES[kind]} ${value}/${capacity}`}>
  {Array.from({length:capacity},(_,i)=>{const loss=i>=segments.lossStart&&i<segments.lossStart+segments.loss,gain=i>=segments.gainStart&&i<segments.gainStart+segments.gain;
   return <span key={i} className="db-stock-unit" aria-hidden="true"><span className="db-stock-empty"><ResourceIcon kind={kind}/></span>{(i<segments.steady||loss||gain)&&<span className={`db-stock-fill ${loss?'db-stock-loss':gain?'db-stock-gain':''}`}><ResourceIcon kind={kind}/></span>}</span>;
  })}
 </span>;
}
function Vitals({f,name,actorId,enemy=false,forecast,paused}:{f:Debater;name:string;actorId:string;enemy?:boolean;forecast:DebateResourceForecast|undefined;paused:boolean}):React.ReactElement {
 const side=enemy?'敵方':'我方';
 return <section className={`dx-fighter db-fighter ${enemy?'dx-fighter-enemy':'dx-fighter-ally'} ${forecast?'dw-hud-lit':''}`} data-paused={paused} aria-label={`${side}舌戰狀態`}>
  <div className="dx-face-medallion" role="img" aria-label={name}><div className="dx-face-image" aria-hidden="true"><DuelPortrait id={actorId} name={name}/></div><span>{enemy?'敵':'我'}</span></div>
  <div className="dx-fighter-bars"><h2>{name}<small title={DEBATE_TRAITS[f.build.trait].description}>{DEBATE_TRAITS[f.build.trait].name}</small></h2>
   {(['heart','mind'] as const).map(k=>{const max=k==='heart'?f.maxHeart:f.maxMind,range=forecast?.[k],segments=debateForecastSegments(f[k],max,range),edge=enemy?'right':'left';return <div key={k} className={`dx-fight-meter ${k==='mind'?'dx-fight-stamina':''}`} title={`${RESOURCE_NAMES[k]} ${f[k]}/${max}`}>
    <div role="progressbar" aria-label={`${side}${RESOURCE_NAMES[k]}`} aria-valuenow={f[k]} aria-valuemin={0} aria-valuemax={max} aria-valuetext={range?`目前 ${f[k]}，預估 ${range[0]} 至 ${range[1]}`:undefined}>
     <i style={{width:`${f[k]/max*100}%`,clipPath:`inset(0 ${enemy?0:f[k]?segments.loss/f[k]*100:0}% 0 ${enemy&&f[k]?segments.loss/f[k]*100:0}%)`}}/>
     {segments.loss>0&&<em className="dw-bar-forecast dw-loss" aria-hidden="true" style={{[edge]:`${segments.lossStart/max*100}%`,width:`${segments.loss/max*100}%`}}/>}
     {segments.gain>0&&<em className="dw-bar-forecast dw-gain" aria-hidden="true" style={{[edge]:`${segments.gainStart/max*100}%`,width:`${segments.gain/max*100}%`}}/>}
    </div><span className="db-meter-value"><ResourceIcon kind={k}/>{f[k]}</span>
   </div>;})}
   <div className="db-stock"><Stock kind="evidence" value={f.evidence} range={forecast?.evidence} side={side}/><Stock kind="momentum" value={f.momentum} range={forecast?.momentum} side={side}/></div>
  </div>
 </section>;
}
const intentions:Record<string,DebateCard[]>={'攻勢':['proof','pressure','question'],'周旋':['rebut','borrow'],'蓄勢':['claim','focus']};
export function CardDebateHud({c,paused,previewIndex,onPreview,onPlay,onRules}:{c:Contest;paused:boolean;previewIndex:number|null;onPreview:(i:number|null)=>void;onPlay:(i:number)=>void;onRules:()=>void}):React.ReactElement {
 const [enemyPreview,setEnemyPreview]=useState<DebateCard|null>(null),lastPreview=useRef<number|null>(null);
 useEffect(()=>{setEnemyPreview(null);lastPreview.current=null;},[c.round,c.phase,paused]);
 const preview=(index:number)=>{lastPreview.current=index;setEnemyPreview(null);onPreview(index);};
 const clearPreview=()=>onPreview(null);
 const previewReply=(card:DebateCard)=>{setEnemyPreview(card);if(lastPreview.current!==null)onPreview(lastPreview.current);};
 const clearReply=()=>{setEnemyPreview(null);clearPreview();};
 const d=c.cards!,active=c.phase==='read'||c.phase==='clash',reading=c.phase==='read',f=d.ally,last=d.last,hand=!reading&&last?last.allyHand:f.hand;
 const replies=intentions[debateIntent(d)]??[];
 const forecast=useMemo(()=>reading&&!paused&&previewIndex!==null?forecastCardDebate(d,previewIndex,enemyPreview?[enemyPreview]:replies):null,[d,c.round,reading,paused,previewIndex,enemyPreview]);
 const revealing=c.phase==='clash'&&last&&c.phaseTime<1.2;
 const allyDisplay=revealing?beforeDebateTurn(f,last.allyChange):f,enemyDisplay=revealing?beforeDebateTurn(d.enemy,last.enemyChange):d.enemy;
 const allyForecast=revealing?settledDebateForecast(f):forecast?.ally,enemyForecast=revealing?settledDebateForecast(d.enemy):forecast?.enemy;
 return <>
  {reading&&<div className="db-decision-shade" aria-hidden="true"/>}
  <Vitals f={allyDisplay} name={c.allyName} actorId={c.allyId} forecast={allyForecast} paused={paused}/><Vitals f={enemyDisplay} name={c.enemyName} actorId={c.enemyId} forecast={enemyForecast} paused={paused} enemy/>
  {active&&<>
   <div className="db-round"><b>{c.round}</b><small>合</small><button onClick={onRules} aria-label="查看舌戰規則" title="玩法">?</button></div>
   {reading&&<div className="db-intent" aria-label="敵方可能出牌">{replies.map(card=><button key={card} className={enemyPreview===card?'db-reply-selected':''} disabled={paused||!!debateBlock(d.enemy,card)} title={`推演${DEBATE_CARDS[card].name}`} aria-label={`推演敵方${DEBATE_CARDS[card].name}`} aria-pressed={enemyPreview===card} onMouseEnter={()=>previewReply(card)} onMouseLeave={clearReply} onFocus={()=>previewReply(card)} onBlur={clearReply}><DebateIcon card={card}/></button>)}</div>}
   {reading&&<>
    <section className="db-hand" aria-label="舌戰手牌">{hand.map((card,i)=>{const locked=debateBlock(f,card);return <button key={i} className={`db-card ${previewIndex===i?'db-previewed':''}`} disabled={paused} data-debate-action data-card={card} aria-disabled={!!locked} onMouseEnter={()=>preview(i)} onMouseLeave={e=>{if(e.currentTarget!==document.activeElement)clearPreview();}} onFocus={()=>preview(i)} onBlur={e=>{if(!e.currentTarget.matches(':hover'))clearPreview();}} onClick={()=>{if(!locked)onPlay(i);}} aria-label={`第 ${i+1} 張 ${DEBATE_CARDS[card].name}${locked?'，'+locked:''}`} data-locked={!!locked} title={`${DEBATE_CARDS[card].name} · ${CARD_PURPOSE[card]}\n${cardEffects(card,f,d.enemy).note}${locked?'\n'+locked:''}`}>
     <img className="db-card-art" src="./art/debate/tactic-card-v2.png" alt=""/><span className="db-card-meta"><kbd>{i+1}</kbd><span className="db-cost"><ResourceIcon kind="mind"/><b>{DEBATE_CARDS[card].cost}</b></span></span><span className="db-card-illustration"><DebateIcon card={card}/></span><strong>{DEBATE_CARDS[card].name}</strong>{locked&&<span className="db-lock" aria-hidden="true">×</span>}
    </button>;})}</section>
    <div className="db-actions"><button className={`db-recover ${previewIndex===DEBATE_RECOVER?'db-previewed':''}`} disabled={paused} data-debate-action onMouseEnter={()=>preview(DEBATE_RECOVER)} onMouseLeave={e=>{if(e.currentTarget!==document.activeElement)clearPreview();}} onFocus={()=>preview(DEBATE_RECOVER)} onBlur={e=>{if(!e.currentTarget.matches(':hover'))clearPreview();}} onClick={()=>onPlay(DEBATE_RECOVER)} aria-label="整思換牌" title="滑過預估 · 點擊整思換牌 · R"><DebateIcon card="focus"/><kbd>R</kbd></button></div>
   </>}
  </>}
 </>;
}
