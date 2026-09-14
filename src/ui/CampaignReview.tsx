import { useCallback, useState } from 'react';
import { campaignReviewSession } from '../app/campaign-review.js';
import { emptyMeta } from '../app/bootstrap.js';
import { GameFrame } from './GameFrame.js';
import { ScreenCampaign } from './ScreenCampaign.js';
import { ScreenLearn } from './ScreenLearn.js';
import { CampaignJourney } from './CampaignJourney.js';
/** Same live components and Session commands, with no save effect or repository. */
export function CampaignReview(): React.ReactElement {
  const [s] = useState(() => campaignReviewSession(new URLSearchParams(location.search).get('sample') ?? 'full'));
  const [, setRevision] = useState(0), [view, setView] = useState('run');
  const bump = useCallback(() => setRevision(x => x + 1), []);
  return <GameFrame meta={emptyMeta()} session={s} active={view} onGo={setView} saveNotice="出戰驗收 · 不寫入存檔">
    {view === 'battle' ? <CampaignJourney s={s} bump={bump} onDone={() => setView('done')} /> : view === 'learn' ? <section className="game-sheet"><ScreenLearn s={s} bump={bump} onBack={() => setView('run')} /></section> : view === 'done' ? <section className="game-sheet"><h1>出陣驗收完成</h1><p>此次操作未寫入玩家存檔。</p><button onClick={() => location.reload()}>重新整備</button></section> : <ScreenCampaign s={s} bump={bump} onLearn={() => setView('learn')} onDepart={() => setView('battle')} />}
  </GameFrame>;
}
