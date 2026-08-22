// ⑮ 章節與回合推進。一回合恰好一個動作，鍛鍊與事件互斥（15 §2）。
import type { RunContext } from '../contracts/core/context.js';
import type { ChapterDef } from '../contracts/core/definitions.js';
import type { ChapterId, FactionId } from '../contracts/core/ids.js';
import { chapterIndex, turnIndex } from '../contracts/core/ids.js';
import type { ActionTally, RunState, TurnAction, TurnProgress } from '../contracts/core/state.js';
import { selectedAction } from './training.js';
import { resolvedAction } from './event-slot.js';

export const sequenceOf = (
  faction: FactionId | null, ctx: RunContext,
): readonly ChapterId[] => {
  const seq = ctx.defs.reader('chapterSequence').all()
    .find((s) => s.factionId === faction);
  if (seq === undefined) throw new Error(`章節序列不存在: faction=${String(faction)}`);
  return seq.chapters;
};

const chapterAt = (id: ChapterId, ctx: RunContext): ChapterDef =>
  ctx.defs.reader('chapter').get(String(id));

/**
 * turn 是唯一權威；chapter 與 turnInChapter 由章節表推導。
 * 不得反向用固定除法算章節 —— 章節長度是資料，可能非等長（15 §1.1）。
 */
export function progressOf(
  turn: number, faction: FactionId | null, chaptersPassed: number, ctx: RunContext,
): TurnProgress {
  const seq = sequenceOf(faction, ctx);
  let consumed = 0;
  for (let i = 0; i < seq.length; i += 1) {
    const cid = seq[i];
    if (cid === undefined) break;
    const ch = chapterAt(cid, ctx);
    if (turn <= consumed + ch.length) {
      return {
        turn: turnIndex(turn),
        chapter: chapterIndex(chaptersPassed + i + 1),
        chapterId: cid,
        turnInChapter: turn - consumed,
        phase: faction === null ? 'nanhua' : 'faction',
        chaptersPassed,
        pendingMajorCheck: turn === consumed + ch.length,
        pendingFactionChoice: false,
        pendingSuperiorAssign: false,
      };
    }
    consumed += ch.length;
  }
  // 序列已走完
  const last = seq.at(-1);
  if (last === undefined) throw new Error('空的章節序列');
  return {
    turn: turnIndex(turn),
    chapter: chapterIndex(chaptersPassed + seq.length),
    chapterId: last,
    turnInChapter: chapterAt(last, ctx).length,
    phase: faction === null ? 'nanhua' : 'faction',
    chaptersPassed,
    pendingMajorCheck: false,
    pendingFactionChoice: false,
    pendingSuperiorAssign: false,
  };
}

/**
 * 本回合已投入的動作。
 *
 * 【不另存一份】。兩個槽各自已經記了自己的結果（training.selected／event.resolved），
 * 互斥性讓「其中恰有一個非 null」本身就是完整資訊 —— 再加一個 committed 欄位
 * 只會多出一個可能與兩者不一致的真相來源。
 * 15 的職責是【組合這兩個查詢並宣告規則】，不是再存一次。
 */
export const actionOf = (ctx: RunContext): TurnAction | null =>
  selectedAction(ctx) ?? resolvedAction(ctx);

export const hasActed = (ctx: RunContext): boolean => actionOf(ctx) !== null;

/**
 * 互斥的唯一守門處（15 §2）。選了鍛鍊就不能再做事件，反之亦然。
 * 寫在這裡而不是兩個槽各寫一次 —— 否則規則會有兩份，且各自只看得到自己那半。
 */
export function assertActable(ctx: RunContext): void {
  const acted = actionOf(ctx);
  if (acted !== null) {
    throw new Error(`本回合已行動（${acted.kind}），一回合只能投入一個動作`);
  }
}

/** 記帳。行動配比是單動作回合制的核心度量，因此必須留下紀錄（15 §2.2）。 */
export function tally(action: TurnAction, ctx: RunContext): RunState {
  const next: ActionTally = {
    ...ctx.state.actions,
    [action.kind]: ctx.state.actions[action.kind] + 1,
  };
  return { ...ctx.state, actions: next };
}

export const canAdvance = (ctx: RunContext): boolean => hasActed(ctx);

export const currentChapter = (ctx: RunContext): ChapterDef =>
  chapterAt(ctx.state.progress.chapterId, ctx);

export const isSequenceComplete = (ctx: RunContext): boolean => {
  const seq = sequenceOf(ctx.state.faction, ctx);
  const idx = seq.indexOf(ctx.state.progress.chapterId);
  return idx === seq.length - 1 && !ctx.state.progress.pendingMajorCheck;
};

/** 本地回合序號（進入當前序列後的第幾回合）。 */
export const localTurn = (ctx: RunContext): number => {
  const seq = sequenceOf(ctx.state.faction, ctx);
  let consumed = 0;
  for (const cid of seq) {
    const ch = chapterAt(cid, ctx);
    if (cid === ctx.state.progress.chapterId) return consumed + ctx.state.progress.turnInChapter;
    consumed += ch.length;
  }
  return consumed;
};

export const sequenceTotalTurns = (
  faction: FactionId | null, ctx: RunContext,
): number => sequenceOf(faction, ctx)
  .reduce((sum, cid) => sum + chapterAt(cid, ctx).length, 0);
