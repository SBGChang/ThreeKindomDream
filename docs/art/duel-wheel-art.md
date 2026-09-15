# 單挑指令盤美術

站位校正：盤面、箭線與出招按鈕改用同一個正方形座標；三指令以同半徑、120 度間隔排列。動作圖集依圓牌實際中心對齊，不把流蘇或透明留白當成中心；選取圈與呼吸光暈沿用同一個圓牌邊界。1280×720 實測三招離圓心約 168.96px，切換選取前後按鈕矩形完全一致，光暈中心偏差為 0。

以 built-in imagegen 生成三個獨立透明 PNG；原始生成檔保留，遊戲使用 `public/art/duel/` 內版本。

- `wheel-platter-v1.png`：玉石雕紋盤面。[提示詞](wheel-platter-v1-prompt.txt)
- `wheel-counter-arrow-v1.png`：金色雕紋弧形箭線，同圖旋轉 0 / 120 / 240 度。[提示詞](wheel-counter-arrow-v1-prompt.txt)
- `wheel-confirm-button-v1.png`：中央玉石按鈕。[提示詞](wheel-confirm-button-v1-prompt.txt)

盤面僅保留程式疊上的「出招」黑框白字。指令圖示保留可存取名稱、快捷鍵、動作點呼吸光暈與敵方提示頭像。未選招時停用中央按鈕，選招後亮起。成本與升變資訊顯示於右側推演區。

驗收：真實瀏覽器 1280×720，初始停用、選招、推演、確認出招與下一合均正常。盤面 textContent 僅為「出招」。箭線容器裁切旋轉素材的透明角落，防止焦點造成戰場捲動；戰場 scrollHeight 與 clientHeight 均為 720。三張素材均為 RGBA 且 alpha 範圍 0–255。
