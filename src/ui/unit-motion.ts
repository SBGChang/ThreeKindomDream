export type UnitClip = 'charge' | 'ignite' | 'volley';
export type Point = { x: number; y: number };
export const CLIPS: Record<UnitClip, { name: string; duration: number; phases: readonly [number, string][] }> = {
  charge: { name: '騎兵衝鋒', duration: 3.6, phases: [[0, '壓低重心'], [.45, '四足疾馳'], [2.75, '收韁減速'], [3.25, '落蹄站穩']] },
  ignite: { name: '工兵點火', duration: 5, phases: [[0, '持火準備'], [.55, '屈膝俯身'], [1.7, '火把接觸引線'], [2.35, '引線點燃'], [3, '收回火把'], [3.65, '起身復位']] },
  volley: { name: '弓箭手射箭', duration: 3.6, phases: [[0, '搭箭舉弓'], [.65, '拉弦蓄力'], [1.5, '瞄準停頓'], [1.9, '鬆弦出箭'], [2.3, '收勢復位']] },
};
export const clamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
export function ease(a: number, b: number, t: number): number { const p = clamp((t - a) / (b - a)); return p * p * (3 - 2 * p); }
export const mix = (a: number, b: number, p: number): number => a + (b - a) * p;
export const rotate = (p: Point, a: number): Point => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
/** Two rigid segments. Clamp unreachable targets rather than stretching the artwork. */
export function solveLimb(start: Point, target: Point, upper: number, lower: number, bend = 1): { start: Point; joint: Point; end: Point } {
  const angle = Math.atan2(target.y - start.y, target.x - start.x);
  const d = clamp(distance(start, target), Math.abs(upper - lower) + .001, upper + lower - .001);
  const offset = Math.acos(clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1));
  return { start, joint: add(start, rotate({ x: upper, y: 0 }, angle + bend * offset)), end: add(start, rotate({ x: d, y: 0 }, angle)) };
}
export function phaseAt(clip: UnitClip, time: number): string {
  return [...CLIPS[clip].phases].reverse().find(([at]) => time >= at)?.[1] ?? '';
}
export function archerPose(t: number) {
  const lift = ease(0, .65, t) * (1 - ease(2.45, 3.6, t));
  const draw = ease(.65, 1.5, t);
  const released = t >= 1.9;
  const recoil = released ? Math.sin((t - 1.9) * 48) * Math.exp(-(t - 1.9) * 12) * 5 : 0;
  const angle = mix(.55, -.19, lift);
  const grip = { x: mix(66, 100, lift), y: mix(40, -40, lift) };
  const pull = released ? 16 + recoil : mix(16, 89, draw);
  const string = add(grip, rotate({ x: -pull, y: 0 }, angle));
  const recover = ease(2.45, 3.6, t);
  const hand = released ? { x: mix(mix(12.6, -12, ease(1.9, 2.06, t)), string.x, recover), y: mix(-23.2, string.y, recover) } : string;
  return { lift, draw, released, angle, grip, pull, hand, recoil };
}
export function engineerPose(t: number) {
  const crouch = ease(.55, 1.7, t) * (1 - ease(3.65, 4.7, t));
  const reach = ease(.9, 1.7, t) * (1 - ease(3, 3.6, t));
  return { crouch, reach, root: { x: 420 + 20 * crouch, y: 319 + 54 * crouch }, lean: .22 * crouch, hand: { x: mix(54, 99, reach), y: mix(10, 56, reach) }, torchAngle: mix(-1.12, .57, reach), lit: t >= 2.35 };
}
export function horsePose(t: number) {
  const running = ease(0, .5, t) * (1 - ease(2.75, 3.4, t));
  const cycle = Math.max(0, t - .12) * Math.PI * 2 / .56;
  const bob = -Math.abs(Math.sin(cycle)) * 11 * running;
  return { running, cycle, bob, lean: -.07 * running, progress: ease(.1, 3.4, t) };
}
