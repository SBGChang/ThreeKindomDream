import type { RunContext } from '../contracts/core/context.js';

/** Guidance belongs to the active party, frozen at entry, never the whole codex. */
export function guidance(ctx: RunContext, kind: 'growth' | 'merit'): number {
  const rule = ctx.defs.single('notableStar');
  const table = kind === 'growth' ? rule.growthByStar : rule.meritByStar;
  const party = ctx.state.roster.members;
  if (!party.length) return 1;
  return party.reduce((sum, member) => sum + (table[ctx.state.metaSnapshot.notableCodex[String(member.notableId)]?.star ?? 0] ?? 1), 0) / party.length;
}

/** Longer narratives share the same faction-growth budget; the common opening is unchanged. */
export function routePace(ctx: RunContext): number {
  if (ctx.state.faction === null) return 1;
  const count = ctx.defs.reader('chapterSequence').all().find(s => s.factionId === ctx.state.faction)?.chapters.length ?? 3;
  return Math.min(1, 3 / Math.max(1, count));
}

export function routeChapters(ctx: RunContext): readonly string[] {
  const sequences = ctx.defs.reader('chapterSequence').all();
  return [...(sequences.find(s => s.factionId === null)?.chapters ?? []),
    ...(ctx.state.faction === null ? [] : sequences.find(s => s.factionId === ctx.state.faction)?.chapters ?? [])];
}
