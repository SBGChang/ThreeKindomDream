# 入夢分頁 UI
正式 ScreenEntry 改為資質、天賦、器物三個 Tab，共用草稿，頁籤支援方向鍵與 Home/End。底部以圖示顯示三種配額，超支原因與入夢確認維持可見。
## 專用素材
使用內建 imagegen 生成，未使用 CLI。素材保存於 public/art/ui/entry/：
- aptitude-v1.png：四象命盤與資質卷軸
- talent-v1.png：星象觀測台
- items-v1.png：行囊與器物整理桌
- companions-v1.png：桃花集結亭與屏風（保留素材，入夢不使用）
- talent-medallions-v1.png：11 種天賦專用圖騰與備用星圖
完整提示詞見 entry-tab-prompts.json、entry-talent-prompt.txt。
## 呈現
資質卷軸保留四維與能力上限；天賦以獨立圖騰星命牌呈現；器物陳列於木桌凹槽。同行安排留在遊戲中的流程，不在入夢配置。無可見 scrollbar，長清單支援按住拖曳。
## 檢查
正常與超支配置、跨頁保留選取、器物拖曳不誤選已透過瀏覽器操作確認。預覽路徑 ?art=realms&view=entry；加 sample=1 只在記憶體提供已購滿商店和藏品樣本，不寫入存檔。

## 一體式操作按鈕
返回與入夢使用內建 imagegen 獨立繪製的透明完整按鈕，取代紙框與分離圖示。素材：public/art/ui/entry/button-back-v1.png、button-enter-v1.png。提示詞：entry-button-prompts.json。保持圖片比例，hover 提亮、按下微沉、超支停用灰階，保留可存取名稱與鍵盤焦點。

## Q 版風格修正
目前背景使用 aptitude-v2.png、talent-v2.png、items-v2.png；操作按鈕使用 button-back-v2.png、button-enter-v2.png，均位於 public/art/ui/entry/。內建 imagegen 重畫為粗線條、圓潤道具與簡化明暗，去除金玉金屬主調。提示詞：entry-cartoon-prompts.json。

## 精簡配置
入夢專用頁不顯示全域頂列、設定入口、底部導覽與預覽狀態；移除世次與重複配額摘要。標題、三個 Tab、返回排成同一列，主要場景擴大，底部只保留錯誤提示與入夢按鈕。各頁自身的配額與能力上限仍可見。
