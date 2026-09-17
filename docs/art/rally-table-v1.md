# 舌戰牌背與空牌座

使用原生 imagegen 生成，未使用 CLI。中央說明框改用木雕金飾牌座；對手手牌使用四色金紋章牌背，不顯示文字、點數或特殊牌種類。中央操作說明移至玩法面板，動態播報僅保留給螢幕閱讀器。歸納選取進度由兩個小牌槽呈現。

- `public/art/debate/rally-backs-v1.png`：四色牌背；依實際素材範圍裁切顯示，統一尺寸。
- `public/art/debate/rally-opening-stand-v1.png`：中央另起牌座。

## 牌背生成提示

Production Three Kingdoms fantasy game UI sprite atlas, exactly 2 columns by 2 rows, canvas 1024x1536, each cell 512x768 portrait playing-card BACK. Four identical silhouettes, carved gold Chinese cloud corners, thin bronze and gold border, saturated lacquer/silk full field: top-left sapphire BLUE, top-right jade GREEN, bottom-left cinnabar RED, bottom-right amethyst PURPLE. Each has identical large ornate circular gold interlocking cloud medallion centered, symmetrical filigree, premium painterly polished 2D game art. No text, letters, numerals, plaques or suit-specific illustrations: identical back emblem prevents revealing hidden card identity. Suit readable across entire field. Straight front view, no perspective, no card overlaps, same baseline. Full card contained in each exact cell with 4 percent margin; transparent RGBA background outside silhouettes, no cast shadows, no backdrop.

## 牌座生成提示

A single production 2D game UI asset: an empty ornate Chinese Three Kingdoms card presentation stand. Portrait canvas 1024x1536. A dark carved rosewood shallow tray shaped for ONE portrait playing card, rich bronze-gold cloud filigree, turquoise inset beads and subtle stylized auspicious clouds, lower edge supported by small sculpted scroll-shaped feet. Mostly straight-on with only subtle depth. Main recess empty dark lacquer, softly illuminated empty central area with three small glowing gems (blue, green, red) arranged together at center, symbolizing a free opening choice. An elegant physical painted object, not a software dialog box. Premium hand-painted fantasy game asset, warm rich materials matching gilded card art, small size legibility, balanced symmetrical silhouette. Absolutely NO words, NO numbers, NO letters, NO caption, no card, no arrows, no interface text. Genuine transparent RGBA outside the stand silhouette, no environment or background. Object centered, occupies 90 percent canvas, edges fully visible.
