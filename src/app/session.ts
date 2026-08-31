// 局內 session：持有 RunState、處理指令、把 RNG cursor 寫回。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { FactionId, NotableId, Seed } from '../contracts/core/ids.js';
import { turnIndex } from '../contracts/core/ids.js';
import type { CheckChoice, SlotIndex } from '../contracts/core/primitives.js';
import type {
  DreamEntryConfig, EventOffer, MetaState, RunState, RunSummary,
} from '../contracts/core/state.js';
import { createRng, type DeterministicRng } from '../kernel/rng.js';
import { careerService } from '../modules/career.js';
import * as check from '../modules/check.js';
import * as commission from '../modules/commission.js';
import { createRunState } from '../modules/dream-entry.js';
import * as item from '../modules/item.js';
import * as ending from '../modules/ending.js';
import * as faction from '../modules/faction.js';
import * as roster from '../modules/roster.js';
import { settle, summarize, type SettlementResult } from '../modules/settlement.js';
import * as training from '../modules/training.js';
import * as turn from '../modules/turn.js';
import type { Wiring } from './composition.js';

export class Session {
  private state: RunState;

  private constructor(private readonly w: Wiring, initial: RunState) {
    this.state = initial;
  }

  static start(w: Wiring, meta: MetaState, config: DreamEntryConfig, seed: Seed): Session {
    const s = new Session(w, createRunState(config, meta, seed, w.defs));
    // 順序重要：先種道具（它们的效果不吃門檻，包括好感補正），
    // 再組陣容（起始好感要把道具的補正一併算進去），最後才抽格子。
    s.mutate((tc) => item.seedCarried(tc));
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

  /** 本回合已投入固定事件。 */
  get hasActed(): boolean { return turn.hasActed(this.ctx); }

  /**
   * 待玩家處理的事件。null ＝ 沒有。
   *
   * 呈現層的路由只需要問這一個問題：有待處理事件就顯示它，否則顯示四個固定事件。
   * 「這是委託還是武將事件」不影響流程，因此不必分兩個欄位（15 §2）。
   */
  get pendingEvent(): EventOffer | null { return commission.head(this.ctx); }

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
      turn: { ...tc.state.turn, slots: training.generate(tc, this.w.fx) },
    }));
  }

  /**
   * 進入下一回合。
   *
   * 【必須清掉上一回合的結算】。章末推進時不會重抽格子（要先打大檢定），
   * 若不清空，`turn.selected` 會留著上一回合的值 ——
   * 於是「本回合已行動」在一個還沒行動的回合裡為真，`canAdvance` 也跟著騙人。
   * 正常流程看不到（UI 會先路由到大檢定畫面），但那是靠巧合而不是靠規則。
   *
   * 清空不消耗 RNG，因此與重抽是兩件事：重抽只在需要新格子時才做。
   * `seenUniqueIds` 跨回合累積，因此【不清】—— 它是本輪的紀錄，不是本回合的。
   */
  private stepTurn(): void {
    this.mutate((tc) => {
      const nextLocal = turn.localTurn(tc) + 1;
      const p = turn.progressOf(nextLocal, tc.state.faction, tc.state.progress.chaptersPassed, tc);
      return {
        ...tc.state,
        progress: { ...p, turn: turnIndex(tc.state.progress.turn + 1) },
        turn: {
          slots: tc.state.turn.slots,
          selected: null,
          training: null,
          pending: [],
          resolved: [],
          seenUniqueIds: tc.state.turn.seenUniqueIds,
        },
      };
    });
  }

  previewTraining(index: SlotIndex): training.TrainingPreview {
    return training.preview(index, this.ctx, this.w.fx);
  }

  /**
   * 回合裡唯一的「選什麼」（GDD §4.2）。
   *
   * 選完之後發生三件事，它們是同一個因果鏈：
   *   1. 固定事件結算（四維、功績、站位好感度、第二層光階揭曉）
   *   2. 【若該格的委託旗標為真】才抽出內容，推進佇列（兩段抽取的第二段）
   *   3. 記帳
   *
   * 委託與人物事件都不是另一個「選什麼」—— 它們是這個決定的後果。
   */
  selectSlot(index: SlotIndex): void {
    turn.assertActable(this.ctx);
    const attr = training.slotAt(index, this.ctx).attr;
    this.mutate((tc) => training.select(index, tc, this.w.fx, this.w.writer));
    this.mutate((tc) => commission.openBeats(tc, this.w.fx));
    this.mutate((tc) => turn.tally(attr, tc));
  }

  /**
   * 回合裡第二個決定：待處理事件用哪個方法度過。
   *
   * 結算後佇列可能又長出一則（第三拍的人物事件），因此呼叫端不能
   * 假設一次就清空 —— 要問 `pendingEvent`。
   *
   * 官階重算在推進下一拍【之前】：人物事件的選項門檻吃官階，
   * 而委託剛給的功績可能剛好推上一階。
   */
  resolveEvent(optionIndex: number): void {
    this.mutate((tc) => commission.resolveHead(optionIndex, tc, this.w.fx, this.w.writer));
    this.mutate((tc) => careerService.reevaluate({ state: tc.state, defs: tc.defs }));
    this.mutate((tc) => commission.openBeats(tc, this.w.fx));
  }

  canAdvance(): boolean { return turn.canAdvance(this.ctx); }

  advance(): void {
    if (!turn.canAdvance(this.ctx)) {
      throw new Error('本回合尚未完成（未投入固定事件，或還有待處理事件）');
    }
    this.stepTurn();
    if (!this.state.progress.pendingMajorCheck) this.refreshSlots();
  }

  // ── 大檢定 ───────────────────────────────────────
  majorCheck() {
    const chapter = turn.currentChapter(this.ctx);
    return this.w.defs.reader('majorCheck').get(String(chapter.majorCheckId));
  }

  previewMajor(choice: CheckChoice, sortie: readonly NotableId[]): check.CheckPreview {
    return check.preview(
      check.specForMajor(this.majorCheck(), choice), sortie, this.ctx, this.w.fx,
    );
  }

  /** 六個選項（文武各三檔）。門檻不足者不在其中，但 UI 仍應把它畫出來（18 §2.1）。 */
  availableChoices(): readonly CheckChoice[] {
    return check.availableChoices(this.majorCheck(), this.ctx);
  }

  eligibleSortie(): readonly NotableId[] {
    return roster.eligibleForSortie(this.majorCheck(), this.ctx);
  }

  /**
   * 走哪一條路線由玩家決定，因此【失敗的結局也由路線決定】：
   * 走武路敗了是戰歿，走文路敗了是罷官。用 def 上的單一主屬性推不出這件事。
   */
  attemptMajor(choice: CheckChoice, sortie: readonly NotableId[]): boolean {
    const def = this.majorCheck();
    const route = check.routeOf(def, choice);
    const spec = check.specForMajor(def, choice);
    let passed = false;

    this.mutate((tc) => {
      const out = check.resolveCheck(spec, sortie, tc, this.w.fx);
      passed = out.passed;
      let s: RunState = {
        ...tc.state,
        lastMajorCheck: {
          chapterId: tc.state.progress.chapterId,
          line: choice.line, difficulty: choice.difficulty,
          base: out.base, bonus: out.bonus, dc: out.dc,
          roll: out.roll, total: out.total, passed: out.passed,
        },
      };
      if (!passed) {
        return ending.reachEnding(
          ending.failedByAttr(route.primaryAttr), { state: s, defs: tc.defs },
        );
      }
      for (const r of check.tierOf(def, choice).rewards) {
        const c: RunContext = { state: s, defs: tc.defs };
        if (r.kind === 'merit') s = this.w.writer.grantMerit(r.merit, r.amount, c);
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

  /**
   * 入朝【不再重設官階】。舊制在這裡讀一次總名聲決定起始階級，那是名聲
   * 唯一的消費端；名聲刪除之後，官階從第一回合起就只由功績決定（21 §2.1）。
   */
  chooseFaction(id: FactionId): void {
    this.mutate((tc) => faction.choose(id, tc));
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
    this.mutate((tc) => roster.assignSuperiors(chosen, tc, this.w.fx));
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
