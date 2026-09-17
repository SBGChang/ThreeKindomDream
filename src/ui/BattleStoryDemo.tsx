import {useEffect,useRef,useState} from 'react';
import {validateBattleStory} from '../app/battle-story.js';
import {advanceFieldStory,answerFieldDuel,castFieldSkill,createStoryField,fieldDialogueVisible,startStoryField,tickStoryField,type StoryField} from '../app/battle-story-field.js';
import type {BattleStory} from '../contracts/core/battle-story.js';
import {DUEL_ACTIONS} from '../app/duel-model.js';
import {drawEncounterDemo} from './confrontation-render.js';
import {drawBattle,loadBattleImages,type BattleImages} from './realtime-battle-render.js';
import {loadDuelImages} from './duel-art.js';
import {ArmyHud,SkillButton,SupplyBags} from './BattleHud.js';
import {DuelBattleOverlay} from './DuelBattleOverlay.js';
import {DuelVitals} from './DuelHud.js';
import {BattleStoryDialogue} from './BattleStoryDialogue.js';
import './realtime-battle-demo.css';
import './battle-hud.css';
import './battle-story-field.css';

export function BattleStoryDemo():React.ReactElement {
 const model=useRef<StoryField|null>(null),images=useRef<BattleImages|null>(null),canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null);
 const [data,setData]=useState<BattleStory|null>(null),[state,setState]=useState<StoryField|null>(null),[error,setError]=useState(''),[scale,setScale]=useState(1),[speed,setSpeed]=useState(1);
 const speedRef=useRef(speed),[help,setHelp]=useState(false);speedRef.current=speed;
 const sync=()=>{if(model.current)setState({...model.current,story:{...model.current.story}});};
 useEffect(()=>{let alive=true;void fetch('./demo/hulao-story.json').then(r=>{if(!r.ok)throw Error('劇本載入失敗');return r.json();}).then(async raw=>{
  const d=validateBattleStory(raw),s=createStoryField(d);
  const [b,p]=await Promise.all([loadBattleImages(undefined,s.encounter.battle.commanders,s.encounter.battle.waveNames),loadDuelImages(Object.values(d.actors).map(a=>a.art))]);
  if(!alive)return;images.current={...b,...p};model.current=s;setData(d);sync();startStoryField(s);
 }).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!data)return;const el=stage.current!;const resize=()=>setScale(el.clientWidth/1280);resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[data]);
 useEffect(()=>{if(!data)return;let raf=0,last=performance.now(),acc=0,uiAt=0;
  const frame=(now:number)=>{const dt=Math.min(.1,(now-last)/1000);last=now;
   if(!document.hidden){acc+=dt*speedRef.current;while(acc>=1/60){tickStoryField(data,model.current!,1/60);acc-=1/60;}}
   const ctx=canvas.current?.getContext('2d'),s=model.current!;
   if(ctx&&images.current){if(s.encounter.contest)drawEncounterDemo(ctx,images.current,s.encounter);else drawBattle(ctx,images.current,s.encounter.battle);}
   if(now-uiAt>40){sync();uiAt=now;}raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[data]);
 useEffect(()=>{const hidden=()=>{if(document.hidden&&model.current){model.current.paused=true;sync();}};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
 const reset=()=>{if(!data)return;model.current=createStoryField(data);startStoryField(model.current);setHelp(false);sync();};
 if(!data||!state)return <main className="rt-shell"><div className="rt-scroll"><h1>虎牢關 · 兵馬入陣</h1><p role={error?'alert':'status'}>{error||'正在展開戰場…'}</p>{error&&<button onClick={()=>location.reload()}>重新載入</button>}</div></main>;
 const s=state,b=s.encounter.battle,c=s.encounter.contest,n=data.nodes[s.story.node]!,talk=fieldDialogueVisible(data,s);
 const next=(choice?:string)=>{advanceFieldStory(data,model.current!,s.story.revision,choice);sync();};
 const pause=()=>{model.current!.paused=!model.current!.paused;sync();};
 const answer=(i:number)=>{const action=DUEL_ACTIONS[i];if(action)answerFieldDuel(data,model.current!,action);sync();};
 return <main className="rt-shell"><div ref={stage} className={`rt-battle bsf-field ${c?'ct-battle ct-duel':''}`} data-mode={s.mode} data-node={s.triggered?s.story.node:'march'} data-phase={b.phase} data-time={b.time} data-contest-phase={c?.phase??'none'}>
  <canvas ref={canvas} width={1600} height={900} aria-label="虎牢關即時戰場"/>
  {!c&&!talk&&<><ArmyHud state={b}/><ArmyHud state={b} enemy/><div className="rt-timer"><strong>{Math.ceil(b.duration-b.time)}</strong><small>{b.phase==='combat'?'交戰':'列陣'}</small></div><SupplyBags state={b}/><nav className="rt-command" aria-label="戰法操作區"><section className="rt-skill-group"><h2>戰法</h2><div>{b.skills.slice(0,3).map(skill=><SkillButton key={skill.id} skill={skill} state={b} onCast={id=>{castFieldSkill(model.current!,id);sync();}}/>)}</div></section></nav></>}
  {c&&!talk&&(n.kind==='combat'&&n.mode==='player'?<DuelBattleOverlay contest={c} paused={s.paused} onAnswer={answer} onHelpChange={open=>{model.current!.paused=open;setHelp(open);sync();}}/>:<><DuelVitals fighter={c.duel!.ally} name={c.allyName} actorId={c.allyId}/><DuelVitals fighter={c.duel!.enemy} name={c.enemyName} actorId={c.enemyId} enemy/><div className="bsf-auto">{n.kind==='combat'?n.title:''} · 雙方自動交鋒{c.phase==='verdict'&&<strong>{c.winner==='enemy'?c.enemyName:c.allyName}得勝</strong>}</div></>)}
  {c&&n.kind==='combat'&&!talk&&<div className="bsf-buffs">{(['ally','enemy'] as const).flatMap(side=>n[side].modifiers.map(m=><span key={side+m.label}>{data.actors[n[side].actor]!.name}：{m.label}</span>))}</div>}
  {!talk&&b.phase==='start'&&<div className="rt-wave-start"><small>第一關 · 虎牢</small><img src="./art/ui/campaign/battle-start-v1.png" alt="開戰"/></div>}
  {talk&&<div className="game-stage bsf-dialogue-stage" style={{transform:`scale(${scale})`}}><BattleStoryDialogue data={data} run={s.story} onNext={next}/></div>}
  <aside className="bsf-tools"><span>虎牢關 · {s.mode==='story'?'戰場暫停，事件進行中':'第一陣'}</span><label>速度 <select aria-label="演出速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label><button onClick={pause}>{s.paused?'繼續戰鬥':'暫停'}</button><button onClick={reset}>重新入陣</button></aside>
  {s.paused&&!help&&<div className="rt-overlay bsf-paused"><section className="rt-scroll"><h1>鳴鼓待命</h1><button onClick={pause}>繼續戰鬥</button></section></div>}
  {s.mode==='finished'&&<div className="rt-overlay"><section className="rt-scroll" role="dialog" aria-label="虎牢關結算"><h1>{b.reason}</h1><p>{s.story.items.join('、')||'本次未取得單挑寶物'}</p><p>統 {s.story.stats.lead}　武 {s.story.stats.war}　智 {s.story.stats.int}　政 {s.story.stats.pol}　黃金 {s.story.gold}</p><small>獨立戰場試玩，不寫入正式存檔。</small><button onClick={reset}>再戰虎牢</button></section></div>}
 </div></main>;
}
