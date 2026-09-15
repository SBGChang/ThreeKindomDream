import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId, SkillId } from '../contracts/core/ids.js';
import type { CommanderSlot } from '../contracts/core/state.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { CareerHero } from './CareerTheater.js';
import { careerPresentation } from './career-presentation.js';
import { RealmIcon } from './RealmArt.js';
import { UiSymbol } from './UiSymbol.js';
import { TacticArt } from './TacticArt.js';
import { TacticPicker } from './TacticPicker.js';
import { CommanderPicker } from './CommanderPicker.js';
import { WaveBriefing } from './WaveBriefing.js';

interface Props { readonly onLearn: () => void; readonly s: Session; readonly bump: () => void; readonly onDepart: () => void }
const PREP_TABS = [{ id: 'skills', name: '主將招式' }, { id: 'commanders', name: '同行指揮' }] as const;
type PrepTab = typeof PREP_TABS[number]['id'];
type Picker = { kind: 'skills'; id?: SkillId } | { kind: 'commanders'; id?: NotableId } | { kind: 'support'; id: NotableId } | { kind: 'wave'; index: number };
const skillDef = (id: SkillId) => defs.reader('skill').get(String(id));
const skillName = (id: SkillId): string => t(skillDef(id).nameKey);
const notableName = (id: NotableId): string => t(defs.reader('notable').get(String(id)).nameKey);
const number = (value: number): string => value.toLocaleString('zh-TW');
function PreparationDialog({ title, onClose, children, tactics = false, commanders = false, briefing = false }: { title: string; onClose: () => void; children: ReactNode; tactics?: boolean; commanders?: boolean; briefing?: boolean }): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);
  return <div className="prep-dialog-shade" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={'prep-dialog' + (tactics ? ' prep-dialog-tactics' : commanders ? ' prep-dialog-commanders' : briefing ? ' prep-dialog-wave' : '')} ref={ref} role="dialog" aria-modal="true" aria-label={title} onKeyDown={e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const first = buttons[0], last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}><header><h2>{title}</h2><button className="prep-close" aria-label="關閉" onClick={onClose}><span aria-hidden="true" /></button></header>{children}</div>
  </div>;
}
/** The desk edits the same loadout that Session freezes on departure. */
export function ScreenCampaign({ s, bump, onDepart, onLearn }: Props): React.ReactElement {
  const st = s.current.campaign, learned = s.current.abilities.skills;
  const eligible = st ? s.eligibleCommanders() : [];
  const [picked, setPicked] = useState<readonly SkillId[]>(() => st?.loadout?.skills ?? learned.slice(0, 3));
  const [cmd, setCmd] = useState<readonly CommanderSlot[]>(() => st?.loadout?.commanders ?? eligible.slice(0, 3).flatMap(id => {
    const skillId = s.commanderSkills(id).at(-1);
    return skillId === undefined ? [] : [{ notableId: id, skillId }];
  }));
  const [tab, setTab] = useState<PrepTab>('skills');
  const opener = useRef<HTMLElement | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  useEffect(() => {
    if (s.campaignState()?.phase === 'configuring') { s.rememberCampaign({ skills: picked, commanders: cmd }); bump(); }
  }, [s, picked, cmd, bump]);
  useEffect(() => { if (s.campaignState()?.phase !== 'configuring' && s.campaignState() !== null) onDepart(); }, [s, onDepart]);
  if (!st) return <p>沒有進行中的戰役。</p>;
  if (st.phase !== 'configuring') return <p>全軍出陣……</p>;
  const chapter = defs.reader('chapter').get(String(s.current.progress.chapterId));
  const limits = s.hostLimits(), rows = s.stageRows();
  const wave = picker?.kind === 'wave' ? rows.find(row => row.index === picker.index) : undefined;
  const enemyArt = (bossName?: string): React.ReactElement => bossName ? <CharacterArt name={bossName} portrait /> : <CharacterArt name="敵軍" portrait />;
  const open = (next: Picker): void => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPicker(next); };
  const close = (): void => { setPicker(null); requestAnimationFrame(() => opener.current?.focus()); };
  const relationship = (id: NotableId): React.ReactElement => {
    const stage = s.commanderStage(id), affinity = s.current.roster.members.find(x => x.notableId === id)?.affinity ?? 0;
    return <span className="prep-bond" title={t('stage.' + stage)}><UiSymbol name={stage === 'stranger' || stage === 'acquainted' ? 'red' : stage === 'friendly' ? 'gold' : 'green'} /><span role="meter" aria-label={notableName(id) + '好感'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={affinity}><i style={{ width: Math.min(100, Math.max(0, affinity)) + '%' }} /></span></span>;
  };
  return <section className="campaign-prep" aria-label="出戰整備"><div inert={picker !== null}>
    <header className="prep-heading"><span>{t(chapter.titleKey)}</span><h1>整軍出陣</h1></header>
    <button className="prep-learn" onClick={onLearn}><img src="./art/ui/demo-match/journal-book.png" alt="" /><span>戰前訓練<small>{number(s.money)} 錢</small></span></button>
    <aside className="prep-host" aria-label="主將與我軍兵糧"><div className="prep-hero"><CareerHero profile={careerPresentation(s.current.career.civil > s.current.career.martial ? 'int' : 'war', s.current.career)} /></div><div className="prep-host-record"><h2>我軍整備</h2>
      <div className="prep-attributes">{ATTRS.map(attr => <span key={attr} title={t('attr.' + attr + '.short') + ' · ' + s.gradeOf(attr)}><i className={'prep-skill-icon prep-attr-' + attr} /><b>{t('attr.' + attr + '.short')}</b><strong>{number(Math.round(s.current.attributes.values[attr]*10)/10)}</strong></span>)}</div>
      {[{ label: '兵量', value: limits.troopsMax, tone: 'troops' }, { label: '糧秣', value: limits.supplyMax, tone: 'supply' }].map(item => <div className={'prep-resource ' + item.tone} key={item.tone}><div><b><img className="prep-resource-icon" src={'./art/ui/campaign/' + item.tone + '-icon-v1.png'} alt="" />{item.label}</b><strong>{number(item.value)}<small> / {number(item.value)}</small></strong></div><span className="prep-resource-track" role="meter" aria-label={item.label} aria-valuemin={0} aria-valuemax={item.value} aria-valuenow={item.value}><i /></span></div>)}
    </div></aside>
    <div className={'prep-desk prep-tab-' + tab}>
      <nav className="prep-tabs" role="tablist" aria-label="出戰配置">{PREP_TABS.map((item, i) => <button key={item.id} id={'prep-tab-' + item.id} role="tab" aria-selected={tab === item.id} aria-controls={'prep-panel-' + item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={e => {
        const direction = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (direction || e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          const next = PREP_TABS[e.key === 'Home' ? 0 : e.key === 'End' ? PREP_TABS.length - 1 : (i + direction + PREP_TABS.length) % PREP_TABS.length]!;
          setTab(next.id); document.getElementById('prep-tab-' + next.id)?.focus();
        }
      }}><span className={'prep-tab-icon ' + item.id} aria-hidden="true" />{item.name}</button>)}</nav>
      <section className="prep-player-skills prep-panel" role="tabpanel" id="prep-panel-skills" aria-labelledby="prep-tab-skills" hidden={tab !== 'skills'}>
      <div className="prep-skills">{Array.from({ length: 3 }, (_, i) => { const id = picked[i]; return <button className={'prep-skill-slot ' + (id ? '' : 'is-empty')} key={i} aria-label={id ? '更換主將招式：' + skillName(id) : '配置主將招式 ' + (i + 1)} onClick={() => open({ kind: 'skills', ...(id ? { id } : {}) })}>{id ? <><TacticArt id={id} /><b>{skillName(id)}</b></> : <><span className="prep-plus">＋</span><b>選擇招式</b></>}</button>; })}</div>
    </section><section className="prep-command prep-panel" role="tabpanel" id="prep-panel-commanders" aria-labelledby="prep-tab-commanders" hidden={tab !== 'commanders'}>
      {eligible.length === 0 ? <div className="prep-no-command"><RealmIcon name="bond" /><p>尚無同行指揮</p></div> : <div className="prep-commanders">{Array.from({ length: 3 }, (_, i) => { const member = cmd[i]; return member ? <article className="prep-commander" key={String(member.notableId)}><button className="prep-portrait" aria-label={'更換指揮：' + notableName(member.notableId)} onClick={() => open({ kind: 'commanders', id: member.notableId })}><CharacterArt name={notableName(member.notableId)} /><b>{notableName(member.notableId)}</b>{relationship(member.notableId)}</button><button className="prep-support" aria-label={notableName(member.notableId) + '支援招式：' + skillName(member.skillId)} onClick={() => open({ kind: 'support', id: member.notableId })}><TacticArt id={member.skillId} /><span>{skillName(member.skillId)}</span></button></article> : <button className="prep-empty-commander" key={'empty-' + i} aria-label={'選擇指揮 ' + (i + 1)} onClick={() => open({ kind: 'commanders' })}><RealmIcon name="bond" /><span>＋ 邀請指揮</span></button>; })}</div>}
      </section></div>
    <aside className="prep-route" aria-label="關卡軍情"><ol>{rows.map(row => <li key={row.index}><button className="prep-wave" onClick={() => open({ kind: 'wave', index: row.index })} aria-label={'查看第 ' + (row.index + 1) + ' 關軍情，' + (row.boss ? t(row.boss.nameKey) : '敵軍') + '，兵力 ' + number(s.campaignWaveTroops(row.index))}>
      <span className="prep-route-no" aria-hidden="true"><b>{row.index + 1}</b></span><span className="prep-enemy-art" aria-hidden="true">{enemyArt(row.boss ? t(row.boss.nameKey) : undefined)}</span><strong className="prep-wave-strength">{number(s.campaignWaveTroops(row.index))}</strong>
    </button></li>)}</ol></aside>
    <footer className="prep-footer">{picked.length === 0 && <span className="prep-warning" role="status">未攜帶主將招式</span>}<button className="prep-depart" onClick={() => { s.configureCampaign({ skills: picked, commanders: cmd }); onDepart(); bump(); }}><img src="./art/ui/campaign/depart-v1.png" alt="" /><span>全軍出陣</span></button></footer>
    </div>{picker && <PreparationDialog title={picker.kind === 'skills' ? '主將招式' : picker.kind === 'commanders' ? '同行指揮' : picker.kind === 'support' ? notableName(picker.id) + ' · 支援招式' : '第 ' + (picker.index + 1) + ' 關 · 軍情'} onClose={close} tactics={picker.kind === 'skills' || picker.kind === 'support'} commanders={picker.kind === 'commanders'} briefing={picker.kind === 'wave'}>
      {picker.kind === 'skills' && <TacticPicker s={s} choices={learned} picked={picked} initialId={picker.id} limit={3} onChange={setPicked} onClose={close} onLearn={onLearn} />}

      {picker.kind === 'commanders' && <CommanderPicker s={s} choices={eligible} picked={cmd} initialId={picker.id} onChange={setCmd} onClose={close} />}
      {picker.kind === 'support' && <TacticPicker s={s} choices={s.commanderSkills(picker.id)} picked={cmd.filter(x => x.notableId === picker.id).map(x => x.skillId)} initialId={cmd.find(x => x.notableId === picker.id)?.skillId} notable={picker.id} limit={1} onChange={skills => { const skillId = skills[0]; if (skillId) setCmd(current => current.map(x => x.notableId === picker.id ? { ...x, skillId } : x)); }} onClose={close} onLearn={onLearn} />}

      {wave && <WaveBriefing s={s} wave={wave} onClose={close} />}
    </PreparationDialog>}
  </section>;
}
