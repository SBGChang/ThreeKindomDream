import {useEffect,useRef,useState} from 'react';
import {createEncounterDemo,beginEncounterDemo,answerContest,tickEncounterDemo} from '../app/confrontation-demo.js';
import {DEFAULT_DEBATE_BUILD,DEBATE_TRAITS,DEBATE_RECOVER,debateHandSize,type DebateBuild,type DebateTrait} from '../app/card-debate-model.js';
import {CardDebateGuide} from './DebateVisuals.js';
import {loadBattleImages,type BattleImages} from './realtime-battle-render.js';
import {drawEncounterDemo} from './confrontation-render.js';
import {loadDuelArt} from './duel-art.js';
import {CardDebateHud} from './CardDebateHud.js';
import './realtime-battle-demo.css';
import './confrontation-demo.css';
import './card-debate.css';
export function CardDebateDemo():React.ReactElement {
 const [builds,setBuilds]=useState<{ally:DebateBuild;enemy:DebateBuild}>({ally:{...DEFAULT_DEBATE_BUILD},enemy:{...DEFAULT_DEBATE_BUILD,trait:'counter'}});
 const model=useRef(createEncounterDemo('cards')),canvas=useRef<HTMLCanvasElement>(null),images=useRef<BattleImages|null>(null);
 const [s,setS]=useState({...model.current}),[ready,setReady]=useState(false),[error,setError]=useState(''),[help,setHelp]=useState(false);const resume=useRef(false);
 const [selected,setSelected]=useState<number|null>(null);
 const sync=()=>setS({...model.current});const play=(i:number)=>{if(answerContest(model.current,i))setSelected(null);sync();};
 const select=(i:number|null)=>{const c=model.current.contest;if(model.current.battle.status==='running'&&c?.phase==='read'&&c.cards&&(i===null||i>=DEBATE_RECOVER&&i<c.cards.ally.hand.length))setSelected(i);};
 useEffect(()=>setSelected(null),[s.contest?.cards?.history.length,s.battle.wave]);
 const pause=()=>{const b=model.current.battle;if(b.status==='running')b.status='paused';else if(b.status==='paused')b.status='running';sync();};
 const rules=()=>{resume.current=model.current.battle.status==='running';if(resume.current)model.current.battle.status='paused';setHelp(true);sync();};
 const closeRules=()=>{if(resume.current)model.current.battle.status='running';setHelp(false);sync();};
 const start=()=>{if(!ready)return;const v=createEncounterDemo('cards',Date.now());v.debateBuilds=structuredClone(builds);model.current=v;beginEncounterDemo(v);sync();};
 useEffect(()=>{let alive=true;const icons=Promise.all(['card-icons-v1','resource-icons-v1','pressure-v1'].map(file=>new Promise<void>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve();im.onerror=()=>reject(Error('舌戰圖示載入失敗'));im.src='./art/debate/'+file+'.png';})));void Promise.all([loadBattleImages(),loadDuelArt('status-scroll-v1'),icons]).then(([im])=>{if(alive){images.current=im;setReady(true);}}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!ready)return;let raf=0,last=performance.now(),ui=0,acc=0;const frame=(now:number)=>{acc+=Math.min(.1,(now-last)/1000);last=now;while(acc>=1/60){tickEncounterDemo(model.current,1/60);acc-=1/60;}const ctx=canvas.current?.getContext('2d');if(ctx&&images.current)drawEncounterDemo(ctx,images.current,model.current);if(now-ui>40){sync();ui=now;}raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);},[ready]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;if(help){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRules();}return;}if(e.key==='Escape'||e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();pause();}else if(['1','2','3','4','5','6'].includes(e.key)){e.preventDefault();select(Number(e.key)-1);}else if(e.key.toLowerCase()==='r'){e.preventDefault();select(DEBATE_RECOVER);}else if(e.key==='Enter'&&selected!==null){e.preventDefault();e.stopImmediatePropagation();play(selected);}};const context=(e:MouseEvent)=>{e.preventDefault();if(help)closeRules();else if(model.current.battle.status==='running')pause();};const hide=()=>{if(document.hidden&&model.current.battle.status==='running'){model.current.battle.status='paused';sync();}};window.addEventListener('keydown',key);window.addEventListener('contextmenu',context);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('keydown',key);window.removeEventListener('contextmenu',context);document.removeEventListener('visibilitychange',hide);};},[help,selected]);
 const b=s.battle,c=s.contest,menu=b.status==='ready'||b.status==='finished';
 return <main className="rt-shell"><div className="rt-battle ct-battle cb-battle" data-status={b.status} data-phase={c?.phase??b.phase} data-wave={b.wave}><canvas ref={canvas} width={1600} height={900} aria-label="舌戰戰場演出"/>
 <header className="ct-heading"><a href="?art=confrontation-demo">‹ 單挑</a><div><small>第 {b.wave} 關 · {c?'戰場計時暫停':'論述組合試玩'}</small><h1>陣 前 舌 戰</h1></div><button disabled={menu||help} onClick={pause} aria-label="暫停舌戰">Ⅱ</button></header>
 {c?.cards&&<CardDebateHud c={c} paused={b.status!=='running'} selected={selected} onSelect={select} onPlay={play} onRules={rules}/>}
 {!menu&&!c&&<div className="cb-field-caption">{b.phase==='cheer'?'全軍歡呼':b.phase==='exit'?'乘勝前進':b.phase==='combat'?'兩軍交鋒 · 辯者即將出陣':b.phase==='start'?'START':'整軍入場'}</div>}
 {c?.phase==='verdict'&&<div className={`ct-verdict ${c.winner==='ally'?'ct-win':'ct-lose'}`}><span>{c.draw?'和':c.winner==='ally'?'勝':'敗'}</span><strong>{c.draw?'各自歸陣':c.winner==='ally'?'一言破陣':'敗退收軍'}</strong></div>}
 {!c&&['fade-in','fade-out'].includes(b.phase)&&<div className="rt-wave-black" style={{opacity:b.phase==='fade-out'?Math.min(1,b.phaseTime/.65):Math.max(0,1-b.phaseTime/.65)}}/>}
 {menu&&<div className="ct-overlay"><section className="cb-setup" role="dialog" aria-label="舌戰試配"><h1>{b.status==='finished'?'鳴金收軍':'以論為刃'}</h1><p>{b.status==='finished'?`拿下 ${s.victories} 場舌戰 · 擊退 ${b.kills} 人`:'智力決定手牌 · 同時揭招 · 心防歸零即敗'}</p><div className="cb-builds">{(['ally','enemy'] as const).map(side=><fieldset key={side}><legend>{side==='ally'?'郭嘉':'陣營指揮官'}</legend>{(['int','pol'] as const).map(k=><label key={k}>{k==='int'?'智力':'政治'}<input aria-label={`${side==='ally'?'我方':'敵方'}${k==='int'?'智力':'政治'}`} type="number" min={1} max={100} value={builds[side][k]} onChange={e=>setBuilds({...builds,[side]:{...builds[side],[k]:Math.max(1,Math.min(100,Number(e.target.value)||1))}})}/></label>)}<label>特性<select aria-label={`${side==='ally'?'我方':'敵方'}舌戰特性`} value={builds[side].trait} onChange={e=>setBuilds({...builds,[side]:{...builds[side],trait:e.target.value as DebateTrait}})}>{Object.entries(DEBATE_TRAITS).map(([id,v])=><option key={id} value={id}>{v.name}</option>)}</select></label><p>{DEBATE_TRAITS[builds[side].trait].description}</p><strong className="db-hand-count">起手 {debateHandSize(builds[side].int)} 張</strong></fieldset>)}</div><footer><button onClick={rules}>玩法</button><button onClick={start} disabled={!ready||!!error}>{ready?'出陣辯論':'整備中…'}</button></footer><small>假資料試玩 · 不讀寫存檔</small>{error&&<p role="alert">{error}</p>}</section></div>}
 {help&&<div className="ct-overlay cb-modal"><CardDebateGuide onClose={closeRules}/></div>}
 {b.status==='paused'&&!help&&<div className="ct-overlay"><section className="ct-pause-menu" role="dialog" aria-label="舌戰暫停"><h1>暫歇片刻</h1><button onClick={pause}>繼續舌戰</button><button onClick={rules}>玩法</button><button onClick={()=>{model.current=createEncounterDemo('cards');sync();}}>重新試配</button></section></div>}
 </div></main>;
}
