import type { GrowthRuleDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';
import { economy } from './economy.js';

// 四維評級及教學門檻；薪資、課程價格與成長遞減見 economy.ts。
export const growthRule: GrowthRuleDef = coreDef('growthRule', 'growth:main', {
  economy,
  learning: {
    power: [1, 1.2, 1.45, 1.75, 2.1],
  },
  bands: [
    { grade: 'G', min: 0, max: 0 },
    { grade: 'F', min: 1, max: 19 },
    { grade: 'E', min: 20, max: 39 },
    { grade: 'D', min: 40, max: 59 },
    { grade: 'C', min: 60, max: 74 },
    { grade: 'B', min: 75, max: 84 },
    { grade: 'A', min: 85, max: 94 },
    { grade: 'S', min: 95, max: 100 },
  ],
  /**
   * 向名士學該階能力所需的好感（32 §5）。階越高，要越熟。
   *
   * 絕階訂在「知交」＝ 站位效果的同一道門（好感 60）。那一階本來就是
   * 「這個人真的把你當自己人」的分界，讓最強的一批能力與它對齊，
   * 玩家只要記一個數字。
   */
  teachStage: { common: 'acquainted', fine: 'friendly', peerless: 'close' },
  // 起始四維：逐維獨立擲 18–26。不是 0 ——
  // 全 0 開局的第一場戰役打不出任何傷害，而四個 G 也看不出角色性格。
  startMin: 18,
  startMax: 26,
});
