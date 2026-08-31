import type { Session } from '../app/session.js';
import type { AttrGain, EventOffer, MeritGain } from '../contracts/core/state.js';
import type { SlotIndex } from '../contracts/core/primitives.js';
import { SLOT_INDICES } from '../contracts/core/primitives.js';
import { baseOf, defs, stageOf, t } from '../app/bootstrap.js';
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

const merits = (list: readonly MeritGain[]): string => (list.length === 0 ? ''
  : list.map((m) => `${t(`merit.${m.line}`)}+${m.amount}`).join(' '));

const stars = (n: number): string => '★'.repeat(n);

/**
 * 一個回合三拍，畫面只問一個問題（15 §3）：
 *
 *   pendingEvent === null → 四個固定事件，玩家選一個
 *   pendingEvent !== null → 那一則事件，玩家選怎麼度過
 *
 * 委託與人物事件共用同一段呈現 —— 追加一種事件來源不需要在這裡多長一個分支。
 */
export function ScreenRun({ s, bump, log, onLog }: Props): React.ReactElement {
  const st = s.current;
  const chapter = defs.reader('chapter').get(String(st.progress.chapterId));
  const turnNo = st.progress.turn;
  const pending = s.pendingEvent;

  const stamp = (line: string): void => { onLog(`R${String(turnNo).padStart(2, ' ')} ${line}`); };

  /** 拍一：選固定事件。旗標為真的那幾拍會依序跳出來，因此畫面可能換兩次。 */
  const pickSlot = (i: SlotIndex): void => {
    s.selectSlot(i);
    const r = s.current.turn.training;
    if (r !== null) {
      stamp(`【${t(`attr.${r.attr}.${st.progress.phase}.label`)}】`
        + `${t(`glow.${r.finalGlow}`)}${r.upgraded ? '⬆' : ''}`
        + ` ${t(`attr.${r.attr}.short`)}+${r.attrGained}`
        + `　${t(`merit.${r.meritGained.line}`)}+${r.meritGained.amount}`);
    }
    bump();
  };

  /** 拍二／拍三：選處理方式。佇列可能還有下一拍，所以推進要問 canAdvance。 */
  const pickOption = (offer: EventOffer, optionIndex: number, title: string, label: string): void => {
    s.resolveEvent(optionIndex);
    const r = s.current.turn.resolved.at(-1);
    if (r !== undefined) {
      // 道具用 ◆ 標，重複獲得再加一個 ° —— 重複才產碎片（23 §5）。
      const loot = r.itemsGained.length === 0 ? '' : `　◆${r.itemsGained.map(
        (g) => `${t(defs.reader('item').get(String(g.itemId)).nameKey)}${g.duplicate ? '°' : ''}`,
      ).join(' ')}`;
      stamp(`${title}·${label} ${r.passed ? '成' : '敗'}`
        + `　${gains(r.practiceGained)}　${merits(r.meritGained)}${loot}`);
    }
    void offer;
    if (s.canAdvance()) s.advance();
    bump();
  };

  return (
    <>
      <h1>{t(chapter.titleKey)}</h1>
      <p className="sub mono">
        {`第 ${turnNo} 回合　章內 ${st.progress.turnInChapter}/${chapter.length}`}
        {`　${st.faction === null
          ? t(`phase.${st.progress.phase}`)
          : t(defs.reader('faction').get(String(st.faction)).nameKey)}`}
      </p>
      <StatusBar s={s} />

      {pending === null ? (
        <>
          <h2>本回合 · 四選一</h2>
          <p className="sub" style={{ margin: '-4px 0 12px' }}>
            四件事一起讀：光階、誰站在這格、有沒有委託❗、有沒有人物事件❕。
            數字是【保底】—— 升階是選完之後的事。
          </p>
          <div className="grid4">
            {SLOT_INDICES.map((i) => {
              const slot = st.turn.slots[i];
              if (slot === undefined) return null;
              const pv = s.previewTraining(i);
              return (
                <button key={i} className="card" onClick={() => { pickSlot(i); }}>
                  <h3>{t(slot.labelKey)}</h3>
                  <div className="sub">{t(slot.subtitleKey)}</div>
                  <div className={`glow g-${slot.baseGlow}`}>{t(`glow.${slot.baseGlow}`)}</div>
                  {/* 【直接寫最後給的數值】—— 名士倍率已經算進去了。再寫一個
                      ×N.NN 只是把同一件事說兩遍；升階率也不顯示 —— 它是選完之後
                      的那一下驚喜，先講機率反而把它變成一個要計算的東西。 */}
                  <div className="rate mono big">
                    {`${t(`attr.${slot.attr}.short`)} +${pv.expectedGain}`}
                  </div>
                  <div className="rate mono">
                    {`${t(`merit.${pv.meritGain.line}`)}+${pv.meritGain.amount}`}
                  </div>
                  {/* 兩種驚嘆號：一個給委託、一個給人物事件。兩個都亮、又是金光
                      以上、還有人站 —— 那就是那一回合的高光（15 §3.3）。 */}
                  <div className="flags mono">
                    {pv.hasCommission ? <span className="f-comm">❗委託</span> : null}
                    {pv.hasEncounter ? <span className="f-enc">❕人物</span> : null}
                  </div>
                  <div className="peo">
                    {slot.notables.length === 0 ? '—' : slot.notables.map((n) => {
                      const nd = defs.reader('notable').get(String(n));
                      const base = baseOf(n, s.ctx);
                      return (
                        <span key={String(n)} className={base.specialty === slot.attr ? 'fit' : ''}>
                          {`👤${t(nd.nameKey)}·${t(`stage.${stageOf(n, s.ctx)}`)}　`}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <PendingPanel s={s} offer={pending} onPick={pickOption} />
      )}

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

interface PendingProps {
  readonly s: Session;
  readonly offer: EventOffer;
  readonly onPick: (offer: EventOffer, optionIndex: number, title: string, label: string) => void;
}

function PendingPanel({ s, offer, onPick }: PendingProps): React.ReactElement {
  const def = defs.reader('event').get(String(offer.eventDefId));
  const title = t(def.titleKey);
  const isNotable = def.trigger.kind === 'notable';
  const remaining = s.current.turn.pending.length;

  return (
    <>
      <h2>{isNotable ? '人物事件 · 擇一應對' : '委託 · 擇一應對'}</h2>
      <p className="sub" style={{ margin: '-4px 0 12px' }}>
        {`稀有度 ${stars(offer.rarity)}`}
        {remaining > 1 ? `　（本回合還有 ${remaining - 1} 件待處理）` : ''}
      </p>
      <div className="card">
        <h3>{title}</h3>
        <div className="body">{fill(t(def.bodyKey), offer.params)}</div>
        {/* 三檔照 low → mid → high 排。檔次標籤直接印出來 ——
            「高條件高報酬」是設計承諾，玩家得看得到它才成立（17 §5）。 */}
        <div className="row">
          {def.options.map((opt, ii) => {
            const stt = offer.optionStates[ii];
            if (stt === undefined) return null;
            const label = t(opt.labelKey);
            return (
              <button
                key={ii}
                className={stt.tier === 'high' ? 'sel' : ''}
                disabled={!stt.enabled}
                onClick={() => { onPick(offer, ii, title, label); }}
              >
                {stt.tier === 'story' ? label : `[${t(`optionTier.${stt.tier}`)}] ${label}`}
                <span className="rate mono">
                  {stt.enabled
                    ? `${stt.successRate === null ? '' : ` ${(stt.successRate * 100).toFixed(0)}%`}`
                      + `${merits(stt.meritPreview) === '' ? '' : ` ${merits(stt.meritPreview)}`}`
                      + ` ${gains(stt.practicePreview)}`
                    : ' 官階不足'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
