// ㉜ 養成兌現。經驗 → 能力的【唯一兌換點】（32 §1）。
//
// 現況以前是：⑯ 把產出直接寫進 attributes。玩家因此沒有「這些點數要花在哪」
// 的決策 —— 產出是既定的，不是可分配的。這個模組就是那個中間層。
//
// 兩道獨立的門（32 §5.2）：
//   解鎖決定你【能不能】學，經驗決定你【買不買得起】。
import type { RunContext } from '../contracts/core/context.js';
import type {
  AbilityCost, AttrCostBand, GrowthRuleDef, SkillDef, TraitDef,
} from '../contracts/core/definitions.js';
import type { NotableId, SkillId, TraitId } from '../contracts/core/ids.js';
import { targetId } from '../contracts/core/ids.js';
import type {
  AbilityTier, AffinityStage, Attr, AttrGrade,
} from '../contracts/core/primitives.js';
import { AFFINITY_STAGES, ATTRS } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import * as ability from './ability.js';
import type { EffectResolver } from './effect.js';
import { rosterIds, stageOf } from './roster-query.js';
import { statQuery, type StatWriter } from './stats.js';

const rule = (ctx: RunContext): GrowthRuleDef => ctx.defs.single('growthRule');
const capOf = (ctx: RunContext): number => ctx.defs.single('attributeCap').attrMax;

const bandsOf = (ctx: RunContext): readonly AttrCostBand[] =>
  rule(ctx).bands.slice().sort((a, b) => a.min - b.min);

// ── 經驗池 ────────────────────────────────────────────

export const expOf = (attr: Attr, ctx: RunContext): number => ctx.state.growth.exp[attr];

/** ⑯ 與 ⑰ 的產出入口。取代舊的 `attr.grant`（RFC-01 D32）。 */
export function grantExp(attr: Attr, amount: number, ctx: RunContext): RunState {
  if (amount <= 0) return ctx.state;
  return {
    ...ctx.state,
    growth: {
      ...ctx.state.growth,
      exp: { ...ctx.state.growth.exp, [attr]: ctx.state.growth.exp[attr] + amount },
    },
  };
}

// ── 數值：階梯計價（32 §3.1）★ ────────────────────────
//
// 價格帶與等級帶對齊是刻意的：玩家看到「武 B」就知道下一階要付約多少，
// 不需要在 UI 另外解釋一條成本曲線。

const bandAt = (value: number, ctx: RunContext): AttrCostBand => {
  const bands = bandsOf(ctx);
  const hit = bands.find((b) => value >= b.min && value <= b.max);
  if (hit !== undefined) return hit;
  const last = bands.at(-1);
  if (last === undefined) throw new Error('growthRule.bands 為空');
  return last;
};

export const gradeOf = (attr: Attr, ctx: RunContext): AttrGrade =>
  bandAt(statQuery.attr(attr, ctx), ctx).grade;

export const gradeAt = (value: number, ctx: RunContext): AttrGrade =>
  bandAt(value, ctx).grade;

/**
 * 階梯緩和（32 §6）：計價時把現值往下移 N 帶。
 * 走既有的 `StatModifier` —— 不需要為道具的三種降耗新增任何 FuncType。
 */
function shiftedCostPerPoint(
  value: number, ctx: RunContext, fx: EffectResolver,
): number {
  const bands = bandsOf(ctx);
  const at = bands.findIndex((b) => value >= b.min && value <= b.max);
  const idx = at < 0 ? bands.length - 1 : at;
  const shift = Math.trunc(fx.resolve(targetId('learn.bandShift'), 0, ctx));
  const moved = Math.max(0, Math.min(bands.length - 1, idx - shift));
  return bands[moved]?.costPerPoint ?? 0;
}

/** 從現值買到 target 的總價（已含折扣與階梯緩和）。逐點求和 —— 見 32 §9.6。 */
export function attrCost(
  attr: Attr, target: number, ctx: RunContext, fx: EffectResolver,
): number {
  const from = statQuery.attr(attr, ctx);
  const to = Math.min(target, capOf(ctx));
  let sum = 0;
  for (let v = from; v < to; v += 1) sum += shiftedCostPerPoint(v + 1, ctx, fx);
  return Math.max(0, Math.ceil(fx.resolve(targetId(`learn.cost.${attr}`), sum, ctx)));
}

export interface NextGrade {
  readonly grade: AttrGrade;
  readonly at: number;
  readonly cost: number;
}

/** 下一級的價碼 —— UI 的主要顯示。已在頂級時回 null。 */
export function nextGrade(
  attr: Attr, ctx: RunContext, fx: EffectResolver,
): NextGrade | null {
  const bands = bandsOf(ctx);
  const value = statQuery.attr(attr, ctx);
  const next = bands.find((b) => b.min > value);
  if (next === undefined) return null;
  return { grade: next.grade, at: next.min, cost: attrCost(attr, next.min, ctx, fx) };
}

// ── 特質與技能 ────────────────────────────────────────

const costEntries = (cost: AbilityCost): readonly (readonly [Attr, number])[] =>
  ATTRS.flatMap((a) => {
    const n = cost[a];
    return n === undefined || n <= 0 ? [] : [[a, n] as const];
  });

/** 一項能力的實付價碼（已含折扣）。混合消耗逐類套用各自的折扣。 */
export function abilityCost(
  cost: AbilityCost, ctx: RunContext, fx: EffectResolver,
): AbilityCost {
  const out: Partial<Record<Attr, number>> = {};
  for (const [a, n] of costEntries(cost)) {
    out[a] = Math.max(0, Math.ceil(fx.resolve(targetId(`learn.cost.${a}`), n, ctx)));
  }
  return out;
}

const affordable = (cost: AbilityCost, ctx: RunContext): boolean =>
  costEntries(cost).every(([a, n]) => expOf(a, ctx) >= n);

/**
 * 解鎖來源（32 §5）★
 *
 * 兩條路合流：
 *   1. **名士傳授** —— 他能教的就是他自己表上有的。門檻是好感階（teachStage）。
 *      這一條是【推導】的，不存 state：好感單調上升，所以清單只會變長。
 *   2. **事件／道具授予** —— 寫進 `growth.unlocked*`。
 *
 * 不另立一張「誰能教什麼」的表 —— 否則同一件事會有兩份可能漂移的資料。
 */
function meetsTeachStage(tier: AbilityTier, stage: AffinityStage, ctx: RunContext): boolean {
  const need = rule(ctx).teachStage[tier];
  return AFFINITY_STAGES.indexOf(stage) >= AFFINITY_STAGES.indexOf(need);
}

export interface TeacherRef {
  readonly notableId: NotableId;
  readonly ready: boolean;
}

/** 誰能教這一項，以及他現在教不教得動。locked 時 UI 要把來源顯示出來（32 §5.2）。 */
function teachersFor(
  has: (id: NotableId) => boolean, tier: AbilityTier, ctx: RunContext,
): readonly TeacherRef[] {
  return rosterIds(ctx)
    .filter((n) => has(n))
    .map((n) => ({ notableId: n, ready: meetsTeachStage(tier, stageOf(n, ctx), ctx) }));
}

const traitDefs = (ctx: RunContext): readonly TraitDef[] => ctx.defs.reader('trait').all();
const skillDefs = (ctx: RunContext): readonly SkillDef[] => ctx.defs.reader('skill').all();

const traitTeachers = (t: TraitDef, ctx: RunContext): readonly TeacherRef[] =>
  teachersFor(
    (n) => ctx.defs.reader('notable').get(String(n)).abilities.traits
      .some((x) => String(x) === String(t.traitId)),
    t.tier, ctx,
  );

const skillTeachers = (sk: SkillDef, ctx: RunContext): readonly TeacherRef[] =>
  teachersFor(
    (n) => {
      const nd = ctx.defs.reader('notable').get(String(n));
      const star = ctx.state.metaSnapshot.notableCodex[String(n)]?.star ?? 0;
      return nd.abilities.skills
        .some((r) => String(r.skillId) === String(sk.skillId) && r.star <= star);
    },
    sk.tier, ctx,
  );

export type OfferState = 'learnable' | 'locked' | 'unaffordable' | 'learned';

export interface AbilityOffer {
  readonly tier: AbilityTier;
  readonly cost: AbilityCost;
  readonly state: OfferState;
  readonly teachers: readonly TeacherRef[];
}
export interface TraitOffer extends AbilityOffer { readonly def: TraitDef }
export interface SkillOffer extends AbilityOffer { readonly def: SkillDef }

function stateOf(
  learned: boolean, unlocked: boolean, cost: AbilityCost, ctx: RunContext,
): OfferState {
  if (learned) return 'learned';
  if (!unlocked) return 'locked';
  return affordable(cost, ctx) ? 'learnable' : 'unaffordable';
}

/** 未解鎖的也要回傳（32 §5.2）：看不見的東西不會讓玩家想去達成它的門檻。 */
export function learnableTraits(
  ctx: RunContext, fx: EffectResolver,
): readonly TraitOffer[] {
  return traitDefs(ctx).map((def) => {
    const cost = abilityCost(def.cost, ctx, fx);
    const teachers = traitTeachers(def, ctx);
    const unlocked = teachers.some((t) => t.ready)
      || ctx.state.growth.unlockedTraits.some((x) => String(x) === String(def.traitId))
      || fx.unlockGrants(ctx).some((g) => String(g.trait) === String(def.traitId));
    const learned = ability.hasTrait(def.traitId, ctx);
    return { def, tier: def.tier, cost, teachers, state: stateOf(learned, unlocked, cost, ctx) };
  });
}

export function learnableSkills(
  ctx: RunContext, fx: EffectResolver,
): readonly SkillOffer[] {
  return skillDefs(ctx).map((def) => {
    const cost = abilityCost(def.cost, ctx, fx);
    const teachers = skillTeachers(def, ctx);
    const unlocked = teachers.some((t) => t.ready)
      || ctx.state.growth.unlockedSkills.some((x) => String(x) === String(def.skillId))
      || fx.unlockGrants(ctx).some((g) => String(g.skill) === String(def.skillId));
    const learned = ability.hasSkill(def.skillId, ctx);
    return { def, tier: def.tier, cost, teachers, state: stateOf(learned, unlocked, cost, ctx) };
  });
}

// ── 學習（唯一的扣款處）★ ─────────────────────────────
//
// 扣款與授予在【同一筆交易】—— 不存在「扣了款沒拿到」的中間狀態（32 §9.2）。
// 三個 learn* 全部收 RunContext（無 RNG）：兌換不得引入隨機，由型別保證。

function pay(cost: AbilityCost, ctx: RunContext): RunState {
  const exp = { ...ctx.state.growth.exp };
  const spent = { ...ctx.state.growth.spent };
  for (const [a, n] of costEntries(cost)) {
    exp[a] = (exp[a] ?? 0) - n;
    spent[a] = (spent[a] ?? 0) + n;
  }
  return { ...ctx.state, growth: { ...ctx.state.growth, exp, spent } };
}

export type LearnResult =
  | { readonly ok: true; readonly state: RunState }
  | { readonly ok: false; readonly reason: 'locked' | 'unaffordable' | 'already-learned' | 'capped' };

export function learnAttr(
  attr: Attr, target: number, ctx: RunContext, fx: EffectResolver, writer: StatWriter,
): LearnResult {
  const from = statQuery.attr(attr, ctx);
  if (target <= from || target > capOf(ctx)) return { ok: false, reason: 'capped' };
  const cost = attrCost(attr, target, ctx, fx);
  if (expOf(attr, ctx) < cost) return { ok: false, reason: 'unaffordable' };
  const paid = pay({ [attr]: cost }, ctx);
  const next = writer.grantAttr(attr, target - from, { state: paid, defs: ctx.defs });
  return { ok: true, state: next };
}

export function learnTrait(
  id: TraitId, ctx: RunContext, fx: EffectResolver,
): LearnResult {
  const offer = learnableTraits(ctx, fx).find((o) => String(o.def.traitId) === String(id));
  if (offer === undefined) return { ok: false, reason: 'locked' };
  // 重複學習是【拒絕】，不是冪等 no-op —— 學習要扣款，靜默 no-op 會讓
  // 「已扣款但沒東西」與「沒扣款」無法區分（23 §4.1）。
  if (offer.state === 'learned') return { ok: false, reason: 'already-learned' };
  if (offer.state === 'locked') return { ok: false, reason: 'locked' };
  if (offer.state === 'unaffordable') return { ok: false, reason: 'unaffordable' };
  const paid = pay(offer.cost, ctx);
  return { ok: true, state: ability.addTrait(id, { state: paid, defs: ctx.defs }) };
}

export function learnSkill(
  id: SkillId, ctx: RunContext, fx: EffectResolver,
): LearnResult {
  const offer = learnableSkills(ctx, fx).find((o) => String(o.def.skillId) === String(id));
  if (offer === undefined) return { ok: false, reason: 'locked' };
  if (offer.state === 'learned') return { ok: false, reason: 'already-learned' };
  if (offer.state === 'locked') return { ok: false, reason: 'locked' };
  if (offer.state === 'unaffordable') return { ok: false, reason: 'unaffordable' };
  const paid = pay(offer.cost, ctx);
  return { ok: true, state: ability.addSkill(id, { state: paid, defs: ctx.defs }) };
}

/** 事件／道具授予的解鎖（32 §5）。它【不含學習費】—— 兩道門不可被一件事同時繞過。 */
export function grantUnlock(
  trait: TraitId | null, skill: SkillId | null, ctx: RunContext,
): RunState {
  const g = ctx.state.growth;
  const traits = trait !== null && !g.unlockedTraits.some((x) => String(x) === String(trait))
    ? [...g.unlockedTraits, trait] : g.unlockedTraits;
  const skills = skill !== null && !g.unlockedSkills.some((x) => String(x) === String(skill))
    ? [...g.unlockedSkills, skill] : g.unlockedSkills;
  return { ...ctx.state, growth: { ...g, unlockedTraits: traits, unlockedSkills: skills } };
}
