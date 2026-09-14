import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
const RealtimeBattle = lazy(()=>import('./RealtimeBattleDemo.js').then(m=>({default:m.RealtimeBattle})));
import { BattleTheater, type ReplayData } from './BattleTheater.js';

type Scene = 'enter' | 'combat' | 'cheer' | 'choice' | 'march' | 'close' | 'open' | 'retreat' | 'summary';
function LegacyCampaignJourney({s,bump,onDone}:{s:Session;bump:()=>void;onDone:()=>void}):React.ReactElement {
  const [battle,setBattle]=useState<ReplayData|null>(null);
  const [scene,setScene]=useState<Scene>('enter');
  const [reward,setReward]=useState(0),[depth,setDepth]=useState(0);
  const [total]=useState(()=>s.stageCount());
  const [background]=useState(()=>`backgrounds/bg-battle-${Math.max(1,Math.min(4,s.current.progress.chapter))}`);
  const started=useRef(false),settled=useRef(false),sequence=useRef(0);
  const engage=():void=>{
    const st=s.campaignState(),nx=s.nextStage();
    if(!st||!nx){setScene('retreat');return;}
    const learning=s.money;
    const out=s.engage();
    setReward(out.defeated?s.money-learning:(s.campaignState()?.banked??[]).reduce((n,r)=>n+(r.kind==='money'?r.amount:0),0));
    setDepth(st.clearedStages+(out.cleared?1:0));
    sequence.current+=1;
    setBattle({log:out.log,troopsMax:st.host.troopsMax,enemyMax:nx.enemyTroops,startTroops:st.host.troops,startSupply:st.host.supply,
      commanders:(st.loadout?.commanders??[]).map(c=>({name:t(defs.reader('notable').get(String(c.notableId)).nameKey),skill:t(defs.reader('skill').get(String(c.skillId)).nameKey)})),
      stageLabel:`第 ${nx.index+1} 關 · ${nx.boss?t(nx.boss.nameKey):'雜兵'}`,enemyLabel:nx.boss?t(nx.boss.nameKey):'敵軍',cleared:out.cleared,defeated:out.defeated});
    bump();
  };
  const resumed=useRef(false);
  useEffect(()=>{
    if(started.current)return;
    started.current=true;
    const st=s.campaignState(),previous=s.previousStage();
    // A saved victory is a pending player decision, never permission to attack again.
    if(st&&previous&&st.log.length>0){
      resumed.current=true;
      setDepth(st.clearedStages);
      setReward(st.banked.reduce((n,r)=>n+(r.kind==='money'?r.amount:0),0));
      const enemyLabel=previous.boss?t(previous.boss.nameKey):'敵軍';
      setBattle({log:st.log,troopsMax:st.host.troopsMax,enemyMax:previous.enemyTroops,startTroops:st.host.troops,startSupply:st.host.supply,
        commanders:(st.loadout?.commanders??[]).map(c=>({name:t(defs.reader('notable').get(String(c.notableId)).nameKey),skill:t(defs.reader('skill').get(String(c.skillId)).nameKey)})),
        stageLabel:`第 ${previous.index+1} 關 · ${enemyLabel}`,enemyLabel,cleared:true,defeated:false});
      setScene('choice');
    }else engage();
  },[]);
  useEffect(()=>{
    const delays:Partial<Record<Scene,number>>={enter:1200,cheer:1500,march:1300,close:650,open:650,retreat:1300};
    const delay=delays[scene]; if(delay===undefined)return;
    const timer=setTimeout(()=>{
      if(scene==='enter')setScene('combat');
      else if(scene==='cheer')setScene('choice');
      else if(scene==='march')setScene('close');
      else if(scene==='close'){resumed.current=false;engage();setScene('open');}
      else if(scene==='open')setScene('enter');
      else if(scene==='retreat'){
        if(!settled.current){settled.current=true;if(!battle?.defeated){const before=s.money;s.withdraw();setReward(s.money-before);bump();}}
        setScene('summary');
      }
    },delay);return()=>clearTimeout(timer);
  },[scene]);
  const next=battle?.defeated?null:s.nextStage();
  return <div className={`campaign-journey journey-${scene}`}>
    {battle&&<BattleTheater key={sequence.current} {...battle} background={background} finished={resumed.current} enabled={scene==='combat'} onFinished={()=>setScene(battle.defeated?'retreat':'cheer')}/>}
    <div className="battle-curtain" aria-hidden="true"/>
    {scene==='cheer'&&<div className="victory-call" role="status">敵陣已破！全軍萬勝！</div>}
    {scene==='choice'&&<div className="march-choice"><h2>{next?'全軍待命':'七關盡破 · 凱旋而歸'}</h2><p>已通過 {depth} 關 · 保住 {reward} 錢</p>{next&&<p>下一關：{next.boss?t(next.boss.nameKey):'敵軍'} · 兵量 {next.enemyTroops}。戰敗時已得獎勵減半。</p>}<div><button onClick={()=>setScene('retreat')}>{next?'撤軍':'凱旋撤軍'}</button>{next&&<button className="primary" onClick={()=>setScene('march')}>繼續 · 全軍前進</button>}</div></div>}
    {scene==='summary'&&<div className="campaign-settlement" role="dialog" aria-label="戰役結算"><span>戰役結算</span><h1>{battle?.defeated?'敗軍收整':depth<total?'全軍撤回':'凱旋歸營'}</h1><p>通過 {depth} 關</p><strong>獲得 {reward} 錢</strong><p>能力隨本次戰役磨練成長</p>{battle?.defeated&&<p>已得獎勵減半後入帳。</p>}<button className="primary" onClick={onDone}>繼續行旅 →</button></div>}
  </div>;
}

/** New departures use live combat; already-settled legacy saves retain their pending decision. */
export function CampaignJourney(props:{s:Session;bump:()=>void;onDone:()=>void}):React.ReactElement {
 const [legacy]=useState(()=>{const st=props.s.campaignState();return !!st&&!st.realtime&&st.log.length>0;});
 return legacy?<LegacyCampaignJourney {...props}/>:<Suspense fallback={<p role="status">軍隊集結中…</p>}><RealtimeBattle campaign={props.s} bump={props.bump} onDone={props.onDone}/></Suspense>;
}
