import { DIFFICULTIES } from '../../contracts/core/primitives.js';
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
    const tiers = (d['tiers'] ?? {}) as Record<string, Rec | undefined>;
    let prevDc = -Infinity;
    for (const diff of DIFFICULTIES) {
      const tier = tiers[diff];
      if (tier === undefined) {
        c.push('schema', 'majorChecks', `tiers.${diff}`, id, `缺少難度 ${diff}`);
        continue;
      }
      c.text(tier['briefKey'], 'majorChecks', `tiers.${diff}.briefKey`, id);
      const dc = c.n(tier['dc']);
      if (dc <= prevDc) {
        c.push('rule', 'majorChecks', `tiers.${diff}.dc`, id,
          `DC 必須沿 safe→normal→hard 嚴格遞增（前 ${prevDc}，本 ${dc}）`);
      }
      prevDc = dc;
    }
    if (d['secondaryAttr'] !== null && d['secondaryAttr'] === d['primaryAttr']) {
      c.push('rule', 'majorChecks', 'secondaryAttr', id, '副屬性不得等於主屬性');
    }
    c.list(d['enemyNotables']).forEach((e, i) => {
      if (!notables.has(c.s(e))) {
        c.push('reference', 'majorChecks', `enemyNotables[${i}]`, id, `名士不存在: ${c.s(e)}`);
      }
    });
  }
}
