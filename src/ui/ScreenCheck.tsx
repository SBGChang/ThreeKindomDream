import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { CheckChoice } from '../contracts/core/primitives.js';
import { CAREER_LINES, DIFFICULTIES } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
import { StatusBar } from './StatusBar.js';

interface Props { readonly s: Session; readonly bump: () => void }

export function ScreenCheck({ s, bump }: Props): React.ReactElement {
  const check = s.majorCheck();
  const chapter = defs.reader('chapter').get(String(s.current.progress.chapterId));
  const eligible = s.eligibleSortie();
  const maxSortie = defs.single('gameRules').maxSortie;
  const [sortie, setSortie] = useState<readonly NotableId[]>(() => eligible.slice(0, maxSortie));
  const avail = s.availableChoices();
  // 以值比對而非引用 —— availableChoices 現在剛好回傳 CHECK_CHOICES 的同一批物件，
  // 但 UI 不該依賴那件事。
  const isAvail = (c: CheckChoice): boolean =>
    avail.some((a) => a.line === c.line && a.difficulty === c.difficulty);

  const toggle = (id: NotableId): void => {
    setSortie((cur) => (cur.includes(id)
      ? cur.filter((x) => x !== id)
      : (cur.length < maxSortie ? [...cur, id] : cur)));
  };

  return (
    <>
      <h1>{`大檢定 · ${t(chapter.titleKey)}`}</h1>
      <p className="sub">
        文武兩條路線，各三檔難度。走哪一條，就只算那一條的官階加值。
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

      <h2>路線與難度 · 成功率一律可見</h2>
      <table>
        <thead>
          <tr>
            <th>路線</th><th>難度</th><th>屬性</th><th>任務</th><th className="n">DC</th>
            <th className="n">你的值</th><th className="n">成功率</th><th />
          </tr>
        </thead>
        {CAREER_LINES.map((line) => {
          const route = check.routes[line];
          return (
            <tbody key={line}>
              {DIFFICULTIES.map((difficulty, row) => {
                const choice: CheckChoice = { line, difficulty };
                const tier = route.tiers[difficulty];
                const pv = s.previewMajor(choice, sortie);
                const locked = !isAvail(choice);
                const rate = pv.successRate;
                const cls = rate >= 0.7 ? 'ok' : (rate <= 0.3 ? 'warn' : '');
                return (
                  <tr key={difficulty}>
                    {row === 0 && (
                      <td rowSpan={DIFFICULTIES.length}>
                        <b>{t(`careerLine.${line}`)}</b>
                      </td>
                    )}
                    <td><b>{t(`difficulty.${difficulty}`)}</b></td>
                    <td className="mono">
                      {t(`attr.${route.primaryAttr}.short`)}
                      {route.secondaryAttr === null
                        ? ''
                        : `+${t(`attr.${route.secondaryAttr}.short`)}×0.5`}
                    </td>
                    <td style={{ maxWidth: 340 }}>{t(tier.briefKey)}</td>
                    <td className="n mono">{pv.dc}</td>
                    <td className="n mono">{`${pv.base}+${pv.bonus}`}</td>
                    <td className={`n mono ${cls}`}>{`${(rate * 100).toFixed(0)}%`}</td>
                    <td>
                      <button
                        className="primary"
                        disabled={locked}
                        onClick={() => { s.attemptMajor(choice, sortie); bump(); }}
                      >
                        {locked ? '未達門檻' : '執行'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
      <p className="sub" style={{ marginTop: 12 }}>
        失敗即導向中止類結局。這是你自己的選擇，不是系統的隨機暴斃。
      </p>
    </>
  );
}
