import { useCallback, useState } from 'react';
import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { loadMeta, resetMeta, saveMeta, startRun } from '../app/bootstrap.js';
import { ScreenCampaign } from './ScreenCampaign.js';
import { ScreenEnd } from './ScreenEnd.js';
import { ScreenFaction, ScreenSuperiors } from './ScreenPick.js';
import { ScreenLearn } from './ScreenLearn.js';
import { ScreenRun } from './ScreenRun.js';
import { ScreenShop } from './ScreenShop.js';

const logMax = 6;

export function App(): React.ReactElement {
  const [meta, setMeta] = useState<MetaState>(() => loadMeta());
  const [session, setSession] = useState<Session | null>(null);
  const [, force] = useState(0);
  // 學習不佔行動、隨時可做（32 §7.3）—— 因此它是一個可以隨時進出的畫面，
  // 不是回合流程裡的一站。
  const [learning, setLearning] = useState(false);
  const bump = useCallback(() => { force((n) => n + 1); }, []);

  /**
   * 回合紀錄放在 App 而不是 ScreenRun：單動作回合「選完就跳」，
   * 章末那一次行動會立刻切到大檢定畫面 —— 紀錄若隨畫面卸載就會漏掉它。
   */
  const [log, setLog] = useState<readonly string[]>([]);
  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, logMax));
  }, []);

  const commitMeta = useCallback((m: MetaState) => {
    setMeta(m);
    saveMeta(m);
  }, []);

  if (session === null) {
    return (
      <ScreenShop
        meta={meta}
        onMeta={commitMeta}
        onStart={() => { setLog([]); setSession(startRun(meta)); }}
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
  if (learning) {
    return (
      <ScreenLearn s={session} bump={bump} onBack={() => { setLearning(false); }} />
    );
  }
  if (session.needsCampaign) return <ScreenCampaign s={session} bump={bump} />;
  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="primary" onClick={() => { setLearning(true); }}>
          {`養成（經驗 ${ATTRS.map((a) => session.expOf(a)).reduce((x, y) => x + y, 0)}）`}
        </button>
      </div>
      <ScreenRun s={session} bump={bump} log={log} onLog={pushLog} />
    </>
  );
}
