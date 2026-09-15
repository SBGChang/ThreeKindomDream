// ㉖ 結算產出。RunState → MetaState 的唯一交接點（26 §1）。
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { AffinityStage } from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import type { MetaState, RunState, RunSummary } from '../contracts/core/state.js';
import { awardItemFragments } from './item.js';
import { awardNotableFragments } from './notable-codex.js';
import { stageForValue } from './roster-query.js';

export interface SettlementResult {
  readonly meta: MetaState;
  readonly pointsGained: number;
  readonly notableFragments: Readonly<Record<string, number>>;
  /** 本次結算升了幾星。碎片自動換升星（10 §2）—— 不再是初始好感的點數。 */
  readonly starRaised: Readonly<Record<string, number>>;
  /** 道具碎片。【第二次以後才算】—— 首次獲得換到的是圖鑑登錄（23 §7）。 */
  readonly itemFragments: Readonly<Record<string, number>>;
  readonly itemTierRaised: Readonly<Record<string, number>>;
}

/** 只收摘要，不收整個 RunState —— 讓「結算需要什麼」成為明確契約（26 §3）。 */
export function summarize(run: RunState, defs: DefinitionRegistry): RunSummary {
  const ending = run.ending;
  if (ending === null) throw new Error('尚未達成結局，不可結算');
  const ctx = { state: run, defs };
  const chapterDepths = { ...run.story.depths };
  if (run.campaign) chapterDepths[String(run.progress.chapterId)] = Math.max(
    chapterDepths[String(run.progress.chapterId)] ?? 0, run.campaign.clearedStages);
  const notables: { notableId: NotableId; finalStage: AffinityStage; attendance:number }[] =
    run.roster.members.map((m) => ({
      notableId: m.notableId,
      finalStage: stageForValue(m.affinity, ctx),
      attendance: Math.max(0, run.progress.turn - (m.joinedTurn ?? (m.origin === 'companion' ? 1 : 9)) + 1),
      ...(m.entryBonus!==undefined?{interactionCap:defs.single('growthRule').economy.interactionFragmentCaps[Math.min(m.interactionTurns?.length??0,8)]!}:{}),
    }));

  return {
    ...(run.runId ? {runId:run.runId} : {}),
    seed: run.seed,
    endingId: ending.endingId,
    isFullDream: ending.isFullDream,
    pointsMultiplier: ending.pointsMultiplier,
    career: run.career,
    chaptersPassed: run.progress.chaptersPassed,
    turnsPlayed: run.progress.turn,
    factionId: run.faction,
    notables,
    seenUniqueEvents: run.turn.seenUniqueIds,
    itemsAcquired: run.items.count, pendingItemFragments:run.items.fragments??{},
    actions: run.actions,
    glowResults: run.metaSnapshot.stats.glowResults,
    attributes: run.attributes,
    learnedTraits: run.abilities.traits,
    learnedSkills: run.abilities.skills,
    chapterDepths,
    completedRoutes: run.story.milestones,
    stagesCleared: Object.values(chapterDepths).reduce((total, depth) => total + depth, 0),
  };
}

function routeLength(summary: RunSummary, defs: DefinitionRegistry): number {
  const seq = defs.reader('chapterSequence').all();
  return (seq.find(s => s.factionId === null)?.chapters.length ?? 1)
    + (summary.factionId === null ? 0 : seq.find(s => s.factionId === summary.factionId)?.chapters.length ?? 0);
}

function completedLife(summary: RunSummary, defs: DefinitionRegistry): boolean {
  return summary.factionId !== null && summary.chaptersPassed >= routeLength(summary, defs);
}

export function computeSettlementPoints(
  summary: RunSummary, defs: DefinitionRegistry,
): number {
  const f = defs.single('settlementFormula');
  const chapters = routeLength(summary, defs);
  const scale = Math.min(1, f.referenceChapters / Math.max(1, chapters));
  const completed = completedLife(summary, defs);
  const bonus = f.endingBonuses.filter(row => summary.pointsMultiplier >= row.multiplier).at(-1)?.points ?? 0;
  const depth = Object.values(summary.chapterDepths ?? {}).reduce((sum, n) => sum + Math.min(7, n), 0);
  return Math.round((summary.career.civil + summary.career.martial) * f.perCareerRank
    + (summary.chaptersPassed * f.perChapterPassed + summary.turnsPlayed * f.perTurnSurvived + depth * f.perStage) * scale
    + (completed ? f.fullDreamBonus + bonus : 0));
}

/** 同一人生只結算一次；舊存檔仍以 seed 識別，新人生允許沿用種子。 */
export function settle(
  summary: RunSummary, meta: MetaState, defs: DefinitionRegistry,
): SettlementResult {
  if (summary.runId ? meta.settledRunIds?.includes(summary.runId) : meta.settledSeeds.includes(summary.seed)) {
    return {
      meta, pointsGained: 0, notableFragments: {}, starRaised: {},
      itemFragments: {}, itemTierRaised: {},
    };
  }

  const points = computeSettlementPoints(summary, defs);
  // 人物記憶獎勵取決於有沒有走完人生，不因普通結局而失去同行資格。
  const frag = awardNotableFragments(summary.notables, completedLife(summary, defs), meta, defs);
  const items = awardItemFragments(summary.itemsAcquired, frag.meta, defs, summary.pendingItemFragments);

  const seenEvents = [...new Set([
    ...items.meta.collection.seenEvents.map(String),
    ...summary.seenUniqueEvents.map(String),
  ])] as unknown as typeof items.meta.collection.seenEvents;
  const reachedEndings = [...new Set([
    ...items.meta.collection.reachedEndings.map(String),
    String(summary.endingId),
  ])] as unknown as typeof items.meta.collection.reachedEndings;

  const nextMeta: MetaState = {
    ...items.meta,
    points: items.meta.points + points,
    runIndex: items.meta.runIndex + 1,
    settledSeeds: [...new Set([...items.meta.settledSeeds, summary.seed])],
    settledRunIds: [...(items.meta.settledRunIds ?? []), ...(summary.runId ? [summary.runId] : [])],
    collection: { ...items.meta.collection, seenEvents, reachedEndings,
      completedRoutes: [...new Set([...(items.meta.collection.completedRoutes ?? []), ...(summary.completedRoutes ?? [])])] },
    stats: {
      ...items.meta.stats,
      stagesCleared: (items.meta.stats.stagesCleared ?? 0) + summary.stagesCleared,
      runsStarted: items.meta.stats.runsStarted,
      runsFullDream: items.meta.stats.runsFullDream + (summary.isFullDream ? 1 : 0),
      chaptersPassed: items.meta.stats.chaptersPassed + summary.chaptersPassed,
      turnsPlayed: items.meta.stats.turnsPlayed + summary.turnsPlayed,
      actionsByAttr: Object.fromEntries(ATTRS.map((at) => [
        at, (items.meta.stats.actionsByAttr[at] ?? 0) + summary.actions[at],
      ])) as MetaState['stats']['actionsByAttr'],
      pointsEarnedTotal: items.meta.stats.pointsEarnedTotal + points,
    },
  };

  return {
    meta: nextMeta,
    pointsGained: points,
    notableFragments: frag.gained,
    starRaised: frag.raised,
    itemFragments: items.gained,
    itemTierRaised: items.raised,
  };
}
