import { careerPresentation } from './career-presentation.js';
import { UiSymbol } from './UiSymbol.js';
import { useId } from 'react';
import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
import { SLOT_INDICES, type Attr, type SlotIndex } from '../contracts/core/primitives.js';


function ActionEmblem({attr}:{attr:Attr}):React.ReactElement {
  return <span className={`compact-action-image compact-action-${attr}`} aria-hidden="true" />;
}

export function ActionDock({s,onPick,selected,onPreview}:{s:Session;onPick:(i:SlotIndex)=>void;selected:SlotIndex;onPreview:(i:SlotIndex)=>void}):React.ReactElement {
  const id=useId();
  return <section className="action-dock command-dock" aria-label="本回合行動"><div className="dock-heading"><span>今日之令</span><small>擇一而行</small></div><div className="command-tokens">{SLOT_INDICES.map(i=>{
    const slot=s.current.turn.slots[i];if(!slot)return null;
    const pv=s.previewTraining(i),names=slot.notables.map(n=>t(defs.reader('notable').get(String(n)).nameKey));
    const profile=careerPresentation(slot.attr,s.current.career),label=profile.label,tip=`${id}-${i}`;
    return <div className={`command-wrap ${selected===i?'selected':''}`} key={i}>
      <button className={`command-token attr-${slot.attr}`} aria-label={`${label}・${profile.action}`} aria-describedby={tip} onPointerEnter={()=>onPreview(i)} onFocus={()=>onPreview(i)} aria-pressed={selected===i} onClick={()=>onPick(i)}>
        {selected===i&&<UiSymbol name="arrow" className="selected-arrow"/>}<ActionEmblem attr={slot.attr}/>
      </button>
      <div className="command-tooltip" id={tip} role="tooltip"><b>{label} · {profile.action}</b><span>同行：{names.join('、')||'獨自磨練'}</span>{pv.hasCommission&&<span>「令」：本次有委託</span>}{pv.hasEncounter&&<span>「緣」：本次有人物事件</span>}</div>
    </div>;
  })}</div></section>;
}
