# 商店美術 v1

使用內建 imagegen 生成，未使用 CLI。四張皆保留真實 PNG alpha，角落透明度讀取為 0。

| 路徑（相對專案根目錄） | 尺寸 | 用途 |
| --- | --- | --- |
| `public/art/ui/merchant/display-v1.png` | 1002 × 1569 | 貨品展示牌 |
| `public/art/ui/merchant/purchase-v1.png` | 2172 × 724 | 購買按鈕、選取分頁 |
| `public/art/items/rations-v1.png` | 1254 × 1254 | 乾糧袋 |
| `public/art/items/ledger-v1.png` | 1254 × 1254 | 行軍簿 |

其餘十一件器物沿用既有 `public/art/ui/realms/relics-keyed.png`，紙木次要控制沿用訓練素材，星星與金幣沿用 RealmArt。

## 提示詞

接入：`ScreenMarket.tsx`、`merchant-art.css`、`ItemArt.tsx`；僅商店啟用精簡彩色效果敘述，保留實際條件與數值，訓練費折扣屬增益。

驗收：一般購買 6000 → 5800，碎片訂購 5800 → 5740；低金幣入口 `?art=economy&stock=limited` 以 120 金幣購買行軍簿後歸零，其他購買停用並以紅色價格顯示。多段效果分頁、商品翻頁、Hover／鍵盤焦點與新圖示皆經實際瀏覽器檢查；驗收資料不寫入玩家存檔。

### card

Use case: stylized-concept. Single isolated painted UI merchandise display card for a chibi Three Kingdoms game. Portrait 3:5 silhouette, front-on. Warm cream parchment lower 55% as large blank text area; upper 40% dark teal fabric display niche with a tiny wooden pedestal at its base for placing a separate item icon. Chunky reddish brown wooden side rails, small curved bronze corner fittings, tied cord top corners, confident dark brown cartoon outline and crisp cel shaded illustration, soft hand-painted texture, charming not realistic or ornate. Entire object visible with narrow transparent margin. Blank no lettering no items no stars no buttons. True transparent alpha outside silhouette. Intended 300x470 UI pixels; text safe inset 25px sides, bottom45px; upper center empty for item sprite.

### button

Use case: stylized-concept. ONE standalone horizontal purchase button for a chibi Three Kingdoms shop, 4:1 silhouette. Rich burnt orange lacquer center, carved reddish wood backing, restrained brass cloud endcaps, rounded bold dark brown outlines, crisp hand-painted cel shading, cheerful illustrated game UI. Broad blank orange middle for live price text. No icon no letters no numbers. True transparent PNG alpha background, full outline with narrow empty margins, no scene or ground shadow.

### rations

Use case: stylized-concept. One isolated item icon for chibi Three Kingdoms game: a plump tan canvas army ration sack tied with a red cord, folded open slightly showing golden grain and two small wrapped rice rations. Three quarter angle, bold dark brown outline, warm crisp cel shading, detailed illustrated game inventory item, cute rounded silhouette, clear at 100px. Centered entire object fits square canvas with 10% transparent margin. True transparent PNG alpha outside object, no ground, no lettering or symbol, no icon frame.

### ledger

Use case: stylized-concept. One isolated item icon for chibi Three Kingdoms game: a small Chinese military march ledger, blue cloth bound thick book with cream page edges, red binding cord and a tiny folded route map peeking from it, blank cream cover label with no writing. Three quarter angle, bold dark brown outline, crisp hand-painted cel shading, cute rounded readable silhouette consistent with illustrated chibi inventory objects. Centered entire object fits square canvas with 10% transparent margin. True transparent PNG alpha background, no ground, no lettering, no icon frame.
