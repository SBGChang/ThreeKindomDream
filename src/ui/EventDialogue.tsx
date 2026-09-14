import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DialogueHeaderContext } from './dialogue-header.js';
import type {
  DialogueBeat,
  DialogueMove,
  DialoguePoint,
} from '../contracts/core/dialogue.js';
import type { EventOffer } from '../contracts/core/state.js';
import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
import type { CareerPresentation } from './career-presentation.js';
import {
  actorHome,
  DialogueActor,
  DialogueFace,
  type SceneActor,
} from './DialogueActors.js';
import { DialogueText } from './DialogueText.js';
import type { EventReceipt } from './event-receipt.js';
import './event-dialogue.css';

type SceneBeat = Omit<DialogueBeat, 'textKey'> & { text: string };
type Phase = 'intro' | 'choices' | 'response' | 'outro' | 'rewards';
const fill = (text: string, offer: EventOffer) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => t(offer.params[key]));
/** Long authored narration is paged at punctuation, never hidden behind a scrollbar. */
function pages(beat: SceneBeat): SceneBeat[] {
  const chunks = beat.text.match(/[^。！？\n]+[。！？\n]?/g) ?? [beat.text],
    out: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > 70) {
      for (let i = 0; i < chunk.length; i += 64)
        out.push(chunk.slice(i, i + 64));
    } else if (out.length && out[out.length - 1]!.length + chunk.length <= 70)
      out[out.length - 1] += chunk;
    else out.push(chunk);
  }
  return out.map((text, i) => ({
    speaker: beat.speaker,
    text,
    ...(i === 0 && beat.moves ? { moves: beat.moves } : {}),
  }));
}
export function EventDialogue({
  s,
  offer,
  receipt,
  profile,
  onResolve,
  onFinish,
}: {
  s: Session;
  offer: EventOffer;
  receipt: EventReceipt | null;
  profile: CareerPresentation;
  onResolve: (option: number) => EventReceipt;
  onFinish: () => void;
}): React.ReactElement {
  const def = defs.reader('event').get(String(offer.eventDefId)),
    title = t(def.titleKey);
  const setHeader = useContext(DialogueHeaderContext);
  useLayoutEffect(() => {
    setHeader({ title, kind: def.trigger.kind === 'notable' ? '人物事件' : '委託', rarity: offer.rarity });
    return () => setHeader(null);
  }, [setHeader, title, def.trigger.kind, offer.rarity]);
  const root = useRef<HTMLDivElement>(null),
    resolving = useRef(false),
    [phase, setPhase] = useState<Phase>('intro'),
    [index, setIndex] = useState(0),
    [chosen, setChosen] = useState(0),
    [reduced, setReduced] = useState(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
    [costume] = useState(profile),
    [rewardPage, setRewardPage] = useState(0),
    [visible, setVisible] = useState(0);
  const actors = useMemo<SceneActor[]>(
    () => [
      { name: '你', hero: true },
      ...(def.trigger.kind === 'notable'
        ? def.trigger.cast.map((c) => ({
            name: t(defs.reader('notable').get(String(c.notableId)).nameKey),
          }))
        : [{ name: '軍吏' }]),
    ],
    [def],
  );
  const intro = useMemo(() => {
    const entry: DialogueMove[] = actors.map((_, i) => ({
      actor: i,
      duration: 650,
      path: [{ x: i === 0 ? -25 : 125 }, actorHome(i, actors.length)],
    }));
    const opening: SceneBeat = {
      speaker: null,
      text: fill(t(def.bodyKey), offer),
      moves: entry,
    };
    const authored = def.dialogue?.intro ?? [];
    return [
      opening,
      ...authored
        .filter((b, i) => !(i === 0 && b.textKey === def.bodyKey))
        .map((b) => ({ ...b, text: fill(t(b.textKey), offer) })),
    ].flatMap(pages);
  }, [def, offer, actors]);
  const reply: SceneBeat = {
    speaker: 0,
    text: t(def.options[chosen]!.labelKey),
  };
  const outro = useMemo<SceneBeat[]>(() => {
    if (!receipt) return [];
    const script = def.dialogue?.outcomes?.find(
      (o) =>
        o.option === receipt.result.optionIndex &&
        (o.passed === undefined || o.passed === receipt.result.passed),
    );
    const ending = receipt.result.resultKey
      ? t(receipt.result.resultKey)
      : receipt.result.passed
        ? '事情已經辦妥，這次的收穫也一併記下。'
        : '這次未能達成預期。付出的工夫與應領的薪水，仍會如實記下。';
    return [
      ...(script?.beats ?? []).map((b) => ({
        ...b,
        text: fill(t(b.textKey), offer),
      })),
      { speaker: null, text: ending },
    ].flatMap(pages);
  }, [receipt, def, offer]);
  const beats =
    phase === 'intro'
      ? intro.slice(0, index + 1)
      : phase === 'choices'
        ? intro.slice(0, index + 1)
        : phase === 'response'
          ? [...intro, reply]
          : [
              ...intro,
              reply,
              ...(phase === 'outro' ? outro.slice(0, index + 1) : outro),
            ];
  const beat =
    phase === 'rewards'
        ? { speaker: null, text: '' }
        : beats.at(-1)!;
  const cue = phase + '/' + index;
  const poses = actors.map((_, i) => actorHome(i, actors.length));
  for (const b of beats)
    for (const m of b.moves ?? []) poses[m.actor] = m.path.at(-1)!;
  const moves =
    phase === 'choices' || phase === 'rewards'
      ? []
      : (beats.at(-1)?.moves ?? []);
  const lines = receipt?.lines ?? [],
    shown = lines.slice(rewardPage * 4, rewardPage * 4 + 4),
    ready = visible >= shown.length;
  const words = [
    ...actors.map((a) => a.name).filter((n) => n !== '你'),
    title,
    ...(def.dialogue?.keywords ?? []).map(t),
  ];

  useEffect(() => {
    if (phase === 'choices') root.current?.querySelector<HTMLButtonElement>('.dialogue-choice:not(:disabled)')?.focus();
    else root.current?.focus({ preventScroll: true });
  }, [phase, index]);
  useEffect(() => {
    if (phase !== 'rewards') return;
    if (reduced) {
      setVisible(shown.length);
      return;
    }
    setVisible(0);
    let count = 0;
    const timer = setInterval(() => {
      count++;
      setVisible((previous) => Math.max(previous, count));
      if (count >= shown.length) clearInterval(timer);
    }, 420);
    return () => clearInterval(timer);
  }, [phase, rewardPage, reduced, shown.length]);
  const next = () => {
    if (phase === 'intro') {
      if (index + 1 < intro.length) setIndex(index + 1);
      else setPhase('choices');
    } else if (phase === 'response') {
      if (resolving.current) return;
      resolving.current = true;
      try {
        onResolve(chosen);
        setIndex(0);
        setPhase('outro');
      } catch (error) {
        resolving.current = false;
        throw error;
      }
    } else if (phase === 'outro') {
      if (index + 1 < outro.length) setIndex(index + 1);
      else {
        setVisible(0);
        setPhase('rewards');
      }
    } else if (phase === 'rewards') {
      if (!ready) setVisible(shown.length);
      else if ((rewardPage + 1) * 4 < lines.length) {
        setRewardPage(rewardPage + 1);
        setVisible(0);
      } else onFinish();
    }
  };
  useEffect(() => {
    const stage = root.current?.closest('.game-stage');
    if (!stage) return;
    const advance = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || root.current?.closest('[inert]')) return;
      if (target.closest('button,input,select,a,[role="dialog"],[role="alertdialog"]')) return;
      if (event instanceof MouseEvent && event.detail > 1) return;
      next();
    };
    stage.addEventListener('click', advance);
    return () => stage.removeEventListener('click', advance);
  });
  return (
    <div
      ref={root}
      className={'event-dialogue' + (reduced ? ' is-reduced' : '') + (phase === 'choices' ? ' decision-open' : '')}
      role="region"
      aria-label={title + '對話演出'}
      tabIndex={0}
      onKeyDown={event => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat && !(event.target as Element).closest('button,input,select')) {
          event.preventDefault(); next();
        }
      }}
    >
      <div className="dialogue-tools">
        <button aria-pressed={reduced} onClick={() => setReduced(!reduced)}>
          簡化動作
        </button>
        {phase === 'intro' && (
          <button onClick={() => setPhase('choices')}>略過對話</button>
        )}
      </div>
      <div className="dialogue-cast" aria-label="劇情人物">
        {actors.map((actor, i) => (
          <DialogueActor
            key={i}
            actor={actor}
            index={i}
            home={poses[i]!}
            {...(moves.find((m) => m.actor === i)
              ? { move: moves.find((m) => m.actor === i)! }
              : {})}
            cue={cue}
            speaking={beat.speaker === i}
            profile={costume}
            reduced={reduced}
          />
        ))}
      </div>
      {phase === 'choices' && (
        <section className="dialogue-decision" aria-label="選擇回應">
          <div className="decision-heading"><span aria-hidden="true">◆</span>選擇回應<span aria-hidden="true">◆</span></div>
          <div className="dialogue-options">
          {def.options.map((opt, i) => {
            const state = offer.optionStates[i];
            if (!state) return null;
            return (
              <button
                key={i}
                className="dialogue-choice"
                disabled={!state.enabled}
                onClick={() => {
                  setChosen(i);
                  setPhase('response');
                }}
              >
                <span className="dialogue-choice-label">
                  <span className="dialogue-choice-number">{i + 1}</span>
                  <DialogueText text={t(opt.labelKey)} keywords={words} />
                </span>
                <span className="dialogue-choice-reward">
                  {state.enabled ? (
                    <>
                      {state.successRate !== null && (
                        <span>
                          成功率 {Math.round(state.successRate * 100)}%　
                        </span>
                      )}
                      {state.practicePreview.map((g, j) => (
                        <span key={j}>
                          {t('attr.' + g.attr + '.short')}經驗{' '}
                          <b
                            className={
                              g.amount < 0
                                ? 'dialogue-loss'
                                : 'dialogue-gain'
                            }
                          >
                            {g.amount > 0 ? '+' : ''}
                            {Math.round(g.amount * 100)}
                          </b>
                          　
                        </span>
                      ))}
                      {state.meritPreview.map((g, j) => (
                        <span key={j}>
                          {t('merit.' + g.line)}{' '}
                          <b className="dialogue-gain">+{g.amount}</b>　
                        </span>
                      ))}
                      薪水 <b className="dialogue-gain">+{state.salary}</b>
                      {state.successRate !== null && (
                        <span>
                          （未成{' '}
                          <b className="dialogue-gain">
                            +{state.failureSalary}
                          </b>
                          ）
                        </span>
                      )}
                      {!!state.moneyCost && (
                        <span>
                          　投入{' '}
                          <b className="dialogue-loss">
                            −{state.moneyCost}
                          </b>
                        </span>
                      )}
                    </>
                  ) : state.moneyCost && s.money < state.moneyCost ? (
                    '金錢不足 · 需要 ' + state.moneyCost
                  ) : (
                    '官階或條件不足'
                  )}
                </span>
              </button>
            );
          })}
        </div>
        </section>
      )}
      <section
        className={'conversation-box phase-' + phase}
        aria-label="對話框"
      >
        {beat.speaker !== null && actors[beat.speaker] && (
          <DialogueFace actor={actors[beat.speaker]!} profile={costume} />
        )}
        <div className="conversation-content">
          <div className="dialogue-speaker-name">
            {phase === 'rewards'
              ? '獲得與變化'
              : beat.speaker === null
                ? '旁白'
                : actors[beat.speaker]?.name}
          </div>
          {phase !== 'rewards' && (
            <p className="dialogue-line" aria-live="polite">
              <DialogueText text={beat.text} keywords={words} />
            </p>
          )}
          {phase === 'rewards' && (
            <div
              className="dialogue-reward-lines"
              role="log"
              aria-live="polite"
              aria-label="實際獲得與失去"
            >
              {shown.slice(0, visible).map((line, i) => (
                <p key={rewardPage + '/' + i}>
                  <span className="dialogue-reward-marker" aria-hidden="true">
                    ›
                  </span>
                  <span className="dialogue-keyword">{line.label}</span>
                  {line.note && <span>　{line.note}</span>}
                  {line.promoted && (
                    <b className="dialogue-gain">　{line.promoted}</b>
                  )}
                  {line.amount !== undefined && (
                    <b
                      className={
                        line.amount < 0 ? 'dialogue-loss' : 'dialogue-gain'
                      }
                    >
                      　{line.amount > 0 ? '+' : '−'}
                      {Math.abs(line.amount)}
                    </b>
                  )}
                </p>
              ))}
              {!lines.length && <p>本次沒有額外的數值變化。</p>}
            </div>
          )}
        </div>
        {phase === 'rewards' && lines.length > 4 && <span className="dialogue-reward-page">{rewardPage + 1} / {Math.ceil(lines.length / 4)}</span>}
      </section>
    </div>
  );
}
