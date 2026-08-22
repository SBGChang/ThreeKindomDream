import { ATTRS, GLOW_TIERS } from '../../contracts/core/primitives.js';
import type { Ctx } from './types.js';

export function validateCareer(c: Ctx): void {
  for (const line of ['civil', 'martial'] as const) {
    const ranks = c.rows('careerRank').filter((r) => r['line'] === line)
      .slice().sort((a, b) => c.n(a['level']) - c.n(b['level']));
    if (ranks.length === 0) {
      c.push('rule', 'career', line, null, `${line} 線沒有任何階級`);
      continue;
    }
    ranks.forEach((r, i) => {
      const id = c.s(r['id']);
      c.text(r['nameKey'], 'career', 'nameKey', id);
      if (c.n(r['level']) !== i + 1) {
        c.push('rule', 'career', 'level', id,
          `${line} 線 level 必須連續（期望 ${i + 1}，實得 ${c.n(r['level'])}）`);
      }
      const prev = ranks[i - 1];
      if (prev === undefined) {
        if (c.n(r['requiredMerit']) !== 0) {
          c.push('rule', 'career', 'requiredMerit', id,
            '第 1 階 requiredMerit 必須為 0（白身是起點）');
        }
      } else {
        if (c.n(r['requiredMerit']) < c.n(prev['requiredMerit'])) {
          c.push('rule', 'career', 'requiredMerit', id, 'requiredMerit 必須單調不減');
        }
        if (c.n(r['checkBonus']) < c.n(prev['checkBonus'])) {
          c.push('rule', 'career', 'checkBonus', id,
            'checkBonus 必須單調不減（否則升官變成懲罰）');
        }
      }
    });
  }
}

export function validateGlow(c: Ctx): void {
  const glows = c.rows('glowTier').slice()
    .sort((a, b) => c.n(a['order']) - c.n(b['order']));
  if (glows.length !== GLOW_TIERS.length) {
    c.push('rule', 'glowTiers', 'count', null,
      `光階必須恰好 ${GLOW_TIERS.length} 筆，實得 ${glows.length}`);
  }
  glows.forEach((g, i) => {
    if (c.n(g['order']) !== i) {
      c.push('rule', 'glowTiers', 'order', c.s(g['id']),
        `order 必須覆蓋 0..${GLOW_TIERS.length - 1}`);
    }
    const prev = glows[i - 1];
    if (prev !== undefined && c.n(g['yieldMul']) <= c.n(prev['yieldMul'])) {
      c.push('rule', 'glowTiers', 'yieldMul', c.s(g['id']), 'yieldMul 必須沿 order 嚴格遞增');
    }
  });
  if (glows.reduce((acc, g) => acc + c.n(g['baseWeight']), 0) <= 0) {
    c.push('rule', 'glowTiers', 'baseWeight', null, 'baseWeight 總和必須 > 0');
  }
}

export function validateTalents(c: Ctx): void {
  for (const d of c.rows('talent')) {
    const id = c.s(d['id']);
    c.text(d['nameKey'], 'talents', 'nameKey', id);
    c.text(d['descKey'], 'talents', 'descKey', id);
    if (c.n(d['cost']) < 0) c.push('rule', 'talents', 'cost', id, 'cost 不得為負');
    const effects = c.arr(d['effects']);
    if (effects.length === 0) {
      c.push('rule', 'talents', 'effects', id, '沒有效果的天賦是死內容');
    }
    effects.forEach((e, i) => {
      c.effect(e['funcType'], e['referId'], 'talents', `effects[${i}]`, id);
    });
  }
}

export function validateTrainingActions(c: Ctx): void {
  const seen = new Set<string>();
  for (const d of c.rows('trainingAction')) {
    const id = c.s(d['id']);
    c.text(d['labelKey'], 'trainingActions', 'labelKey', id);
    const subs = c.list(d['subtitleKeys']);
    if (subs.length === 0) {
      c.push('rule', 'trainingActions', 'subtitleKeys', id, 'subtitleKeys 不得為空（rng.pick 會 throw）');
    }
    subs.forEach((k, i) => { c.text(k, 'trainingActions', `subtitleKeys[${i}]`, id); });
    const key = `${c.s(d['phase'])}/${c.s(d['attr'])}`;
    if (seen.has(key)) {
      c.push('rule', 'trainingActions', 'attr', id, `同一階段的 ${key} 重複定義`);
    }
    seen.add(key);
  }
  // 兩階段 × 四維必須齊全，否則某格生不出來
  for (const phase of ['nanhua', 'faction'] as const) {
    for (const attr of ['war', 'int', 'pol', 'cha'] as const) {
      if (!seen.has(`${phase}/${attr}`)) {
        c.push('rule', 'trainingActions', `${phase}/${attr}`, null,
          `缺少 ${phase} 階段的 ${attr} 行動`, '四維 × 兩階段共 8 筆必須齊全');
      }
    }
  }
}

/**
 * 成長曲線（鍛鍊與事件各一張）。
 *
 * 兩張表的形狀刻意相同：`progress.chapter` 是跨序列累積的全域章序，
 * 所以兩張表都必須長到蓋住「南華村篇 ＋ 最長陣營線」的總章數，
 * 否則後段章節會靜靜落回 fallback 值 —— 玩得到但數值是錯的，測試抓不到。
 *
 * 「上課 vs 工作」的差距就是這兩張 baseByAttr 的比值（GDD §4.2）。
 */
export function validateYieldCurves(c: Ctx): void {
  const seqs = c.rows('chapterSequence');
  const lenOf = (row: Record<string, unknown> | undefined): number =>
    (row === undefined ? 0 : c.list(row['chapters']).length);
  const shared = lenOf(seqs.find((r) => r['factionId'] === null));
  const factionLens = seqs.filter((r) => r['factionId'] !== null).map(lenOf);
  const maxChapters = shared + Math.max(0, ...factionLens);

  const curveKinds = [
    { kind: 'trainingCurve' as const, file: 'trainingCurve' },
    { kind: 'eventYieldCurve' as const, file: 'eventYieldCurve' },
  ];

  for (const spec of curveKinds) {
    const rows = c.rows(spec.kind);
    if (rows.length !== 1) {
      c.push('rule', spec.file, 'count', null,
        `${spec.kind} 必須恰好一筆，實得 ${rows.length} 筆`,
        'registry.single() 會在執行期 throw，這裡先擋住');
      continue;
    }
    for (const d of rows) {
      const id = c.s(d['id']);
      const mul = c.list(d['chapterMultiplier']).map(c.n);
      if (mul.length < maxChapters) {
        c.push('rule', spec.file, 'chapterMultiplier', id,
          `長度 ${mul.length} 不足最長序列的 ${maxChapters} 章`,
          '補齊到總章數，否則後段章節會落回 fallback 值');
      }
      mul.forEach((v, i) => {
        if (v <= 0) {
          c.push('rule', spec.file, `chapterMultiplier[${i}]`, id, '倍率必須 > 0');
        }
        const prev = mul[i - 1];
        if (prev !== undefined && v < prev) {
          c.push('rule', spec.file, `chapterMultiplier[${i}]`, id,
            `倍率必須單調不減（前 ${prev}，本 ${v}）`, '否則升章會變成減益');
        }
      });

      const base = (d['baseByAttr'] ?? {}) as Record<string, unknown>;
      for (const attr of ATTRS) {
        if (base[attr] === undefined) {
          c.push('schema', spec.file, `baseByAttr.${attr}`, id, `缺少 ${attr} 的基礎值`);
        } else if (c.n(base[attr]) < 0) {
          c.push('rule', spec.file, `baseByAttr.${attr}`, id, '基礎值不得為負');
        }
      }
    }
  }

  for (const d of c.rows('eventYieldCurve')) {
    const ratio = c.n(d['failRatio']);
    if (ratio < 0 || ratio > 1) {
      c.push('rule', 'eventYieldCurve', 'failRatio', c.s(d['id']),
        `failRatio 必須落在 0..1（實得 ${ratio}）`,
        '它是「檢定失敗時仍給幾成磨練」的折扣，不是倍率');
    }
  }
}

/**
 * 站位加成的疊加規則（19 §5.2）。名士之間相乘，所以這裡要擋兩件事：
 *   1. 一格容不下全員 → 「全員同格」的爆發時刻永遠不會發生
 *   2. 沒有倍率上限   → 六位滿好感 ★5 同格會指數爆炸
 */
export function validateLinkBonus(c: Ctx): void {
  const rows = c.rows('linkBonus');
  if (rows.length !== 1) {
    c.push('rule', 'linkBonus', 'count', null, `linkBonus 必須恰好一筆，實得 ${rows.length} 筆`);
    return;
  }
  const rules = c.rows('gameRules')[0];
  const roster = rules === undefined
    ? 0
    : c.n(rules['companionCount']) + c.n(rules['superiorCount']);

  for (const d of rows) {
    const id = c.s(d['id']);
    const perSlot = c.n(d['maxPerSlot']);
    if (perSlot < roster) {
      c.push('rule', 'linkBonus', 'maxPerSlot', id,
        `maxPerSlot ${perSlot} 小於陣容人數 ${roster}`,
        '「全員擠進同一格」必須真的做得到，否則爆發感只是空話（19 §5.2）');
    }
    const cap = c.n(d['maxSlotMultiplier']);
    if (!(cap > 1)) {
      c.push('rule', 'linkBonus', 'maxSlotMultiplier', id,
        `上限必須 > 1（實得 ${cap}）`, '≤ 1 會把所有站位加成夾掉');
    }

    // 階段加成必須單調不減 —— 否則養好感度會變成減益
    const stages = c.rows('affinityStage').slice()
      .sort((a, b) => c.n(a['min']) - c.n(b['min'])).map((r) => c.s(r['stage']));
    const table = (d['trainingBonusByStage'] ?? {}) as Record<string, unknown>;
    let prev = -Infinity;
    for (const st of stages) {
      if (table[st] === undefined) {
        c.push('schema', 'linkBonus', `trainingBonusByStage.${st}`, id, `缺少階段 ${st}`);
        continue;
      }
      const v = c.n(table[st]);
      if (v < prev) {
        c.push('rule', 'linkBonus', `trainingBonusByStage.${st}`, id,
          `階段加成必須單調不減（前 ${prev}，本 ${v}）`, '否則養好感度會變成減益');
      }
      prev = v;
    }
  }
}
