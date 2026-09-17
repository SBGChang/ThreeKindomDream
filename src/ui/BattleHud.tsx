import {useId,useState,type ReactNode} from 'react';
import {armyCount,skillBlock,type BattleState,type DemoSkill} from './realtime-battle-model.js';
import {CharacterArt} from './CharacterArt.js';
import {battleSkillArt} from './battle-ui-art.js';

const art='./art/ui/campaign/';
/** Hover and keyboard share the same painted panel, including unavailable skills. */
export function BattleHint({title,detail,children,className='',below=false,end=false}: {
 title:string;detail:ReactNode;children:(id:string)=>ReactNode;className?:string;below?:boolean;end?:boolean;
}) {
 const id=useId(),[open,setOpen]=useState(false);
 return <span className={`rt-hint ${className} ${below?'hint-below':''} ${end?'hint-end':''}`} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDownCapture={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);}}}>
  {children(id)}
  <span id={id} role="tooltip" className="rt-tooltip" hidden={!open}><strong>{title}</strong><span>{detail}</span></span>
 </span>;
}
export function ArmyHud({state,enemy=false}:{state:BattleState;enemy?:boolean}) {
 const troops=armyCount(state,enemy?'enemy':'ally'),max=enemy?state.enemyInitial:state.initial;
 return <section className={`rt-army ${enemy?'rt-enemy':'rt-ally'}`} aria-label={enemy?'敵方兵力':'我方兵力'}>
  <img src={art+(enemy?'enemy-squad-v1.png':'troops-icon-v1.png')} alt=""/>
  <div className="rt-army-content"><div className="rt-army-label"><span>{enemy?'敵陣':'我軍'}<small>{enemy?`第 ${state.wave} 波`:''}</small></span><strong>{troops}<small> / {max}</small></strong></div>
  <div className="rt-army-track" role="progressbar" aria-label={enemy?'敵軍總兵力':'我軍總兵力'} aria-valuenow={troops} aria-valuemin={0} aria-valuemax={max}><i style={{width:`${max?troops/max*100:0}%`}}/></div></div>
 </section>;
}
/** Color is capacity; black is consumed capacity. 140/190 => [0, 0, .2, 1]. */
export function supplyBagFills(supply:number,capacity:number) {
 const max=Math.max(0,capacity),amount=Math.max(0,Math.min(supply,max));
 return Array.from({length:Math.ceil(max/50)},(_,i)=>{
  const start=i*50,end=Math.min(start+50,max);
  return {color:(end-start)/50,black:amount>=end?0:amount<=start?1:(end-amount)/(end-start)};
 });
}
export function SupplyBags({state}:{state:BattleState}) {
 const bags=supplyBagFills(state.supply,state.supplyMax);
 return <BattleHint className="rt-supply-bags" below title={`軍糧 ${Math.floor(state.supply)} / ${state.supplyMax}`} detail={`每袋 50 糧。施放戰法時消耗，交戰時每秒補給 ${state.regen.toFixed(1)}。`}>
  {id=><button type="button" aria-describedby={id} aria-label={`軍糧 ${Math.floor(state.supply)} / ${state.supplyMax}`}>
   {bags.map((fill,i)=><span key={i} className="rt-supply-bag" aria-hidden="true"><span className="rt-supply-bag-capacity" style={{clipPath:`inset(0 ${(1-fill.color)*100}% 0 0)`}}><img src={art+'supply-icon-v1.png'} alt=""/><img className="rt-supply-bag-black" src={art+'supply-icon-v1.png'} alt="" style={{clipPath:`inset(0 0 0 ${fill.color*(1-fill.black)*100}%)`}}/></span></span>)}
  </button>}
 </BattleHint>;
}
export function SkillButton({skill,state,onCast}:{skill:DemoSkill;state:BattleState;onCast:(id:string)=>void}) {
 const block=skillBlock(state,skill),cd=state.cooldowns[skill.id]??0;
 const illustration=battleSkillArt(skill.name,skill.mechanic??skill.kind);
 const cooldownFill=cd>0?Math.min(1,cd/Math.max(skill.cd,.001)):0;
 return <BattleHint className="rt-skill-slot" end={['E','3'].includes(skill.key)} title={skill.name} detail={<><span>{skill.owner} · {skill.description}</span><span className="rt-hint-cost"><img src={art+'supply-icon-v1.png'} alt="軍糧"/>{skill.cost}<img src={art+'hourglass-v1.png'} alt="冷卻"/>{skill.cd} 秒</span>{block&&<em>{block}</em>}</>}>
  {id=><button type="button" className={`rt-skill skill-${skill.kind}`} aria-disabled={!!block} aria-describedby={id} aria-label={`${skill.owner}・${skill.name}${block?'・'+block:''}`} onClick={()=>{if(!block)onCast(skill.id);}}>
   <span className="rt-skill-art"><img className="rt-skill-illustration" src={illustration} alt=""/></span>
   {cd>0&&<span aria-hidden="true" className="rt-skill-art rt-cooldown-fill" style={{clipPath:`inset(${(1-cooldownFill)*100}% 0 0 0)`}}><img className="rt-skill-illustration" src={illustration} alt=""/></span>}
   <kbd>{skill.key}</kbd>{skill.owner!=='主角'&&<span className="rt-skill-portrait"><CharacterArt name={skill.owner} portrait/></span>}
   {cd>0&&<span className="rt-cooldown-number">{Math.ceil(cd)}<small>s</small></span>}
   <span className="rt-skill-name">{skill.name}</span>
  </button>}
 </BattleHint>;
}
function Buff({name,description,seconds,image}:{name:string;description:string;seconds:number;image:string}) {
 return <BattleHint className="rt-buff-slot" title={name} detail={description}>{id=><button type="button" className="rt-buff" aria-label={`${name}，剩餘 ${Math.ceil(seconds)} 秒`} aria-describedby={id}><img src={image} alt=""/><span>{Math.ceil(seconds)}<small>s</small></span></button>}</BattleHint>;
}
export function BattleBuffs({state}:{state:BattleState}) {
 return <div className="rt-buffs" aria-label="戰場狀態">
  {state.buff>0&&<Buff name="鼓舞" description={`我軍攻擊提升 ${Math.round(state.buffPower*100)}%。`} seconds={state.buff} image={art+'tactic-inspire-v8.png'}/>}
  {state.debuff>0&&<Buff name="壓制" description={`敵軍攻擊降低 ${Math.round(state.debuffPower*100)}%。`} seconds={state.debuff} image={art+'tactic-discord-v8.png'}/>}
  {state.traitUntil>0&&<Buff name="背水" description="我軍受到的傷害減少 25%。" seconds={state.traitUntil} image="./art/ui/traits/trigger-backwater-v1.png"/>}
 </div>;
}
