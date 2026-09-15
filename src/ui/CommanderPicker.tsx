import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { CommanderSlot } from '../contracts/core/state.js';
import { defs, t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { TacticArt } from './TacticArt.js';
import { RealmIcon } from './RealmArt.js';
import './commander-picker.css';

interface Props {
  s: Session; choices: readonly NotableId[]; picked: readonly CommanderSlot[]; initialId: NotableId | undefined;
  onChange: (slots: readonly CommanderSlot[]) => void; onClose: () => void;
}
const name = (id: NotableId): string => t(defs.reader('notable').get(String(id)).nameKey);
/** Selection previews a commander; only the command plaque changes the party. */
export function CommanderPicker({ s, choices, picked, initialId, onChange, onClose }: Props): React.ReactElement {
  const initial = initialId && choices.includes(initialId) ? initialId : choices[0];
  const [active, setActive] = useState(initial);
  const [page, setPage] = useState(Math.floor(Math.max(0, choices.indexOf(initial!)) / 6));
  const [replacing, setReplacing] = useState(false), [notice, setNotice] = useState('');
  const preview = (id: NotableId): void => { setActive(id); setPage(Math.floor(Math.max(0, choices.indexOf(id)) / 6)); setReplacing(false); setNotice(''); };
  const options = active ? s.commanderSkills(active) : [];
  const equipped = picked.some(slot => slot.notableId === active);
  const change = (next: readonly CommanderSlot[], message: string): void => { onChange(next); setReplacing(false); setNotice(message); };
  const equip = (): void => {
    if (!active) return;
    if (equipped) { change(picked.filter(slot => slot.notableId !== active), '已卸下 ' + name(active)); return; }
    const skillId = options.at(-1);
    if (!skillId) return;
    if (picked.length < 3) change([...picked, { notableId: active, skillId }], '已編入 ' + name(active));
    else { setReplacing(true); setNotice('點下方指揮替換'); }
  };
  return <div className="commander-picker">
    <div className={"commander-library" + (choices.length > 6 ? " has-pages" : "")} aria-label="可同行指揮">
      {choices.length ? <div className="commander-catalog">{choices.slice(page * 6, page * 6 + 6).map(id => <button className="commander-choice" key={String(id)} aria-label={'查看指揮：' + name(id)} aria-pressed={active === id} onClick={() => preview(id)}><CharacterArt name={name(id)} /><b>{name(id)}</b>{picked.some(slot => slot.notableId === id) && <img className="commander-seal" src="./art/ui/campaign/enlisted-seal-v6.png" alt="已編入" />}</button>)}</div> : <div className="commander-empty"><RealmIcon name="bond" /><p>尚無同行指揮</p></div>}
      {choices.length > 6 && <nav className="commander-pages" aria-label="指揮分頁"><button className="command-control control-prev" aria-label="上一頁" disabled={page === 0} onClick={() => setPage(x => x - 1)} /><span>{page + 1} / {Math.ceil(choices.length / 6)}</span><button className="command-control control-next" aria-label="下一頁" disabled={(page + 1) * 6 >= choices.length} onClick={() => setPage(x => x + 1)} /></nav>}
    </div>
    {active && <section className="commander-inspect" aria-label={name(active) + '指揮資料'}>
      <div className="commander-hero"><CharacterArt name={name(active)} /></div><h3>{name(active)}</h3>
      <div className="commander-supports" aria-label="可用支援招式">{options.map(id => <span key={String(id)}><TacticArt id={id} /><b>{t(defs.reader('skill').get(String(id)).nameKey)}</b></span>)}</div>
      <button className="commander-equip" disabled={!equipped && options.length === 0} onClick={equip}>{equipped ? '卸下指揮' : options.length === 0 ? '尚無支援招式' : replacing ? '選擇下方指揮' : picked.length >= 3 ? '替換指揮' : '編入隊伍'}</button>
    </section>}
    <footer className={'commander-lineup' + (replacing ? ' is-replacing' : '')}>
      <div className="commander-lineup-label"><b>同行</b><span>{picked.length} / 3</span></div>
      <div className="commander-slots">{Array.from({ length: 3 }, (_, i) => { const member = picked[i]; return <button className="commander-slot" key={i} disabled={!member && !replacing} aria-label={replacing && active ? '以' + name(active) + '替換' + (member ? name(member.notableId) : '空位') : '同行位置 ' + (i + 1) + (member ? '：' + name(member.notableId) : '：空位')} onClick={() => {
        const skillId = options.at(-1);
        if (replacing && active && skillId) change(picked.map((old, index) => index === i ? { notableId: active, skillId } : old), '已編入 ' + name(active));
        else if (member) preview(member.notableId);
      }}>{member ? <><CharacterArt name={name(member.notableId)} portrait /><b>{name(member.notableId)}</b></> : <b className="commander-vacant">空位</b>}</button>; })}</div>
      <p className="commander-notice" role="status" aria-live="polite">{notice}</p>
    </footer>
    <button className="commander-finish" onClick={onClose}>整備完成</button>
  </div>;
}
