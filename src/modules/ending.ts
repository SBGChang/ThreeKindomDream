// ㉕ 結局判定。結局是夢裡真正發生的事，達成之後才夢醒（25 §1）。
import type { RunContext } from '../contracts/core/context.js';
import type { EndingDef, EndingTrigger } from '../contracts/core/definitions.js';
import type { Attr, MoralBand } from '../contracts/core/primitives.js';
import type { EndingOutcome, RunState } from '../contracts/core/state.js';
import { evaluateCondition } from './effect-core.js';
import { statQuery } from './stats.js';

const readStat = statQuery.read.bind(statQuery);

export function moralBandOf(ctx: RunContext): MoralBand {
  const value = statQuery.fame('moral', ctx);
  const bands = ctx.defs.single('gameRules').moralBands;
  const found = bands.find((b) => value >= b.min && value <= b.max);
  return found?.band ?? 'neutral';
}

const triggerMatches = (def: EndingDef, t: EndingTrigger): boolean => {
  if (def.trigger.kind !== t.kind) return false;
  if (def.trigger.kind === 'checkFailed' && t.kind === 'checkFailed') {
    return def.trigger.attr === 'any' || def.trigger.attr === t.attr;
  }
  return true;
};

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
  const band = moralBandOf(ctx);
  return {
    endingId: best.ending,
    moralBand: band,
    titleKey: best.titleKey,
    bodyKey: best.moralVariants[band],
    pointsMultiplier: best.pointsMultiplier,
    isFullDream: best.endingKind === 'fullDream',
  };
}

export const reachEnding = (trigger: EndingTrigger, ctx: RunContext): RunState =>
  ({ ...ctx.state, ending: resolveEnding(trigger, ctx) });

export const failedByAttr = (attr: Attr): EndingTrigger => ({ kind: 'checkFailed', attr });
export const SEQUENCE_DONE: EndingTrigger = { kind: 'sequenceCompleted' };
export const NO_FACTION: EndingTrigger = { kind: 'noFactionEligible' };
