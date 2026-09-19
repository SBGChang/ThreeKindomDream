import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {RallyColor,RallySpecial} from '../contracts/core/debate-rally.js';
import {RallyCard,RallyBack} from './RallyCard.js';
import {GuideBackButton} from './GuideBackButton.js';
import {DebateIcon} from './DebateVisuals.js';
import './rally-guide.css';
function Card({color='reason',value=4}:{color?:RallyColor;value?:number}){return <RallyCard interactive={false} card={{id:0,kind:'normal',color,value}}/>;}
function Arrow(){return <svg className="rg-arrow" viewBox="730 150 440 520" aria-hidden="true"><image href="./art/duel/wheel-counter-arrow-v1.png" width="1280" height="1280"/></svg>;}
function Draw({count=3}:{count?:number}){return <span className="rg-draw">{Array.from({length:count},(_,i)=><RallyBack key={i} color={(['reason','evidence','presence'] as const)[i%3]!}/>)}</span>;}
function Scene({title,note,children,wide=false}:{title:string;note:string;children:ReactNode;wide?:boolean}){return <article className={`rg-scene ${wide?'rg-wide':''}`} aria-label={`${title}：${note}`}><h3>{title}</h3><div className="rg-picture">{children}</div></article>;}
const specials:{id:RallySpecial;note:string;detail:string}[]=[
 {id:'induct',note:'兩張一起變大',detail:'選兩張，點數合計；最高 9'},
 {id:'shout',note:'加倍傷害・封住對手',detail:'下一張傷害加倍，對手下一手跳過'},
 {id:'concentrate',note:'立即補 3 張',detail:'再補 1 張普通牌，仍可出牌'},
 {id:'reflect',note:'把傷害彈回去',detail:'反彈對方下一次傷害'},
 {id:'wild',note:'這一張，自由出',detail:'下一張不受牌色、點數限制'}
];
export function specialRuleSummary(special:RallySpecial){return specials.find(s=>s.id===special)!.note;}
export function SpecialRuleDiagram({special}:{special:RallySpecial}){return <div className="rg-special-scene">{special==='induct'?<><Card value={2}/><Card color="evidence" value={3}/><Arrow/><Card value={5}/><Card color="evidence" value={5}/></>:special==='concentrate'?<Draw/>:special==='wild'?<><Card value={9}/><Arrow/><Card color="presence" value={2}/></>:<><DebateIcon card={special==='shout'?'pressure':'rebut'}/><span className="rg-effect">{special==='shout'?'雙倍':'反彈'}</span></>}</div>;}
export function RallyGuide({onClose}:{onClose:()=>void}){
 const [tab,setTab]=useState<'basic'|'special'>('basic'),panel=useRef<HTMLElement>(null);
 useEffect(()=>{const before=document.activeElement as HTMLElement|null;panel.current?.querySelector<HTMLButtonElement>('[role=tab]')?.focus();return()=>before?.focus();},[]);
 return <div className="ct-overlay rg-overlay"><section ref={panel} className="rg-book" role="dialog" aria-modal="true" aria-label="舌戰圖解" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button')??[]),index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(e.shiftKey&&index===0){e.preventDefault();buttons.at(-1)?.focus();}else if(!e.shiftKey&&index===buttons.length-1){e.preventDefault();buttons[0]?.focus();}}}}>
  <header><h2>舌戰圖解</h2><div className="rg-tabs" role="tablist" aria-label="說明分頁">{(['basic','special'] as const).map((id,i)=><button key={id} id={`rg-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls="rg-page" tabIndex={tab===id?0:-1} onClick={()=>setTab(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'basic':e.key==='End'?'special':id==='basic'?'special':'basic';setTab(next);panel.current?.querySelector<HTMLButtonElement>(`#rg-tab-${next}`)?.focus();}}}><DebateIcon card={i?'borrow':'proof'}/>{i?'特殊卡':'基礎規則'}</button>)}</div><GuideBackButton label="關閉舌戰圖解" onClick={onClose}/></header>
  <div id="rg-page" role="tabpanel" aria-labelledby={`rg-tab-${tab}`}>
  {tab==='basic'?<div className="rg-basic">
   <Scene wide title="同色，要更大" note="藍 4 → 藍 7，可以接"><Card value={4}/><Arrow/><Card value={7}/></Scene>
   <Scene wide title="同點，可換色" note="藍 7 → 紅 7，也可以接"><Card value={7}/><Arrow/><Card color="presence" value={7}/></Scene>
   <Scene title="無牌，自動跳過" note="沒有可用牌，就補 1 張交棒"><Card value={9}/><span className="rg-muted"><Card color="evidence" value={2}/></span><Arrow/><Draw count={1}/></Scene>
   <Scene title="對手跳過，你追擊" note="繼續出牌・每段傷害提升 20%"><span className="rg-muted"><RallyBack color="evidence" label="對手跳過"/></span><Arrow/><Card color="presence" value={8}/><span className="rg-combo">追擊<br/>20%</span></Scene>
   <Scene title="雙方無牌，另起" note="重開補 3 張・首張自由出"><img className="rg-stand" src="./art/debate/rally-opening-stand-v1.png" alt="另起"/><Arrow/><Draw/></Scene>
  </div>:<div className="rg-specials">{specials.map(sp=><article key={sp.id} aria-label={sp.detail}><RallyCard interactive={false} card={{id:0,kind:'special',special:sp.id}}/><h3>{sp.note}</h3><SpecialRuleDiagram special={sp.id}/></article>)}</div>}
  </div>
 </section></div>;
}
