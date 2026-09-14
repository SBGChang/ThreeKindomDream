import { useState } from 'react';
import type { Session, LearningOffer } from '../app/session.js';
import type { TraitId } from '../contracts/core/ids.js';
import { t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { ServiceHeader, ServicePager } from './ServiceUI.js';

export function ScreenLearn({ s, bump, onBack }: { s: Session; bump: () => void; onBack: () => void }): React.ReactElement {
  const [tab, setTab] = useState<'skill' | 'trait'>('skill');
  const [page, setPage] = useState(0), [selected, setSelected] = useState(''), [notice, setNotice] = useState('');
  const all = s.learningOffers().filter(o => o.kind === tab).sort((a,b) => ({common:0,fine:1,peerless:2}[a.tier] - {common:0,fine:1,peerless:2}[b.tier]));
  const rows = all.slice(page * 6, page * 6 + 6), course = rows.find(o => o.id === selected) ?? rows[0];
  const reason = (o: LearningOffer): string => o.status === 'max' ? '已精通此項所學' : o.status === 'battle' ? '事件或戰鬥結束後可訓練' : o.status === 'locked' ? '尚待傳授：' + (o.teachers.join('、') || '戰役秘笈') : o.status === 'chapter' ? '第 ' + o.chapterNeed + ' 章開放' : o.status === 'funds' ? '還差 ' + (o.cost - s.money) + ' 錢' : o.status === 'attribute' ? '能力尚未達標' : '條件齊備，可開始訓練';
  return <section className="run-service training-service" aria-label="訓練">
    <ServiceHeader title="訓練" subtitle="磨練所學 · 不消耗回合" onBack={onBack} />
    <aside className="service-host"><CharacterArt name="于禁" /><div className="host-words"><b>熟能生巧</b><p>常階直接學習；良、絕階須先取得傳授。</p><small>技能可選三招出陣<br/>特性可同時啟用四條</small></div></aside>
    <div className="training-book">
      <div className="course-index">
        <div className="service-tabs" aria-label="訓練類型">{(['skill','trait'] as const).map(key => <button key={key} aria-pressed={tab === key} onClick={() => {setTab(key);setPage(0);setNotice('');}}>{key === 'skill' ? '技能' : '特性'}{key === 'trait' && <small>{s.current.abilities.activeTraits?.length ?? 0}/4</small>}</button>)}</div>
        <div className="course-list">{rows.map(o => <button className="course-entry" key={o.id} aria-pressed={course?.id === o.id} onClick={() => {setSelected(o.id);setNotice('');}}>
          <span className={'entry-stat-icon entry-stat-' + o.attr}/><span><b>{o.name}</b><small>{{common:'常',fine:'良',peerless:'絕'}[o.tier]}階 · {o.active ? '已啟用' : o.level ? '已習得' : o.status === 'locked' ? '未傳授' : '未習得'}</small></span><strong>{o.level}<small>/{o.maxLevel}</small></strong>
        </button>)}</div>
        <ServicePager page={page} total={Math.ceil(all.length / 6)} onPage={setPage} label="課程分頁" />
      </div>
      {course && <article className="course-detail" key={course.id}>
        <span className="service-kicker">{tab === 'skill' ? '兵法招式' : '修身特性'} · {{common:'常',fine:'良',peerless:'絕'}[course.tier]}階</span>
        <h2>{course.name}</h2><p className="course-description">{course.description}</p>
        <div className="course-progression"><div><small>目前等級</small><b>{course.level}<em>/{course.maxLevel}</em></b></div><span>→</span><div><small>{course.status === 'max' ? '已達上限' : '下次訓練'}</small><b>{Math.min(course.level + 1, course.maxLevel)}<em>級</em></b></div></div>
        <p className="course-effect">效果倍率 <b>×{course.power.toFixed(2)}</b>{course.level < course.maxLevel && <> → <strong>×{course.nextPower.toFixed(2)}</strong></>}</p>
        {course.level < course.maxLevel && <div className="course-requirements"><span className={course.value >= course.need ? 'met' : ''}>{t('attr.'+course.attr+'.short')} {course.value} / {course.need}</span>{course.secondaryNeed > 0 && <span className={course.secondaryValue >= course.secondaryNeed ? 'met' : ''}>{t('attr.'+course.secondary+'.short')} {course.secondaryValue} / {course.secondaryNeed}</span>}<span className={s.current.progress.chapter >= course.chapterNeed ? 'met' : ''}>第 {course.chapterNeed} 章</span></div>}
        <p className="course-status">{reason(course)}</p>
        <div className="course-purchase"><button className="service-buy" disabled={course.status !== 'ready'} onClick={() => {if(s.upgradeAbility(course.id))setNotice(course.name+'升至 '+(course.level+1)+' 級，支付 '+course.cost+' 錢');bump();}}>{course.status === 'max' ? '已精通' : (course.level ? '升級' : '學習')+' · '+course.cost+' 錢'}</button>
        {tab === 'trait' && course.level > 0 && <button aria-pressed={course.active} disabled={course.status === 'battle' || (!course.active && (s.current.abilities.activeTraits?.length ?? 0) >= 4)} onClick={() => {s.toggleTrait(course.id as TraitId);bump();}}>{course.active ? '停用特性' : '啟用特性'}</button>}</div>
      </article>}
    </div>
    <p className="service-notice" role="status">{notice}</p>
  </section>;
}
