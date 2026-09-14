import { EventDialogue } from './EventDialogue.js';
import { eventRewardLines, type EventReceipt } from './event-receipt.js';
import { NotableDetail } from './NotableDetail.js';
import {
  careerPresentation,
  THEATER_DURATION,
  type CareerPresentation,
} from './career-presentation.js';
import { CareerHero, preloadCareerTheater } from './CareerTheater.js';
import { Journal } from './Journal.js';
import { Participants } from './Participants.js';
import { CaocaoRig } from './CaocaoRig.js';
import { CharacterArt } from './CharacterArt.js';
import { useEffect, useRef, useState } from 'react';
import { captureGrowth, type GrowthView } from './Hud.js';
import { TaskPerformance } from './TaskPerformance.js';
import type { Session } from '../app/session.js';
import type {
  AttributeGain,
  EventOffer,
  MeritGain,
} from '../contracts/core/state.js';
import type { SlotIndex } from '../contracts/core/primitives.js';

import { defs, t } from '../app/bootstrap.js';
import { Hud } from './Hud.js';

interface Props {
  readonly concealed?: boolean;
  readonly s: Session;
  readonly bump: () => void;
  readonly log: readonly string[];
  readonly onLog: (line: string) => void;
  /** 兩個側畫面的入口。都【不佔行動】，所以放在 HUD 上而不是回合流程裡。 */
  readonly onLearn: () => void;
  readonly onVault: () => void;
}

const gains = (list: readonly AttributeGain[]): string =>
  list.length === 0
    ? '—'
    : list.map((g) => `${t(`attr.${g.attr}.short`)}經驗+${Math.round(g.amount*100)}`).join(' ');

const merits = (list: readonly MeritGain[]): string =>
  list.length === 0
    ? ''
    : list.map((m) => `${t(`merit.${m.line}`)}+${m.amount}`).join(' ');

/**
 * 一個回合三拍，畫面只問一個問題（15 §3）：
 *
 *   pendingEvent === null → 四個固定事件，玩家選一個
 *   pendingEvent !== null → 那一則事件，玩家選怎麼度過
 *
 * 委託與人物事件共用同一段呈現 —— 追加一種事件來源不需要在這裡多長一個分支。
 */
export function ScreenRun({
  s,
  bump,
  log,
  onLog,
  onLearn,
  onVault,
  concealed = false,
}: Props): React.ReactElement {
  const [receipt, setReceipt] = useState<EventReceipt | null>(null);
  const [selected, setSelected] = useState<SlotIndex>(0);
  const [journal, setJournal] = useState(false);
  const journalTrigger = useRef<HTMLButtonElement>(null);
  const closeJournal = (): void => {
    setJournal(false);
    requestAnimationFrame(() => journalTrigger.current?.focus());
  };
  const [inspect, setInspect] = useState<string | null>(null);
  useEffect(() => {
    if (concealed) { setJournal(false); setInspect(null); }
  }, [concealed]);
  const [performance, setPerformance] = useState<{
    profile: CareerPresentation;
    onReady: () => void;
  } | null>(null);
  const [animating, setAnimating] = useState(false);
  const [growth, setGrowth] = useState<GrowthView | undefined>();
  const busy = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deferredLog = useRef<string[]>([]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!animating) return;
    const nodes = document.querySelectorAll<HTMLElement>(
      '.game-top,.game-bottom,.run-screen > :not(.task-performance)',
    );
    nodes.forEach((n) => {
      n.inert = true;
    });
    return () =>
      nodes.forEach((n) => {
        n.inert = false;
      });
  }, [animating]);
  const st = s.current;
  const chapter = defs.reader('chapter').get(String(st.progress.chapterId));
  const turnNo = st.progress.turn;
  const pending = s.pendingEvent;
  const activeIndex =
    st.turn.selected ?? (st.turn.slots[selected] ? selected : 0);
  const activeSlot = st.turn.slots[activeIndex];
  const activeProfile = careerPresentation(
    activeSlot?.attr ?? 'lead',
    st.career,
  );
  useEffect(() => {
    void preloadCareerTheater(activeProfile.tier).catch(() => {});
  }, [activeProfile.tier]);
  const trainingPreview = activeSlot ? s.previewTraining(activeIndex) : null;
  const companions = (activeSlot?.notables ?? []).map((id, order) => ({
    id,
    order,
    name: t(defs.reader('notable').get(String(id)).nameKey),
    affinity: st.roster.members.find(member => member.notableId === id)?.affinity ?? 0,
  })).sort((a, b) => b.affinity - a.affinity || a.order - b.order);
  useEffect(() => setSelected(0), [turnNo]);
  useEffect(() => {
    if (s.canAdvance()) {
      s.advance();
      bump();
    }
  }, [s]);
  const eventDef = pending
    ? defs.reader('event').get(String(pending.eventDefId))
    : null;

  const stamp = (line: string): void => {
    const entry = `R${String(turnNo).padStart(2, ' ')} ${line}`;
    if (busy.current) deferredLog.current.push(entry);
    else onLog(entry);
  };

  /**
   * 每一個動作的收尾（15 §3.4）★
   *
   * 【兩個進入點都必須經過它】。委託改成機率觸發之後，一個回合可能在
   * 「選完固定事件」那一刻就結束了 —— 那條路徑完全不經過 pickOption。
   *
   * 舊版只在 pickOption 裡推進，因為舊制的委託必定觸發，選完格子一定
   * 還有事要處理。改成機率之後那個假設不成立了：沒有旗標的回合會停在
   * 「已行動但沒推進」，畫面看起來完全沒變（同一批格子、同一個回合數），
   * 而下一次點擊會撞上 assertActable 丟例外，整個凍住。
   *
   * 抽成一個函式而不是在兩處各寫一行：這條規則只有一份，就不會再漏掉第三處。
   */
  const settle = (): void => {
    if (s.canAdvance()) s.advance();
    bump();
  };

  /** 拍一：選固定事件。旗標為真的那幾拍會依序跳出來，因此畫面可能換兩次。 */
  const pickSlot = (i: SlotIndex): void => {
    if (busy.current) return;
    const slot = s.current.turn.slots[i];
    if (!slot) return;
    busy.current = true;
    const initial = captureGrowth(s);
    const profile = careerPresentation(slot.attr, s.current.career);
    setGrowth(initial);
    setAnimating(true);
    const before = { ...s.current.attributes.values };
    s.selectSlot(i);
    const r = s.current.turn.training;
    // 先讀結果再推進 —— advance 會清掉 turn.training。
    if (r !== null) {
      /*
        同格共事教了什麼，要【寫在回合紀錄裡】（D63）。
        解鎖是一件發生過的事，不是一個狀態 —— 沒有這一行，
        玩家只會發現選單裡莫名其妙多了一項，不知道是誰給的。
      */
      const taught = s
        .taughtThisTurn()
        .map((x) => {
          const who = t(
            defs.reader('notable').get(String(x.notableId)).nameKey,
          );
          const what =
            x.skill !== null
              ? t(defs.reader('skill').get(String(x.skill)).nameKey)
              : x.trait === null
                ? ''
                : t(defs.reader('trait').get(String(x.trait)).nameKey);
          return what === '' ? '' : `　✎${who}教了〈${what}〉`;
        })
        .join('');
      const growth = s.current.attributes.values[r.attr] - before[r.attr];
      stamp(
        `【${profile.label}・${profile.action}】` +
          `${t(`glow.${r.finalGlow}`)}${r.upgraded ? '⬆' : ''}` +
          ` ${t(`attr.${r.attr}.short`)}經驗+${Math.round(r.growthGained*100)} · 薪水+${r.salary}` +
          `　${t(`merit.${r.meritGained.line}`)}+${r.meritGained.amount}${taught}`,
      );
    }
    let started = false;
    const onReady = (): void => {
      if (started) return;
      started = true;
      timer.current = setTimeout(() => {
        setPerformance(null);
        setAnimating(false);
        setGrowth(undefined);
        busy.current = false;
        for (const line of deferredLog.current) onLog(line);
        deferredLog.current = [];
        settle();
      }, THEATER_DURATION);
    };
    setPerformance({ profile, onReady });
  };

  /** 拍二／拍三：選處理方式。佇列可能還有下一拍，所以推進要問 canAdvance。 */
  const pickOption = (optionIndex: number): EventReceipt => {
    if (busy.current || !pending) throw new Error('事件正在處理中');
    busy.current = true;
    const before = s.current,
      offer = pending,
      title = t(eventDef!.titleKey),
      label = t(eventDef!.options[optionIndex]!.labelKey);
    s.resolveEvent(optionIndex);
    const r = s.current.turn.resolved.at(-1);
    if (r !== undefined) {
      // 道具用 ◆ 標，重複獲得再加一個 ° —— 重複才產碎片（23 §5）。
      const loot =
        r.itemsGained.length === 0
          ? ''
          : `　◆${r.itemsGained
              .map(
                (g) =>
                  `${t(defs.reader('item').get(String(g.itemId)).nameKey)}${g.duplicate ? '°' : ''}`,
              )
              .join(' ')}`;
      stamp(
        `${title}·${label} ${r.passed ? '成' : '敗'}` +
          `　${gains(r.practiceGrowth)}　${merits(r.meritGained)} · 薪水+${r.salary ?? 0}${loot}${r.resultKey ? ' · ' + t(r.resultKey) : ''}`,
      );
    }
    if (!r) throw new Error('事件沒有結算結果');
    const next = {
      offer,
      result: r,
      lines: eventRewardLines(before, s.current, r, defs),
    };
    setReceipt(next);
    bump();
    return next;
  };

  const finishDialogue = (): void => {
    setReceipt(null);
    busy.current = false;
    for (const line of deferredLog.current) onLog(line);
    deferredLog.current = [];
    settle();
  };
  const dialogueOffer = receipt?.offer ?? pending;
  return (
    <div
      inert={concealed}
      aria-hidden={concealed || undefined}
      className={`run-screen ${concealed ? 'utility-open' : ''} ${!animating && dialogueOffer ? 'dialogue-playing' : ''} ${animating ? 'is-performing' : ''} ${performance ? 'task-playing' : animating ? 'task-growth' : ''}`}
    >
      <Hud
        s={s}
        growth={growth}
        preview={
          animating
            ? undefined
            : pending
              ? undefined
              : activeSlot && trainingPreview
                ? { [activeSlot.attr]: trainingPreview.expectedGain }
                : undefined
        }
      />
      {performance && <TaskPerformance {...performance} />}
      <div className="training-stage" aria-label="行動人物預覽">
        <div className="training-ink" />
        <div className="training-hero">
          <CareerHero profile={activeProfile} />
        </div>
        {companions.map((companion, i) => {
          // Affinity order fills the V from front to back, alternating left and right.
          const row = Math.floor(i / 2);
          const depth = row * 2 / Math.max(2, Math.ceil(companions.length / 2) - 1);
          const side = i % 2 === 0 ? -1 : 1;
          const spread = 145 + 65 * depth - 15 * depth * depth;
          const scale = .78 - depth * .11;
          const width = 330 * scale;
          const height = 475 * scale;
          const feet = 500 - depth * 125;
          return <div className="training-partner" key={String(companion.id)}
            data-affinity={companion.affinity} data-depth={row + 1} data-position={i + 2}
            aria-label={`${companion.name} · 好感 ${companion.affinity} · 站位 ${i + 2} · 後方第 ${row + 1} 排${side < 0 ? '左側' : '右側'}`}
            style={{left:389 + side * spread - width / 2, top:feet - height,
              width, height, zIndex:20 - i}}>
            {companion.name === '曹操'
              ? <CaocaoRig motion={selected === 0 ? 'command' : 'idle'} />
              : <CharacterArt name={companion.name} />}
          </div>;
        })}
      </div>
      <Participants s={s} index={selected} onInspect={setInspect} concealed={Boolean(dialogueOffer) || concealed || animating}/>
      <button
        ref={journalTrigger}
        className="journal-toggle"
        aria-label="行旅手記"
        title="行旅手記"
        onClick={() => setJournal(true)}
      >
        <span className="journal-art-icon" aria-hidden="true" />
      </button>
      {!animating && dialogueOffer ? (
        <EventDialogue
          key={String(dialogueOffer.eventDefId)}
          s={s}
          offer={dialogueOffer}
          receipt={receipt}
          profile={activeProfile}
          onResolve={pickOption}
          onFinish={finishDialogue}
        />
      ) : pending === null && !receipt ? (
        <ActionDock
          s={s}
          onPick={pickSlot}
          selected={selected}
          onPreview={setSelected}
        />
      ) : null}
      {journal && <Journal entries={log} onClose={closeJournal} />}
      {inspect && (
        <NotableDetail
          onChange={bump}
          s={s}
          id={inspect}
          onClose={() => {
            setInspect(null);
            bump();
          }}
          onLearn={() => {
            setInspect(null);
            onLearn();
          }}
        />
      )}
    </div>
  );
}

import { ActionDock } from './ActionDock.js';
