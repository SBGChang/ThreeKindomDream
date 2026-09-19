import { useState } from 'react';
import type { Session, LearningOffer } from '../app/session.js';
import type { SkillId, TraitId } from '../contracts/core/ids.js';
import { t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { ServiceHeader, ServicePager } from './ServiceUI.js';
import { RealmIcon, RealmStars } from './RealmArt.js';
import { TacticArt } from './TacticArt.js';
import { TraitArt } from './TraitArt.js';
import './training-art.css';

const coursesPerPage = 4;

function CourseArt({ course }: { course: LearningOffer }): React.ReactElement {
  return course.kind === 'skill' ? <TacticArt id={course.id as SkillId} /> : <TraitArt id={course.id as TraitId} />;
}

function CourseSkillEffect({s,course}:{s:Session;course:LearningOffer}):React.ReactElement {
  const current=course.level>0?s.realtimeSkillInfo(course.id as SkillId):null;
  const next=course.level<course.maxLevel?s.previewSkillLevel(course.id as SkillId,course.level+1):null;
  const info=current??next!;
  const percent=info.effect==='buff'||info.effect==='debuff';
  const label=info.effect==='heal'?'恢復上限':info.effect==='buff'?'我軍攻擊':info.effect==='debuff'?'敵軍攻擊':'傷害';
  const value=(effect:typeof info)=>percent?(info.effect==='debuff'?'−':'+')+Math.round((effect.power??0)*100)+'%':effect.damage.toLocaleString('en-US');
  const attr=t('attr.'+course.attr+'.short');
  return <div className="course-skill-effect" aria-label="技能效果預覽">
    <div className="course-skill-values"><i className={'entry-stat-icon entry-stat-'+course.attr} role="img" aria-label={'依'+attr+'屬性'} title={'依'+attr+'屬性'}/><span>{label}</span>
      {current&&<b aria-label={'目前'+label+' '+value(current)}>{value(current)}</b>}
      {next&&<><span className="course-skill-arrow" aria-hidden="true">{current?'→':''}</span><span className="course-skill-next"><small>{current?'升級後':'習得後'}</small><strong aria-label={(current?'升級後':'習得後')+label+' '+value(next)}>{value(next)}</strong></span></>}
      {info.effect==='heal'&&<small>兵力</small>}
    </div>
    {percent&&<small className="course-skill-duration">持續 {info.effectDuration} 秒</small>}
  </div>;
}

export function ScreenLearn({ s, bump, onBack }: { s: Session; bump: () => void; onBack: () => void }): React.ReactElement {
  const [tab, setTab] = useState<'skill' | 'trait'>('skill');
  const [page, setPage] = useState(0), [selected, setSelected] = useState(''), [notice, setNotice] = useState('');
  const all = s.learningOffers().filter(o => o.kind === tab).sort((a,b) => ({common:0,fine:1,peerless:2}[a.tier] - {common:0,fine:1,peerless:2}[b.tier]));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(all.length / coursesPerPage) - 1));
  const rows = all.slice(currentPage * coursesPerPage, currentPage * coursesPerPage + coursesPerPage), course = rows.find(o => o.id === selected) ?? rows[0];
  const activeCount = s.current.abilities.activeTraits?.length ?? 0;
  const reason = course?.status === 'battle' ? '事件或戰鬥結束後可訓練' : course?.status === 'locked' ? '尚待傳授' : course?.status === 'funds' ? '還差 ' + (course.cost - s.money) + ' 金幣' : '';
  return <section className="run-service training-service" aria-label="訓練">
    <ServiceHeader title="訓練" onBack={onBack} />
    <aside className="service-host"><CharacterArt name="于禁" /><div className="host-words"><b>熟能生巧</b><div className="course-wallet" aria-label={'持有金幣 ' + s.money}><RealmIcon name="currency"/><strong>{s.money.toLocaleString('en-US')}</strong></div></div></aside>
    <div className="training-book">
      <div className="course-index">
        <div className="service-tabs" aria-label="訓練類型">{(['skill','trait'] as const).map(key => <button className="training-control course-tab" key={key} aria-pressed={tab === key} onClick={() => {setTab(key);setPage(0);setSelected('');setNotice('');}}><RealmIcon name={key === 'skill' ? 'book' : 'talent'}/><span>{key === 'skill' ? '技能' : '特性'}</span>{key === 'trait' && <small aria-label={`已啟用 ${activeCount} 條，上限 4 條`}>{activeCount}/4</small>}</button>)}</div>
        <div className={'course-list course-list-' + tab}>{rows.map(o => <button className="course-entry" key={o.id} data-tier={o.tier} aria-label={`查看${o.name}，${o.level}/${o.maxLevel}級${o.active ? '，已啟用' : ''}`} aria-pressed={course?.id === o.id} onClick={() => {setSelected(o.id);setNotice('');}}>
          <CourseArt course={o}/><b>{o.name}</b><div className="course-entry-level" title={`目前 ${o.level} 級，上限 ${o.maxLevel} 級`}><RealmStars count={o.level} total={o.maxLevel}/>{o.active && <span className="course-active" aria-label="已啟用"> ✓</span>}</div>
        </button>)}</div>
        {all.length > coursesPerPage && <ServicePager appearance="training" page={currentPage} total={Math.ceil(all.length / coursesPerPage)} onPage={p => {setPage(p);setNotice('');}} label="課程分頁" />}
      </div>
      {!course && <article className="course-detail course-empty"><RealmIcon name={tab === 'skill' ? 'book' : 'talent'}/><h2>尚待傳授</h2><p>隨人物事件習得{tab === 'skill' ? '技能' : '特性'}</p></article>}
      {course && <article className="course-detail" data-tier={course.tier} key={course.id}>
        <header className="course-title"><h2>{course.name}</h2><img className="course-tier" src={`./art/ui/training/rank-${course.tier}-v1.png`} alt={{common:'常級',fine:'良級',peerless:'絕級'}[course.tier]} title={{common:'常級',fine:'良級',peerless:'絕級'}[course.tier]}/><div className="course-level" title={`目前 ${course.level} 級，上限 ${course.maxLevel} 級`}><RealmStars count={course.level} total={course.maxLevel}/></div></header>
        <div className="course-hero" role="img" aria-label={course.name + (tab === 'skill' ? '技能圖' : '特性')}><CourseArt course={course}/></div>
        {course.kind==='skill'?<CourseSkillEffect s={s} course={course}/>:<>
          <p className="course-description">{course.description}</p>
          <div className="course-progression"><span>效果 <b>×{course.power.toFixed(2)}</b>{course.level < course.maxLevel && <><span aria-hidden="true"> → </span><strong>×{course.nextPower.toFixed(2)}</strong></>}</span>{course.level < course.maxLevel && <div className="course-next-level" title={`升級後 ${course.level + 1} 級`}><span aria-hidden="true">→</span><RealmStars count={course.level + 1} total={course.maxLevel}/></div>}</div>
        </>}
        <div className="course-decision">
          {course.level < course.maxLevel && <div id="course-requirements" className="course-requirements" aria-label="升級條件"><small>需求</small><span className={course.value >= course.need ? 'met' : ''}><i className={'entry-stat-icon entry-stat-' + course.attr} aria-hidden="true"/>{t('attr.'+course.attr+'.short')} {Math.floor(course.value)}/{course.need}</span>{course.secondaryNeed > 0 && <span className={course.secondaryValue >= course.secondaryNeed ? 'met' : ''}><i className={'entry-stat-icon entry-stat-' + course.secondary} aria-hidden="true"/>{t('attr.'+course.secondary+'.short')} {Math.floor(course.secondaryValue)}/{course.secondaryNeed}</span>}{course.chapterNeed > 1 && <span className={s.current.progress.chapter >= course.chapterNeed ? 'met' : ''}>第 {course.chapterNeed} 章{s.current.progress.chapter < course.chapterNeed ? '開放' : ' ✓'}</span>}</div>}
          {reason && <p className="course-status">{reason}</p>}
          <div className="course-purchase"><button className="training-control course-upgrade" aria-describedby={course.level < course.maxLevel ? 'course-requirements' : undefined} disabled={course.status !== 'ready'} onClick={() => {if(s.upgradeAbility(course.id))setNotice(course.name+'升至 '+(course.level+1)+' 級 · −'+course.cost+' 金幣');bump();}}>{course.status === 'max' ? '已精通' : <><span>{course.level === 0 ? '習得' : '升級'}</span><RealmIcon name="currency"/><b>{course.cost}</b></>}</button>
          {tab === 'trait' && course.level > 0 && <button className="training-control course-toggle" aria-pressed={course.active} aria-label={course.active ? '停用特性' : activeCount >= 4 ? '啟用特性，已達四條上限' : '啟用特性'} disabled={course.status === 'battle' || (!course.active && activeCount >= 4)} onClick={() => {s.toggleTrait(course.id as TraitId);bump();}}>{course.active ? '停用' : activeCount >= 4 ? '已滿 4/4' : '啟用'}</button>}</div>
        </div>
      </article>}
    </div>
    <p className="service-notice" role="status">{notice}</p>
  </section>;
}
