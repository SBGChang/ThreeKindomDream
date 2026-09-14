import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { SkillId, NotableId } from '../contracts/core/ids.js';
import { defs, t } from '../app/bootstrap.js';
import { TacticArt } from './TacticArt.js';
import { RealmIcon } from './RealmArt.js';
import './tactic-picker.css';

interface Props {
  s: Session; choices: readonly SkillId[]; picked: readonly SkillId[]; initialId: SkillId | undefined;
  notable?: NotableId; limit: number; onChange: (ids: readonly SkillId[]) => void; onClose: () => void; onLearn: () => void;
}
const name = (id: SkillId): string => t(defs.reader('skill').get(String(id)).nameKey);
/** Browsing never changes a loadout; equipping and replacing are explicit actions. */
export function TacticPicker({ s, choices, picked, initialId, notable, limit, onChange, onClose, onLearn }: Props): React.ReactElement {
  const initial = initialId && choices.includes(initialId) ? initialId : choices[0];
  const [active, setActive] = useState(initial);
  const [page, setPage] = useState(Math.floor(Math.max(0, choices.indexOf(initial!)) / 6));
  const [replacing, setReplacing] = useState(false);
  const [notice, setNotice] = useState('');
  const preview = (id: SkillId): void => { setActive(id); setPage(Math.floor(Math.max(0, choices.indexOf(id)) / 6)); setReplacing(false); setNotice(''); };
  const equipped = active !== undefined && picked.includes(active);
  const info = active ? s.realtimeSkillInfo(active, notable) : undefined;
  const skill = active ? defs.reader('skill').get(String(active)) : undefined;
  const action = skill?.action;
  const kind = action ? ({ physical: '武攻', magic: '計攻', heal: '恢復', buff: '強化', debuff: '削弱' })[action.kind] : '';
  const change = (next: readonly SkillId[], message: string): void => { onChange(next); setReplacing(false); setNotice(message); };
  const equip = (): void => {
    if (!active) return;
    if (limit === 1) change([active], '已攜帶 ' + name(active));
    else if (equipped) change(picked.filter(id => id !== active), '已卸下 ' + name(active));
    else if (picked.length < limit) change([...picked, active], '已攜帶 ' + name(active));
    else { setReplacing(true); setNotice('選擇下方要替換的位置'); }
  };
  return <div className="tactic-picker">
    <div className="tactic-library" aria-label="已學戰法">
      {choices.length ? <div className="tactic-catalog">{choices.slice(page * 6, page * 6 + 6).map(id => <button key={String(id)} className="tactic-choice" data-tier={defs.reader('skill').get(String(id)).tier} aria-label={'查看戰法：' + name(id)} aria-pressed={active === id} onClick={() => preview(id)}><TacticArt id={id} /><b>{name(id)}</b>{picked.includes(id) && <img className="tactic-equipped-seal" src="/art/ui/campaign/enlisted-seal-v6.png" alt="已攜帶" />}</button>)}</div> : <div className="tactic-empty"><RealmIcon name="book" /><p>尚未學會戰法</p><button onClick={onLearn}>戰前訓練 ›</button></div>}
      {choices.length > 6 && <nav className="tactic-pages" aria-label="戰法分頁"><button className="command-control control-prev" aria-label="上一頁" disabled={page === 0} onClick={() => setPage(x => x - 1)} /><span>{page + 1} / {Math.ceil(choices.length / 6)}</span><button className="command-control control-next" aria-label="下一頁" disabled={(page + 1) * 6 >= choices.length} onClick={() => setPage(x => x + 1)} /></nav>}
    </div>
    {active && info && <section className="tactic-inspect" data-tier={skill?.tier} data-kind={action?.kind} aria-label={name(active) + '效果'}>
      <div className="tactic-hero"><TacticArt id={active} />{!notable && <span className="tactic-level" role="img" aria-label={"技能等級 " + s.abilityLevel(active)} title={"技能等級 " + s.abilityLevel(active)}><b aria-hidden="true">{s.abilityLevel(active)}</b></span>}</div>
      <h3>{name(active)}</h3>
      <p className="tactic-kind">{skill && <span className="tactic-quality">{t('abilityTier.' + skill.tier)}</span>}{kind} · {action && t('attr.' + action.actorAttr + '.short')}</p><p className="tactic-effect">{info.description.split(/(\d+(?:\.\d+)?%?)/).map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part)}</p>
      <div className="tactic-costs"><span className="tactic-supply-cost"><img src="/art/ui/campaign/supply-icon-v1.png" alt="" /><span><small>軍糧</small><b>{info.cost}</b></span></span><span className="tactic-cooldown-cost"><img src="/art/ui/campaign/hourglass-v1.png" alt="" /><span><small>冷卻</small><b>{info.cd}<small> 秒</small></b></span></span></div>
      <button className="tactic-equip" disabled={limit === 1 && equipped} onClick={equip}>{equipped ? limit === 1 ? '已攜帶 ✓' : '卸下招式' : replacing ? '選擇下方位置' : picked.length >= limit ? '替換招式' : '攜帶招式'}</button>
    </section>}
    <footer className={'tactic-loadout' + (replacing ? ' is-replacing' : '')}>
      <div className="tactic-loadout-heading"><b>{replacing ? '替換位置' : '出戰戰法'}</b><span>{picked.length} / {limit}</span><p role="status" aria-live="polite">{notice}</p></div>
      <div className="tactic-slots">{Array.from({ length: limit }, (_, i) => { const id = picked[i]; return <button key={i} className="tactic-slot" disabled={!id && !replacing} aria-label={replacing && active ? '以' + name(active) + '替換' + (id ? name(id) : '空位') : '出戰位置 ' + (i + 1) + (id ? '：' + name(id) : '：空位')} onClick={() => {
        if (replacing && active) change(picked.map((old, index) => index === i ? active : old), '已替換為 ' + name(active));
        else if (id) preview(id);
      }}><span className="tactic-slot-key">{notable ? '援' : i + 1}</span>{id ? <><TacticArt id={id} /><b>{name(id)}</b></> : <span className="tactic-slot-empty">＋</span>}</button>; })}</div>
    </footer>
    <button className="tactic-finish" onClick={onClose}>確定</button>
  </div>;
}
