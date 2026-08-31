import { CAREER_LINES, DIFFICULTIES } from '../../contracts/core/primitives.js';
import type { Ctx, Rec } from './types.js';

export function validateChapters(c: Ctx): void {
  const checks = c.ids('majorCheck');
  const chapters = c.ids('chapter');
  const notables = c.ids('notable');

  for (const d of c.rows('chapter')) {
    const id = c.s(d['id']);
    c.text(d['titleKey'], 'chapters', 'titleKey', id);
    if (c.n(d['length']) < 1) c.push('rule', 'chapters', 'length', id, 'length 必須 >= 1');
    if (!checks.has(c.s(d['majorCheckId']))) {
      c.push('reference', 'chapters', 'majorCheckId', id,
        `大檢定不存在: ${c.s(d['majorCheckId'])}`);
    }
    if (d['onPass'] === 'chooseFaction' && d['factionId'] !== null) {
      c.push('rule', 'chapters', 'onPass', id, 'chooseFaction 只能出現在無陣營序列');
    }
  }

  const owner = new Map<string, string>();
  for (const d of c.rows('chapterSequence')) {
    const id = c.s(d['id']);
    const list = c.list(d['chapters']).map(c.s);
    if (list.length === 0) c.push('rule', 'sequences', 'chapters', id, '序列至少一章');
    list.forEach((ch, i) => {
      if (!chapters.has(ch)) {
        c.push('reference', 'sequences', `chapters[${i}]`, id, `章節不存在: ${ch}`);
      }
      const prevOwner = owner.get(ch);
      if (prevOwner !== undefined) {
        c.push('rule', 'sequences', `chapters[${i}]`, id,
          `章節 ${ch} 同時屬於 ${prevOwner} 與 ${id}`);
      }
      owner.set(ch, id);
    });
  }

  for (const d of c.rows('majorCheck')) {
    const id = c.s(d['id']);
    const routes = (d['routes'] ?? {}) as Record<string, Rec | undefined>;
    // 主屬性 → 已佔用它的路線。用來擋「兩條路線其實是同一條」。
    const primaryOwner = new Map<string, string>();

    for (const line of CAREER_LINES) {
      const route = routes[line];
      if (route === undefined) {
        c.push('schema', 'majorChecks', `routes.${line}`, id, `缺少路線 ${line}`);
        continue;
      }
      const primary = c.s(route['primaryAttr']);
      // 兩條路線必須是真的兩種通關方式。主屬性相同時，六個選項只是三個選項的
      // 兩種記帳方式 —— 玩家看得到六顆按鈕，但決策空間沒有變大。
      const owner = primaryOwner.get(primary);
      if (owner !== undefined) {
        c.push('rule', 'majorChecks', `routes.${line}.primaryAttr`, id,
          `主屬性 ${primary} 與路線 ${owner} 相同 —— 兩條路線必須是不同的通關方式`);
      }
      primaryOwner.set(primary, line);

      if (route['secondaryAttr'] !== null && route['secondaryAttr'] === route['primaryAttr']) {
        c.push('rule', 'majorChecks', `routes.${line}.secondaryAttr`, id, '副屬性不得等於主屬性');
      }

      const tiers = (route['tiers'] ?? {}) as Record<string, Rec | undefined>;
      let prevDc = -Infinity;
      for (const diff of DIFFICULTIES) {
        const tier = tiers[diff];
        if (tier === undefined) {
          c.push('schema', 'majorChecks', `routes.${line}.tiers.${diff}`, id, `缺少難度 ${diff}`);
          continue;
        }
        c.text(tier['briefKey'], 'majorChecks', `routes.${line}.tiers.${diff}.briefKey`, id);
        const dc = c.n(tier['dc']);
        if (dc <= prevDc) {
          c.push('rule', 'majorChecks', `routes.${line}.tiers.${diff}.dc`, id,
            `DC 必須沿 safe→normal→hard 嚴格遞增（前 ${prevDc}，本 ${dc}）`);
        }
        prevDc = dc;
      }
    }

    c.list(d['enemyNotables']).forEach((e, i) => {
      if (!notables.has(c.s(e))) {
        c.push('reference', 'majorChecks', `enemyNotables[${i}]`, id, `名士不存在: ${c.s(e)}`);
      }
    });
  }
}
