import type { DefinitionRegistry } from '../../data-runtime/registry.js';
import type { DeterministicRng } from '../../kernel/rng.js';
import type { RunState } from './state.js';

/**
 * 唯讀查詢用。給效果結算、條件判定、Query、ViewModel。
 * 拿到這個的程式在型別上摸不到 RNG —— 因此「效果結算不得引入隨機」
 * 不需要人工審查（03 §2）。
 */
export interface RunContext {
  readonly state: RunState;
  readonly defs: DefinitionRegistry;
}

/** 需要隨機的地方才拿得到。給槽位生成、事件抽取、檢定骰。 */
export interface TurnContext extends RunContext {
  readonly rng: DeterministicRng;
}
