import type { SettlementFormulaDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * 天命結算係數。行動／章節／戰果依四章人生預算正規化，
 * 完整人生約 940–1580 點；結局只加定額，不再放大整筆收入。
 *
 * 功績與名聲不直接計入 —— 它們是門檻貨幣（26 §4.1）。
 */
export const settlementFormula: SettlementFormulaDef =
  coreDef('settlementFormula', 'settle:main', {
    perCareerRank: 10,
    perChapterPassed: 60,
    perTurnSurvived: 10,
    fullDreamBonus: 200,
    perStage: 10, referenceChapters: 4,
    endingBonuses: [{multiplier:1,points:0},{multiplier:1.4,points:100},{multiplier:1.8,points:200},{multiplier:2,points:300}],
  });
