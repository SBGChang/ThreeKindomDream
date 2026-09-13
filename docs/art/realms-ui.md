# 風雲錄、天命閣、天工閣美術接入

三頁共用養成介面的 public/art/ui/parchment-frame-v2.png 作為九宮格木雕金框與宣紙。實際元件已接入 realm-art.css，包含頁首、返回、分類籤、名士卡、列傳、永久成長卡、購買按鈕、藏品卡、詳情、空藏品畫面與頁尾導覽。

新增內建 image_gen 生成的圖集：public/art/ui/realms/icons.png（官途、資質、天賦、緣分、光階、輪迴點、史冊、寶箱），relics-keyed.png（11 件器物及寶箱）。圖示取代首字方塊與文字符號；RealmArt.tsx 統一繪製，星階的亮暗狀態仍由真實資料決定。

保留背景、原有收集資料與購買條件。沒有新增付費或保存邏輯。

驗收：/?art=realms 使用存檔的記憶體副本；/?art=realms&view=items&sample=1 使用明確標示的示例藏品。兩者不寫入存檔。正式頁面使用相同 ScreenCodex / ScreenShop 元件。

器物圖集重排留白後，生成工具曾把棋盤格畫入背景；最终以內建 image_gen 轉成平面洋紅底，遊戲載入時依既有去背慣例去除色鍵。未採用棋盤格版本。
