import { ATTRS, OPTION_TIERS, RARITIES } from '../../contracts/core/primitives.js';
import type { Ctx, Rec } from './types.js';

/**
 * trigger 的合法性。判別聯集讓「notable 必須有 owner」在型別層就成立，
 * 因此這裡只需要檢查【引用存在】與【座標落在可抽範圍】。
 */
function validateTrigger(
  c: Ctx, d: Rec, id: string,
  notables: ReadonlySet<string>, stages: ReadonlySet<string>,
): void {
  const trig = (d['trigger'] ?? {}) as Rec;
  const kind = c.s(trig['kind']);
  if (kind === 'commission') {
    const attr = c.s(trig['attr']);
    if (!(ATTRS as readonly string[]).includes(attr)) {
      c.push('schema', 'events', 'trigger.attr', id, `未知的四維: ${attr}`);
    }
    const rarity = c.n(trig['rarity']);
    if (!(RARITIES as readonly number[]).includes(rarity)) {
      c.push('schema', 'events', 'trigger.rarity', id, `稀有度超出範圍: ${rarity}`);
    }
    return;
  }
  if (kind === 'notable') {
    // cast 長度 1 就是單人事件 —— 單人與多人不需要兩套機制（19 §6.2）。
    const cast = c.arr(trig['cast']);
    if (cast.length === 0) {
      c.push('rule', 'events', 'trigger.cast', id, 'cast 為空 —— 這則事件永遠抽不出來');
    }
    const seen = new Set<string>();
    cast.forEach((m, i) => {
      const who = c.s(m['notableId']);
      if (!notables.has(who)) {
        c.push('reference', 'events', `trigger.cast[${i}].notableId`, id, `名士不存在: ${who}`);
      }
      if (seen.has(who)) {
        c.push('rule', 'events', `trigger.cast[${i}].notableId`, id,
          `同一位名士在 cast 裡出現兩次: ${who}`);
      }
      seen.add(who);
      const stage = c.s(m['minStage']);
      if (!stages.has(stage)) {
        c.push('reference', 'events', `trigger.cast[${i}].minStage`, id,
          `好感度階段不存在: ${stage}`);
      }
    });
    if (c.n(trig['step']) < 0) {
      c.push('rule', 'events', 'trigger.step', id, `step 不得為負: ${c.n(trig['step'])}`);
    }
    // 鏈的進度靠 seenUniqueIds 表示，因此鏈上的事件【必須】unique ——
    // 少了它，step N−1 永遠不會被記成「發生過」，整條鏈就卡在第一步。
    if (d['unique'] !== true) {
      c.push('rule', 'events', 'unique', id, '人物事件必須 unique: true',
        '鏈的進度就是 seenUniqueIds 裡有沒有它 —— 非 unique 的事件不會被記錄');
    }
    return;
  }
  c.push('schema', 'events', 'trigger.kind', id, `未知的 trigger 類型: ${kind}`);
}

/**
 * 每個【可抽到的】(維 × 稀有度) 都必須有一則無門檻的委託 ★
 *
 * 這是新制唯一會在執行期爆掉的結構洞：抽取由 (所選維度 × 光階推出的稀有度)
 * 定位，若那一桶沒有內容、或門檻把它濾空了，執行期就沒有合法出口 ——
 * 而依 §2.2 的五個出口，靜靜降級不是其中之一。
 *
 * 「可抽到」由 `glowTier.rarityWeights` 推導而非寫死：灰盒只用到 ★1–★4，
 * 那是內容進度不是結構，因此權重為 0 的稀有度不要求有內容。
 */
function validateCommissionCoverage(c: Ctx): void {
  const reachable = new Set<number>();
  for (const g of c.rows('glowTier')) {
    c.list(g['rarityWeights']).forEach((w, i) => {
      if (c.n(w) > 0) reachable.add(i + 1);
    });
  }
  if (reachable.size === 0) {
    c.push('rule', 'glowTiers', 'rarityWeights', null,
      '沒有任何光階抽得到委託 —— 選了固定事件之後不會有任何事發生',
      '至少一個光階要有非零的 rarityWeights');
    return;
  }

  const byBucket = new Map<string, { total: number; open: number }>();
  for (const d of c.rows('event')) {
    const trig = (d['trigger'] ?? {}) as Rec;
    if (c.s(trig['kind']) !== 'commission') continue;
    const key = `${c.s(trig['attr'])}/${c.n(trig['rarity'])}`;
    const cur = byBucket.get(key) ?? { total: 0, open: 0 };
    byBucket.set(key, {
      total: cur.total + 1,
      open: cur.open + (c.list(d['requirements']).length === 0 ? 1 : 0),
    });
  }

  for (const attr of ATTRS) {
    for (const rarity of [...reachable].sort((a, b) => a - b)) {
      const key = `${attr}/${rarity}`;
      const bucket = byBucket.get(key);
      if (bucket === undefined || bucket.total === 0) {
        c.push('rule', 'events', `trigger[${key}]`, null,
          `委託桶 ${key} 沒有內容，但光階抽得到它`,
          `新增一則 trigger: { kind: 'commission', attr: '${attr}', rarity: ${rarity} } 的委託`);
        continue;
      }
      if (bucket.open === 0) {
        c.push('rule', 'events', `trigger[${key}]`, null,
          `委託桶 ${key} 的 ${bucket.total} 則全部有門檻 —— 門檻不符時會抽到空池`,
          '該桶至少要有一則 requirements 為空的保底委託');
      }
    }
  }
}

/**
 * 委託的三檔契約（17 §5）★
 *
 * 「高條件高報酬 / 中條件中報酬 / 低條件低報酬」是設計承諾，
 * 靠作者自律撐不住 —— 三個選項寫成一樣好，不會讓任何測試失敗。
 * 因此把它變成載入期規則：
 *
 *   1. 委託恰好三個選項，low／mid／high 各一
 *   2. 功績 low < mid < high
 *   3. DC 曲線 low ≤ mid ≤ high（以 easy/normal/hard 的序位比）
 *   4. 只有 high 可以有門檻，而且【必須】有 —— 否則「高條件」是空話
 *   5. low 與 mid 一律無門檻 —— 這是「抽到的委託永遠按得下去」的保證
 */
function validateOptionTiers(c: Ctx, d: Rec, id: string): void {
  const trig = (d['trigger'] ?? {}) as Rec;
  const opts = c.arr(d['options']);

  // 非委託（名士事件）不是階梯：選項一律 story，否則畫面會標出
  // 不存在的難度差，而遞增檢查也無從比起。
  if (c.s(trig['kind']) !== 'commission') {
    for (const [i, o] of opts.entries()) {
      if (c.s(o['tier']) !== 'story') {
        c.push('rule', 'events', `options[${i}].tier`, id,
          `非委託事件的選項必須是 story（實得 ${c.s(o['tier'])}）`,
          '名士事件是性格分歧，不是難度階梯');
      }
    }
    return;
  }

  const byTier = new Map<string, Rec>();
  for (const o of opts) {
    const tier = c.s(o['tier']);
    if (tier === 'story') {
      c.push('rule', 'events', 'options[].tier', id,
        '委託的選項不得是 story —— 它必須是三檔階梯的一員');
      continue;
    }
    if (!(OPTION_TIERS as readonly string[]).includes(tier)) {
      c.push('schema', 'events', 'options[].tier', id, `未知的選項檔次: ${tier}`);
      continue;
    }
    if (byTier.has(tier)) {
      c.push('rule', 'events', 'options[].tier', id, `檔次 ${tier} 出現兩次`);
      continue;
    }
    byTier.set(tier, o);
  }
  for (const tier of OPTION_TIERS) {
    if (!byTier.has(tier)) {
      c.push('rule', 'events', `options[${tier}]`, id,
        `委託缺少 ${tier} 檔選項`,
        '每則委託都要有高／中／低三檔，否則「高條件高報酬」不成立');
    }
  }
  if (byTier.size !== OPTION_TIERS.length) return;

  const meritOf = (o: Rec): number => c.arr(o['rewards'])
    .filter((r) => c.s(r['kind']) === 'merit')
    .reduce((sum, r) => sum + c.n(r['amount']), 0);
  // 難度以【該曲線的實際首值】比較，不以曲線 ID 排序 ——
  // ID 只是命名慣例，實際數字才是玩家碰到的難度。
  // 順帶：這也讓「新增一條中間難度的曲線」不必回來改這裡。
  const dcHead = new Map<string, number>();
  for (const row of c.rows('dcCurve')) {
    dcHead.set(c.s(row['id']), c.list(row['byTier']).map(c.n)[0] ?? -1);
  }
  const dcOf = (o: Rec): number => {
    const chk = o['check'];
    if (chk === null || chk === undefined || typeof chk !== 'object') return -1;
    return dcHead.get(c.s((chk as Rec)['dcCurveId'])) ?? -1;
  };

  // 三檔必須檢定【同一維】。跨維比 DC 沒有意義，而且畫面上會出現
  // 「低 63% ／ 中 100%」—— 標籤寫著低，玩家讀成最容易，那是誤導不是取捨。
  const attrOf = (o: Rec): string => {
    const chk = o['check'];
    if (chk === null || chk === undefined || typeof chk !== 'object') return '';
    return c.s((chk as Rec)['attr']);
  };
  const attrs = new Set(OPTION_TIERS.map((tr) => attrOf(byTier.get(tr) ?? {})));
  if (attrs.size > 1) {
    c.push('rule', 'events', 'options[].check.attr', id,
      `三檔檢定了不同的維（${[...attrs].join('／')}）`,
      '做法的差別放在文案與磨練權重，難度階梯必須是同一維才比得出高低');
  }

  // 磨練總權重也必須同向遞增。軸線只剩費力程度之後，
  // 「低檔比中檔練得多」就是階梯壞掉了 —— 舊版手寫權重時真的發生過。
  const weightOf = (o: Rec): number => c.arr(o['practice'])
    .reduce((sum, pr) => sum + c.n(pr['weight']), 0);

  let prevMerit = -Infinity;
  let prevDc = -Infinity;
  let prevWeight = -Infinity;
  for (const tier of OPTION_TIERS) {
    const o = byTier.get(tier);
    if (o === undefined) continue;
    const m = meritOf(o);
    if (m <= prevMerit) {
      c.push('rule', 'events', `options[${tier}].rewards`, id,
        `${tier} 檔的功績 ${m} 未高於前一檔 ${prevMerit}`,
        '報酬必須隨檔次遞增，否則玩家沒有理由挑難的');
    }
    prevMerit = m;

    const dc = dcOf(o);
    if (dc < prevDc) {
      c.push('rule', 'events', `options[${tier}].check`, id,
        `${tier} 檔的難度低於前一檔`, '難度必須隨檔次遞增');
    }
    prevDc = dc;

    const w = weightOf(o);
    if (w < prevWeight) {
      c.push('rule', 'events', `options[${tier}].practice`, id,
        `${tier} 檔的磨練總權重 ${w} 低於前一檔 ${prevWeight}`,
        '費力程度是唯一的軸線，磨練必須跟著遞增');
    }
    prevWeight = w;

    const reqs = c.list(o['requirements']).length;
    if (tier === 'high' && reqs === 0) {
      c.push('rule', 'events', `options[${tier}].requirements`, id,
        'high 檔沒有門檻 —— 「高條件」是空話',
        '掛一條官階門檻，例如 career.<line> >= rarity + 1');
    }
    if (tier !== 'high' && reqs > 0) {
      c.push('rule', 'events', `options[${tier}].requirements`, id,
        `${tier} 檔不得有門檻`,
        '低中兩檔永遠可按，是「抽到的委託不會全部鎖住」的保證');
    }
  }
}

export function validateEvents(c: Ctx): void {
  const notables = c.ids('notable');
  const pools = c.ids('paramPool');
  const curves = c.ids('dcCurve');
  const stages = new Set(c.rows('affinityStage').map((d) => c.s(d['stage'])));

  validateCommissionCoverage(c);

  for (const d of c.rows('event')) {
    const id = c.s(d['id']);
    c.text(d['titleKey'], 'events', 'titleKey', id);
    c.text(d['bodyKey'], 'events', 'bodyKey', id);

    if (c.n(d['weight']) <= 0) {
      c.push('rule', 'events', 'weight', id, 'weight 必須 > 0（否則是死內容，永遠抽不到）');
    }
    const opts = c.arr(d['options']);
    if (opts.length === 0) {
      c.push('rule', 'events', 'options', id, 'options 不得為空（否則事件無法結束）');
    }
    if (d['unique'] === false && d['collectible'] === true) {
      c.push('rule', 'events', 'collectible', id,
        '模板型事件不得 collectible', '模板數量隨參數池變動，會讓完成度分母失真');
    }
    validateTrigger(c, d, id, notables, stages);

    const slots = c.arr(d['paramSlots']);
    slots.forEach((sl, i) => {
      if (!pools.has(c.s(sl['poolId']))) {
        c.push('reference', 'events', `paramSlots[${i}].poolId`, id,
          `參數池不存在: ${c.s(sl['poolId'])}`);
      }
    });

    // 佔位符與 paramSlots 必須雙向相等（否則抽了沒用到，或填不出來）
    const body = c.input.bodies.get(c.s(d['bodyKey']));
    if (body !== undefined) {
      const found = new Set([...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? ''));
      const declared = new Set(slots.map((sl) => c.s(sl['name'])));
      for (const f of found) {
        if (!declared.has(f)) {
          c.push('rule', 'events', 'bodyKey', id,
            `模板有佔位符 {${f}} 但 paramSlots 未宣告`);
        }
      }
      for (const dd of declared) {
        if (!found.has(dd)) {
          c.push('rule', 'events', 'paramSlots', id,
            `宣告了參數 ${dd} 但模板沒有 {${dd}}`);
        }
      }
    }

    validateOptionTiers(c, d, id);

    opts.forEach((o, i) => {
      c.text(o['labelKey'], 'events', `options[${i}].labelKey`, id);
      const chk = o['check'];
      if (chk !== null && chk !== undefined && typeof chk === 'object') {
        const curveId = c.s((chk as Record<string, unknown>)['dcCurveId']);
        if (!curves.has(curveId)) {
          c.push('reference', 'events', `options[${i}].check.dcCurveId`, id,
            `DC 曲線不存在: ${curveId}`);
        }
      }

      // 事上磨練必須存在。這條規則就是「事件也會長能力」由設計變成保證的地方 ——
      // 允許空的話，會不會長能力就退回逐條運氣，玩家無法把事件當成一種培養路線（17 §8）。
      const practice = c.arr(o['practice']);
      if (practice.length === 0) {
        c.push('rule', 'events', `options[${i}].practice`, id,
          '每個選項都必須磨練到至少一維',
          '做了事卻學不到東西，事件就只是資源販賣機（GDD §8.2）');
      }
      const seenAttrs = new Set<string>();
      practice.forEach((pr, j) => {
        const attr = c.s(pr['attr']);
        const path = `options[${i}].practice[${j}]`;
        if (!(ATTRS as readonly string[]).includes(attr)) {
          c.push('schema', 'events', `${path}.attr`, id, `未知的四維: ${attr}`);
        }
        if (seenAttrs.has(attr)) {
          c.push('rule', 'events', `${path}.attr`, id,
            `同一選項重複宣告 ${attr}`, '合併成一筆並把權重相加，否則數值來源會分散');
        }
        seenAttrs.add(attr);
        if (c.n(pr['weight']) <= 0) {
          c.push('rule', 'events', `${path}.weight`, id,
            'weight 必須 > 0（否則是宣告了卻不生效的死資料）');
        }
      });
    });
  }

  for (const d of c.rows('paramPool')) {
    const id = c.s(d['id']);
    const entries = c.list(d['entries']);
    if (entries.length === 0) {
      c.push('rule', 'paramPools', 'entries', id, '參數池不得為空（rng.pick 會 throw）');
    }
    entries.forEach((k, i) => { c.text(k, 'paramPools', `entries[${i}]`, id); });
  }

  // DC 曲線的索引是【官階階級】（17 §4）。長度不足會讓高階落回表尾 ——
  // 那不是 fallback 而是「後期難度停止成長」，玩家會覺得後段突然變簡單。
  const maxRank = Math.max(1, ...c.rows('careerRank').map((r) => c.n(r['level'])));
  for (const d of c.rows('dcCurve')) {
    const id = c.s(d['id']);
    const byTier = c.list(d['byTier']).map(c.n);
    if (byTier.length < maxRank) {
      c.push('rule', 'dcCurves', 'byTier', id,
        `長度 ${byTier.length} 不足官階數 ${maxRank}`,
        '補齊到官階數，否則高階的難度會停止成長');
    }
    byTier.forEach((v, i) => {
      const prev = byTier[i - 1];
      if (prev !== undefined && v <= prev) {
        c.push('rule', 'dcCurves', `byTier[${i}]`, id,
          `DC 必須隨官階嚴格遞增（前 ${prev}，本 ${v}）`,
          '升官之後委託反而變簡單，報酬卻更高 —— 那是可以刷的');
      }
    });
  }
}
