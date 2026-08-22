import { ATTRS } from '../../contracts/core/primitives.js';
import type { Ctx } from './types.js';

export function validateEvents(c: Ctx): void {
  const notables = c.ids('notable');
  const pools = c.ids('paramPool');
  const curves = c.ids('dcCurve');

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
    const owner = d['ownerNotable'];
    if (owner !== null && owner !== undefined && !notables.has(c.s(owner))) {
      c.push('reference', 'events', 'ownerNotable', id, `名士不存在: ${c.s(owner)}`);
    }
    if (d['eventKind'] === 'notable' && (owner === null || owner === undefined)) {
      c.push('rule', 'events', 'ownerNotable', id, 'notable 類事件必須指定 ownerNotable');
    }

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

  for (const d of c.rows('dcCurve')) {
    const id = c.s(d['id']);
    if (c.list(d['byChapter']).length === 0) {
      c.push('rule', 'dcCurves', 'byChapter', id, 'byChapter 不得為空');
    }
  }
}
