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

interface Props { readonly onLearn: () => void; readonly s: Session; readonly bump: () => void; readonly onDepart: () => void }
const PREP_TABS = [{ id: 'skills', name: '主將招式' }, { id: 'commanders', name: '同行指揮' }] as const;
type PrepTab = typeof PREP_TABS[number]['id'];
type Picker = { kind: 'skills' } | { kind: 'commanders' } | { kind: 'support'; id: NotableId };
const skillDef = (id: SkillId) => defs.reader('skill').get(String(id));
const skillName = (id: SkillId): string => t(skillDef(id).nameKey);
const notableName = (id: NotableId): string => t(defs.reader('notable').get(String(id)).nameKey);
const kindLabel = (id: SkillId): string => ({ physical: '武攻', magic: '計攻', heal: '恢復', buff: '強化', debuff: '削弱' })[skillDef(id).action.kind];
const number = (value: number): string => value.toLocaleString('zh-TW');
function SkillIcon({ id }: { id: SkillId }): React.ReactElement {
  return <span className={'prep-skill-icon prep-attr-' + skillDef(id).action.actorAttr} aria-hidden="true" />;
}
function PreparationDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);
  return <div className="prep-dialog-shade" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="prep-dialog" ref={ref} role="dialog" aria-modal="true" aria-label={title} onKeyDown={e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const first = buttons[0], last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}><header><h2>{title}</h2><button className="prep-close" aria-label="完成配置" onClick={onClose}>×</button></header>{children}</div>
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
  const [picker, setPicker] = useState<Picker | null>(null), [page, setPage] = useState(0);
  useEffect(() => {
    if (s.campaignState()?.phase === 'configuring') { s.rememberCampaign({ skills: picked, commanders: cmd }); bump(); }
  }, [s, picked, cmd, bump]);
  useEffect(() => { if (s.campaignState()?.phase !== 'configuring' && s.campaignState() !== null) onDepart(); }, [s, onDepart]);
  if (!st) return <p>沒有進行中的戰役。</p>;
  if (st.phase !== 'configuring') return <p>全軍出陣……</p>;
  const chapter = defs.reader('chapter').get(String(s.current.progress.chapterId));
  const limits = s.hostLimits(), rows = s.stageRows(), rule = defs.single('battleRule');
  const open = (next: Picker): void => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPage(0); setPicker(next); };
  const close = (): void => { setPicker(null); requestAnimationFrame(() => opener.current?.focus()); };
  const toggleSkill = (id: SkillId): void => setPicked(current => current.includes(id) ? current.filter(x => x !== id) : current.length < 3 ? [...current, id] : current);
  const toggleCommander = (id: NotableId): void => setCmd(current => {
    if (current.some(x => x.notableId === id)) return current.filter(x => x.notableId !== id);
    const skillId = s.commanderSkills(id).at(-1);
    return current.length < 3 && skillId !== undefined ? [...current, { notableId: id, skillId }] : current;
  });
  const relationship = (id: NotableId): React.ReactElement => {
    const stage = s.commanderStage(id), affinity = s.current.roster.members.find(x => x.notableId === id)?.affinity ?? 0;
    return <span className="prep-bond" title={t('stage.' + stage)}><UiSymbol name={stage === 'stranger' || stage === 'acquainted' ? 'red' : stage === 'friendly' ? 'gold' : 'green'} /><span role="meter" aria-label={notableName(id) + '好感'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={affinity}><i style={{ width: Math.min(100, Math.max(0, affinity)) + '%' }} /></span></span>;
  };
  const pagination = (total: number): React.ReactElement | null => total <= 6 ? null : <nav className="prep-pagination" aria-label="配置選項分頁"><button aria-label="上一頁" disabled={page === 0} onClick={() => setPage(x => x - 1)}>‹</button><span>{page + 1} / {Math.ceil(total / 6)}</span><button aria-label="下一頁" disabled={(page + 1) * 6 >= total} onClick={() => setPage(x => x + 1)}>›</button></nav>;
  return <section className="campaign-prep" aria-label="出戰整備"><div inert={picker !== null}>
    <header className="prep-heading"><span>第 {s.current.progress.chapter} 章 · {t(chapter.titleKey)}</span><h1>整軍出陣</h1></header>
    <button className="prep-learn" onClick={onLearn}><img src="/art/ui/demo-match/journal-book.png" alt="" /><span>戰前修習<small>{number(s.learningExp)} 學習點</small></span></button>
    <aside className="prep-host" aria-label="主將與我軍兵糧"><div className="prep-hero"><CareerHero profile={careerPresentation(s.current.career.civil > s.current.career.martial ? 'int' : 'war', s.current.career)} /></div><div className="prep-host-record"><h2>我軍整備</h2>
      <div className="prep-attributes">{ATTRS.map(attr => <span key={attr} title={t('attr.' + attr + '.short') + ' · ' + s.gradeOf(attr)}><i className={'prep-skill-icon prep-attr-' + attr} /><b>{t('attr.' + attr + '.short')}</b><strong>{s.current.attributes.values[attr]}</strong></span>)}</div>
      {[{ label: '兵量', value: limits.troopsMax, tone: 'troops' }, { label: '糧秣', value: limits.supplyMax, tone: 'supply' }].map(item => <div className={'prep-resource ' + item.tone} key={item.tone}><div><b>{item.label}</b><strong>{number(item.value)}<small> / {number(item.value)}</small></strong></div><span className="prep-resource-track" role="meter" aria-label={item.label} aria-valuemin={0} aria-valuemax={item.value} aria-valuenow={item.value}><i /></span></div>)}
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
      <div className="prep-skills">{Array.from({ length: 3 }, (_, i) => { const id = picked[i]; return <button className={'prep-skill-slot ' + (id ? '' : 'is-empty')} key={i} aria-label={id ? '更換主將招式：' + skillName(id) : '配置主將招式 ' + (i + 1)} onClick={() => open({ kind: 'skills' })}>{id ? <><SkillIcon id={id} /><b>{skillName(id)}</b></> : <><span className="prep-plus">＋</span><b>選擇招式</b></>}</button>; })}</div>
    </section><section className="prep-command prep-panel" role="tabpanel" id="prep-panel-commanders" aria-labelledby="prep-tab-commanders" hidden={tab !== 'commanders'}>
      {eligible.length === 0 ? <div className="prep-no-command"><RealmIcon name="bond" /><p>尚無同行指揮</p></div> : <div className="prep-commanders">{Array.from({ length: 3 }, (_, i) => { const member = cmd[i]; return member ? <article className="prep-commander" key={String(member.notableId)}><button className="prep-portrait" aria-label={'更換指揮：' + notableName(member.notableId)} onClick={() => open({ kind: 'commanders' })}><CharacterArt name={notableName(member.notableId)} portrait /><b>{notableName(member.notableId)}</b>{relationship(member.notableId)}</button><button className="prep-support" aria-label={notableName(member.notableId) + '支援招式：' + skillName(member.skillId)} onClick={() => open({ kind: 'support', id: member.notableId })}><SkillIcon id={member.skillId} /><span>{skillName(member.skillId)}</span></button></article> : <button className="prep-empty-commander" key={'empty-' + i} aria-label={'選擇指揮 ' + (i + 1)} onClick={() => open({ kind: 'commanders' })}><RealmIcon name="bond" /><span>＋ 邀請指揮</span></button>; })}</div>}
      </section></div>
    <aside className="prep-route" aria-label="七關行軍路線"><h2>行軍路線</h2><p>累計學習點</p><ol>{rows.map(row => <li key={row.index} className={row.boss ? 'has-general' : ''}><span className="prep-route-no">{row.index + 1}</span><div><b>{row.boss ? t(row.boss.nameKey) : '第 ' + (row.index + 1) + ' 關'}{row.unique && <span className="prep-drop" title="本關含特殊掉落" aria-label="本關含特殊掉落">◆</span>}</b><small>{number(row.cumulative)}<span> 點</span></small></div>{row.boss && <CharacterArt name={t(row.boss.nameKey)} portrait />}</li>)}</ol></aside>
    <footer className="prep-footer">{picked.length === 0 && <span className="prep-warning" role="status">未攜帶主將招式</span>}<button className="prep-depart" onClick={() => { s.configureCampaign({ skills: picked, commanders: cmd }); onDepart(); bump(); }}><img src="/art/ui/campaign/depart-v1.png" alt="" /><span>全軍出陣</span></button></footer>
    </div>{picker && <PreparationDialog title={picker.kind === 'skills' ? '主將招式' : picker.kind === 'commanders' ? '同行指揮' : notableName(picker.id) + ' · 支援招式'} onClose={close}>
      {picker.kind === 'skills' && <><p className="prep-dialog-hint">已攜帶 {picked.length} / 3 · 點選已攜帶的招式可卸下{picked.length === 3 ? '，卸下一招後即可更換。' : '。'}<br />配置後隨機施放，每回合至少一招{rule.castChances.slice(1).map((chance, i) => `，第${i + 2}招 ${Math.round(chance * 100)}%`)}。</p><div className="prep-picker-grid">{learned.slice(page * 6, page * 6 + 6).map(id => <button className="prep-option" key={String(id)} aria-pressed={picked.includes(id)} disabled={!picked.includes(id) && picked.length >= 3} onClick={() => toggleSkill(id)}><SkillIcon id={id} /><span><b>{skillName(id)} <small>Lv.{s.abilityLevel(id)}</small></b><em>{kindLabel(id)} · {t('attr.' + skillDef(id).action.actorAttr + '.short')}</em><p>{t(skillDef(id).descKey)}</p></span><strong className="prep-check" aria-hidden="true">{picked.includes(id) ? '✓' : '＋'}</strong></button>)}</div>{learned.length === 0 && <div className="prep-dialog-empty"><RealmIcon name="book" /><p>尚未學會主將招式</p><button onClick={onLearn}>前往戰前修習 ›</button></div>}{pagination(learned.length)}</>}
      {picker.kind === 'commanders' && <><p className="prep-dialog-hint">已編入 {cmd.length} / 3 · 點選已編入的指揮可卸下，空位不影響出陣。<br />每人攜帶一招支援；好感越高，傳令越頻繁。</p><div className="prep-picker-grid">{eligible.slice(page * 6, page * 6 + 6).map(id => { const selected = cmd.some(x => x.notableId === id), options = s.commanderSkills(id); return <button className="prep-option prep-person-option" key={String(id)} aria-pressed={selected} disabled={(!selected && cmd.length >= 3) || options.length === 0} onClick={() => toggleCommander(id)}><CharacterArt name={notableName(id)} portrait /><span><b>{notableName(id)}</b>{relationship(id)}<small>{options.length ? `每回合 ${Math.round(rule.commandChanceByStage[s.commanderStage(id)] * 100)}% 傳令` : '尚未解放支援招式'}</small></span><strong className="prep-check" aria-hidden="true">{selected ? '✓' : '＋'}</strong></button>; })}</div>{pagination(eligible.length)}</>}
      {picker.kind === 'support' && <><p className="prep-dialog-hint">每位指揮攜帶一招；星階越高，可選的招式越多。</p><div className="prep-picker-grid">{s.commanderSkills(picker.id).slice(page * 6, page * 6 + 6).map(id => <button className="prep-option" key={String(id)} aria-pressed={cmd.some(x => x.notableId === picker.id && x.skillId === id)} onClick={() => setCmd(current => current.map(x => x.notableId === picker.id ? { ...x, skillId: id } : x))}><SkillIcon id={id} /><span><b>{skillName(id)}</b><em>{kindLabel(id)}</em><p>{t(skillDef(id).descKey)}</p></span><strong className="prep-check" aria-hidden="true">{cmd.some(x => x.notableId === picker.id && x.skillId === id) ? '✓' : '＋'}</strong></button>)}</div>{pagination(s.commanderSkills(picker.id).length)}</>}
      <footer><p className="prep-dialog-rules">兵糧依官階與特性計算；出陣後配置鎖定，跨關不回滿。<br />每關勝利後可收兵；戰敗不會夢醒，已得獎勵減半。</p><button className="prep-done" onClick={close}>配置完成 ✓</button></footer>
    </PreparationDialog>}
  </section>;
}
