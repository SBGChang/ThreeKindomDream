import type {RallyCard as Card,RallyColor} from '../contracts/core/debate-rally.js';
import {RALLY_COLORS,RALLY_SPECIALS} from '../app/debate-traits.js';
import {DebateIcon} from './DebateVisuals.js';
export async function preloadRallyCards():Promise<void>{
 await Promise.all(['rally-faces-v1','rally-numerals-v1','rally-backs-v1','rally-opening-stand-v1'].map(file=>new Promise<void>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve();im.onerror=()=>reject(Error(`舌戰卡面載入失敗：${file}`));im.src=`./art/debate/${file}.png`;})));
}
// Optical glyph bounds from the authored atlas: equal cap height without stretching digits.
const numeralBounds=[[129,54,350,389],[499,68,787,386],[920,62,1180,382],[89,464,385,805],[497,462,768,789],[904,459,1166,796],[101,863,360,1206],[498,870,750,1189],[909,864,1165,1192]] as const;
function Numeral({value}:{value:number}){const [x,y,right,bottom]=numeralBounds[value-1]!;return <svg className="rally-rank-art" aria-hidden="true" viewBox={`${x-6} ${y-6} ${right-x+12} ${bottom-y+12}`}><image href="./art/debate/rally-numerals-v1.png" width="1254" height="1254"/></svg>;}
export function RallyBack({color,label,className=''}:{color:RallyColor|'special';label?:string;className?:string}){
 const right=color==='evidence'||color==='special',bottom=color==='presence'||color==='special';
 return <svg className={`rally-back ${className}`} data-color={color} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} viewBox={`${right?528:27} ${bottom?710:27} 469 663`}><image href="./art/debate/rally-backs-v1.png" width="1024" height="1536"/></svg>;
}
export function rallyCardLabel(card:Card):string{return card.kind==='normal'?`${RALLY_COLORS[card.color].name} ${card.value}`:RALLY_SPECIALS[card.special].name;}
export function RallyCard({card,index,locked=false,selected=false,previewValue,interactive=true,hoverOnContainer=false,descriptionId,onHover,onClick}:{card:Card;index?:number;locked?:boolean;selected?:boolean;previewValue?:number;interactive?:boolean;hoverOnContainer?:boolean;descriptionId?:string;onHover?:(id:number|null)=>void;onClick?:()=>void}):React.ReactElement {
 const info=card.kind==='normal'?RALLY_COLORS[card.color]:RALLY_SPECIALS[card.special];
 const rank=card.kind==='normal'?(previewValue??card.value):1;
 const content=<><span className="rally-card-face" aria-hidden="true"/>{index!==undefined&&<kbd className="rally-key">{index+1}</kbd>}{card.kind==='special'&&<span className="rally-card-icon"><DebateIcon card={info.motion}/></span>}{card.kind==='normal'&&<b className={`rally-rank ${previewValue!==undefined?'rally-pulse':''}`}><Numeral value={rank}/><span className="rally-rank-label">{rank}</span></b>}<strong>{info.name}</strong>{locked&&<span className="rally-lock" aria-hidden="true">×</span>}</>;
 const props={'data-color':card.kind==='normal'?card.color:'special',className:`rally-card ${selected?'rally-selected':''} ${locked?'rally-locked':''}`};
 return interactive?<button {...props} aria-label={`${index!==undefined?`第 ${index+1} 張 `:''}${rallyCardLabel(card)}${previewValue!==undefined?'，預估 '+previewValue:''}${locked?'，目前不能出牌':''}`} aria-disabled={locked} aria-pressed={selected} aria-describedby={descriptionId} onMouseEnter={()=>{if(!hoverOnContainer)onHover?.(card.id);}} onMouseLeave={()=>{if(!hoverOnContainer)onHover?.(null);}} onFocus={()=>onHover?.(card.id)} onBlur={()=>onHover?.(null)} onClick={onClick}>{content}</button>:<div {...props} role="img" aria-label={rallyCardLabel(card)}>{content}</div>;
}
