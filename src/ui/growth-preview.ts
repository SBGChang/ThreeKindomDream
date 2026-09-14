import { attributeProgress } from '../contracts/core/attribute-progress.js';
/** Each complete 100 experience adds one ability point; a preview wraps to the next bar. */
export function projectGrowth(value: number, gain: number, cap: number): {
  value: number; currentValue: number; experience: number; projectedExperience: number;
  basePercent: number; ghostPercent: number; capped: boolean;
} {
  const start = Math.max(0, Math.min(cap, value));
  const current = attributeProgress(start, cap);
  const result = attributeProgress(Math.min(cap, Math.round((start + Math.max(0, gain)) * 100) / 100), cap);
  const projectedExperience = result.capped ? 100 : result.experience;
  const basePercent = result.level > current.level ? 0 : current.capped ? 100 : current.experience;
  return {
    value: result.level, currentValue: current.level, experience: current.experience,
    projectedExperience, basePercent, ghostPercent: Math.max(0, projectedExperience - basePercent), capped: result.capped,
  };
}
