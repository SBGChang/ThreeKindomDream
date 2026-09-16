import {useEffect,useRef,useState} from 'react';
import {DUEL_ACTORS,loadDuelImages,duelFrame,type DuelPose} from './duel-art.js';
import {createBattle,castSkill,tickBattle,type DemoSkill} from './realtime-battle-model.js';
import {drawBattle,loadBattleImages,type BattleImages} from './realtime-battle-render.js';
import {drawEvolutionParticles} from './tactical-particles.js';
import './realtime-battle-demo.css';
import './duel-motion-review.css';
const labels:Record<string,string>={pincer:'夾擊',cavalry:'騎兵突擊',longshot:'遠射',infighting:'內訌',misreport:'偽報',fire:'火計',inspire:'鼓舞',shield:'盾陣',reform:'重整',toarcher:'轉弓兵',toinfantry:'轉步兵',pursue:'追擊',mounted:'騎射',volley:'齊射',crossbow:'連弩',thunder:'雷擊',water:'水計',rocks:'落石',taunt:'挑釁',ambush:'伏兵',reinforce:'援兵',divide:'離間',turncoat:'策反',lure:'誘敵',sweep:'橫掃'};
const poses:Record<string,string>={battle:'戰法',command:'指揮',run:'行軍',attack:'單挑攻擊',defend:'單挑防守',rest:'單挑休養',hurt:'單挑受擊',evolution:'單挑升變'};
function skill(mechanic:string,owner:string):DemoSkill{return {id:'review',name:labels[mechanic]!,owner,key:'1',kind:['fire','water','rocks','thunder'].includes(mechanic)?'fire':['mounted','volley','crossbow'].includes(mechanic)?'mounted':['inspire','shield','reform','longshot','reinforce','toarcher','toinfantry'].includes(mechanic)?'inspire':mechanic==='pincer'?'pincer':'charge',cost:0,cd:1,damage:95,description:'',mechanic};}
/** Isolated fixtures rendered by production code. Never touches Session or saves. */
export function BattleEffectsReview():React.ReactElement{
 const [hero,setHero]=useState('sunce'),[mode,setMode]=useState('battle'),[mechanic,setMechanic]=useState('water'),[evolution,setEvolution]=useState('攻其不備'),[time,setTime]=useState(2.7),[playing,setPlaying]=useState(false),[art,setArt]=useState<BattleImages>({}),[error,setError]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null),duration=mode==='battle'?4.2:mode==='evolution'?2.8:1.6;
 useEffect(()=>{let alive=true;setArt({});setError('');setPlaying(false);const b=createBattle();b.commanders[0]!.name=DUEL_ACTORS[hero]!;
 void Promise.all([loadBattleImages(undefined,b.commanders),loadDuelImages([hero])]).then(([a,d])=>{if(alive)setArt({...a,...d});}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[hero]);
 useEffect(()=>{if(!playing)return;let raf=0;const start=performance.now();const loop=(now:number)=>{const t=Math.min(duration,(now-start)/1000);setTime(t);if(t<duration)raf=requestAnimationFrame(loop);else setPlaying(false);};raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);},[playing,duration]);
 useEffect(()=>{const ctx=canvas.current?.getContext('2d');if(!ctx||!art.background)return;
 const b=createBattle();b.status='running';b.phase='combat';b.commanders[0]!.name=DUEL_ACTORS[hero]!;b.commanders[0]!.id=hero;
 if(mode==='battle'){const sk=skill(mechanic,DUEL_ACTORS[hero]!);b.skills=[sk];castSkill(b,sk.id);for(let t=0;t<time;t+=.025)tickBattle(b,Math.min(.025,time-t));drawBattle(ctx,art,b);return;}
 ctx.clearRect(0,0,1600,900);ctx.drawImage(art.background,0,0,1600,900);ctx.fillStyle='#0c1425aa';ctx.fillRect(0,0,1600,900);
 const command=mode==='command'||mode==='run',im=command?(art['officer-'+hero]??art['commander-'+(hero==='npc_soldier'?'enemy':hero)]):art['duel-'+hero];
 if(!im)return;const p=Math.min(.999,time/duration),frame=command?(mode==='run'?16+Math.min(15,Math.floor(p*16)):Math.min(7,Math.floor(p*8))):duelFrame(mode==='evolution'?'rest':mode as DuelPose,p),cell=im.width/4;
 const evo=art['evolution-particles'];if(mode==='evolution'&&evo)drawEvolutionParticles(ctx,evo,time,800,570,evolution);
 ctx.drawImage(im,frame%4*cell,Math.floor(frame/4)*cell,cell,cell,600,255,400,400);
 if(mode==='evolution'&&evo)drawEvolutionParticles(ctx,evo,time,800,570,evolution,true);
 },[art,hero,mode,mechanic,evolution,time,duration]);
 return <main className="rt-shell"><div className="rt-battle dm-review"><header><a href="?art=battle-demo">‹ 演武場</a><h1>戰場美術演武</h1><span>50 名武將 · 25 種戰法</span><a href="?art=duel-motion">武將總覽</a></header>
 <nav aria-label="美術預覽"><label>武將 <select aria-label="武將" value={hero} onChange={e=>setHero(e.target.value)}>{Object.entries(DUEL_ACTORS).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
 <label>演出 <select aria-label="演出" value={mode} onChange={e=>{setMode(e.target.value);setTime(0);setPlaying(false);}}>{Object.entries(poses).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
 {mode==='battle'&&<select aria-label="戰法" value={mechanic} onChange={e=>{setMechanic(e.target.value);setTime(2.7);setPlaying(false);}}>{Object.entries(labels).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select>}
 {mode==='evolution'&&<select aria-label="升變" value={evolution} onChange={e=>setEvolution(e.target.value)}>{['攻其不備','借力打力','蓄勢待發'].map(n=><option key={n}>{n}</option>)}</select>}
 <button disabled={!art.background||playing} onClick={()=>{setTime(0);setPlaying(true);}}>播放一次</button><label>{time.toFixed(2)} 秒 <input aria-label="演出時間" type="range" min={0} max={duration} step={.01} value={Math.min(time,duration)} onInput={e=>{setPlaying(false);setTime(Number(e.currentTarget.value));}} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}}/></label></nav>
 <canvas ref={canvas} width={1600} height={900} style={{position:'static',display:'block',width:'100%',height:'auto',maxHeight:'72vh',objectFit:'contain'}} aria-label={DUEL_ACTORS[hero]+'・'+poses[mode]}/>{error&&<p role="alert">{error}</p>}</div></main>;
}
