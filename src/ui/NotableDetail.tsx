import { useEffect, useRef, useState } from 'react';
import type { Session } from '../app/session.js';
import { defs, stageOf, t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { ArtControl } from './ArtControl.js';
import { UiSymbol } from './UiSymbol.js';
import './notable-detail.css';

export function NotableDetail({
  s,
  id,
  onClose,
  onLearn,
  onChange,
}: {
  s: Session;
  id: string;
  onClose: () => void;
  onLearn: () => void;
  onChange: () => void;
}): React.ReactElement {
  const def = defs.reader('notable').get(id),
    name = t(def.nameKey),
    member = s.current.roster.members.find((x) => String(x.notableId) === id),
    stage = member ? stageOf(member.notableId, s.ctx) : 'stranger',
    affinity = member?.affinity ?? 0,
    stories = s.storyRows(def.notableId);
  const [selected, setSelected] = useState(() => {
      const ready = stories.findIndex(
        (row) => !row.completed && !row.blockers.length,
      );
      return ready >= 0
        ? ready
        : Math.max(
            0,
            stories.findIndex((row) => !row.completed),
          );
    }),
    [tracked, setTracked] = useState(s.current.stories.tracked),
    [conditionPage, setConditionPage] = useState(0),
    ref = useRef<HTMLButtonElement>(null);
  const page = Math.floor(selected / 4),
    pages = Math.max(1, Math.ceil(stories.length / 4)),
    current = stories[selected],
    completed = stories.filter((row) => row.completed).length,
    following = tracked === def.notableId;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  const choose = (index: number) => {
    setSelected(index);
    setConditionPage(0);
  };
  const turnPage = (index: number) => {
    choose(index);
    requestAnimationFrame(() =>
      ref.current
        ?.closest('.notable-dossier')
        ?.querySelector<HTMLButtonElement>('.dossier-story[aria-pressed=true]')
        ?.focus(),
    );
  };
  const turnConditions = (index: number) => {
    setConditionPage(index);
    requestAnimationFrame(() =>
      ref.current
        ?.closest('.notable-dossier')
        ?.querySelector<HTMLButtonElement>(
          '.dossier-condition-pages button:not(:disabled)',
        )
        ?.focus(),
    );
  };
  const status = (row: (typeof stories)[number]) =>
    row.completed ? '已完成' : row.blockers.length ? '待解鎖' : '可相遇';
  return (
    <div
      className="game-modal notable-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={name + '詳情'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
        if (e.key === 'Tab') {
          const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            ),
            first = buttons[0],
            last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <section className="notable-dossier">
        <ArtControl
          ref={ref}
          kind="close"
          label="關閉名士詳情"
          className="dossier-close"
          onClick={onClose}
        />
        <aside className="dossier-person">
          <header className="dossier-identity">
            <span className="dossier-origin">
              {!member
                ? '未同行'
                : member.origin === 'superior'
                  ? '上司'
                  : '同行'}
            </span>
            <h1>{name}</h1>
            <span className="dossier-specialty">
              <span
                className={'entry-stat-icon entry-stat-' + def.base.specialty}
              />
              擅長{t('attr.' + def.base.specialty + '.short')}
            </span>
          </header>
          <div className="dossier-portrait">
            <CharacterArt name={name} />
          </div>
          <section className="dossier-bond" aria-label="本輪關係">
            <div className="dossier-bond-title">
              <UiSymbol
                name={
                  stage === 'stranger' || stage === 'acquainted'
                    ? 'red'
                    : stage === 'friendly'
                      ? 'gold'
                      : 'green'
                }
              />
              <b>{t('stage.' + stage)}</b>
              <span>
                好感 <strong>{affinity}</strong>
              </span>
            </div>
            <div
              className="dossier-bond-track"
              role="meter"
              aria-label={name + '好感'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={affinity}
            >
              <i
                style={{ width: Math.max(0, Math.min(100, affinity)) + '%' }}
              />
            </div>
            <div className="dossier-bond-meta">
              <span>
                共事 <b>{member?.cooperations ?? 0}</b> 次
              </span>
              {member?.entryBonus !== undefined && (
                <span>入隊好感 +{member.entryBonus}</span>
              )}
            </div>
          </section>
          <button className="dossier-learn" onClick={onLearn}>
            <span className="journal-art-icon" aria-hidden="true" />
            <span>前往訓練</span>
            <span aria-hidden="true">›</span>
          </button>
        </aside>
        <section className="dossier-stories" aria-label="同行故事">
          <header className="dossier-story-heading">
            <div>
              <small>與君同行</small>
              <h2>同行故事</h2>
            </div>
            <span>
              本輪完成 <b>{completed}</b> / {stories.length}
            </span>
          </header>
          <div className="dossier-story-list">
            {stories.slice(page * 4, page * 4 + 4).map((row, index) => (
              <button
                key={row.id}
                className={
                  'dossier-story ' +
                  (row.completed
                    ? 'is-complete'
                    : row.blockers.length
                      ? 'is-locked'
                      : 'is-ready')
                }
                aria-pressed={selected === page * 4 + index}
                onClick={() => choose(page * 4 + index)}
              >
                <span className="dossier-story-mark" aria-hidden="true">
                  {row.completed
                    ? '✓'
                    : String(page * 4 + index + 1).padStart(2, '0')}
                </span>
                <span className="dossier-story-name">
                  <small aria-label={row.rarity + '星故事'}>
                    {'★'.repeat(row.rarity)}
                  </small>
                  <b>{row.title}</b>
                </span>
                <span className="dossier-story-status">{status(row)}</span>
                <span className="dossier-story-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
            {!stories.length && (
              <p className="dossier-empty">此人尚無同行故事。</p>
            )}
          </div>
          <nav className="dossier-pagination" aria-label="故事分頁">
            <span>選擇故事，查看相遇條件</span>
            <button
              aria-label="上一頁故事"
              disabled={page === 0}
              onClick={() => turnPage((page - 1) * 4)}
            >
              ‹
            </button>
            <span>
              {page + 1} / {pages}
            </span>
            <button
              aria-label="下一頁故事"
              disabled={page + 1 >= pages}
              onClick={() => turnPage((page + 1) * 4)}
            >
              ›
            </button>
          </nav>
          <section
            className="dossier-story-detail"
            aria-live="polite"
            aria-label="所選故事條件"
          >
            {current && (
              <>
                <h3>
                  {current.title}
                  <span>
                    {current.completed
                      ? '本輪已完成'
                      : current.blockers.length
                        ? '相遇條件'
                        : '已具備相遇條件'}
                  </span>
                  <span className="dossier-condition-pages">
                    {!current.completed && current.blockers.length > 6 && (
                      <>
                        <button
                          aria-label="上一頁條件"
                          disabled={conditionPage === 0}
                          onClick={() => turnConditions(conditionPage - 1)}
                        >
                          ‹
                        </button>
                        {conditionPage + 1}/
                        {Math.ceil(current.blockers.length / 6)}
                        <button
                          aria-label="下一頁條件"
                          disabled={
                            (conditionPage + 1) * 6 >= current.blockers.length
                          }
                          onClick={() => turnConditions(conditionPage + 1)}
                        >
                          ›
                        </button>
                      </>
                    )}
                  </span>
                </h3>
                {current.completed ? (
                  <p className="dossier-story-message">
                    這段故事已成為本輪的同行回憶。
                  </p>
                ) : current.blockers.length ? (
                  <ul>
                    {current.blockers
                      .slice(conditionPage * 6, conditionPage * 6 + 6)
                      .map((blocker, i) => (
                        <li key={i}>{blocker}</li>
                      ))}
                  </ul>
                ) : (
                  <p className="dossier-story-message">
                    留意行動上的事件提示，與{name}的下一段故事正在等待相遇。
                  </p>
                )}
              </>
            )}
          </section>
          <footer className="dossier-follow">
            <button
              aria-pressed={following}
              disabled={!member || !stories.length}
              onClick={() => {
                s.trackStory(following ? null : def.notableId);
                setTracked(s.current.stories.tracked);
                onChange();
              }}
            >
              <span aria-hidden="true">{following ? '✓' : '◇'}</span>
              {following ? '已關注 · 取消關注' : '關注此人故事'}
            </button>
            <p>
              關注可提高相遇機會。
              <br />
              符合條件並等待三回合後，至少一格會出現他的事件。
            </p>
          </footer>
        </section>
      </section>
    </div>
  );
}
