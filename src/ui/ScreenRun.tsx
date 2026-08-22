import type { Session } from '../app/session.js';
import type { AttrGain } from '../contracts/core/state.js';
import type { SlotIndex } from '../contracts/core/primitives.js';
import { SLOT_INDICES } from '../contracts/core/primitives.js';
import { baseOf, defs, notableSlotBonus, stageOf, t } from '../app/bootstrap.js';
import { StatusBar } from './StatusBar.js';

interface Props {
  readonly s: Session;
  readonly bump: () => void;
  readonly log: readonly string[];
  readonly onLog: (line: string) => void;
}

const fill = (body: string, params: Readonly<Record<string, unknown>>): string =>
  body.replace(/\{(\w+)\}/g, (_, k: string) => t(params[k]));

const gains = (list: readonly AttrGain[]): string => (list.length === 0 ? '—'
  : list.map((g) => `${t(`attr.${g.attr}.short`)}+${g.amount}`).join(' '));

/**
 * 單動作回合：鍛鍊四格與事件排在同一個選單裡，點一下即結算並推進（15 §2）。
 *
 * 「選完就跳」讓上一回合的結果沒有畫面可以停留，所以結果改寫進回合紀錄
 * 由 App 持有 —— 那樣它能跨過大檢定畫面存活，玩家不會漏掉最後一次行動的收穫。
 */
export function ScreenRun({ s, bump, log, onLog }: Props): React.ReactElement {
  const st = s.current;
  const chapter = defs.reader('chapter').get(String(st.progress.chapterId));
  const turnNo = st.progress.turn;

  /** 行動 → 記錄 → 推進。三步綁在一起，因為它們就是「一個回合」。 */
  const act = (run: () => string): void => {
    onLog(`R${String(turnNo).padStart(2, ' ')} ${run()}`);
    s.advance();
    bump();
  };

  const doTraining = (i: SlotIndex): void => {
    act(() => {
      s.selectTraining(i);
      const r = s.current.slots.training.result;
      if (r === null) return '鍛鍊';
      return `${t(`glow.${r.finalGlow}`)}${r.upgraded ? '⬆' : ''}`
        + ` ${t(`attr.${r.attr}.short`)}+${r.attrGained}`;
    });
  };

  const doEvent = (oi: number, ii: number, title: string, label: string): void => {
    act(() => {
      const out = s.selectEvent(oi, ii);
      return `${title}·${label} ${out.passed ? '成' : '敗'}　${gains(out.practiceGained)}`;
    });
  };

  return (
    <>
      <h1>{t(chapter.titleKey)}</h1>
      <p className="sub mono">
        {`第 ${turnNo} 回合　章內 ${st.progress.turnInChapter}/${chapter.length}`}
        {st.faction === null ? '　南華村篇' : `　${t(defs.reader('faction').get(String(st.faction)).nameKey)}`}
        {`　已練 ${st.actions.training} ／ 已辦 ${st.actions.event}`}
      </p>
      <StatusBar s={s} />

      <h2>本回合行動 · 擇一</h2>
      <p className="sub" style={{ margin: '-4px 0 12px' }}>
        鍛鍊與事件共用同一個回合。選了任一項，本回合即結束。
      </p>

      <div className="grid2">
        <div>
          <h3 className="lane">鍛鍊 · 練得多，但只長能力</h3>
          <div className="grid4">
            {SLOT_INDICES.map((i) => {
              const slot = st.slots.training.slots[i];
              if (slot === undefined) return null;
              const pv = s.previewTraining(i);
              return (
                <button
                  key={i}
                  className="card"
                  onClick={() => { doTraining(i); }}
                >
                  <h3>{t(slot.labelKey)}</h3>
                  <div className={`glow g-${slot.baseGlow}`}>{t(`glow.${slot.baseGlow}`)}</div>
                  <div className="rate mono">
                    {`${t(`attr.${slot.attr}.short`)}≈${pv.expectedGain}`}
                    {`　升階 ${(pv.upgradeChance * 100).toFixed(0)}%`}
                  </div>
                  {/* 名士相乘的總倍率。全員擠進一格是本作的爆發時刻 ——
                      看不到的爆發不是爆發，所以倍率越高就越搶眼（19 §5.2）。 */}
                  {pv.notableMultiplier > 1 && (
                    <div className={`mul mono${pv.notableMultiplier >= 2 ? ' big' : ''}`}>
                      {`×${pv.notableMultiplier.toFixed(2)}`}
                      {slot.notables.length > 2 ? `　${slot.notables.length} 人同格！` : ''}
                    </div>
                  )}
                  <div className="peo">
                    {slot.notables.length === 0 ? '—' : slot.notables.map((n) => {
                      const nd = defs.reader('notable').get(String(n));
                      const base = baseOf(n, s.ctx);
                      const pct = notableSlotBonus(n, slot.attr, s.ctx) * 100;
                      // 名字 · 專長 · 交情 ＋ 這一格他實際加了多少。
                      // 少了最後那個數字，玩家仍然不知道「他站這裡」值多少（19 §5.1）。
                      return (
                        <span key={String(n)} className={base.specialty === slot.attr ? 'fit' : ''}>
                          {`${t(nd.nameKey)}·${t(`attr.${base.specialty}.short`)}`}
                          {`·${t(`stage.${stageOf(n, s.ctx)}`)} +${pct.toFixed(0)}%　`}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="lane">{`事件 · 名聲功績為主，順帶磨練（${st.slots.event.offers.length}）`}</h3>
          {st.slots.event.offers.length === 0 && (
            <p className="sub">沒有事件。名聲不足，還沒有人來找你 —— 本回合只能鍛鍊。</p>
          )}
          {st.slots.event.offers.map((o, oi) => {
            const def = defs.reader('event').get(String(o.eventDefId));
            const title = t(def.titleKey);
            return (
              <div className="card" key={String(o.eventDefId)} style={{ marginBottom: 8 }}>
                <h3>{title}</h3>
                <div className="body">{fill(t(def.bodyKey), o.params)}</div>
                <div className="row">
                  {def.options.map((opt, ii) => {
                    const stt = o.optionStates[ii];
                    if (stt === undefined) return null;
                    const label = t(opt.labelKey);
                    return (
                      <button
                        key={ii}
                        disabled={!stt.enabled}
                        onClick={() => { doEvent(oi, ii, title, label); }}
                      >
                        {label}
                        <span className="rate mono">
                          {stt.successRate !== null && ` ${(stt.successRate * 100).toFixed(0)}%`}
                          {` ${gains(stt.practicePreview)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h2>回合紀錄</h2>
      {log.length === 0
        ? <p className="sub">還沒有行動。</p>
        : (
          <div className="mono log">
            {log.map((line, i) => <div key={`${line}#${i}`} className={i === 0 ? 'ok' : ''}>{line}</div>)}
          </div>
        )}
    </>
  );
}
