import { useState } from 'react';
import { economyReview, fullEconomyReview, limitedEconomyReview, runLayoutReview, trainingArtReview, fixedActionReview } from '../app/economy-review.js';
import { dialogueReview } from '../app/dialogue-review.js';
import { GameFrame } from './GameFrame.js';
import { ScreenCamp } from './ScreenMarket.js';
import { RunWorkspace } from './RunWorkspace.js';
import { ScreenFaction, ScreenSuperiors } from './ScreenPick.js';
import { ScreenDestiny } from './ScreenDestiny.js';
export function EconomyReview(): React.ReactElement {
  const [s] = useState(
      new URLSearchParams(location.search).get('art') === 'dialogue'
        ? () =>
            dialogueReview(
              new URLSearchParams(location.search).get('scene') ?? 'chase',
            )
        : new URLSearchParams(location.search).get('art') === 'layout'
          ? ['bad','normal','success'].includes(new URLSearchParams(location.search).get('fixed') ?? '')
            ? () => fixedActionReview(new URLSearchParams(location.search).get('fixed')!, new URLSearchParams(location.search).has('event'))
            : runLayoutReview
        : ['full', 'empty'].includes(new URLSearchParams(location.search).get('lessons') ?? '')
          ? () => trainingArtReview(new URLSearchParams(location.search).get('lessons') === 'empty')
          : new URLSearchParams(location.search).get('stock') === 'full' ? fullEconomyReview : new URLSearchParams(location.search).get('stock') === 'limited' ? limitedEconomyReview : economyReview,
    ),
    [view, setView] = useState(
      ['layout', 'dialogue'].includes(
        new URLSearchParams(location.search).get('art') ?? '',
      )
        ? 'run'
        : ['full', 'empty'].includes(new URLSearchParams(location.search).get('lessons') ?? '') ? 'learn' : 'market',
    ),
    [, update] = useState(0),
    [log, setLog] = useState<string[]>([]);
  const bump = () => update((n) => n + 1),
    learn = () => setView('learn');
  const content =
    view !== 'run' ? (
      <RunWorkspace s={s} view={view} bump={bump} log={log} onLog={line => setLog(x => [line, ...x])} onGo={setView} />
    ) : s.needsChapterCamp ? (
      <ScreenCamp
        s={s}
        bump={bump}
        onLearn={learn}
        onMarket={() => setView('market')}
      />
    ) : s.needsFactionChoice ? (
      <ScreenFaction s={s} bump={bump} />
    ) : s.needsSuperiors ? (
      <ScreenSuperiors s={s} bump={bump} />
    ) : (
      <RunWorkspace s={s} view={view} bump={bump} log={log} onLog={line => setLog(x => [line, ...x])} onGo={setView} />
    );
  return (
    <GameFrame
      session={view === 'destiny' ? null : s}
      meta={s.current.metaSnapshot}
      active={s.needsChapterCamp && view === 'run' ? 'camp' : view}
      onGo={setView}
      onReturnHome={() => setView('destiny')}
      saveNotice="開發驗收 · 獨立資料，不寫入玩家存檔"
    >
      {view === 'destiny' ? <ScreenDestiny meta={s.current.metaSnapshot} onResume={() => setView('run')} onGo={() => setView('run')} onReset={() => {}}/> : view !== 'run' || (view === 'run' &&
      !s.needsChapterCamp &&
      !s.needsFactionChoice &&
      !s.needsSuperiors) ? (
        content
      ) : (
        <section className="game-sheet">{content}</section>
      )}
    </GameFrame>
  );
}
