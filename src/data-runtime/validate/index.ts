import { FUNC_TYPES } from '../../contracts/core/effects.js';
import { validateChapters } from './chapters.js';
import { validateEndings } from './endings.js';
import { validateEvents } from './events.js';
import { validateNotables } from './notables.js';
import { validateFactions, validateShop } from './shop.js';
import {
  validateCareer, validateGlow, validateLinkBonus, validateTalents,
  validateTrainingActions, validateYieldCurves,
} from './tables.js';
import { createCtx } from './types.js';
import type { ValidateInput, ValidationError } from './types.js';

export type { ValidateInput, ValidationError, Rec } from './types.js';

/**
 * Reference ＋ Rule 兩層。Schema 層由 content-source 的 tsc 保證（ARCHITECTURE §2.3）。
 * 回傳全部錯誤而非第一個 —— 策劃一次改一批資料，逐個修太慢（02 §7）。
 */
export function validateAll(input: ValidateInput): readonly ValidationError[] {
  const out: ValidationError[] = [];
  const c = createCtx(input, out);

  for (const ft of FUNC_TYPES) {
    if (!input.effects.has(ft)) {
      c.push('reference', 'effects', ft, null, `FuncType 無對應效果表: ${ft}`,
        '新增 content-source/core/effects/<func-type>.ts');
    }
  }

  validateNotables(c);
  validateEvents(c);
  validateChapters(c);
  validateEndings(c);
  validateShop(c);
  validateFactions(c);
  validateCareer(c);
  validateGlow(c);
  validateTalents(c);
  validateTrainingActions(c);
  validateYieldCurves(c);
  validateLinkBonus(c);

  return out;
}

export function formatErrors(errors: readonly ValidationError[]): string {
  if (errors.length === 0) return '內容驗證通過。';
  const lines = errors.map((e) => {
    const id = e.definitionId === null ? '' : ` [${e.definitionId}]`;
    const hint = e.hint === null ? '' : `\n      修法：${e.hint}`;
    return `  [${e.layer}] ${e.file}:${e.jsonPath}${id}\n      ${e.message}${hint}`;
  });
  return `內容驗證失敗（${errors.length} 筆）：\n${lines.join('\n')}`;
}
