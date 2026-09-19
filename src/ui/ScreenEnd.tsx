import type { Session } from '../app/session.js';
import type { MetaState } from '../contracts/core/state.js';
import { defs, t } from '../app/bootstrap.js';
import { Hud } from './Hud.js';
import { lifeSettled, nextRecruitFarewell, advanceRecruitFarewell } from '../app/recruit-farewell.js';
import { RecruitFarewell } from './RecruitFarewell.js';
import { useState } from 'react';

interface Props {
  readonly s: Session;
  readonly meta: MetaState;
  readonly onSettled: (meta: MetaState) => void;
  readonly onProgress: (meta: MetaState) => void;
}

export function ScreenEnd({ s, meta, onSettled, onProgress }: Props): React.ReactElement {
  const [error,setError]=useState('');
  const st = s.current;
  const ending = st.ending;
  if (ending === null) throw new Error('尚未達成結局');
  const result = s.settle(meta);
  const frags = Object.entries(result.notableFragments);
  const farewell=nextRecruitFarewell(st,meta,defs);
  if(farewell)return <RecruitFarewell scene={farewell} onNext={()=>{
    const next=advanceRecruitFarewell(st,meta,defs,farewell.notableId,farewell.page);
    if(nextRecruitFarewell(st,next,defs))onProgress(next);else onSettled(next);
  }}/>;
  const confirm=()=>{try{
    if(nextRecruitFarewell(st,result.meta,defs))onProgress(result.meta);
    else onSettled(result.meta);
  }catch{setError('結算未能保存，請保留此頁並再試一次。');}};

  return (
    <>
      <h1>{t(ending.titleKey)}</h1>
      <p className="sub">{ending.isFullDream ? '圓夢' : '中止'}　·　夢醒</p>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="body">{t(ending.bodyKey)}</div>
      </div>
      <Hud s={s} />

      <h2>結算</h2>
      <table>
        <tbody>
          <tr><td>通過大事件</td><td className="n mono">{st.progress.chaptersPassed}</td></tr>
          <tr><td>走過回合</td><td className="n mono">{st.progress.turn}</td></tr>
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
        {error&&<p role="alert">{error}</p>}
        <button className="primary" onClick={confirm}>
          {!lifeSettled(st,meta)&&nextRecruitFarewell(st,result.meta,defs)?'確認結算 → 夢醒之際':'夢醒 → 回到天命'}
        </button>
      </div>
    </>
  );
}
