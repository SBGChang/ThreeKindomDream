import { useState } from 'react';
/** Long, upgraded item descriptions stay readable without growing beyond the shelf. */
export function ItemEffects({ rows, compact = false }: { rows: readonly string[]; compact?: boolean }): React.ReactElement {
  const [page, setPage] = useState(0), size = compact ? 1 : 2;
  const pages = Math.max(1, Math.ceil(rows.length / size)), current = Math.min(page, pages - 1);
  return <div className={'item-effect-pages '+(compact ? 'compact' : '')}>
    <div>{rows.slice(current*size,current*size+size).map((text,i) => <p key={i}>{text}</p>)}</div>
    {pages > 1 && <nav aria-label="器物效果分頁"><button aria-label="上一組效果" disabled={current === 0} onClick={() => setPage(current-1)}>‹</button><span>效果 {current+1} / {pages}</span><button aria-label="下一組效果" disabled={current+1 >= pages} onClick={() => setPage(current+1)}>›</button></nav>}
  </div>;
}
