// 組裝根。唯一可同時 import 多個模組的地方（ARCHITECTURE §2.5）。
import type { RunContext } from '../contracts/core/context.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import { configEffectSource } from '../modules/dream-entry.js';
import { createEffectResolver, type EffectResolver, type EffectSource } from '../modules/effect.js';
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
    configEffectSource(),
    shopEffectSource(),
  ];

  const fx = createEffectResolver(sources, (path, ctx) => statQuery.read(path, ctx));
  return { fx, writer: createStatWriter(fx), defs };
}
