import { ScreenEntry } from './ScreenEntry.js';
import { useState } from 'react';
import { loadMeta,defs } from '../app/bootstrap.js';
import { GameFrame } from './GameFrame.js';
import { ScreenNotableCodex,ScreenItemCodex } from './ScreenCodex.js';
import { ScreenShop } from './ScreenShop.js';
/** Uses a local copy for art review; never writes either the run or meta save. */
export function RealmReview():React.ReactElement{
 const sample=new URLSearchParams(location.search).has('sample');
 const [meta,setMeta]=useState(()=>{const saved=loadMeta();return sample?{...saved,...(new URLSearchParams(location.search).get('view')==='entry'?{shop:{purchased:Object.fromEntries(defs.reader('shopItem').all().map(it=>[String(it.item),it.levels.length]))},notableCodex:Object.fromEntries(defs.reader('notable').all().map(it=>[String(it.notableId),{star:3,fragments:0}]))}:{}),itemCodex:Object.fromEntries(defs.reader('item').all().map(it=>[String(it.itemId),{tier:2,fragments:12}]))}:saved;}),[view,setView]=useState(new URLSearchParams(location.search).get('view')??'notables');
 return <GameFrame meta={meta} session={null} active={view} onGo={v=>setView(v==='destiny'?'notables':v)} saveNotice={sample?"示例藏品 · 不寫入存檔":"美術預覽 · 不寫入存檔"}>{view==='entry'?<ScreenEntry meta={meta} onEnter={()=>setView('notables')} onBack={()=>setView('notables')}/>:view==='shop'?<ScreenShop meta={meta} onMeta={setMeta} onBack={()=>setView('notables')}/>:view==='items'?<ScreenItemCodex meta={meta} onBack={()=>setView('notables')}/>:<ScreenNotableCodex meta={meta} onBack={()=>{location.href='./';}}/>}</GameFrame>;
}
