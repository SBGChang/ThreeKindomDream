// ⑮ 章節與回合推進。一回合恰好一個動作，鍛鍊與事件互斥（15 §2）。
import type { RunContext } from '../contracts/core/context.js';
import type { ChapterDef } from '../contracts/core/definitions.js';
import type { ChapterId, FactionId } from '../contracts/core/ids.js';
import { chapterIndex, turnIndex } from '../contracts/core/ids.js';
import type { Attr } from '../contracts/core/primitives.js';
import type { ActionTally, RunState, TurnProgress } from '../contracts/core/state.js';
import { hasSelected } from './training.js';
import { isClear } from './commission.js';

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
        phase: faction === null ? 'camp' : 'faction',
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
    phase: faction === null ? 'camp' : 'faction',
    chaptersPassed,
    pendingMajorCheck: false,
    pendingFactionChoice: false,
    pendingSuperiorAssign: false,
  };
}

/**
 * 本回合是否已投入固定事件。
 *
 * 【不另存一份】：⑯ 已經記了 `turn.selected`，再加一個 committed 欄位
 * 只會多出一個可能不一致的真相來源。15 的職責是【組合兩個擁有者的查詢
 * 並宣告規則】，不是再存一次，也不是繞過擁有者直接讀他們的 slice。
 */
export const hasActed = (ctx: RunContext): boolean => hasSelected(ctx);

/**
 * 唯一的守門處（15 §2）。一回合恰好投入一個固定事件。
 *
 * 委託【不經這道門】—— 它不是玩家投入的動作，是投入之後發生的事。
 * 委託的守門是「佇列非空」，見 canAdvance。
 */
export function assertActable(ctx: RunContext): void {
  if (hasActed(ctx)) {
    throw new Error('本回合已投入固定事件，一回合只能投入一個');
  }
}

/** 記帳。「回合花在哪一維」是新制的核心度量，因此必須留下紀錄（15 §2.2）。 */
export function tally(attr: Attr, ctx: RunContext): RunState {
  const next: ActionTally = { ...ctx.state.actions, [attr]: ctx.state.actions[attr] + 1 };
  return { ...ctx.state, actions: next };
}

/**
 * 可推進 ⟺ 已投入固定事件【且】待處理佇列已清空（15 §2）。
 *
 * 兩個條件是同一條規則的兩半：一個回合＝一個固定事件，加上它引發的全部事件。
 * 因此追加武將事件不需要在這裡多一個分支 —— 它只是讓佇列又非空了。
 */
export const canAdvance = (ctx: RunContext): boolean => hasSelected(ctx) && isClear(ctx);

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
