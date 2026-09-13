import { ArtControl } from './ArtControl.js';
import { projectGrowth } from './growth-preview.js';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '../app/session.js';
import { ATTRS, type Attr, type CareerLine } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
export interface GrowthView { values: Record<Attr,number>; exp: Record<Attr,number>; learning:number }
export const captureGrowth=(s:Session):GrowthView=>({values:{...s.current.attributes.values},exp:Object.fromEntries(ATTRS.map(a=>[a,s.expOf(a)])) as Record<Attr,number>,learning:s.learningExp});

function GradeBadge({grade}:{grade:string}):React.ReactElement {
  const id=useId();
  const colors:Record<string,string>={S:'#f2bd42',A:'#bb87ef',B:'#62a5e2',C:'#6cbb9f',D:'#c49862',E:'#a3acb6',F:'#858b91',G:'#777879'};
  const tint=colors[grade]??colors.G;
  return <svg className="grade-medal" viewBox="0 0 48 52" role="img" aria-label={`評級 ${grade}`}>
    <defs><linearGradient id={id} x2=".25" y2="1"><stop stopColor="#fffbe6"/><stop offset=".35" stopColor={tint}/><stop offset=".48" stopColor="#fffce6"/><stop offset=".53" stopColor={tint}/><stop offset="1" stopColor="#423a32"/></linearGradient></defs>
    <path d="M6 4 24 1 42 4 45 35 24 50 3 35Z" fill="#201c1a" stroke={tint} strokeWidth="2"/>
    <path d="M9 7 24 4 39 7 41 33 24 45 7 33Z" fill="none" stroke={tint} opacity=".5"/>
    <text x="24" y="36" textAnchor="middle" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="900" fontSize="34" fill={`url(#${id})`} stroke="#171311" strokeWidth=".65" paintOrder="stroke">{grade}</text>
  </svg>;
}
function CareerIcon({line}:{line:CareerLine}):React.ReactElement {
  return <svg className={`career-icon ${line}`} viewBox="0 0 44 44" role="img" aria-label={line==='civil'?'文官冠印':'武官兵符'}><path d="m22 2 18 10v20L22 42 4 32V12Z" fill="#30271c" stroke="#c6a56b" strokeWidth="2"/>{line==='civil'?<g fill="#c5ddcf" stroke="#557365" strokeWidth="1.5"><path d="M12 23h20v8H12zM15 23V12h14v11M7 20h8v5H7zM29 20h8v5h-8z"/><path d="M19 12v11m6-11v11" fill="none"/></g>:<g stroke="#e4bd78" strokeWidth="3" fill="none"><path d="m12 10 20 23m-1-23L12 33M9 26l8 7m10 0 8-7"/><path d="m12 10 1 8m18-8-1 8"/></g>}</svg>;
}
export function Hud({ s, onLearn, onVault, growth, preview }: { readonly s: Session; readonly onLearn?: () => void; readonly onVault?: () => void; readonly preview?: Partial<Record<Attr,number>> | undefined; readonly growth?:GrowthView | undefined }): React.ReactElement {
  const [careerList,setCareerList]=useState<CareerLine|null>(null);
  const trigger=useRef<HTMLButtonElement|null>(null);
  const close=():void=>{setCareerList(null);trigger.current?.focus();};
  return <section className="player-panel" aria-label="本輪能力與官途">
    <div className="player-panel-title"><span>此生修為</span><span className="learning-total">學習點 <b>{growth?.learning ?? s.learningExp}</b></span></div>
    <div className="stat-grid">{ATTRS.map(attr=>{
      const value=growth?.values[attr]??s.current.attributes.values[attr],exp=growth?.exp[attr]??s.expOf(attr),cap=s.attrCap(attr),next=s.attrCost(attr,value+1);
      const predicted=projectGrowth(value,exp,preview?.[attr]??0,cap,v=>s.attrCost(attr,v)),raised=predicted.value>value;
      return <div className={`stat-cell attr-${attr}`} key={attr}><div className="stat-top"><span className={`painted-stat-icon painted-stat-${attr}`} aria-hidden="true"/><span className="stat-glyph">{t(`attr.${attr}.short`)}</span><strong className={raised?"predicted-value":undefined} aria-label={raised?`${t(`attr.${attr}.short`)}預計 ${predicted.value}，目前 ${value}`:undefined}>{raised?predicted.value:value}</strong><GradeBadge grade={s.gradeOf(attr)}/>{preview&&<span className="stat-preview" aria-label={t('attr.'+attr+'.short')+'預計經驗'}>+{preview[attr]??0}<small>經驗</small></span>}</div><div className="stat-track" role="progressbar" aria-label={`${t(`attr.${attr}.short`)}能力成長`} aria-valuemin={0} aria-valuemax={next} aria-valuenow={value>=cap?next:Math.floor(exp)}><i style={{width:`${predicted.basePercent}%`}}/>{predicted.ghostPercent>0&&<span className="stat-ghost" aria-label={`預計增加 ${preview?.[attr]??0} 經驗`} style={{left:`${predicted.basePercent}%`,width:`${predicted.ghostPercent}%`}}/>}</div></div>;
    })}</div>
    <div className="career-row">{(['civil','martial'] as const).map(line=>{
      const rank=s.current.career[line],merit=s.current.currencies.merit[line],rows=defs.reader('careerRank').all().filter(x=>x.line===line).sort((a,b)=>a.level-b.level),here=rows.find(x=>x.level===rank),next=rows.find(x=>x.level===rank+1);
      const base=here?.requiredMerit??0,required=next?Math.max(1,next.requiredMerit-base):1,progress=next?Math.min(required,Math.max(0,merit-base)):1;
      return <div className="career-meter" key={line}><CareerIcon line={line}/><div className="career-detail"><div className="career-name"><span className="career-line-label">{line==='civil'?'文官':'武官'}</span><b>{here?t(here.nameKey):'白身'}</b></div><div className={`career-track ${line}`} role="progressbar" aria-label={line==='civil'?'文官功績':'武官功績'} aria-valuemin={0} aria-valuemax={required} aria-valuenow={progress}><i style={{width:`${progress/required*100}%`}}/></div></div><button className="career-list-button" aria-label={line==='civil'?'查看文官官階':'查看武官官階'} onClick={e=>{trigger.current=e.currentTarget;setCareerList(line);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M3 6h1M3 12h1M3 18h1" stroke="currentColor" strokeWidth="2"/></svg></button></div>;
    })}</div>
    {onLearn===undefined&&onVault===undefined?null:<div className="hud-actions">{onLearn&&<button onClick={onLearn}>修習</button>}{onVault&&<button onClick={onVault}>器物</button>}</div>}
    {careerList&&createPortal(<div className="game-modal career-dialog" role="dialog" aria-modal="true" aria-label={careerList==='civil'?'文官官階':'武官官階'} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}if(e.key==='Tab'){e.preventDefault();}}}><div className="settings-paper career-paper"><ArtControl kind="close" label="關閉官階" className="panel-close" autoFocus onClick={close}/><h1><CareerIcon line={careerList}/>{careerList==='civil'?'文官官階':'武官官階'}</h1><div className="career-ladder">{defs.reader('careerRank').all().filter(x=>x.line===careerList).sort((a,b)=>a.level-b.level).map(row=><div key={String(row.id)} className={row.level===s.current.career[careerList]?'current':''} aria-current={row.level===s.current.career[careerList]?'step':undefined}><span>{t(row.nameKey)}</span><small>{row.requiredMerit} 功績{row.level===s.current.career[careerList]?' · 現職':''}</small></div>)}</div></div></div>,document.querySelector('.game-stage')??document.body)}
  </section>;
}
