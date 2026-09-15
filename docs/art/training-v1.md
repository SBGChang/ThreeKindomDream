# 訓練所美術 v1

以內建 imagegen 重新繪製，接入正式 `ScreenLearn`。紅 X 指定的「磨練所學 · 不消耗回合」副標已移除。

## 素材

| 檔案（相對專案根目錄） | 尺寸 | 用途 |
| --- | --- | --- |
| `public/art/ui/training/folio-v1.png` | 1629 × 965 | 兵法冊、木框、紙頁與裝飾 |
| `public/art/ui/training/coach-v1.png` | 1422 × 1106 | 教官說明卷軸 |
| `public/art/ui/training/jade-control-v1.png` | 2172 × 724 | 選取分頁、選課與升級牌 |
| `public/art/ui/training/paper-control-v1.png` | 2172 × 724 | 未選取列表、分頁與次要操作 |

四張皆為透明 RGBA PNG；背景透明度已讀取檢查。文字、等級、費用與能力門檻由遊戲即時繪製，未烘焙進美術。星星、金幣、能力圖示及于禁沿用既有美術。

完整生成提示詞見 [training-v1-prompts.md](training-v1-prompts.md)。未採用的圖集亦留有紀錄，不在遊戲中引用。

## 接入與驗收

- `ScreenLearn.tsx`、`training-art.css`：左頁選課、右頁效果與升級，六項一頁，只有多頁才顯示翻頁操作。
- 保留原有已習得項目列表、金幣扣款、能力門檻、特性啟停與最多四項啟用規則。
- 實際操作特性從 1 級升至 2 級，金幣由 6000 降至 5940；停用後啟用數由 1 變 0。
- 實際檢查六項列表與下一頁、滿級不可升級、技能／特性空頁；美術控制牌 Hover 不會被通用矩形背景覆蓋。
- 新增僅供開發的獨立資料入口：`?art=economy&lessons=full` 與 `?art=economy&lessons=empty`，不寫入玩家存檔。

本次為美術介面改版，未改動技能、特性或升級平衡數值。
