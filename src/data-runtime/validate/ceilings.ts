import { APTITUDE_GRADES } from '../../contracts/core/primitives.js';
import type { Ctx } from './types.js';

/**
 * 兩道**天花板**：資質 → 四維上限、`careerCapBase` → 官階上限。
 *
 * ── 為什麼這一檔存在 ★ ──────────────────────────────
 * 這兩條是這一版新增的【跨輪成長軸】，而它們的失效模式一模一樣：
 * **寫錯不會壞掉，只會讓那條軸悄悄消失。**
 *
 * 若 `attrCap` 全部寫成 100，四維的天花板就等於沒有，
 * 而遊戲照常跑、四道門禁照常綠 —— 只是玩到第五輪的人會發現
 * 天命商店買的東西沒有讓他變強（實測：第一輪就拿到全滿的 85%）。
 *
 * 若 `careerCapBase` 寫成 12，官階的跨輪成長同樣消失，
 * 而唯一的症狀是「第一輪就當上大將軍」—— 那要玩過才看得出來。
 *
 * 所以這兩條必須釘在載入期。
 */
export function validateCeilings(c: Ctx): void {
  const scale = c.n(c.rows('attributeCap')[0]?.['attrMax'] ?? 0);

  // ── 一、資質的 attrCap 沿階遞增，且頂階剛好等於尺度 ──
  const grades = c.rows('aptitudeGrade');
  const capByGrade = new Map<string, number>();
  for (const d of grades) {
    const id = c.s(d['id']);
    const cap = c.n(d['attrCap']);
    capByGrade.set(c.s(d['grade']), cap);
    if (!(cap > 0)) {
      c.push('rule', 'aptitudeGrade', 'attrCap', id, `attrCap 必須 > 0（實得 ${cap}）`);
    }
    if (cap > scale) {
      c.push('rule', 'aptitudeGrade', 'attrCap', id,
        `attrCap ${cap} 超過四維尺度 ${scale}`,
        'attrCap 是「這一輪爬得到哪」，attributeCap.attrMax 是尺度本身');
    }
  }

  let prev = -Infinity;
  for (const g of APTITUDE_GRADES) {
    const cap = capByGrade.get(g);
    if (cap === undefined) {
      c.push('rule', 'aptitudeGrade', `grade=${g}`, null, `缺少資質階 ${g}`);
      continue;
    }
    if (cap < prev) {
      c.push('rule', 'aptitudeGrade', `grade=${g}`, null,
        `attrCap 倒退（前 ${prev}，本 ${cap}）`, '資質越高，天花板不該越低');
    }
    prev = cap;
  }

  const top = APTITUDE_GRADES[APTITUDE_GRADES.length - 1];
  const bottomG = APTITUDE_GRADES[0];
  const topCap = top === undefined ? 0 : capByGrade.get(top) ?? 0;
  const lowCap = bottomG === undefined ? 0 : capByGrade.get(bottomG) ?? 0;
  if (grades.length > 0 && topCap !== scale) {
    c.push('rule', 'aptitudeGrade', `grade=${String(top)}`, null,
      `最高資質的 attrCap 是 ${topCap}，應等於尺度 ${scale}`,
      '否則等級表最上面那一段（S 帶）永遠拿不到 —— 那是死內容');
  }
  if (grades.length > 0 && lowCap >= scale) {
    c.push('rule', 'aptitudeGrade', `grade=${String(bottomG)}`, null,
      '最低資質的 attrCap 已等於尺度 —— 天花板沒有成長空間',
      '資質若不決定天花板，四維這條線就沒有跨輪成長（14 §2）');
  }

  // ── 二、官階上限：第一輪要低於階數總和，否則跨輪成長不存在 ──
  const rules = c.rows('gameRules')[0];
  const ranks = c.rows('careerRank');
  if (rules === undefined || ranks.length === 0) return;
  const base = c.n(rules['careerCapBase']);
  const levels = new Set(ranks.map((r) => c.n(r['level'])));
  const top2 = Math.max(...levels);

  if (base < 1) {
    c.push('rule', 'gameRules', 'careerCapBase', c.s(rules['id']),
      `careerCapBase 必須 ≥ 1（實得 ${base}）`, '0 表示第一輪連白身都不是');
  }
  if (base >= top2) {
    c.push('rule', 'gameRules', 'careerCapBase', c.s(rules['id']),
      `careerCapBase ${base} 已達最高階 ${top2} —— 官階沒有跨輪成長`,
      '天命商店的〈官途〉會沒有東西可賣；實測那正是「第一輪就爬到很高」的病根');
  }
}
