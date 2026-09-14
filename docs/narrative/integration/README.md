# 劇本交接與非 UI 原型

依使用者要求，本次送回 Main 的內容只有七類劇本、製作契約、原型驗證紀錄及本補丁。沒有 UI 元件、樣式、預覽頁、立繪替代物、HTML 標題或戰場旗號更動；也沒有修改 Main 現有遊戲流程。

`non-ui-prototype.patch` 保留已寫好的蜀篇作者資料、編譯產物、敘事狀態／存檔、選擇與救援判定、結局接點、驗證器與測試。基底為 `1f0b799`，不含 `src/ui`、`index.html` 或 UI 驗收輔助程式。

補丁只供整合，未自動套用。新增主線在開場、指定回合、救援及章末會暫停，等待呈現層呼叫確認或選擇命令；因此不能只套補丁便把流程視為可玩。應由負責新版 UI 的開發者使用既有畫面接上 `storyScene`、`storyChoice`、`acknowledgeStory`、`chooseStory`、`needsEndingChoice` 與 `chooseStoryEnding`。具体契約見 [34_story.md](../../architecture/34_story.md)。

補丁另包含後五章的戰役數值校準，正式整合前需與 Main 最新經濟數值協調。原型測量見 [IMPLEMENTATION.md](../IMPLEMENTATION.md) 與 [shu-balance.json](../shu-balance.json)，不能把測試結果當成目前 Main 的結果。

整合前可在目標 checkout 執行 `git apply --check docs/narrative/integration/non-ui-prototype.patch` 檢查差異；檢查通過不代表與新系統語意相容，也不代表已套用。
