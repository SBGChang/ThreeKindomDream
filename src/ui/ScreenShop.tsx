import type { MetaState } from '../contracts/core/state.js';
import {
  catalog, defs, designateQuota, emptyDraft, itemCodex, notableCodex, purchase, t,
} from '../app/bootstrap.js';
import type { ItemTierDef } from '../contracts/core/definitions.js';

interface Props {
  readonly meta: MetaState;
  readonly onMeta: (m: MetaState) => void;
  readonly onStart: () => void;
  readonly onReset: () => void;
}

export function ScreenShop({ meta, onMeta, onStart, onReset }: Props): React.ReactElement {
  const entries = catalog(meta, defs);
  const quota = designateQuota(emptyDraft(meta, defs), defs);
  const slots = defs.single('gameRules').companionCount;
  const openingLine = quota === 0
    ? 'opening.designate.assigned'
    : (quota >= slots ? 'opening.designate.free' : 'opening.designate.partial');

  return (
    <>
      <h1>天命</h1>
      <p className="sub mono">
        {`輪迴點數 ${meta.points}　第 ${meta.runIndex + 1} 次入夢`}
        {`　已見結局 ${meta.collection.reachedEndings.length}/${defs.reader('ending').all().length}`}
      </p>

      {/* 皇甫嵩的指派。台詞依【可自行指定的人數】而變 ——
          「世家門閥」買到的是選擇權，那件事必須在入夢前就說出來（14 §3）。 */}
      <p className="body">{t(openingLine)}</p>

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

      {/*
        道具圖鑑 ★ **這條線原本完全沒有畫面**
        每件道具有六階、靠碎片升，結算也確實算出 itemFragments／itemTierRaised
        —— 整套跑在程式裡，玩家看不到也就不知道有這回事。
        它與名士圖鑑同構（碎片換階），所以擺在一起。
      */}
      <h2>道具圖鑑</h2>
      <p className="sub" style={{ margin: '-4px 0 12px' }}>
        碎片換階。<b>第二次拿到同一件才產碎片</b> —— 首次獲得換到的是圖鑑登錄。
        而高階道具一輪只拿得到一次，所以它的碎片<b>只能靠攜帶進場</b>（入夢畫面）。
      </p>
      <table>
        <thead>
          <tr>
            <th>道具</th><th className="n">稀有度</th><th className="n">階</th>
            <th className="n">碎片／下一階</th><th>已解放</th>
          </tr>
        </thead>
        <tbody>
          {defs.reader('item').all()
            .slice().sort((a, b) => b.rarity - a.rarity)
            .map((it) => {
              const entry = itemCodex.entry(it.itemId, meta);
              const known = entry.tier >= 0 && meta.itemCodex[String(it.itemId)] !== undefined;
              const tier = itemCodex.tierOf(it.itemId, meta);
              const next = itemCodex.nextCost(it.itemId, meta, defs);
              const rows = itemCodex.unlockedTiers(it.itemId, meta, defs);
              return (
                <tr key={String(it.itemId)} style={known ? undefined : { opacity: 0.45 }}>
                  <td>{known ? t(it.nameKey) : '？？？'}</td>
                  <td className="n mono">{it.rarity}</td>
                  <td className="n mono">{`${tier}/${it.tiers.length - 1}`}</td>
                  <td className="n mono" style={{ color: 'var(--dim)' }}>
                    {next === null ? `${entry.fragments} / 已滿階` : `${entry.fragments} / ${next}`}
                  </td>
                  <td style={{ color: 'var(--dim)', fontSize: 12 }}>
                    {!known || rows.length === 0
                      ? '尚未在夢裡見過'
                      : rows.map((r: ItemTierDef) => t(r.descKey)).join('；')}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      <h2>名士圖鑑</h2>
      <p className="sub" style={{ margin: '-4px 0 12px' }}>
        碎片換星。星是【突破】不是稀有度 —— 每一星給什麼是逐人手寫的，
        不是同一張表。稀有度只決定碎片單價，不決定天花板。
      </p>
      <table>
        <thead>
          <tr>
            <th>名士</th><th className="n">稀有度</th><th className="n">星階</th>
            <th className="n">碎片／下一階</th><th>已解鎖</th>
          </tr>
        </thead>
        <tbody>
          {defs.reader('notable').all()
            .slice().sort((a, b) => b.rarity - a.rarity)
            .map((n) => {
              const star = notableCodex.starOf(n.notableId, meta);
              const next = notableCodex.nextCost(n.notableId, meta, defs);
              const have = notableCodex.entry(n.notableId, meta).fragments;
              const unlocked = notableCodex.unlockedRows(n.notableId, meta, defs);
              const maxStar = notableCodex.maxStar(defs);
              return (
                <tr key={String(n.notableId)}>
                  <td>{t(n.nameKey)}</td>
                  <td className="n mono">{n.rarity}</td>
                  <td className="n mono">{`${star}/${maxStar}`}</td>
                  <td className="n mono" style={{ color: 'var(--dim)' }}>
                    {next === null ? `${have} / 已満星` : `${have} / ${next}`}
                  </td>
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
