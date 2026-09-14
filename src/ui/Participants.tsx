import { careerPresentation } from './career-presentation.js';
import { useEffect, useRef, type CSSProperties } from 'react';
import { UiSymbol } from './UiSymbol.js';
import type { Session } from '../app/session.js';
import type { SlotIndex } from '../contracts/core/primitives.js';
import { defs, stageOf, t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';

export function Participants({
  s,
  index,
  onInspect,
  concealed = false,
}: {
  s: Session;
  index: SlotIndex;
  onInspect: (id: string) => void;
  concealed?: boolean;
}): React.ReactElement {
  const currentSlot = s.current.turn.slots[index],
    currentPreview = currentSlot ? s.previewTraining(index) : null;
  const visible = !concealed && Boolean(
    currentSlot?.notables.length ||
    currentPreview?.hasEncounter ||
    currentPreview?.hasCommission,
  );
  const previous = useRef({ slot: currentSlot, preview: currentPreview });
  useEffect(() => {
    if (visible)
      previous.current = { slot: currentSlot, preview: currentPreview };
  }, [visible, currentSlot, currentPreview]);
  const { slot, preview } = visible
    ? { slot: currentSlot, preview: currentPreview }
    : previous.current;
  const profile = careerPresentation(slot?.attr ?? 'lead', s.current.career);
  return (
    <aside
      className={'participants ' + (visible ? 'is-visible' : 'is-hidden')}
      aria-hidden={!visible}
      inert={!visible}
      aria-label="當前行動共同參與者"
      style={
        {
          '--participant-count': Math.max(1, slot?.notables.length ?? 0),
        } as CSSProperties
      }
    >
      {!!slot?.notables.length && (
        <div className="participant-list">
          {slot?.notables.length
            ? slot.notables.map((id) => {
                const member = s.current.roster.members.find(
                    (m) => String(m.notableId) === String(id),
                  ),
                  name = t(defs.reader('notable').get(String(id)).nameKey),
                  stage = stageOf(id, s.ctx),
                  affinity = member?.affinity ?? 0;
                return (
                  <button
                    key={String(id)}
                    className={'participant-card affinity-' + stage}
                    tabIndex={visible ? 0 : -1}
                    onClick={() => onInspect(String(id))}
                    aria-label={name + ' · ' + t('stage.' + stage)}
                  >
                    <CharacterArt name={name} portrait />
                    <b>{name}</b>
                    <span
                      className={'relationship-icon stage-' + stage}
                      role="img"
                      aria-label={t('stage.' + stage)}
                    >
                      <UiSymbol
                        name={
                          stage === 'stranger' || stage === 'acquainted'
                            ? 'red'
                            : stage === 'friendly'
                              ? 'gold'
                              : 'green'
                        }
                      />
                    </span>
                    <span
                      className="relationship-fill"
                      role="meter"
                      aria-label={name + '好感'}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={affinity}
                    >
                      <i
                        style={{
                          width: Math.max(0, Math.min(100, affinity)) + '%',
                        }}
                      />
                    </span>
                  </button>
                );
              })
            : null}
        </div>
      )}

      <div
        className={
          'participant-action-summary ' +
          (slot?.notables.length ? 'with-partners' : '')
        }
      >
        <div className="participant-action-copy">
          <h1>{profile.label}</h1>
          <span>{profile.action}</span>
        </div>{' '}
        {(preview?.hasEncounter || preview?.hasCommission) && (
          <div className="participant-signals" aria-label="本行動事件與委託">
            {preview?.hasEncounter && (
              <span
                role="img"
                aria-label={preview?.hasEncounter ? '有事件' : '無事件'}
                title={preview?.hasEncounter ? '有事件' : '無事件'}
                className={
                  'signal-icon signal-event ' +
                  (preview?.hasEncounter ? 'available' : 'unavailable')
                }
              >
                <UiSymbol name="event" />
              </span>
            )}
            {preview?.hasCommission && (
              <span
                role="img"
                aria-label={preview?.hasCommission ? '有委託' : '無委託'}
                title={preview?.hasCommission ? '有委託' : '無委託'}
                className={
                  'signal-icon signal-commission ' +
                  (preview?.hasCommission ? 'available' : 'unavailable')
                }
              >
                <UiSymbol name="commission" />
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
