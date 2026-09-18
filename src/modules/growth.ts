// Per-attribute experience and course discovery. Training purchases belong to learning.ts.
import {progressionBonus} from './progression-bonus.js';
import type { RunContext } from '../contracts/core/context.js';
import type {
  AttrGradeBand,
  GrowthRuleDef,
} from '../contracts/core/definitions.js';
import type { SkillId, TraitId } from '../contracts/core/ids.js';
import type {
  AptitudeGrade,
  Attr,
  AttrGrade,
} from '../contracts/core/primitives.js';

import type { RunState } from '../contracts/core/state.js';
import * as ability from './ability.js';
import type { EffectResolver } from './effect.js';
import { economyRule, purse, transact } from './economy.js';
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
    left = raw * (1 + progressionBonus('growthBonus', ctx));
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

/** Authored teaching: learn Lv1, improve one level, or cash out an already-mastered ability.
 * The source key makes the whole reward (including free levels) replay-safe. */
export function grantUnlock(
  trait: TraitId | null, skill: SkillId | null, ctx: RunContext,
  source = 'manual/' + ctx.state.progress.turn + '/' + purse(ctx).ledger.length,
): RunState {
  let state = ctx.state;
  for (const [kind, id] of [['skill', skill], ['trait', trait]] as const) {
    if (id === null) continue;
    const at = { ...ctx, state }, rule = economyRule(at);
    const def = kind === 'skill' ? ability.skillDef(id as SkillId, at) : ability.traitDef(id as TraitId, at);
    const owned = kind === 'skill' ? ability.hasSkill(id as SkillId, at) : ability.hasTrait(id as TraitId, at);
    const level = owned ? ability.levelOf(id, at) : 0;
    const prices = (kind === 'skill' ? rule.skillPrices : rule.traitPrices)[def.tier];
    const max = rule.primaryNeeds[def.tier].length;
    const key = 'teaching/' + source + '/' + id;
    if (purse(at).ledger.some(entry => entry.id === key)) continue;
    const mastered = level >= max;
    state = transact(key, mastered ? prices.at(-1)! : 0,
      ctx.defs.text(String(def.nameKey)) + (mastered ? ' · 滿級教學折金' : ' · 傳授'), at);
    if (mastered) continue;
    const g = state.growth;
    state = kind === 'skill' ? ability.addSkill(id as SkillId, { ...ctx, state }) : ability.addTrait(id as TraitId, { ...ctx, state });
    const active = [...ability.activeTraits({ ...ctx, state })];
    if (kind === 'trait' && !active.includes(id as TraitId) && active.length < rule.activeTraits) active.push(id as TraitId);
    state = { ...state,
      growth: { ...g,
        unlockedSkills: kind === 'skill' && !g.unlockedSkills.includes(id as SkillId) ? [...g.unlockedSkills, id as SkillId] : g.unlockedSkills,
        unlockedTraits: kind === 'trait' && !g.unlockedTraits.includes(id as TraitId) ? [...g.unlockedTraits, id as TraitId] : g.unlockedTraits,
      },
      abilities: { ...state.abilities, activeTraits: active, levels: { ...state.abilities.levels, [String(id)]: level + 1 } },
    };
  }
  return state;
}
