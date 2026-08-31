// 局內 session：持有 RunState、處理指令、把 RNG cursor 寫回。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { FactionId, NotableId, Seed } from '../contracts/core/ids.js';
import { turnIndex } from '../contracts/core/ids.js';
import type { NotableId as NId, SkillId, TraitId } from '../contracts/core/ids.js';
import type {
  AffinityStage, Attr, AttrGrade, SlotIndex,
} from '../contracts/core/primitives.js';
import type { CampaignDef, EventReward } from '../contracts/core/definitions.js';
import type {
  BattleLoadout, DreamEntryConfig, EventOffer, MetaState, RunState, RunSummary,
} from '../contracts/core/state.js';
import { createRng, type DeterministicRng } from '../kernel/rng.js';
import { careerService } from '../modules/career.js';
import * as campaign from '../modules/campaign.js';
import * as growth from '../modules/growth.js';
import * as commission from '../modules/commission.js';
import { createRunState } from '../modules/dream-entry.js';
import * as item from '../modules/item.js';
import * as ending from '../modules/ending.js';
import * as faction from '../modules/faction.js';
import * as roster from '../modules/roster.js';
import { stageOf as rosterStageOf } from '../modules/roster-query.js';
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
  get needsCampaign(): boolean { return this.state.progress.pendingMajorCheck; }

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
    if (this.state.progress.pendingMajorCheck) {
      // 章末不再進入判定，而是開一場戰役（15 → ㉝）。
      this.mutate((tc) => campaign.begin(tc.state.progress.chapterId, tc, this.w.fx));
    } else {
      this.refreshSlots();
    }
  }

  // ── 戰役（㉝）★ ──────────────────────────────────
  //
  // 取代舊的大檢定判定。四條規格：玩家不操作、跨關不回滿、每關都可以走、
  // 不顯示勝率。沒有及格線 ——【沒有任何一條路能殺死你，除了你自己按下
  // 「再打一關」】（RFC-01 D5）。

  campaignDef(): CampaignDef { return campaign.currentCampaign(this.ctx); }
  campaignState() { return this.state.campaign; }
  hostLimits(): campaign.HostLimits { return campaign.hostLimits(this.ctx, this.w.fx); }
  /** 我軍每回合的期望輸出。不是勝率 —— 是玩家自己也讀得出來的那個數字。 */
  hostPower(): number { return campaign.hostPower(this.ctx, this.w.fx); }
  /** 糧秣實際換得回多少軍勢。沒帶恢復招的人是 0。 */
  hostSustain(): number { return campaign.hostSustain(this.ctx, this.w.fx); }
  stageCount(): number { return campaign.stageCount(this.ctx); }
  nextStage(): campaign.StagePreview | null { return campaign.nextStagePreview(this.ctx); }
  eligibleCommanders(): readonly NotableId[] { return campaign.eligibleCommanders(this.ctx); }

  commanderSkills(id: NotableId): readonly SkillId[] {
    return campaign.skillOptionsFor(id, this.ctx);
  }

  /** 好感階 ＝ 他多常傳令（33 §4.3）。UI 要把它寫在名字旁邊。 */
  commanderStage(id: NotableId): AffinityStage {
    return rosterStageOf(id, this.ctx);
  }

  configureCampaign(loadout: BattleLoadout): void {
    this.mutate((tc) => campaign.configure(loadout, tc));
  }

  /** 打下一關。回傳結果供呈現層播戰報 —— 戰報是玩家唯一的資訊來源（33 §7）。 */
  engage(): campaign.StageOutcome {
    const box: { value: campaign.StageOutcome | null } = { value: null };
    this.mutate((tc) => {
      const r = campaign.engage(tc, this.w.fx);
      box.value = r.outcome;
      return r.state;
    });
    const outcome = box.value;
    if (outcome === null) throw new Error('戰役結算未回傳結果');
    if (outcome.defeated) this.abortByDefeat();
    return outcome;
  }

  /**
   * 掃蕩（D15）：一路打到「開始需要想」為止。
   *
   * 它【不繞過任何規則】—— 每一關都真的跑一次 `engage`，
   * 只是不停下來問玩家。判準在 ㉝（`isOverwhelming`），
   * 因此「什麼叫戰力明顯超過」只有一個定義。
   */
  sweep(): { readonly cleared: number; readonly stopped: 'threat' | 'done' | 'defeat' } {
    let cleared = 0;
    for (let guard = 0; guard < this.stageCount(); guard += 1) {
      if (this.nextStage() === null) return { cleared, stopped: 'done' };
      if (!campaign.isOverwhelming(this.ctx, this.w.fx)) {
        return { cleared, stopped: 'threat' };
      }
      const out = this.engage();
      if (out.defeated) return { cleared, stopped: 'defeat' };
      cleared += 1;
    }
    return { cleared, stopped: 'done' };
  }

  /** 下一關是否還在「不需要想」的範圍內。UI 用它決定要不要顯示掃蕩鈕。 */
  canSweep(): boolean { return campaign.isOverwhelming(this.ctx, this.w.fx); }

  /**
   * 收兵。`clearedStages === 0` 時合法 ——【按兵不動】。
   * 它拿不到任何獎勵，但章節照過；膽小的懲罰是難看的結局，不是死亡（D7）。
   */
  withdraw(): void {
    const banked = campaign.bankedOf(this.ctx);
    this.mutate((tc) => campaign.withdraw(tc));
    this.mutate((tc) => this.applyRewards(banked, tc.state, tc));
    this.mutate((tc) => careerService.reevaluate({ state: tc.state, defs: tc.defs }));
    this.mutate((tc) => {
      const chapter = turn.currentChapter(tc);
      return {
        ...campaign.clear(tc),
        progress: {
          ...tc.state.progress,
          chaptersPassed: tc.state.progress.chaptersPassed + 1,
          pendingMajorCheck: false,
          pendingFactionChoice: chapter.onPass === 'chooseFaction',
        },
      };
    });
    this.afterChapterPassed();
  }

  /**
   * 戰敗 → 中止類結局。
   *
   * 走哪一條官途決定結局的性質：武系敗了是戰歿，文系敗了是罷官。
   * 這與舊制「由檢定路線決定」是同一個判準 —— 只是路線不再是當場選的，
   * 而是你這一輪爬的那條官階。
   */
  private abortByDefeat(): void {
    this.mutate((tc) => {
      const martial = tc.state.career.martial >= tc.state.career.civil;
      return ending.reachEnding(
        ending.failedByAttr(martial ? 'war' : 'int'), { state: tc.state, defs: tc.defs },
      );
    });
  }

  /** 已保住的獎勵入帳。戰敗時不會走到這裡 —— `banked` 全部作廢（33 §11.3）。 */
  private applyRewards(
    rewards: readonly EventReward[], from: RunState, tc: TurnContext,
  ): RunState {
    let s = from;
    const at = (): RunContext => ({ state: s, defs: tc.defs });
    for (const r of rewards) {
      if (r.kind === 'merit') s = this.w.writer.grantMerit(r.merit, r.amount, at());
      else if (r.kind === 'attr') s = this.w.writer.grantAttr(r.attr, r.amount, at());
      else if (r.kind === 'affinity' && r.notableId !== null) {
        s = roster.addAffinity(r.notableId, r.amount, at());
      } else if (r.kind === 'unlock') {
        s = growth.grantUnlock(r.trait, r.skill, at());
      } else if (r.kind === 'item') {
        const out = item.acquire(r.itemId, { ...tc, state: s });
        s = out.state;
      }
    }
    return s;
  }

  // ── 養成兌現（㉜）★ ──────────────────────────────
  //
  // 學習不佔行動、隨時可做（32 §7.3）：它不是行動決策，而且數值會擋事件門檻，
  // 玩家有理由早花。三個 learn* 都不消耗 RNG —— 兌換不得引入隨機。

  expOf(attr: Attr): number { return growth.expOf(attr, this.ctx); }
  gradeOf(attr: Attr): AttrGrade { return growth.gradeOf(attr, this.ctx); }
  nextGrade(attr: Attr): growth.NextGrade | null {
    return growth.nextGrade(attr, this.ctx, this.w.fx);
  }
  traitOffers(): readonly growth.TraitOffer[] {
    return growth.learnableTraits(this.ctx, this.w.fx);
  }
  skillOffers(): readonly growth.SkillOffer[] {
    return growth.learnableSkills(this.ctx, this.w.fx);
  }

  learnAttr(attr: Attr, target: number): growth.LearnResult {
    const r = growth.learnAttr(attr, target, this.ctx, this.w.fx, this.w.writer);
    if (r.ok) this.state = r.state;
    return r;
  }
  learnTrait(id: TraitId): growth.LearnResult {
    const r = growth.learnTrait(id, this.ctx, this.w.fx);
    if (r.ok) this.state = r.state;
    return r;
  }
  learnSkill(id: SkillId): growth.LearnResult {
    const r = growth.learnSkill(id, this.ctx, this.w.fx);
    if (r.ok) this.state = r.state;
    return r;
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
