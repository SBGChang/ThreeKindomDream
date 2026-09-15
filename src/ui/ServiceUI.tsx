import { ArtControl } from './ArtControl.js';

export function ServiceHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }): React.ReactElement {
  return <header className="service-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <ArtControl kind="back" label="返回行旅" onClick={onBack} /></header>;
}

export function ServicePager({ page, total, onPage, label }: { page: number; total: number; onPage: (page: number) => void; label: string }): React.ReactElement {
  const pages = Math.max(1, total);
  return <nav className="service-pager" aria-label={label}>
    <button disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="上一頁">‹</button>
    <span>{page + 1} / {pages}</span>
    <button disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="下一頁">›</button>
  </nav>;
}
