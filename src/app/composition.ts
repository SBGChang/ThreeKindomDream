// 組裝根。唯一可同時 import 多個模組的地方（ARCHITECTURE §2.5）。
import type { RunContext } from '../contracts/core/context.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import { configEffectSource } from '../modules/dream-entry.js';
import {
  boonEffectSource, createEffectResolver, type EffectResolver, type EffectSource,
} from '../modules/effect.js';
import { traitEffectSource } from '../modules/ability.js';
import { itemEffectSource } from '../modules/item.js';
import { notableEffectSource } from '../modules/notable-codex.js';
import { shopEffectSource } from '../modules/shop.js';
import { createStatWriter, statQuery, type StatWriter } from '../modules/stats.js';

export interface Wiring {
  readonly fx: EffectResolver;
  readonly writer: StatWriter;
  readonly defs: DefinitionRegistry;
}

/**
 * EffectSource 一律是工廠而非實例，因此注入時不需要 config 已存在
 * —— 沒有循環（01 §11.1）。
 */
export function compose(defs: DefinitionRegistry): Wiring {
  const dynamicRoster: EffectSource = {
    collect: (ctx: RunContext) => notableEffectSource(
      ctx.state.roster.members.map((m) => m.notableId),
    ).collect(ctx),
  };

  const sources: readonly EffectSource[] = [
    dynamicRoster,
    // 道具與名士共用同一套 FuncType，但【不吃好感門檻】——
    // 名士那層要七到十個回合才打得開，道具那層第一回合就開（23 §1）。
    itemEffectSource(),
    // 只有【特質】進來。技能不進 —— 它的效果只在戰役中、由 ㉝ 施放時才發生，
    // 混進來會讓「我的物理傷害是多少」在戰役外也算出一個沒有意義的數字（23 §5）。
    traitEffectSource(),
    boonEffectSource(),
    configEffectSource(),
    shopEffectSource(),
  ];

  const fx = createEffectResolver(sources, (path, ctx) => statQuery.read(path, ctx));
  return { fx, writer: createStatWriter(fx), defs };
}
