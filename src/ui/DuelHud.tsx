import {duelPresentation} from '../app/duel-presentation.js';
import {DuelGuide} from './DuelGuide.js';
import {DuelReveal} from './DuelReveal.js';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ACTION_NAME,DUEL_ACTIONS,DUEL_TRAITS,DUEL_RULES,actionBlock,attackPower,defensePower,duelHealth,evolutionChance,duelReadHint,type DuelForecast,type DuelFighter,type DuelAction} from '../app/duel-model.js';
import {type Contest} from '../app/confrontation-demo.js';
import {DuelArt,actionCell} from './DuelArt.js';
import {DuelPortrait} from './DuelPortrait.js';
import './duel-hud.css';
import {spotlightTarget} from './Spotlight.js';
type Resource='stamina'|'health'|'combo'|'faint';
export function DuelResource({kind}:{kind:Resource}):React.ReactElement {return kind==='health'?<span className="dx-resource dx-health-icon" aria-hidden="true"/>:<DuelArt file="status-icons-v1" cell={{stamina:0,combo:2,faint:3}[kind]} className="dx-resource"/>;}
export function DuelVitals({fighter,enemy=false,name,actorId,forecast}:{fighter:DuelFighter;enemy?:boolean;name:string;actorId:string;forecast?:DuelForecast['ally']|undefined}):React.ReactElement {
 const f=fighter,side=enemy?'敵方':'我方',health=duelHealth(f);
 return <section {...spotlightTarget(!!forecast)} className={`dx-fighter ${enemy?'dx-fighter-enemy':'dx-fighter-ally'}`} aria-label={`${side}單挑數值`}>
  <div className="dx-face-medallion" role="img" aria-label={name}><div className="dx-face-image" aria-hidden="true"><DuelPortrait id={actorId} name={name}/></div><span>{enemy?'敵':'我'}</span></div>
  <div className="dx-fighter-bars"><h2>{name}<span className="dx-combat-ratings"><span className="dx-rating-attack" aria-label={`${side}攻擊力 ${Math.round(attackPower(f))}`} title="目前攻擊力，包含連勢與特性"><DuelArt cell={actionCell('attack')} className="dx-rating-icon"/><b>{Math.round(attackPower(f))}</b></span><span className="dx-rating-defense" aria-label={`${side}防禦力 ${Math.round(defensePower(f))}`} title="目前防禦力，包含連勢"><DuelArt cell={actionCell('defend')} className="dx-rating-icon"/><b>{Math.round(defensePower(f))}</b></span></span></h2>
   {(['health','stamina'] as const).map(key=>{const value=key==='health'?health:f.stamina,max=key==='health'?f.injuryLimit:f.maxStamina,label=key==='health'?'血量':'體力',range=forecast?.[key],delta=range?.[0]??0,extent=range?Math.max(Math.abs(range[0]),Math.abs(range[1])):0,hidden=delta<0&&value>0?Math.min(value,extent)/value*100:0;return <div className={`dx-fight-meter dx-fight-${key}`} key={key}><div role="progressbar" aria-label={`${side}${label}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><i style={{width:`${value/max*100}%`,clipPath:`inset(0 ${enemy?0:hidden}% 0 ${enemy?hidden:0}%)`}}/>{range&&extent>0&&<em className={`dw-bar-forecast ${delta<0?'dw-loss':'dw-gain'}`} style={{[enemy?'right':'left']:`${(delta<0?value-extent:value)/max*100}%`,width:`${extent/max*100}%`}}/>}</div></div>;})}
   <div className="dx-fighter-status">{f.fainted?<b>昏厥</b>:f.taunted?<b>本合禁防</b>:null}{f.build.trait!=='none'&&<span title={DUEL_TRAITS[f.build.trait].description}>{DUEL_TRAITS[f.build.trait].name}</span>}</div>
  </div>
  {f.progression!==false&&<div className={`dx-fight-combo ${f.combo?'dx-combo-active':''}`} aria-label={`${side} Combo ${f.combo}`} title={`攻擊 +${f.combo*4}% · 防禦 +${f.combo*3}%`}><strong>{f.combo}</strong><span><b>C</b>ombo</span></div>}
 </section>;
}
export function DuelInterface({contest:c,paused,onAnswer,onHelpChange}:{contest:Contest;paused:boolean;onAnswer:(n:number)=>void;onHelpChange:(open:boolean)=>void}):React.ReactElement {
 const presentation=duelPresentation(c),display=c.duelBefore&&c.phase==='clash'&&(presentation.stage!=='combat'||presentation.time<.75)?c.duelBefore:c.duel!;
 return <><DuelVitals fighter={display.ally} name={c.allyName} actorId={c.allyId}/><DuelVitals fighter={display.enemy} name={c.enemyName} actorId={c.enemyId} enemy/>{['read','clash'].includes(c.phase)&&<DuelControls key={`${c.round}-${c.phase}`} contest={c} paused={paused} onAnswer={onAnswer} onHelpChange={onHelpChange}/>}<DuelReveal contest={c}/></>;
}
export function DuelControls({contest:c,paused,onAnswer,onHelpChange}:{contest:Contest;paused:boolean;onAnswer:(n:number)=>void;onHelpChange:(open:boolean)=>void}):React.ReactElement {
 const d=c.duel!,f=d.ally,reading=c.phase==='read';
 const submitted=useRef(false),helpButton=useRef<HTMLButtonElement>(null),[help,setHelp]=useState(false);
 const hint=duelReadHint(d);
 const changeHelp=(open:boolean)=>{setHelp(open);onHelpChange(open);};
 const play=(a:DuelAction)=>{if(submitted.current||paused||help||!reading||actionBlock(f,a))return;submitted.current=true;onAnswer(DUEL_ACTIONS.indexOf(a));};
 useEffect(()=>{const open=(e:KeyboardEvent)=>{if(help||paused||!reading||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.key.toLowerCase()!=='h'||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;e.preventDefault();e.stopImmediatePropagation();changeHelp(true);};window.addEventListener('keydown',open,true);return()=>window.removeEventListener('keydown',open,true);},[help,paused,reading]);
 useEffect(()=>{if(!reading||paused||help)return;const key=(e:KeyboardEvent)=>{if(e.ctrlKey||e.altKey||e.metaKey||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;if(['1','2','3'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)play(DUEL_ACTIONS[Number(e.key)-1]!);}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[paused,reading,help]);
 return <>
 {reading?<section className="dw-command" aria-label="單挑指令盤">
 <div className="dw-wheel"><DuelArt file="wheel-platter-v1" className="dw-wheel-platter"/><div className="dw-counter-lines" role="img" aria-label="攻擊剋休養，休養剋防守，防守剋攻擊">{(['attack','rest','defend'] as const).map((action,index)=><div key={action} className={`dw-counter-arrow dw-counter-arrow-${action}`} style={{transform:`rotate(${index*120}deg)`}}><DuelArt file="wheel-counter-arrow-v1" className="dw-counter-art"/></div>)}</div>
 {DUEL_ACTIONS.map(a=>{const blocked=actionBlock(f,a),points=f.points[a],full=points>=DUEL_RULES.pointsCap;return <button key={a} className={`dw-node dw-node-${a} ${full?'dw-node-full':''}`} style={{'--dw-power':points/DUEL_RULES.pointsCap,'--dw-breath':`${2.8-points/DUEL_RULES.pointsCap*1.3}s`} as CSSProperties} disabled={paused||!!blocked} aria-label={`出招：${ACTION_NAME[a]}${blocked?'，'+blocked:''}`} title={`${ACTION_NAME[a]}動作點 ${points}/${DUEL_RULES.pointsCap} · 升變 ${Math.round(evolutionChance(f,a)*100)}%`} onClick={()=>play(a)}><i className="dw-aura"/><DuelArt cell={actionCell(a)} className="dw-node-art"/>{hint===a&&<span className="dw-enemy-tell" role="img" aria-label={`${c.enemyName}可能使用${ACTION_NAME[a]}`}><DuelPortrait context="duelHint" id={c.enemyId} name={c.enemyName}/></span>}</button>;})}
 </div>
 <button ref={helpButton} type="button" className="dg-help" aria-label="查看單挑規則" aria-haspopup="dialog" title="單挑圖解（H）" disabled={paused} onClick={()=>changeHelp(true)}><span className="dg-help-art" aria-hidden="true"/></button>
 </section>:null}
 {help&&<DuelGuide duel={d} returnFocus={helpButton.current} onClose={()=>changeHelp(false)}/>}
 </>;
}
