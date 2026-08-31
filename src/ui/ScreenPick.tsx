import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId } from '../contracts/core/ids.js';
import { defs, t } from '../app/bootstrap.js';

interface Props { readonly s: Session; readonly bump: () => void }

/**
 * 黃巾平定後：袁紹問你要往哪一路去（GDD §4.1）。
 * 不合格者列出但標示原因（22 §2.1）。
 */
export function ScreenFaction({ s, bump }: Props): React.ReactElement {
  const options = s.factionOptions();
  return (
    <>
      <h1>投於何人</h1>
      <p className="body">{t('opening.faction.yuanshao')}</p>
      <p className="sub">選定之後，討董那一戰你就是站在他那一邊了。</p>
      {options.map((o) => (
        <div className="card" key={String(o.factionId)} style={{ marginBottom: 10 }}>
          <h3>{t(o.nameKey)}</h3>
          {o.eligible ? (
            <button className="primary" onClick={() => { s.chooseFaction(o.factionId); bump(); }}>
              入其幕下
            </button>
          ) : (
            <p className="warn" style={{ margin: 0 }}>
              {o.rejectReasonKey === null ? '條件不足' : t(o.rejectReasonKey)}
            </p>
          )}
        </div>
      ))}
      {options.every((o) => !o.eligible) && (
        <button onClick={() => { s.noFactionAvailable(); bump(); }}>無處可去 → 在野</button>
      )}
      <p className="sub" style={{ marginTop: 16 }}>
        灰盒 v0 只安裝了 pack:wei。蜀吳未安裝，因此完全不出現在清單裡。
      </p>
    </>
  );
}

/** 入朝：主公分配上司，勢力緣分決定可自選幾位（19 §3）。 */
export function ScreenSuperiors({ s, bump }: Props): React.ReactElement {
  const quota = s.bondQuota();
  const cands = s.superiorCandidates();
  const total = defs.single('gameRules').superiorCount;
  const [picked, setPicked] = useState<readonly NotableId[]>([]);
  const factionId = s.current.faction;
  const speech = factionId === null ? null
    : defs.reader('faction').get(String(factionId)).bondSpeechKeys[quota] ?? null;

  const toggle = (id: NotableId): void => {
    setPicked((cur) => (cur.includes(id)
      ? cur.filter((x) => x !== id)
      : (cur.length < quota ? [...cur, id] : cur)));
  };

  return (
    <>
      <h1>入朝</h1>
      <p className="body">{speech === null ? '' : t(speech)}</p>
      <p className="sub mono">
        {`勢力緣分 ${quota}／3　可自選 ${quota} 位，其餘 ${total - quota} 位由主公分配`}
      </p>

      {quota > 0 && (
        <>
          <h2>{`自選（${picked.length}/${quota}）`}</h2>
          <div className="row">
            {cands.map((id) => {
              const nd = defs.reader('notable').get(String(id));
              return (
                <button
                  key={String(id)}
                  className={picked.includes(id) ? 'sel' : ''}
                  onClick={() => { toggle(id); }}
                >
                  {`${t(nd.nameKey)} ★${nd.rarity}`}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="row" style={{ marginTop: 20 }}>
        <button className="primary" onClick={() => { s.assignSuperiors(picked); bump(); }}>
          {quota === 0 ? '聽憑主公安排 →' : '就這幾位 →'}
        </button>
      </div>
      {quota === 0 && (
        <p className="sub">緣分為 0，三位上司全由 RNG 分配。到天命商店買緣分可解放自選權。</p>
      )}
    </>
  );
}
