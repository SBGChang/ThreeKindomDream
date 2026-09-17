import { useState } from 'react';
import { CharacterArt, CHARACTERS } from './CharacterArt.js';
import { PORTRAIT_LAYOUTS, type PortraitContext } from './portrait-layouts.js';
import { characterFraming } from './portrait-framing.js';
import { PortraitSourcePreview, PortraitFaceGuide } from './PortraitSourcePreview.js';
import './portrait-review.css';

const cast = Object.entries(CHARACTERS).filter(([,id],i,rows)=>rows.findIndex(([,other])=>other===id)===i);
export function ArtGallery(): React.ReactElement {
  const [context,setContext] = useState<PortraitContext>('default');
  const [guides,setGuides] = useState(true);
  const [compact,setCompact] = useState(false);
  return <main className={`art-gallery portrait-review ${compact?'portraits-only':''}`}>
    <h1>人物頭像 · 裁切校正</h1>
    <p>臉部中心置中；只量臉，不含頭髮與頭盔。臉部等比例縮放至寬、高最多各占 50%。</p>
    <div className="portrait-review-controls">
      <label>頭像使用位置：<select value={context} onChange={e=>setContext(e.target.value as PortraitContext)}>{Object.entries(PORTRAIT_LAYOUTS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
      <label><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/>顯示裁切框與中心線</label>
      <label><input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)}/>只看頭像</label>
      <span><i className="head-key"/>純臉部 50% <i className="crop-key"/>置中取景框</span>
    </div>
    <div className="art-gallery-grid">{cast.map(([name,id])=>{
      const data=characterFraming(id);
      return <figure key={id}>
        <figcaption><strong>{name}</strong><small>{data.generation==='v3-redraw'?'本次重繪':data.generation==='legacy-wu'?'待換新版':'已重繪'}</small></figcaption>
        <div className="portrait-source">{guides?<PortraitSourcePreview id={id} name={name} context={context}/>:<CharacterArt name={name}/>}</div>
        <div className={`portrait-result ${guides?'show-guides':''}`}><CharacterArt name={name} portrait context={context}/>{guides&&<PortraitFaceGuide id={id} context={context}/>}</div>
        <small className="portrait-result-label">臉部中心置中 · 純臉部 50%</small>
      </figure>;
    })}</div>
  </main>;
}
