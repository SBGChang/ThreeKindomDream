import { useState } from 'react';
import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
import { ItemEffects } from './ItemEffects.js';
import { ItemArt } from './ItemArt.js';
import { ServiceHeader, ServicePager } from './ServiceUI.js';

export function ScreenVault({ s, onBack }: { s: Session; onBack: () => void }): React.ReactElement {
  const [page, setPage] = useState(0), [selected, setSelected] = useState('');
  const [tab, setTab] = useState<'owned'|'fragments'>('owned');
  const fragments = s.current.items.fragments ?? {};
  const rows = defs.reader('item').all().filter(d => tab === 'owned' ? (s.current.items.count[String(d.itemId)] ?? 0) > 0 : (fragments[String(d.itemId)] ?? 0) > 0);
  const visible = rows.slice(page*8,page*8+8), item = visible.find(d => String(d.itemId) === selected) ?? visible[0];
  const id = item ? String(item.itemId) : '', owned = (s.current.items.count[id] ?? 0) > 0, tier = s.current.metaSnapshot.itemCodex[id]?.tier ?? 0;
  return <section className="run-service vault-service" aria-label="器物">
    <ServiceHeader title="器物" subtitle="隨身珍藏 · 一器一用，伴你此生" onBack={onBack} />
    <div className="vault-collection">
      <div className="service-tabs" aria-label="器物分類">{(['owned','fragments'] as const).map(key => <button key={key} aria-pressed={tab === key} onClick={() => {setTab(key);setPage(0);}}>{key === 'owned' ? '本輪器物' : '待結算碎片'}</button>)}</div>
      <div className="relic-drawers">{visible.map(d => <button key={d.itemId} className="relic-drawer" aria-pressed={item?.itemId === d.itemId} onClick={() => setSelected(String(d.itemId))}><ItemArt name={t(d.nameKey)}/><b>{t(d.nameKey)}</b><small>{tab === 'owned' ? '★'.repeat(d.rarity) : '碎片 ×'+fragments[String(d.itemId)]}</small></button>)}</div>
      {!rows.length && <div className="service-empty"><span>◇</span><h2>{tab === 'owned' ? '行囊尚空' : '尚無碎片'}</h2><p>{tab === 'owned' ? '完成委託、探索人物故事，或到商店挑一件隨身器物。' : '重複取得器物或在商店訂購，可累積指定碎片。'}</p></div>}
      <ServicePager page={page} total={Math.ceil(rows.length/8)} onPage={setPage} label="器物分頁" />
    </div>
    <article className="relic-inspection">
      {item ? <><div className="relic-display"><ItemArt name={t(item.nameKey)} /></div><span className="service-stars">{'★'.repeat(item.rarity)}</span><h2>{t(item.nameKey)}</h2><span className="vault-item-status">{owned ? '本輪生效 · 第 '+tier+' 階' : '碎片收藏 · 本輪未持有'}</span><ItemEffects key={id+String(owned)} rows={owned ? item.tiers.filter(row => row.tier <= tier).map(row => t(row.descKey)) : ['取得此器物後，才會在本輪產生效果。']} /><div className="fragment-tally"><span>待結算碎片</span><b>{fragments[id] ?? 0}</b></div></> : <><div className="empty-relic">◇</div><h2>珍藏，始於相遇</h2><p>選擇左側器物，查看本輪效果與碎片。</p></>}
      <small className="vault-rule">道具效果每種生效一次。<br/>碎片於夢醒結算，用來培養下一輪的器物。</small>
    </article>
  </section>;
}
