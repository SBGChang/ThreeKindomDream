import type { BattleLogEntry } from '../contracts/core/state.js';

/** One common, fixed scale for BOTH armies throughout a stage, including healing. */
export function soldierScale(hostMax: number, enemyMax: number): number {
  return Math.max(1, Math.ceil(Math.max(hostMax, enemyMax) / 96));
}
/** A fractional final figure preserves the exact total instead of rounding armies up. */
export function soldierShares(troops: number, scale: number): readonly number[] {
  if (!Number.isFinite(troops) || troops <= 0) return [];
  const size = Math.max(1, scale);
  const count = Math.ceil(troops / size);
  return Array.from({ length: count }, (_, i) => Math.min(1, (troops - i * size) / size));
}
export function replayFrame(log: readonly BattleLogEntry[], at: number, impact: boolean, startTroops: number, enemyMax: number, startSupply: number) {
  const before = log[at - 1];
  const event = log[at];
  const previous = { troops: before?.troopsAfter ?? startTroops, enemy: before?.enemyAfter ?? enemyMax, supply: before?.supplyAfter ?? startSupply };
  const after = event ? { troops: event.troopsAfter, enemy: event.enemyAfter, supply: event.supplyAfter } : previous;
  return { previous, current: impact ? after : previous, hostDelta: after.troops - previous.troops, enemyDelta: after.enemy - previous.enemy };
}
