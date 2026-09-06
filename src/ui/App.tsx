import { useCallback, useState } from 'react';
import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { loadMeta, resetMeta, saveMeta, startRun } from '../app/bootstrap.js';
import { BattleTheater, type ReplayData } from './BattleTheater.js';
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
  /**
   * 正在播的那一關（D67）★ **它必須住在這裡，不能住在 ScreenCampaign**
   *
   * 戰敗時 `engage()` 會收掉戰役，`needsCampaign` 立刻變 false，
   * 戰役畫面當場卸載 —— 而戰敗正是最該看的那一關。
   * 而且最後一章打輸時 `isOver` 也會變 true，所以這個判斷要排在
   * 【所有畫面切換之前】：演出播完之前，誰都不准換畫面。
   */
  const [replay, setReplay] = useState<ReplayData | null>(null);
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
    if (metaView === 'shop') {
      return <ScreenShop meta={meta} onMeta={commitMeta} onBack={backToDestiny} />;
    }
    if (metaView === 'notables') return <ScreenNotableCodex meta={meta} onBack={backToDestiny} />;
    if (metaView === 'items') return <ScreenItemCodex meta={meta} onBack={backToDestiny} />;
    return (
      <ScreenDestiny
        meta={meta}
        onGo={setMetaView}
        onReset={() => { resetMeta(); setMeta(loadMeta()); }}
      />
    );
  }

  // ★ 排在 isOver 之前：最後一關打輸也要看得完，不能直接跳結局。
  if (replay !== null) {
    return (
      <BattleTheater
        {...replay}
        onDone={() => { setReplay(null); bump(); }}
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

  if (session.needsCampaign) {
    return <ScreenCampaign s={session} bump={bump} onReplay={setReplay} />;
  }
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
