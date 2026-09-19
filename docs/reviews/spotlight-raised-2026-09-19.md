# 單挑高光改為原物件置頂

選招時以完整暗幕壓低背景，將原本的指令盤與推演區提升至瀏覽器 top layer；推演敵招時，同時提升我方與敵方 HUD。沿用 GreetingsMyLord 本機 `spotlightLayer.ts` 的原物件置頂方式，不搬動 React 父子關係。沒有額外高光矩形框。

正式戰役、事件挑戰及試玩共用 `DuelInterface`，因此一併生效。Canvas 角色特寫維持原繪製流程；舌戰既有 HUD 光效保留於其自己的 CSS。

## 共用介面

`src/ui/Spotlight.tsx`：在畫面父容器下放置 `<Spotlight active={...}/>`，完整美術表面以 `spotlightTarget(active)` 標記。僅尋找同一父容器內的目標，支援多個表面；父子同時標記時只提升父表面。

- `mode="dim"`：保留遊戲原有按鍵與外部操作，單挑採此模式。
- `mode="lock"`：擋住目標外點擊、右鍵及 Esc，Tab 在多個目標的控制項之間循環，供之後的操作教學使用。
- 開啟規則、暫停或上層對話時，呼叫端應暫停 `active`，讓新的視窗接手畫面。
- 原位置以不可見、inert、移除重複 ID／表單 name 的占位維持排版。2D 縮放、旋轉與視窗尺寸變動會重新對位。切換步驟、目標卸載或元件卸載時復原樣式與移除占位。
- 使用 Chromium／Electron 的原生 Popover API；未提供此 API 的環境不啟動暗幕，保留原 UI 操作。

## 驗收

啟動 Vite：`npm run dev -- --host 127.0.0.1 --port 5182 --strictPort`。

試玩入口：`http://127.0.0.1:5182/?art=confrontation-demo&seed=17092026`，選「單挑」。此入口不寫玩家存檔。

`npm run verify:spotlight` 使用 Edge headless 與 Codex 附帶 Playwright；可用 `PREVIEW_URL`、`PLAYWRIGHT_MODULE`、`PLAYWRIGHT_CHANNEL` 指定環境。測試包含：

- 原 DOM 身分、焦點、輸入文字、原生滑桿拖曳與 React 計數保留。
- 兩個目標、巢狀標記去重、旋轉卡片與相鄰排版、ID/name 唯一、暗處點擊阻擋、Tab/Shift+Tab、非鎖定模式外部操作、目標卸載清理。
- 960×640、1366×900、1600×1000 尺寸，原物件與占位對位誤差小於 1px。
- 實際單挑滑鼠／鍵盤選招、雙方 HUD 推演、cqw 子元素尺寸、H 規則、Esc／右鍵取消及暫停、出招後下一回合、返回選單無殘留。

另通過 `npm run build`、`npm run verify:confrontation`、`npm run verify:discipline`。建置僅有現存的 chunk 大小與混用動態／靜態 import 提示。

驗收截圖由測試輸出至 `artifacts/spotlight/`。
