// ㉖ 結算產出。RunState → MetaState 的唯一交接點（26 §1）。
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { AffinityStage } from '../contracts/core/primitives.js';
import type { MetaState, RunState, RunSummary } from '../contracts/core/state.js';
import { awardNotableFragments } from './notable-codex.js';
import { stageForValue } from './roster-query.js';

export interface SettlementResult {
  readonly meta: MetaState;
  readonly pointsGained: number;
  readonly notableFragments: Readonly<Record<string, number>>;
  readonly affinityRaised: Readonly<Record<string, number>>;
}

/** 只收摘要，不收整個 RunState —— 讓「結算需要什麼」成為明確契約（26 §3）。 */
export function summarize(run: RunState, defs: DefinitionRegistry): RunSummary {
  const ending = run.ending;
  if (ending === null) throw new Error('尚未達成結局，不可結算');
  const ctx = { state: run, defs };
  const notables: { notableId: NotableId; finalStage: AffinityStage }[] =
    run.roster.members.map((m) => ({
      notableId: m.notableId,
      finalStage: stageForValue(m.affinity, ctx),
    }));

  return {
    seed: run.seed,
    endingId: ending.endingId,
    isFullDream: ending.isFullDream,
    pointsMultiplier: ending.pointsMultiplier,
    career: run.career,
    chaptersPassed: run.progress.chaptersPassed,
    turnsPlayed: run.progress.turn,
    factionId: run.faction,
    notables,
    seenUniqueEvents: run.slots.event.seenUniqueIds,
    actions: run.actions,
    glowResults: run.metaSnapshot.stats.glowResults,
    attributes: run.attributes,
  };
}

export function computeSettlementPoints(
  summary: RunSummary, defs: DefinitionRegistry,
): number {
  const f = defs.single('settlementFormula');
  const raw = (summary.career.civil + summary.career.martial) * f.perCareerRank
    + summary.chaptersPassed * f.perChapterPassed
    + summary.turnsPlayed * f.perTurnSurvived
    + (summary.isFullDream ? f.fullDreamBonus : 0);
  return Math.round(raw * summary.pointsMultiplier);
}

/** 冪等：同一 seed 重複結算不重複發放（26 §5.1）。 */
export function settle(
  summary: RunSummary, meta: MetaState, defs: DefinitionRegistry,
): SettlementResult {
  if (meta.settledSeeds.includes(summary.seed)) {
    return { meta, pointsGained: 0, notableFragments: {}, affinityRaised: {} };
  }

  const points = computeSettlementPoints(summary, defs);
  const frag = awardNotableFragments(summary.notables, summary.isFullDream, meta, defs);

  const seenEvents = [...new Set([
    ...frag.meta.collection.seenEvents.map(String),
    ...summary.seenUniqueEvents.map(String),
  ])] as unknown as typeof frag.meta.collection.seenEvents;
  const reachedEndings = [...new Set([
    ...frag.meta.collection.reachedEndings.map(String),
    String(summary.endingId),
  ])] as unknown as typeof frag.meta.collection.reachedEndings;

  const nextMeta: MetaState = {
    ...frag.meta,
    points: frag.meta.points + points,
    runIndex: frag.meta.runIndex + 1,
    settledSeeds: [...frag.meta.settledSeeds, summary.seed],
    collection: { seenEvents, reachedEndings },
    stats: {
      ...frag.meta.stats,
      runsStarted: frag.meta.stats.runsStarted,
      runsFullDream: frag.meta.stats.runsFullDream + (summary.isFullDream ? 1 : 0),
      chaptersPassed: frag.meta.stats.chaptersPassed + summary.chaptersPassed,
      turnsPlayed: frag.meta.stats.turnsPlayed + summary.turnsPlayed,
      actionsTraining: frag.meta.stats.actionsTraining + summary.actions.training,
      actionsEvent: frag.meta.stats.actionsEvent + summary.actions.event,
      pointsEarnedTotal: frag.meta.stats.pointsEarnedTotal + points,
    },
  };

  return {
    meta: nextMeta,
    pointsGained: points,
    notableFragments: frag.gained,
    affinityRaised: frag.raised,
  };
}
