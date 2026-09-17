# 三色舌戰卡面與金墨數字

使用原生 imagegen 生成，未使用 CLI。卡面採 2×2 圖集：藍色義理、綠色事證、紅色聲勢、紫色特殊牌。牌色覆蓋整片主卡面，數字使用獨立金色書法筆觸圖集，保留 Hover 與歸納閃爍預估。

- 卡面：`public/art/debate/rally-faces-v1.png`
- 1–9 數字：`public/art/debate/rally-numerals-v1.png`
- 每個數字以實際筆觸範圍裁切顯示、等高置中，保留原始比例。

## 卡面提示

Create a production game UI SPRITE ATLAS with exactly FOUR blank portrait playing-card faces, arranged in a precise 2 COLUMN x 2 ROW grid. Overall canvas 1024 x 1536, each cell 512 x 768. Reference is the existing Three Kingdoms hand-painted gold cloud filigree card style ONLY. Redesign to make suit obvious from the ENTIRE card face, not a stripe. Top left: rich saturated sapphire BLUE silk lacquer with subtle swirling clouds; top right: rich saturated jade GREEN silk lacquer with subtle bamboo leaves; bottom left: rich saturated cinnabar RED lacquer with subtle flame scrollwork; bottom right: rich saturated amethyst PURPLE silk lacquer with subtle constellation scrollwork. All FOUR have IDENTICAL outer geometry and gold carved cloud corner filigree, thin warm gilded borders, matching suit-colored top jewel, and small blank gold/brown title plaque centered at y=89% of each cell. The main field from x=16% to84%, y=17% to79% is unambiguously BLUE/GREEN/RED/PURPLE respectively, dark-mid saturated tone suitable behind large pale gold numerals. No parchment-white areas. No words, no letters, no digits, no emblems, no numbers, no separate icons. Leave the main field uncluttered to overlay number art in code. Flat straight-on orthographic game assets, no perspective, no angled cards, no cast shadows. Each card fits within its exact cell with 3% transparent margin on all sides; all same baseline and dimensions. Truly transparent RGBA outside the four card silhouettes and gutters. Premium polished hand-painted 2D fantasy Three Kingdoms UI, legible at small size.

## 卡面修訂提示

Edit this exact sprite atlas ONLY to remove the blurry brown/green backdrop surrounding the four playing cards. Replace ALL pixels outside the ornate gold/wood card silhouettes, including the margins, between the columns and between the rows, with genuinely transparent alpha. Preserve all four existing blue, green, red, purple card faces, textures, borders and ornaments exactly. Keep the same 1024x1536 canvas, exact 2x2 arrangement, positions, sizes and title plaques; DO NOT crop, rescale, move, recolor, redraw or add anything. Deliver RGBA PNG with true transparent empty gutters, no colored backdrop or shadows.

## 數字提示

Production typography sprite atlas: exactly NINE Arabic numeral GLYPHS 1 2 3 / 4 5 6 / 7 8 9 arranged in exact THREE COLUMNS by THREE ROWS on a square canvas. Each cell contains just ONE digit, fully isolated with ample transparent margin, centered on the same baseline, equal optical cap height about 74% of each cell. Top row 1,2,3; middle row 4,5,6; bottom row 7,8,9. These are western Arabic digits, not Chinese characters. Style: bold beautiful heroic calligraphic brush numerals for a Three Kingdoms card game, hand-painted warm pale ivory gold leaf ink, thick confident sweeping tapered strokes and short elegant brush flourishes, subtle metallic amber bevel along edges, thin dark umber outline and very tight dark contour for readability against colored card backgrounds. Make 1 unmistakable with angled head and strong foot, 4 open triangular form, 6 and 9 clearly different. All digits readable at 42px height, broad clear strokes, no excessive flourishes, no detached splatters, no circles, no decorations, no cards, no plaques, no frame, no other marks or text. Truly transparent RGBA background everywhere outside glyph silhouettes. Exact uniform 3x3 cell alignment for programmatic slicing.
