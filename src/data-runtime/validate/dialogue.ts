import type { Ctx, Rec } from './types.js';
export function validateDialogue(c: Ctx, d: Rec, id: string): void {
  if (!d['dialogue']) return;
  const dialogue = d['dialogue'] as Rec,
    trigger = d['trigger'] as Rec;
  const count =
    trigger['kind'] === 'notable' ? c.arr(trigger['cast']).length + 1 : 2;
  const beats = (value: unknown, path: string) => {
    const rows = c.arr(value);
    if (!rows.length) c.push('schema', 'events', path, id, '對話不得為空');
    rows.forEach((b, i) => {
      c.text(b['textKey'], 'events', `${path}[${i}].textKey`, id);
      if (
        b['speaker'] !== null &&
        (!Number.isInteger(b['speaker']) ||
          c.n(b['speaker']) < 0 ||
          c.n(b['speaker']) >= count)
      )
        c.push('schema', 'events', path, id, '發言者不在演出角色中');
      c.arr(b['moves']).forEach((m) => {
        if (
          !Number.isInteger(m['actor']) ||
          c.n(m['actor']) < 0 ||
          c.n(m['actor']) >= count
        )
          c.push('schema', 'events', path, id, '位移角色不存在');
        if (
          !Number.isFinite(m['duration']) ||
          c.n(m['duration']) < 0 ||
          c.n(m['duration']) > 10000
        )
          c.push('schema', 'events', path, id, '位移時間無效');
        const points = c.arr(m['path']);
        if (points.length < 2)
          c.push('schema', 'events', path, id, '位移路徑至少需要起終點');
        for (const p of points)
          for (const k of ['x', 'y', 'rotate', 'opacity'])
            if ((k === 'x' || p[k] !== undefined) && !Number.isFinite(p[k]))
              c.push('schema', 'events', path, id, '位移座標必須是有限數值');
      });
    });
  };
  beats(dialogue['intro'], 'dialogue.intro');
  for (const outcome of c.arr(dialogue['outcomes'])) {
    if (
      !Number.isInteger(outcome['option']) ||
      c.n(outcome['option']) < 0 ||
      c.n(outcome['option']) >= c.arr(d['options']).length
    )
      c.push(
        'schema',
        'events',
        'dialogue.outcomes',
        id,
        '結果演出對應選項不存在',
      );
    if (
      outcome['passed'] !== undefined &&
      typeof outcome['passed'] !== 'boolean'
    )
      c.push(
        'schema',
        'events',
        'dialogue.outcomes',
        id,
        '結果演出 passed 必須為布林值',
      );
    beats(outcome['beats'], 'dialogue.outcomes.beats');
  }
  c.list(dialogue['keywords']).forEach((k) =>
    c.text(k, 'events', 'dialogue.keywords', id),
  );
}
