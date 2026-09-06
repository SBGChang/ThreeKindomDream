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
  AbilityTier, AffinityStage, AptitudeGrade, Attr, AttrGrade,
} from '../contracts/core/primitives.js';
import { AFFINITY_STAGES, ATTRS } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import * as ability from './ability.js';
import type { EffectResolver } from './effect.js';
import { rosterIds, stageOf } from './roster-query.js';
import { attrCapOf, statQuery, type StatWriter } from './stats.js';

const rule = (ctx: RunContext): GrowthRuleDef => ctx.defs.single('growthRule');
// 上限【逐維】不同 —— 它由資質決定，而資質是跨輪貨幣（⑳ attrCapOf）。
const capOf = (attr: Attr, ctx: RunContext): number => attrCapOf(attr, ctx);

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

/**
 * 價格帶表本身。UI 要說明「每一點的價碼怎麼長」時讀它 ——
 * **畫面上不得寫死那兩個端點的數字**：整張表改過三次尺度，
 * 每次都會留下一句對不上的說明文字（32 §3.1）。
 */
export const bands = (ctx: RunContext): readonly AttrCostBand[] => bandsOf(ctx);

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
  const to = Math.min(target, capOf(attr, ctx));
  let sum = 0;
  for (let v = from; v < to; v += 1) sum += shiftedCostPerPoint(v + 1, ctx, fx);
  return Math.max(0, Math.ceil(fx.resolve(targetId(`learn.cost.${attr}`), sum, ctx)));
}

export interface NextGrade {
  readonly grade: AttrGrade;
  readonly at: number;
  readonly cost: number;
}

/**
 * 下一級的價碼 —— UI 的主要顯示。已在頂級時回 null。
 *
 * **超過本輪天花板的等級一律回 null** ★ 否則畫面會出現「升到 A（0）」——
 * `attrCost` 會把 target 夾到上限，於是差額歸零，看起來像免費。
 * 那個 0 是真的算出來的，而它說的是謊：`learnAttr` 會直接拒絕。
 * 天花板到了就該說「到頂了」，不該報一個買不到的價。
 */
export function nextGrade(
  attr: Attr, ctx: RunContext, fx: EffectResolver,
): NextGrade | null {
  const bands = bandsOf(ctx);
  const value = statQuery.attr(attr, ctx);
  const cap = capOf(attr, ctx);
  const next = bands.find((b) => b.min > value);
  if (next === undefined || next.min > cap) return null;
  return { grade: next.grade, at: next.min, cost: attrCost(attr, next.min, ctx, fx) };
}

/** 本輪那一維的天花板。UI 要把它畫出來 —— 看得見的牆才是跨輪動機（14 §2）。 */
export const attrCap = (attr: Attr, ctx: RunContext): number => capOf(attr, ctx);

/** 本輪那一維的資質階。與天花板一起顯示，玩家才知道【什麼買得動它】。 */
export const aptitudeOf = (attr: Attr, ctx: RunContext): AptitudeGrade =>
  ctx.state.config.aptitudes[attr];

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
 * 他教不教得動這一階（32 §5）★
 *
 * 門檻是好感階（`teachStage`）。★ 但**達到門檻不等於已解鎖** ——
 * 還要真的同格共事一次，他才教（`teachFromSlot`，D63）。
 * 舊版把這個判斷直接當成解鎖，於是起始好感 20 就開了七項。
 *
 * 不另立一張「誰能教什麼」的表：他能教的就是他自己表上有的（D36）——
 * 否則同一件事會有兩份可能漂移的資料。
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

/**
 * 解鎖 ＝ **他真的教過你**（D35 ＋ D63）★★
 *
 * ── 這裡改過一次，方向是相反的 ────────────────────
 * 舊版：`teachers.some((t) => t.ready)` —— 只要他在陣容裡、好感夠，就自動可學。
 * 而起始好感是 20（相識），`teachStage.common` 也是相識 ——
 * **於是第一回合就有四條特質、三個技能是可學的，玩家什麼都還沒做。**
 *
 * 規則本來就是「事件內被教了，才會出現在選單中」。舊版把它實作成
 * 一個狀態查詢，那讓 D35（一切都要先解鎖）名存實亡：解鎖不是一個事件，
 * 而是一個恆真的條件。
 *
 * 現在解鎖只有三個來源，全部是**發生過的事**：
 *   一 · 同格共事時他教你一項（`teachFromSlot`，寫進 `growth.unlocked*`）
 *   二 · 事件／戰役深關的 `EventReward.unlock`
 *   三 · 道具的 `UnlockGrant`
 *
 * `teachers` 仍然回傳 —— 未解鎖的項目要寫出【誰能教】（32 §5.2），
 * 否則玩家看不出該去跟誰混。
 */
export function learnableTraits(
  ctx: RunContext, fx: EffectResolver,
): readonly TraitOffer[] {
  const granted = fx.unlockGrants(ctx);
  return traitDefs(ctx).map((def) => {
    const cost = abilityCost(def.cost, ctx, fx);
    const teachers = traitTeachers(def, ctx);
    const unlocked = ctx.state.growth.unlockedTraits
      .some((x) => String(x) === String(def.traitId))
      || granted.some((g) => String(g.trait) === String(def.traitId));
    const learned = ability.hasTrait(def.traitId, ctx);
    return { def, tier: def.tier, cost, teachers, state: stateOf(learned, unlocked, cost, ctx) };
  });
}

export function learnableSkills(
  ctx: RunContext, fx: EffectResolver,
): readonly SkillOffer[] {
  const granted = fx.unlockGrants(ctx);
  return skillDefs(ctx).map((def) => {
    const cost = abilityCost(def.cost, ctx, fx);
    const teachers = skillTeachers(def, ctx);
    const unlocked = ctx.state.growth.unlockedSkills
      .some((x) => String(x) === String(def.skillId))
      || granted.some((g) => String(g.skill) === String(def.skillId));
    const learned = ability.hasSkill(def.skillId, ctx);
    return { def, tier: def.tier, cost, teachers, state: stateOf(learned, unlocked, cost, ctx) };
  });
}

export interface Taught {
  readonly notableId: NotableId;
  readonly trait: TraitId | null;
  readonly skill: SkillId | null;
}

/**
 * **同格共事 → 他教你一項**（D63）★★ 解鎖的主要來源
 *
 * 玩家選了某一格，而那一格站著的名士好感已達該階門檻時，
 * 他從自己表上挑【一項你還沒解鎖的】教給你。
 *
 * ── 三個設計決定 ───────────────────────────────
 * 一 · **一次最多一項。** 否則第一次同格就把他整張表倒給你，
 *      「跟誰混久了學到什麼」就沒有節奏。
 * 二 · **綁在同格上。** 同格本來就是好感的來源（19 §5），
 *      所以「跟他相處 → 好感漲 → 他教你更難的東西」是同一條線，
 *      不需要第二套機制。
 * 三 · **由低階往高階教。** 常階最先，因為它的好感門檻最低；
 *      玩家因此看得到一條「越熟學得越好」的順序。
 *
 * 不消耗 RNG：教什麼是決定性的（表上第一個還沒解鎖的）。
 * 隨機會讓「我知道他能教我什麼」變成「我不知道他這次給不給」，
 * 而那條線的價值正是【可以計畫】。
 */
export function teachFromSlot(
  standing: readonly NotableId[], ctx: RunContext,
): { readonly state: RunState; readonly taught: readonly Taught[] } {
  let state = ctx.state;
  const taught: Taught[] = [];
  for (const id of standing) {
    const at: RunContext = { state, defs: ctx.defs };
    const nd = ctx.defs.reader('notable').get(String(id));
    const stage = stageOf(id, at);
    const star = at.state.metaSnapshot.notableCodex[String(id)]?.star ?? 0;

    // 技能先於特質 —— 沒有招就打不出傷害，那是玩家最先需要的東西。
    const skill = nd.abilities.skills
      .filter((r) => r.star <= star)
      .map((r) => ability.skillDef(r.skillId, at))
      .filter((d) => meetsTeachStage(d.tier, stage, at))
      .find((d) => !at.state.growth.unlockedSkills.some((x) => String(x) === String(d.skillId)));
    if (skill !== undefined) {
      state = grantUnlock(null, skill.skillId, at);
      taught.push({ notableId: id, trait: null, skill: skill.skillId });
      continue;
    }
    const trait = nd.abilities.traits
      .map((tid) => ability.traitDef(tid, at))
      .filter((d) => meetsTeachStage(d.tier, stage, at))
      .find((d) => !at.state.growth.unlockedTraits.some((x) => String(x) === String(d.traitId)));
    if (trait !== undefined) {
      state = grantUnlock(trait.traitId, null, at);
      taught.push({ notableId: id, trait: trait.traitId, skill: null });
    }
  }
  return { state, taught };
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
  if (target <= from || target > capOf(attr, ctx)) return { ok: false, reason: 'capped' };
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
