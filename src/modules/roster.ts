// ⑲ 名士局內狀態 · 變更操作（需要 RNG 者收 TurnContext）。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { AffinityStage } from '../contracts/core/primitives.js';
import type { RosterMember, RunState } from '../contracts/core/state.js';
import type { EffectResolver } from './effect.js';
import { notableCodex } from './notable-codex.js';
import {
  ATTR_ORDER, baseOf, companionCandidates, link, maxAffinity, rosterIds, withRoster,
} from './roster-query.js';

export * from './roster-query.js';

export function assembleCompanions(ctx: TurnContext, fx: EffectResolver): RunState {
  const rules = ctx.defs.single('gameRules');
  const picked: NotableId[] = [...ctx.state.config.designatedCompanions];
  let remaining = companionCandidates(ctx).filter((id) => !picked.includes(id));
  while (picked.length < rules.companionCount && remaining.length > 0) {
    const chosen = ctx.rng.pick('notable.roster', remaining);
    picked.push(chosen);
    remaining = remaining.filter((x) => x !== chosen);
  }

  const cap = maxAffinity(ctx);
  let built: RosterMember[] = picked.map((id) => ({
    notableId: id,
    affinity: Math.min(cap, notableCodex.startAffinity(id, ctx.state.metaSnapshot)),
    origin: 'companion',
    firedStages: [],
  }));

  // AffinityGrant（timing=onDreamEnter）：天賦與名士的開局好感補正
  const staged: RunContext = { state: withRoster(ctx, built), defs: ctx.defs };
  for (const g of fx.startAffinityGrants(staged)) {
    if (g.rule === 'allRoster') {
      built = built.map((m) => ({ ...m, affinity: Math.min(cap, m.affinity + g.amount) }));
    } else if (g.rule === 'randomRoster' && built.length > 0) {
      const target = ctx.rng.pick('notable.roster', built.map((m) => m.notableId));
      built = built.map((m) => (m.notableId === target
        ? { ...m, affinity: Math.min(cap, m.affinity + g.amount) } : m));
    }
  }
  return withRoster(ctx, built);
}

/**
 * 幼年抽到的人，成年不會再抽到 ★
 *
 * 兒時玩伴與陣營上司來自同一批名士，因此上司抽補必須排除【已在陣容中的人】。
 * 少了這條，同一個人會在一輪裡出現兩次 —— 好感度分裂成兩筆、站位分配把他算兩次、
 * 事件鏈也會重複觸發。
 *
 * 排除來源刻意用 `roster.members` 現算，不另存一份「已抽過名單」：
 * 陣容成員只增不減，它本身就是完整的答案（同 15 §2.1 的理由）。
 *
 * 池若被玩伴掏空，上司會少於 `superiorCount` —— 由 02 的規則驗證擋在載入期
 * （池的成員數必須 ≥ companionCount ＋ superiorCount）。
 */
export function assignSuperiors(chosen: readonly NotableId[], ctx: TurnContext): RunState {
  if (ctx.state.faction === null) throw new Error('未入陣營，不可分配上司');
  const rules = ctx.defs.single('gameRules');
  const faction = ctx.defs.reader('faction').get(String(ctx.state.faction));
  const pool = ctx.defs.reader('notablePool').get(String(faction.superiorPoolId));
  const taken = new Set([...rosterIds(ctx).map(String), ...chosen.map(String)]);

  const picked: NotableId[] = [...chosen];
  let remaining = pool.entries.filter((e) => !taken.has(String(e.notableId)));
  while (picked.length < rules.superiorCount && remaining.length > 0) {
    const e = ctx.rng.weighted('notable.roster',
      remaining.map((x) => ({ item: x, weight: x.weight })));
    picked.push(e.notableId);
    remaining = remaining.filter((x) => x.notableId !== e.notableId);
  }

  const cap = maxAffinity(ctx);
  const added: RosterMember[] = picked.map((id) => ({
    notableId: id,
    affinity: Math.min(cap, notableCodex.startAffinity(id, ctx.state.metaSnapshot)),
    origin: 'superior',
    firedStages: [],
  }));
  return withRoster(ctx, [...ctx.state.roster.members, ...added]);
}

/** 每回合把陣容分配到四個行動格。順序固定 —— 改動即破壞可重播（19 §4.1）。 */
export function distributeSlots(
  ctx: TurnContext, fx: EffectResolver,
): readonly (readonly NotableId[])[] {
  const cap = link(ctx).maxPerSlot;
  const slots: NotableId[][] = [[], [], [], []];
  for (const m of ctx.state.roster.members) {
    const open = slots.map((s, i) => ({ i, ok: s.length < cap })).filter((x) => x.ok);
    if (open.length === 0) continue;
    const base = baseOf(m.notableId, ctx);
    const entries = open.map((o) => {
      const attr = ATTR_ORDER[o.i];
      if (attr === undefined) throw new Error('unreachable');
      // 基底的專長傾向從第一回合就生效；SlotBias 效果是解鎖條再疊上去的（19 §4）。
      // 這是【權重】不是限制 —— 任何名士仍可能站到任何一格，否則格子就固定了，
      // 「紅光但沒人站 vs 無光但他站著」的糾結會消失。
      const specialty = base.specialty === attr ? base.specialtyWeight : 1;
      return { item: o.i, weight: specialty * fx.slotBias(String(m.notableId), attr, ctx) };
    });
    const idx = ctx.rng.weighted('notable.slot', entries);
    slots[idx]?.push(m.notableId);
  }
  return slots;
}

export function gainAffinity(
  ids: readonly NotableId[], ctx: RunContext, fx: EffectResolver,
): RunState {
  const gain = Math.round(link(ctx).gainPerTraining * fx.affinityGrowthMul(ctx));
  const cap = maxAffinity(ctx);
  return withRoster(ctx, ctx.state.roster.members.map((m) => (
    ids.includes(m.notableId) ? { ...m, affinity: Math.min(cap, m.affinity + gain) } : m
  )));
}

export function addAffinity(id: NotableId, amount: number, ctx: RunContext): RunState {
  const cap = maxAffinity(ctx);
  return withRoster(ctx, ctx.state.roster.members.map((m) => (
    m.notableId === id ? { ...m, affinity: Math.min(cap, m.affinity + amount) } : m
  )));
}

export function markChainFired(
  id: NotableId, stage: AffinityStage, ctx: RunContext,
): RunState {
  return withRoster(ctx, ctx.state.roster.members.map((m) => (
    m.notableId === id ? { ...m, firedStages: [...m.firedStages, stage] } : m
  )));
}
