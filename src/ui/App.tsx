import { useCallback, useEffect, useState } from 'react';
import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { emptyMeta, loadMeta, resetMeta, saveMeta, startRun, wiring } from '../app/bootstrap.js';
import { restoreRun, saveRun } from '../app/save.js';
import { GameFrame } from './GameFrame.js';
import { CampaignJourney } from './CampaignJourney.js';
import { ScreenCampaign } from './ScreenCampaign.js';
import { ScreenNotableCodex, ScreenItemCodex } from './ScreenCodex.js';
import { ScreenDestiny, type MetaView } from './ScreenDestiny.js';
import { ScreenEnd } from './ScreenEnd.js';
import { ScreenEntry } from './ScreenEntry.js';
import { ScreenFaction, ScreenSuperiors } from './ScreenPick.js';
import { ScreenCamp } from './ScreenMarket.js';
import { RunWorkspace } from './RunWorkspace.js';
import { ScreenShop } from './ScreenShop.js';
import { PendingStory } from './StoryDialogue.js';

type RunView = 'run' | 'learn' | 'vault' | 'market';
export function App({ preview = false }: { preview?: boolean }): React.ReactElement {
  const [restored] = useState(() => preview ? {session:startRun(emptyMeta()),log:[],notice:''} : restoreRun(wiring));
  const [meta, setMeta] = useState<MetaState>(preview ? emptyMeta : loadMeta);
  const [session, setSession] = useState<Session | null>(restored.session);
  const [revision, force] = useState(0);
  const [metaView, setMetaView] = useState<MetaView>('destiny');
  const [runView, setRunView] = useState<RunView>('run');
  const [replay, setReplay] = useState(false);
  const [atMainMenu, setAtMainMenu] = useState(false);
  const [log, setLog] = useState<readonly string[]>(restored.log);
  const [saveNotice, setSaveNotice] = useState(restored.notice);
  const phase = session === null ? 'meta' : session.isOver ? 'ending' : session.needsFactionChoice ? 'faction'
    : session.needsSuperiors ? 'superiors' : session.needsCampaign ? 'campaign' : 'turn';
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [metaView, runView, phase, replay]);
  const bump = useCallback(() => { force(n => n + 1); }, []);
  const pushLog = useCallback((line: string) => { setLog(prev => [line, ...prev].slice(0, 12)); }, []);
  useEffect(() => {
    if (preview) return;
    // Keep unreadable snapshots intact until the player explicitly starts another run.
    if (restored.notice && session === null && revision === 0) return;
    try { saveRun(session, log); setSaveNotice(''); }
    catch { setSaveNotice('儲存失敗，請保留此頁'); }
  }, [session, revision, log, restored.notice]);
  const commitMeta = (m: MetaState): void => {
    if (preview) { setMeta(m); return; }
    try { saveMeta(m); setMeta(m); }
    catch { setSaveNotice('儲存失敗，請保留此頁'); throw new Error('無法儲存輪迴進度，請勿關閉此頁'); }
  };
  const back = (): void => { setRunView('run'); };
  const home = (): void => { setMetaView('destiny'); };
  const learn = (): void => { setRunView('learn'); };
  const preserveProgress = (): void => {
    if (preview) return;
    // An unreadable save is kept intact until a new run is explicitly started.
    if (session !== null) saveRun(session, log);
  };
  const screen = (): React.ReactElement => {
    if (session === null || atMainMenu) {
      if (metaView === 'entry') return <ScreenEntry meta={meta} onEnter={config => { setLog([]); setAtMainMenu(false); setRunView('run'); setMetaView('destiny'); setSession(startRun(meta, config)); }} onBack={home} />;
      if (metaView === 'shop') return <ScreenShop meta={meta} onMeta={commitMeta} onBack={home} />;
      if (metaView === 'notables') return <ScreenNotableCodex meta={meta} onBack={home} />;
      if (metaView === 'items') return <ScreenItemCodex meta={meta} onBack={home} />;
      return <ScreenDestiny meta={meta} {...(session ? { onResume: () => setAtMainMenu(false) } : {})} onGo={setMetaView} onReset={() => { if(preview){setSession(null);setMeta(emptyMeta());return;} try { resetMeta(); saveRun(null, []); setMeta(loadMeta()); bump(); } catch { setSaveNotice('無法清除存檔'); } }} />;
    }
    if (replay) return <CampaignJourney s={session} bump={bump} onDone={() => { setReplay(false); bump(); }} />;
    if (session.storyScene || session.needsEndingChoice) return <PendingStory s={session} bump={bump}/>;
    if (session.isOver) return <ScreenEnd s={session} meta={meta} onSettled={m => { commitMeta(m); setSession(null); home(); }} />;
    if (session.needsChapterCamp && runView==='run') return <ScreenCamp s={session} bump={bump} onLearn={learn} onMarket={()=>setRunView('market')}/>;
    if (session.needsFactionChoice && !session.needsChapterCamp) return <ScreenFaction s={session} bump={bump} />;
    if (session.needsSuperiors) return <ScreenSuperiors s={session} bump={bump} />;
    if (runView !== 'run') return <RunWorkspace s={session} view={runView} bump={bump} log={log} onLog={pushLog} onGo={view => setRunView(view as RunView)} />;
    if (session.needsCampaign) return <ScreenCampaign s={session} bump={bump} onDepart={() => setReplay(true)} onLearn={learn} />;
    return <RunWorkspace s={session} view={runView} bump={bump} log={log} onLog={pushLog} onGo={view => setRunView(view as RunView)} />;
  };
  const sceneScreen = (phase === 'campaign' && runView === 'run' && !session?.needsChapterCamp) || atMainMenu || (session !== null && ['learn','market','vault'].includes(runView)) || replay || (session === null ? ['destiny','notables','shop','items','entry'].includes(metaView) : !replay && !session.isOver && !session.needsFactionChoice && !session.needsSuperiors && !session.needsCampaign && !session.needsChapterCamp && runView === 'run');
  return <GameFrame meta={meta} session={atMainMenu ? null : session} active={atMainMenu ? metaView : replay ? 'battle' : session === null ? metaView : session.needsChapterCamp&&runView==='run'?'camp':runView} saveNotice={preview ? '故事試玩・不寫入存檔' : saveNotice}
    beforeExit={preserveProgress} onReturnHome={() => { setMetaView('destiny'); setAtMainMenu(true); }}
    onGo={view => {
      if (replay) return;
      if (session === null || atMainMenu) setMetaView(view as MetaView);
      else setRunView(view as RunView);
    }}>{sceneScreen || session?.storyScene || session?.needsEndingChoice ? screen() : <section className={"game-sheet"}>{screen()}</section>}</GameFrame>;
}
