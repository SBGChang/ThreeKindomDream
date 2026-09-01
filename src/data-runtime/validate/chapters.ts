import type { Ctx, Rec } from './types.js';

export function validateChapters(c: Ctx): void {
  const chapters = c.ids('chapter');
  const notables = c.ids('notable');

  for (const d of c.rows('chapter')) {
    const id = c.s(d['id']);
    c.text(d['titleKey'], 'chapters', 'titleKey', id);
    if (c.n(d['length']) < 1) c.push('rule', 'chapters', 'length', id, 'length 必須 >= 1');
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

}
