# 三閣 Q 版重新編排
正式接入 ScreenCodex、ScreenShop。移除三頁全域頂列、導覽底列與裝飾性口號。保留返回、功能資訊與必要狀態提示。
- 風雲錄：上方人物舞台／傳承布冊，下方橫向名帖列，長名單可按住拖曳。
- 天命閣：上方五類切換，中間每頁最多六項，超過六項使用圖示翻頁；完整繪製的升級按鈕提供 aria-label 與停用原因 title。價格、餘額、前置和購買邏輯保持。
- 天工閣：三層木架陳列，右側布籤顯示選中器物與效果；空收藏保留空架與一句取得方法。
## 素材
內建 imagegen 生成；路徑 public/art/ui/realms/heroes-v3.png、destiny-v3.png、treasury-v3.png、upgrade-v1.png。返回共用已確認的 public/art/ui/entry/button-back-v2.png。提示詞：realms-redesign-prompts.json。
## 驗證
瀏覽器預覽確認人物、器物選取、空收藏與完整十一件器物陳列。記憶體預覽升級資質配點後 488→188，等級0→1，下級700點停用；不寫入玩家存檔。
