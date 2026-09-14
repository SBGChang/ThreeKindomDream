import type { Ctx, Rec } from './types.js';
/** Economy tables and explicit event graphs fail at load time rather than mid-run. */
export function validateEconomy(c: Ctx): void {
  const rule = c.rows('growthRule')[0],
    r = rule?.['economy'] as Rec | undefined;
  if (!r) {
    c.push('schema', 'economy', 'economy', null, '缺少經濟規則');
    return;
  }
  const numeric = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const table = (name: string, length: number, integer = false) => {
    const row = c.list(r[name]);
    if (
      row.length !== length ||
      row.some((v) => !numeric(v) || (integer && !Number.isSafeInteger(v)))
    )
      c.push('rule', 'economy', name, null, '數值表長度或非負數值不符');
  };
  for (const name of [
    'investmentCosts',
    'attendance',
    'commissionBonus',
    'storySalary',
    'commissionMerit',
    'storyMerit',
    'commissionAbility',
    'commissionRank',
    'commissionChapter',
    'storyChapter',
    'storyAffinity',
    'storyCooperations',
    'itemPrices',
    'fragmentPrices',
  ])
    table(name, 5, true);
  for (const name of ['commissionGrowth', 'storyGrowth']) table(name, 5);
  table('campaignSalary', 7, true);
  table('shopSlots', 4, true);
  table('newcomerBonus', 4, true);
  table('shopChapterCaps', 4, true);
  table('interactionFragmentCaps', 9, true);
  table('traitPower', 3);
  for (const name of ['fixedSalary', 'fixedGrowth'])
    if (
      c.list(r[name]).length < c.rows('chapter').length ||
      c.list(r[name]).some((v) => !numeric(v))
    )
      c.push('rule', 'economy', name, null, '每章必須有非負數值');
  for (const name of [
    'startingMoney',
    'activeTraits',
    'storyCooldown',
    'commissionCooldown',
    'storyPity',
    'affinityTurnCap',
    'compensationTurns',
  ])
    if (
      !numeric(r[name]) ||
      !Number.isSafeInteger(r[name]) ||
      (name !== 'startingMoney' && c.n(r[name]) === 0)
    )
      c.push('rule', 'economy', name, null, '需要非負整數與非零容量');
  for (const field of [
    'skillPrices',
    'traitPrices',
    'primaryNeeds',
    'secondaryNeeds',
    'lessonChapters',
  ])
    for (const tier of ['common', 'fine', 'peerless']) {
      const rows = c.list((r[field] as Rec)?.[tier]);
      if (
        rows.length !== 3 ||
        rows.some((v) => !numeric(v) || !Number.isSafeInteger(v)) ||
        rows.some((v, i) => i > 0 && c.n(v) < c.n(rows[i - 1]))
      )
        c.push(
          'rule',
          'economy',
          field + '.' + tier,
          null,
          '課程需要三個不遞減整數',
        );
    }
  const weights = c.list(r['shopWeights']);
  if (
    weights.length !== 4 ||
    weights.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== 5 ||
        row.some((v) => !numeric(v)) ||
        row.reduce((a, b) => a + Number(b), 0) <= 0,
    )
  )
    c.push('rule', 'economy', 'shopWeights', null, '需要四組有效的五星權重');
  for (const field of ['optionReward', 'optionDc', 'practiceRatio'])
    for (const tier of ['low', 'mid', 'high', 'story'])
      if (!numeric((r[field] as Rec)?.[tier]))
        c.push('rule', 'economy', field + '.' + tier, null, '選項倍率無效');
  const bands = c.arr(r['growthBands']);
  if (
    !bands.length ||
    c.n(bands.at(-1)?.['max']) !== 100 ||
    bands.some(
      (b, i) =>
        !numeric(b['max']) ||
        c.n(b['ratio']) <= 0 ||
        c.n(b['ratio']) > 1 ||
        (i > 0 && c.n(b['max']) <= c.n(bands[i - 1]?.['max'])),
    )
  )
    c.push(
      'rule',
      'economy',
      'growthBands',
      null,
      '成長帶必須遞增到 100，倍率在 (0,1]',
    );
  const events = new Map(c.rows('event').map((e) => [c.s(e['id']), e]));
  const edges = new Map<string, string[]>();
  for (const [id, e] of events) {
    const p = e['progression'] as Rec | undefined;
    if ((e['trigger'] as Rec)?.['kind'] === 'notable' && !p)
      c.push('rule', 'events', 'progression', id, '人物事件必須明訂星級與前置');
    if (p) {
      if (![1, 2, 3, 4, 5].includes(c.n(p['rarity'])))
        c.push(
          'rule',
          'events',
          'progression.rarity',
          id,
          '事件星級必須為 1–5',
        );
      const previous = c.list(p['previous']).map(String);
      edges.set(id, previous);
      for (const prev of previous)
        if (!events.has(prev))
          c.push(
            'reference',
            'events',
            'progression.previous',
            id,
            '找不到前置事件 ' + prev,
          );
      const choice = p['choice'] as Rec | undefined;
      if (choice) {
        const src = events.get(c.s(choice['event']));
        if (
          !src ||
          !previous.includes(c.s(choice['event'])) ||
          !Number.isSafeInteger(choice['option']) ||
          c.n(choice['option']) < 0 ||
          c.n(choice['option']) >= c.list(src['options']).length
        )
          c.push(
            'reference',
            'events',
            'progression.choice',
            id,
            '分支選擇必須引用有效前置選項',
          );
      }
    }
    for (const [i, o] of c.arr(e['options']).entries()) {
      if (
        o['moneyCost'] !== undefined &&
        (!numeric(o['moneyCost']) || !Number.isSafeInteger(o['moneyCost']))
      )
        c.push(
          'rule',
          'events',
          'options.' + i + '.moneyCost',
          id,
          '支出需非負整數',
        );
      if (o['resultKey'])
        c.text(o['resultKey'], 'events', 'options.' + i + '.resultKey', id);
    }
  }
  const visited = new Set<string>(),
    active = new Set<string>();
  const visit = (id: string): void => {
    if (active.has(id)) {
      c.push('rule', 'events', 'progression', id, '事件前置形成循環');
      return;
    }
    if (visited.has(id)) return;
    active.add(id);
    for (const next of edges.get(id) ?? []) visit(next);
    active.delete(id);
    visited.add(id);
  };
  for (const id of edges.keys()) visit(id);
}
