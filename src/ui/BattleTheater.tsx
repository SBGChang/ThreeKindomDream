import { useEffect, useState, type CSSProperties } from 'react';
import type { BattleLogEntry } from '../contracts/core/state.js';
import { t } from '../app/bootstrap.js';
import { replayFrame, soldierScale, soldierShares } from '../app/battle-presentation.js';
import { art, OfficerPortrait } from './GameFrame.js';
import './battlefield.css';
import './soldier-assets.css';
import { SoldierSprite as Soldier } from './SoldierSprite.js';
import { CharacterArt } from './CharacterArt.js';

export interface ReplayData {
  readonly background?: string;
  readonly log: readonly BattleLogEntry[];
  readonly troopsMax: number;
  readonly enemyMax: number;
  readonly startTroops: number;
  readonly startSupply: number;
  readonly commanders: readonly { name: string; skill: string }[];
  readonly stageLabel: string;
  readonly enemyLabel: string;
  readonly cleared: boolean;
  readonly defeated: boolean;
}

function Army({ side, now, before, scale, charging, hit, healing, impact }: {
  side:'host'|'enemy'; now:number; before:number; scale:number; charging:boolean; hit:boolean; healing:boolean; impact:boolean;
}):React.ReactElement {
  const shares=soldierShares(now,scale), old=soldierShares(before,scale);
  const count=Math.max(shares.length, impact?old.length:0);
  return <g className={`army army-${side} ${charging?'charging':''} ${hit?'taking-hit':''} ${healing?'recovering':''}`}>
    {Array.from({length:count},(_,i)=> { const row=i%8, file=Math.floor(i/8); const col=file===0?0:Math.ceil(file/2)*(file%2===1?-1:1); const x=(side==='host'?315:925)+col*29+row*(side==='host'?3:-3); const y=265+row*24; const share=shares[i]??0; const dead=share===0;
      return <g key={i} transform={`translate(${x} ${y})`}><g className={dead?'fallen':(hit&&i%3===0?'recoil':'')} style={{'--stagger':`${i%5*25}ms`} as CSSProperties}><g transform={side==='enemy'?'translate(40 0) scale(-1 1)':undefined} opacity={share||1}><Soldier side={side} clip={dead?'death':hit?'hit':charging?'thrust':'idle'} /></g></g></g>;
    })}
  </g>;
}
function Spell({kind, side, impact}: {kind:string;side:'host'|'enemy';impact:boolean}):React.ReactElement {
 const target=side==='host'?900:345;
 return <g className={`spell spell-${kind}`} aria-hidden="true">
  {!impact && (kind==='fire'||kind==='arcane'||kind==='water') && <g className={`projectile from-${side}`}><ellipse cx="0" cy="0" rx="40" ry="15" fill={kind==='fire'?'#ff9e24':'#7ddcfa'}/><ellipse rx="19" ry="9" fill="#fff2b0"/></g>}
  {impact && kind==='fire' && Array.from({length:12},(_,i)=><g key={i} transform={`translate(${target-150+(i%6)*53} ${325+Math.floor(i/6)*75})`}><path className="flame" style={{'--stagger':`${i%4*70}ms`} as CSSProperties} d="M0 35Q-35 0-9-43Q-8-13 6-6Q30-26 18-50Q55 12 22 36Z" fill="#ed5c1a"/><path className="flame" d="M6 34Q-11 5 9-16Q11 4 20 8Q34 28 6 34" fill="#ffd44d"/></g>)}
  {impact && kind==='water' && <g className="water-wave"><path d={`M${target-210} 410q65-160 125-35t125-30 160 40v85h-410Z`} fill="#53bfdd" opacity=".85"/><path d={`M${target-200} 400q65-150 125-30t125-30 160 40`} fill="none" stroke="#dbfcff" strokeWidth="12"/></g>}
  {impact && (kind==='charge'||kind==='arcane') && Array.from({length:8},(_,i)=><g key={i} transform={`translate(${target-130+i*35} ${340+i%3*44})`}><path className="strike-spark" d="M-20-22 20 22M-20 22 20-22M0-32V32M-30 0H30" stroke={kind==='charge'?'#ffe7a0':'#bdf5ff'} strokeWidth="5"/></g>)}
  {impact && (kind==='buff'||kind==='heal'||kind==='debuff') && <g className="aura" transform={`translate(${kind==='debuff'?target:side==='host'?340:900} 380)`}><ellipse rx="160" ry="70" fill="none" stroke={kind==='heal'?'#ade8a0':kind==='buff'?'#ffe090':'#b897e5'} strokeWidth="10"/>{Array.from({length:7},(_,i)=><path key={i} d={`M${-130+i*42} 10v-70m-9 9 9-9 9 9`} stroke="#eaffc7" strokeWidth="4" fill="none"/>)}</g>}
 </g>;
}
export function BattleTheater({log,troopsMax,enemyMax,startTroops,startSupply,commanders,stageLabel,enemyLabel,cleared,defeated,enabled,onFinished,finished=false,initialPlaying=true,background='backgrounds/bg-battle-1'}:ReplayData & {readonly finished?:boolean; readonly initialPlaying?:boolean; readonly enabled:boolean; readonly onFinished:()=>void}):React.ReactElement {
 const [at,setAt]=useState(finished?log.length-1:-1),[phase,setPhase]=useState(finished?2:0),[playing,setPlaying]=useState(initialPlaying),[speed,setSpeed]=useState(1);
 const done=at>=log.length-1 && (phase===2 || log.length===0);
 useEffect(()=> { if(!enabled||!playing||done)return; const delay=at<0?650:phase===0?(log[at]?.skillKey?1300:380):phase===1?570:220; const timer=setTimeout(()=>{if(at<0){setAt(0);setPhase(0);}else if(phase<2)setPhase(p=>p+1);else{setAt(n=>n+1);setPhase(0);}},delay/speed);return()=>clearTimeout(timer); },[at,phase,playing,speed,done,enabled,log]);
 useEffect(()=>{if(done&&enabled)onFinished();},[done,enabled,onFinished]);
 const cur=log[at], impact=phase>=1, frame=replayFrame(log,at,impact,startTroops,enemyMax,startSupply);
 const scale=soldierScale(troopsMax,enemyMax), side=cur?.actor==='enemy'?'enemy':'host';
 const skill=cur?.skillKey?t(cur.skillKey):cur?.actor==='enemy'?'全軍突擊':'整頓軍勢';
 const effect=cur?.kind==='magic'?(/火|焚/.test(skill)?'fire':/水|雨/.test(skill)?'water':'arcane'):cur?.kind==='physical'||(cur?.actor==='enemy'&&cur.kind===null)?'charge':cur?.kind??'none';
 const actingName=cur?.actorKey?t(cur.actorKey):side==='enemy'?enemyLabel:'主將';
 const advance=():void=>{setPlaying(false);if(at<0){setAt(0);setPhase(0);}else if(phase<2)setPhase(p=>p+1);else if(!done){setAt(n=>n+1);setPhase(0);}};
 return <section className={`battlefield ${playing&&enabled?'':'battle-paused'} ${done?'battle-finished':''}`} style={{backgroundImage:`url('${art(background)}')`,'--beat':`${950/speed}ms`} as CSSProperties} aria-label="戰場演出">
  <div className="battle-shade"/>
  {enabled&&!done&&cur?.skillKey&&phase===0&&<div className={`skill-cutin side-${side}`} key={`cutin-${at}`} role="status"><div className="cutin-art"><CharacterArt name={actingName}/></div><div className="cutin-copy"><span>{actingName}</span><strong>{skill}</strong><b>發動</b></div></div>}
  <header className="war-header"><div><span>大檢定 · 戰場</span><h1>{stageLabel}</h1></div><div className="war-round">{cur?`第 ${cur.turn} 回合`:'兩軍列陣'}<small>{at<0?'戰鼓將起':`${Math.min(at+1,log.length)} / ${log.length} 戰報`}</small></div></header>
  <div className="army-meter host-meter"><b>我軍</b><strong>{Math.max(0,frame.current.troops)} <small>/ {troopsMax}</small></strong><div><i style={{width:`${Math.max(0,frame.current.troops)/Math.max(1,troopsMax)*100}%`}}/></div><span>糧秣 {frame.current.supply}</span></div>
  <div className="army-meter enemy-meter"><OfficerPortrait context="battle" name={enemyLabel} /><b>{enemyLabel}</b><strong>{Math.max(0,frame.current.enemy)} <small>/ {enemyMax}</small></strong><div><i style={{width:`${Math.max(0,frame.current.enemy)/Math.max(1,enemyMax)*100}%`}}/></div><span>敵軍陣列</span></div>
  <div className="war-commanders">{commanders.map((c,i)=><div key={i} className={`war-commander ${cur?.actor==='commander'&&actingName===c.name?'issuing':''}`}><OfficerPortrait context="battle" name={c.name}/><div><b>{c.name}</b><small>{c.skill}</small><span>{cur?.actor==='commander'&&actingName===c.name?'傳令！':'待命'}</span></div></div>)}</div>
  <svg className="soldier-field" viewBox="0 0 1280 666" aria-label={`我軍 ${frame.current.troops}，敵軍 ${frame.current.enemy}；每名圖示代表 ${scale} 兵量`}>
    <g className="camp-banner" transform="translate(130 228)"><path d="M0 250V0H70L55 25 70 65H0" fill="#365e81" stroke="#efce8c" strokeWidth="4"/><text x="17" y="43" fill="#ffe5a5" fontSize="28">魏</text></g>
    <g className="camp-banner" transform="translate(1150 228)"><path d="M0 250V0H-70L-55 25-70 65H0" fill="#963b32" stroke="#efce8c" strokeWidth="4"/><text x="-48" y="43" fill="#ffe5a5" fontSize="28">敵</text></g>
    <g key={`armies-${at}`} className="combat-beat">
      <Army side="host" now={frame.current.troops} before={frame.previous.troops} scale={scale} charging={!!cur&&side==='host'&&effect==='charge'&&phase<2} hit={impact&&frame.hostDelta<0} healing={impact&&frame.hostDelta>0} impact={impact}/>
      <Army side="enemy" now={frame.current.enemy} before={frame.previous.enemy} scale={scale} charging={!!cur&&side==='enemy'&&effect==='charge'&&phase<2} hit={impact&&frame.enemyDelta<0} healing={impact&&frame.enemyDelta>0} impact={impact}/>
      <g transform="translate(545 300) scale(1.5)" className={`host-general ${cur?.actor==='host'&&phase<2?'casting':''} ${impact&&frame.hostDelta<0?'general-hit':''}`}><Soldier leader/></g><text className="host-general-label" x="575" y="415" textAnchor="middle" fill="#fff0bf" stroke="#291b13" strokeWidth=".7" fontSize="19">主將</text>
      <g transform="translate(735 300) scale(-1.5 1.5)" opacity={frame.current.enemy===0?0:1} className={`enemy-general ${side==='enemy'&&phase<2?'casting':''} ${impact&&frame.enemyDelta<0?'general-hit':''}`}><Soldier leader side="enemy"/></g><text className="enemy-general-label" opacity={frame.current.enemy===0?0:1} x="705" y="415" textAnchor="middle" fill="#fff0bf" stroke="#291b13" strokeWidth=".7" fontSize="19">{enemyLabel}</text>
      {cur?.actor==='commander'&&phase<2&&<path className="command-signal" d="M230 234Q380 190 575 310" fill="none" stroke="#ffe8a7" strokeWidth="5" strokeDasharray="12 15"/>}
      {cur&&phase<2&&<Spell kind={effect} side={side} impact={impact}/>}
      {impact&&frame.hostDelta!==0&&<text className={`damage-number ${frame.hostDelta>0?'positive':''}`} x="350" y="280" textAnchor="middle">{frame.hostDelta>0?'+':''}{frame.hostDelta}</text>}
      {impact&&frame.enemyDelta!==0&&<text className={`damage-number ${frame.enemyDelta>0?'positive':''}`} x="920" y="280" textAnchor="middle">{frame.enemyDelta>0?'+':''}{frame.enemyDelta}</text>}
    </g>
  </svg>
  {cur&&<div className={`skill-announcement effect-${effect}`} key={`skill-${at}`}><span>{cur.actor==='commander'?'指揮官傳令':side==='enemy'?'敵軍發動':'我軍發動'} · {actingName}</span><b>{skill}</b></div>}
  <div className="war-bottom"><div className="war-report" role="status">{done?(defeated?'我軍失利，已獲獎勵減半。':cleared?'敵陣已破，此關通過。':'本關結束。'):cur?`${actingName} · ${skill}${impact?'　'+(frame.hostDelta<0?`我軍損失 ${-frame.hostDelta}`:frame.enemyDelta<0?`敵軍損失 ${-frame.enemyDelta}`:cur.kind==='heal'?'兵力恢復':cur.kind==='buff'?'軍勢振奮':cur.kind==='debuff'?'壓制敵軍':'整頓軍勢'):'　準備發動…'}`:'雙方列陣，等待戰鼓。'}<small>雙方共用比例：每名士兵圖示 = {scale} 兵量 · 尾數以半透明兵影表示</small></div><div className="war-controls"><button disabled={done} onClick={()=>setPlaying(p=>!p)}>{playing?'暫停':'播放'}</button><button disabled={done} onClick={advance}>下一拍</button>{[1,2,4].map(n=><button key={n} aria-pressed={speed===n} onClick={()=>setSpeed(n)}>{n}×</button>)}{done?null:<button onClick={()=>{setAt(log.length-1);setPhase(2);setPlaying(false);}}>跳到結果</button>}</div></div>
 </section>;
}
