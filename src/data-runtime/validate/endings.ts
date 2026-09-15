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
    const trig = (d['trigger'] ?? {}) as Rec;
    if (d['endingKind'] === 'fullDream' && trig['kind'] !== 'sequenceCompleted') {
      c.push('rule', 'endings', 'endingKind', id, 'fullDream 只能由 sequenceCompleted 觸發');
    }
    const campaign = d['campaignRequirements'] as Rec | undefined;
    if (campaign) {
      for (const field of ['finalDepth', 'priorDepth'])
        if (!Number.isSafeInteger(campaign[field]) || c.n(campaign[field]) < 0)
          c.push('rule', 'endings', 'campaignRequirements.' + field, id, '章節戰果門檻必須為非負整數');
    }
  }

  for (const kind of ['sequenceCompleted', 'noFactionEligible'] as const) {
    const hasFallback = endings.some((e) => {
      const trig = (e['trigger'] ?? {}) as Rec;
      if (trig['kind'] !== kind) return false;
      return e['factionId'] === null && c.list(e['requirements']).length === 0
        && c.list(e['storyRequirements']).length === 0 && !e['campaignRequirements'];
    });
    if (!hasFallback) {
      c.push('rule', 'endings', kind, null,
        `trigger "${kind}" 缺少無條件兜底結局`,
        '否則玩家可能夢醒卻沒有結局可達（25 §3.1）');
    }
  }
}
