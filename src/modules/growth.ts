// Per-attribute experience and course discovery. Training purchases belong to learning.ts.
import type { RunContext } from '../contracts/core/context.js';
import type {
  AttrGradeBand,
  GrowthRuleDef,
} from '../contracts/core/definitions.js';
import type { NotableId, SkillId, TraitId } from '../contracts/core/ids.js';
import type {
  AbilityTier,
  AffinityStage,
  AptitudeGrade,
  Attr,
  AttrGrade,
} from '../contracts/core/primitives.js';
import { AFFINITY_STAGES } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import * as ability from './ability.js';
import type { EffectResolver } from './effect.js';
import { stageOf } from './roster-query.js';
import { attrCapOf, attributeBalance, statQuery, setGrownAttribute } from './stats.js';

const rule = (ctx: RunContext): GrowthRuleDef => ctx.defs.single('growthRule');
// 上限【逐維】不同 —— 它由資質決定，而資質是跨輪貨幣（⑳ attrCapOf）。
const capOf = (attr: Attr, ctx: RunContext): number => attrCapOf(attr, ctx);

const bandsOf = (ctx: RunContext): readonly AttrGradeBand[] =>
  rule(ctx)
    .bands.slice()
    .sort((a, b) => a.min - b.min);

/** Hundredths carry experience toward each completed ability point; never spendable currency. */
export function grantGrowth(
  attr: Attr,
  amount: number,
  ctx: RunContext,
  _fx?: EffectResolver,
): RunState {
  if (!Number.isFinite(amount) || amount <= 0) return ctx.state;
  return setGrownAttribute(
    attr,
    Math.round((attributeBalance(attr, ctx) + amount) * 100) / 100,
    ctx,
  );
}
export function previewGrowth(
  attr: Attr,
  raw: number,
  ctx: RunContext,
): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const start = attributeBalance(attr, ctx),
    cap = capOf(attr, ctx);
  let value = start,
    left = raw;
  for (const band of rule(ctx).economy.growthBands) {
    const end = Math.min(cap, band.max);
    if (value >= end) continue;
    const used = Math.min(left, (end - value) / band.ratio);
    value += used * band.ratio;
    left -= used;
    if (left <= 0 || value >= cap) break;
  }
  return Math.round((value - start) * 100) / 100;
}
const bandAt = (value: number, ctx: RunContext): AttrGradeBand => {
  const bands = bandsOf(ctx);
  const hit = bands.find((b) => value >= b.min && value <= b.max);
  if (hit !== undefined) return hit;
  const last = bands.at(-1);
  if (last === undefined) throw new Error('growthRule.bands 為空');
  return last;
};

export const gradeOf = (attr: Attr, ctx: RunContext): AttrGrade =>
  bandAt(Math.floor(statQuery.attr(attr, ctx)), ctx).grade;

/** 能力評級區間。 */
export const bands = (ctx: RunContext): readonly AttrGradeBand[] =>
  bandsOf(ctx);

export const gradeAt = (value: number, ctx: RunContext): AttrGrade =>
  bandAt(Math.floor(value), ctx).grade;

export const attrCap = (attr: Attr, ctx: RunContext): number =>
  capOf(attr, ctx);

/** 本輪那一維的資質階。與天花板一起顯示，玩家才知道【什麼買得動它】。 */
export const aptitudeOf = (attr: Attr, ctx: RunContext): AptitudeGrade =>
  ctx.state.config.aptitudes[attr];

function meetsTeachStage(
  tier: AbilityTier,
  stage: AffinityStage,
  ctx: RunContext,
): boolean {
  const need = rule(ctx).teachStage[tier];
  return AFFINITY_STAGES.indexOf(stage) >= AFFINITY_STAGES.indexOf(need);
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
  standing: readonly NotableId[],
  ctx: RunContext,
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
      .find(
        (d) =>
          !at.state.growth.unlockedSkills.some(
            (x) => String(x) === String(d.skillId),
          ),
      );
    if (skill !== undefined) {
      state = grantUnlock(null, skill.skillId, at);
      taught.push({ notableId: id, trait: null, skill: skill.skillId });
      continue;
    }
    const trait = nd.abilities.traits
      .map((tid) => ability.traitDef(tid, at))
      .filter((d) => meetsTeachStage(d.tier, stage, at))
      .find(
        (d) =>
          !at.state.growth.unlockedTraits.some(
            (x) => String(x) === String(d.traitId),
          ),
      );
    if (trait !== undefined) {
      state = grantUnlock(trait.traitId, null, at);
      taught.push({ notableId: id, trait: trait.traitId, skill: null });
    }
  }
  return { state, taught };
}

export function grantUnlock(
  trait: TraitId | null,
  skill: SkillId | null,
  ctx: RunContext,
): RunState {
  const g = ctx.state.growth;
  const traits =
    trait !== null && !g.unlockedTraits.some((x) => String(x) === String(trait))
      ? [...g.unlockedTraits, trait]
      : g.unlockedTraits;
  const skills =
    skill !== null && !g.unlockedSkills.some((x) => String(x) === String(skill))
      ? [...g.unlockedSkills, skill]
      : g.unlockedSkills;
  return {
    ...ctx.state,
    growth: { ...g, unlockedTraits: traits, unlockedSkills: skills },
  };
}
