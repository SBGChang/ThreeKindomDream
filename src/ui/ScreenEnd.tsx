import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { defs, t } from '../app/bootstrap.js';

interface Props {
  readonly s: Session;
  readonly meta: MetaState;
  readonly onSettled: (meta: MetaState) => void;
}

export function ScreenEnd({ s, meta, onSettled }: Props): React.ReactElement {
  const st = s.current;
  const ending = st.ending;
  if (ending === null) throw new Error('尚未達成結局');
  const result = s.settle(meta);
  const frags = Object.entries(result.notableFragments);

  return (
    <>
      <h1>{t(ending.titleKey)}</h1>
      <p className="sub">{ending.isFullDream ? '圓夢' : '中止'}　·　夢醒</p>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="body">{t(ending.bodyKey)}</div>
      </div>

      <h2>結算</h2>
      <table>
        <tbody>
          <tr><td>通過大事件</td><td className="n mono">{st.progress.chaptersPassed}</td></tr>
          <tr><td>存活回合</td><td className="n mono">{st.progress.turn}</td></tr>
          <tr>
            <td>官階（文／武）</td>
            <td className="n mono">{`${st.career.civil} / ${st.career.martial}`}</td>
          </tr>
          <tr>
            <td><b>輪迴點數</b></td>
            <td className="n mono ok"><b>{`+${result.pointsGained}`}</b></td>
          </tr>
        </tbody>
      </table>

      {frags.length > 0 && (
        <>
          <h2>名士記憶碎片</h2>
          <table>
            <tbody>
              {frags.map(([id, n]) => {
                const nd = defs.reader('notable').get(id);
                const raised = result.starRaised[id] ?? 0;
                return (
                  <tr key={id}>
                    <td>{t(nd.nameKey)}</td>
                    <td className="n mono">{`+${n}`}</td>
                    <td className="n mono ok">{raised > 0 ? `升星 +${raised}` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <div className="row" style={{ marginTop: 22 }}>
        <button className="primary" onClick={() => { onSettled(result.meta); }}>
          夢醒 → 回到天命
        </button>
      </div>
    </>
  );
}
