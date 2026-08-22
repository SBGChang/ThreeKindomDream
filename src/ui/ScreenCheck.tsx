import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId } from '../contracts/core/ids.js';
import { DIFFICULTIES } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
import { StatusBar } from './StatusBar.js';

interface Props { readonly s: Session; readonly bump: () => void }

export function ScreenCheck({ s, bump }: Props): React.ReactElement {
  const check = s.majorCheck();
  const chapter = defs.reader('chapter').get(String(s.current.progress.chapterId));
  const eligible = s.eligibleSortie();
  const maxSortie = defs.single('gameRules').maxSortie;
  const [sortie, setSortie] = useState<readonly NotableId[]>(() => eligible.slice(0, maxSortie));
  const avail = s.availableDifficulties();

  const toggle = (id: NotableId): void => {
    setSortie((cur) => (cur.includes(id)
      ? cur.filter((x) => x !== id)
      : (cur.length < maxSortie ? [...cur, id] : cur)));
  };

  return (
    <>
      <h1>{`大檢定 · ${t(chapter.titleKey)}`}</h1>
      <p className="sub">
        {`主 ${t(`attr.${check.primaryAttr}.short`)}`}
        {check.secondaryAttr === null ? '' : `　副 ${t(`attr.${check.secondaryAttr}.short`)}（×0.5）`}
      </p>
      <StatusBar s={s} />

      <h2>{`出戰名士（最多 ${maxSortie}）`}</h2>
      <div className="row">
        {s.current.roster.members.map((m) => {
          const nd = defs.reader('notable').get(String(m.notableId));
          const banned = !eligible.includes(m.notableId);
          return (
            <button
              key={String(m.notableId)}
              className={sortie.includes(m.notableId) ? 'sel' : ''}
              disabled={banned}
              onClick={() => { toggle(m.notableId); }}
            >
              {t(nd.nameKey)}
              {banned ? <span className="warn"> 敵方</span> : ''}
            </button>
          );
        })}
      </div>

      <h2>難度 · 成功率一律可見</h2>
      <table>
        <thead>
          <tr>
            <th>難度</th><th>任務</th><th className="n">DC</th>
            <th className="n">你的值</th><th className="n">成功率</th><th />
          </tr>
        </thead>
        <tbody>
          {DIFFICULTIES.map((d) => {
            const tier = check.tiers[d];
            const pv = s.previewMajor(d, sortie);
            const locked = !avail.includes(d);
            const rate = pv.successRate;
            const cls = rate >= 0.7 ? 'ok' : (rate <= 0.3 ? 'warn' : '');
            return (
              <tr key={d}>
                <td><b>{t(`difficulty.${d}`)}</b></td>
                <td style={{ maxWidth: 380 }}>{t(tier.briefKey)}</td>
                <td className="n mono">{pv.dc}</td>
                <td className="n mono">{`${pv.base}+${pv.bonus}`}</td>
                <td className={`n mono ${cls}`}>{`${(rate * 100).toFixed(0)}%`}</td>
                <td>
                  <button
                    className="primary"
                    disabled={locked}
                    onClick={() => { s.attemptMajor(d, sortie); bump(); }}
                  >
                    {locked ? '未達門檻' : '執行'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sub" style={{ marginTop: 12 }}>
        失敗即導向中止類結局。這是你自己的選擇，不是系統的隨機暴斃。
      </p>
    </>
  );
}
