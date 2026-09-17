# 主選單・夢境山門

Q 版手繪場景、金色題字、四個各有圖案的入口木牌，以及存檔與設定小牌。移除舊頂列／底列，沿用 1280 × 800 舞台等比例縮放。文字獨立疊於美術上，保留動態世數與繼續遊戲。

素材：public/art/ui/main-menu/dream-gate-v1.png

生成方式：內建 imagegen。存檔確認視窗沿用繪製紙框，設定入口共用 GameFrame 系統選單。未修改遊戲與存檔資料模型。

驗證：型別檢查、瀏覽器四個入口及返回、系統選單、存檔視窗 Esc／Tab 與焦點歸還，瀏覽器無錯誤。未執行清除存檔。

## 生成提示詞

Use case: stylized-concept. Create a finished 2D cartoon Chinese Three Kingdoms game title-menu background, landscape 16:10, ideally 1536x960. This is a functional painted game UI plate. Style MUST be cute Q-version hand-painted storybook game art, bold dark brown outlines, rounded chunky wooden architecture and props, simple cel shaded shapes, subtle painted texture, warm vermilion wood, cream parchment, jade teal mountains and peach golden dawn. No realism, no ink wash, no modern web UI, no photographic texture, no 3D rendering. Composition strictly: left 58% shows a dreamy ancient mountain gateway and meandering path through floating green mountains and soft curled clouds; a SMALL cute chibi white-bearded Taoist sage with oversized head napping beside an open scroll beneath a pine at lower left, tiny distant ancient city, cinematic but playful. Upper left between x=10%-49%, y=12%-36% has a beautiful large standalone painted gold/cream Chinese calligraphic game logo with dark chunky outline reading EXACTLY "三國夢", with red ribbons and cloud ornaments, no surrounding rectangular panel. Tiny vermilion seal under logo, no other text. RIGHT side is a fully drawn hanging menu sign supported by a carved timber roof and red cords, with FOUR distinct separate wide horizontal wooden plaques centered at x=77%, spanning x=61%-94%. Plaque 1 spans y=23%-36%: red lacquer gold trim, a glowing curled dream cloud medallion in left quarter. Plaque 2 spans y=39%-50%: honey brown wood cream trim, a rolled character portrait scroll medallion in left quarter. Plaque 3 spans y=53%-64%: deep teal wood gold trim, a round star and jade disk medallion in left quarter. Plaque 4 spans y=67%-78%: brown wood golden trim, a treasure chest and sword medallion in left quarter. All four plaques have clean EMPTY middle and right surfaces for overlaid UI text, no letters. Clearly separated shapes. Lower center x=15%-48%, y=86%-93% draw a horizontal cream scroll for progress text EMPTY. Lower right draw TWO small distinct utility plaques: one x=62%-76%, y=87%-94%, dark wood with a tiny scroll icon at left; one x=79%-93%, y=87%-94%, dark wood with a tiny bronze gear icon at left. EMPTY text surfaces. Entire UI and scene coherently hand drawn, thick outlines, beautiful polished professional cute game art. No text except 三國夢 logo. No watermark.


正式建置：npm run build 通過。

卷軸文字修訂：朱紅直排「記夢」、楷書雙欄「輪迴歷世／已識結局」，數字放大；保留動態紀錄與可及性標籤，未修改其他畫面。瀏覽器確認文字顯示與對齊，typecheck 通過。

最終木牌排版：移除四個入口副文案，主標題於文字區垂直置中；瀏覽器已確認。
