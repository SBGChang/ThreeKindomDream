import type { Ctx, Rec } from './types.js';

export function validateShop(c: Ctx): void {
  const shops = c.ids('shopItem');
  const talents = c.ids('talent');

  for (const d of c.rows('shopItem')) {
    const id = c.s(d['id']);
    c.text(d['nameKey'], 'shop', 'nameKey', id);
    c.text(d['descKey'], 'shop', 'descKey', id);

    const levels = c.arr(d['levels']);
    if (levels.length === 0) c.push('rule', 'shop', 'levels', id, 'levels 不得為空');
    levels.forEach((lv, i) => {
      if (c.n(lv['level']) !== i + 1) {
        c.push('rule', 'shop', `levels[${i}].level`, id,
          `level 必須從 1 起連續（實得 ${c.n(lv['level'])}）`);
      }
      const prev = levels[i - 1];
      if (prev !== undefined && c.n(lv['cost']) < c.n(prev['cost'])) {
        c.push('rule', 'shop', `levels[${i}].cost`, id, 'cost 必須沿等級單調不減');
      }
      const g = (lv['grant'] ?? {}) as Rec;
      if (g['kind'] === 'unlockTalent' && !talents.has(c.s(g['talentId']))) {
        c.push('reference', 'shop', `levels[${i}].grant.talentId`, id,
          `天賦不存在: ${c.s(g['talentId'])}`);
      }
      if (g['kind'] === 'effect') {
        const ref = (g['ref'] ?? {}) as Rec;
        c.effect(ref['funcType'], ref['referId'], 'shop', `levels[${i}].grant.ref`, id);
      }
    });

    c.list(d['requiresItems']).forEach((r, i) => {
      if (!shops.has(c.s(r))) {
        c.push('reference', 'shop', `requiresItems[${i}]`, id, `品項不存在: ${c.s(r)}`);
      }
    });
  }

  // 前置關係不得成環
  const graph = new Map(c.rows('shopItem').map(
    (d) => [c.s(d['id']), c.list(d['requiresItems']).map(c.s)] as const,
  ));
  const mark = new Map<string, 0 | 1 | 2>();
  const hasCycle = (node: string): boolean => {
    const st = mark.get(node) ?? 0;
    if (st === 1) return true;
    if (st === 2) return false;
    mark.set(node, 1);
    for (const m of graph.get(node) ?? []) if (hasCycle(m)) return true;
    mark.set(node, 2);
    return false;
  };
  for (const [node] of graph) {
    if (hasCycle(node)) {
      c.push('rule', 'shop', 'requiresItems', node, '前置關係成環');
      break;
    }
  }
}

export function validateFactions(c: Ctx): void {
  const notables = c.ids('notable');
  const pools = c.ids('notablePool');
  for (const d of c.rows('faction')) {
    const id = c.s(d['id']);
    c.text(d['nameKey'], 'factions', 'nameKey', id);
    c.text(d['rejectReasonKey'], 'factions', 'rejectReasonKey', id);
    if (!notables.has(c.s(d['lordId']))) {
      c.push('reference', 'factions', 'lordId', id, `主公不存在: ${c.s(d['lordId'])}`);
    }
    if (!pools.has(c.s(d['superiorPoolId']))) {
      c.push('reference', 'factions', 'superiorPoolId', id,
        `上司池不存在: ${c.s(d['superiorPoolId'])}`);
    }
    const speech = c.list(d['bondSpeechKeys']);
    if (speech.length !== 4) {
      c.push('rule', 'factions', 'bondSpeechKeys', id,
        `bondSpeechKeys 必須恰好 4 條（緣分 0..3），實得 ${speech.length}`);
    }
    speech.forEach((k, i) => { c.text(k, 'factions', `bondSpeechKeys[${i}]`, id); });
    if (c.s(d['packId']) === 'pack:core') {
      c.push('rule', 'factions', 'packId', id,
        '陣營內容不得放進 pack:core（ARCHITECTURE §2.12）');
    }
  }
}
