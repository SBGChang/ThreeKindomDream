import type { MetaState } from '../contracts/core/state.js';
import type { ItemTierDef } from '../contracts/core/definitions.js';
import { defs, itemCodex, notableCodex, t } from '../app/bootstrap.js';

interface Props {
  readonly meta: MetaState;
  readonly onBack: () => void;
}

const stars = (n: number, max: number): string =>
  '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));

/**
 * 碎片進度條。**兩本圖鑑共用同一個元件** —— 名士換星、道具換階，
 * 那是同一個機制的兩個出口（碎片 → 突破），所以視覺上必須是同一個東西。
 */
function Frag({ have, need }: { readonly have: number; readonly need: number | null }): React.ReactElement {
  if (need === null) return <span className="mono ok">已滿</span>;
  const pct = Math.max(0, Math.min(100, (have / Math.max(1, need)) * 100));
  return (
    <div className="frag">
      <div className="frag-fill" style={{ width: `${pct}%` }} />
      <span className="frag-text mono">{`${have} / ${need}`}</span>
    </div>
  );
}

/**
 * 風雲錄 —— 名士圖鑑。
 *
 * 星是【突破】不是稀有度：每一星給什麼是逐人手寫的，不是同一張表。
 * 稀有度只決定碎片單價，不決定天花板（10 §2）。
 */
export function ScreenNotableCodex({ meta, onBack }: Props): React.ReactElement {
  const maxStar = notableCodex.maxStar(defs);
  const rows = defs.reader('notable').all().slice()
    .sort((a, b) => b.rarity - a.rarity || String(a.notableId).localeCompare(String(b.notableId)));

  return (
    <>
      <h1>風雲錄</h1>
      <p className="sub">
        碎片換星。<b>星是突破，不是稀有度</b> —— 每一星給什麼是逐人手寫的。
        稀有度只決定碎片單價，不決定天花板。
      </p>
      <div className="codex">
        {rows.map((n) => {
          const star = notableCodex.starOf(n.notableId, meta);
          const next = notableCodex.nextCost(n.notableId, meta, defs);
          const have = notableCodex.entry(n.notableId, meta).fragments;
          const unlocked = notableCodex.unlockedRows(n.notableId, meta, defs);
          return (
            <div className="codex-card" key={String(n.notableId)}>
              <div className="codex-head">
                <b>{t(n.nameKey)}</b>
                <span className={`rar r${n.rarity}`}>{`★${n.rarity}`}</span>
              </div>
              <div className={`stars s${star}`}>{stars(star, maxStar)}</div>
              <Frag have={have} need={next} />
              <ul className="codex-fx">
                {unlocked.length === 0
                  ? <li className="dim">尚未突破 —— 升星才會解鎖</li>
                  : unlocked.map((u) => <li key={String(u.descKey)}>{t(u.descKey)}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      <button style={{ marginTop: 16 }} onClick={onBack}>回天命</button>
    </>
  );
}

/**
 * 天工鑒 —— 道具圖鑑。
 *
 * 與風雲錄同構（碎片換階），但多一條規矩要說：
 * **第二次拿到同一件才產碎片**，而高階道具一輪只拿得到一次 ——
 * 所以它的碎片只能靠【攜帶進場】（山河圖那一頁）。
 * 沒把這條寫出來，玩家會以為高階道具的階級是刷不到的（23 §5）。
 */
export function ScreenItemCodex({ meta, onBack }: Props): React.ReactElement {
  const rows = defs.reader('item').all().slice()
    .sort((a, b) => b.rarity - a.rarity || String(a.itemId).localeCompare(String(b.itemId)));

  return (
    <>
      <h1>天工鑒</h1>
      <p className="sub">
        碎片換階。<b>第二次拿到同一件才產碎片</b> —— 首次獲得換到的是登錄。
        而高階道具一輪只拿得到一次，所以它的碎片<b>只能靠帶進場</b>（山河圖）。
      </p>
      <div className="codex">
        {rows.map((it) => {
          const entry = itemCodex.entry(it.itemId, meta);
          const known = meta.itemCodex[String(it.itemId)] !== undefined;
          const tier = itemCodex.tierOf(it.itemId, meta);
          const top = it.tiers.length - 1;
          const next = itemCodex.nextCost(it.itemId, meta, defs);
          const opened = itemCodex.unlockedTiers(it.itemId, meta, defs);
          return (
            <div className={`codex-card${known ? '' : ' unknown'}`} key={String(it.itemId)}>
              <div className="codex-head">
                <b>{known ? `◆${t(it.nameKey)}` : '◆？？？'}</b>
                <span className={`rar r${it.rarity}`}>{`★${it.rarity}`}</span>
              </div>
              <div className={`stars s${tier}`}>{stars(tier, top)}</div>
              {known ? <Frag have={entry.fragments} need={next} /> : <div className="frag" />}
              <ul className="codex-fx">
                {!known
                  ? <li className="dim">尚未在夢裡見過</li>
                  : it.tiers.map((row: ItemTierDef) => (
                    <li
                      key={row.tier}
                      className={opened.some((o) => o.tier === row.tier) ? '' : 'locked'}
                    >
                      {t(row.descKey)}
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}
      </div>
      <button style={{ marginTop: 16 }} onClick={onBack}>回天命</button>
    </>
  );
}
