import {ItemArt} from './ItemArt.js';
import { RealmBack } from './RealmBack.js';
import { RealmIcon,RealmStars } from './RealmArt.js';
import { useState } from 'react';
import type { MetaState } from '../contracts/core/state.js';
import { defs, itemCodex, notableCodex, recruited, t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { OfficerPortrait } from './GameFrame.js';
interface Props { readonly meta:MetaState; readonly onBack:()=>void }
function Frag({have,need}:{have:number;need:number|null}):React.ReactElement {
 return <div className="realm-progress"><i style={{width:`${need===null?100:Math.min(100,have/Math.max(1,need)*100)}%`}}/><span>{need===null?'已臻圓滿':`碎片 ${have} / ${need}`}</span></div>;
}
export function ScreenNotableCodex({meta,onBack}:Props):React.ReactElement {
 const rows=defs.reader('notable').all().slice().sort((a,b)=>b.rarity-a.rarity);
 const [selected,setSelected]=useState(String(rows[0]?.notableId));
 const n=rows.find(x=>String(x.notableId)===selected)??rows[0];
 return <section className="realm realm-heroes"><header className="realm-heading"><div><RealmIcon name="book"/><h1>風雲錄</h1></div><RealmBack onClick={onBack}/></header><div className="hero-book"><nav className="hero-index" aria-label="名士史冊">{rows.map(r=><button className={r===n?'selected':''} aria-pressed={r===n} key={String(r.notableId)} onClick={()=>setSelected(String(r.notableId))}><OfficerPortrait context="codex" name={t(r.nameKey)}/><span>{t(r.nameKey)}<RealmStars count={notableCodex.starOf(r.notableId,meta)} total={notableCodex.maxStar(defs)}/></span></button>)}</nav>{n&&<article className="hero-folio" key={String(n.notableId)}><div className="hero-illustration"><CharacterArt name={t(n.nameKey)}/></div><div className="hero-biography"><h2>{t(n.nameKey)}</h2><RealmStars count={notableCodex.starOf(n.notableId,meta)} total={notableCodex.maxStar(defs)}/><Frag have={notableCodex.entry(n.notableId,meta).fragments} need={notableCodex.nextCost(n.notableId,meta,defs)}/><p>{recruited(String(n.notableId),meta,defs)?'已開放相逢':'尚未結緣'} · {n.recruitment?.hint}</p><h3>羈絆傳承</h3><ul>{notableCodex.unlockedRows(n.notableId,meta,defs).map(u=><li key={String(u.descKey)}>{t(u.descKey)}</li>)}</ul>{notableCodex.unlockedRows(n.notableId,meta,defs).length===0&&<p>升星解鎖傳承</p>}</div></article>}</div></section>;
}
export function ScreenItemCodex({meta,onBack}:Props):React.ReactElement {
 const all=defs.reader('item').all().slice().sort((a,b)=>b.rarity-a.rarity);
 const rows=all;
 const owned=all.filter(it=>meta.itemCodex[String(it.itemId)]!==undefined).length;
 const [selected,setSelected]=useState('');
 const it=rows.find(x=>String(x.itemId)===selected)??rows[0];
 return <section className="realm realm-treasury"><header className="realm-heading"><div><RealmIcon name="chest"/><h1>天工閣</h1></div><span>藏品 {owned} / {all.length}</span><RealmBack onClick={onBack}/></header>{it?<div className="treasury-layout"><div className="treasury-shelves">{rows.map(r=><button key={String(r.itemId)} className={r===it?'selected':''} aria-pressed={r===it} onClick={()=>setSelected(String(r.itemId))}><ItemArt name={t(r.nameKey)} className="relic-art"/><b>{t(r.nameKey)}</b><RealmStars count={itemCodex.tierOf(r.itemId,meta)+1}/></button>)}</div><article className="relic-detail"><ItemArt name={t(it.nameKey)} className="relic-art large"/><h2>{t(it.nameKey)}</h2><RealmStars count={it.rarity}/><p>{meta.itemCodex[String(it.itemId)]?'已收藏':'尚未取得'} · {t(it.descKey)}</p><p>取得方式：{it.sourceHint}</p><Frag have={itemCodex.entry(it.itemId,meta).fragments} need={itemCodex.nextCost(it.itemId,meta,defs)}/><ul>{it.tiers.map(row=><li key={row.tier} className={itemCodex.unlockedTiers(it.itemId,meta,defs).some(o=>o.tier===row.tier)?'':'sealed'}>{t(row.descKey)}</li>)}</ul></article></div>:<div className="treasury-empty"><RealmIcon name="chest" className="vault-art"/><h2>尚未收藏</h2><p>在夢中獲得器物，即可收藏於此。</p></div>}</section>;
}
