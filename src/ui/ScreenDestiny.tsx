import type { MetaState } from '../contracts/core/state.js';
import {
  catalog, defs, designateQuota, emptyDraft, itemCodex, notableCodex, purchase, t,
} from '../app/bootstrap.js';

export type MetaView = 'destiny' | 'entry' | 'notables' | 'items';

interface Props {
  readonly meta: MetaState;
  readonly onMeta: (m: MetaState) => void;
  readonly onGo: (v: MetaView) => void;
  readonly onReset: () => void;
}

/**
 * 三個入口 ★ **它們是三種不同的東西，不是三個分頁**
 *
 *   山河圖  往前走的那一步（唯一會改變 RunState 的入口）
 *   風雲錄  你這輩子認識過誰
 *   天工鑒  你這輩子拿過什麼
 *
 * 兩本圖鑑是【累積】，山河圖是【出發】。把出發那一張放在最前面並吃掉
 * primary 的顏色，是因為第一頁只有一個動作是真的動作。
 */
function Gate({
  title, sub, note, primary, onClick,
}: {
  readonly title: string; readonly sub: string; readonly note: string;
  readonly primary?: boolean; readonly onClick: () => void;
}): React.ReactElement {
  return (
    <button className={`gate${primary === true ? ' primary' : ''}`} onClick={onClick}>
      <div className="gate-title">{title}</div>
      <div className="gate-sub">{sub}</div>
      <div className="gate-note mono">{note}</div>
    </button>
  );
}

/** 第一頁：天命。點數在這裡花，三個入口從這裡去。 */
export function ScreenDestiny({ meta, onMeta, onGo, onReset }: Props): React.ReactElement {
  const entries = catalog(meta, defs);
  const quota = designateQuota(emptyDraft(meta, defs), defs);
  const slots = defs.single('gameRules').companionCount;
  const openingLine = quota === 0
    ? 'opening.designate.assigned'
    : (quota >= slots ? 'opening.designate.free' : 'opening.designate.partial');

  const notables = defs.reader('notable').all();
  const items = defs.reader('item').all();
  const starSeen = notables.filter((n) => notableCodex.starOf(n.notableId, meta) > 0).length;
  const itemSeen = items.filter((i) => meta.itemCodex[String(i.itemId)] !== undefined).length;
  const endings = defs.reader('ending').all().length;

  return (
    <>
      <h1>天命</h1>
      <p className="sub mono">
        {`輪迴點數 ${meta.points}　第 ${meta.runIndex + 1} 次入夢`}
        {`　已見結局 ${meta.collection.reachedEndings.length}/${endings}`}
      </p>

      {/* 皇甫嵩的指派。台詞依【可自行指定的人數】而變 ——
          「世家門閥」買到的是選擇權，那件事必須在入夢前就說出來（14 §3）。 */}
      <p className="body">{t(openingLine)}</p>

      <div className="gates">
        <Gate
          primary
          title="山河圖"
          sub="入夢"
          note="分配資質、天賦、帶什麼進去"
          onClick={() => { onGo('entry'); }}
        />
        <Gate
          title="風雲錄"
          sub="名士"
          note={`已突破 ${starSeen} / ${notables.length}`}
          onClick={() => { onGo('notables'); }}
        />
        <Gate
          title="天工鑒"
          sub="器物"
          note={`已登錄 ${itemSeen} / ${items.length}`}
          onClick={() => { onGo('items'); }}
        />
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

      <p className="sub" style={{ marginTop: 18 }}>
        {`碎片：名士 ${notables.reduce(
          (n, x) => n + notableCodex.entry(x.notableId, meta).fragments, 0,
        )}　器物 ${items.reduce(
          (n, x) => n + itemCodex.entry(x.itemId, meta).fragments, 0,
        )}　—— 碎片不用點數買，只能從夢裡帶回來。`}
      </p>
      <button onClick={onReset}>清除存檔</button>
    </>
  );
}
