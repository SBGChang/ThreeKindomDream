import {useEffect,useRef,useState} from 'react';
import {DUEL_ACTORS,loadDuelImages,duelFrame,type DuelPose} from './duel-art.js';
import './realtime-battle-demo.css';
import './duel-motion-review.css';
const moves:Record<string,string>={attack:'攻擊',defend:'防守',rest:'休養',hurt:'受擊'};
export function DuelMotionReview():React.ReactElement {
 const [page,setPage]=useState(0),[pose,setPose]=useState<DuelPose>('attack'),[frame,setFrame]=useState(0),[playing,setPlaying]=useState(false),[light,setLight]=useState(false),[error,setError]=useState(''),[art,setArt]=useState<Record<string,HTMLCanvasElement>>({});
 const canvases=useRef<Record<string,HTMLCanvasElement|null>>({});const ids=Object.keys(DUEL_ACTORS),visible=ids.slice(page*8,page*8+8);
 useEffect(()=>{let alive=true;setPlaying(false);setError('');setArt({});void loadDuelImages(visible).then(a=>{if(alive)setArt(a);}).catch(e=>{if(alive)setError(String(e));});return()=>{alive=false;};},[page]);
 useEffect(()=>{if(!playing)return;let raf=0;const start=performance.now();const tick=(now:number)=>{const f=Math.min(7,Math.floor((now-start)/125));setFrame(f);if(now-start<1100)raf=requestAnimationFrame(tick);else setPlaying(false);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing,pose]);
 useEffect(()=>{for(const id of visible){const c=canvases.current[id],im=art['duel-'+id];if(!c||!im)continue;const ctx=c.getContext('2d')!,f=duelFrame(pose,frame/8);ctx.clearRect(0,0,256,256);ctx.drawImage(im,f%4*(im.width/4),Math.floor(f/4)*(im.height/8),im.width/4,im.height/8,0,0,256,256);}},[art,frame,pose,page]);
 return <main className="rt-shell"><div className={`rt-battle dm-review ${light?'dm-light':''}`}><header><a href="?art=confrontation-demo">‹ 單挑</a><h1>武將動作</h1><span>{ids.length} 名 · 四式八格</span><button onClick={()=>setLight(!light)}>{light?'深底':'淺底'}</button></header><nav aria-label="動作選擇">{Object.entries(moves).map(([id,name])=><button key={id} aria-pressed={pose===id} onClick={()=>{setPose(id as DuelPose);setPlaying(false);setFrame(0);}}>{name}</button>)}<button disabled={!Object.keys(art).length||playing} onClick={()=>{setFrame(0);setPlaying(true);}}>播放一次</button><label>影格 {frame+1}/8 <input aria-label="動作影格" type="range" min={0} max={7} value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/></label></nav>
 <div className="dm-grid">{visible.map(id=><figure key={id}><canvas width={256} height={256} ref={el=>{canvases.current[id]=el;}} aria-label={`${DUEL_ACTORS[id]}・${moves[pose]}第 ${frame+1} 格`}/><figcaption>{DUEL_ACTORS[id]}</figcaption></figure>)}</div>{error&&<p role="alert">{error}</p>}
 <footer><button disabled={!page} onClick={()=>setPage(page-1)}>‹ 上一頁</button><span>{page+1} / {Math.ceil(ids.length/8)}</span><button disabled={(page+1)*8>=ids.length} onClick={()=>setPage(page+1)}>下一頁 ›</button></footer></div></main>;
}
