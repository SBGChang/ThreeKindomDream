import type { MetaState } from '../contracts/core/state.js';
import {
  catalog, defs, designateQuota, emptyDraft, itemCodex, notableCodex, t,
} from '../app/bootstrap.js';

export type MetaView = 'destiny' | 'entry' | 'shop' | 'notables' | 'items';

interface Props {
  readonly meta: MetaState;
  readonly onGo: (v: MetaView) => void;
  readonly onReset: () => void;
}

/**
 * 四個入口 ★ **它們是四種不同的東西，不是四個分頁**
 *
 *   山河圖  往前走的那一步（唯一會改變 RunState 的入口）
 *   天命閣  花輪迴點數的地方
 *   風雲錄  你這輩子認識過誰
 *   天工鑒  你這輩子拿過什麼
 *
 * 山河圖是【出發】，天命閣是【投資】，兩本圖鑑是【累積】。
 * 只有出發那一張吃 primary 的顏色 —— 第一頁只有一個動作是往前的。
 *
 * 商店本來直接攤在第一頁上（十個品項的長表），於是三個入口被推到表格上方
 * 像是附屬品。做成同級的入口之後，第一頁短到一眼看得完，
 * **而「這一頁有四件事可以做」本身就是資訊。**
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

/** 第一頁：天命。四個入口從這裡去 —— 這一頁本身不做任何事。 */
export function ScreenDestiny({ meta, onGo, onReset }: Props): React.ReactElement {
  const entries = catalog(meta, defs);
  const quota = designateQuota(emptyDraft(meta, defs), defs);
  const slots = defs.single('gameRules').companionCount;
  const openingLine = quota === 0
    ? 'opening.designate.assigned'
    : (quota >= slots ? 'opening.designate.free' : 'opening.designate.partial');

  const notables = defs.reader('notable').all();
  const items = defs.reader('item').all();
  const starSeen = notables.filter((n) => notableCodex.starOf(n.notableId, meta) > 0).length;
  const buyable = entries.filter(
    (e) => e.nextLevel !== null && e.affordable && e.blockedBy.length === 0,
  ).length;
  const bought = entries.reduce((n, e) => n + e.currentLevel, 0);
  const levels = entries.reduce((n, e) => n + e.item.levels.length, 0);
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

      <div className="gates gates-4">
        <Gate
          primary
          title="山河圖"
          sub="入夢"
          note="分配資質、天賦、帶什麼進去"
          onClick={() => { onGo('entry'); }}
        />
        <Gate
          title="天命閣"
          sub="輪迴"
          note={buyable > 0 ? `${buyable} 項買得起` : `已購 ${bought} / ${levels} 階`}
          onClick={() => { onGo('shop'); }}
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
