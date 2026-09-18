import { EffectText } from './EffectRules.js';
import {ItemArt} from './ItemArt.js';
import './treasury-codex.css';
import './notable-codex.css';
import { RealmBack } from './RealmBack.js';
import { RealmIcon,RealmStars } from './RealmArt.js';
import { useState } from 'react';
import type { MetaState } from '../contracts/core/state.js';
import { defs, itemCodex, notableCodex, recruited, t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { OfficerPortrait } from './GameFrame.js';
interface Props { readonly meta:MetaState; readonly onBack:()=>void }
// 穩定排序由次要條件排到主要條件，編號採自然數字順序（2 在 10 前）。
function codexOrder<T>(rows:readonly T[],id:(row:T)=>string,stars:(row:T)=>number,unlocked:(row:T)=>boolean):T[] {
 return rows.slice().sort((a,b)=>id(a).localeCompare(id(b),'en',{numeric:true}))
  .sort((a,b)=>stars(a)-stars(b))
  .sort((a,b)=>Number(unlocked(b))-Number(unlocked(a)));
}
function Frag({have,need}:{have:number;need:number|null}):React.ReactElement {
 return <div className="realm-progress"><i style={{width:`${need===null?100:Math.min(100,have/Math.max(1,need)*100)}%`,'--fragment-remaining':`${need===null?0:100-Math.max(0,Math.min(100,have/Math.max(1,need)*100))}%`} as React.CSSProperties}/><span>{need===null?'已臻圓滿':`碎片 ${have} / ${need}`}</span></div>;
}
export function ScreenNotableCodex({meta,onBack}:Props):React.ReactElement {
 const unlocked=(n:{readonly notableId:unknown})=>recruited(String(n.notableId),meta,defs);
 const rows=codexOrder(defs.reader('notable').all(),n=>String(n.notableId),n=>notableCodex.starOf(n.notableId,meta),unlocked);
 const [selected,setSelected]=useState(String(rows[0]?.notableId));
 const n=rows.find(x=>String(x.notableId)===selected&&unlocked(x))??rows.find(unlocked);
 return <section className="realm realm-heroes"><header className="realm-heading"><div><RealmIcon name="book"/><h1>風雲錄</h1></div><RealmBack onClick={onBack}/></header><div className="hero-book"><nav className="hero-index" aria-label="名士史冊">{rows.map(r=><button className={!unlocked(r)?'codex-locked':r===n?'selected':''} disabled={!unlocked(r)} aria-label={unlocked(r)?t(r.nameKey):'未解鎖武將'} aria-pressed={r===n} key={String(r.notableId)} onClick={()=>setSelected(String(r.notableId))}><div className="codex-portrait" aria-hidden={!unlocked(r)}><OfficerPortrait context="codex" name={t(r.nameKey)}/></div>{unlocked(r)&&<span>{t(r.nameKey)}<RealmStars count={notableCodex.starOf(r.notableId,meta)} total={notableCodex.maxStar(defs)}/></span>}</button>)}</nav>{n&&<article className="hero-folio" key={String(n.notableId)}><div className="hero-illustration"><CharacterArt name={t(n.nameKey)}/></div><div className="hero-biography"><h2>{t(n.nameKey)}</h2><RealmStars count={notableCodex.starOf(n.notableId,meta)} total={notableCodex.maxStar(defs)}/><Frag have={notableCodex.entry(n.notableId,meta).fragments} need={notableCodex.nextCost(n.notableId,meta,defs)}/><p className="hero-encounter"><RealmIcon name="bond"/><span>{recruited(String(n.notableId),meta,defs)?'已開放相逢':'尚未結緣'} · {n.recruitment?.hint}</span></p><h3><RealmIcon name="book"/><span>羈絆傳承</span></h3><ul className="hero-inheritances">{notableCodex.unlockedRows(n.notableId,meta,defs).map(u=><li key={String(u.descKey)}><RealmIcon name="talent"/><span><EffectText text={t(u.descKey)}/></span></li>)}</ul>{notableCodex.unlockedRows(n.notableId,meta,defs).length===0&&<p className="hero-empty"><RealmIcon name="talent"/><span>升星解鎖傳承</span></p>}</div></article>}</div></section>;
}
const SHELF_PAGE_SIZE=12; // 呈現參數：每頁藏品格數
export function ScreenItemCodex({meta,onBack}:Props):React.ReactElement {
 const unlocked=(it:{readonly itemId:unknown})=>meta.itemCodex[String(it.itemId)]!==undefined;
 const all=codexOrder(defs.reader('item').all(),it=>String(it.itemId),it=>it.rarity,unlocked);
 const owned=all.filter(unlocked).length;
 const [page,setPage]=useState(0),[selected,setSelected]=useState(''),[tab,setTab]=useState<'effects'|'source'>('effects');
 const pages=Math.max(1,Math.ceil(all.length/SHELF_PAGE_SIZE));
 const currentPage=Math.min(page,pages-1);
 const rows=all.slice(currentPage*SHELF_PAGE_SIZE,(currentPage+1)*SHELF_PAGE_SIZE);
 const it=rows.find(x=>String(x.itemId)===selected&&unlocked(x))??rows.find(unlocked);
 const turnPage=(next:number)=>{if(next<0||next>=pages)return;setPage(next);setSelected('');};
 const collected=it&&meta.itemCodex[String(it.itemId)]!==undefined;
 return <section className="realm realm-treasury treasury-paged"><header className="realm-heading"><div><RealmIcon name="chest"/><h1>天工閣</h1></div><span>藏品 {owned} / {all.length}</span><RealmBack onClick={onBack}/></header><div className="treasury-layout">
  <section className="treasury-cabinet" aria-label="物品陳列架">
   <div className="treasury-shelves" key={currentPage} aria-label={'第 '+(currentPage+1)+' 頁藏品'}>{Array.from({length:SHELF_PAGE_SIZE},(_,i)=>{const r=rows[i];return r?<button key={String(r.itemId)} className={!unlocked(r)?'codex-locked':r===it?'selected':''} disabled={!unlocked(r)} aria-pressed={r===it} aria-label={unlocked(r)?t(r.nameKey)+'，已收藏':'未解鎖器物'} onClick={()=>setSelected(String(r.itemId))}><span className="shelf-object" aria-hidden={!unlocked(r)}><ItemArt name={t(r.nameKey)} className="relic-art" grounded/></span>{unlocked(r)&&<span className="shelf-nameplate"><b>{t(r.nameKey)}</b><RealmStars count={r.rarity}/></span>}{meta.itemCodex[String(r.itemId)]&&<span className="shelf-collected">藏</span>}</button>:<span key={'empty-'+i} className="shelf-empty" aria-hidden="true"/>;})}</div>
   <nav className="shelf-pagination" aria-label="陳列架翻頁"><button aria-label="上一頁藏品" disabled={currentPage===0} onClick={()=>turnPage(currentPage-1)}>‹</button><button aria-label="下一頁藏品" disabled={currentPage===pages-1} onClick={()=>turnPage(currentPage+1)}>›</button></nav>
  </section>
  {it&&<article className="relic-detail" aria-label="物品詳情">
   <header className="relic-heading"><ItemArt name={t(it.nameKey)} className="relic-art large"/><div><h2>{t(it.nameKey)}</h2><RealmStars count={it.rarity}/></div></header>
   <p className="relic-description">{t(it.descKey)}</p>
   <div className="relic-tabs" role="tablist" aria-label="道具資訊">{(['effects','source'] as const).map((id,i)=><button key={id} role="tab" id={'relic-tab-'+id} aria-selected={tab===id} aria-controls={'relic-panel-'+id} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'effects':e.key==='End'?'source':i===0?'source':'effects';setTab(next);document.getElementById('relic-tab-'+next)?.focus();}}}>{id==='effects'?'道具效果':'取得方式'}</button>)}</div>
   <section key={String(it.itemId)+tab} className="relic-content" role="tabpanel" id={'relic-panel-'+tab} aria-labelledby={'relic-tab-'+tab} tabIndex={0}>{tab==='effects'?<>
    {it.tiers.length>1?<><Frag have={itemCodex.entry(it.itemId,meta).fragments} need={itemCodex.nextCost(it.itemId,meta,defs)}/></>:<p className="relic-equipment-note">戰前配裝啟用 · 無需升階</p>}
    <ol className="relic-effects">{it.tiers.filter(row=>row.tier<=itemCodex.tierOf(it.itemId,meta)).map(row=><li key={row.tier} className={!collected||row.tier>itemCodex.tierOf(it.itemId,meta)?'tier-future':row.tier===itemCodex.tierOf(it.itemId,meta)?'tier-current':'tier-past'} aria-current={collected&&row.tier===itemCodex.tierOf(it.itemId,meta)?'step':undefined}><span className="relic-tier-icon" role="img" aria-label={row.tier===0?'基礎階級':row.tier+' 階'} title={row.tier===0?'基礎階級':row.tier+' 階'}><img src="./art/ui/attributes/grade-v1.png" alt=""/><b>{['〇','一','二','三','四','五','六'][row.tier]??row.tier}</b></span><span><EffectText text={t(row.descKey)}/></span></li>)}</ol>
   </>:<div className="relic-source"><h3>尋寶線索</h3><p>{it.sourceHint}</p><p className="relic-source-note">{collected?'已收錄於天工閣，可在入夢時選擇攜帶。':'取得實物並完成本輪結算後，收錄於天工閣。'}</p></div>}</section>
  </article>}
 </div></section>;
}
