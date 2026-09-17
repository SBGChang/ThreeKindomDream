import {useEffect,useRef,useState} from 'react';
import {actRally,chooseRallyAction,createRally,forecastRally,rallyHandSize,rallyNormals,rallyOpponentHand,rallyPlayable,rallySpecialPlayable} from '../app/debate-rally-model.js';
import type {RallyAction,RallyBuild,RallyFighter,RallySide} from '../contracts/core/debate-rally.js';
import {RALLY_COLORS,RALLY_PASSIVES,RALLY_PROFILES,RALLY_SPECIALS,rallyProfile} from '../app/debate-traits.js';
import {loadBattleImages,type BattleImages} from './realtime-battle-render.js';
import {loadDebateImages} from './debate-art.js';
import {drawRally} from './rally-render.js';
import {RallyCard,rallyCardLabel} from './RallyCard.js';
import {DuelPortrait} from './DuelPortrait.js';
import {DebateIcon} from './DebateVisuals.js';
import './realtime-battle-demo.css';
import './confrontation-demo.css';
import './duel-hud.css';
import './card-debate.css';
import './rally-debate.css';

function Vitals({side,f,value,forecast,comboPreview}:{side:RallySide;f:RallyFighter;value:number;forecast:number;comboPreview:boolean}){
 const enemy=side==='enemy',name=enemy?'敵軍指揮官':'郭嘉',lo=Math.min(value,forecast),hi=Math.max(value,forecast);
 return <section className={`dx-fighter db-fighter dx-fighter-${side}`} aria-label={`${enemy?'敵方':'我方'}舌戰狀態`}>
  <div className="dx-face-medallion"><div className="dx-face-image"><DuelPortrait id={enemy?'npc_soldier':'guojia'} name={name}/></div></div>
  <div className="dx-fighter-bars"><h2>{name}<small>智 {f.build.int}</small></h2><div className="dx-fight-meter"><div role="progressbar" aria-label={`${enemy?'敵方':'我方'}心防`} aria-valuenow={value} aria-valuemax={f.maxHeart} aria-valuemin={0} aria-valuetext={forecast!==value?`目前 ${value}，預估 ${forecast}`:`${value}`}><i style={{width:`${lo/f.maxHeart*100}%`}}/>{lo!==hi&&<em className={`rally-hp-forecast ${forecast>value?'rally-gain':''}`} style={{[enemy?'right':'left']:`${lo/f.maxHeart*100}%`,width:`${(hi-lo)/f.maxHeart*100}%`}}/>}</div><span className="db-meter-value">{value} / {f.maxHeart}</span></div>
   <div className="rally-trait-tags">{f.build.special&&<span title={RALLY_SPECIALS[f.build.special].description}>{RALLY_SPECIALS[f.build.special].trait}</span>}{f.build.passives.map(p=><span key={p} title={RALLY_PASSIVES[p].description}>{RALLY_PASSIVES[p].name}</span>)}</div>
   <div className="rally-buffs">{f.double&&<span title="下一張傷害翻倍"><DebateIcon card="pressure"/></span>}{f.reflect&&<span title="反彈下次傷害"><DebateIcon card="rebut"/></span>}{f.wild&&<span title="下一張無視規則"><DebateIcon card="borrow"/></span>}{f.skip&&<span title="下回合無法出牌">休</span>}</div>
  </div><div className={`dx-fight-combo ${f.combo||comboPreview?'dx-combo-active':''} ${comboPreview?'rally-pulse':''}`}><strong>{f.combo+(comboPreview?1:0)}</strong><span>Combo</span></div>
 </section>;
}
function BuildEditor({side,build,profile,onChange}:{side:string;build:RallyBuild;profile:string;onChange:(v:RallyBuild,profile?:string)=>void}){
 return <fieldset><legend>{side}配法</legend><label>武將範本<select value={profile} onChange={e=>{if(e.target.value)onChange(structuredClone(rallyProfile(e.target.value).build),e.target.value);}}><option value="">自訂配法</option>{RALLY_PROFILES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {(['int','pol'] as const).map(k=><label key={k}>{k==='int'?'智力':'政治'}<input aria-label={`${side}${k==='int'?'智力':'政治'}`} type="number" min={1} max={100} value={build[k]} onChange={e=>onChange({...build,[k]:Math.max(1,Math.min(100,Number(e.target.value)||1))})}/></label>)}
  <label>特殊牌來源<select aria-label={`${side}特殊牌來源`} value={build.special??''} onChange={e=>onChange({...build,special:e.target.value as RallyBuild['special']||null})}><option value="">無 · 僅普通牌</option>{Object.entries(RALLY_SPECIALS).map(([k,v])=><option key={k} value={k}>{v.trait} · {v.name}</option>)}</select></label>
  <div className="rally-passive-picker" aria-label={`${side}被動特性，最多兩項`}>{Object.entries(RALLY_PASSIVES).map(([key,v])=>{const p=key as RallyBuild['passives'][number],checked=build.passives.includes(p);return <label key={p} title={v.description}><input type="checkbox" checked={checked} disabled={!checked&&build.passives.length>=2} onChange={()=>onChange({...build,passives:checked?build.passives.filter(v=>v!==p):[...build.passives,p]})}/>{v.name}</label>;})}</div>
  <p>{build.special?RALLY_SPECIALS[build.special].description:'不會抽到特殊牌。'}</p><strong className="db-hand-count">起手 {rallyHandSize(build.int)+(build.passives.includes('scholar')?1:0)} 張</strong>
 </fieldset>;
}
export function RallyDebateDemo():React.ReactElement {
 const [builds,setBuilds]=useState({ally:structuredClone(rallyProfile('guojia').build),enemy:structuredClone(rallyProfile('npc_soldier').build)});
 const [profiles,setProfiles]=useState({ally:'guojia',enemy:'npc_soldier'});
 const model=useRef(createRally()),images=useRef<BattleImages|null>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [s,setS]=useState({...model.current}),[ready,setReady]=useState(false),[error,setError]=useState(''),[menu,setMenu]=useState(true),[paused,setPaused]=useState(false),[help,setHelp]=useState(false),[hover,setHover]=useState<number|null>(null),[induct,setInduct]=useState<number|null>(null),[targets,setTargets]=useState<number[]>([]),[time,setTime]=useState(0),[busy,setBusy]=useState(false);
 const controls=useRef({menu,paused,help}),motion=useRef({active:false,time:0,think:0});controls.current={menu,paused,help};
 const sync=()=>setS({...model.current});
 const run=(side:RallySide,action:RallyAction)=>{if(actRally(model.current,side,action)){motion.current={active:true,time:0,think:0};setBusy(true);setTime(0);setHover(null);setInduct(null);setTargets([]);sync();}};
 const locked=menu||paused||help||busy||s.turn!=='ally'||!!s.winner;
 const play=(id:number)=>{
  if(locked)return;const c=model.current.ally.hand.find(c=>c.id===id);if(!c)return;
  if(induct!==null){if(c.kind!=='normal')return;const next=targets.includes(id)?targets.filter(v=>v!==id):[...targets,id];setTargets(next);if(next.length===2)run('ally',{kind:'special',id:induct,targets:next});return;}
  if(c.kind==='special'&&c.special==='induct'&&rallySpecialPlayable(model.current,'ally',c)){setInduct(id);setTargets([]);setHover(null);return;}
  run('ally',{kind:c.kind,id});
 };
 const start=()=>{model.current=createRally(builds.ally,builds.enemy,Date.now());motion.current={active:false,time:0,think:0};setBusy(false);setTime(0);setHover(null);setInduct(null);setTargets([]);setPaused(false);setMenu(false);sync();};
 useEffect(()=>{let alive=true;void Promise.all([loadBattleImages(),loadDebateImages()]).then(([im,art])=>{if(alive){images.current={...im,...art};setReady(true);}}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!ready)return;let raf=0,previous=performance.now(),ui=0;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame=(now:number)=>{const dt=Math.min(.05,(now-previous)/1000);previous=now;const c=controls.current,m=motion.current,d=model.current;
   if(!c.menu&&!c.paused&&!c.help){
    if(m.active){m.time+=dt;if(m.time>=1.8){m.active=false;m.think=0;setBusy(false);}}
    else if(!d.winner&&(d.turn==='enemy'||d[d.turn].skip)){m.think+=dt;if(m.think>=.65)run(d.turn,chooseRallyAction(d));}
   }
   const ctx=canvas.current?.getContext('2d');if(ctx&&images.current)drawRally(ctx,images.current,d,m.time,m.active,reduced);
   if(now-ui>50){setTime(m.time);ui=now;}raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[ready]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
  if(e.key==='Escape'){if(help)setHelp(false);else if(induct!==null){setInduct(null);setTargets([]);}else if(!menu)setPaused(p=>!p);e.preventDefault();return;}
  if(locked)return;if(/^[1-9]$/.test(e.key)){const c=s.ally.hand[Number(e.key)-1];if(c){e.preventDefault();play(c.id);}}else if(e.key.toLowerCase()==='s'&&!rallyNormals(s).length){e.preventDefault();run('ally',{kind:'pass'});}
 };const hidden=()=>{if(document.hidden&&!menu)setPaused(true);};window.addEventListener('keydown',key);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hidden);};});
 const preview=!locked&&induct===null&&hover!==null?forecastRally(s,'ally',hover):null;
 const event=s.last,showBefore=busy&&time<.7,hand=rallyOpponentHand(s,'ally'),normalCount=rallyNormals(s,'ally').length;
 const hoverCard=s.ally.hand.find(c=>c.id===hover),specialHover=!locked&&hoverCard?.kind==='special'&&rallySpecialPlayable(s,'ally',hoverCard)?hoverCard.special:null;
 const chosen=s.ally.hand.filter(c=>targets.includes(c.id)),hoverTarget=s.ally.hand.find(c=>c.id===hover&&c.kind==='normal');
 const projected=[...chosen,...(hoverTarget&&!targets.includes(hoverTarget.id)&&chosen.length<2?[hoverTarget]:[])];
 const sum=projected.length===2?Math.min(9,projected.reduce((n,c)=>n+(c.kind==='normal'?c.value:0),0)):undefined;
 return <main className="rt-shell"><div className="rt-battle ct-battle cb-battle rally-battle" data-paused={paused||help} data-phase={menu?'setup':busy?'animation':s.winner?'finished':s.turn}>
  <canvas ref={canvas} width={1600} height={900} aria-label="輪流接牌舌戰演出"/>
  {!menu&&<><Vitals side="ally" f={s.ally} value={showBefore&&event?event.before.ally:s.ally.heart} forecast={showBefore&&event?event.after.ally:preview?.ally??s.ally.heart} comboPreview={!!preview&&s.lastPass==='enemy'}/><Vitals side="enemy" f={s.enemy} value={showBefore&&event?event.before.enemy:s.enemy.heart} forecast={showBefore&&event?event.after.enemy:preview?.enemy??s.enemy.heart} comboPreview={false}/>
   <div className="rally-turn"><small>第 {s.turnNumber} 手</small><strong>{s.winner?'辯論終了':busy?'論戰中':s.turn==='ally'?'請出牌':'對方思考'}</strong></div>
   <section className="rally-enemy-hand" aria-label={`對手 ${hand.length} 張牌，只顯示牌色`}>{hand.map((c,i)=><span key={i} className="rally-back" data-color={c.color} role="img" aria-label={c.color==='special'?'未知特殊牌':`${RALLY_COLORS[c.color].name}牌，點數隱藏`}><span aria-hidden="true">{c.color==='special'?'策':RALLY_COLORS[c.color].name[0]}</span></span>)}</section>
   <div className="rally-table">{s.table?<RallyCard card={s.table} interactive={false}/>:<div className="rally-open">另起<br/><small>任意出牌</small></div>}</div>
   <div className="rally-event" role="status" aria-live="polite">{induct!==null?`歸納 · 選擇兩張普通牌（${targets.length}/2）`:busy&&event?event.kind==='restart'?'雙方無牌可接 · 另起':event.kind==='pass'?`${event.side==='ally'?'我方':'敵方'}跳過 · 補牌`:`${event.side==='ally'?'我方':'敵方'} · ${event.card?rallyCardLabel(event.card):''}${event.reflected?' · 傷害反彈':''}`:s.specialUsed&&s.turn==='ally'?'特殊牌已用 · 請出普通牌':s.turn==='ally'?'同色更高 · 同點換色':''}</div>
   <section className="rally-hand" aria-label="我方手牌">{s.ally.hand.map((c,i)=><RallyCard key={c.id} card={c} index={i} locked={locked||(induct!==null?c.kind!=='normal':c.kind==='normal'?!rallyPlayable(s,'ally',c):!rallySpecialPlayable(s,'ally',c))} selected={targets.includes(c.id)||induct===c.id} {...(sum!==undefined&&projected.some(v=>v.id===c.id)?{previewValue:sum}:{})} onHover={setHover} onClick={()=>play(c.id)}/>)}{specialHover==='concentrate'&&[0,1,2].map(i=><span key={`draw-${i}`} className="rally-draw-preview rally-pulse">?</span>)}</section>
   <div className="rally-action-rail">{induct!==null?<button onClick={()=>{setInduct(null);setTargets([]);}}>取消歸納</button>:<button disabled={locked||normalCount>0} onClick={()=>run('ally',{kind:'pass'})} title="無普通牌可接時，跳過並補牌">跳過補牌 <kbd>S</kbd></button>}<small>{s.ally.hand.length} 張 · 特殊牌 {s.specialUsed?0:1}/1</small>{specialHover&&<span className="rally-special-preview rally-pulse" title={RALLY_SPECIALS[specialHover].description}><DebateIcon card={RALLY_SPECIALS[specialHover].motion}/></span>}</div>
  </>}
  <nav className="rally-toolbar"><a href="?art=confrontation-demo">‹ 單挑</a><button onClick={()=>setHelp(true)}>玩法與特性</button>{!menu&&<button onClick={()=>setPaused(p=>!p)}>{paused?'繼續':'暫停'}</button>}</nav>
  {menu&&<div className="ct-overlay"><section className="cb-setup rally-setup" role="dialog" aria-label="輪流接牌試配"><h1>你一句 · 我一句</h1><p>三色接牌 · 1–9 點 · 心防歸零即敗</p><div className="cb-builds">{(['ally','enemy'] as const).map(side=><BuildEditor key={side} side={side==='ally'?'我方':'敵方'} build={builds[side]} profile={profiles[side]} onChange={(v,profile)=>{setBuilds(b=>({...b,[side]:v}));setProfiles(p=>({...p,[side]:profile??''}));}}/>)}</div><footer><button onClick={()=>setHelp(true)}>玩法與特性</button><button disabled={!ready||!!error} onClick={start}>{ready?'開始辯論':'素材整備中…'}</button></footer>{error&&<p role="alert">{error}</p>}</section></div>}
  {paused&&!menu&&!help&&<div className="ct-overlay"><section className="ct-pause-menu" role="dialog" aria-label="舌戰暫停"><h1>暫歇片刻</h1><button onClick={()=>setPaused(false)}>繼續舌戰</button><button onClick={()=>{setMenu(true);setPaused(false);}}>重新試配</button></section></div>}
  {s.winner&&!busy&&!menu&&<div className="ct-overlay"><section className="ct-pause-menu" role="dialog" aria-label="舌戰結果"><h1>{s.winner==='ally'?'辯勝':'失辯'}</h1><p>{s.turnNumber-1} 手 · 另起 {s.restarts} 次</p><button onClick={start}>再辯一場</button><button onClick={()=>setMenu(true)}>調整特性</button></section></div>}
  {help&&<div className="ct-overlay cb-modal"><section className="cb-rules rally-guide" role="dialog" aria-modal="true" aria-label="輪流接牌玩法"><button className="cb-close" onClick={()=>setHelp(false)} aria-label="關閉玩法">×</button><h2>同色更高 · 同點換色</h2><p>三色皆有 1–9 點。普通牌造成傷害後補一張；每回合最多先用一張特殊牌，不補牌、不結束回合。滑過預估，點擊出牌。</p><p>接不了就跳過補一張；雙方連續跳過則重抽，由最後跳過者任意開局。對手跳過後繼續出牌累積 Combo，每段提高 20% 傷害；對手出普通牌或另起即歸零。</p><p>智力提高起手張數、高點牌機率與傷害；政治增加心防。對手只公開牌色，特殊牌顯示「策」。</p><div className="rally-guide-grid">{Object.values(RALLY_SPECIALS).map(v=><article key={v.name}><DebateIcon card={v.motion}/><strong>{v.name} · {v.trait}</strong><p>{v.description}</p></article>)}</div><div className="rally-passive-guide">{Object.values(RALLY_PASSIVES).map(v=><p key={v.name}><b>{v.name}</b>：{v.description}</p>)}</div><p>歸納點擊後選兩張普通牌，第二張點下即生效；Escape 取消。1–9 出對應手牌，S 跳過，Escape 暫停。無出牌時間限制。</p><button onClick={()=>setHelp(false)}>明白了</button></section></div>}
 </div></main>;
}
