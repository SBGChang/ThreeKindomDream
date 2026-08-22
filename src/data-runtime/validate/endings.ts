import type { Ctx, Rec } from './types.js';

/** 結局：每個 trigger 型別都必須有無條件兜底（25 §3.1）。 */
export function validateEndings(c: Ctx): void {
  const endings = c.rows('ending');

  for (const d of endings) {
    const id = c.s(d['id']);
    c.text(d['titleKey'], 'endings', 'titleKey', id);
    c.text(d['bodyKey'], 'endings', 'bodyKey', id);
    if (c.n(d['pointsMultiplier']) <= 0) {
      c.push('rule', 'endings', 'pointsMultiplier', id, 'pointsMultiplier 必須 > 0');
    }
    const mv = (d['moralVariants'] ?? {}) as Record<string, unknown>;
    for (const band of ['veryEvil', 'neutral', 'veryGood'] as const) {
      if (mv[band] === undefined) {
        c.push('schema', 'endings', `moralVariants.${band}`, id, `缺少 ${band}`);
      } else {
        c.text(mv[band], 'endings', `moralVariants.${band}`, id);
      }
    }
    const trig = (d['trigger'] ?? {}) as Rec;
    if (d['endingKind'] === 'fullDream' && trig['kind'] !== 'sequenceCompleted') {
      c.push('rule', 'endings', 'endingKind', id, 'fullDream 只能由 sequenceCompleted 觸發');
    }
  }

  for (const kind of ['sequenceCompleted', 'checkFailed', 'noFactionEligible'] as const) {
    const hasFallback = endings.some((e) => {
      const trig = (e['trigger'] ?? {}) as Rec;
      if (trig['kind'] !== kind) return false;
      if (c.list(e['requirements']).length !== 0) return false;
      if (kind === 'checkFailed') return trig['attr'] === 'any';
      return true;
    });
    if (!hasFallback) {
      c.push('rule', 'endings', kind, null,
        `trigger "${kind}" 缺少無條件兜底結局`,
        '否則玩家可能夢醒卻沒有結局可達（25 §3.1）');
    }
  }
}
