# 戰場介面重繪

戰場沿用遊戲既有 Q 版手繪風格：粗輪廓、乾淨色塊、圓潤造型。兵力牌、計時牌、技能底座、指令列、卷軸對話框與滑鼠說明框均使用現有美術素材。

所有 `BattleHint` 說明框共用 9-slice：`parchment-frame-v2.png` 來源切片 180px，顯示邊寬 1.5cqw，保留四角比例、只延伸四邊。中央不使用原圖的 fill，而以均勻羊皮紙色 `#f9e2b4` 填底，避免不同字數與高度拉伸漸層或紙紋。

- 技能以技能插圖為主；援護技能加上武將小頭像。備戰與戰場共用 `battle-ui-art.ts` 對應。
- 狀態效果只顯示圖示與剩餘秒數，滑鼠停留或鍵盤聚焦才顯示效果說明。Escape 關閉說明。
- 技能冷卻以相同底框及技能插圖的灰階副本疊加，透過 Filled 裁切隨剩餘時間由上往下露出彩色原圖，保留透明輪廓；秒數與文字保持清楚，不再使用矩形黑色遮罩。不可施放時仍可聚焦閱讀原因。
- 開戰使用雙旗展開與字樣進場動畫；換波、技能演出與倒數也有動態。支援減少動態偏好。
- 常駐資訊縮減為兵力、時間、軍糧、技能與擊退數；軍令和戰況移入美術說明框。
- 底部指令面板使用 `border-image` 9-slice（來源切片 150px），保留四角比例。面板高度由 9.6cqw 增至 14cqw，技能卡高度由 8.1cqw 增至 11.9cqw，同步放大插圖、名稱、快捷鍵與武將頭像，軍糧及狀態列上移避開面板。

## 新增騎射插圖

檔案：`public/art/ui/campaign/tactic-mounted-v1.png`。

使用內建 ImageGen 參考圖生成模式；風格參考為既有 `public/art/ui/campaign/tactic-fire-v5.png`。其餘技能沿用現有插圖，相近機制可以共用同主題插圖。

生成提示詞：

> Reference image is STYLE REFERENCE ONLY, not an edit target. Create a new production square skill icon illustration for mounted archery 騎射 in this exact Chinese chibi strategy game art style: same bold dark outlines, simple clean cel-shaded color blocks, cute large head and small body proportions, warm saturated colors, playful expressions, simplified gold/teal armor. A single cute chibi Three Kingdoms cavalry archer riding a small galloping brown horse and drawing a large curved bow aimed to the right, three white/gold arrow swooshes framing the lower half. Strong readable compact silhouette like the reference skill artwork. Original character, do not copy fire mage pose. No flames. 1024 square, genuine transparent alpha background outside art. Fill canvas with the action illustration with safe margins. No frame, no text or letters, no numbers, no realistic materials, no intricate metal texture, no photorealism, no muted muddy painting, no background scenery. It must look like another skill icon from the exact same game as the reference.

## 倒數令牌

倒數區改用專屬 `public/art/ui/campaign/battle-timer-v1.png`，以青綠外框、朱紅內面和金邊呼應左右兵力牌。中央使用等寬數字，下方顯示倒數、待陣、暫停或收兵；只在實際交戰的最後 10 秒發光脈動。

素材使用內建 ImageGen 參考圖生成，風格參考為 `command-button-v6.png`。提示重點：compact countdown command medallion; cute Chinese Three Kingdoms strategy game; warm hand-painted cartoon aesthetic, bold dark brown outline, chunky gold edging and teal lacquer; symmetrical squat octagonal medallion with blank deep burgundy center, short teal ornamental wings, red knot and gold bottom point; transparent alpha background; no text, numbers, hourglass, parchment scroll, tabletop, legs or photorealistic metal.

## 糧袋 Filled

軍糧移至我軍血條下方，每袋 50，以同一張糧袋插圖的彩色層和黑色層重疊做水平方向裁切。彩色由左往右表示上限，黑色從右側覆蓋已消耗的部分。190/190 的彩色值為 [1,1,1,.8]、黑色值為 [0,0,0,0]；140/190 的黑色值為 [0,0,.2,1]。不足一袋時，黑色消耗比例以該袋實際容量計算並限制在彩色容量內，確保可見彩色面積對應真實剩餘量。範例及容量邊界已加入 HUD 測試。精確軍糧值與補給速度顯示於美術 Hover 說明框。

## 操作與測試

### 開戰美術字

`public/art/ui/campaign/battle-start-v1.png` 由內建 ImageGen 生成，透明背景，取代原先的字型文字與 START。提示詞：Exact Traditional Chinese text 開戰, two characters only; thick bold italic/slanted-right heroic brush lettering; golden yellow interiors, thick vermilion red outline with integrated stylized flame tongues, dark maroon outer keyline; clean chunky cartoon hand-painted shapes matching the chibi Three Kingdoms game; aligned baseline; transparent alpha background; no realistic fire, plaque, flags, scenery, or extra text. 保留進場縮放動畫；換波提示依箭形底圖內框定位，修正文字偏離內框中心。

執行 `npm run dev`，開啟 `/?art=battle-demo`。正式戰役也使用相同介面。

`npm run verify:realtime` 包含 HUD 測試：所有技能美術路徑存在、騎射與衝鋒可區分、冷卻技能可閱讀說明、Buff 秒數與說明一致。

瀏覽器操作確認：準備、交戰、技能施放與冷卻、Buff 說明、鍵盤關閉說明、暫停及結算。
