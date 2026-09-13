import { NotableDetail } from './NotableDetail.js';
import { careerPresentation, THEATER_DURATION, type CareerPresentation } from './career-presentation.js';
import { CareerHero, preloadCareerTheater } from './CareerTheater.js';
import { Journal } from './Journal.js';
import { Participants } from './Participants.js';
import { CaocaoRig } from './CaocaoRig.js';
import { CharacterArt } from './CharacterArt.js';
import { useEffect, useRef, useState } from 'react';
import { captureGrowth, type GrowthView } from './Hud.js';
import { TaskPerformance } from './TaskPerformance.js';
import type { Attr } from '../contracts/core/primitives.js';
import type { Session } from '../app/session.js';
import type { ExpGain, EventOffer, MeritGain } from '../contracts/core/state.js';
import type { SlotIndex } from '../contracts/core/primitives.js';

import { defs, t } from '../app/bootstrap.js';
import { Hud } from './Hud.js';


interface Props {
  readonly s: Session;
  readonly bump: () => void;
  readonly log: readonly string[];
  readonly onLog: (line: string) => void;
  /** 兩個側畫面的入口。都【不佔行動】，所以放在 HUD 上而不是回合流程裡。 */
  readonly onLearn: () => void;
  readonly onVault: () => void;
}

const fill = (body: string, params: Readonly<Record<string, unknown>>): string =>
  body.replace(/\{(\w+)\}/g, (_, k: string) => t(params[k]));

const gains = (list: readonly ExpGain[]): string => (list.length === 0 ? '—'
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
export function ScreenRun({ s, bump, log, onLog, onLearn, onVault }: Props): React.ReactElement {
  const [optionPreview,setOptionPreview]=useState<Partial<Record<Attr,number>>|null>(null);
  const [selected,setSelected]=useState<SlotIndex>(0);
  const [journal, setJournal] = useState(false);
  const journalTrigger=useRef<HTMLButtonElement>(null);
  const closeJournal=():void=>{setJournal(false);requestAnimationFrame(()=>journalTrigger.current?.focus());};
  const [inspect, setInspect] = useState<string | null>(null);
  const [performance, setPerformance] = useState<{profile:CareerPresentation;onReady:()=>void}|null>(null);
  const [animating, setAnimating] = useState(false);
  const [growth, setGrowth] = useState<GrowthView|undefined>();
  const busy=useRef(false), timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const deferredLog=useRef<string[]>([]);
  useEffect(()=>()=>{clearTimeout(timer.current);},[]);
  useEffect(()=>{if(!animating)return;const nodes=document.querySelectorAll<HTMLElement>('.game-top,.game-bottom,.run-screen > :not(.task-performance)');nodes.forEach(n=>{n.inert=true;});return()=>nodes.forEach(n=>{n.inert=false;});},[animating]);
  const st = s.current;
  const chapter = defs.reader('chapter').get(String(st.progress.chapterId));
  const turnNo = st.progress.turn;
  const pending = s.pendingEvent;
  const activeIndex=st.turn.slots[selected]?selected:0;
  const activeSlot=st.turn.slots[activeIndex];
  const activeProfile=careerPresentation(activeSlot?.attr??'lead',st.career);
  useEffect(()=>{void preloadCareerTheater(activeProfile.tier).catch(()=>{});},[activeProfile.tier]);
  const trainingPreview=activeSlot?s.previewTraining(activeIndex):null;
  const partnerId=activeSlot?.notables[0];
  const partnerName=partnerId?t(defs.reader('notable').get(String(partnerId)).nameKey):null;
  useEffect(()=>setSelected(0),[turnNo]);
  useEffect(()=>setOptionPreview(null),[pending?.eventDefId]);
  const eventDef = pending ? defs.reader('event').get(String(pending.eventDefId)) : null;
  const speakerId = eventDef?.trigger.kind === 'notable' ? eventDef.trigger.cast[0]?.notableId : undefined;
  const speaker = speakerId ? t(defs.reader('notable').get(String(speakerId)).nameKey) : '軍吏';

  const stamp = (line: string): void => { const entry=`R${String(turnNo).padStart(2, ' ')} ${line}`; if(busy.current) deferredLog.current.push(entry); else onLog(entry); };

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
    if(busy.current)return;
    const slot=s.current.turn.slots[i]; if(!slot)return;
    busy.current=true;
    const initial=captureGrowth(s);
    const profile=careerPresentation(slot.attr,s.current.career);
    setGrowth(initial);setAnimating(true);
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
      const taught = s.taughtThisTurn().map((x) => {
        const who = t(defs.reader('notable').get(String(x.notableId)).nameKey);
        const what = x.skill !== null
          ? t(defs.reader('skill').get(String(x.skill)).nameKey)
          : (x.trait === null ? '' : t(defs.reader('trait').get(String(x.trait)).nameKey));
        return what === '' ? '' : `　✎${who}教了〈${what}〉`;
      }).join('');
      const growth = s.current.attributes.values[r.attr] - before[r.attr];
      stamp(`【${profile.label}・${profile.action}】`
        + `${t(`glow.${r.finalGlow}`)}${r.upgraded ? '⬆' : ''}`
        + ` ${t(`attr.${r.attr}.short`)}經驗+${r.expGained} · 學習點+${r.expGained}${growth > 0 ? ` · 能力+${growth}` : ''}`
        + `　${t(`merit.${r.meritGained.line}`)}+${r.meritGained.amount}${taught}`);
    }
    let started=false;
    const onReady=():void=>{
      if(started)return;started=true;
      timer.current=setTimeout(()=>{
        setPerformance(null);setAnimating(false);setGrowth(undefined);busy.current=false;
        for(const line of deferredLog.current)onLog(line);deferredLog.current=[];settle();
      },THEATER_DURATION);
    };
    setPerformance({profile,onReady});
  };

  /** 拍二／拍三：選處理方式。佇列可能還有下一拍，所以推進要問 canAdvance。 */
  const pickOption = (offer: EventOffer, optionIndex: number, title: string, label: string): void => {
    setOptionPreview(null);
    s.resolveEvent(optionIndex);
    const r = s.current.turn.resolved.at(-1);
    if (r !== undefined) {
      // 道具用 ◆ 標，重複獲得再加一個 ° —— 重複才產碎片（23 §5）。
      const loot = r.itemsGained.length === 0 ? '' : `　◆${r.itemsGained.map(
        (g) => `${t(defs.reader('item').get(String(g.itemId)).nameKey)}${g.duplicate ? '°' : ''}`,
      ).join(' ')}`;
      stamp(`${title}·${label} ${r.passed ? '成' : '敗'}`
        + `　${gains(r.practiceExp)}　${merits(r.meritGained)}${loot}`);
    }
    void offer;
    settle();
  };

  return <div className={`run-screen ${animating?'is-performing':''} ${performance?'task-playing':animating?'task-growth':''}`}>
    <Hud s={s} growth={growth} preview={animating?undefined:pending?optionPreview??undefined:activeSlot&&trainingPreview?{[activeSlot.attr]:trainingPreview.expectedGain}:undefined} />
    {performance && <TaskPerformance {...performance}/>}
    <div className="scene-caption"><h1>{activeSlot?activeProfile.label:t(chapter.titleKey)}</h1><span className="action-subtitle">{activeSlot?activeProfile.action:''}</span></div>
    <div className="training-stage" aria-label="行動人物預覽"><div className="training-ink"/><div className="training-hero"><CareerHero profile={activeProfile}/></div>{partnerName&&<div className="training-partner">{partnerName==='曹操'?<CaocaoRig motion={selected===0?'command':'idle'}/>:<CharacterArt name={partnerName}/>}</div>}</div>
    <Participants s={s} index={selected} onInspect={setInspect}/>
    <button ref={journalTrigger} className="journal-toggle" aria-label="行旅手記" title="行旅手記" onClick={() => setJournal(true)}><span className="journal-art-icon" aria-hidden="true"/></button>
    {pending === null ? <ActionDock s={s} onPick={pickSlot} selected={selected} onPreview={setSelected}/> : <div className="event-overlay"><div className="event-speaker"><CharacterArt name={speaker} /><span>{speaker}</span></div><div className="dialogue-box"><PendingPanel s={s} offer={pending} onPick={pickOption} onPreview={setOptionPreview} /></div></div>}
    {journal && <Journal entries={log} onClose={closeJournal}/>}
    {inspect&&<NotableDetail s={s} id={inspect} onClose={()=>setInspect(null)} onLearn={()=>{setInspect(null);onLearn();}}/>}
  </div>;
}

interface PendingProps {
  readonly s: Session;
  readonly offer: EventOffer;
  readonly onPreview:(gains:Partial<Record<Attr,number>>)=>void;
  readonly onPick: (offer: EventOffer, optionIndex: number, title: string, label: string) => void;
}

function PendingPanel({ s, offer, onPick, onPreview }: PendingProps): React.ReactElement {
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
                onPointerEnter={()=>stt.enabled&&onPreview(Object.fromEntries(stt.practicePreview.map(g=>[g.attr,stt.practicePreview.filter(x=>x.attr===g.attr).reduce((n,x)=>n+x.amount,0)])))}
                onFocus={()=>onPreview(Object.fromEntries(stt.practicePreview.map(g=>[g.attr,stt.practicePreview.filter(x=>x.attr===g.attr).reduce((n,x)=>n+x.amount,0)])))}
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

import { ActionDock } from './ActionDock.js';
