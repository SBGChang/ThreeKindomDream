import { useEffect, useRef, useState } from 'react';
import { answerContest, beginEncounterDemo, createEncounterDemo, replyWindow, revealArgument, tickEncounterDemo, type PreviewMode } from '../app/confrontation-demo.js';
import { armyCount, castSkill } from './realtime-battle-model.js';
import { loadBattleImages, type BattleImages } from './realtime-battle-render.js';
import { drawEncounterDemo } from './confrontation-render.js';
import './realtime-battle-demo.css';
import './confrontation-demo.css';
import { DuelInterface } from './DuelHud.js';
import {DuelSetup,defaultBuilds} from './DuelSetup.js';
import {DUEL_ACTORS,loadDuelImages} from './duel-art.js';
import './duel-setup.css';

export function ConfrontationDemo():React.ReactElement {
  const [builds,setBuilds]=useState(defaultBuilds);
  const [cast,setCast]=useState({ally:'lord',enemy:'npc_soldier'});
  const model=useRef(createEncounterDemo()),canvas=useRef<HTMLCanvasElement>(null),images=useRef<BattleImages|null>(null);
  const [snapshot,setSnapshot]=useState({...model.current}),[ready,setReady]=useState(false),[error,setError]=useState('');
  const [duelHelp,setDuelHelp]=useState(false),helpResume=useRef(false);
  const sync=()=>setSnapshot({...model.current});
  const helpChange=(open:boolean)=>{const b=model.current.battle;if(open){helpResume.current=b.status==='running';b.status='paused';}else if(helpResume.current&&b.status==='paused')b.status='running';setDuelHelp(open);sync();};
  const start=(mode:PreviewMode)=>{if(!ready)return;const seedParam=new URLSearchParams(location.search).get('seed'),seed=seedParam!==null&&/^\d+$/.test(seedParam)?Number(seedParam)>>>0:Date.now();model.current=createEncounterDemo(mode,seed,builds,{ally:{id:cast.ally,name:DUEL_ACTORS[cast.ally]!,build:builds.ally},enemy:{id:cast.enemy,name:DUEL_ACTORS[cast.enemy]!,build:builds.enemy}});beginEncounterDemo(model.current);sync();};
  const answer=(choice:number)=>{answerContest(model.current,choice);sync();};
  const inspect=()=>{revealArgument(model.current);sync();};
  const pause=()=>{const b=model.current.battle;if(b.status==='running')b.status='paused';else if(b.status==='paused')b.status='running';sync();};
  const reset=()=>{model.current=createEncounterDemo();sync();};
  useEffect(()=>{
    let alive=true;
    setReady(false);setError('');
    void Promise.all([loadBattleImages(),loadDuelImages([cast.ally,cast.enemy])]).then(([v,d])=>{if(alive){images.current={...v,...d};setReady(true);}}).catch(e=>{if(alive)setError(String(e));});
    return()=>{alive=false;};
  },[cast]);
  useEffect(()=>{
    if(!ready)return;
    let raf=0,last=performance.now(),acc=0,uiAt=0;
    const frame=(now:number)=>{
      acc+=Math.min(.1,(now-last)/1000);last=now;
      while(acc>=1/60){tickEncounterDemo(model.current,1/60);acc-=1/60;}
      const ctx=canvas.current?.getContext('2d');if(ctx&&images.current)drawEncounterDemo(ctx,images.current,model.current);
      if(model.current.contest?.duel&&model.current.contest.phase==='clash'||now-uiAt>40){sync();uiAt=now;}raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[ready]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
      if(e.key==='Escape'||e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();pause();return;}
      if(!ready||model.current.battle.status!=='running')return;
      if(model.current.contest){
        if(!model.current.contest.duel&&['1','2','3'].includes(e.key)){e.preventDefault();answer(Number(e.key)-1);}
        if(e.key.toLowerCase()==='q'){e.preventDefault();inspect();}
      }else{
        const skill=model.current.battle.skills.find(v=>v.key.toLowerCase()===e.key.toLowerCase());
        if(skill){e.preventDefault();castSkill(model.current.battle,skill.id);sync();}
      }
    };
    const context=(e:MouseEvent)=>{e.preventDefault();if(model.current.battle.status==='running')pause();};
    const hide=()=>{if(document.hidden&&model.current.battle.status==='running')pause();};
    window.addEventListener('keydown',key);window.addEventListener('contextmenu',context);document.addEventListener('visibilitychange',hide);
    return()=>{window.removeEventListener('keydown',key);window.removeEventListener('contextmenu',context);document.removeEventListener('visibilitychange',hide);};
  },[ready]);
  const s=snapshot,b=s.battle,c=s.contest,active=!!c&&['read','clash'].includes(c.phase);
  const ended=b.status==='finished',menu=b.status==='ready'||ended;
  const ratio=c?Math.min(1,c.phaseTime/replyWindow(c)):0;
  const title=c?(c.kind==='duel'?'陣 前 單 挑':'陣 前 舌 戰'):'沙 場 交 鋒';
  const caption=c?c.phase==='clear'?'兩軍退開 · 主將出陣':c.phase==='approach'?'陣前會面 · 勝者破陣':c.phase==='verdict'?c.feedback:c.phase==='restore'?'全軍歸陣':c.phase==='retreat'?'敗軍撤退':c.phase==='clash'?c.feedback:c.kind==='duel'?'血量決勝負 · 體力決定出招':'讀出破綻，以言破陣':b.phase==='cheer'?(b.defeated==='enemy'?'我軍勝利 · 全體歡呼':'敵軍勝利 · 全體歡呼'):b.phase==='exit'?(b.defeated==='enemy'?'乘勝前進 · 奔赴下一關':'我軍撤離 · 出征結束'):b.phase==='combat'?'兩軍交鋒中':b.phase==='start'?'START':'整軍入場';
  return <main className="rt-shell"><div className={`rt-battle ct-battle ${c?'ct-in-contest':''} ct-${c?.kind??'field'}`} data-contest={c?.kind??'none'} data-contest-phase={c?.phase??'none'} data-phase={b.phase} data-status={b.status} data-wave={b.wave}>
    <canvas ref={canvas} width={1600} height={900} aria-label="陣前單挑與舌戰戰場"/>
    {!c?.duel&&<header className="ct-heading"><a href="?art=battle-demo" aria-label="返回即時戰場 Demo">‹ 戰場</a><div><small>第 {b.wave} 關 · {c?'戰場計時暫停':'演武試玩'}</small><h1>{title}</h1></div><button onClick={pause} disabled={menu} aria-label={b.status==='paused'?'繼續遊戲':'暫停遊戲'}>Ⅱ</button></header>}
    <div className="ct-clock"><b>{Math.ceil(b.duration-b.time)}</b> 秒 <span>擊退 {b.kills}</span></div>
    {!menu&&<>
      {c?.duel?<DuelInterface contest={c} paused={b.status!=='running'} onAnswer={answer} onHelpChange={helpChange}/>:<>
      <section className="ct-vital ct-left" aria-label={c?'我方對決狀態':'我方軍力'}><small>{c?'我方代表':'我方軍力'}</small><h2>{c?c.allyName:'我軍本陣'}<b>{c?c.allyHp:armyCount(b,'ally')}</b></h2><div className="ct-track" role="progressbar" aria-label={c?(c.kind==='duel'?'我方鬥志':'我方信念'):'我方兵力'} aria-valuenow={c?c.allyHp:armyCount(b,'ally')} aria-valuemin={0} aria-valuemax={c?100:b.initial}><i style={{width:`${c?c.allyHp:armyCount(b,'ally')/b.initial*100}%`}}/></div><span>{c?(c.kind==='duel'?'鬥志':'信念'):`${armyCount(b,'ally')} / ${b.initial} 人`}</span></section>
      <section className="ct-vital ct-right" aria-label={c?'敵方對決狀態':'敵方軍力'}><small>{c?'敵方代表':'敵方軍力'}</small><h2>敵軍指揮官<b>{c?c.enemyHp:armyCount(b,'enemy')}</b></h2><div className="ct-track" role="progressbar" aria-label={c?(c.kind==='duel'?'敵方鬥志':'敵方信念'):'敵方兵力'} aria-valuenow={c?c.enemyHp:armyCount(b,'enemy')} aria-valuemin={0} aria-valuemax={c?100:b.enemyInitial}><i style={{width:`${c?c.enemyHp:armyCount(b,'enemy')/b.enemyInitial*100}%`}}/></div><span>{c?(c.kind==='duel'?'鬥志':'信念'):`${armyCount(b,'enemy')} / ${b.enemyInitial} 人`}</span></section>
      </>}
      <div className={`ct-caption ${active?'ct-caption-small':''}`} aria-live="polite">{caption}</div>
    </>}
    {active&&c&&!c.duel&&<section className="ct-command" aria-label="舌戰操作">
      <div className="ct-prompt"><span className="ct-round">{c.round}<small>/ 5 交鋒</small></span><div><small>敵方論點</small><p>{c.challenge.cue}</p></div><span className="ct-deadline">{c.phase==='read'?`${Math.ceil(replyWindow(c)-c.phaseTime)} 秒`:'交招中'}</span></div>
      <div className="ct-timing ct-reading" aria-label="回應剩餘時間"><i style={{width:`${c.phase==='read'?ratio*100:100}%`}}/></div>
      <div className="ct-choices">{c.challenge.choices.map((label,i)=><button key={`${c.round}-${i}`} onClick={()=>answer(i)} disabled={c.phase!=='read'||b.status!=='running'} className={c.phase==='clash'&&c.choice===i?(c.success?'ct-correct':'ct-wrong'):''}><kbd>{i+1}</kbd><b>{label}</b></button>)}</div>
      <footer><span>{c.revealed?c.challenge.hint:'不必搶快；選出真正回應論點的一句。'}</span><button onClick={inspect} disabled={c.insight<=0||c.revealed||c.phase!=='read'||b.status!=='running'}><kbd>Q</kbd>洞察 <strong>{c.insight} / 2</strong></button></footer>
    </section>}
    {!c&&!menu&&<section className="ct-field-tools"><div><b>{s.mode==='random'?'戰中機緣':s.mode==='duel'?'單挑試玩':'舌戰試玩'}</b><span>{s.mode==='random'?'每 8 秒有 18% 機率交鋒，每波最多一次。':'本模式每波交戰後，必定觸發一次。'}</span></div><div className="ct-field-skills">{b.skills.slice(0,3).map(skill=><button key={skill.id} disabled={b.phase!=='combat'||!!b.cinematic||b.supply<skill.cost||(b.cooldowns[skill.id]??0)>0||b.status!=='running'} onClick={()=>{castSkill(b,skill.id);sync();}}><kbd>{skill.key}</kbd>{skill.name}<small>糧 {skill.cost}</small></button>)}</div><span>軍糧 {Math.floor(b.supply)}</span></section>}
    {c?.phase==='verdict'&&<div className={`ct-verdict ${c.winner==='ally'?'ct-win':'ct-lose'}`}><span>{c.draw?'和':c.winner==='ally'?'勝':'敗'}</span><strong>{c.draw?'各自歸陣':c.winner==='ally'?'一戰破陣':'敗退收軍'}</strong></div>}
    {!c&&['fade-in','fade-out'].includes(b.phase)&&<div className="rt-wave-black" style={{opacity:b.phase==='fade-out'?Math.min(1,b.phaseTime/.65):Math.max(0,1-b.phaseTime/.65)}}/>}
    {menu&&<div className="ct-overlay"><section className="ct-menu" role="dialog" aria-modal="true" aria-label={ended?'演武結算':'選擇試玩方式'}><small>三 國 夢 · 陣 前 交 鋒</small><h1>{ended?'鳴金收軍':'以一人，定一陣'}</h1><p>{ended?(b.defeated==='ally'?'我方對決或戰場失利，全軍已撤退。':`時間到，已完成 ${b.wave-1} 關。`):'兩軍退開，主將走到陣中。勝者直接拿下本關。'}</p>
      {ended&&<div className="ct-score"><span>對決勝利<b>{s.victories}</b></span><span>擊退敵軍<b>{b.kills}</b></span><span>我軍存留<b>{armyCount(b,'ally')}</b></span></div>}
      <div className="du-cast-picker">{(['ally','enemy'] as const).map(side=><label key={side}>{side==='ally'?'我方':'敵方'}<select aria-label={`${side==='ally'?'我方':'敵方'}單挑武將`} value={cast[side]} onChange={e=>setCast({...cast,[side]:e.target.value})}>{Object.entries(DUEL_ACTORS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>)}</div>
      <DuelSetup builds={builds} onChange={setBuilds}/>
      <div className="ct-mode-cards"><button onClick={()=>start('duel')} disabled={!ready||!!error}><span className="ct-mode-icon ct-duel-icon"/><strong>單挑</strong><small>攻防休養 · 數值博弈</small></button><button onClick={()=>{location.href='?art=debate-demo';}} disabled={!ready||!!error}><span className="ct-mode-icon ct-debate-icon"/><strong>舌戰</strong><small>手牌組合 · 以論破陣</small></button></div>
      <button className="ct-random" onClick={()=>start('random')} disabled={!ready||!!error}>進入戰場 · 自然觸發</button><p className="ct-note">敗方全軍撤退；我方落敗即結束本次出征。<br/>單挑最多 24 合，比剩餘血量比例；同比例和局回戰場。舌戰另開卡牌試玩。<br/>試玩不寫入存檔 · 右鍵／Esc 暫停 · 對決及換關不耗戰場時間。</p>
      <a className="du-review-link" href="?art=duel-motion">武將動作檢視 ›</a>
      {!ready&&!error&&<p role="status">兵馬整備中…</p>}{error&&<p role="alert">{error}</p>}
    </section></div>}
    {b.status==='paused'&&!duelHelp&&<div className="ct-overlay"><section className="ct-pause-menu" role="dialog" aria-modal="true" aria-label="演武暫停"><h1>暫歇片刻</h1><button autoFocus onClick={pause}>繼續遊戲</button><button onClick={reset}>返回試玩選擇</button><a href="?art=battle-demo">返回即時戰場 Demo</a></section></div>}
  </div></main>;
}
