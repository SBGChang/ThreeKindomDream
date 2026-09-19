import {ChallengeConversation,challengeLines} from './ChallengeConversation.js';
import {stageChallenge} from '../contracts/core/event-challenge.js';
import {careerPresentation} from './career-presentation.js';
import {useEffect,useRef,useState} from 'react';
import type {Session} from '../app/session.js';
import {defs,t} from '../app/bootstrap.js';
import {DuelInterface} from './DuelHud.js';
import {RallyDebateDemo} from './RallyDebateDemo.js';
import {drawEncounterDemo} from './confrontation-render.js';
import {loadBattleImages,drawBattle,type BattleImages} from './realtime-battle-render.js';
import {loadDuelImages} from './duel-art.js';
import {ArmyHud,SupplyBags,SkillButton} from './BattleHud.js';
import './realtime-battle-demo.css';
import './confrontation-demo.css';
import './duel-hud.css';
import './battle-hud.css';
import './event-challenge.css';

export function EventChallengeView({session:s,onChange,onDone}:{session:Session;onChange:()=>void;onDone:()=>void}):React.ReactElement {
 const state=s.current.eventChallenge!,canvas=useRef<HTMLCanvasElement>(null),images=useRef<BattleImages|null>(null);
 const [,render]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(''),[page,setPage]=useState(0),[skillPage,setSkillPage]=useState(0);
 const callbacks=useRef({onChange});callbacks.current={onChange};
 const sync=()=>{render(n=>n+1);callbacks.current.onChange();};
 const act=(fn:()=>unknown)=>{fn();sync();};
 useEffect(()=>{if(state.phase!=='playing'||state.rally)return;let alive=true;setReady(false);void Promise.all([loadBattleImages(state.contest?"/art/backgrounds/bg-drill.png":undefined,state.battle?.commanders??[]),loadDuelImages(['lord',stageChallenge(state).opponent])]).then(([a,b])=>{if(alive){images.current={...a,...b};setReady(true);}}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[state.phase]);
 useEffect(()=>{if(!ready||state.phase!=='playing'||state.rally)return;let raf=0,last=performance.now(),ui=0,save=0,acc=0;
 const frame=(now:number)=>{acc+=Math.min(.1,(now-last)/1000);last=now;while(acc>=1/60){s.tickEventChallenge(1/60);acc-=1/60;}const ctx=canvas.current?.getContext('2d');if(ctx&&images.current){if(state.contest)drawEncounterDemo(ctx,images.current,{contest:state.contest});else if(state.battle)drawBattle(ctx,images.current,state.battle);}if(now-ui>60){render(n=>n+1);ui=now;}if(now-save>1000||(state.phase==='result'||state.phase==='intermission')){callbacks.current.onChange();save=now;}if(state.phase==='playing')raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[ready,state.phase]);
 useEffect(()=>{const hide=()=>{if(document.hidden&&state.phase==='playing')act(()=>s.pauseEventChallenge(true));};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(state.phase!=='playing'||state.rally||e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target instanceof HTMLInputElement)return;if(e.code==='Space'){e.preventDefault();act(()=>s.pauseEventChallenge(!state.paused));}else if(state.battle&&ready){const skill=state.battle.skills.find(sk=>sk.key===e.key);if(skill){e.preventDefault();act(()=>s.castEventSkill(skill.id));}}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[ready,state.phase]);
 if(state.phase==='playing'&&state.rally)return <div className="event-challenge ec-playing"><RallyDebateDemo campaign={{state:state.rally,enemyName:stageChallenge(state).opponentName,initialPaused:state.paused,returnLabel:'繼續對話',background:'/art/backgrounds/bg-study.png',onRetreat:()=>act(()=>s.retreatEventChallenge()),onPause:p=>act(()=>s.pauseEventChallenge(p)),onAction:(side,a)=>{const ok=s.answerEventDebate(side,a);sync();return ok;},onDone:()=>act(()=>s.finishEventDebate())}}/></div>;
 if(state.phase==='playing')return <div className="event-challenge ec-playing"><main className="rt-shell"><div className={`rt-battle ct-battle ${state.contest?'ct-duel':''}`}><canvas ref={canvas} width={1600} height={900} aria-label={state.contest?'事件單挑':'事件戰場'}/>
 {ready&&state.contest&&<DuelInterface contest={state.contest} paused={state.paused} onAnswer={n=>act(()=>s.answerEventDuel(n))} onHelpChange={p=>act(()=>s.pauseEventChallenge(p))}/>}
 {ready&&state.battle&&<><ArmyHud state={state.battle}/><ArmyHud state={state.battle} enemy/><SupplyBags state={state.battle}/><nav className="rt-command"><section className="rt-skill-group"><h2>戰法</h2><div>{state.battle.skills.map(skill=><SkillButton key={skill.id} state={state.battle!} skill={skill} onCast={id=>act(()=>s.castEventSkill(id))}/>)}</div></section><strong className="ec-timer">{Math.ceil(state.battle.duration-state.battle.time)} 息</strong></nav></>}
 <div className="ec-tools">{state.definition.stages&&<strong>{state.definition.stages[state.stage??0]?.title}</strong>}<button className="ec-control" onClick={()=>act(()=>s.pauseEventChallenge(!state.paused))}>{state.paused?'繼續':'暫停'}</button><button className="ec-control" onClick={()=>act(()=>s.retreatEventChallenge())}>認退</button></div>
 {(!ready||error)&&<div className="ec-loading">{error||'整備兵馬…'}</div>}{state.paused&&ready&&<div className="ec-paused">暫歇片刻</div>}
 </div></main></div>;
 if(state.phase==='prep'){
 const d=stageChallenge(state),learned=[...new Set([...s.current.abilities.skills,...(d.loanSkills??[])])].filter(id=>!d.strategyOnly||['magic','debuff'].includes(defs.reader('skill').get(String(id)).action.kind)),visible=learned.slice(skillPage*6,skillPage*6+6);
 return <div className="event-challenge ec-prep"><header><h1>臨陣整備</h1><p>親率一軍，定好戰法便出發。</p></header><div className="ec-folio"><section><h2>隨身戰法 <small>{state.skills.length} / 3</small></h2><div className="ec-skills">{visible.map(id=>{const d=defs.reader('skill').get(String(id)),selected=state.skills.includes(String(id));return <button key={id} className="ec-control" aria-pressed={selected} disabled={!selected&&state.skills.length>=3} title={t(d.descKey)} onClick={()=>act(()=>s.configureEventChallenge(selected?state.skills.filter(v=>v!==String(id)):[...state.skills,String(id)],state.infantryPercent))}><img src="/art/ui/campaign/tactic-book-v5.png" alt=""/>{t(d.nameKey)}</button>;})}</div>{!learned.length&&<p>尚無習得戰法，仍可率軍出戰。</p>}{learned.length>6&&<div className="ec-pager"><button className="ec-control" disabled={!skillPage} onClick={()=>setSkillPage(skillPage-1)}>上一頁</button><button className="ec-control" disabled={(skillPage+1)*6>=learned.length} onClick={()=>setSkillPage(skillPage+1)}>下一頁</button></div>}</section><section><h2>兵種配比</h2><img className="ec-soldiers" src="/art/ui/campaign/troops-icon-v1.png" alt="步弓兵配置"/><p>步兵 <strong>{state.infantryPercent}%</strong>　弓兵 <strong>{100-state.infantryPercent}%</strong></p><div className="ec-ratio"><button className="ec-control" disabled={state.infantryPercent===0} aria-label="減少步兵" onClick={()=>act(()=>s.configureEventChallenge(state.skills,Math.max(0,state.infantryPercent-10)))}>−</button><input aria-label="步兵比例" type="range" min="0" max="100" step="10" value={state.infantryPercent} onChange={e=>act(()=>s.configureEventChallenge(state.skills,Number(e.target.value)))}/><button className="ec-control" disabled={state.infantryPercent===100} aria-label="增加步兵" onClick={()=>act(()=>s.configureEventChallenge(state.skills,Math.min(100,state.infantryPercent+10)))}>＋</button></div><p className="ec-note">技能與兵力沿用本輪養成。</p></section></div><button className="ec-control ec-depart" onClick={()=>act(()=>s.enterEventChallenge())}>整備完成・出陣</button></div>;
 }
 const stage=state.definition.stages?.[state.stage??0],intermission=state.phase==='intermission';
 const result=state.phase==='result',text=intermission?stage!.victory:result?state.definition.outcomes[state.outcome!]+(state.outcome==='retreat'&&stage?'\n獎勵：獲得 '+(state.definition.cashOutGold?.[state.completed??0]??0)+' 金。':''):stage?.opening??state.definition.opening,lines=challengeLines(text);
 return <ChallengeConversation text={text} page={page} opponent={stageChallenge(state).opponentName} mode={stageChallenge(state).mode} profile={careerPresentation('war',s.current.career)}><button className="ec-control ec-next" onClick={()=>{if(page+1<lines.length)setPage(page+1);else{setPage(0);if(result)onDone();else if(intermission)act(()=>s.continueEventChallenge());else act(()=>s.enterEventChallenge());}}}>{page+1<lines.length?'繼續':result?'記下此事':intermission?'繼續挑戰':stageChallenge(state).mode==='battle'?'整備出陣':'請賜教'}</button>{state.canDecline&&state.phase==='opening'&&<button className="ec-control ec-cashout" onClick={()=>{setPage(0);act(()=>s.retreatEventChallenge());}}>改日再論</button>}{stage&&!result&&<button className="ec-control ec-cashout" onClick={()=>{setPage(0);act(()=>s.retreatEventChallenge());}}>放棄挑戰・領取 {state.definition.cashOutGold?.[state.completed??0]??0} 金</button>}</ChallengeConversation>;
}




