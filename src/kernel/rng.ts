import type { RngCursors, RngStream, Weighted } from '../contracts/core/primitives.js';
import { RNG_STREAMS } from '../contracts/core/primitives.js';
import type { Seed } from '../contracts/core/ids.js';

/**
 * counter-based 32 位元混合器（splitmix32 家族）。
 * 全程整數運算（Math.imul），跨平台一致，不依賴浮點順序。
 */
function mix32(x: number): number {
  let t = (x + 0x9e3779b9) | 0;
  t = t ^ (t >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  t = t ^ (t >>> 15);
  return t >>> 0;
}

const STREAM_SALT: Readonly<Record<RngStream, number>> = Object.freeze(
  RNG_STREAMS.reduce<Record<string, number>>((acc, s, i) => {
    acc[s] = mix32(0x51ed270b + i * 0x1000193);
    return acc;
  }, {}) as Record<RngStream, number>,
);

export interface RngTrace {
  readonly stream: RngStream;
  readonly counter: number;
  readonly raw: number;
}

export interface DeterministicRng {
  next(stream: RngStream): number;
  int(stream: RngStream, minIncl: number, maxExcl: number): number;
  pick<T>(stream: RngStream, items: readonly T[]): T;
  weighted<T>(stream: RngStream, entries: readonly Weighted<T>[]): T;
  chance(stream: RngStream, probability: number): boolean;
  cursors(): RngCursors;
  trace(): readonly RngTrace[];
}

export function emptyCursors(): RngCursors {
  const out: Record<string, number> = {};
  for (const s of RNG_STREAMS) out[s] = 0;
  return out as RngCursors;
}

export function createRng(seed: Seed, initial: RngCursors, recordTrace = false): DeterministicRng {
  const cursor: Record<string, number> = { ...initial };
  const traces: RngTrace[] = [];

  const raw = (stream: RngStream): number => {
    const c = cursor[stream] ?? 0;
    cursor[stream] = c + 1;
    const v = mix32(mix32((seed ^ (STREAM_SALT[stream] ?? 0)) | 0) + c) / 0x1_0000_0000;
    if (recordTrace) traces.push({ stream, counter: c, raw: v });
    return v;
  };

  return {
    next: raw,
    int(stream, minIncl, maxExcl) {
      if (maxExcl <= minIncl) {
        throw new Error(`rng.int: 空區間 [${minIncl}, ${maxExcl}) on ${stream}`);
      }
      return minIncl + Math.floor(raw(stream) * (maxExcl - minIncl));
    },
    pick(stream, items) {
      if (items.length === 0) throw new Error(`rng.pick: 空集合 on ${stream}`);
      const i = Math.floor(raw(stream) * items.length);
      const v = items[Math.min(i, items.length - 1)];
      if (v === undefined) throw new Error(`rng.pick: 索引越界 on ${stream}`);
      return v;
    },
    weighted(stream, entries) {
      if (entries.length === 0) throw new Error(`rng.weighted: 空集合 on ${stream}`);
      let total = 0;
      for (const e of entries) {
        if (e.weight < 0) throw new Error(`rng.weighted: 負權重 on ${stream}`);
        total += e.weight;
      }
      if (total <= 0) throw new Error(`rng.weighted: 權重總和為 0 on ${stream}`);
      let r = raw(stream) * total;
      for (const e of entries) {
        r -= e.weight;
        if (r < 0) return e.item;
      }
      const last = entries[entries.length - 1];
      if (last === undefined) throw new Error('unreachable');
      return last.item;
    },
    chance(stream, probability) {
      return raw(stream) < probability;
    },
    cursors() {
      return { ...cursor } as RngCursors;
    },
    trace() {
      return traces;
    },
  };
}
