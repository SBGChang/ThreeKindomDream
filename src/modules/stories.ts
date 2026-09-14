import type { RunContext } from '../contracts/core/context.js';
import type { EventDef } from '../contracts/core/definitions.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { RunState } from '../contracts/core/state.js';
import { affinityOf, members } from './roster-query.js';
import { evaluateCondition } from './effect-core.js';
import { statQuery } from './stats.js';
import { economyRule } from './economy.js';
export const history = (ctx: RunContext) => ctx.state.stories.history;
export const tracked = (ctx: RunContext) => ctx.state.stories.tracked;
export const storyRarity = (def: EventDef) =>
  def.progression?.rarity ??
  (def.trigger.kind === 'commission' ? def.trigger.rarity : 1);
export function blockers(def: EventDef, ctx: RunContext): string[] {
  const r = economyRule(ctx),
    star = storyRarity(def),
    out: string[] = [];
  const prior = history(ctx);
  if (
    !def.requirements.every((c) =>
      evaluateCondition(c, ctx, statQuery.read.bind(statQuery)),
    )
  )
    out.push('尚未滿足陣營或額外條件');
  if (def.unique && prior[String(def.eventDefId)]) out.push('本輪已完成');
  for (const id of def.progression?.previous ?? [])
    if (!prior[String(id)])
      out.push(
        `先完成〈${ctx.defs.text(String(ctx.defs.reader('event').get(String(id)).titleKey))}〉`,
      );
  const choice = def.progression?.choice;
  if (choice && prior[String(choice.event)]?.option !== choice.option)
    out.push('本輪選擇了另一條故事路線');
  if (def.trigger.kind === 'notable') {
    const chapter = r.storyChapter[star - 1]!;
    if (ctx.state.progress.chapter < chapter) out.push(`第${chapter}章開放`);
    for (const c of def.trigger.cast) {
      const who = ctx.defs.text(
        String(ctx.defs.reader('notable').get(String(c.notableId)).nameKey),
      );
      const member = members(ctx).find((m) => m.notableId === c.notableId);
      if (!member) {
        out.push(`${who}尚未同行`);
        continue;
      }
      const minimum = Math.max(
        r.storyAffinity[star - 1]!,
        ctx.defs
          .reader('affinityStage')
          .all()
          .find((x) => x.stage === c.minStage)!.min,
      );
      if (affinityOf(c.notableId, ctx) < minimum)
        out.push(`${who}好感 ${member.affinity}/${minimum}`);
      if ((member.cooperations ?? 0) < r.storyCooperations[star - 1]!)
        out.push(
          `${who}共事 ${member.cooperations ?? 0}/${r.storyCooperations[star - 1]}`,
        );
      const last = ctx.defs
        .reader('event')
        .all()
        .filter(
          (e) =>
            e.trigger.kind === 'notable' &&
            e.trigger.cast.some((x) => x.notableId === c.notableId),
        )
        .reduce(
          (n, e) =>
            Math.max(n, prior[String(e.eventDefId)]?.turn ?? -r.storyCooldown),
          -r.storyCooldown,
        );
      if (ctx.state.progress.turn - last < r.storyCooldown)
        out.push(`${who}故事稍後再續`);
    }
  }
  return out;
}
export function record(
  def: EventDef,
  option: number,
  passed: boolean,
  ctx: RunContext,
): RunState {
  return {
    ...ctx.state,
    stories: {
      ...ctx.state.stories,
      history: {
        ...history(ctx),
        [String(def.eventDefId)]: {
          turn: ctx.state.progress.turn,
          chapter: ctx.state.progress.chapter,
          option,
          passed,
        },
      },
      waitingSince:
        def.trigger.kind === 'notable' &&
        def.trigger.cast.some((c) => c.notableId === tracked(ctx))
          ? null
          : ctx.state.stories.waitingSince,
    },
  };
}
export function track(id: NotableId | null, ctx: RunContext): RunState {
  if (id !== null && !members(ctx).some((m) => m.notableId === id))
    return ctx.state;
  return {
    ...ctx.state,
    stories: { ...ctx.state.stories, tracked: id, waitingSince: null },
  };
}
export function updateWait(
  pool: readonly EventDef[],
  ctx: RunContext,
): RunState {
  const ready = pool.some(
    (e) =>
      e.trigger.kind === 'notable' &&
      e.trigger.cast.some((c) => c.notableId === tracked(ctx)),
  );
  return {
    ...ctx.state,
    stories: {
      ...ctx.state.stories,
      waitingSince: ready
        ? (ctx.state.stories.waitingSince ?? ctx.state.progress.turn)
        : null,
    },
  };
}
export const pityDue = (ctx: RunContext) =>
  ctx.state.stories.waitingSince !== null &&
  ctx.state.progress.turn - ctx.state.stories.waitingSince >=
    economyRule(ctx).storyPity;
