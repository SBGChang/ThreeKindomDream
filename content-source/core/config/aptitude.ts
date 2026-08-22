import type { AptitudeCostDef, AptitudeGradeDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

// GREYBOX：shiftSteps 的語意見 16 §2.1 —— 每一步把 shiftStepRatio 比例的權重
// 由最低非零階移轉至次高階。ARCHITECTURE §9-2 標記為待定平衡問題。
export const aptitudeGrades: readonly AptitudeGradeDef[] = [
  coreDef('aptitudeGrade', 'apt:F', { grade: 'F', shiftSteps: -2, yieldMul: 0.70 }),
  coreDef('aptitudeGrade', 'apt:E', { grade: 'E', shiftSteps: -1, yieldMul: 0.85 }),
  coreDef('aptitudeGrade', 'apt:D', { grade: 'D', shiftSteps: 0, yieldMul: 1.00 }),
  coreDef('aptitudeGrade', 'apt:C', { grade: 'C', shiftSteps: 1, yieldMul: 1.15 }),
  coreDef('aptitudeGrade', 'apt:B', { grade: 'B', shiftSteps: 2, yieldMul: 1.30 }),
  coreDef('aptitudeGrade', 'apt:A', { grade: 'A', shiftSteps: 3, yieldMul: 1.45 }),
  coreDef('aptitudeGrade', 'apt:S', { grade: 'S', shiftSteps: 4, yieldMul: 1.60 }),
];

// 累計成本：從 defaultGrade 升到該階要花多少資質點（14 §2.3）。
export const aptitudeCost: AptitudeCostDef = coreDef('aptitudeCost', 'aptCost:main', {
  defaultGrade: 'D',
  cumulativeCost: { F: -2, E: -1, D: 0, C: 2, B: 5, A: 9, S: 14 },
});
