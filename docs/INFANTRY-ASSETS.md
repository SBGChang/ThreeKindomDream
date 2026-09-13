# 已確認長圓身 T Pose 步卒資產 v5

本版直接載入已確認的 body-proportion-study.blend 身體網格，保留長軀幹、厚實長腿的比例，胸甲、護肩、腰帶與鞋子改為圓弧輪廓。身體在 T Pose 下重建連通網格，骨架基礎姿勢雙臂水平；六個動作重新轉換至新基礎姿勢。`connected-body.png` 是去裝備正面 T Pose，`t-pose.png` 是穿甲 T Pose。總面數限制在 3,600 三角面以下，包含已確認的約 2,800 面身體及裝備。

使用 Blender 4.5.0 製作。長圓身、圓眼的 Q 版持矛盾步卒；幾何只保留頭身、四肢、盔、護肩與武器外輪廓。甲片、鉚釘、綁腿、眼睛／眉毛／腮紅、盾紋均由 UV 塗裝表達。

## 檔案

- `art-source/wei-infantry/wei-infantry.blend`：模型、17 骨（含獨立槍骨）骨架、六個 Actions、攝影機、燈光、內嵌材質。
- `public/models/wei-infantry/wei-infantry.glb`：含骨架、動畫、材質的可攜模型。
- `enemy-infantry.glb`：相同幾何、UV、骨架、動畫，換成敵方貼圖；驗收頁可切換。Blender 檔另保留 Enemy infantry 材質供切換。
- `front.png`、`side.png`、`back.png`：同一模型、相同尺度的正交三視圖。
- `infantry-uv-layout.png`：直接由模型 UV loop 匯出的線稿。
- `infantry-basecolor.png`／`infantry-enemy-basecolor.png`：2048² 兩套獨立塗裝。我軍青藍、米金箭紋盾；敵軍赤紅、深色菱紋盾。新增甲片壓邊、穿繩、布料縫線、盾框鉚釘、木紋與柔和腮紅。
- `infantry-orm.png`：R=程序化甲片接縫遮蔽（非幾何烘焙 AO）、G=粗糙度、B=金屬度，Non-Color。
- `infantry-normal.png`：Non-Color，甲片接縫輕微凹凸，其餘維持平坦法線，不做寫實肌理。
- `connected-body.png`：隱藏盔甲與武器後的連續身體，供檢查頭頸、肩膀、軀幹與四肢連接。
- 每方六張動畫橫向圖集：每張 8 格、每格 192²、有透明背景，由 Blender 實際渲染。敵方檔名以 `enemy-` 開頭。

約 3,500 三角面（確切數量見 manifest.json），驗證上限 3,600。身體以連續網格連接頭頸、軀幹與四肢，關節使用正規化混合骨骼權重；盔甲與武器仍為獨立附件。17 骨（含獨立槍骨），無手指／表情／布料模擬。UV 格含 padding，臉、頭盔、胸甲、盾牌分配較大區域；對稱面／裝備側面刻意重用塗裝，頭與盔採圓柱投影。身體頂點逐一與比例稿驗證相同；上臂與腿使用連續塗裝 UV 區域，避免袖口／綁腿鋸齒。v1、v2、v4 原始檔另存帶版本尾碼的 .blend。

## 動畫

歡呼採屈肘預備、向外上方舉槍、頂點短暫停留、收回的循環。手掌握住槍桿同一點，沒有滑握；槍始終直立，手在最高點高過頭頂。歡呼預覽及圖集使用較高、較寬的構圖，保留完整槍尖。`verify-soldier-motion.py` 檢查握點、舉高手部高度與首尾循環。

Idle 48 幀、Run 24 幀、Thrust 32 幀、Hit 20 幀、Death 20 幀、Cheer 40 幀，24 fps。GLB 匯出逐幀骨架動畫；待機、跑步與歡呼循環，倒地停在末幀。根位移由戰場演出控制。歡呼槍尖固定朝上，跑步朝斜前；倒地約 0.83 秒，槍在前段脫手並平落地面。受擊時腹部後縮、上身與頭前傾、雙手往前伸。槍方向與落地位置另由 verify-soldier-motion.py 驗證。

## 遊戲與驗收

`npm run dev -- --port 5188` 後開 `/?art=soldier`，可旋轉 GLB、查看 T Pose、切換敵我塗裝與六個動作、暫停、拖曳動作進度及檢查線框。下方有去除裝備的身體驗證圖、三視圖、UV／材質圖、使用示範資料的戰鬥，不存取遊戲存檔。

正式戰場沿用新版的三拍戰報流程。兵陣採中央直行 8 人優先，再左、右交替增加直行；減員反向退出。士兵採模型預渲染圖集，驗收頁採即時 WebGL GLB。行軍／退場使用 Run，歡呼使用 Cheer，戰鬥使用 Idle／Thrust／Hit／Death。敵我士兵與主將分別載入獨立貼圖渲染的圖集，沒有 CSS 色相濾鏡；我軍行軍動畫不覆蓋敵軍塗裝。

技能只在準備拍壓黑並展示既有 CharacterArt 半身立繪、招名與「發動」，命中拍才更新兵量。倍速、暫停與跳過沿用現有狀態。

## 重建

`blender -b --python-exit-code 1 --python scripts/build-soldier.py`

`blender -b art-source/wei-infantry/wei-infantry.blend --python-exit-code 1 --python scripts/verify-soldier.py`

Blender 官方可攜版：https://download.blender.org/release/Blender4.5/

## 基底

本 worktree 已從桌面主專案複製 tracked 與 untracked（非忽略）檔案，納入重繪 UI、角色素材、連續戰役與相關未提交修改。主專案保持原狀；不能把此 worktree 全部 diff 視為本次新增。舊灰盒演出修改已備份到本機 temporary 目錄，不併入新版。
