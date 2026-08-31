// ⑲ 名士局內狀態 · 變更操作（需要 RNG 者收 TurnContext）。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { NotableTarget } from '../contracts/core/effects.js';
import type { RosterMember, RunState } from '../contracts/core/state.js';
import type { AffinityGrantOutcome, EffectResolver } from './effect.js';
import { ATTRS } from '../contracts/core/primitives.js';
import {
  baseOf, companionCandidates, link, maxAffinity, rosterIds, withRoster,
} from './roster-query.js';

export * from './roster-query.js';

/**
 * 入夢時的起始好感（10 §2）★
 *
 * 底線是全體共通的一個值，逐人的差異由星階解鎖條的 `AffinityGrant` 相加。
 * 舊版由一張全域星階表推導，於是「典韋二星就到 60、曹操二星才 40」
 * 這種逐人設計在資料上無法表達 —— 同一階只能給同一個值。
 */
const seedAffinity = (ctx: RunContext): number =>
  ctx.defs.single('affinityCurve').baseStartAffinity;

/** 這條好感補正打不打得到某位名士。與效果系統的 `NotableTarget` 同一套語意。 */
function grantHits(
  g: AffinityGrantOutcome, id: NotableId, ctx: RunContext,
): boolean {
  switch (g.target.kind) {
    case 'all': return true;
    case 'self': return g.owner !== null && g.owner === id;
    case 'named': return g.target.notableId === id;
    case 'specialty': return baseOf(id, ctx).specialty === g.target.attr;
  }
}

/** 把一組補正套到一份陣容上。玩伴與上司兩處共用 —— 規則只有一份。 */
function applyGrants(
  built: readonly RosterMember[], ctx: RunContext, fx: EffectResolver,
): readonly RosterMember[] {
  const cap = maxAffinity(ctx);
  const staged: RunContext = { state: withRoster(ctx, built), defs: ctx.defs };
  const grants = fx.startAffinityGrants(staged);
  return built.map((m) => {
    const add = grants
      .filter((g) => grantHits(g, m.notableId, staged))
      .reduce((sum, g) => sum + g.amount, 0);
    return { ...m, affinity: Math.min(cap, m.affinity + add) };
  });
}

export function assembleCompanions(ctx: TurnContext, fx: EffectResolver): RunState {
  const rules = ctx.defs.single('gameRules');
  const picked: NotableId[] = [...ctx.state.config.designatedCompanions];
  let remaining = companionCandidates(ctx).filter((id) => !picked.includes(id));
  while (picked.length < rules.companionCount && remaining.length > 0) {
    const chosen = ctx.rng.pick('notable.roster', remaining);
    picked.push(chosen);
    remaining = remaining.filter((x) => x !== chosen);
  }

  const seed = seedAffinity(ctx);
  const built: RosterMember[] = picked.map((id) => ({
    notableId: id, affinity: seed, origin: 'companion',
  }));
  return withRoster(ctx, applyGrants(built, ctx, fx));
}

/**
 * 幼年抽到的人，成年不會再抽到 ★
 *
 * 兒時玩伴與陣營上司來自同一批名士，因此上司抽補必須排除【已在陣容中的人】。
 * 少了這條，同一個人會在一輪裡出現兩次 —— 好感度分裂成兩筆、站位分配把他算兩次、
 * 事件鏈也會重複觸發。
 */
export function assignSuperiors(
  chosen: readonly NotableId[], ctx: TurnContext, fx: EffectResolver,
): RunState {
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

  const seed = seedAffinity(ctx);
  const added: RosterMember[] = picked.map((id) => ({
    notableId: id, affinity: seed, origin: 'superior',
  }));
  // 補正只套在【新加入的人】身上 —— 已在陣容者早就套過，再套一次是重複發放。
  return withRoster(ctx, [...ctx.state.roster.members, ...applyGrants(added, ctx, fx)]);
}

/**
 * 每回合把陣容分配到四個行動格。順序固定 —— 改動即破壞可重播（19 §4.1）。
 *
 * 四格的基礎權重相同（`slotBaseWeight`），偏好完全由 `SlotBias` 疊上去 ——
 * 於是「統系名士更常站統御格」是星階或道具買來的，不是與生俱來的。
 * 這是【權重】不是限制：任何名士仍可能站到任何一格，否則格子就固定了。
 */
export function distributeSlots(
  ctx: TurnContext, fx: EffectResolver,
): readonly (readonly NotableId[])[] {
  const lb = link(ctx);
  const slots: NotableId[][] = [[], [], [], []];
  for (const m of ctx.state.roster.members) {
    const open = slots.map((s, i) => ({ i, ok: s.length < lb.maxPerSlot }))
      .filter((x) => x.ok);
    if (open.length === 0) continue;
    const base = baseOf(m.notableId, ctx);
    const entries = open.map((o) => {
      const attr = ATTRS[o.i];
      if (attr === undefined) throw new Error('unreachable');
      const specialty = base.specialty === attr ? base.specialtyWeight : 1;
      return {
        item: o.i,
        weight: lb.slotBaseWeight * specialty * fx.slotBias(m.notableId, attr, ctx),
      };
    });
    const idx = ctx.rng.weighted('notable.slot', entries);
    slots[idx]?.push(m.notableId);
  }
  return slots;
}

/**
 * 同框帶來的好感成長（19 §5.2）★
 *
 * 成長率【逐人】計算：道具與天命可以指名某位（或某一類）加速，
 * 而站位效果全部卡在好感 60 —— 加快成長＝提早解鎖整個站位層。
 */
export function gainAffinity(
  ids: readonly NotableId[], ctx: RunContext, fx: EffectResolver,
): RunState {
  const perTraining = link(ctx).gainPerTraining;
  const cap = maxAffinity(ctx);
  return withRoster(ctx, ctx.state.roster.members.map((m) => {
    if (!ids.includes(m.notableId)) return m;
    const gain = Math.round(perTraining * fx.affinityGrowthMul(m.notableId, ctx));
    return { ...m, affinity: Math.min(cap, m.affinity + gain) };
  }));
}

export function addAffinity(id: NotableId, amount: number, ctx: RunContext): RunState {
  const cap = maxAffinity(ctx);
  return withRoster(ctx, ctx.state.roster.members.map((m) => (
    m.notableId === id ? { ...m, affinity: Math.min(cap, m.affinity + amount) } : m
  )));
}

/** 全員加好感。陳群〈定品〉那種【當局獎勵】走這條（23 §8）。 */
export function addAffinityAll(amount: number, ctx: RunContext): RunState {
  const cap = maxAffinity(ctx);
  return withRoster(ctx, ctx.state.roster.members.map(
    (m) => ({ ...m, affinity: Math.min(cap, m.affinity + amount) }),
  ));
}

export type { NotableTarget };
