import { useEffect, useMemo, useRef, useState } from 'react';
import type { BattleLogEntry } from '../contracts/core/state.js';
import type { SkillKind } from '../contracts/core/primitives.js';
import { t } from '../app/bootstrap.js';

/**
 * 戰鬥演出（D67）★★ —— 同一份結果的第二種呈現，**不是第二套戰鬥**
 *
 * ── 唯一的紅線：這裡【不算任何東西】 ★ ────────────────
 * `campaign.engage()` 已經把整關算完，並回傳完整的逐回合 `log`。
 * 演出做的事只有一件：**把那份 log 依時間播出來**。
 *
 * 為什麼這條不能破：模擬器（`npm run sim`／`calibrate`／`pacing`）跑的是
 * 同一個 `engage`。演出若自己再算一次，**我校準的數值就不等於玩家看到的數值**
 * —— 那是平衡工作整個作廢的路徑，而且它會安靜地發生（兩邊各自都「看起來對」）。
 *
 * 所以這個檔案裡沒有 RNG、沒有傷害公式、沒有規則判斷。
 * 它只有：游標、計時器、和把一條 log 畫成畫面的函式。
 *
 * ── 資料夠不夠演 ─────────────────────────────────
 * `BattleLogEntry` 每一條都帶著演出需要的全部東西：
 *   turn      第幾回合        → 回合旗
 *   actor     我／傳令／敵    → 往哪邊撞
 *   actorKey  誰              → 名字
 *   skillKey  放了什麼招      → 招名橫幅
 *   kind      招的性質        → 顏色與特效
 *   amount    多少            → 飄出來的數字
 *   troopsAfter / enemyAfter  → 兩條軍勢條的即時值
 *
 * 【不需要】為了演出去改 ㉝ 的任何一行 —— 戰報本來就是為了讓玩家讀懂而存在的
 * （33 §7），演出只是把它從「一頁文字」變成「一段時間」。
 */

/**
 * 播一關需要的全部東西 ★ **它住在 App 而不是 ScreenCampaign**
 *
 * 因為戰敗時 `engage()` 會收掉戰役（D54 的收尾），`needsCampaign` 立刻變 false，
 * ScreenCampaign 當場卸載 —— 而**戰敗正是最該看的那一關**。
 * 所以演出的資料要抓在戰役畫面之上，它才活得過那一刻。
 */
export interface ReplayData {
  readonly log: readonly BattleLogEntry[];
  readonly troopsMax: number;
  readonly enemyMax: number;
  /** 開打前的我軍軍勢 —— 第一條 log 之前要先站在這個數字上。 */
  readonly startTroops: number;
  readonly stageLabel: string;
  readonly enemyLabel: string;
  readonly cleared: boolean;
  readonly defeated: boolean;
}

type Props = ReplayData & { readonly onDone: () => void };

/** 一拍的長度。速度鈕除它 —— 七關全清約四百拍，所以【跳過】是必需品不是裝飾。 */
const BEAT_MS = 460; // 呈現參數：動畫節拍，不影響任何結算

const KIND_TONE: Record<SkillKind, string> = {
  physical: '#ff8a6a',
  magic: '#b48aff',
  heal: '#8fd18f',
  buff: '#ffd479',
  debuff: '#6ad0d0',
};

/** 敵方的基本攻擊沒有 skillKey，也要有顏色 —— 否則每回合最痛的那一下是灰的。 */
const toneOf = (e: BattleLogEntry): string =>
  (e.kind === null ? (e.actor === 'enemy' ? '#ff6b6b' : '#9aa4b2') : KIND_TONE[e.kind]);

/** 治療與增益不該讓對面掉血 —— 撞不撞由招的性質決定。 */
const isStrike = (e: BattleLogEntry): boolean =>
  e.kind !== 'heal' && e.kind !== 'buff';

/**
 * 一側的軍勢 ★ 用【格子】不用純長條
 *
 * 長條讀得出比例，讀不出「還剩多少人」。十六格的兵陣一格一格熄掉，
 * 「對撞」才有東西可以撞 —— 那正是使用者要的「兩邊人的對撞」。
 */
function Host({ now, max, tone, side, lunge, label, sub }: {
  readonly now: number; readonly max: number; readonly tone: string;
  readonly side: 'left' | 'right'; readonly lunge: boolean;
  readonly label: string; readonly sub: string;
}): React.ReactElement {
  const CELLS = 16; // 呈現參數：兵陣畫幾格
  const lit = Math.ceil((Math.max(0, now) / Math.max(1, max)) * CELLS);
  /*
    ★ 兩軍都【貼著中線】站，往外側減員。
    第一版把亮起的格子放在各自的外側，於是兵一少中間就裂開一個洞 ——
    看起來像兩軍脫離接觸，而這個畫面要演的正好相反：陣線還在，是後排在薄。
    左軍的中線在右邊、右軍的中線在左邊，所以兩邊的判斷式是相反的。
  */
  const on = (i: number): boolean => (side === 'left' ? i >= CELLS - lit : i < lit);
  return (
    <div className={`bt-side bt-${side}${lunge ? ' bt-lunge' : ''}`}>
      <div className="bt-name">{label}</div>
      <div className="bt-rank">
        {Array.from({ length: CELLS }, (_, i) => i).map((i) => (
          <span
            key={i}
            className={`bt-unit${on(i) ? ' on' : ''}`}
            style={on(i) ? { background: tone } : undefined}
          />
        ))}
      </div>
      <div className="mono bt-num">{sub}</div>
    </div>
  );
}

export function BattleTheater({
  log, troopsMax, enemyMax, startTroops, stageLabel, enemyLabel,
  cleared, defeated, onDone,
}: Props): React.ReactElement {
  /** 游標 ＝ 已經播到第幾條。−1 ＝ 還沒開打（兩軍站定，數字是開打前的）。 */
  const [at, setAt] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const endRef = useRef<HTMLDivElement | null>(null);

  const done = at >= log.length - 1;

  useEffect(() => {
    if (!playing || done) return undefined;
    const id = window.setTimeout(() => { setAt((n) => n + 1); }, BEAT_MS / speed);
    return () => { window.clearTimeout(id); };
  }, [at, playing, speed, done]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [at]);

  const cur = at >= 0 ? log[at] ?? null : null;
  const prev = at > 0 ? log[at - 1] ?? null : null;
  const troops = cur?.troopsAfter ?? startTroops;
  const enemy = cur?.enemyAfter ?? enemyMax;
  const turn = cur?.turn ?? 0;
  // 回合換了就掛旗。第一條 log 也算換 —— 它是第 1 回合的開始。
  const newTurn = cur !== null && (prev === null || prev.turn !== cur.turn);

  /** 最近三條，倒著長。演出在動的時候，文字戰報是【對照】不是主角。 */
  const tail = useMemo(
    () => log.slice(Math.max(0, at - 2), at + 1),
    [log, at],
  );

  const tone = cur === null ? '#9aa4b2' : toneOf(cur);
  const hostActs = cur !== null && cur.actor !== 'enemy';
  const strike = cur !== null && isStrike(cur);

  return (
    <div className="bt-wrap">
      <div className="bt-head">
        <b>{stageLabel}</b>
        <span className={`bt-turn${newTurn ? ' flash' : ''}`}>
          {turn === 0 ? '兩軍對峙' : `第 ${turn} 回合`}
        </span>
      </div>

      <div className="bt-field">
        <Host
          side="left"
          label="我軍"
          tone="#7ea6ff"
          now={troops}
          max={troopsMax}
          lunge={hostActs && strike}
          sub={`${Math.max(0, troops)} / ${troopsMax}`}
        />

        {/*
          中央 ＝ 撞擊點。招名、性質、數字全部出現在這裡，
          因為玩家的眼睛在兩軍中間 —— 訊息放在別處就要移開視線去找。
        */}
        <div className="bt-mid">
          {cur === null ? (
            <div className="sub">按下播放，這一關開始。</div>
          ) : (
            <div className="bt-hit" key={at}>
              <div className="bt-who">
                {cur.actor === 'enemy' ? '敵' : (cur.actor === 'commander' ? '傳令' : '主將')}
                {cur.actorKey === null ? '' : `　${t(cur.actorKey)}`}
              </div>
              {cur.skillKey === null ? null : (
                <div className="bt-skill" style={{ color: tone, borderColor: tone }}>
                  {`〈${t(cur.skillKey)}〉`}
                </div>
              )}
              <div className="bt-amount" style={{ color: tone }}>
                {cur.kind === 'heal' ? '＋' : (strike ? '−' : '')}
                {cur.amount}
                <span className="bt-kind">
                  {cur.kind === null ? '' : t(`skillKind.${cur.kind}`)}
                </span>
              </div>
              {cur.why.length === 0 ? null : (
                <div className="sub bt-why">{cur.why.join('・')}</div>
              )}
            </div>
          )}
        </div>

        <Host
          side="right"
          label={enemyLabel}
          tone="#ff6b6b"
          now={enemy}
          max={enemyMax}
          lunge={cur?.actor === 'enemy' && strike}
          sub={`${Math.max(0, enemy)} / ${enemyMax}`}
        />
      </div>

      {/*
        文字戰報留著，而且【留在演出下面】而不是取代它 ——
        演出負責「發生了什麼」，文字負責「為什麼是這個數字」。
        兩者要能對照，所以只顯示最近三條，跟著游標走。
      */}
      <div className="bt-tail">
        {tail.map((e, i) => (
          <div key={`${e.turn}-${at - tail.length + 1 + i}`} className="mono">
            {`R${e.turn} `}
            {e.actor === 'enemy' ? '敵 ' : (e.actor === 'commander' ? '令 ' : '我 ')}
            {e.actorKey === null ? '' : `${t(e.actorKey)} `}
            {e.skillKey === null ? '' : `〈${t(e.skillKey)}〉`}
            {` ${e.amount}`}
            {`　軍勢 ${e.troopsAfter}　敵 ${e.enemyAfter}`}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="row bt-ctl">
        <button onClick={() => { setPlaying((v) => !v); }} disabled={done}>
          {playing ? '暫停' : '播放'}
        </button>
        <button
          onClick={() => { setAt((n) => Math.min(log.length - 1, n + 1)); }}
          disabled={done}
        >
          下一拍
        </button>
        {[1, 2, 4, 8].map((x) => (
          <button
            key={x}
            className={speed === x ? 'sel' : ''}
            onClick={() => { setSpeed(x); }}
          >
            {`${x}×`}
          </button>
        ))}
        <button onClick={() => { setAt(log.length - 1); setPlaying(false); }} disabled={done}>
          跳到結果
        </button>
      </div>

      {!done ? null : (
        <div className="bt-end">
          <b className={defeated ? 'warn' : 'ok'}>
            {defeated ? '此關戰敗 —— 已保住的獎勵剩一半' : (cleared ? '此關通過' : '此關結束')}
          </b>
          <button className="primary" onClick={onDone}>回到戰役</button>
        </div>
      )}
    </div>
  );
}
