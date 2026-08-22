// 局內 session：持有 RunState、處理指令、把 RNG cursor 寫回。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { FactionId, NotableId, Seed } from '../contracts/core/ids.js';
import { turnIndex } from '../contracts/core/ids.js';
import type { Difficulty, SlotIndex } from '../contracts/core/primitives.js';
import type {
  AttrGain, DreamEntryConfig, MetaState, RunState, RunSummary, TurnAction,
} from '../contracts/core/state.js';
import { createRng, type DeterministicRng } from '../kernel/rng.js';
import { careerService } from '../modules/career.js';
import * as check from '../modules/check.js';
import { createRunState } from '../modules/dream-entry.js';
import * as ending from '../modules/ending.js';
import * as events from '../modules/event-slot.js';
import * as faction from '../modules/faction.js';
import * as roster from '../modules/roster.js';
import { settle, summarize, type SettlementResult } from '../modules/settlement.js';
import * as training from '../modules/training.js';
import * as turn from '../modules/turn.js';
import type { Wiring } from './composition.js';

/** 事件的即時回饋。UI 要在推進前把它顯示出來，否則玩家永遠看不到自己做了什麼。 */
export interface EventOutcome {
  readonly passed: boolean;
  readonly practiceGained: readonly AttrGain[];
}

export class Session {
  private state: RunState;

  private constructor(private readonly w: Wiring, initial: RunState) {
    this.state = initial;
  }

  static start(w: Wiring, meta: MetaState, config: DreamEntryConfig, seed: Seed): Session {
    const s = new Session(w, createRunState(config, meta, seed, w.defs));
    s.mutate((tc) => roster.assembleCompanions(tc, w.fx));
    s.refreshSlots();
    return s;
  }

  get current(): RunState { return this.state; }
  get ctx(): RunContext { return { state: this.state, defs: this.w.defs }; }
  get isOver(): boolean { return this.state.ending !== null; }
  get needsFactionChoice(): boolean { return this.state.progress.pendingFactionChoice; }
  get needsSuperiors(): boolean { return this.state.progress.pendingSuperiorAssign; }
  get needsMajorCheck(): boolean { return this.state.progress.pendingMajorCheck; }

  /** 本回合已投入的動作。null ＝ 還能行動（15 §2）。 */
  get action(): TurnAction | null { return turn.actionOf(this.ctx); }

  private rng(): DeterministicRng {
    return createRng(this.state.seed, this.state.rngCursors);
  }

  private mutate(fn: (tc: TurnContext) => RunState): void {
    const rng = this.rng();
    const next = fn({ state: this.state, defs: this.w.defs, rng });
    this.state = { ...next, rngCursors: rng.cursors() };
  }

  private refreshSlots(): void {
    this.mutate((tc) => ({
      ...tc.state,
      slots: { ...tc.state.slots, training: training.generate(tc, this.w.fx) },
    }));
    this.mutate((tc) => ({
      ...tc.state,
      slots: { ...tc.state.slots, event: events.draw(tc, this.w.fx) },
    }));
  }

  /**
   * 進入下一回合。
   *
   * 【必須清掉上一回合的結算】。章末推進時不會重抽槽位（要先打大檢定），
   * 若不清空，`training.selected` 會留著上一回合的值 ——
   * 於是「本回合已行動」在一個還沒行動的回合裡為真，`canAdvance` 也跟著騙人。
   * 正常流程看不到（UI 會先路由到大檢定畫面），但那是靠巧合而不是靠規則。
   *
   * 清空不消耗 RNG，因此與重抽是兩件事：重抽只在需要新槽位時才做。
   */
  private stepTurn(): void {
    this.mutate((tc) => {
      const nextLocal = turn.localTurn(tc) + 1;
      const p = turn.progressOf(nextLocal, tc.state.faction, tc.state.progress.chaptersPassed, tc);
      return {
        ...tc.state,
        progress: { ...p, turn: turnIndex(tc.state.progress.turn + 1) },
        slots: {
          training: { ...tc.state.slots.training, selected: null, result: null },
          event: { ...tc.state.slots.event, offers: [], resolved: null },
        },
      };
    });
  }

  previewTraining(index: SlotIndex): training.TrainingPreview {
    return training.preview(index, this.ctx, this.w.fx);
  }

  /**
   * 鍛鍊與事件是同一個動作槽的兩邊，因此兩條指令共用同一道前置檢查。
   * 檢查與記帳都問 15 —— 規則只有一份（15 §2）。
   */
  selectTraining(index: SlotIndex): void {
    turn.assertActable(this.ctx);
    this.mutate((tc) => training.select(index, tc, this.w.fx, this.w.writer));
    this.mutate((tc) => turn.tally({ kind: 'training', index }, tc));
  }

  selectEvent(offerIndex: number, optionIndex: number): EventOutcome {
    turn.assertActable(this.ctx);
    let out: EventOutcome = { passed: false, practiceGained: [] };
    this.mutate((tc) => {
      const r = events.selectOption(offerIndex, optionIndex, tc, this.w.fx, this.w.writer);
      out = { passed: r.passed, practiceGained: r.practiceGained };
      return careerService.reevaluate({ state: r.state, defs: tc.defs });
    });
    this.mutate((tc) => turn.tally({ kind: 'event', offerIndex, optionIndex }, tc));
    return out;
  }

  canAdvance(): boolean { return turn.canAdvance(this.ctx); }

  advance(): void {
    if (!turn.canAdvance(this.ctx)) throw new Error('本回合尚未行動，不可推進');
    this.stepTurn();
    if (!this.state.progress.pendingMajorCheck) this.refreshSlots();
  }

  // ── 大檢定 ───────────────────────────────────────
  majorCheck() {
    const chapter = turn.currentChapter(this.ctx);
    return this.w.defs.reader('majorCheck').get(String(chapter.majorCheckId));
  }

  previewMajor(difficulty: Difficulty, sortie: readonly NotableId[]): check.CheckPreview {
    return check.preview(
      check.specForMajor(this.majorCheck(), difficulty), sortie, this.ctx, this.w.fx,
    );
  }

  availableDifficulties(): readonly Difficulty[] {
    return check.availableDifficulties(this.majorCheck(), this.ctx);
  }

  eligibleSortie(): readonly NotableId[] {
    return roster.eligibleForSortie(this.majorCheck(), this.ctx);
  }

  attemptMajor(difficulty: Difficulty, sortie: readonly NotableId[]): boolean {
    const def = this.majorCheck();
    const spec = check.specForMajor(def, difficulty);
    let passed = false;

    this.mutate((tc) => {
      const out = check.resolveCheck(spec, sortie, tc, this.w.fx);
      passed = out.passed;
      let s: RunState = {
        ...tc.state,
        lastMajorCheck: {
          chapterId: tc.state.progress.chapterId, difficulty,
          base: out.base, bonus: out.bonus, dc: out.dc,
          roll: out.roll, total: out.total, passed: out.passed,
        },
      };
      if (!passed) {
        return ending.reachEnding(
          ending.failedByAttr(def.primaryAttr), { state: s, defs: tc.defs },
        );
      }
      for (const r of def.tiers[difficulty].rewards) {
        const c: RunContext = { state: s, defs: tc.defs };
        if (r.kind === 'fame') s = this.w.writer.grantFame(r.fame, r.amount, c);
        else if (r.kind === 'merit') s = this.w.writer.grantMerit(r.merit, r.amount, c);
        else if (r.kind === 'attr') s = this.w.writer.grantAttr(r.attr, r.amount, c);
        else if (r.kind === 'affinity' && r.notableId !== null) {
          s = roster.addAffinity(r.notableId, r.amount, c);
        }
      }
      s = careerService.reevaluate({ state: s, defs: tc.defs });
      const chapter = turn.currentChapter({ state: s, defs: tc.defs });
      return {
        ...s,
        progress: {
          ...s.progress,
          chaptersPassed: s.progress.chaptersPassed + 1,
          pendingMajorCheck: false,
          pendingFactionChoice: chapter.onPass === 'chooseFaction',
        },
      };
    });

    if (passed) this.afterChapterPassed();
    return passed;
  }

  private afterChapterPassed(): void {
    if (this.state.progress.pendingFactionChoice) return;
    const seq = turn.sequenceOf(this.state.faction, this.ctx);
    const idx = seq.indexOf(this.state.progress.chapterId);
    if (idx >= 0 && idx < seq.length - 1) {
      this.stepTurn();
      this.refreshSlots();
    } else {
      this.mutate((tc) => ending.reachEnding(ending.SEQUENCE_DONE, tc));
    }
  }

  // ── 選陣營與入朝 ─────────────────────────────────
  factionOptions(): readonly faction.FactionOption[] { return faction.selectable(this.ctx); }

  chooseFaction(id: FactionId): void {
    this.mutate((tc) => faction.choose(id, tc));
    this.mutate((tc) => careerService.initializeOnJoin(tc));
  }

  superiorCandidates(): readonly NotableId[] { return roster.superiorCandidates(this.ctx); }

  bondQuota(): number {
    const f = this.state.faction;
    if (f === null) return 0;
    return Math.min(
      faction.bondLevelOf(f, this.ctx),
      this.w.defs.single('gameRules').superiorCount,
    );
  }

  assignSuperiors(chosen: readonly NotableId[]): void {
    this.mutate((tc) => roster.assignSuperiors(chosen, tc));
    this.mutate((tc) => ({
      ...tc.state,
      progress: { ...tc.state.progress, pendingSuperiorAssign: false },
    }));
    this.refreshSlots();
  }

  // ── 結局與結算 ───────────────────────────────────
  noFactionAvailable(): void {
    this.mutate((tc) => ending.reachEnding(ending.NO_FACTION, tc));
  }

  summary(): RunSummary { return summarize(this.state, this.w.defs); }

  settle(meta: MetaState): SettlementResult {
    return settle(this.summary(), meta, this.w.defs);
  }
}
