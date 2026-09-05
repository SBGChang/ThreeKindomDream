import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
import { Hud } from './Hud.js';

interface Props {
  readonly s: Session;
  readonly onBack: () => void;
}

/**
 * 府庫 —— **這一輪**手上有什麼。
 *
 * 與天工鑒（跨輪的圖鑑）分開是刻意的：
 *   府庫  這一輪拿到了什麼、它現在給你什麼加成
 *   天工鑒 這件東西一共有幾階、你解放到第幾階
 *
 * 中間那條線是【重複獲得】：第二次拿到同一件才產碎片，
 * 而碎片是天工鑒那一側的貨幣（23 §7）。所以「×2」不是贅字，
 * 它是玩家看得到的唯一一個「這一輪替下一輪存了什麼」的訊號。
 */
export function ScreenVault({ s, onBack }: Props): React.ReactElement {
  const held = s.heldItems();
  const carried = new Set(s.current.config.carriedItems.map(String));

  return (
    <>
      <h1>府庫</h1>
      <p className="sub">
        這一輪手上的東西。<b>第二次拿到同一件才產碎片</b> ——
        碎片帶回天工鑒換階，那是它唯一的跨輪出口。
      </p>
      <Hud s={s} />

      {held.length === 0 ? (
        <p className="body dim">
          府庫還是空的。委託的中檔與高檔會掉低階器物（★2 以上），
          深關與人物事件則掉高階的。
        </p>
      ) : (
        <div className="codex">
          {held.map((h) => {
            const def = defs.reader('item').get(String(h.itemId));
            return (
              <div className="codex-card" key={String(h.itemId)}>
                <div className="codex-head">
                  <b>{`◆${h.name}`}</b>
                  <span className={`rar r${def.rarity}`}>{`★${def.rarity}`}</span>
                </div>
                <div className="vault-meta mono">
                  {`第 ${h.tier} 階`}
                  {h.count > 1
                    ? <span className="ok">{`　本輪 ×${h.count}　→ 碎片 ${h.count - 1}`}</span>
                    : <span className="dim">　本輪 ×1（再拿一次才有碎片）</span>}
                  {carried.has(String(h.itemId)) ? <span className="dim">　·帶進來的</span> : ''}
                </div>
                <ul className="codex-fx">
                  {h.desc.split('；').map((line) => <li key={line}>{line}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <button style={{ marginTop: 16 }} onClick={onBack}>回到回合</button>
    </>
  );
}
