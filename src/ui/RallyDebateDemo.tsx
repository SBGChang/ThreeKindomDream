import {RallyGuide} from './RallyGuide.js';
import {sortedRallyHand,rallyFanSlot} from './rally-hand-layout.js';
import {duelActorForName} from '../contracts/core/duel-art.js';
import {RallyTraits} from './RallyTraits.js';
import {useEffect,useRef,useState} from 'react';
import {actRally,chooseRallyAction,createRally,forecastRally,rallyHandSize,rallyMustPass,rallyOpponentHand,rallyPlayable,rallySpecialPlayable} from '../app/debate-rally-model.js';
import type {RallyAction,RallyBuild,RallyFighter,RallySide} from '../contracts/core/debate-rally.js';
import {RALLY_COLORS,RALLY_PASSIVES,RALLY_PROFILES,RALLY_SPECIALS,rallyProfile,rallySpecialSources} from '../app/debate-traits.js';
import {loadBattleImages,type BattleImages} from './realtime-battle-render.js';
import {loadDebateImages} from './debate-art.js';
import {drawRally} from './rally-render.js';
import {RallyCard,RallyBack,rallyCardLabel,preloadRallyCards} from './RallyCard.js';
import {DuelPortrait} from './DuelPortrait.js';
import {DebateIcon} from './DebateVisuals.js';
import './realtime-battle-demo.css';
import './confrontation-demo.css';
import './duel-hud.css';
import './card-debate.css';
import './rally-debate.css';

function Vitals({side,f,value,forecast,comboPreview,displayName}:{side:RallySide;f:RallyFighter;value:number;forecast:number;comboPreview:boolean;displayName?:string}){
 const enemy=side==='enemy',name=displayName??(enemy?'敵軍指揮官':'郭嘉'),lo=Math.min(value,forecast),hi=Math.max(value,forecast);
 return <section className={`dx-fighter db-fighter dx-fighter-${side}`} aria-label={`${enemy?'敵方':'我方'}舌戰狀態`}>
  <div className="dx-face-medallion"><div className="dx-face-image"><DuelPortrait id={enemy?duelActorForName(name):displayName?'lord':'guojia'} name={name}/></div></div>
  <div className="dx-fighter-bars"><h2>{name}<small>智 {f.build.int}</small></h2><div className="dx-fight-meter"><div role="progressbar" aria-label={`${enemy?'敵方':'我方'}心防`} aria-valuenow={value} aria-valuemax={f.maxHeart} aria-valuemin={0} aria-valuetext={forecast!==value?`目前 ${value}，預估 ${forecast}`:`${value}`}><i style={{width:`${lo/f.maxHeart*100}%`}}/>{lo!==hi&&<em className={`rally-hp-forecast ${forecast>value?'rally-gain':''}`} style={{[enemy?'right':'left']:`${lo/f.maxHeart*100}%`,width:`${(hi-lo)/f.maxHeart*100}%`}}/>}</div><span className="db-meter-value">{value} / {f.maxHeart}</span></div>
   <RallyTraits build={f.build}/>
   <div className="rally-buffs">{f.double&&<span title="下一張傷害翻倍"><DebateIcon card="pressure"/></span>}{f.reflect&&<span title="反彈下次傷害"><DebateIcon card="rebut"/></span>}{f.wild&&<span title="下一張無視規則"><DebateIcon card="borrow"/></span>}{f.skip&&<span title="下回合無法出牌">休</span>}</div>
  </div><div className={`dx-fight-combo ${f.combo||comboPreview?'dx-combo-active':''} ${comboPreview?'rally-pulse':''}`}><strong>{f.combo+(comboPreview?1:0)}</strong><span>Combo</span></div>
 </section>;
}
function BuildEditor({side,build,profile,onChange}:{side:string;build:RallyBuild;profile:string;onChange:(v:RallyBuild,profile?:string)=>void}){
 return <fieldset><legend>{side}配法</legend><label>武將範本<select value={profile} onChange={e=>{if(e.target.value)onChange(structuredClone(rallyProfile(e.target.value).build),e.target.value);}}><option value="">自訂配法</option>{RALLY_PROFILES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {(['int','pol'] as const).map(k=><label key={k}>{k==='int'?'智力':'政治'}<input aria-label={`${side}${k==='int'?'智力':'政治'}`} type="number" min={1} max={100} value={build[k]} onChange={e=>onChange({...build,[k]:Math.max(1,Math.min(100,Number(e.target.value)||1))})}/></label>)}
  <div className="rally-passive-picker" role="group" aria-label={`${side}特殊牌來源，可複選`}>{Object.entries(RALLY_SPECIALS).map(([key,v])=>{const k=key as NonNullable<RallyBuild['special']>,sources=rallySpecialSources(build),checked=sources.includes(k);return <label key={k}><input type="checkbox" checked={checked} onChange={()=>onChange({...build,specials:checked?sources.filter(v=>v!==k):[...sources,k]})}/>{v.trait} · {v.name}</label>;})}</div>
  <div className="rally-passive-picker" aria-label={`${side}被動特性，最多兩項`}>{Object.entries(RALLY_PASSIVES).map(([key,v])=>{const p=key as RallyBuild['passives'][number],checked=build.passives.includes(p);return <label key={p} title={v.description}><input type="checkbox" checked={checked} disabled={!checked&&build.passives.length>=2} onChange={()=>onChange({...build,passives:checked?build.passives.filter(v=>v!==p):[...build.passives,p]})}/>{v.name}</label>;})}</div>
  <p>{rallySpecialSources(build).length?'所選特技的特殊牌皆可抽到；使用後補一張普通牌。':'不會抽到特殊牌。'}</p><strong className="db-hand-count">起手 {rallyHandSize(build.int)+(build.passives.includes('scholar')?1:0)} 張</strong>
 </fieldset>;
}
export interface CampaignDebateBinding {onPause:(paused:boolean)=>void;state:import('../contracts/core/debate-rally.js').RallyState;enemyName:string;onAction:(side:RallySide,action:RallyAction)=>boolean;onDone:()=>void}
export function RallyDebateDemo({campaign}:{campaign?:CampaignDebateBinding}={}):React.ReactElement {
 const [builds,setBuilds]=useState({ally:structuredClone(rallyProfile('guojia').build),enemy:structuredClone(rallyProfile('npc_soldier').build)});
 const [profiles,setProfiles]=useState({ally:'guojia',enemy:'npc_soldier'});
 const model=useRef(campaign?.state??createRally()),images=useRef<BattleImages|null>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [s,setS]=useState({...model.current}),[ready,setReady]=useState(false),[error,setError]=useState(''),[menu,setMenu]=useState(!campaign),[help,setHelp]=useState(false),[hover,setHover]=useState<number|null>(null),[induct,setInduct]=useState<number|null>(null),[targets,setTargets]=useState<number[]>([]),[time,setTime]=useState(0),[busy,setBusy]=useState(false);
 useEffect(()=>{campaign?.onPause(false);},[]);
 const controls=useRef({menu,help}),motion=useRef({active:false,time:0,think:0});controls.current={menu,help};
 const sync=()=>setS({...model.current});
 const run=(side:RallySide,action:RallyAction)=>{if(campaign?campaign.onAction(side,action):actRally(model.current,side,action)){motion.current={active:true,time:0,think:0};setBusy(true);setTime(0);setHover(null);setInduct(null);setTargets([]);sync();}};
 const locked=menu||help||busy||s.turn!=='ally'||!!s.winner;
 const play=(id:number)=>{
  if(locked)return;const c=model.current.ally.hand.find(c=>c.id===id);if(!c)return;
  if(induct!==null){if(c.kind!=='normal')return;const next=targets.includes(id)?targets.filter(v=>v!==id):[...targets,id];setTargets(next);if(next.length===2)run('ally',{kind:'special',id:induct,targets:next});return;}
  if(c.kind==='special'&&c.special==='induct'&&rallySpecialPlayable(model.current,'ally',c)){setInduct(id);setTargets([]);setHover(null);return;}
  run('ally',{kind:c.kind,id});
 };
 const start=()=>{model.current=createRally(builds.ally,builds.enemy,Date.now());motion.current={active:false,time:0,think:0};setBusy(false);setTime(0);setHover(null);setInduct(null);setTargets([]);setMenu(false);sync();};
 useEffect(()=>{let alive=true;void Promise.all([loadBattleImages(),loadDebateImages(),preloadRallyCards()]).then(([im,art])=>{if(alive){images.current={...im,...art};setReady(true);}}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!ready)return;let raf=0,previous=performance.now(),ui=0;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame=(now:number)=>{const dt=Math.min(.05,(now-previous)/1000);previous=now;const c=controls.current,m=motion.current,d=model.current;
   if(!c.menu&&!c.help){
    if(m.active){m.time+=dt;if(m.time>=1.8){m.active=false;m.think=0;setBusy(false);}}
    else if(!d.winner&&(d.turn==='enemy'||rallyMustPass(d))){m.think+=dt;if(m.think>=.65)run(d.turn,rallyMustPass(d)?{kind:'pass'}:chooseRallyAction(d));}
   }
   const ctx=canvas.current?.getContext('2d');if(ctx&&images.current)drawRally(ctx,images.current,d,m.time,m.active,reduced,!!campaign);
   if(now-ui>50){setTime(m.time);ui=now;}raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[ready]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
  if(e.key==='Escape'){if(help)setHelp(false);else if(induct!==null){setInduct(null);setTargets([]);}e.preventDefault();return;}
  if(locked)return;if(/^[1-9]$/.test(e.key)){const c=sortedRallyHand(s.ally.hand)[Number(e.key)-1];if(c){e.preventDefault();play(c.id);}}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const preview=!locked&&induct===null&&hover!==null?forecastRally(s,'ally',hover):null;
 const displayHand=sortedRallyHand(s.ally.hand);
 const event=s.last,showBefore=busy&&time<.7,hand=rallyOpponentHand(s,'ally');
 const hoverCard=s.ally.hand.find(c=>c.id===hover),specialHover=!locked&&hoverCard?.kind==='special'&&rallySpecialPlayable(s,'ally',hoverCard)?hoverCard.special:null;
 const inspectedSpecial=!menu&&!help&&induct===null&&hoverCard?.kind==='special'?hoverCard:null;
 const chosen=s.ally.hand.filter(c=>targets.includes(c.id)),hoverTarget=s.ally.hand.find(c=>c.id===hover&&c.kind==='normal');
 const projected=[...chosen,...(hoverTarget&&!targets.includes(hoverTarget.id)&&chosen.length<2?[hoverTarget]:[])];
 const sum=projected.length===2?Math.min(9,projected.reduce((n,c)=>n+(c.kind==='normal'?c.value:0),0)):undefined;
 return <main className="rt-shell"><div className="rt-battle ct-battle cb-battle rally-battle" data-paused={help} data-phase={menu?'setup':busy?'animation':s.winner?'finished':s.turn}>
  <canvas ref={canvas} width={1600} height={900} aria-label="輪流接牌舌戰演出"/>
  {!menu&&<><Vitals displayName={campaign?'你':'郭嘉'} side="ally" f={s.ally} value={showBefore&&event?event.before.ally:s.ally.heart} forecast={showBefore&&event?event.after.ally:preview?.ally??s.ally.heart} comboPreview={!!preview&&s.lastPass==='enemy'}/><Vitals displayName={campaign?.enemyName??'敵軍指揮官'} side="enemy" f={s.enemy} value={showBefore&&event?event.before.enemy:s.enemy.heart} forecast={showBefore&&event?event.after.enemy:preview?.enemy??s.enemy.heart} comboPreview={false}/>
   <div className="rally-turn"><small>第 {s.turnNumber} 手</small><strong>{s.winner?'辯論終了':busy?'論戰中':s.turn==='ally'?'請出牌':'對方思考'}</strong></div>
   <section className="rally-enemy-hand" aria-label={`對手 ${hand.length} 張牌，只顯示牌色`}>{hand.map((c,i)=><RallyBack key={i} color={c.color} label={c.color==='special'?'未知特殊牌':`${RALLY_COLORS[c.color].name}牌，點數隱藏`}/>)}</section>
   <div className="rally-table">{s.table?<RallyCard card={s.table} interactive={false}/>:<img className="rally-open" src="./art/debate/rally-opening-stand-v1.png" alt="另起，可任意出牌"/>}</div>
   <div className="rally-screen-reader" role="status" aria-live="polite">{induct!==null?`歸納 · 選擇兩張普通牌（${targets.length}/2）`:busy&&event?event.kind==='restart'?'雙方無牌可接 · 另起':event.kind==='pass'?`${event.side==='ally'?'我方':'敵方'}跳過 · 補牌`:`${event.side==='ally'?'我方':'敵方'} · ${event.card?rallyCardLabel(event.card):''}${event.reflected?' · 傷害反彈':''}`:s.specialUsed&&s.turn==='ally'?'特殊牌已用 · 請出普通牌':s.turn==='ally'?'同色更高 · 同點換色':''}</div>
   {induct!==null&&<div className="rally-selection" role="img" aria-label={`歸納已選 ${targets.length} 張，需兩張普通牌`}>{[0,1].map(i=>{const card=chosen[i];return <RallyBack key={i} className={card?'rally-target-filled':'rally-target-empty'} color={card?.kind==='normal'?card.color:'special'}/>;})}</div>}
   <section className="rally-hand" aria-label="我方手牌">{displayHand.map((c,i)=>{const slot=rallyFanSlot(i,displayHand.length);return <div key={c.id} className="rally-hand-slot" data-previewed={hover===c.id} style={{left:`calc(50% + ${slot.x}cqw)`,top:`${2.5+slot.y}cqw`,transform:`translateX(-50%) rotate(${slot.angle}deg)`,zIndex:hover===c.id?100:targets.includes(c.id)?90:i+1}} onMouseEnter={()=>setHover(c.id)} onMouseLeave={e=>{if(!e.currentTarget.contains(document.activeElement))setHover(null);}}><RallyCard hoverOnContainer {...(inspectedSpecial?.id===c.id?{descriptionId:'rally-special-inspect'}:{})} card={c} index={i} locked={locked||(induct!==null?c.kind!=='normal':c.kind==='normal'?!rallyPlayable(s,'ally',c):!rallySpecialPlayable(s,'ally',c))} selected={targets.includes(c.id)||induct===c.id} {...(sum!==undefined&&projected.some(v=>v.id===c.id)?{previewValue:sum}:{})} onHover={setHover} onClick={()=>play(c.id)}/></div>;})}{specialHover==='concentrate'&&[0,1,2,3].map(i=><span key={`draw-${i}`} className="rally-draw-preview rally-pulse">?</span>)}</section>
   {inspectedSpecial&&<aside className="rally-special-inspect" id="rally-special-inspect" role="tooltip" aria-label={`${RALLY_SPECIALS[inspectedSpecial.special].name}效果說明`}>
    <RallyCard card={inspectedSpecial} interactive={false}/>
    <div className="rally-inspect-scroll"><img src="./art/duel/status-scroll-v1.png" alt=""/><div className="rally-inspect-copy"><small>特殊牌 · {RALLY_SPECIALS[inspectedSpecial.special].trait}</small><h2>{RALLY_SPECIALS[inspectedSpecial.special].name}</h2><p>{RALLY_SPECIALS[inspectedSpecial.special].description}</p><footer>使用後補 1 張普通牌 · 每回合限一張</footer>{!rallySpecialPlayable(s,'ally',inspectedSpecial)&&<em>目前無法使用</em>}</div></div>
   </aside>}
   <div className="rally-action-rail">{induct!==null&&<button onClick={()=>{setInduct(null);setTargets([]);}}>取消歸納</button>}<small>{s.ally.hand.length} 張 · 特殊牌 {s.specialUsed?0:1}/1</small></div>
  </>}
  <nav className="rally-toolbar">{!campaign&&<a href="?art=confrontation-demo">‹ 單挑</a>}<button type="button" className="rally-help-icon" aria-label="玩法與特性" onClick={()=>setHelp(true)}><DebateIcon card="proof"/></button></nav>
  {menu&&<div className="ct-overlay"><section className="cb-setup rally-setup" role="dialog" aria-label="輪流接牌試配"><h1>你一句 · 我一句</h1><p>三色接牌 · 1–9 點 · 心防歸零即敗</p><div className="cb-builds">{(['ally','enemy'] as const).map(side=><BuildEditor key={side} side={side==='ally'?'我方':'敵方'} build={builds[side]} profile={profiles[side]} onChange={(v,profile)=>{setBuilds(b=>({...b,[side]:v}));setProfiles(p=>({...p,[side]:profile??''}));}}/>)}</div><footer><button onClick={()=>setHelp(true)}>玩法與特性</button><button disabled={!ready||!!error} onClick={start}>{ready?'開始辯論':'素材整備中…'}</button></footer>{error&&<p role="alert">{error}</p>}</section></div>}
  {s.winner&&!busy&&!menu&&<div className="ct-overlay"><section className="ct-pause-menu" role="dialog" aria-label="舌戰結果"><h1>{s.winner==='ally'?'辯勝':'失辯'}</h1><p>{s.turnNumber-1} 手 · 另起 {s.restarts} 次</p>{campaign?<button onClick={campaign.onDone}>返回戰場</button>:<><button onClick={start}>再辯一場</button><button onClick={()=>setMenu(true)}>調整特性</button></>}</section></div>}
  {help&&<RallyGuide onClose={()=>setHelp(false)}/>}
 </div></main>;
}
