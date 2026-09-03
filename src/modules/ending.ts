// ㉕ 結局判定。結局是夢裡真正發生的事，達成之後才夢醒（25 §1）。
import type { RunContext } from '../contracts/core/context.js';
import type { EndingDef, EndingTrigger } from '../contracts/core/definitions.js';
import type { Attr } from '../contracts/core/primitives.js';
import type { EndingOutcome, RunState } from '../contracts/core/state.js';
import { evaluateCondition } from './effect-core.js';
import { statQuery } from './stats.js';

const readStat = statQuery.read.bind(statQuery);

const triggerMatches = (def: EndingDef, t: EndingTrigger): boolean =>
  def.trigger.kind === t.kind;

export function candidatesFor(
  trigger: EndingTrigger, ctx: RunContext,
): readonly EndingDef[] {
  return ctx.defs.reader('ending').all()
    .filter((e) => triggerMatches(e, trigger))
    .filter((e) => e.factionId === null || e.factionId === ctx.state.faction)
    .filter((e) => e.requirements.every((c) => evaluateCondition(c, ctx, readStat)))
    .slice()
    .sort((a, b) => b.priority - a.priority);
}

/** 永不回 null —— 兜底結局的存在由載入期驗證保證，不是執行期 fallback（25 §3.1）。 */
export function resolveEnding(trigger: EndingTrigger, ctx: RunContext): EndingOutcome {
  const cands = candidatesFor(trigger, ctx);
  const best = cands[0];
  if (best === undefined) {
    throw new Error(
      `結局判定失敗：trigger=${trigger.kind} 無任何候選。`
      + '這代表內容驗證的兜底規則被繞過了（25 §3.1）。',
    );
  }
  return {
    endingId: best.ending,
    titleKey: best.titleKey,
    bodyKey: best.bodyKey,
    pointsMultiplier: best.pointsMultiplier,
    isFullDream: best.endingKind === 'fullDream',
  };
}

export const reachEnding = (trigger: EndingTrigger, ctx: RunContext): RunState =>
  ({ ...ctx.state, ending: resolveEnding(trigger, ctx) });

export const SEQUENCE_DONE: EndingTrigger = { kind: 'sequenceCompleted' };
export const NO_FACTION: EndingTrigger = { kind: 'noFactionEligible' };
