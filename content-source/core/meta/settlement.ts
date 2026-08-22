import type { SettlementFormulaDef } from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * GREYBOX 結算係數。
 * 反推目標：第一次遊玩（無天命點數、走到虎牢關失敗）約得 500–800 點，
 * 足以在天命商店買到第一階的資質點；圓夢則約 3000–4000 點。
 *
 * 功績與名聲不直接計入 —— 它們是門檻貨幣（26 §4.1）。
 */
export const settlementFormula: SettlementFormulaDef =
  coreDef('settlementFormula', 'settle:main', {
    perCareerRank: 150,
    perChapterPassed: 250,
    perTurnSurvived: 12,
    fullDreamBonus: 1200,
  });
