/**
 * 決定性序列化：key 排序 ＋ 固定縮排（2 空格）＋ LF ＋ 結尾換行。
 * 產物同步門禁的可靠性完全建立在它的決定性上（30 §2）——
 * 若它不穩定，門禁會因無關差異而誤報，最後被繞過。
 */
export function serializeDeterministic(value: unknown): string {
  return `${render(value, 0)}\n`;
}

function render(v: unknown, depth: number): string {
  const pad = '  '.repeat(depth);
  const padIn = '  '.repeat(depth + 1);

  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return renderNumber(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const items = v.map((x) => `${padIn}${render(x, depth + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    if (entries.length === 0) return '{}';
    const items = entries.map(
      (e) => `${padIn}${JSON.stringify(e[0])}: ${render(e[1], depth + 1)}`,
    );
    return `{\n${items.join(',\n')}\n${pad}}`;
  }
  throw new Error(`無法序列化的型別: ${typeof v}`);
}

/** 數字格式必須固定：不得出現 1 與 1.0 混用，也不得依賴平台的浮點格式化。 */
function renderNumber(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`不可序列化的數字: ${n}`);
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(6)));
}
