import type { Session } from '../app/session.js';
import {drawEncounterDemo} from './confrontation-render.js';
import {loadDuelImages} from './duel-art.js';
import {DuelBattleOverlay} from './DuelBattleOverlay.js';
import { useEffect, useRef, useState } from 'react';
import { armyCount, castSkill, createBattle, startBattle, tickBattle, type BattleState } from './realtime-battle-model.js';
import { drawBattle, loadBattleImages, type BattleImages } from './realtime-battle-render.js';
import {ArmyHud,BattleBuffs,BattleHint,SkillButton,SupplyBags} from './BattleHud.js';
import './battle-hud.css';

export function RealtimeBattle({campaign,bump,onDone}:{campaign?:Session;bump?:()=>void;onDone?:()=>void}={}):React.ReactElement {
 const [initial]=useState(()=>campaign?campaign.startRealtimeCampaign():createBattle());
 const canvas=useRef<HTMLCanvasElement>(null),battle=useRef<BattleState>(initial),images=useRef<BattleImages|null>(null);
 const [state,setState]=useState<BattleState>(battle.current),[ready,setReady]=useState(false),[error,setError]=useState(''),[troops,setTroops]=useState(400);
 const [duelHelp,setDuelHelp]=useState(false),helpResume=useRef(false);
 const sync=()=>{setState({...battle.current});bump?.();};
 const helpChange=(open:boolean)=>{const b=battle.current;if(open){helpResume.current=b.status==='running';b.status='paused';}else if(helpResume.current&&b.status==='paused')b.status='running';setDuelHelp(open);sync();};
 const cast=(id:string)=>{if(campaign?campaign.castRealtimeSkill(id):castSkill(battle.current,id))sync();};
 const togglePause=()=>{const s=battle.current;if(s.status==='running')s.status='paused';else if(s.status==='paused')s.status='running';sync();};
 const start=()=>{if(!ready)return;const s=createBattle(troops);startBattle(s);battle.current=s;sync();};
 useEffect(()=>{let alive=true;const encounter=campaign?.realtimeConfrontation(),ids=encounter?[encounter.participants.ally.id,...encounter.waveOpponents.map(p=>p.id)]:[];void Promise.all([loadBattleImages(campaign?`./art/backgrounds/bg-battle-${Math.min(4,campaign.current.progress.chapter)}.png`:undefined,battle.current.commanders,battle.current.waveNames),loadDuelImages(ids)]).then(([v,d])=>{if(alive){images.current={...v,...d};setReady(true);}}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[]);
 useEffect(()=>{
  if(!ready)return;let raf=0,last=performance.now(),uiAt=0,saveAt=0,acc=0;
  const frame=(now:number)=>{
   const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;
   while(acc>=1/60){if(campaign)campaign.advanceRealtimeCampaign(1/60);else tickBattle(battle.current,1/60);acc-=1/60;}
   const ctx=canvas.current?.getContext('2d'),encounter=campaign?.realtimeConfrontation();if(ctx&&images.current){if(encounter?.contest)drawEncounterDemo(ctx,images.current,encounter);else drawBattle(ctx,images.current,battle.current);}
   if(now-saveAt>1000){bump?.();saveAt=now;}
   if(campaign?.realtimeConfrontation()?.contest?.phase==='clash'||now-uiAt>65){setState({...battle.current});uiAt=now;}raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[ready]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target instanceof HTMLSelectElement||e.target instanceof HTMLInputElement)return;const s=battle.current;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(s.status==='running')togglePause();return;}if(e.code==='Space'&&(s.status==='running'||s.status==='paused')){e.preventDefault();togglePause();return;}if(campaign?.realtimeConfrontation()?.contest)return; // DuelInterface owns staged selection and confirmation.
const skill=battle.current.skills.find(v=>v.key.toLowerCase()===e.key.toLowerCase());if(skill&&ready){e.preventDefault();cast(skill.id);}};
  const hide=()=>{if(document.hidden&&battle.current.status==='running'){battle.current.status='paused';sync();}};
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hide);};
 },[ready]);
 const result=campaign&&state.status==='finished'?campaign.realtimeCampaignResult():null;
 const c=state.cinematic,ended=state.status==='finished',contest=campaign?.realtimeConfrontation()?.contest;
 const art='./art/ui/campaign/';
 return <main className={campaign?"rt-shell rt-campaign":"rt-shell"}><div className={`rt-battle ${contest?'ct-battle ct-duel':''}`} data-contest-phase={contest?.phase??'none'} data-status={state.status} data-wave-phase={state.phase} data-wave={state.wave} data-cinematic={c?.skill.kind??'none'}>
  <canvas ref={canvas} width={1600} height={900} aria-label={`即時戰場：我軍 ${armyCount(state,'ally')} 人、敵軍 ${armyCount(state,'enemy')} 人`}/>
  {contest?<DuelBattleOverlay contest={contest} paused={state.status!=='running'} onAnswer={choice=>{campaign?.answerRealtimeDuel(choice);sync();}} onHelpChange={helpChange}/>:<><ArmyHud state={state}/>
  <BattleHint className={`rt-timer ${state.status==='running'&&state.phase==='combat'&&!c&&state.duration-state.time<=10?'rt-urgent':''}`} below title="鳴金倒數" detail="交戰時倒數；戰法演出與換波期間暫停計時。">{id=><button type="button" aria-describedby={id} aria-label={`剩餘 ${Math.ceil(state.duration-state.time)} 秒`}><strong>{Math.ceil(state.duration-state.time).toString().padStart(2,'0')}</strong><small>{ended?'收兵':state.status==='paused'?'暫停':c||state.phase!=='combat'?'待陣':'倒數'}</small></button>}</BattleHint>
  <ArmyHud state={state} enemy/>
  {state.status!=='ready'&&state.status!=='finished'&&state.phase==='start'&&<div className="rt-wave-start" key={state.wave} style={{opacity:Math.min(1,state.phaseTime/.15,Math.max(0,(1.45-state.phaseTime)/.3))}}><div className="rt-start-lettering"><small>第 {state.wave} 陣</small><img src={art+'battle-start-v1.png'} alt="開戰"/></div></div>}
  {['fallen','flee','cheer','exit'].includes(state.phase)&&<div key={state.phase} className="rt-wave-caption"><strong>{state.phase==='fallen'?(state.defeated==='enemy'?'破陣':'潰退'):state.phase==='flee'?'撤離':state.phase==='cheer'?'萬勝':'追擊'}</strong></div>}
  {['fade-in','fade-out'].includes(state.phase)&&<div className="rt-wave-black" style={{opacity:state.phase==='fade-out'?Math.min(1,state.phaseTime/.65):Math.max(0,1-state.phaseTime/.65)}}/>}
  {c&&<div key={state.castCount} className={`rt-cinematic-title kind-${c.skill.kind}`}><small>{c.skill.owner}</small><strong>{c.skill.name}</strong>{c.impacted&&c.damage>0&&<b>{c.skill.effect==='heal'?'+':'−'}{c.damage}</b>}</div>}
  <SupplyBags state={state}/><div className="rt-lower-info"><BattleBuffs state={state}/></div>
  <BattleHint className="rt-battle-record" end title="戰況" detail={state.log.length?state.log.map((line,i)=><span key={i}>{line}</span>):'交鋒在即。'}>{id=><button type="button" aria-describedby={id} aria-label={`擊退 ${state.kills} 人，查看戰況`}><img src={art+'enemy-squad-v1.png'} alt=""/><strong>{state.kills}</strong></button>}</BattleHint>
  <nav className="rt-command" aria-label="戰法操作區"><section className="rt-skill-group"><h2>戰法</h2><div>{state.skills.filter(skill=>!skill.support && (!campaign?['1','2','3'].includes(skill.key):true)).map(skill=><SkillButton key={skill.id} skill={skill} state={state} onCast={cast}/>)}</div></section><section className="rt-skill-group rt-companions"><h2>援護</h2><div>{state.skills.filter(skill=>campaign?skill.support:['Q','W','E'].includes(skill.key)).map(skill=><SkillButton key={skill.id} skill={skill} state={state} onCast={cast}/>)}</div></section><button type="button" className="rt-pause" aria-label={state.status==='paused'?'繼續戰鬥':'暫停戰鬥'} disabled={state.status==='ready'||ended} onClick={togglePause}><span aria-hidden="true">{state.status==='paused'?'▶':'Ⅱ'}</span><small>SPACE</small></button></nav></>}
  {(state.status==='ready'||ended)&&<div className="rt-overlay"><section className="rt-scroll" role="dialog" aria-modal="true" aria-label={ended?'戰役結算':'演武準備'}>
   <small>三國夢 · 演武</small><h1>{ended?'鳴金收兵':'沙場演武'}</h1>
   {ended?<><p>{state.reason}</p><div className="rt-result"><span><img src={art+'enemy-squad-v1.png'} alt=""/>擊退<strong>{state.kills}</strong></span><span><img src={art+'troops-icon-v1.png'} alt=""/>存留<strong>{armyCount(state,'ally')}</strong></span><span><img src={art+'tactic-book-v5.png'} alt=""/>戰法<strong>{state.castCount}</strong></span></div>{result&&<p className="rt-earned"><strong>{result.money}</strong> 錢 · 破 {result.cleared} 陣{result.defeated?' · 戰敗折半':''}</p>}</>:<><p className="rt-motto">六十息，破千軍</p><div className="rt-troop-options" role="group" aria-label="出陣兵力">{[200,400,600].map(n=><button type="button" key={n} aria-pressed={troops===n} onClick={()=>{setTroops(n);battle.current=createBattle(n);sync();}}><img src={art+'troops-icon-v1.png'} alt=""/><strong>{n}</strong></button>)}</div><BattleHint className="rt-rules-help" title="演武軍令" detail="60 秒內擊退更多敵軍。每隊最多 50 人；兵力歸零才倒地。戰法消耗軍糧，演出與換波期間暫停計時。">{id=><button type="button" aria-describedby={id}><img src={art+'tactic-book-v5.png'} alt=""/>軍令</button>}</BattleHint></>}
   {error&&<p role="alert">{error}，請重新整理重試。</p>}<button autoFocus className="rt-start" disabled={!ready||!!error} onClick={campaign?()=>{campaign.settleRealtimeCampaign();bump?.();onDone?.();}:start}>{campaign?'返回營地':!ready?'兵馬整備中…':ended?'再戰一場':'全軍出擊'}</button>{!campaign&&<a href="?art=unit-sequence">返回動作預覽</a>}
  </section></div>}
  {state.status==='paused'&&!duelHelp&&<div className="rt-overlay"><section className="rt-scroll rt-pause-dialog" role="dialog" aria-modal="true" aria-label="戰鬥暫停"><small>鳴鼓待命</small><h1>暫歇片刻</h1><button autoFocus className="rt-start" onClick={togglePause}>繼續戰鬥</button>{!campaign&&<><button onClick={()=>{battle.current=createBattle(troops);sync();}}>重新整軍</button><a href="?art=unit-sequence">返回動作預覽</a></>}</section></div>}
  {campaign&&!ready&&<div className="rt-overlay"><section className="rt-scroll" role="status"><h1>兵馬整備中</h1>{error?<><p role="alert">戰場素材載入失敗</p><button onClick={()=>location.reload()}>重新載入</button></>:<p>正在展開戰場…</p>}</section></div>}
 </div></main>;
}

/** Standalone art route shares the live renderer and controls. */
export function RealtimeBattleDemo():React.ReactElement { return <RealtimeBattle/>; }
