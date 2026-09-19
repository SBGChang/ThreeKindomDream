import { ArtControl } from './ArtControl.js';

export function ServiceHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }): React.ReactElement {
  return <header className="service-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <ArtControl kind="back" label="返回行旅" onClick={onBack} /></header>;
}

export function ServicePager({ page, total, onPage, label, appearance = 'default' }: { page: number; total: number; onPage: (page: number) => void; label: string; appearance?: 'default' | 'training' }): React.ReactElement {
  const pages = Math.max(1, total);
  if (appearance === 'training') return <nav className="service-pager training-pager" aria-label={label}>
    <button className="training-page-turn training-page-prev" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="上一頁">
      <img src="./art/ui/training/page-arrow-v1.png" alt="" draggable={false}/>
    </button>
    <span className="training-page-count" role="status" aria-label={`第 ${page + 1} 頁，共 ${pages} 頁`}>
      <span aria-hidden="true" className="training-page-numbers"><b>{page + 1}</b><i>/</i><span>{pages}</span></span>
    </span>
    <button className="training-page-turn training-page-next" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="下一頁">
      <img src="./art/ui/training/page-arrow-v1.png" alt="" draggable={false}/>
    </button>
  </nav>;
  return <nav className="service-pager" aria-label={label}>
    <button disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="上一頁">‹</button>
    <span>{page + 1} / {pages}</span>
    <button disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="下一頁">›</button>
  </nav>;
}
