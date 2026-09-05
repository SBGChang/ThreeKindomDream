import type { Session } from '../app/session.js';
import { t } from '../app/bootstrap.js';

/**
 * 七關之路 ★★ **獎勵曲線必須看得見**
 *
 * `REWARD_MUL` 是 1 → 45：**一場戰役的價值有八成六在第五關之後**（D12）。
 * 那是整個 push-your-luck 的張力來源 —— 而畫面上原本只有一行
 * 「已通過 1 / 7 關」，玩家不可能從那行字讀出這件事。
 *
 * ── 為什麼用高度而不是數字 ────────────────────────
 * 每一格的高度 ＝ 那一關單獨給的功績，開三次方根之後再畫。
 * 直接用線性高度的話，第 1 關會是 1px 而第 7 關頂到天花板 ——
 * 「前面幾關幾乎不值錢」這件事會被畫成「前面幾關不存在」。
 * 立方根壓縮之後，**形狀還在（越走越高），而每一格都還讀得到**。
 *
 * 精確的量由累計數字負責（走留的問題是「我手上的會變成幾倍」），
 * 高度只負責讓那個形狀在半秒內進到眼睛裡。
 */
export function CampaignRoad({ s }: { readonly s: Session }): React.ReactElement | null {
  const rows = s.stageRows();
  if (rows.length === 0) return null;
  const top = Math.max(...rows.map((r) => r.merit), 1);

  return (
    <div className="road">
      {rows.map((r) => {
        const h = 14 + Math.round(56 * (Math.cbrt(r.merit) / Math.cbrt(top)));
        const state = r.cleared ? 'done' : (r.current ? 'now' : 'far');
        return (
          <div className={`road-step ${state}`} key={r.index} title={t(r.brief)}>
            <div className="road-bar-wrap">
              <div className="road-bar" style={{ height: `${h}px` }} />
            </div>
            <div className="road-no mono">{r.index + 1}</div>
            <div className="road-tags">
              {r.boss === null ? null : <span className="road-boss">{t(r.boss.nameKey)}</span>}
              {r.unique ? <span className="road-drop" title="唯一掉落">◆</span> : null}
            </div>
            {/* 累計才是走留要比的量 —— 單關的數字放在 title 裡就好。 */}
            <div className="road-cum mono">{r.cumulative}</div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 走留的兩個數字 ★★ **不給勝率，就得給原料**（D8 的配套）
 *
 * D8 說不顯示勝率：在一個玩家不操作但變數眾多的系統裡，算出來的百分比
 * 是假的精確。但那條規矩一直缺一半 —— 這兩個數字本來就存在
 * （`isOverwhelming` 裡算完就丟），玩家卻看不到。
 * 於是替身 AI 用的判準比玩家多，而 33 §5.4 的整個立論
 * （「玩家算得出來的東西，才值得他去算」）站不住。
 *
 * 兩條**等長可比**的軌道，不是兩個數字：長度本身就是那個除法。
 */
export function Outlook({ s }: { readonly s: Session }): React.ReactElement | null {
  const o = s.stageOutlook();
  if (o === null) return null;
  const kill = Number.isFinite(o.turnsToKill) ? o.turnsToKill : 0;
  const live = o.turnsToDie;
  const span = Math.max(kill, live, 1);
  const pct = (n: number): string => `${Math.max(2, Math.min(100, (n / span) * 100))}%`;
  const tone = o.margin >= 2 ? 'safe' : (o.margin >= 1 ? 'tight' : 'bad');
  /**
   * 四段而不是三段 ★ 1.0–1.25 那一段要單獨講
   *
   * 戰敗改成獎勵減半（D54）之後，損益兩平的勝率掉到 1/3，
   * 所以 margin 1.0 附近【不是不能上】—— 它是「上了大概會過，但沒有失誤空間」。
   * 用三段會把 1.48 跟 1.02 講成同一句話，而那兩件事該給玩家不同的感覺。
   */
  const verdict = o.margin >= 2 ? '餘裕充足'
    : (o.margin >= 1.25 ? '打得完，但會痛'
      : (o.margin >= 1 ? '剛剛好 —— 沒有失誤空間' : '撐不到打完'));

  return (
    <div className="outlook">
      <div className="ol-row">
        <span className="ol-label">對面要打</span>
        <div className="ol-track"><div className="ol-fill kill" style={{ width: pct(kill) }} /></div>
        <span className="ol-num mono">
          {Number.isFinite(o.turnsToKill) ? `${kill.toFixed(1)} 回合` : '打不完'}
        </span>
      </div>
      <div className="ol-row">
        <span className="ol-label">我撐得住</span>
        <div className="ol-track"><div className={`ol-fill live ${tone}`} style={{ width: pct(live) }} /></div>
        <span className="ol-num mono">{`${live.toFixed(1)} 回合`}</span>
      </div>
      <div className={`ol-verdict ${tone}`}>
        {Number.isFinite(o.expectedLoss)
          ? `預估掉 ${Math.round(o.expectedLoss)}　·　${verdict}`
          : '你打不出傷害 —— 上去只是送死'}
      </div>
      {/*
        有效軍勢要拆給玩家看 ★ 「撐得住幾回合」吃的是【軍勢 ＋ 糧秣】，
        而糧秣那一半【只有帶了恢復招的人算得到】（33 §5.3）。
        不拆開的話，同一支軍隊在兩個玩家手上撐的回合數不同，會像是 bug。
      */}
      <p className="sub mono" style={{ margin: '6px 0 0' }}>
        {`可用 ${Math.round(o.pool)} ＝ 軍勢 ${Math.round(o.troops)}`}
        {o.sustain > 0
          ? ` ＋ 糧秣換回 ${Math.round(o.sustain)}`
          : ' ＋ 糧秣 0（沒帶恢復招，糧秣換不回軍勢）'}
      </p>
      <p className="sub" style={{ margin: '2px 0 0' }}>
        這裡<b>不給勝率</b> —— 給的是你自己會做的那個除法。
      </p>
    </div>
  );
}
