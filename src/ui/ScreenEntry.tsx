import {ItemArt} from './ItemArt.js';
import { EntryTalentIcon } from './EntryTalentIcon.js';
import { RealmIcon } from './RealmArt.js';
import { CharacterArt } from './CharacterArt.js';
import { useState } from 'react';
import type { MetaState, DreamEntryConfig } from '../contracts/core/state.js';
import type { AptitudeGrade, Attr } from '../contracts/core/primitives.js';
import { APTITUDE_GRADES, ATTRS } from '../contracts/core/primitives.js';
import type { ItemId, TalentId } from '../contracts/core/ids.js';
import {
  defs, draftCost, draftLimits, emptyDraft, t, validateDraft,
} from '../app/bootstrap.js';

interface Props {
  readonly meta: MetaState;
  readonly onEnter: (config: DreamEntryConfig) => void;
  readonly onBack: () => void;
}

const ENTRY_TABS = [{id:'aptitude',name:'資質',icon:'aptitude'},{id:'talent',name:'天賦',icon:'talent'},{id:'items',name:'器物',icon:'chest'}] as const;
type EntryTab = typeof ENTRY_TABS[number]['id'];

const has = <T,>(xs: readonly T[], x: T): boolean => xs.some((y) => String(y) === String(x));
const toggle = <T,>(xs: readonly T[], x: T, cap: number): readonly T[] => {
  if (has(xs, x)) return xs.filter((y) => String(y) !== String(x));
  return xs.length >= cap ? xs : [...xs, x];
};

/** 入夢只設定資質、天賦與器物；同行安排於遊戲中進行。草稿超支時保留選擇並停用入夢。 */
export function ScreenEntry({ meta, onEnter, onBack }: Props): React.ReactElement {
  const [draft, setDraft] = useState<DreamEntryConfig>(() => emptyDraft(meta, defs));
  const [tab, setTab] = useState<EntryTab>('aptitude');
  const lim = draftLimits(meta, defs);
  const c = draftCost(draft, meta, defs);
  const errors = validateDraft(draft, meta, defs);
  const aptCost = defs.single('aptitudeCost');
  const grades = defs.reader('aptitudeGrade').all();
  const capOf = (a: Attr): number =>
    grades.find((g) => g.grade === draft.aptitudes[a])?.attrCap ?? 0;

  const setApt = (a: Attr, g: AptitudeGrade): void => {
    setDraft((d) => ({ ...d, aptitudes: { ...d.aptitudes, [a]: g } }));
  };



  return <section className={"dream-entry entry-tabbed theme-"+tab}>
    <header className="entry-heading"><div><RealmIcon name="glow"/><h1>入夢</h1></div><button type="button" data-game-back className="entry-art-back" aria-label="返回天命" title="返回天命" onClick={onBack}><img src="/art/ui/entry/button-back-v2.png" alt="" draggable={false}/></button></header>
    <nav className="entry-tabs" role="tablist" aria-label="入夢準備">{ENTRY_TABS.map((it,i)=><button key={it.id} id={'entry-tab-'+it.id} role="tab" aria-selected={tab===it.id} aria-controls={'entry-panel-'+it.id} tabIndex={tab===it.id?0:-1} onClick={()=>setTab(it.id)} onKeyDown={e=>{const direction=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(direction||e.key==='Home'||e.key==='End'){e.preventDefault();const next=ENTRY_TABS[e.key==='Home'?0:e.key==='End'?ENTRY_TABS.length-1:(i+direction+ENTRY_TABS.length)%ENTRY_TABS.length]!;setTab(next.id);document.getElementById('entry-tab-'+next.id)?.focus();}}}><RealmIcon name={it.icon}/><span>{it.name}</span></button>)}</nav>
    <div className="entry-scene" style={{backgroundImage:"url('/art/ui/entry/"+tab+"-v2.png')"}}>
    {tab==='aptitude'&&<div className="entry-incarnation"><CharacterArt name="主將"/></div>}
    <div className="entry-grid">
      <section hidden={tab!=='aptitude'} role="tabpanel" id="entry-panel-aptitude" aria-labelledby="entry-tab-aptitude" className="entry-card entry-aptitudes"><header><RealmIcon name="aptitude"/><h2>資質</h2><b className={c.aptitudePointsUsed>lim.aptitudePoints?'over-budget':''}>{c.aptitudePointsUsed} / {lim.aptitudePoints}</b></header>
        <div className="entry-aptitude-rows">{ATTRS.map(a=><div className={'entry-aptitude attr-'+a} key={a}><span className={'entry-stat-icon entry-stat-'+a} aria-hidden="true"/><b>{t('attr.'+a+'.short')}</b><div className="entry-grades" role="group" aria-label={t('attr.'+a+'.short')+'資質'}>{APTITUDE_GRADES.map(g=><button key={g} aria-label={t('attr.'+a+'.short')+'資質 '+g} aria-pressed={draft.aptitudes[a]===g} disabled={APTITUDE_GRADES.indexOf(g)>APTITUDE_GRADES.indexOf(lim.aptitudeCaps[a])} onClick={()=>setApt(a,g)} title={'累計 '+(aptCost.cumulativeCost[g]??0)+' 點'}>{g}</button>)}</div><span className="entry-cap" title="本輪能力上限"><small>上限</small>{capOf(a)}</span></div>)}</div>
      </section>
      <section hidden={tab!=='talent'} role="tabpanel" id="entry-panel-talent" aria-labelledby="entry-tab-talent" className="entry-card entry-talent"><header><RealmIcon name="talent"/><h2>天賦</h2><b className={c.talentPointsUsed>lim.talentPoints?'over-budget':''}>{c.talentPointsUsed} / {lim.talentPoints}</b></header><div className="entry-card-body entry-talents" tabIndex={0} aria-label="可選天賦">{lim.unlockedTalents.length?lim.unlockedTalents.map((id:TalentId)=>{const d=defs.reader('talent').get(String(id)),on=has(draft.talents,id);return <button key={String(id)} aria-pressed={on} onClick={()=>setDraft(x=>({...x,talents:on?x.talents.filter(y=>String(y)!==String(id)):[...x.talents,id]}))}><EntryTalentIcon id={String(id)}/><span><b>{t(d.nameKey)}</b><small>{t(d.descKey)}</small></span><strong>{d.cost}</strong></button>;}):<div className="entry-empty"><RealmIcon name="talent" className="unlit"/><span>尚未解放天賦</span></div>}</div></section>
      <section hidden={tab!=='items'} role="tabpanel" id="entry-panel-items" aria-labelledby="entry-tab-items" className="entry-card entry-items"><header><RealmIcon name="chest"/><h2>隨身器物</h2><b>{draft.carriedItems.length} / {lim.carrySlots}</b></header><div className="entry-card-body entry-choices" tabIndex={0} aria-label="可攜帶器物">{lim.carriableItems.length?lim.carriableItems.map((id:ItemId)=>{const d=defs.reader('item').get(String(id)),on=has(draft.carriedItems,id);return <button key={String(id)} aria-pressed={on} title={t(d.descKey)} onClick={()=>setDraft(x=>({...x,carriedItems:toggle(x.carriedItems,id,lim.carrySlots)}))}><ItemArt name={t(d.nameKey)}/><span>{t(d.nameKey)}</span></button>;}):<div className="entry-empty"><RealmIcon name="chest" className="unlit"/><span>尚無可攜帶器物</span></div>}</div></section>
    </div></div>
    <footer className="entry-footer"><div role="status" className="entry-validation">{errors.map(e=><span key={e}>{e}</span>)}</div><button type="button" className="entry-confirm entry-art-enter" aria-label="入夢" disabled={errors.length>0} onClick={()=>onEnter(draft)}><img src="/art/ui/entry/button-enter-v2.png" alt="" draggable={false}/></button></footer>
  </section>;
}
