import {createEventChallenge,enterEventChallenge,finishChallenge,answerEventDuel,answerEventDebate,tickEventChallenge,continueEventChallenge} from './event-challenge.js';
import {preserveRecruitment,earnedRecruits} from '../modules/recruitment.js';
import {prepareFieldStory,bankFieldRewards} from './campaign-field-story.js';
import {tickStoryField,advanceFieldStory,answerFieldDuel} from './battle-story-field.js';
import {advanceStory,answerStoryDebate} from './battle-story.js';
import type {RallyAction,RallySide} from '../contracts/core/debate-rally.js';
import {DUEL_ACTIONS} from './duel-model.js';
import * as equipment from '../modules/equipment.js';
import { CHARGES } from '../contracts/core/effects.js';
import {campaignConfrontation} from './campaign-confrontation.js';
import {answerContest,tickEncounterDemo,type EncounterDemo} from './confrontation-demo.js';
import { consumeCharge } from '../modules/effect.js';
import { campaignBattle, realtimeRewards, realtimeSkill } from './realtime-campaign.js';
import { armyCount, castSkill, rallyArmy, startBattle, tickBattle, type BattleState } from './realtime-battle-model.js';
// 局內 session：持有 RunState、處理指令、把 RNG cursor 寫回。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { FactionId, ItemId as ItemIdT, NotableId, Seed } from '../contracts/core/ids.js';
import { turnIndex } from '../contracts/core/ids.js';
import type { NotableId as NId, SkillId, TraitId } from '../contracts/core/ids.js';
import type {
  AffinityStage, AptitudeGrade, Attr, AttrGrade, SlotIndex,
} from '../contracts/core/primitives.js';
import type { AttrGradeBand, CampaignDef, EventReward } from '../contracts/core/definitions.js';
import type {
  BattleLoadout, DreamEntryConfig, EventOffer, MetaState, RunState, RunSummary,
} from '../contracts/core/state.js';
import { createRng, type DeterministicRng } from '../kernel/rng.js';
import { statQuery } from '../modules/stats.js';
import { careerService } from '../modules/career.js';
import * as ability from '../modules/ability.js';
import * as campaign from '../modules/campaign.js';
import * as growth from '../modules/growth.js';
import * as economy from '../modules/economy.js';
import * as market from '../modules/market.js';
import * as stories from '../modules/stories.js';
import * as learning from '../modules/learning.js';
import type { RunContext as RC } from '../contracts/core/context.js';
import * as commission from '../modules/commission.js';
import { createRunState, rollStartAttrs } from '../modules/dream-entry.js';
import * as item from '../modules/item.js';
import * as ending from '../modules/ending.js';
import * as faction from '../modules/faction.js';
import * as roster from '../modules/roster.js';
import { stageOf as rosterStageOf } from '../modules/roster-query.js';
import { settle, summarize, type SettlementResult } from '../modules/settlement.js';
import * as training from '../modules/training.js';
import * as turn from '../modules/turn.js';
import * as story from '../modules/story.js';
import type { Wiring } from './composition.js';

const defsAttrMax = (ctx: RC): number => ctx.defs.single('attributeCap').attrMax;

export class Session {
  private state: RunState;

  private constructor(private readonly w: Wiring, initial: RunState) {
    this.state = initial;
  }

  static start(w: Wiring, meta: MetaState, config: DreamEntryConfig, seed: Seed): Session {
    const s = new Session(w, createRunState(config, meta, seed, w.defs));
    // 順序重要：先種道具（它们的效果不吃門檻，包括好感補正），
    // 再組陣容（起始好感要把道具的補正一併算進去），最後才抽格子。
    // 順序重要：先擲起始四維（15–30），道具的效果才有東西可以乘。
    s.mutate((tc) => rollStartAttrs(tc));
    // 再送「你本來就會的那一招」—— 取決於剛剛擲到的最高維（23 §4.2）。
    s.mutate((tc) => {
      const id = ability.starterSkill(tc);
      return id === null ? tc.state : ability.addSkill(id, tc);
    });
    s.mutate((tc) => item.seedCarried(tc));
    s.mutate(tc=>equipment.autoEquip(tc));
    s.mutate((tc) => roster.assembleCompanions(tc, w.fx));
    s.mutate(tc => economy.transact('entry', economy.economyRule(tc).startingMoney, '啟程盤纏', tc));
    s.refreshSlots();
    return s;
  }

  get current(): RunState {const earned=earnedRecruits(this.ctx);if(earned.some(id=>!this.state.earnedUnlocks?.includes(id)))this.state={...this.state,earnedUnlocks:earned};return this.state;}
  preserveUnlocks(meta:MetaState):MetaState{return preserveRecruitment(meta,this.ctx);}
  static restore(w: Wiring, state: RunState): Session {
    if(state.eventChallenge){state=structuredClone(state);state.eventChallenge!.paused=true;}
    if(state.campaign?.realtime?.status==='running')state={...state,campaign:{...state.campaign,realtime:{...state.campaign.realtime,status:'paused'}}};
    if(state.campaign?.fieldStory&&state.campaign.realtime){const f=state.campaign.fieldStory.field;f.encounter.battle=state.campaign.realtime;if(f.encounter.contest&&f.story.duel)f.encounter.contest.duel=f.story.duel;}
    const s = new Session(w, state);
    // Earlier saves recorded teaching as a locked Lv0 course; preserve it as a learned Lv1.
    for (const id of state.growth.unlockedSkills) if (!ability.hasSkill(id, s.ctx))
      s.state = growth.grantUnlock(null, id, s.ctx, 'legacy/' + id);
    for (const id of state.growth.unlockedTraits) if (!ability.hasTrait(id, s.ctx))
      s.state = growth.grantUnlock(id, null, s.ctx, 'legacy/' + id);
    // Recompute displayed prices/eligibility after a content update without redrawing events.
    const pending = state.turn.pending.map(offer => {
      const def = w.defs.reader('event').get(String(offer.eventDefId));
      const rarity = stories.storyRarity(def);
      return { ...offer, rarity, optionStates: commission.optionStates(def, rarity, s.ctx, w.fx) };
    });
    s.state = { ...s.state, turn: { ...s.state.turn, pending } };
    return s;
  }
  learningOffers(): readonly learning.LearningOffer[] { return learning.offers(this.ctx, this.w.fx); }
  get money(): number { return economy.balance(this.ctx); }
  get needsChapterCamp(): boolean { return economy.inCamp(this.ctx); }
  marketShelf() {const sh=market.shelf(this.ctx);return {...sh,offers:sh.offers.map(o=>({...o,price:equipment.itemPrice(o.price,this.ctx)}))};}
  equipmentOptions(){return item.heldItems(this.ctx).map(id=>this.w.defs.reader('item').get(String(id))).filter(d=>d.equipment);}
  equipItem(id:ItemIdT|null,slot:equipment.EquipmentSlot){this.state=equipment.equip(id,slot,this.ctx);}
  fragmentTargets() { return market.fragmentTargets(this.ctx); }
  fragmentPrice(id: ItemIdT): number { return economy.economyRule(this.ctx).fragmentPrices[this.w.defs.reader('item').get(String(id)).rarity-1]!; }
  selectFragment(id: ItemIdT): void { this.state=market.selectTarget(id,this.ctx); }
  buyMarket(id: string): boolean { const r=market.buy(id,this.ctx);this.state=r.state;return r.ok; }
  buyFragment(): boolean { const r=market.buyFragment(this.ctx);this.state=r.state;return r.ok; }
  toggleTrait(id: TraitId): void { this.state=learning.toggleTrait(id,this.ctx); }
  trackStory(id: NotableId|null): void { this.state=stories.track(id,this.ctx); }
  storyRows(id: NotableId) { return this.w.defs.reader('event').all().filter(e=>e.trigger.kind==='notable'&&e.trigger.cast.some(c=>c.notableId===id)).map(e=>({id:e.eventDefId,title:this.w.defs.text(String(e.titleKey)),rarity:stories.storyRarity(e),blockers:stories.blockers(e,this.ctx),completed:!!stories.history(this.ctx)[String(e.eventDefId)]})).sort((a,b)=>a.rarity-b.rarity); }
  continueChapter(): void { if(!this.needsChapterCamp)return;this.state=economy.setCamp(false,this.ctx);this.afterChapterPassed(); }
  abilityLevel(id: SkillId | TraitId): number { return ability.levelOf(id, this.ctx); }
  upgradeAbility(id: SkillId | TraitId): boolean {
    const result = learning.upgrade(id, this.ctx, this.w.fx);
    if (result.ok) this.state = result.state;
    return result.ok;
  }
  get ctx(): RunContext { return { state: this.state, defs: this.w.defs }; }
  get isOver(): boolean { return this.state.ending !== null; }
  get needsFactionChoice(): boolean { return this.state.progress.pendingFactionChoice; }
  get needsSuperiors(): boolean { return this.state.progress.pendingSuperiorAssign; }
  get needsCampaign(): boolean { return this.state.progress.pendingCampaign; }

  /** 本回合已投入固定事件。 */
  get hasActed(): boolean { return turn.hasActed(this.ctx); }

  /**
   * 待玩家處理的事件。null ＝ 沒有。
   *
   * 呈現層的路由只需要問這一個問題：有待處理事件就顯示它，否則顯示四個固定事件。
   * 「這是委託還是武將事件」不影響流程，因此不必分兩個欄位（15 §2）。
   */
  get pendingEvent(): EventOffer | null { return commission.head(this.ctx); }

  get storyScene() { return story.pendingScene(this.ctx); }
  previewStoryTeachings(scene: import('../contracts/core/story.js').StoryScene): RunState {
    return story.grantStoryTeachings(scene, this.ctx);
  }
  get storyChapter() { return story.chapterStory(this.ctx); }
  get needsEndingChoice(): boolean { return story.awaitingEndingChoice(this.ctx); }
  storyEndingOptions() {
    return this.needsEndingChoice ? ending.candidatesFor(ending.SEQUENCE_DONE, this.ctx).filter(e => (e.storyRequirements?.length ?? 0) > 0) : [];
  }
  chooseStoryEnding(id: string): void {
    if (!this.needsEndingChoice) throw new Error('尚未到紀念結局的時刻');
    const outcome = ending.resolveEnding(ending.SEQUENCE_DONE, this.ctx, id);
    this.state = { ...story.setEndingChoice(false, this.ctx), ending: outcome };
  }
  get storyChoice() {
    return this.hasActed && !this.pendingEvent && !this.storyScene ? story.unchosenStory(this.ctx) : null;
  }
  storyProgress() { return story.storyHistory(this.ctx); }
  storyMeets(requirements: readonly import('../contracts/core/story.js').StoryRequirement[]): boolean {
    return story.meetsStory(requirements, this.ctx);
  }
  chooseStory(nodeId: string, optionId: string): void {
    if (!this.storyChoice || this.needsCampaign || this.isOver) throw new Error('現在不能選擇主線');
    this.state = story.commitStory(nodeId, optionId, this.ctx);
  }
  acknowledgeStory(sceneId: string): void {
    this.state = story.acknowledgeStory(sceneId, this.ctx);
    if (!this.storyScene && story.awaitingChapterClose(this.ctx)) {
      this.state = story.finishStoryChapter(this.ctx);
      this.state = economy.setCamp(true, this.ctx);
    }
  }

  private rng(): DeterministicRng {
    return createRng(this.state.seed, this.state.rngCursors);
  }

  private mutate(fn: (tc: TurnContext) => RunState): void {
    const rng = this.rng();
    const next = fn({ state: this.state, defs: this.w.defs, rng });
    this.state = { ...next, rngCursors: rng.cursors() };
  }

  private refreshSlots(): void {
    this.mutate(tc => market.refresh(tc));
    this.mutate(tc => stories.updateWait(commission.encounterPool(tc),tc));
    this.mutate((tc) => ({
      ...tc.state,
      turn: { ...tc.state.turn, slots: training.generate(tc, this.w.fx).map(slot => story.scheduledStory(tc) ? { ...slot, hasEncounter: false } : slot), encounterCandidates: commission.encounterPool(tc).map(e=>e.eventDefId) },
    }));
    this.state = story.enterStory(this.ctx);
  }

  /**
   * 進入下一回合。
   *
   * 【必須清掉上一回合的結算】。章末推進時不會重抽格子（要先打戰役），
   * 若不清空，`turn.selected` 會留著上一回合的值 ——
   * 於是「本回合已行動」在一個還沒行動的回合裡為真，`canAdvance` 也跟著騙人。
   * 正常流程看不到（UI 會先路由到戰役畫面），但那是靠巧合而不是靠規則。
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
    if(this.needsChapterCamp)throw new Error('請先完成章末休整');
    turn.assertActable(this.ctx);
    const slot = training.slotAt(index, this.ctx);
    const attr = slot.attr;
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

  beginEventChallenge(optionIndex:number):void {
    if(this.state.eventChallenge)throw Error('事件挑戰尚未結束');
    const offer=this.pendingEvent;
    if(!offer||!offer.optionStates[optionIndex]?.enabled)throw Error('事件選項無法使用');
    const option=this.w.defs.reader('event').get(String(offer.eventDefId)).options[optionIndex];
    if(!option?.challenge||this.money<(option.moneyCost??0))throw Error('事件挑戰條件不足');
    this.state={...this.state,eventChallenge:createEventChallenge(String(offer.eventDefId),optionIndex,option.challenge,this.ctx)};
  }
  enterEventChallenge():void {const s=this.state.eventChallenge;if(s)enterEventChallenge(s,this.ctx,this.w.fx);}
  configureEventChallenge(skills:string[],infantryPercent:number):void {
    const s=this.state.eventChallenge;if(!s||s.phase!=='prep')throw Error('尚未進入整備');
    if(skills.length>3||new Set(skills).size!==skills.length||skills.some(id=>!this.state.abilities.skills.some(v=>String(v)===id))||!Number.isInteger(infantryPercent)||infantryPercent<0||infantryPercent>100)throw Error('整備配置無效');
    s.skills=[...skills];s.infantryPercent=infantryPercent;
  }
  pauseEventChallenge(paused:boolean):void {const s=this.state.eventChallenge;if(s)s.paused=paused;}
  retreatEventChallenge():void {const s=this.state.eventChallenge;if(s&&(s.phase==='playing'||s.definition.stages&&(s.phase==='opening'||s.phase==='intermission')))finishChallenge(s,'retreat');}
  continueEventChallenge():void {const s=this.state.eventChallenge;if(s)continueEventChallenge(s);}
  answerEventDuel(choice:number|null):boolean {const s=this.state.eventChallenge;return !!s&&answerEventDuel(s,choice);}
  answerEventDebate(side:RallySide,action:RallyAction):boolean {const s=this.state.eventChallenge;return !!s&&answerEventDebate(s,side,action);}
  finishEventDebate():void {const s=this.state.eventChallenge;if(s?.rally?.winner)finishChallenge(s,s.rally.winner==='ally'?'win':'lose');}
  tickEventChallenge(dt:number):void {const s=this.state.eventChallenge;if(s)tickEventChallenge(s,dt);}
  castEventSkill(id:string):boolean {const s=this.state.eventChallenge;return !!s&&s.phase==='playing'&&!s.paused&&!!s.battle&&castSkill(s.battle,id);}

  canAdvance(): boolean { return !this.state.eventChallenge&&turn.canAdvance(this.ctx); }

  advance(): void {
    if (!this.canAdvance()) {
      throw new Error('本回合尚未完成（未投入固定事件，或還有待處理事件）');
    }
    if (this.state.progress.turnInChapter >= turn.currentChapter(this.ctx).length) {
      this.state = { ...this.state,
        turn: { ...this.state.turn, selected: null, training: null, pending: [], resolved: [] },
        progress: { ...this.state.progress, pendingCampaign: true } };
      // 章末不再進入判定，而是開一場戰役（15 → ㉝）。
      this.mutate((tc) => campaign.begin(tc.state.progress.chapterId, tc, this.w.fx));
    } else {
      this.stepTurn();
      this.refreshSlots();
    }
  }

  // ── 戰役（㉝）★ ──────────────────────────────────
  //
  // 四條規格：玩家不操作、跨關不回滿、每關都可以走、
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

  /**
   * 走留的兩個數字（33 §8.1）。**不是勝率** ——
   * 是玩家自己在螢幕上會做的那個心算，只是由 ㉝ 算給他。
   */
  stageOutlook(): campaign.StageOutlook | null {
    return campaign.stageOutlook(this.ctx, this.w.fx);
  }

  /** 七關的全貌：獎勵曲線、關底敵將、唯一掉落、走到哪了。 */
  stageRows(): readonly campaign.StageRow[] { return campaign.stageRows(this.ctx); }
  previousStage(): campaign.StagePreview | null { return campaign.nextStagePreview(this.ctx, (this.state.campaign?.clearedStages ?? 0) - 1); }
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
    if (this.state.campaign?.phase !== 'configuring') throw new Error('戰役已開打，配置已凍結');
    // Learning at preparation may change troop/supply limits. Snapshot only on departure.
    this.mutate((tc) => campaign.configure(loadout, {
      ...tc, state: campaign.begin(tc.state.progress.chapterId, tc, this.w.fx),
    }));
  }
  realtimeSkillInfo(id:SkillId,notable?:NotableId):ReturnType<typeof realtimeSkill> {
    const nd=notable?this.w.defs.reader('notable').get(String(notable)):null;
    const attrs=nd?.abilities.attrs??{lead:statQuery.attr('lead',this.ctx),war:statQuery.attr('war',this.ctx),int:statQuery.attr('int',this.ctx),pol:statQuery.attr('pol',this.ctx)};
    return realtimeSkill(this.ctx,this.w.fx,id,nd?this.w.defs.text(String(nd.nameKey)):'主角',0,!!nd,attrs,notable?this.w.defs.single('notableStar').commanderLevelByStar[this.state.metaSnapshot.notableCodex[String(notable)]?.star??0]:1);
  }
  /** Calculate a lesson's result with the combat resolver, without buying or mutating a save. */
  previewSkillLevel(id:SkillId,level:number):ReturnType<typeof realtimeSkill> {
    const max=this.w.defs.single('growthRule').learning.power.length;
    const previewLevel=Math.max(1,Math.min(max,Math.floor(level)||1));
    const ctx={...this.ctx,state:{...this.state,abilities:{...this.state.abilities,
      skills:ability.hasSkill(id,this.ctx)?this.state.abilities.skills:[...this.state.abilities.skills,id],
      levels:{...this.state.abilities.levels,[String(id)]:previewLevel},
    }}};
    const attrs={lead:statQuery.attr('lead',ctx),war:statQuery.attr('war',ctx),int:statQuery.attr('int',ctx),pol:statQuery.attr('pol',ctx)};
    return realtimeSkill(ctx,this.w.fx,id,'主角',0,false,attrs);
  }
  campaignWaveTroops(index:number):number { return campaign.nextStagePreview(this.ctx,index)?.enemyTroops??0; }
  /** Live battle is part of the save. Re-entering never rerolls or replenishes it. */
  startRealtimeCampaign(): BattleState {
    const st=this.state.campaign;
    if(!st||st.phase!=='awaitingDecision'||!st.loadout)throw new Error('請先完成出戰配置');
    if(st.realtime)return st.realtime;
    if(st.log.length)throw new Error('舊版戰役須先完成原有走留決策');
    const realtime=campaignBattle(this.ctx,this.w.fx);startBattle(realtime);
    this.state={...this.state,campaign:{...st,realtime,confrontation:campaignConfrontation(this.ctx,realtime)}};this.state=prepareFieldStory(this.ctx);return realtime;
  }
  advanceRealtimeCampaign(delta:number):void {
    this.state=prepareFieldStory(this.ctx);
    const st=this.state.campaign,b=st?.realtime;
    if(!st||!b)return;
    if(st.fieldStory){const p=st.fieldStory;p.field.encounter.battle=b;tickStoryField(p.data,p.field,delta);this.state=bankFieldRewards(this.ctx);this.state=story.recordStoryDepth(this.state.progress.chapterId,Math.min(7,realtimeRewards(this.ctx).cleared),this.ctx);if(p.field.triggered&&p.field.mode==='field'){const {fieldStory:discard,...rest}=this.state.campaign!;void discard;this.state={...this.state,campaign:{...rest,...(rest.confrontation?{confrontation:{...rest.confrontation,attempted:true,waveSeen:b.wave}}:{}),seenFieldStories:[...(rest.seenFieldStories??[]),p.data.id]}};}return;}
    if(st.confrontation){const encounter={...st.confrontation,battle:b};tickEncounterDemo(encounter,delta);const {battle:unused,...confrontation}=encounter;void unused;this.state={...this.state,campaign:{...st,confrontation}};}else tickBattle(b,delta);
    this.state=story.recordStoryDepth(this.state.progress.chapterId,Math.min(7,realtimeRewards(this.ctx).cleared),this.ctx);
    if(b.status==='running'&&b.phase==='fallen'&&b.defeated==='ally'&&!st.rallied&&this.w.fx.chargesOf(CHARGES.majorRetry,this.ctx)>0){
      rallyArmy(b,this.w.defs.single('battleRule').rallyRatio);
      this.state={...consumeCharge(CHARGES.majorRetry,this.ctx),campaign:{...this.state.campaign!,rallied:true,realtime:b}};
    }
  }
  castRealtimeSkill(id:string):boolean {
    const b=this.state.campaign?.realtime;return b&&this.state.campaign?.fieldStory?.field.mode!=='story'&&!this.state.campaign?.confrontation?.contest?castSkill(b,id):false;
  }
  realtimeConfrontation():EncounterDemo|null {const c=this.state.campaign;if(c?.fieldStory)return c.fieldStory.field.encounter;const e=c?.realtime&&c.confrontation?{...c.confrontation,battle:c.realtime}:null;if(e?.contest?.duel&&e.contest.allyId==='lord')equipment.equipDuel(e.contest.duel.ally,this.ctx);return e;}
  answerRealtimeDuel(choice:number):boolean {if(this.state.campaign?.realtime?.status!=='running')return false;const p=this.state.campaign?.fieldStory;if(p){const action=DUEL_ACTIONS[choice];return !!action&&answerFieldDuel(p.data,p.field,action);}const e=this.realtimeConfrontation();if(!e||!answerContest(e,choice))return false;const {battle:unused,...confrontation}=e;void unused;this.state={...this.state,campaign:{...this.state.campaign!,confrontation}};return true;}
  get battlefieldStory(){return this.state.campaign?.fieldStory;}
  advanceBattleStory(revision:number,choice?:string){const p=this.battlefieldStory;if(!p||p.field.encounter.battle.status!=='running')return false;const ok=advanceFieldStory(p.data,p.field,revision,choice);this.state=bankFieldRewards(this.ctx);return ok;}
  answerBattleDebate(side:RallySide,action:RallyAction){const p=this.battlefieldStory;return !!p&&p.field.encounter.battle.status==='running'&&answerStoryDebate(p.data,p.field.story,side,action);}
  finishBattleDebate(){const p=this.battlefieldStory;if(p?.field.story.rally?.winner){advanceStory(p.data,p.field.story,p.field.story.revision);this.state=bankFieldRewards(this.ctx);}}
  pauseRealtimeCampaign(paused:boolean):void {
    const b=this.state.campaign?.realtime;
    if(b&&(b.status==='running'||b.status==='paused'))b.status=paused?'paused':'running';
  }
  realtimeCampaignResult(): ReturnType<typeof realtimeRewards> { return realtimeRewards(this.ctx); }
  settleRealtimeCampaign():void {
    const st=this.state.campaign,b=st?.realtime;
    if(!st||!b||b.status!=='finished')throw new Error('戰役尚未結束');
    const result=realtimeRewards(this.ctx);
    this.state={...this.state,campaign:{...st,phase:'resolved',clearedStages:result.cleared,banked:result.rewards,host:{...st.host,troops:armyCount(b,'ally'),supply:Math.floor(b.supply)}}};
    this.closeCampaign();
  }
  rememberCampaign(loadout: BattleLoadout): void {
    if (this.state.campaign?.phase !== 'configuring') return;
    this.state = { ...this.state, campaign: { ...this.state.campaign, loadout } };
  }

  /**
   * 打下一關。回傳結果供呈現層播戰報 —— 戰報是玩家唯一的資訊來源（33 §7）。
   *
   * ★ 回傳型別由 `StageOutcome` 從本檔轉出（見檔尾）：
   * `ui/` 不得直接 import `modules/`，而它需要這個型別去演戰鬥（D67）。
   */
  engage(): campaign.StageOutcome {
    if (this.storyScene) throw new Error('請先確認戰役中的劇情成果');
    if(this.state.campaign?.realtime)throw new Error('即時戰役不能使用舊版逐關結算');
    const box: { value: campaign.StageOutcome | null } = { value: null };
    this.mutate((tc) => {
      const r = campaign.engage(tc, this.w.fx);
      box.value = r.outcome;
      return r.state;
    });
    const outcome = box.value;
    if (outcome === null) throw new Error('戰役結算未回傳結果');
    this.state = story.recordStoryDepth(this.state.progress.chapterId,
      this.state.campaign?.clearedStages ?? 0, this.ctx);
    // 戰敗【不再夢醒】—— ㉝ 已把 banked 減半，這裡走與收兵相同的收尾。
    if (outcome.defeated) this.closeCampaign();
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
      if (this.storyScene) return { cleared, stopped: 'threat' };
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
    if(this.state.campaign?.realtime)throw new Error('請先完成即時戰役結算');
    this.mutate((tc) => campaign.withdraw(tc));
    this.closeCampaign();
  }

  /**
   * 戰役收尾：獎勵入帳 → 重算官階 → 過章。**戰敗與收兵共用這一條** ★
   *
   * 兩者唯一的差別在 ㉝ 那一側：戰敗時 `banked` 已經減半。
   * 收尾只有一條路，「戰敗的章節到底算不算過」就不可能有兩種答案。
   */
  private closeCampaign(): void {
    this.state = story.recordStoryDepth(this.state.progress.chapterId,
      this.state.campaign?.clearedStages ?? 0, this.ctx);
    const banked = campaign.bankedOf(this.ctx);
    this.mutate((tc) => this.applyRewards(banked, tc.state, tc));
    this.mutate((tc) => careerService.reevaluate({ state: tc.state, defs: tc.defs }));
    this.mutate((tc) => {
      const chapter = turn.currentChapter(tc);
      return {
        ...campaign.clear(tc),
        progress: {
          ...tc.state.progress,
          chaptersPassed: tc.state.progress.chaptersPassed + 1,
          pendingCampaign: false,
          pendingFactionChoice: chapter.onPass === 'chooseFaction',
        },
      };
    });
    this.state = story.closeStoryChapter(this.ctx);
    if (!story.awaitingChapterClose(this.ctx)) this.state=economy.setCamp(true,this.ctx);
  }

  /** 已保住的獎勵入帳。戰敗時走的是同一條，只是 `banked` 已在 ㉝ 減半。 */
  private applyRewards(
    rewards: readonly EventReward[], from: RunState, tc: TurnContext,
  ): RunState {
    let s = from;
    const at = (): RunContext => ({ state: s, defs: tc.defs });
    for (const [rewardIndex,r] of rewards.entries()) {
      if (r.kind === 'merit') s = this.w.writer.grantMerit(r.merit, r.amount, at());
      else if (r.kind === 'attr') s = growth.grantGrowth(r.attr, growth.previewGrowth(r.attr,r.amount,at()),at(),this.w.fx);
      else if (r.kind === 'money') s = economy.transact('campaign/'+tc.state.progress.chapter+'/'+rewardIndex,Math.round(r.amount),'戰役薪餉',at());
      else if (r.kind === 'affinity' && r.notableId !== null) {
        s = roster.addAffinity(r.notableId, r.amount, at());

      } else if (r.kind === 'unlock') {
        s = growth.grantUnlock(r.trait, r.skill, at(), 'campaign/' + tc.state.progress.chapter + '/' + rewardIndex);
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

  gradeOf(attr: Attr): AttrGrade { return growth.gradeOf(attr, this.ctx); }
  /** 那一維【本輪】的天花板（資質決定）。不是尺度上限 —— 見 ⑳ attrCapOf。 */
  attrCap(attr: Attr): number { return growth.attrCap(attr, this.ctx); }

  /** 那一維的資質階。天花板旁邊要寫著它，否則玩家不知道什麼買得動那道牆。 */
  aptitudeOf(attr: Attr): AptitudeGrade { return growth.aptitudeOf(attr, this.ctx); }

  /** 四維的尺度上限（100）。等級表 G..S 畫在這條尺上。 */
  attrScale(): number { return defsAttrMax(this.ctx); }

  /**
   * 身上的道具 ★ **舊版 UI 拿不到這個，所以道具形同不存在**
   *
   * 道具的效果一直有在生效（`itemEffectSource` 掛在效果系統上），
   * 但畫面上唯一的露出是回合紀錄裡一個 `◆`。玩家玩完一整輪，
   * 不知道自己拿過什麼、那些東西做了什麼、也不知道有【碎片升階】這回事。
   *
   * 這裡把「已解放的階」也一起攤平成一行說明：道具的階是跨輪成長
   * （碎片換階，與名士星階同構），看不到它就等於那條線不存在。
   */
  heldItems(): readonly {
    readonly itemId: ItemIdT;
    readonly name: string;
    readonly desc: string;
    readonly count: number;
    readonly tier: number;
  }[] {
    const meta = this.state.metaSnapshot;
    return item.heldItems(this.ctx).map((id) => {
      const def = this.w.defs.reader('item').get(String(id));
      const tiers = item.itemCodex.unlockedTiers(id, meta, this.w.defs);
      return {
        itemId: id,
        name: this.w.defs.text(String(def.nameKey)),
        desc: tiers.map((x) => this.w.defs.text(String(x.descKey))).join('；'),
        count: item.heldCount(id, this.ctx),
        tier: item.itemCodex.tierOf(id, meta),
      };
    });
  }

  private afterChapterPassed(): void {
    if (this.state.progress.pendingFactionChoice) return;
    const seq = turn.sequenceOf(this.state.faction, this.ctx);
    const idx = seq.indexOf(this.state.progress.chapterId);
    if (idx >= 0 && idx < seq.length - 1) {
      this.stepTurn();
      this.refreshSlots();
    } else {
      const candidates = ending.candidatesFor(ending.SEQUENCE_DONE, this.ctx).filter(e => (e.storyRequirements?.length ?? 0) > 0);
      if (candidates.length > 1) this.state = story.setEndingChoice(true, this.ctx);
      else this.mutate((tc) => ending.reachEnding(ending.SEQUENCE_DONE, tc));
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

  canInviteSuperior(id:NotableId, picked:readonly NotableId[]):boolean {
    if(picked.includes(id))return true;
    if(picked.length>=this.bondQuota()||!this.superiorCandidates().includes(id))return false;
    const known=(who:NotableId)=>!!this.state.metaSnapshot.notableCodex[String(who)]?.completedWith;
    return known(id)||picked.filter(who=>!known(who)).length<faction.bondLevelOf(this.state.faction!,this.ctx);
  }
  newcomerBonus(): number { return roster.newcomerBonus(this.ctx); }
  bondQuota(): number {
    const f = this.state.faction;
    if (f === null) return 0;
    return Math.min(
      faction.bondLevelOf(f, this.ctx) + this.superiorCandidates().filter(id => this.state.metaSnapshot.notableCodex[String(id)]?.completedWith).length,
      this.w.defs.single('gameRules').superiorCount,
    );
  }

  assignSuperiors(chosen: readonly NotableId[]): void {
    if (!this.needsSuperiors || this.needsChapterCamp) return;
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
    return settle(this.summary(), this.preserveUnlocks(meta), this.w.defs);
  }
}

/**
 * 轉出給呈現層 ★ —— `ui/` 只能經 `app/` 取用核心（verify:discipline 第 4 條）。
 * 戰鬥演出需要 `engage()` 的回傳型別，這一行就是那道門。
 */
export type { StageOutcome } from '../modules/campaign.js';
export type { LearningOffer } from '../modules/learning.js';
