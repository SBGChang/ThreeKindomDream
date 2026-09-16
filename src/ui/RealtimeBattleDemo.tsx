import type { Session } from '../app/session.js';
import {drawEncounterDemo} from './confrontation-render.js';
import {loadDuelImages} from './duel-art.js';
import {DuelBattleOverlay} from './DuelBattleOverlay.js';
import { useEffect, useRef, useState } from 'react';
import { armyBarWidth, armyCount, castSkill, createBattle, startBattle, skillBlock, tickBattle, type BattleState, type DemoSkill } from './realtime-battle-model.js';
import { BATTLE_ASSETS, drawBattle, loadBattleImages, type BattleImages } from './realtime-battle-render.js';
import './realtime-battle-demo.css';

function ArmyHud({state,enemy=false}:{state:BattleState;enemy?:boolean}){
 const troops=armyCount(state,enemy?'enemy':'ally'),max=enemy?state.enemyInitial:state.initial;
 return <section className={`rt-army ${enemy?'rt-enemy':'rt-ally'}`} aria-label={enemy?'敵方兵力':'我方兵力'}>
  <div className="rt-army-label"><b>{enemy?'敵':'我'}</b><span>{enemy?state.commanders.find(c=>c.side==='enemy')?.name??'敵軍前陣':'我軍本陣'}<small>{enemy?`第 ${state.wave} 波敵軍`:`每隊最多 ${state.groupSize} 人`}</small></span><strong>{troops}<small> / {max}</small></strong></div>
  <div className="rt-army-track" style={{width:`${armyBarWidth(max)/16*Math.min(1,600/Math.max(state.initial,state.enemyInitial))}cqw`}} role="progressbar" aria-label={enemy?'敵軍總兵力':'我軍總兵力'} aria-valuenow={troops} aria-valuemin={0} aria-valuemax={max}><i style={{width:`${troops/max*100}%`}}/></div>
 </section>;
}
function SkillButton({skill,state,onCast}:{skill:DemoSkill;state:BattleState;onCast:(id:string)=>void}){
 const block=skillBlock(state,skill),cd=state.cooldowns[skill.id]??0;
 const art=skill.kind==='fire'?'ignite':skill.kind==='pincer'?'slash':skill.kind==='inspire'?'drum':skill.kind;
 return <button className={`rt-skill skill-${skill.kind}`} disabled={!!block} aria-label={`${skill.owner}・${skill.name}`} title={`${skill.description}｜軍糧 ${skill.cost}｜冷卻 ${skill.cd} 秒${block?'｜'+block:''}`} onClick={()=>onCast(skill.id)}>
  <span className="rt-skill-icon" style={{backgroundImage:`url('${BATTLE_ASSETS[art]}')`,backgroundSize:art==='charge'?'400% 400%':'400% 200%'}}/>
  {cd>0&&<span className="rt-cooldown-wipe" style={{height:`${cd/skill.cd*100}%`}}/>}
  <kbd>{skill.key}</kbd><span className="rt-skill-owner">{skill.owner}</span><span className="rt-skill-label"><b>{skill.name}</b><small>糧 {skill.cost}</small></span>
  <span className="rt-skill-status">{cd>0?`${Math.ceil(cd)} 秒`:block||'可施放'}</span>
 </button>;
}
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
 const phase=c?(c.time<.35?'諸將退避':c.time<.7?'主將就位':c.time<1.1?'戰兵入陣':c.time<1.5?'聽我號令':c.time<2.5?'戰法發動':c.time<3.1?'命中':c.time<3.7?'收兵歸隊':'諸將歸位'):'';
 return <main className={campaign?"rt-shell rt-campaign":"rt-shell"}><div className={`rt-battle ${contest?'ct-battle ct-duel':''}`} data-contest-phase={contest?.phase??'none'} data-status={state.status} data-wave-phase={state.phase} data-wave={state.wave} data-cinematic={c?.skill.kind??'none'}>
  <canvas ref={canvas} width={1600} height={900} aria-label={`即時戰場：我軍 ${armyCount(state,'ally')} 人、敵軍 ${armyCount(state,'enemy')} 人`}/>
  {contest?<DuelBattleOverlay contest={contest} paused={state.status!=='running'} onAnswer={choice=>{campaign?.answerRealtimeDuel(choice);sync();}} onHelpChange={helpChange}/>:<><div className="rt-top-left"><span>{campaign?'整軍出陣 · 章末戰役':'大檢定・演武試作'}</span>{!campaign&&<><a href="?art=unit-sequence">返回動作預覽</a><a href="?art=confrontation-demo">試玩單挑・舌戰 →</a></>}</div>
  <div className={`rt-timer ${state.duration-state.time<=10?'rt-urgent':''}`}><small>{ended?'戰鬥結束':c?'技能演出 · 計時暫停':state.phase!=='combat'?'整軍過場 · 計時暫停':'距離鳴金'}</small><strong>{Math.ceil(state.duration-state.time).toString().padStart(2,'0')}<em>秒</em></strong><span>擊退 <b>{state.kills}</b> 人</span></div>
  <ArmyHud state={state} enemy/>
  {state.status!=='ready'&&state.status!=='finished'&&state.phase==='start'&&<div className="rt-wave-start" style={{opacity:Math.min(1,state.phaseTime/.2,Math.max(0,(1.45-state.phaseTime)/.4))}}><small>第 {state.wave} 波</small><strong>START</strong></div>}
  {['fallen','flee','cheer','exit'].includes(state.phase)&&<div className="rt-wave-caption">{state.phase==='fallen'?(state.defeated==='enemy'?'敵陣已破':'我軍潰散'):state.phase==='flee'?'敗將撤離':state.phase==='cheer'?'全軍歡呼':'乘勝追擊'}</div>}
  {['fade-in','fade-out'].includes(state.phase)&&<div className="rt-wave-black" style={{opacity:state.phase==='fade-out'?Math.min(1,state.phaseTime/.65):Math.max(0,1-state.phaseTime/.65)}}/>}
  {c&&<div className={`rt-cinematic-title kind-${c.skill.kind}`}><small>{c.skill.owner}出招</small><strong>{c.skill.name}</strong><span>{phase}</span>{c.impacted&&<b>{c.skill.effect==='heal'?`恢復 ${c.damage} 人`:c.skill.effect==='debuff'?`敵軍攻擊 −${Math.round((c.skill.power??.25)*100)}%`:c.skill.kind==='inspire'?`攻擊 +${Math.round((c.skill.power??.5)*100)}% · ${c.skill.effectDuration??10} 秒`:`擊退 ${c.damage} 人`}</b>}</div>}
  <div className="rt-lower-info"><ArmyHud state={state}/><div className="rt-supply"><small>軍糧</small><strong>{Math.floor(state.supply)}</strong><span>每秒補給 +{state.regen.toFixed(1)}</span></div><div className="rt-buffs">{state.buff>0&&<b>攻擊 +{Math.round(state.buffPower*100)}% <span>{Math.ceil(state.buff)} 秒</span></b>}{state.debuff>0&&<b>敵軍攻擊 −{Math.round(state.debuffPower*100)}% <span>{Math.ceil(state.debuff)} 秒</span></b>}{state.traitUntil>0&&<b>背水 · 減傷 25% <span>{Math.ceil(state.traitUntil)} 秒</span></b>}</div></div>
  <div className="rt-log" aria-live="polite">{state.log[0]??'交鋒在即・以戰法破敵'}</div>
  <nav className="rt-command" aria-label="戰法操作區"><section className="rt-skill-group"><h2>主角戰法</h2><div>{state.skills.filter(skill=>!skill.support && (!campaign?['1','2','3'].includes(skill.key):true)).map(skill=><SkillButton key={skill.id} skill={skill} state={state} onCast={cast}/>)}</div></section><section className="rt-skill-group rt-companions"><h2>同行援護</h2><div>{state.skills.filter(skill=>campaign?skill.support:['Q','W','E'].includes(skill.key)).map(skill=><SkillButton key={skill.id} skill={skill} state={state} onCast={cast}/>)}</div></section><button className="rt-pause" disabled={state.status==='ready'||ended} onClick={togglePause}>{state.status==='paused'?'繼續':'暫停'}<small>Space</small></button></nav></>}
  {(state.status==='ready'||ended)&&<div className="rt-overlay"><section className="rt-scroll" role="dialog" aria-modal="true" aria-label={ended?'戰役結算':'演武準備'}>
   <small>三國夢 · 即時大檢定</small><h1>{ended?'鳴金收兵':'沙場演武'}</h1><div className="rt-seal">{ended?'結':'戰'}</div>
   {ended?<><p>{state.reason}</p><div className="rt-result"><span>擊退敵軍<strong>{state.kills}<small> 人</small></strong></span><span>我軍存留<strong>{armyCount(state,'ally')}<small> 人</small></strong></span><span>施放戰法<strong>{state.castCount}<small> 次</small></strong></span></div>{result?<><p className="rt-earned">獲得 <strong>{result.money}</strong> 錢 · 擊破 {result.cleared} 波</p><p>{result.defeated?'戰敗獎勵減半':'鳴金收兵'} · 破陣所得能力與戰利品一併入帳</p></>:<p>每個娃娃最多代表 50 人，倒地才代表整隊耗盡。</p>}</>:<><p>六十秒內，率軍擊退更多敵人。</p><p>破陣後追擊下一波；把握軍糧與戰法冷卻。</p><label className="rt-troop-select">出陣兵力<select aria-label="出陣兵力" value={troops} onChange={e=>{const n=Number(e.target.value);setTroops(n);battle.current=createBattle(n);sync();}}><option value={200}>200 人 · 4 隊</option><option value={400}>400 人 · 8 隊</option><option value={600}>600 人 · 12 隊</option></select></label><div className="rt-rules"><span>一娃娃 = 最多 50 人</span><span>兵力歸零才倒地退場</span><span>技能、換波均暫停計時</span></div></>}
   {error&&<p role="alert">{error}，請重新整理重試。</p>}<button autoFocus className="rt-start" disabled={!ready||!!error} onClick={campaign?()=>{campaign.settleRealtimeCampaign();bump?.();onDone?.();}:start}>{campaign?'返回營地':!ready?'兵馬整備中…':ended?'再戰一場':'全軍出擊'}</button>{!campaign&&<a href="?art=unit-sequence">返回動作預覽</a>}
  </section></div>}
  {state.status==='paused'&&!duelHelp&&<div className="rt-overlay"><section className="rt-scroll rt-pause-dialog" role="dialog" aria-modal="true" aria-label="戰鬥暫停"><h1>暫歇片刻</h1><p>戰鬥與技能演出均已暫停。</p><button autoFocus className="rt-start" onClick={togglePause}>繼續戰鬥</button>{!campaign&&<><button onClick={()=>{battle.current=createBattle(troops);sync();}}>重新整軍</button><a href="?art=unit-sequence">返回動作預覽</a></>}</section></div>}
  {campaign&&!ready&&<div className="rt-overlay"><section className="rt-scroll" role="status"><h1>兵馬整備中</h1>{error?<><p role="alert">戰場素材載入失敗</p><button onClick={()=>location.reload()}>重新載入</button></>:<p>正在展開戰場…</p>}</section></div>}
 </div></main>;
}

/** Standalone art route shares the live renderer and controls. */
export function RealtimeBattleDemo():React.ReactElement { return <RealtimeBattle/>; }
