import {useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createEncounterDemo,beginEncounterDemo,tickEncounterDemo,answerContest} from '../../src/app/confrontation-demo.js';
import {DUEL_ACTIONS,ACTION_NAME,type DuelAction} from '../../src/app/duel-model.js';
import {DUEL_REVEAL_SECONDS,DUEL_RESET_SECONDS} from '../../src/app/duel-presentation.js';
import {loadBattleImages,type BattleImages} from '../../src/ui/realtime-battle-render.js';
import {loadDuelImages} from '../../src/ui/duel-art.js';
import {drawEncounterDemo} from '../../src/ui/confrontation-render.js';
import {DuelInterface} from '../../src/ui/DuelHud.js';
import '../../src/ui/realtime-battle-demo.css';
import '../../src/ui/confrontation-demo.css';

// In-memory fixture using the real resolver, battlefield and reveal component. No saves.
function Review(){
 const [action,setAction]=useState<DuelAction>('attack'),[time,setTime]=useState(1.65),[images,setImages]=useState<BattleImages|null>(null),[error,setError]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null);
 const model=useMemo(()=>{
  const s=createEncounterDemo('duel',123);beginEncounterDemo(s);
  for(let i=0;i<2400&&s.contest?.phase!=='read';i++)tickEncounterDemo(s,1/60);
  const c=s.contest!,d=c.duel!;
  d.enemyAction=({attack:'rest',defend:'attack',rest:'defend'} as const)[action];
  // First random roll of this seed triggers a legitimate player evolution.
  d.rng=1972;
  answerContest(s,DUEL_ACTIONS.indexOf(action));
  if(!d.last?.allyEvolution)throw Error('Fixture seed must trigger evolution');
  return s;
 },[action]);
 const c={...model.contest!,phaseTime:DUEL_REVEAL_SECONDS+DUEL_RESET_SECONDS+time};
 useEffect(()=>{void Promise.all([loadBattleImages(),loadDuelImages(['lord','npc_soldier'])]).then(([b,d])=>setImages({...b,...d})).catch(e=>setError(String(e)));},[]);
 useEffect(()=>{const ctx=canvas.current?.getContext('2d');if(ctx&&images)drawEncounterDemo(ctx,images,{...model,contest:c});},[model,images,time]);
 return <><style>{`body{margin:0;background:#080d14;color:#fff;font-family:sans-serif}nav{height:54px;display:flex;align-items:center;justify-content:center;gap:16px}.ct-battle{margin:auto;width:min(100vw,calc((100dvh - 54px)*16/9))}label{display:flex;gap:10px}`}</style><nav><label>動作<select aria-label="升變動作" value={action} onChange={e=>setAction(e.target.value as DuelAction)}>{DUEL_ACTIONS.map(a=><option key={a} value={a}>{ACTION_NAME[a]}</option>)}</select></label><label>演出時間<input aria-label="演出時間" type="range" min="0" max="2.79" step=".01" value={time} onChange={e=>setTime(Number(e.target.value))}/>{time.toFixed(2)}</label><span>{error||(!images?'載入中':'已載入')}</span></nav><main className="rt-battle ct-battle ct-duel"><canvas ref={canvas} width={1600} height={900}/><DuelInterface contest={c} paused onAnswer={()=>{}} onHelpChange={()=>{}}/></main></>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
