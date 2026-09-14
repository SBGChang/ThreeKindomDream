import { useEffect, useRef, useState } from 'react';
import { armyBarWidth, armyCount, castSkill, createBattle, startBattle, COMMAND_LEAD, DEMO_SKILLS, skillBlock, tickBattle, type BattleState, type DemoSkill } from './realtime-battle-model.js';
import { BATTLE_ASSETS, drawBattle, loadBattleImages, type BattleImages } from './realtime-battle-render.js';
import './realtime-battle-demo.css';

function ArmyHud({state,enemy=false}:{state:BattleState;enemy?:boolean}){
 const troops=armyCount(state,enemy?'enemy':'ally'),max=enemy?state.enemyInitial:state.initial;
 return <section className={`rt-army ${enemy?'rt-enemy':'rt-ally'}`} aria-label={enemy?'敵方兵力':'我方兵力'}>
  <div className="rt-army-label"><b>{enemy?'敵':'我'}</b><span>{enemy?'敵軍前陣':'我軍本陣'}<small>{enemy?`第 ${state.wave} 波敵軍`:'每隊五十人'}</small></span><strong>{troops}<small> / {max}</small></strong></div>
  <div className="rt-army-track" style={{width:`${armyBarWidth(max)/16}cqw`}} role="progressbar" aria-label={enemy?'敵軍總兵力':'我軍總兵力'} aria-valuenow={troops} aria-valuemin={0} aria-valuemax={max}><i style={{width:`${troops/max*100}%`}}/></div>
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
export function RealtimeBattleDemo():React.ReactElement {
 const canvas=useRef<HTMLCanvasElement>(null),battle=useRef<BattleState>(createBattle()),images=useRef<BattleImages|null>(null);
 const [state,setState]=useState<BattleState>(battle.current),[ready,setReady]=useState(false),[error,setError]=useState(''),[troops,setTroops]=useState(400);
 const sync=()=>setState({...battle.current});
 const cast=(id:string)=>{if(castSkill(battle.current,id))sync();};
 const togglePause=()=>{const s=battle.current;if(s.status==='running')s.status='paused';else if(s.status==='paused')s.status='running';sync();};
 const start=()=>{if(!ready)return;const s=createBattle(troops);startBattle(s);battle.current=s;sync();};
 useEffect(()=>{let alive=true;void loadBattleImages().then(v=>{if(alive){images.current=v;setReady(true);}}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[]);
 useEffect(()=>{
  if(!ready)return;let raf=0,last=performance.now(),uiAt=0,acc=0;
  const frame=(now:number)=>{
   const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;
   while(acc>=1/60){tickBattle(battle.current,1/60);acc-=1/60;}
   const ctx=canvas.current?.getContext('2d');if(ctx&&images.current)drawBattle(ctx,images.current,battle.current);
   if(now-uiAt>65){setState({...battle.current});uiAt=now;}raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[ready]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target instanceof HTMLSelectElement)return;const s=battle.current;if(e.code==='Space'&&(s.status==='running'||s.status==='paused')){e.preventDefault();togglePause();return;}const skill=DEMO_SKILLS.find(v=>v.key.toLowerCase()===e.key.toLowerCase());if(skill&&ready){e.preventDefault();cast(skill.id);}};
  const hide=()=>{if(document.hidden&&battle.current.status==='running'){battle.current.status='paused';sync();}};
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hide);};
 },[ready]);
 const c=state.cinematic,ended=state.status==='finished';
 const phase=c?(c.time<COMMAND_LEAD?'將令已下':c.time<COMMAND_LEAD+2.5?c.skill.kind==='inspire'?'擂鼓振軍威':'出陣！':c.time<COMMAND_LEAD+3.6?c.skill.kind==='inspire'?'全軍振奮':'敵陣潰散':'重返戰場'):'';
 return <main className="rt-shell"><div className="rt-battle" data-status={state.status} data-wave-phase={state.phase} data-wave={state.wave} data-cinematic={c?.skill.kind??'none'}>
  <canvas ref={canvas} width={1600} height={900} aria-label="即時戰場：藍色我軍與紅色敵軍交戰，每個娃娃代表最多五十名士兵"/>
  <div className="rt-top-left"><span>大檢定・演武試作</span><a href="?art=unit-sequence">返回動作預覽</a></div>
  <div className={`rt-timer ${state.duration-state.time<=10?'rt-urgent':''}`}><small>{c?'技能演出 · 計時暫停':state.phase!=='combat'?'整軍過場 · 計時暫停':'距離鳴金'}</small><strong>{Math.ceil(state.duration-state.time).toString().padStart(2,'0')}<em>秒</em></strong><span>擊退 <b>{state.kills}</b> 人</span></div>
  <ArmyHud state={state} enemy/>
  {state.status!=='ready'&&state.status!=='finished'&&state.phase==='start'&&<div className="rt-wave-start" style={{opacity:Math.min(1,state.phaseTime/.2,Math.max(0,(1.45-state.phaseTime)/.4))}}><small>第 {state.wave} 波</small><strong>START</strong></div>}
  {['fallen','flee','cheer','exit'].includes(state.phase)&&<div className="rt-wave-caption">{state.phase==='fallen'?(state.defeated==='enemy'?'敵陣已破':'我軍潰散'):state.phase==='flee'?'敗將撤離':state.phase==='cheer'?'全軍歡呼':'乘勝追擊'}</div>}
  {['fade-in','fade-out'].includes(state.phase)&&<div className="rt-wave-black" style={{opacity:state.phase==='fade-out'?Math.min(1,state.phaseTime/.65):Math.max(0,1-state.phaseTime/.65)}}/>}
  {c&&<div className={`rt-cinematic-title kind-${c.skill.kind}`}><small>{c.skill.owner}出招</small><strong>{c.skill.name}</strong><span>{phase}</span>{c.impacted&&<b>{c.skill.kind==='inspire'?'攻擊 +50% · 持續 10 秒':`擊退 ${c.damage} 人`}</b>}</div>}
  <div className="rt-lower-info"><ArmyHud state={state}/><div className="rt-supply"><small>軍糧</small><strong>{Math.floor(state.supply)}</strong><span>每秒補給 +2.4</span></div><div className="rt-buffs">{state.buff>0&&<b>鼓舞 · 攻擊 +50% <span>{Math.ceil(state.buff)} 秒</span></b>}{state.traitUntil>0&&<b>背水 · 減傷 25% <span>{Math.ceil(state.traitUntil)} 秒</span></b>}</div></div>
  <div className="rt-log" aria-live="polite">{state.log[0]??'交鋒在即・以戰法破敵'}</div>
  <nav className="rt-command" aria-label="戰法操作區"><section className="rt-skill-group"><h2>主角戰法</h2><div>{DEMO_SKILLS.slice(0,3).map(skill=><SkillButton key={skill.id} skill={skill} state={state} onCast={cast}/>)}</div></section><section className="rt-skill-group rt-companions"><h2>同行援護</h2><div>{DEMO_SKILLS.slice(3).map(skill=><SkillButton key={skill.id} skill={skill} state={state} onCast={cast}/>)}</div></section><button className="rt-pause" disabled={state.status==='ready'||ended} onClick={togglePause}>暫停<small>Space</small></button></nav>
  {(state.status==='ready'||ended)&&<div className="rt-overlay"><section className="rt-scroll" role="dialog" aria-modal="true" aria-label={ended?'演武結算':'演武準備'}>
   <small>三國夢 · 即時大檢定</small><h1>{ended?'鳴金收兵':'沙場演武'}</h1><div className="rt-seal">{ended?'結':'戰'}</div>
   {ended?<><p>{state.reason}</p><div className="rt-result"><span>擊退敵軍<strong>{state.kills}<small> 人</small></strong></span><span>我軍存留<strong>{armyCount(state,'ally')}<small> 人</small></strong></span><span>施放戰法<strong>{state.castCount}<small> 次</small></strong></span></div><p>每個娃娃最多代表 50 人，倒地才代表整隊耗盡。</p></>:<><p>六十秒內，率軍擊退更多敵人。</p><p>破陣後追擊下一波；把握軍糧與戰法冷卻。</p><label className="rt-troop-select">出陣兵力<select aria-label="出陣兵力" value={troops} onChange={e=>{const n=Number(e.target.value);setTroops(n);battle.current=createBattle(n);sync();}}><option value={200}>200 人 · 4 隊</option><option value={400}>400 人 · 8 隊</option><option value={600}>600 人 · 12 隊</option></select></label><div className="rt-rules"><span>一娃娃 = 最多 50 人</span><span>兵力歸零才倒地退場</span><span>技能、換波均暫停計時</span></div></>}
   {error&&<p role="alert">{error}，請重新整理重試。</p>}<button className="rt-start" disabled={!ready||!!error} onClick={start}>{!ready?'兵馬整備中…':ended?'再戰一場':'全軍出擊'}</button><a href="?art=unit-sequence">返回動作預覽</a>
  </section></div>}
  {state.status==='paused'&&<div className="rt-overlay"><section className="rt-scroll rt-pause-dialog" role="dialog" aria-modal="true" aria-label="战鬥暫停"><h1>暫歇片刻</h1><p>戰鬥與技能演出均已暫停。</p><button className="rt-start" onClick={togglePause}>繼續戰鬥</button><button onClick={()=>{battle.current=createBattle(troops);sync();}}>重新整軍</button><a href="?art=unit-sequence">返回動作預覽</a></section></div>}
 </div></main>;
}
