# 特性簡圖 v1

22 個現有特性各有一張獨立透明 PNG，包含 10 個原有特性與 12 個戰鬥觸發特性。以一至兩個粗輪廓物件表達主題，取代訓練頁重複的星章與角落屬性貼圖。

- 素材：`public/art/ui/traits/*-v1.png`。
- 生成方式：內建 image_gen，每個素材獨立呼叫，保留原始 RGBA 與透明度。
- 全部提示詞及輸出路徑：`trait-icons-v1.json`。
- 共用元件：`src/ui/TraitArt.tsx`，以穩定 TraitId 對應素材。
- 訓練列表與右頁使用同一張圖，object-fit: contain；列表最大寬 112 px，右頁最大 180 px。

## 驗收

- 全部 22 筆特性定義都有不同素材，22 張 PNG 均具真正透明 alpha。
- 21 個可訓練正面特性 × 3 種視窗尺寸（1280×800、1280×673、960×600），63 個畫面通過邊界、缺圖與左右圖一致性檢查。
- 啟用／停用通過，瀏覽器無 pageerror；負面特性「剛愎」也包含於全素材圖鑑驗收。
- TypeScript 型別檢查及 Vite production build 通過。
- 內容編譯遇到 Windows 監看目錄占用，改以相同 compile() 結果原地寫入，13 個產物逐一比對來源一致。
- 預覽：`docs/reviews/training-trait-icons-v1.png`、`training-trigger-icons-v1.png`、`trait-icons-v1-gallery.png`。
