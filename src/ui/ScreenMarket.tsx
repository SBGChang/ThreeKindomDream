import { useState } from 'react';
import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
import { ItemEffects } from './ItemEffects.js';
import { ItemArt } from './ItemArt.js';
import { CharacterArt } from './CharacterArt.js';
import { ServiceHeader, ServicePager } from './ServiceUI.js';
import { RealmIcon, RealmStars } from './RealmArt.js';
import './economy-ui.css';
import './merchant-art.css';

export function ScreenMarket({ s, bump, onBack }: { s: Session; bump: () => void; onBack: () => void }): React.ReactElement {
  const [notice, setNotice] = useState(''), [page, setPage] = useState(0), [tab, setTab] = useState<'goods'|'fragments'>('goods');
  const shelf = s.marketShelf(), targets = s.fragmentTargets();
  const blocked = s.pendingEvent !== null || (s.current.campaign !== null && s.current.campaign.phase !== 'configuring');
  const target = targets.find(d => d.itemId === shelf.target);
  return <section className="run-service market-service" aria-label="商店">
    <ServiceHeader title="商店" onBack={onBack}/>
    <aside className="service-host"><CharacterArt name="毛玠"/></aside>
    <div className="merchant-stock">
      <div className="service-tabs" aria-label="商店貨品"><button aria-pressed={tab === 'goods'} onClick={() => {setTab('goods');setPage(0);setNotice('');}}>本章貨品 <small>{shelf.offers.filter(o => !o.bought).length}/{shelf.offers.length}</small></button><button aria-pressed={tab === 'fragments'} onClick={() => {setTab('fragments');setPage(0);setNotice('');}}>指定碎片 <small>{shelf.fragmentBought ? '已訂購' : '一份'}</small></button></div>
      {tab === 'goods' ? <>
        <div className="merchant-shelf">{shelf.offers.slice(page*3,page*3+3).map(o => {const d = defs.reader('item').get(String(o.itemId));return <article className={'merchant-good '+(o.bought ? 'sold' : '')} key={o.id}>
          <div className="goods-display"><RealmStars count={d.rarity}/><ItemArt name={t(d.nameKey)}/></div>
          <div className="goods-label"><h2>{t(d.nameKey)}</h2><ItemEffects compact artful rows={d.tiers.filter(row => row.tier <= (s.current.metaSnapshot.itemCodex[String(d.itemId)]?.tier ?? 0)).map(row => t(row.descKey))}/>{!o.bought && s.current.items.count[String(o.itemId)] ? <small className="duplicate-note">已持有 → <strong>碎片 +1</strong></small> : null}<button className={'service-buy '+(s.money < o.price ? 'unaffordable' : '')} aria-label={o.bought ? t(d.nameKey)+'已售出' : '購買'+t(d.nameKey)+'，'+o.price+'金幣'} disabled={blocked || o.bought || s.money < o.price} onClick={() => {setNotice(s.buyMarket(o.id) ? '已購得'+t(d.nameKey) : '目前無法購買');bump();}}>{o.bought ? '已售出' : <><RealmIcon name="currency"/><b>{o.price}</b></>}</button>{blocked && !o.bought && <small className="goods-shortage">事件結束後可購買</small>}</div>
        </article>;})}</div>
        {shelf.offers.length > 3 && <ServicePager page={page} total={Math.ceil(shelf.offers.length/3)} onPage={setPage} label="商品分頁"/>}
      </> : <div className="fragment-shop">
        <div className="fragment-options">{targets.slice(page*6,page*6+6).map(d => <button key={d.itemId} aria-pressed={shelf.target === d.itemId} disabled={blocked || shelf.fragmentBought} onClick={() => {s.selectFragment(d.itemId);bump();setNotice('');}}><ItemArt name={t(d.nameKey)}/><b>{t(d.nameKey)}</b><small><RealmIcon name="currency"/>{s.fragmentPrice(d.itemId)}</small></button>)}</div>
        {!targets.length && <div className="fragment-empty"><h2>尚無可訂購的碎片</h2><p>先取得本章星級範圍內的器物，再來指定想培養的碎片。</p></div>}
        {targets.length > 6 && <ServicePager page={page} total={Math.ceil(targets.length/6)} onPage={setPage} label="碎片分頁"/>}
        <div className="fragment-checkout"><div><h2>{target ? t(target.nameKey)+'碎片 ×1' : '選擇器物'}</h2><small>{blocked ? '事件結束後可訂購' : '夢醒帶回'}</small></div><button className={'service-buy '+(target && s.money < s.fragmentPrice(target.itemId) ? 'unaffordable' : '')} disabled={blocked || shelf.fragmentBought || !shelf.target || s.money < s.fragmentPrice(shelf.target)} onClick={() => {setNotice(s.buyFragment() ? '碎片已收下，將於夢醒結算' : '目前無法訂購');bump();}}>{shelf.fragmentBought ? '已訂購' : target ? <><RealmIcon name="currency"/><b>{s.fragmentPrice(target.itemId)}</b></> : '先選擇'}</button></div>
      </div>}
    </div>
    <p className="service-notice" role="status">{notice}</p>
  </section>;
}
export function ScreenCamp({
  s,
  bump,
  onLearn,
  onMarket,
}: {
  s: Session;
  bump: () => void;
  onLearn: () => void;
  onMarket: () => void;
}): React.ReactElement {
  return (
    <section className="chapter-camp">
      <CharacterArt name="曹操" />
      <span className="eyebrow">本章行程告一段落</span>
      <h1>收兵，整裝再出發</h1>
      <p>
        戰役獎勵已入帳。目前持有 <strong>{s.money} 錢</strong>。
      </p>
      <p>離營前仍可購買本章商品；進入下一章後更新貨架。</p>
      <div>
        <button onClick={onLearn}>前往訓練</button>
        <button onClick={onMarket}>逛本章商店</button>
        <button
          className="primary"
          onClick={() => {
            s.continueChapter();
            bump();
          }}
        >
          {s.needsFactionChoice ? '選擇陣營' : '繼續旅程'}
        </button>
      </div>
    </section>
  );
}
