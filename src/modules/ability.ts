// ㉓ 特質與技能。持有本輪已學的兩種能力（23）。
//
// 兩種能力刻意用【不同種類的稀缺】（23 §1）：
//   特質  常駐被動，不佔格 → 稀缺在經驗總量（經濟決策）
//   技能  戰役中的行動，只有 3 格 → 稀缺在格數（編組決策）
//
// 本模組【不 handle 任何指令】：學習的唯一入口在 ㉜，
// 這樣「產出總和 − 消耗總和 ＝ 餘額」才是可斷言的不變量。
import type { RunContext } from '../contracts/core/context.js';
import type { SkillDef, TraitDef } from '../contracts/core/definitions.js';
import type { ResolvedEffectRef } from '../contracts/core/effects.js';
import type { SkillId, TraitId } from '../contracts/core/ids.js';
import type { RunState } from '../contracts/core/state.js';
import type { EffectSource } from './effect.js';

export const traits = (ctx: RunContext): readonly TraitId[] => ctx.state.abilities.traits;
export const skills = (ctx: RunContext): readonly SkillId[] => ctx.state.abilities.skills;

export const hasTrait = (id: TraitId, ctx: RunContext): boolean =>
  ctx.state.abilities.traits.some((x) => String(x) === String(id));

export const hasSkill = (id: SkillId, ctx: RunContext): boolean =>
  ctx.state.abilities.skills.some((x) => String(x) === String(id));

/** 只由 ㉜ 在扣款成功後呼叫。重複由 ㉜ 擋下（23 §4.1）。 */
export function addTrait(id: TraitId, ctx: RunContext): RunState {
  if (hasTrait(id, ctx)) return ctx.state;
  return {
    ...ctx.state,
    abilities: { ...ctx.state.abilities, traits: [...ctx.state.abilities.traits, id] },
  };
}

export function addSkill(id: SkillId, ctx: RunContext): RunState {
  if (hasSkill(id, ctx)) return ctx.state;
  return {
    ...ctx.state,
    abilities: { ...ctx.state.abilities, skills: [...ctx.state.abilities.skills, id] },
  };
}

export const traitDef = (id: TraitId, ctx: RunContext): TraitDef =>
  ctx.defs.reader('trait').get(String(id));

export const skillDef = (id: SkillId, ctx: RunContext): SkillDef =>
  ctx.defs.reader('skill').get(String(id));

/**
 * 只有【特質】進 EffectSource（23 §5）★
 *
 * 技能不進 —— 它的效果只在戰役中、由 ㉝ 依 `SkillAction` 施放時才發生，
 * 不是常駐加成。混進來會讓「我的物理傷害是多少」在戰役外也算得出一個
 * 沒有意義的數字。
 *
 * 無 `supersedes` 語意 —— 特質不互相取代，累加。
 */
export function traitEffectSource(): EffectSource {
  return {
    collect: (ctx: RunContext): readonly ResolvedEffectRef[] => ctx.state.abilities.traits
      .flatMap((id) => traitDef(id, ctx).effects
        .map((ref) => ({ ...ref, sourceId: `trait/${String(id)}` }))),
  };
}
