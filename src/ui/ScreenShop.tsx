import type { MetaState } from '../contracts/core/state.js';
import { catalog, defs, purchase, t } from '../app/bootstrap.js';

interface Props {
  readonly meta: MetaState;
  readonly onMeta: (m: MetaState) => void;
  readonly onBack: () => void;
}

/**
 * 天命閣 —— 花輪迴點數的地方。
 *
 * ── 它自己一頁，是因為它是【投資】不是【出發】 ──────
 * 商店本來直接攤在第一頁上（十個品項的長表），把三個入口擠成表格上方的
 * 附屬品。獨立之後第一頁短到一眼看得完，而這一頁可以把
 * 「這一項買到什麼」講清楚 —— 那件事在第一頁沒有位置。
 *
 * **每一項都要回答「它買到什麼新東西」**（09 §2.1）：實測抓到的病是
 * 商店曾經只賣產量倍率，而產量的出口有硬上限，於是跨輪投資在
 * 第五輪就感覺不到。分類欄位因此寫在這裡，不只是排序用。
 */
const CATEGORY: Readonly<Record<string, string>> = {
  career: '官途 · 買到新的稱號',
  aptitude: '資質 · 買到更高的天花板',
  talent: '天賦 · 買到新的可選項',
  bond: '緣分 · 買到指定的名額',
  glow: '光階 · 買到更高的產量',
};

export function ScreenShop({ meta, onMeta, onBack }: Props): React.ReactElement {
  const entries = catalog(meta, defs);
  const order = ['career', 'aptitude', 'talent', 'bond', 'glow'];
  const groups = order
    .map((c) => ({ cat: c, rows: entries.filter((e) => e.item.category === c) }))
    .filter((g) => g.rows.length > 0);

  return (
    <>
      <h1>天命閣</h1>
      <p className="sub mono">{`輪迴點數 ${meta.points}`}</p>
      <p className="sub">
        點數從結算來，<b>碎片不在這裡買</b> —— 那只能從夢裡帶回來（風雲錄／天工鑒）。
      </p>

      {groups.map((g) => (
        <div key={g.cat}>
          <h2>{CATEGORY[g.cat] ?? g.cat}</h2>
          <table>
            <thead>
              <tr>
                <th>品項</th><th>效果</th><th className="n">等級</th>
                <th className="n">下一階</th><th />
              </tr>
            </thead>
            <tbody>
              {g.rows.map((e) => {
                const done = e.nextLevel === null;
                return (
                  <tr key={String(e.item.item)}>
                    <td><b>{t(e.item.nameKey)}</b></td>
                    <td style={{ color: 'var(--dim)' }}>{t(e.item.descKey)}</td>
                    <td className="n mono">
                      {`${e.currentLevel}/${e.item.levels.length}`}
                    </td>
                    <td className={`n mono ${!done && e.affordable ? 'ok' : ''}`}>
                      {done ? '—' : e.nextLevel?.cost}
                    </td>
                    <td>
                      <button
                        className={!done && e.affordable && e.blockedBy.length === 0 ? 'primary' : ''}
                        disabled={done || !e.affordable || e.blockedBy.length > 0}
                        onClick={() => {
                          const r = purchase(e.item.item, meta, defs);
                          if (r.ok) onMeta(r.meta);
                        }}
                      >
                        {done ? '已購滿'
                          : (e.blockedBy.length > 0 ? '前置未滿'
                            : (e.affordable ? '購買' : '點數不足'))}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <button style={{ marginTop: 16 }} onClick={onBack}>回天命</button>
    </>
  );
}
