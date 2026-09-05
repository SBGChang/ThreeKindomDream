import type { Session } from '../app/session.js';
import type { Attr, CareerLine } from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { careerService, defs, stageOf, t } from '../app/bootstrap.js';

interface Props {
  readonly s: Session;
  readonly onLearn?: () => void;
  readonly onVault?: () => void;
}

/**
 * 局內 HUD。三個區塊，順序就是三種貨幣的因果順序：
 *
 *   數值 ＋ 經驗   你能打多痛（經驗框接在它買的那一維底下）
 *   功績           你能撐多深（→ 官階 → 兵量糧量）
 *   隨身           這一輪撿到的東西
 *
 * ── 為什麼經驗框要貼在數值框底下 ★ ──────────────────
 * 四類經驗【不共用】（32 §2.1），而那是回合制唯一的長期決策。
 * 舊版把四維與四類經驗排成同一行文字，於是「智的經驗只能買智」
 * 這件事在畫面上完全讀不出來 —— 玩家會以為那是一個總池。
 * 把它做成上下相連的一格，那條歸屬就不必解釋。
 */
export function Hud({ s, onLearn, onVault }: Props): React.ReactElement {
  const st = s.current;
  const held = s.heldItems();
  const cap = careerService.maxLevel('martial', s.ctx);
  const totalExp = ATTRS.reduce((n, a) => n + s.expOf(a), 0);

  return (
    <div className="hud">
      {/* ── 區塊一：四維，每維一格；經驗框接在底下 ── */}
      <div className="hud-attrs">
        {ATTRS.map((a: Attr) => {
          const cur = st.attributes.values[a];
          const lid = s.attrCap(a);
          const exp = s.expOf(a);
          const pct = Math.max(0, Math.min(100, (cur / Math.max(1, lid)) * 100));
          return (
            <div className="attr-cell" key={a}>
              <div className={`attr-top${cur >= lid ? ' maxed' : ''}`}>
                <span className="attr-name">{t(`attr.${a}.short`)}</span>
                <span className="attr-val mono">{cur}</span>
                <span className="attr-grade mono">{s.gradeOf(a)}</span>
                <div className="attr-track"><div className="attr-fill" style={{ width: `${pct}%` }} /></div>
                <span className="attr-cap mono">{`上限 ${lid}`}</span>
              </div>
              <div className={`attr-exp mono${exp > 0 ? ' has' : ''}`}>
                {`經驗 ${exp}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 區塊二：功績。Bar 顯示【往下一階的進度】，不是總量 ── */}
      <div className="hud-merit">
        {(['civil', 'martial'] as const).map((line: CareerLine) => {
          const level = line === 'civil' ? st.career.civil : st.career.martial;
          const have = st.currencies.merit[line];
          const ranks = defs.reader('careerRank').all()
            .filter((r) => r.line === line).slice().sort((a, b) => a.level - b.level);
          const here = ranks.find((r) => r.level === level);
          const next = ranks.find((r) => r.level === level + 1);
          const atCap = level >= cap;
          const from = here?.requiredMerit ?? 0;
          const to = next?.requiredMerit ?? from;
          // 進度是【這一階走了多少】，不是總量佔比 —— 玩家要的是「還差多少」。
          const pct = atCap || next === undefined
            ? 100
            : Math.max(0, Math.min(100, ((have - from) / Math.max(1, to - from)) * 100));
          return (
            <div className="merit-row" key={line}>
              <div className="merit-head">
                <span className="merit-line">{t(`merit.${line}`)}</span>
                <b>{here === undefined ? '—' : t(here.nameKey)}</b>
                <span className="merit-num mono">{have}</span>
              </div>
              <div className={`merit-track${atCap ? ' capped' : ''}`}>
                <div className={`merit-fill ${line}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="merit-foot mono">
                {atCap
                  ? `本輪上限（第 ${cap} 階）`
                  : (next === undefined
                    ? '已達頂'
                    : `→ ${t(next.nameKey)}　還差 ${Math.max(0, to - have)}`)}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 區塊三：隨身。空的時候整塊不出現 —— 空框只是噪音 ── */}
      {held.length === 0 ? null : (
        <div className="hud-held">
          {held.map((h) => (
            <span className="held-chip" key={String(h.itemId)} title={h.desc}>
              {`◆${h.name}`}
              {h.count > 1 ? <span className="ok">{`×${h.count}`}</span> : ''}
            </span>
          ))}
        </div>
      )}

      {/* ── 兩個入口 ── */}
      {onLearn === undefined && onVault === undefined ? null : (
        <div className="hud-acts">
          {onLearn === undefined ? null : (
            <button className={totalExp > 0 ? 'primary' : ''} onClick={onLearn}>
              {`能力提升${totalExp > 0 ? `（${totalExp}）` : ''}`}
            </button>
          )}
          {onVault === undefined ? null : (
            <button onClick={onVault}>{`府庫（${held.length}）`}</button>
          )}
        </div>
      )}

      {/* 陣容：好感階是【他多常傳令】（33 §4.3），所以它一直要看得到。 */}
      <div className="hud-roster">
        {st.roster.members.map((m) => {
          const nd = defs.reader('notable').get(String(m.notableId));
          return (
            <span key={String(m.notableId)}>
              {t(nd.nameKey)}
              <b>{` ${t(`stage.${stageOf(m.notableId, s.ctx)}`)}`}</b>
              <span className="mono dim">{` ${m.affinity}`}</span>
              {m.origin === 'superior' ? <span className="dim"> ·上司</span> : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
