import {useId,useState} from 'react';
import type {RallyBuild,RallyPassive} from '../contracts/core/debate-rally.js';
import type {DebateCard} from '../contracts/core/card-debate.js';
import {RALLY_PASSIVES,RALLY_SPECIALS,rallySpecialSources} from '../app/debate-traits.js';
import {DebateIcon} from './DebateVisuals.js';
import './rally-traits.css';
type TraitArt={file:string}|{card:DebateCard};
const passiveArt:Record<RallyPassive,TraitArt>={composure:{file:'chenyi-v1'},eloquence:{card:'pressure'},precision:{card:'question'},adaptable:{file:'liaodi-v1'},momentum:{file:'trigger-fervor-v1'},resourceful:{file:'jimin-v1'},renewal:{file:'trigger-relief-v1'},scholar:{card:'proof'}};
function Art({art}:{art:TraitArt}){return 'file' in art?<img src={`./art/ui/traits/${art.file}.png`} alt=""/>:<DebateIcon card={art.card}/>;}
function Trait({name,description,category,art,active}:{name:string;description:string;category:string;art:TraitArt;active:boolean}){
 const id=useId(),[hover,setHover]=useState(false),[focus,setFocus]=useState(false),[dismissed,setDismissed]=useState(false),open=(hover||focus)&&!dismissed;
 return <span className={`rally-trait-item ${active?'rally-trait-active':''}`} data-open={open} onMouseEnter={()=>{setHover(true);setDismissed(false);}} onMouseLeave={()=>setHover(false)} onFocus={()=>{setFocus(true);setDismissed(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocus(false);}} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setDismissed(true);}}}>
  <button type="button" className="rally-trait-icon" aria-label={name} aria-describedby={open?id:undefined}><Art art={art}/></button>
  {open&&<span className="rally-trait-tooltip" role="tooltip" id={id}><img className="rally-trait-scroll" src="./art/duel/status-scroll-v1.png" alt=""/><span className="rally-trait-tooltip-icon" aria-hidden="true"><Art art={art}/></span><span className="rally-trait-copy"><small>{category}</small><strong>{name}</strong><span>{description}</span></span></span>}
 </span>;
}
export function RallyTraits({build}:{build:RallyBuild}){
 const specials=rallySpecialSources(build);
 return <div className="rally-trait-tags" aria-label="舌戰特性">{specials.map(k=>{const special=RALLY_SPECIALS[k];return <Trait key={k} name={special.trait} category={`特殊牌來源 · ${special.name}`} description={special.description} art={{card:k==='induct'?'claim':special.motion}} active/>;})}{build.passives.map(p=><Trait key={p} name={RALLY_PASSIVES[p].name} description={RALLY_PASSIVES[p].description} category="被動特性" art={passiveArt[p]} active={false}/>)}</div>;
}
