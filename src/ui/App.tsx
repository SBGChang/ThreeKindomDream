import { useCallback, useEffect, useState } from 'react';
import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { loadMeta, resetMeta, saveMeta, startRun, wiring } from '../app/bootstrap.js';
import { restoreRun, saveRun } from '../app/save.js';
import { GameFrame } from './GameFrame.js';
import { CampaignJourney } from './CampaignJourney.js';
import { ScreenCampaign } from './ScreenCampaign.js';
import { ScreenNotableCodex, ScreenItemCodex } from './ScreenCodex.js';
import { ScreenDestiny, type MetaView } from './ScreenDestiny.js';
import { ScreenEnd } from './ScreenEnd.js';
import { ScreenEntry } from './ScreenEntry.js';
import { ScreenFaction, ScreenSuperiors } from './ScreenPick.js';
import { ScreenLearn } from './ScreenLearn.js';
import { ScreenRun } from './ScreenRun.js';
import { ScreenShop } from './ScreenShop.js';
import { ScreenVault } from './ScreenVault.js';

type RunView = 'run' | 'learn' | 'vault';
export function App(): React.ReactElement {
  const [restored] = useState(() => restoreRun(wiring));
  const [meta, setMeta] = useState<MetaState>(loadMeta);
  const [session, setSession] = useState<Session | null>(restored.session);
  const [revision, force] = useState(0);
  const [metaView, setMetaView] = useState<MetaView>('destiny');
  const [runView, setRunView] = useState<RunView>('run');
  const [replay, setReplay] = useState(false);
  const [log, setLog] = useState<readonly string[]>(restored.log);
  const [saveNotice, setSaveNotice] = useState(restored.notice);
  const phase = session === null ? 'meta' : session.isOver ? 'ending' : session.needsFactionChoice ? 'faction'
    : session.needsSuperiors ? 'superiors' : session.needsCampaign ? 'campaign' : 'turn';
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [metaView, runView, phase, replay]);
  const bump = useCallback(() => { force(n => n + 1); }, []);
  const pushLog = useCallback((line: string) => { setLog(prev => [line, ...prev].slice(0, 12)); }, []);
  useEffect(() => {
    // Keep unreadable snapshots intact until the player explicitly starts another run.
    if (restored.notice && session === null && revision === 0) return;
    try { saveRun(session, log); setSaveNotice(''); }
    catch { setSaveNotice('儲存失敗，請保留此頁'); }
  }, [session, revision, log, restored.notice]);
  const commitMeta = (m: MetaState): void => {
    try { saveMeta(m); setMeta(m); }
    catch { setSaveNotice('儲存失敗，請保留此頁'); throw new Error('無法儲存輪迴進度，請勿關閉此頁'); }
  };
  const back = (): void => { setRunView('run'); };
  const home = (): void => { setMetaView('destiny'); };
  const learn = (): void => { setRunView('learn'); };
  const screen = (): React.ReactElement => {
    if (session === null) {
      if (metaView === 'entry') return <ScreenEntry meta={meta} onEnter={config => { setLog([]); setRunView('run'); setMetaView('destiny'); setSession(startRun(meta, config)); }} onBack={home} />;
      if (metaView === 'shop') return <ScreenShop meta={meta} onMeta={commitMeta} onBack={home} />;
      if (metaView === 'notables') return <ScreenNotableCodex meta={meta} onBack={home} />;
      if (metaView === 'items') return <ScreenItemCodex meta={meta} onBack={home} />;
      return <ScreenDestiny meta={meta} onGo={setMetaView} onReset={() => { try { resetMeta(); saveRun(null, []); setMeta(loadMeta()); bump(); } catch { setSaveNotice('無法清除存檔'); } }} />;
    }
    if (replay) return <CampaignJourney s={session} bump={bump} onDone={() => { setReplay(false); bump(); }} />;
    if (session.isOver) return <ScreenEnd s={session} meta={meta} onSettled={m => { commitMeta(m); setSession(null); home(); }} />;
    if (session.needsFactionChoice) return <ScreenFaction s={session} bump={bump} />;
    if (session.needsSuperiors) return <ScreenSuperiors s={session} bump={bump} />;
    if (runView === 'learn') return <ScreenLearn s={session} bump={bump} onBack={back} />;
    if (runView === 'vault') return <ScreenVault s={session} onBack={back} />;
    if (session.needsCampaign) return <ScreenCampaign s={session} bump={bump} onDepart={() => setReplay(true)} onLearn={learn} />;
    return <ScreenRun s={session} bump={bump} log={log} onLog={pushLog} onLearn={learn} onVault={() => { setRunView('vault'); }} />;
  };
  const sceneScreen = replay || (session === null ? ['destiny','notables','shop','items','entry'].includes(metaView) : !replay && !session.isOver && !session.needsFactionChoice && !session.needsSuperiors && !session.needsCampaign && runView === 'run');
  return <GameFrame meta={meta} session={session} active={replay ? 'battle' : session === null ? metaView : runView} saveNotice={saveNotice}
    onGo={view => {
      if (replay) return;
      if (session === null) setMetaView(view as MetaView);
      else setRunView(view as RunView);
    }}>{sceneScreen ? screen() : <section className={"game-sheet"}>{screen()}</section>}</GameFrame>;
}
