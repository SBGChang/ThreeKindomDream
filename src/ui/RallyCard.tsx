import type {RallyCard as Card} from '../contracts/core/debate-rally.js';
import {RALLY_COLORS,RALLY_SPECIALS} from '../app/debate-traits.js';
import {DebateIcon} from './DebateVisuals.js';
export function rallyCardLabel(card:Card):string{return card.kind==='normal'?`${RALLY_COLORS[card.color].name} ${card.value}`:RALLY_SPECIALS[card.special].name;}
export function RallyCard({card,index,locked=false,selected=false,previewValue,interactive=true,onHover,onClick}:{card:Card;index?:number;locked?:boolean;selected?:boolean;previewValue?:number;interactive?:boolean;onHover?:(id:number|null)=>void;onClick?:()=>void}):React.ReactElement {
 const info=card.kind==='normal'?RALLY_COLORS[card.color]:RALLY_SPECIALS[card.special];
 const content=<><img className="db-card-art" src="./art/debate/tactic-card-v2.png" alt=""/><span className="rally-card-ribbon"/>{index!==undefined&&<kbd className="rally-key">{index+1}</kbd>}<span className="rally-card-icon"><DebateIcon card={info.motion}/></span>{card.kind==='normal'&&<b className={`rally-rank ${previewValue!==undefined?'rally-pulse':''}`}>{previewValue??card.value}</b>}<strong>{info.name}</strong>{locked&&<span className="rally-lock" aria-hidden="true">×</span>}</>;
 const props={'data-color':card.kind==='normal'?card.color:'special',className:`rally-card ${selected?'rally-selected':''} ${locked?'rally-locked':''}`};
 return interactive?<button {...props} aria-label={`${index!==undefined?`第 ${index+1} 張 `:''}${rallyCardLabel(card)}${locked?'，目前不能出牌':''}`} aria-disabled={locked} aria-pressed={selected} title={card.kind==='special'?RALLY_SPECIALS[card.special].description:undefined} onMouseEnter={()=>onHover?.(card.id)} onMouseLeave={()=>onHover?.(null)} onFocus={()=>onHover?.(card.id)} onBlur={()=>onHover?.(null)} onClick={onClick}>{content}</button>:<div {...props} role="img" aria-label={rallyCardLabel(card)}>{content}</div>;
}
