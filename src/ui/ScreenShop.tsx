import type { MetaState } from '../contracts/core/state.js';
import { catalog, defs, purchase, t } from '../app/bootstrap.js';

interface Props {
  readonly meta: MetaState;
  readonly onMeta: (m: MetaState) => void;
  readonly onStart: () => void;
  readonly onReset: () => void;
}

export function ScreenShop({ meta, onMeta, onStart, onReset }: Props): React.ReactElement {
  const entries = catalog(meta, defs);

  return (
    <>
      <h1>天命</h1>
      <p className="sub mono">
        {`輪迴點數 ${meta.points}　第 ${meta.runIndex + 1} 次入夢`}
        {`　已見結局 ${meta.collection.reachedEndings.length}/${defs.reader('ending').all().length}`}
      </p>

      <div className="row" style={{ marginBottom: 22 }}>
        <button className="primary" onClick={onStart}>入夢 →</button>
        <button onClick={onReset}>清除存檔</button>
      </div>

      <h2>天命商店</h2>
      <table>
        <thead>
          <tr>
            <th>品項</th><th>效果</th><th className="n">等級</th>
            <th className="n">下一階</th><th />
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={String(e.item.item)}>
              <td><b>{t(e.item.nameKey)}</b></td>
              <td style={{ color: 'var(--dim)' }}>{t(e.item.descKey)}</td>
              <td className="n mono">{`${e.currentLevel}/${e.item.levels.length}`}</td>
              <td className="n mono">{e.nextLevel === null ? '—' : e.nextLevel.cost}</td>
              <td>
                <button
                  disabled={e.nextLevel === null || !e.affordable || e.blockedBy.length > 0}
                  onClick={() => {
                    const r = purchase(e.item.item, meta, defs);
                    if (r.ok) onMeta(r.meta);
                  }}
                >
                  {e.nextLevel === null ? '已購滿'
                    : (e.blockedBy.length > 0 ? '前置未滿'
                      : (e.affordable ? '購買' : '點數不足'))}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>名士圖鑑</h2>
      <table>
        <thead>
          <tr><th>名士</th><th className="n">★</th><th className="n">初始好感</th><th className="n">碎片</th><th>已解鎖</th></tr>
        </thead>
        <tbody>
          {defs.reader('notable').all()
            .slice().sort((a, b) => b.rarity - a.rarity)
            .map((n) => {
              const e = meta.notableCodex[String(n.notableId)] ?? { startAffinity: 0, fragments: 0 };
              const unlocked = n.unlocks.filter((u) => u.affinity <= e.startAffinity);
              return (
                <tr key={String(n.notableId)}>
                  <td>{t(n.nameKey)}</td>
                  <td className="n mono">{n.rarity}</td>
                  <td className="n mono">{e.startAffinity}</td>
                  <td className="n mono" style={{ color: 'var(--dim)' }}>{e.fragments}</td>
                  <td style={{ color: 'var(--dim)', fontSize: 12 }}>
                    {unlocked.length === 0 ? '—' : unlocked.map((u) => t(u.descKey)).join('；')}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </>
  );
}
