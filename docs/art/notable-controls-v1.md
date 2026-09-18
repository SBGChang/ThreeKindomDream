# 風雲錄專用 UI 美術

使用內建 image_gen 重繪，來源參考為使用者提供的風雲錄紙卷介面。

素材：public/art/ui/notable/。controls-sheet-v1.png 保留原圖，五張獨立 PNG 由原圖裁切。裁切範圍、原始像素切線和顯示邊寬記錄於 nine-slice.json。

## 生成提示

Production hand-painted Three Kingdoms biography UI sprite sheet, warm parchment and walnut ink outlines. Five isolated assets: dark walnut progress trough with small bronze corners; muted sage jade fill; passive ivory inheritance paper slip; parchment character card with walnut frame and red cord corner bindings; selected character card with cinnabar inner edging and muted gold corners. No text, characters, stars, protruding cloud flourishes or shiny emerald. Front orthographic; fixed small corner details, straight uniform edge centers, quiet center textures for nine-slice scaling.

Follow-up: preserve all five assets and remove outside background/glows. The returned sheet retained its backdrop; production sprites are tightly rectangular-cropped, not represented as alpha cutouts.

## 接入

src/ui/notable-codex.css 使用 border-image 的 source slice / rendered border width / stretch 和 fill；四角不跟容器寬度拉伸。進度填充以 clip-path 表現數值，不拉扁完整外框。人物索引普通與選取態使用相同切分尺寸。文字仍為可變動的 HTML，圖案不是文字替身。
