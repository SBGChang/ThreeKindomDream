# 訓練翻頁 v2

- 用途：訓練書冊左頁底部翻頁；不改動其他服務頁的分頁外觀。
- 完整箭頭：`public/art/ui/training/page-arrow-v1.png`，內建 imagegen 生成，左右共用原圖，上一頁僅以 CSS 水平鏡像。54 × 44 舞台座標點擊區，`object-fit: contain`，保留完整輪廓與透明留白；不對箭頭做九宮格拉伸，不疊字元箭頭。
- 頁碼：動態目前頁／總頁，朱紅 25px 主數字、18px 總頁；沿用 `paper-control-v1.png`，九宮格來源切線上／下 240px、左／右 300px，顯示邊寬 16px／20px。邊角固定，僅中央與直邊延展。數值保留在 DOM，`role=status` 朗讀目前頁與總頁。
- 狀態：首尾頁停用、懸停亮度、按下壓暗、鍵盤焦點描框；鏡像只作用於圖片，不受按鈕互動狀態重設。
- 驗收入口：`http://127.0.0.1:5188/?art=economy&lessons=full`，獨立資料，不寫玩家存檔。
- 驗收結果：滑鼠上一頁／下一頁、Enter 翻頁、鍵盤焦點、首尾停用、技能／特性切換歸首頁、10 / 10 雙位數頁碼皆正常；完整畫面見 `docs/reviews/training-pager-v2.png`。`npm run typecheck`、`npm run build` 通過（建置仍有既有 chunk 大小與混合匯入警告）。
- PNG 為 1448 × 1086、32-bit ARGB，已檢查真實透明像素；原圖與 alpha 完整保留。

## 對齊修正 v3

- 修正大小數字沿 baseline 對齊造成總頁碼下沉：改為垂直置中，採 Cambria 齊線等寬數字，整組作 2px 光學上移。
- 頁碼容器固定 108 × 44 舞台座標；兩側箭頭位置不隨單／雙位頁碼改變。
- 9-slice 底圖上下各延展 3px，補足原圖透明留白造成的牌面內高不足，保留原切線及邊角尺寸。
- 已實看 1 / 10 與 10 / 10；三個控制項中心 Y 一致，左右中心距相等。修正後畫面：`docs/reviews/training-pager-v3-aligned.png`。

## 生成提示詞（內建 imagegen）

Use case: stylized-concept. Asset type: production transparent PNG game UI next-page button, a single complete standalone RIGHT-pointing arrow, for a cute hand-painted Three Kingdoms Chinese strategy game's parchment training book. Primary request: the button silhouette ITSELF is a chunky right-pointing arrow carved from warm honey-brown wood with a thin aged-brass bevel, pale ochre face, dark brown ink outline, subtle grain and a small carved cloud curl on the short tail. Wide arrowhead and short thick shaft, gentle rounded corners, crisp bold contour legible at 44 by 36 pixels. Flat front-on orthographic view, hand-painted cel shading, charming illustrative finish, matching an antique parchment and reddish timber interface. Composition: only ONE arrow centered, entire silhouette visible, about 80% canvas width and 65% canvas height, transparent padding all around. True transparent alpha background. No rectangular panel behind it, no separate chevron symbol, no text or numbers, no letters, no left arrow, no mockup, no surrounding UI, no floating decorations, no cast shadow outside the object. Complete artwork will be proportionally scaled, never stretched or nine-sliced.
