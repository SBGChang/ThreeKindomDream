# 34 · 章節敘事原型接線契約

> 本次 Main 僅接收文件。以下介面存在於 docs/narrative/integration/non-ui-prototype.patch，尚未套用至 Main；所有 UI 實作已撤回，呈現方式由新版 UI 決定。

owns RunState.story；提供 chapterStory、scheduledStory、meetsStory、recordStoryDepth 與故事紀錄查詢。StoryChapterDef 與相關狀態在 contracts/core/story.ts；作者層在 content-source/shu，runtime 只讀已編譯內容。

主線章內第 2、6 回合替代隨機人物事件，保留固定事件與委託。選項先承諾、章末才依改命成果演出回應；一般選項目前僅存入手記，逐項章末回應尚待後續。本批主線不另發成長獎勵，以免未校準的雙重收益影響經濟。

七關戰役每次結束立即記錄最大已通關數；救援達標即永久記入本局 milestones。後續敗退只處理原戰役獎勵，不刪里程碑。chapter close 先發獎勵與過章計數、暫停在 awaitingChapterClose；所有場景確認完才切下一章或結局。確認命令須匹配場景 ID，重複操作拒絕。

主結局依既有 priority 加上 storyRequirements 篩選。本批提供兩個蜀改命結局；同局兩者達成時讓玩家從符合的改命候選選擇紀念，尚未導入一般國策與個人意向功能。改命乘數與官途乘數取最大，僅計一次。

存檔容器升至 version 3，保留原 localStorage key。version 2 正式遷移為 story.enabled=false，舊局不強插已錯過的劇情；新局啟用。version 3 必須驗證節點、選項、場景、里程碑及深度範圍，損壞存檔不予建構，原文保留。

UI：主線使用中央紙面對話，兩個決策按鈕顯示後果；戰前顯示改命準備、所需關卡及實際情境。救援演出在本關戰鬥播完後確認，不讓 UI 提前揭示勝負。養成頁有獨立主線手記，可回看所有已確認演出與本局選擇。

正式入口為黃巾後選「蜀・劉備」，全局 72 回合。第一批有 6 位可養成蜀將與 6 則人物事件；其他人物仍為劇情出場。六位新人物的獨立立繪尚待美術製作，使用有姓名的將印呈現，不冒用他人肖像。
