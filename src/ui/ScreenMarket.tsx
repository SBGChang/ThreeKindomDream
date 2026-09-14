import { useState } from 'react';
import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
import { ItemEffects } from './ItemEffects.js';
import { ItemArt } from './ItemArt.js';
import { CharacterArt } from './CharacterArt.js';
import { ServiceHeader, ServicePager } from './ServiceUI.js';
import './economy-ui.css';

export function ScreenMarket({ s, bump, onBack }: { s: Session; bump: () => void; onBack: () => void }): React.ReactElement {
  const [notice, setNotice] = useState(''), [page, setPage] = useState(0), [tab, setTab] = useState<'goods'|'fragments'>('goods');
  const shelf = s.marketShelf(), targets = s.fragmentTargets();
  const blocked = s.pendingEvent !== null || (s.current.campaign !== null && s.current.campaign.phase !== 'configuring');
  const target = targets.find(d => d.itemId === shelf.target);
  return <section className="run-service market-service" aria-label="商店">
    <ServiceHeader title="商店" subtitle="行商到訪 · 每章換一批新貨" onBack={onBack}/>
    <aside className="service-host"><CharacterArt name="毛玠"/><div className="host-words"><b>有備而來，滿載而歸</b><p>{tab === 'goods' ? '本章 '+shelf.offers.length+' 件好物，每件限購一次。' : '挑一件已發現的器物，訂購它的碎片。每章一份。'}</p><small>{tab === 'goods' ? '天命可增加貨位與珍品機會。' : '碎片於夢醒結算，不改變本輪階級。'}</small></div></aside>
    <div className="merchant-stock">
      <div className="service-tabs" aria-label="商店貨品"><button aria-pressed={tab === 'goods'} onClick={() => {setTab('goods');setPage(0);setNotice('');}}>本章貨品 <small>{shelf.offers.filter(o => !o.bought).length}/{shelf.offers.length}</small></button><button aria-pressed={tab === 'fragments'} onClick={() => {setTab('fragments');setPage(0);setNotice('');}}>指定碎片 <small>{shelf.fragmentBought ? '已訂購' : '一份'}</small></button></div>
      {tab === 'goods' ? <>
        <div className="merchant-shelf">{shelf.offers.slice(page*3,page*3+3).map(o => {const d = defs.reader('item').get(String(o.itemId));return <article className={'merchant-good '+(o.bought ? 'sold' : '')} key={o.id}>
          <div className="goods-display"><span className="service-stars">{'★'.repeat(d.rarity)}</span><ItemArt name={t(d.nameKey)}/>{o.bought && <b className="sold-seal">已售出</b>}</div>
          <div className="goods-label"><h2>{t(d.nameKey)}</h2><ItemEffects compact rows={d.tiers.filter(row => row.tier <= (s.current.metaSnapshot.itemCodex[String(d.itemId)]?.tier ?? 0)).map(row => t(row.descKey))}/><small>{s.current.items.count[String(o.itemId)] ? '已持有 · 購得轉為 1 碎片' : '取得後，本輪立即生效'}</small><button className="service-buy" disabled={blocked || o.bought || s.money < o.price} onClick={() => {setNotice(s.buyMarket(o.id) ? '已購得'+t(d.nameKey) : '目前無法購買');bump();}}>{o.bought ? '已售出' : o.price+' 錢'}</button>{!o.bought && <small className="goods-shortage">{blocked ? '事件或戰鬥結束後可購買' : s.money < o.price ? '還差 '+(o.price-s.money)+' 錢' : '每章限購一次'}</small>}</div>
        </article>;})}</div>
        <ServicePager page={page} total={Math.ceil(shelf.offers.length/3)} onPage={setPage} label="商品分頁"/>
      </> : <div className="fragment-shop">
        <div className="fragment-options">{targets.slice(page*6,page*6+6).map(d => <button key={d.itemId} aria-pressed={shelf.target === d.itemId} disabled={blocked || shelf.fragmentBought} onClick={() => {s.selectFragment(d.itemId);bump();setNotice('');}}><ItemArt name={t(d.nameKey)}/><b>{t(d.nameKey)}</b><small>{s.fragmentPrice(d.itemId)} 錢</small></button>)}</div>
        {!targets.length && <div className="fragment-empty"><h2>尚無可訂購的碎片</h2><p>先取得本章星級範圍內的器物，再來指定想培養的碎片。</p></div>}
        <ServicePager page={page} total={Math.ceil(targets.length/6)} onPage={setPage} label="碎片分頁"/>
        <div className="fragment-checkout"><div><span className="service-kicker">本章一份 · 夢醒帶回</span><h2>{target ? t(target.nameKey)+'碎片 ×1' : '選擇想培養的器物'}</h2><small>{blocked ? '事件或戰鬥結束後可訂購' : shelf.fragmentBought ? '碎片已收妥，下章可再訂購。' : target && s.money < s.fragmentPrice(target.itemId) ? '還差 '+(s.fragmentPrice(target.itemId)-s.money)+' 錢' : '選擇貨架上的器物，再確認訂購。'}</small></div><button className="service-buy" disabled={blocked || shelf.fragmentBought || !shelf.target || s.money < s.fragmentPrice(shelf.target)} onClick={() => {setNotice(s.buyFragment() ? '碎片已收下，將於夢醒結算' : '目前無法訂購');bump();}}>{shelf.fragmentBought ? '本章已訂購' : target ? '訂購 · '+s.fragmentPrice(target.itemId)+' 錢' : '先選擇器物'}</button></div>
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
