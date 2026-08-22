// 純函式的不變量：結算順序、權重變換、成功率封閉式、RNG 決定性。
import { seed as mkSeed, targetId } from '../../src/contracts/core/ids.js';
import { createRng, emptyCursors } from '../../src/kernel/rng.js';
import { checkRuleOf, successRate } from '../../src/modules/check.js';
import { applyResolveOrder } from '../../src/modules/effect-core.js';
import { applyShift } from '../../src/modules/training.js';
import { describe, eq, it, near, ok, throws } from '../lib/tinytest.js';
import { defs, newSession } from './harness.js';

export function run(): void {
  describe('effect · 結算順序（01 §4）', () => {
    it('base 加總後再乘', () => {
      eq(applyResolveOrder(100, [
        { target: targetId('x'), op: 'add', value: 20, sourceId: 'a' },
        { target: targetId('x'), op: 'mulPct', value: 0.5, sourceId: 'b' },
      ]), 180);
    });
    it('乘法互相相乘而非相加', () => {
      eq(applyResolveOrder(100, [
        { target: targetId('x'), op: 'mulPct', value: 0.2, sourceId: 'a' },
        { target: targetId('x'), op: 'mulPct', value: 0.2, sourceId: 'b' },
      ]), 144);
    });
    it('clamp 最後套用', () => {
      eq(applyResolveOrder(100, [
        { target: targetId('x'), op: 'mulPct', value: 9, sourceId: 'a' },
        { target: targetId('x'), op: 'clampMax', value: 500, sourceId: 'b' },
      ]), 500);
    });
  });

  describe('training · applyShift（16 §2.1）', () => {
    const base = [45, 35, 16, 4];
    const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
    it('shift=0 不變', () => { eq(applyShift(base, 0, 0.2), base); });
    it('權重總和守恆', () => {
      near(sum(applyShift(base, 3, 0.2)), sum(base), 1e-9);
      near(sum(applyShift(base, -3, 0.2)), sum(base), 1e-9);
    });
    it('正 shift 把權重往高階移', () => {
      const after = applyShift(base, 2, 0.3);
      ok((after[0] ?? 0) < (base[0] ?? 0), '最低階權重應下降');
      ok((after[3] ?? 0) >= (base[3] ?? 0), '最高階權重不應下降');
    });
  });

  describe('check · 成功率（18 §8.2）', () => {
    const r = checkRuleOf({ state: newSession(1).current, defs });
    it('預覽公式與實測通過率一致', () => {
      const rng = createRng(mkSeed(99), emptyCursors());
      const cases: readonly (readonly [number, number])[] = [[100, 90], [300, 330], [700, 800]];
      for (const c of cases) {
        const value = c[0];
        const dc = c[1];
        const predicted = successRate(value, 0, dc, r);
        let hit = 0;
        const N = 20000;
        for (let i = 0; i < N; i += 1) {
          const roll = rng.int('check.roll', r.rollMin, r.rollMax + 1);
          if (Math.round(value * (1 + (roll - r.rollCenter) / r.rollSpread)) >= dc) hit += 1;
        }
        near(hit / N, predicted, 0.02, `value=${value} dc=${dc}：`);
      }
    });
    it('必成功與必失敗的邊界', () => {
      eq(successRate(1000, 0, 1, r), 1);
      eq(successRate(10, 0, 100000, r), 0);
    });
  });

  describe('rng · 決定性（04 §4）', () => {
    it('同 seed 同 cursor 產生同值', () => {
      const a = createRng(mkSeed(7), emptyCursors());
      const b = createRng(mkSeed(7), emptyCursors());
      for (let i = 0; i < 50; i += 1) eq(a.next('glow.base'), b.next('glow.base'));
    });
    it('讀一條 stream 不影響其他 stream', () => {
      const a = createRng(mkSeed(7), emptyCursors());
      const b = createRng(mkSeed(7), emptyCursors());
      for (let i = 0; i < 20; i += 1) a.next('event.draw');
      eq(a.next('glow.base'), b.next('glow.base'));
    });
    it('空集合必須 throw，不得靜默回退', () => {
      const a = createRng(mkSeed(1), emptyCursors());
      throws(() => a.pick('glow.base', []), 'pick 空集合');
      throws(() => a.weighted('glow.base', []), 'weighted 空集合');
      throws(() => a.weighted('glow.base', [{ item: 1, weight: 0 }]), 'weighted 權重和 0');
    });
  });
}
