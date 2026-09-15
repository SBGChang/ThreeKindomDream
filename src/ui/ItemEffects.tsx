import { useState } from 'react';
/** Long, upgraded item descriptions stay readable without growing beyond the shelf. */
export function ItemEffects({ rows, compact = false, artful = false }: { rows: readonly string[]; compact?: boolean; artful?: boolean }): React.ReactElement {
  const [page, setPage] = useState(0), size = compact ? 1 : 2;
  const pages = Math.max(1, Math.ceil(rows.length / size)), current = Math.min(page, pages - 1);
  return <div className={'item-effect-pages '+(compact ? 'compact' : '')}>
    <div>{rows.slice(current*size,current*size+size).map((text,i) => <p key={i}>{artful ? <ShopEffect text={text}/> : text}</p>)}</div>
    {pages > 1 && <nav aria-label="器物效果分頁"><button aria-label="上一組效果" disabled={current === 0} onClick={() => setPage(current-1)}>‹</button><span>效果 {current+1} / {pages}</span><button aria-label="下一組效果" disabled={current+1 >= pages} onClick={() => setPage(current+1)}>›</button></nav>}
  </div>;
}

/** Preserve conditions and values, including beneficial fee reductions. */
function ShopEffect({ text }: { text: string }): React.ReactElement {
  const concise = text.replace(/的基礎成長/g, '・基礎成長').replace(/的成長量/g, '・成長').replace(/獲取量/g, '獲取').replace(/出現在/g, '出現於').replace(/([武政])系名士站([武政])格的權重/g, '$1系名士・$2格權重');
  const discount = /學費|訓練費/.test(text);
  return <>{concise.split(/([+＋−–-]\s*\d+(?:\.\d+)?%?|→\s*\d+(?:\.\d+)?|【[^】]+】|提高一檔)/g).map((part, i) => /^[+＋−–-]|^→|^【|^提高一檔/.test(part)
    ? <strong key={i} className={part.startsWith('【') ? 'effect-special' : /^[−–-]/.test(part) && !discount ? 'effect-loss' : 'effect-gain'}>{part}</strong>
    : <span key={i}>{part}</span>)}</>;
}
