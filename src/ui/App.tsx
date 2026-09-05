import { useCallback, useState } from 'react';
import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { loadMeta, resetMeta, saveMeta, startRun } from '../app/bootstrap.js';
import { ScreenCampaign } from './ScreenCampaign.js';
import { ScreenNotableCodex, ScreenItemCodex } from './ScreenCodex.js';
import { ScreenDestiny, type MetaView } from './ScreenDestiny.js';
import { ScreenEnd } from './ScreenEnd.js';
import { ScreenEntry } from './ScreenEntry.js';
import { ScreenFaction, ScreenSuperiors } from './ScreenPick.js';
import { ScreenLearn } from './ScreenLearn.js';
import { ScreenRun } from './ScreenRun.js';
import { ScreenVault } from './ScreenVault.js';

const logMax = 6;

/** 局內的側畫面。兩個都【不佔行動】，所以是可以隨時進出的地方，不是流程的一站。 */
type RunView = 'run' | 'learn' | 'vault';

export function App(): React.ReactElement {
  const [meta, setMeta] = useState<MetaState>(() => loadMeta());
  const [session, setSession] = useState<Session | null>(null);
  const [, force] = useState(0);
  /**
   * 天命層的四個位置：天命（第一頁）、山河圖（入夢）、風雲錄、天工鑒。
   *
   * 三本各自獨立而不是分頁，是因為它們回答三個不同的問題：
   * 山河圖是【出發】，另外兩本是【你這輩子累積了什麼】。
   */
  const [metaView, setMetaView] = useState<MetaView>('destiny');
  const [runView, setRunView] = useState<RunView>('run');
  const bump = useCallback(() => { force((n) => n + 1); }, []);

  /**
   * 回合紀錄放在 App 而不是 ScreenRun：單動作回合「選完就跳」，
   * 章末那一次行動會立刻切到戰役畫面 —— 紀錄若隨畫面卸載就會漏掉它。
   */
  const [log, setLog] = useState<readonly string[]>([]);
  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, logMax));
  }, []);

  const commitMeta = useCallback((m: MetaState) => {
    setMeta(m);
    saveMeta(m);
  }, []);

  const backToDestiny = useCallback(() => { setMetaView('destiny'); }, []);

  if (session === null) {
    if (metaView === 'entry') {
      return (
        <ScreenEntry
          meta={meta}
          onEnter={(config) => {
            setLog([]);
            setMetaView('destiny');
            setRunView('run');
            setSession(startRun(meta, config));
          }}
          onBack={backToDestiny}
        />
      );
    }
    if (metaView === 'notables') return <ScreenNotableCodex meta={meta} onBack={backToDestiny} />;
    if (metaView === 'items') return <ScreenItemCodex meta={meta} onBack={backToDestiny} />;
    return (
      <ScreenDestiny
        meta={meta}
        onMeta={commitMeta}
        onGo={setMetaView}
        onReset={() => { resetMeta(); setMeta(loadMeta()); }}
      />
    );
  }

  if (session.isOver) {
    return (
      <ScreenEnd
        s={session}
        meta={meta}
        onSettled={(m) => { commitMeta(m); setSession(null); }}
      />
    );
  }
  if (session.needsFactionChoice) return <ScreenFaction s={session} bump={bump} />;
  if (session.needsSuperiors) return <ScreenSuperiors s={session} bump={bump} />;

  const back = (): void => { setRunView('run'); };
  if (runView === 'learn') return <ScreenLearn s={session} bump={bump} onBack={back} />;
  if (runView === 'vault') return <ScreenVault s={session} onBack={back} />;

  if (session.needsCampaign) return <ScreenCampaign s={session} bump={bump} />;
  return (
    <ScreenRun
      s={session}
      bump={bump}
      log={log}
      onLog={pushLog}
      onLearn={() => { setRunView('learn'); }}
      onVault={() => { setRunView('vault'); }}
    />
  );
}
