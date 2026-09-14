import type { Session } from '../app/session.js';
import { ScreenRun } from './ScreenRun.js';
import { ScreenLearn } from './ScreenLearn.js';
import { ScreenMarket } from './ScreenMarket.js';
import { ScreenVault } from './ScreenVault.js';

/** Keep the live scene mounted so opening a service moves its HUD, preserving the action preview. */
export function RunWorkspace({ s, view, bump, log, onLog, onGo }: {
  s: Session; view: string; bump: () => void; log: readonly string[];
  onLog: (line: string) => void; onGo: (view: string) => void;
}): React.ReactElement {
  const service = ['learn', 'market', 'vault'].includes(view);
  const scene = !s.needsChapterCamp && !s.needsCampaign && !s.needsFactionChoice && !s.needsSuperiors;
  const back = () => onGo('run');
  return <>
    {scene && <ScreenRun s={s} bump={bump} log={log} onLog={onLog}
      concealed={service} onLearn={() => onGo('learn')} onVault={() => onGo('vault')} />}
    {view === 'learn' && <ScreenLearn s={s} bump={bump} onBack={back} />}
    {view === 'market' && <ScreenMarket s={s} bump={bump} onBack={back} />}
    {view === 'vault' && <ScreenVault s={s} onBack={back} />}
  </>;
}
