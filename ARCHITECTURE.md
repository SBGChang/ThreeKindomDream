# 三國夢 — 軟體架構設計

> **版本**：v1.1（架構與 Data Schema 完整版：32 份契約 ＋ 介面全表 ＋ 結構圖）
> **狀態**：全部 31 個模組的契約與 Data Schema 已定義。實作尚未開始

---

## 0. 文件體系

| 文件 | 回答什麼問題 | 狀態 |
|---|---|---|
| `GDD.md` | 玩家體驗到什麼 | v1.5 |
| `ARCHITECTURE.md`（本文件） | 有哪些模組、介面長怎樣、資料結構是什麼 | v0.3 |
| `IMPLEMENTATION.md` | 用什麼順序建、怎麼驗收 | 未開始 |

**變更流程（不可跳步）**：

```
改玩法 → 改 GDD → 改架構與 Data Schema → 才動實作
```

本文件**不含實作**。目標是讓每個模組都能被獨立實作、獨立測試、獨立替換。

---

## 1. 開發與執行環境

### 1.1 技術堆疊

| 項目 | 選擇 |
|---|---|
| 語言 | TypeScript（strict） |
| 執行環境 | Node 24、ESM |
| 前端 | Vite ＋ React |
| 桌面封裝 | Electron（未來可包裝為 Steam 桌面版） |
| 腳本執行 | `tsx` |
| CI | GitHub Actions |

### 1.2 刻意不做

- **不使用 Unity**
- 不使用 ECS
- 不使用可任意執行腳本的資料檔、`eval`、或模組間 callback
- 不以 React Store、Electron IPC、Steam API 作為遊戲規則的來源
- 第一版不做網路多人、不做泛用 Plugin 生態

### 1.3 tsconfig 硬性要求

```
strict, noEmit, noUncheckedIndexedAccess, noImplicitOverride,
forceConsistentCasingInFileNames, isolatedModules
```

`noUncheckedIndexedAccess` 特別重要：這個遊戲大量以 ID 查表（名士、效果、章節），沒有它，查不到就是 undefined 一路飄下去。

### 1.4 核心不依賴 UI 與平台

規則核心是**純 TypeScript**，不 import React、Electron、任何平台 API。理由不是潔癖：

1. **平衡模擬器要能 headless 跑一萬次 Run** —— 光階機率、DC 曲線、四維成長、官階門檻互相糾纏，靠手玩調不出來
2. 單元測試不啟動 React 或 Electron
3. Steam、存檔、音效都是平台介接，不得滲入規則核心

---

## 2. 架構公約

以下十二條適用於所有模組，不得個案豁免。

### 2.1 Code / Data 分界：一句話判準 ★

> **修改這個值，可能改變內容或平衡嗎？**
>
> - **會** → 它是資料。必須由 Definition／Effect／Rule／內容包提供
> - **不會，且規格已明訂為結構性不變量** → 可以寫在程式裡
> - **判不出來** → **當成資料**

判不出來時預設歸資料，因為兩種猜錯的代價**不對稱**：

- 把不變量做成資料 → 只是多一層間接
- 把資料寫成不變量 → 換一份平衡包時**安靜地失效**，而且那時暫代行為已散在幾十個 Handler 裡

**「目前不打算調整」不是不變量的理由。**

| 屬於 Code（結構性不變量） | 屬於 Data |
|---|---|
| 四維的存在 | 四維的顯示名、換皮名稱、小標題池 |
| 光階的存在與有序性 | 各階的機率與收益倍率 |
| 事件三類的存在 | 各類的出現率、抽取權重 |
| 文武雙軌的結構 | 各階名稱、升遷門檻 |
| 「檢定＝屬性＋加值＋骰子」的算式形狀 | 每個大檢定三難度的 DC |
| Module ID、Schema kind、錯誤碼、RNG 安全上限、**一回合一個動作** | 章節長度、事件上限、資質倍率、事件產出比、碎片產出、商店定價、結局門檻 |

> 注意「章節長度 8 回合」與「事件上限 3」都是**資料**——它們是平衡數值，不是遊戲結構。
> 但「一回合恰好一個動作」是**結構**——它決定了狀態機的形狀，不是可調的數字（15 §2）。

### 2.2 缺資料時只有五個合法出口 ★

1. **Bootstrap 失敗** —— 世界建不起來就不要建
2. **內容包驗證失敗** —— 在載入階段擋下
3. **該功能不啟用** —— 不註冊入口、不出現在 Manifest、UI 不顯示
4. **Command 回傳明確 typed rejection** —— 讓呼叫端拿到可呈現的結果
5. **存檔拒絕載入，或先完成正式 Migration**

不在這五項裡的一律不行。以下很像「處理了」，其實是掩蓋：

- 用空值合併運算子偷給預設值（給 1、給 0、給空陣列）
- Effect Handler 不在就用固定結果
- 回一個預設 Definition
- catch 住 Reader 例外然後繼續成功
- 缺 Handler 或訂閱者就跳過
- 回傳未變 state 當作「處理過了」
- 拿 Fixture 補正式內容
- 用 TODO 註解把未完成行為合理化

> **未完成不是錯誤；把未完成偽裝成可用才是錯誤。**

**冪等 no-op 與偽裝的 fallback 長得幾乎一樣**，判斷方法只有一個：問「如果資料**齊全**，這裡還會 no-op 嗎？」會 → 冪等，合法（需有契約與測試釘住）。不會 → 你在用 no-op 蓋住缺口。

### 2.3 內容的兩層結構：作者層 → 產物 ★

```
content-source/**   作者層：TypeScript，以真實 Definition 型別標註
        ↓ 編譯器（決定性序列化：key 排序 ＋ 固定縮排 ＋ LF）
content/**          產物：純 JSON、零邏輯
        ↓
Runtime             只讀產物
```

**作者層用 TypeScript 的關鍵理由：`tsc` 直接成為內容的 Schema 驗證器。** 純手寫 JSON 沒有型別檢查，打錯欄位名要等 runtime 驗證才發現；作者層用真實型別標註，編譯當下就炸。

規則：

- 內容 ID 字面值**只允許出現在 `content-source/`**。判斷依據是**位置**，不是註解——慣例可以被工具檢查，標註會忘記加
- 作者層**不得寫任何規則邏輯**
- Runtime 讀 `content-source/` 或 `docs/` 由依賴圖檢查擋下
- **產物必須進版控**，且必須等於「用當前作者層重新編譯的結果」（見 §2.6）

### 2.4 Enum 與 Data 的轉換層

Code 持有 enum 取得型別安全，Data 一律以**字串 ID** 引用，中間由 Registry 做雙向轉換與驗證。

- **Data 絕不依賴 enum 的序號** —— 順序調整不影響任何資料檔
- 載入時 Registry 驗證每個字串都能解析，解析不到即**硬失敗**並指出檔案與位置
- 新增「紫光」＝ 加一個 enum 成員 ＋ 加一筆資料，其餘 code 完全不動

### 2.5 分層與依賴方向

```
contracts/        共用契約。不 import 任何模組、React、Electron、平台程式
kernel/           時間、RNG、排程、路由。只依賴 contracts；不知道名士、事件、陣營
data-runtime/     載入、驗證、索引、唯讀 Registry
domain-services/  無 State 的純計算（檢定值計算、結局評定）
modules/<name>/   彼此不 import。跨模組只依賴 contracts/<target> 的 Command／Event／Query Port
app/composition/  唯一可同時 import 多個模組並註冊它們的地方
app/workflows/    跨模組原子流程編排。不擁有 State、不放數值公式、不把失敗藏成成功
app/read-models/  跨模組唯讀 Projection。不寫 State、不執行 Command
ui/               只取得 ViewModel、只送出不含核心 ID 的 CommandRequest
platform/         檔案、IPC、Steam、音效。不實作任何遊戲規則
```

**硬性規則**：

1. `modules/a` 不可 deep-import `modules/b` 的實作或 State
2. `ui/` 不可直接修改 State
3. `platform/` 不可實作遊戲規則
4. 依賴圖不得成環
5. 每個模組以自己的 contract、fixture 與記憶體 Reader 單獨 typecheck／test，不要求啟動完整遊戲

### 2.6 邊界必須由工具強制 ★

文件約定沒有強制力。CI 必須執行：

| 門禁 | 擋什麼 |
|---|---|
| `typecheck` | 型別 |
| 依賴圖檢查 | 模組互相 deep-import；正式路徑 import 測試檔或作者層 |
| 循環依賴 | 依賴圖成環 |
| 無硬編碼內容 ID | ID 字面值出現在 `content-source/` 之外 |
| 無具名數值常數 | 玩法數值寫進 code |
| 無跨語意強制轉型 | 雙重轉型掩蓋契約缺口 |
| 無數值 fallback | 偷給預設值 |
| 內容讀取不得預設成空集合 | 缺資料回空陣列 |
| public API snapshot | 未經契約變更擴張或刪除公開 API |
| 產物同步 | `content/` 必須等於重新編譯 `content-source/` 的結果 |
| **反向綁定斷言** | 有 Handler／Subscriber 實作但 Manifest 未綁定 |
| **跨 slice 讀取** | 模組直接讀取他人擁有的 `RunState` slice，而非經其 Query 介面 |
| **存檔方向規則** | 局內模組 import 活的 MetaState，或在局內寫 MetaState（見 §2.11） |
| **Pack 歸屬** | `pack:core` 引用任何陣營包的內容（依賴方向只能是陣營包 → core） |

**最後一條特別容易漏**：只做正向檢查時，「有實作但沒註冊」會讓啟動驗證綠、測試綠，而那段程式**永遠不會被呼叫**。這是「宣告 ≠ 接線」最難察覺的方向。

**紀律門禁與缺口報告必須分開**：

| | 量什麼 | 是否阻擋 |
|---|---|---|
| **紀律門禁** | 已經寫下來的程式，寫得對不對 | **阻擋**，進 CI |
| **缺口報告** | 還有多少沒寫 | 不阻擋，只能往下的進度指標 |

混在一起會有兩個後果：CI 在遊戲完成前永遠是紅的（而永遠紅的門禁只會被繞過），以及「紀律綠燈」失去意義——它應該代表「已完成的部分沒有偷工」，不是「遊戲做完了」。

**門禁的錯誤訊息必須能直接動手修**：依賴圖違規要印出完整 import 鏈，其餘要印出檔案:行號與原文。只說「有問題」而不說「在哪、怎麼來的」的門禁，會被當成雜訊繞過。

### 2.7 可重播

> 同一份初始狀態 ＋ 資料版本 ＋ 指令序列 ＋ RNG seed → **必須產生相同結果**。

- seed 存進 RunState 與存檔
- RNG 由 kernel 提供**具名 stream**，不得使用全域隨機源
- 這是「玩家回報第 37 回合出 bug」能重現的唯一前提，也是平衡模擬器的基礎

### 2.8 Schema 版本與三層驗證

每份 Definition 必須有穩定 `id`、`schemaVersion`、所屬 `packId`。載入分三層驗證：

1. **Schema 驗證** —— 欄位、列舉、型別、必填、數值範圍
2. **Reference 驗證** —— 所有引用的 ID 必須存在（含 FuncType/ReferID 的兩段式，見 §6.9）
3. **規則驗證** —— 跨欄位一致性。例：某大檢定的敵方名士不得同時列在該檢定的可出戰名單

任一層失敗**不得啟動**，並必須回報**檔案路徑 ／ Definition ID ／ 欄位路徑 ／ 錯誤原因**。

### 2.9 一筆 Definition 一個檔案

高變動內容（名士、事件、寶物、章節）採「一筆一檔」，例如 `content-source/notables/guanyu.ts`。避免多人改同一張大表而衝突。索引與 Manifest 由編譯器產生。

低變動的全域表（光階、資質階、好感度階段）可集中成單檔。

### 2.10 名詞與責任區分

| 名詞 | 定義 | 是否存檔 |
|---|---|---|
| **Definition** | 唯讀內容定義（名士、事件、寶物、章節、效果） | 否；以版本／雜湊識別 |
| **MetaState** | 跨 Run 持久狀態（圖鑑、碎片、輪迴點數、商店解鎖） | **是** |
| **RunState** | 本局夢境的可變狀態，**內含一份 MetaState 凍結快照** | **是** |
| **GameCommand** | 玩家意圖（選鍛鍊、選事件、選難度、購買） | 否 |
| **InternalCommand** | 模組對模組的定向要求；單一 Handler，可拒絕 | 否 |
| **DomainEvent** | 已發生的結果（光階已判定、好感度已變更、章節已通過） | 視需要 |
| **EffectRef** | funcType ＋ referId 的效果引用 | 否 |

**最重要的分界**：

```
資料定義「是什麼、數值多少、引用誰、何時可觸發」
程式定義「合法條件與效果種類要如何執行」
RunState 記錄「本局的它到哪了、是否已處理」
MetaState 記錄「跨 Run 累積了什麼」
```

### 2.11 存檔模型：一份檔案、兩層狀態、一個快照 ★

**物理上是同一份存檔檔案**，內含 MetaState 與（若有進行中的夢）RunState。

**邏輯上 RunState 內含一份 MetaState 的凍結快照**，不是對活的 MetaState 的參照：

```
入夢：MetaState ──快照（凍結、唯讀）──▶ RunState.metaSnapshot
局內：只讀 metaSnapshot；永不讀活的 MetaState；永不寫 MetaState
夢醒：RunState ──結算模組（26）──▶ MetaState（唯一寫入點）
```

**為什麼一定要快照，不能直接讀活的 MetaState**：

1. **可重播（§2.7）** —— 若局內讀活的 MetaState，玩家夢醒後在商店買了升階機率，再用同一 seed replay 上一場夢會得到不同結果。快照讓每個 Run 自我封閉
2. **平衡模擬器（模組 31）** —— 只要餵一份快照就能 headless 跑一萬次，不需要建整個 MetaState、不需要模擬商店
3. **存檔遷移** —— MetaState schema 升版時，進行中的 Run 行為不會被改變

**快照不挑欄位，整份複製。** 理由與 §2.1 的「判不出來就當資料」同一套：漏掉一個欄位（例如 Run 中途才浮現的「來訪名士」的圖鑑等級）會**安靜地算錯**；而多存幾十 KB 文字資料沒有任何代價。

**三條方向規則（門禁可檢查）**：

| 規則 | 違反的後果 |
|---|---|
| 局內模組不得 import 活的 MetaState | 可重播破功 |
| 局內模組不得寫 MetaState | 結算不再是唯一交接點，產出來源散開 |
| 只有結算模組（26）可同時持有 RunState 與活的 MetaState | —— |

### 2.12 內容分包：陣營即 Pack ★

```
pack:core                              陣營無關的規則骨架
  ├─ 光階／四維／資質／好感度階段／規則常數
  ├─ 效果定義表（各 FuncType）
  ├─ 天賦、官階表、結局稱號骨架
  ├─ 南華村篇章節（黃巾、虎牢）
  └─ 居民委託模板與參數池

pack:wei / pack:shu / pack:wu           每個陣營一包，requiredPacks: [core]
  ├─ 章節序列（7 章）與大檢定
  ├─ 陣營委託模板
  ├─ 專屬劇情事件
  ├─ 該陣營帶來的名士與寶物
  ├─ 上司名士池
  └─ 陣營結局變體
```

**名士按「首次登場的 pack」歸屬，但兒時玩伴池是所有已載入 pack 的名士聯集。**
因此關羽住在 `pack:shu`，玩魏線照樣能指定他當兒時玩伴——符合 GDD「夢中無勢力與年齡限制」的設定。

**歸屬判準**（沿用 §2.1 的不對稱邏輯）：

> 這個值換陣營會改變嗎？會 → 陣營包。三陣營都相同且屬遊戲結構 → core。
> **判不出來的一律放陣營包**——放陣營包只是多複製一份；放 core 會讓該陣營永遠改不動它。

**驗收標準**：

> **加黃巾線 ＝ 新增 `pack:huangjin`，`pack:core` 一行不動。**
> 張角跟著自己的 pack 進圖鑑，不需要回頭改核心名士表。

副作用（正面）：只安裝 `core + pack:wei` 也能跑，虎牢關後只有魏可選。這讓陣營天然具備 DLC／分批出貨的能力。

---

## 3. 建議目錄

```text
content-source/                    作者層：TypeScript，型別即 Schema
├─ core/                           pack:core —— 陣營無關的規則骨架
│  ├─ config/                      光階、四維、資質、好感度階段、規則常數
│  ├─ effects/                     各 FuncType 的效果定義
│  ├─ talents/                     天賦
│  ├─ career/                      文武官階
│  ├─ endings/                     結局稱號骨架
│  ├─ chapters/nanhua.ts           南華村篇（黃巾、虎牢）
│  └─ events/                      居民委託模板、參數池
├─ wei/                            pack:wei —— requiredPacks: [core]
│  ├─ chapters/<id>.ts             7 章與大檢定（一章一檔）
│  ├─ notables/<id>.ts             該陣營帶來的名士（一筆一檔）
│  ├─ treasures/<id>.ts
│  ├─ events/                      陣營委託模板、專屬劇情事件
│  ├─ pools.ts                     上司名士池
│  └─ endings.ts                   陣營結局變體
├─ shu/                            同上
├─ wu/                             同上
└─ packs.ts                        內容包宣告、版本、相依、載入順序

content/                           產物：純 JSON、零邏輯、進版控
├─ manifest.json
├─ core/
└─ wei/  shu/  wu/

src/
├─ contracts/
│  ├─ core/                        ID、信封、交易、共用形狀
│  └─ <module>/                    各模組自己的公開契約
├─ kernel/                         RNG、排程、路由、交易
├─ data-runtime/                   載入、驗證、Registry
├─ domain-services/                純計算、無 State
├─ modules/<name>/
│  ├─ public.ts                    唯一對外入口
│  ├─ state.ts                     唯一可寫的 Slice
│  ├─ definitions.ts               本模組所需的 Definition 型別
│  ├─ commands.ts  events.ts  queries.ts  system.ts
│  ├─ fixtures.ts                  測試用（受位置門禁保護）
│  └─ <name>.test.ts
├─ app/
│  ├─ composition/                 State／訊息聯集與 Registry
│  ├─ workflows/                   跨模組原子流程
│  ├─ read-models/                 跨模組 Projection
│  └─ save/
├─ ui/                             features / components / design-system
├─ platform/                       electron / save / steam
└─ testing/                        Bring-up 與測試專用（靠位置排除於門禁）

scripts/                           門禁與工具鏈
├─ compile-content.ts              作者層 → 產物
├─ verify-discipline.ts            紀律門禁
├─ verify-modules.ts               模組單元測試
├─ verify-content.ts               產物同步 ＋ 可載入
├─ verify-gap.ts                   缺口報告（不阻擋）
└─ simulate-balance.ts             headless 平衡模擬
```

---

## 4. 模組全景（31 個）

狀態：**✅ 架構已設計** ／ **🔵 GDD 已定義，架構待討論** ／ **⚠️ GDD 尚未定義**

### 4.1 橫切層

| # | 模組 | 職責 | 狀態 |
|---|---|---|---|
| 1 | **效果系統** | FuncType/ReferID 分派、結算、explain | ✅ §6 |
| 2 | **Data 載入與驗證** | 解析→驗證→索引、schemaVersion、Migration | 🔵 |
| 3 | **RunState** | 局內單一真相來源 | 🔵 |
| 4 | **RNG 服務** | 具名 stream、可重現、seed 管理 | ⚠️ |
| 5 | **事件匯流排** | DomainEvent 廣播 | 🔵 |
| 6 | **本地化** | 全部文案外部化 | ⚠️ |

### 4.2 元層（MetaState，跨 Run 持久）

| # | 模組 | 職責 | 狀態 |
|---|---|---|---|
| 7 | **存檔** | 序列化、版本 Migration | ⚠️ |
| 8 | **輪迴點數經濟** | 產出與消耗帳 | 🔵 |
| 9 | **天命商店** | 品項、定價、解鎖依賴、購買 | 🔵 |
| 10 | **名士圖鑑** | 碎片→初始好感→解鎖條、星級、指定權 | 🔵 |
| 11 | **寶物圖鑑** | 碎片、強化、攜帶資格 | 🔵 |
| 12 | **收集圖鑑** | 事件圖鑑、結局圖鑑、完成度 | ⚠️ |
| 13 | **成就與統計** | 跨 Run 記錄 | ⚠️ |

### 4.3 配置層

| # | 模組 | 職責 | 狀態 |
|---|---|---|---|
| 14 | **入夢配置** | 資質配點、天賦配帶、寶物攜帶、玩伴指定、合法性驗證 | 🔵 |

### 4.4 局內層（RunState）

| # | 模組 | 職責 | 狀態 |
|---|---|---|---|
| 15 | **章節回合推進** | 章節表、回合計數、階段轉換、大檢定觸發 | 🔵 |
| 16 | **鍛鍊槽** | 四格生成、兩層光階抽取、名士站位、結算 | 🔵 |
| 17 | **事件槽** | 門檻過濾抽取、刷新、執行、事上磨練 | 🔵 |
| 18 | **檢定引擎** | 小檢定＋大檢定共用、DC、成功率、難度選擇 | 🔵 |
| 19 | **名士局內狀態** | 3+3 陣容組建、好感度、連動、事件鏈進度 | 🔵 |
| 20 | **屬性與貨幣** | 四維、名聲（文／武／善惡）、功績（文／武） | 🔵 |
| 21 | **官階系統** | 文武雙軌、升遷檢定、作為委託門檻 | 🔵 |
| 22 | **陣營系統** | 選擇、資格門檻、專屬事件池、主公 | 🔵 |
| 23 | **技能系統** | 局內習得、效果、檢定分支 | ⚠️ **最大缺口** |
| 24 | **寶物局內狀態** | 持有、獲得、**本輪重複判定**、碎片產出 | 🔵 |

### 4.5 結束層

| # | 模組 | 職責 | 狀態 |
|---|---|---|---|
| 25 | **結局判定** | 圓夢／中止分類、稱號門檻、善惡修飾 | 🔵 |
| 26 | **結算產出** | 輪迴點數、碎片、圖鑑登錄；**RunState → MetaState 的唯一交接點** | 🔵 |

### 4.6 呈現層（不含實作，介面要定）

| # | 模組 | 職責 | 狀態 |
|---|---|---|---|
| 27 | **畫面路由** | 主選單→商店→配置→局內→結局→結算 | ⚠️ |
| 28 | **文本模板填充** | 委託模板的參數注入 | 🔵 |
| 29 | **音效音樂** | 訂閱事件匯流排 | ⚠️ |

### 4.7 工具鏈

| # | 模組 | 職責 | 狀態 |
|---|---|---|---|
| 30 | **內容編譯器** | 作者層 → 產物，決定性序列化 | 🔵 |
| 31 | **平衡模擬器** | headless 跑 N 萬次 Run，輸出分佈 | ⚠️ |

---

## 5. 資料清單

歸屬欄位：**core** ＝ `pack:core`；**陣營** ＝ 各 `pack:<faction>`。判不出來的一律歸陣營包（§2.12）。

### 5.1 全域表（core，低變動，集中單檔）

| 檔案 | 內容 |
|---|---|
| `config/glow-tiers.ts` | 光階 id、收益倍率、基礎權重 |
| `config/attributes.ts` | 四維 id、兩階段換皮名稱與小標題池 |
| `config/aptitude-grades.ts` | 資質 F–S 的權重偏移與收益倍率 |
| `config/affinity-stages.ts` | 好感度階段區間、碎片產出表 |
| `config/game-rules.ts` | 章節長度、事件上限、基礎升階機率 |

### 5.2 名士（陣營包，一筆一檔）

| 檔案 | 歸屬 | 內容 |
|---|---|---|
| `<faction>/notables/<id>.ts` | 陣營 | 姓名、稀有度、解鎖條列表、事件鏈 |
| `<faction>/pools.ts` | 陣營 | 該陣營的上司名士池 |

> **兒時玩伴池不是一份資料，而是所有已載入 pack 的名士聯集**，由 Registry 在載入後計算。因此關羽住在 `pack:shu`，玩魏線照樣可指定他。

### 5.3 效果（core，每個 FuncType 一檔，17 份）

`effects/` 下：`stat-modifier`、`glow-upgrade-bonus`、`glow-base-weight`、`slot-bias`、`event-reward-bonus`、`event-draw-modify`、`event-reroll`、`slot-reroll`、`affinity-grant`、`affinity-growth`、`fragment-drop`、`check-value-bonus`、`check-retry`、`check-downgrade-retry`、`skill-grant`、`reveal-info`、`currency-bonus`

### 5.4 事件

| 檔案 | 歸屬 | 內容 |
|---|---|---|
| `core/events/resident-commissions.ts` | core | 居民委託**模板** |
| `core/events/commission-params.ts` | core | 參數池：地名、委託人、賊名、物資、DC 縮放 |
| `<faction>/events/commissions.ts` | 陣營 | 陣營委託**模板** |
| `<faction>/events/story/<id>.ts` | 陣營 | 唯一性劇情事件（一筆一檔） |

### 5.5 章節與大檢定

| 檔案 | 歸屬 | 內容 |
|---|---|---|
| `core/chapters/nanhua.ts` | core | 南華村篇（黃巾、虎牢） |
| `<faction>/chapters/<id>.ts` | 陣營 | 該陣營 7 章（一章一檔） |

大檢定的三難度 DC、獎勵、敵方名士名單隨章節同檔。

### 5.6 其餘

| 檔案 | 歸屬 | 內容 |
|---|---|---|
| `core/talents/talents.ts` | core | 天賦主表、配帶點數 |
| `core/career/{civil,martial}-ranks.ts` | core | 文武各 12 階、升遷門檻 |
| `core/endings/endings.ts` | core | 結局稱號骨架、門檻、善惡修飾 |
| `core/meta/destiny-shop.ts` | core | 商店品項、定價、解鎖依賴 |
| `core/meta/settlement.ts` | core | 結算公式參數 |
| `<faction>/treasures/<id>.ts` | 陣營 | 寶物、稀有度、強化階 |
| `<faction>/pools.ts` | 陣營 | 掉落池、上司池 |
| `<faction>/faction.ts` | 陣營 | 主公、加入門檻（善惡名）、章節序列 |
| `<faction>/endings.ts` | 陣營 | 陣營結局變體 |
| `skills/<id>.ts` | ？ | ⚠️ 待 GDD 定義；歸屬未定 |
| `l10n/zh-TW/*.json` | 隨 pack | 全部文案，各 pack 帶自己的 |

> **勢力緣分**（天命商店的魏／蜀／吳三條）住在 `core/meta/destiny-shop.ts`，但每條的存在與否取決於對應陣營包是否載入——商店品項需支援「依賴某個 pack」的宣告。

---

## 6. Definition Kind 登記表

Registry 以 `kind` 判斷 Definition 家族與擁有模組。**登記表以各模組 Reader 匯出的常數組成，不重打字串**（02 §5）。

`kind` 只裝家族，變體另開欄位（[00 §8.1](docs/architecture/00_shared_contracts.md)）。

| kind | 擁有模組 | Pack | 內容 |
|---|---|---|---|
| （17 張效果表） | 01 效果系統 | core | 各 FuncType 的效果定義，以 `referId` 引用 |
| `shopItem` | 09 天命商店 | core | 商店品項、階梯定價、解鎖依賴 |
| `settlementFormula` | 08 點數經濟 | core | 結算公式係數 |
| `notable` | 10 名士圖鑑 | **陣營** | 名士本體、解鎖條、事件鏈 |
| `affinityCurve` | 10 名士圖鑑 | core | 碎片成本、指定權門檻、階段碎片產出 |
| `treasure` | 11 寶物圖鑑 | **陣營** | 寶物、強化階 |
| `treasurePool` | 11 寶物圖鑑 | **陣營** | 掉落池 |
| `achievement` | 13 成就統計 | core ／陣營 | 成就條件 |
| `talent` | 14 入夢配置 | core | 天賦、配帶成本、互斥組 |
| `aptitudeCost` | 14 入夢配置 | core | 資質累計成本 |
| `chapter` | 15 章節推進 | core ／**陣營** | 章節、長度、大檢定引用 |
| `chapterSequence` | 15 章節推進 | core ／**陣營** | 章節序列 |
| `trainingAction` | 16 鍛鍊槽 | core | 四維 × 兩階段的行動與小標題池 |
| `glowTier` | 16 鍛鍊槽 | core | 光階倍率與權重 |
| `trainingCurve` | 16 鍛鍊槽 | core | 成長曲線、升階基礎機率 |
| `aptitudeGrade` | 16 鍛鍊槽 | core | 資質階的位移與倍率 |
| `event` | 17 事件槽 | core ／**陣營** | 事件與委託模板 |
| `paramPool` | 17 事件槽 | core ／**陣營** | 委託參數池 |
| `dcCurve` | 17 事件槽 | core | 小檢定 DC 依章節縮放 |
| `eventYieldCurve` | 17 事件槽 | core | 事件的四維與貨幣產出曲線 |
| `majorCheck` | 18 檢定引擎 | core ／**陣營** | 大檢定三難度、敵方名士 |
| `checkRule` | 18 檢定引擎 | core | 副屬性權重、骰範圍、出戰上限 |
| `notablePool` | 19 名士局內 | **陣營** | 陣營上司池 |
| `linkBonus` | 19 名士局內 | core | 連動倍率、出戰加值、好感成長 |
| `affinityStage` | 19 名士局內 | core | 好感度階段區間 |
| `attributeCap` | 20 屬性貨幣 | core | 四維上限、善惡名上下限 |
| `careerRank` | 21 官階系統 | core | 文武各 12 階、門檻、加值 |
| `careerInit` | 21 官階系統 | core | 入朝初始階級對照 |
| `faction` | 22 陣營系統 | **陣營** | 主公、加入門檻、序列引用 |
| `skill` | 23 技能系統 | 待定 | ⚠️ 內容待 GDD 補 |
| `ending` | 25 結局判定 | core ／**陣營** | 結局稱號、門檻、善惡修飾 |
| `audioCue` | 29 音效 | core ／**陣營** | 事件 → 音效對應 |

---

## 7. 契約索引

模組契約全部在 `docs/architecture/`。每份的結構相同：**職責邊界 → Data Schema → State Slice → 公開介面 → 不變量 → 刻意不做**。

### 7.1 基礎與全局視角

| 檔案 | 內容 |
|---|---|
| [00 · 共用核心契約](docs/architecture/00_shared_contracts.md) | ID 家族、回合座標、RNG、RunState／MetaState 頂層、訊息信封、交易、ModuleContract、驗證錯誤格式 |
| [介面全表](docs/architecture/interfaces.md) | **31 個模組的完整對外函式 ＋ 模組間持有關係 ＋ Command 全表 ＋ Composition 組裝順序** |
| [模組結構圖](docs/architecture/module-map.md) | 9 張圖：分層依賴、兩層狀態、效果系統、單動作回合、章節與檢定、各層骨架 |

**`00` 是地基**，任何變更都是破壞式變更。
**`interfaces.md` 是查詢入口** —— 要知道某個模組對外開哪些函式、誰持有誰，看它比翻 31 份契約快。

### 7.2 橫切層

| 模組 | 檔案 |
|---|---|
| ① 效果系統 | [01_effect_system.md](docs/architecture/01_effect_system.md) — FuncType ＋ ReferID、三種整合點、17 張效果表的完整 Schema |
| ② Data Runtime | [02_data_runtime.md](docs/architecture/02_data_runtime.md) — 三階段載入、Pack 檢查、三層驗證、窄化 Reader |
| ③ RunState | [03_run_state.md](docs/architecture/03_run_state.md) — Slice 所有權表、`RunContext` vs `TurnContext`、生命週期 |
| ④ RNG | [04_rng.md](docs/architecture/04_rng.md) — 具名 stream、存檔相容性、破壞式變更清單 |
| ⑤ 事件匯流排 | [05_event_bus.md](docs/architecture/05_event_bus.md) — 方向規則、Outbox、首批事件清單 |
| ⑥ 本地化 | [06_localization.md](docs/architecture/06_localization.md) — Key 慣例、缺 key 是建置期問題 |

### 7.3 元層（MetaState）

| 模組 | 檔案 |
|---|---|
| ⑦ 存檔 | [07_save.md](docs/architecture/07_save.md) — 一份檔案兩層狀態、何時拒絕載入 |
| ⑧ 輪迴點數 | [08_reincarnation_points.md](docs/architecture/08_reincarnation_points.md) — 唯一帳本、結算公式係數 |
| ⑨ 天命商店 | [09_destiny_shop.md](docs/architecture/09_destiny_shop.md) — `ShopGrant` 列舉、DAG 驗證、`requiresPack` |
| ⑩ 名士圖鑑 | [10_notable_codex.md](docs/architecture/10_notable_codex.md) — 單一軌道、稀有度 vs 培養度、解鎖條 |
| ⑪ 寶物圖鑑 | [11_treasure_codex.md](docs/architecture/11_treasure_codex.md) — 強化是取代不是疊加 |
| ⑫ 收集圖鑑 | [12_collection_codex.md](docs/architecture/12_collection_codex.md) — 只記唯一性內容、完成度分母 |
| ⑬ 成就統計 | [13_achievements.md](docs/architecture/13_achievements.md) — 純週邊、與點數帳本交叉驗算 |

### 7.4 配置層

| 模組 | 檔案 |
|---|---|
| ⑭ 入夢配置 | [14_dream_entry_config.md](docs/architecture/14_dream_entry_config.md) — Meta／Run 唯一橋樑、十條合法性檢查、草稿與確認分離 |

### 7.5 局內層（RunState）

| 模組 | 檔案 |
|---|---|
| ⑮ 章節回合 | [15_chapter_turn.md](docs/architecture/15_chapter_turn.md) — 一回合一個動作（鍛鍊／事件互斥）、兩條序列接續 |
| ⑯ 鍛鍊槽 | [16_training_slot.md](docs/architecture/16_training_slot.md) — 兩層 RNG、生成順序、只產出四維 |
| ⑰ 事件槽 | [17_event_slot.md](docs/architecture/17_event_slot.md) — 事件庫兩類架構、抽取邏輯、委託模板、事上磨練 |
| ⑲ 名士局內 | [19_notable_runtime.md](docs/architecture/19_notable_runtime.md) — 基底與升星的分工、幼年／成年互斥、站位分配 |
| ⑱ 檢定引擎 | [18_check_engine.md](docs/architecture/18_check_engine.md) — 成功率封閉式、一律可見、失敗處理鏈 |
| ⑲ 名士局內 | [19_notable_runtime.md](docs/architecture/19_notable_runtime.md) — 3+3 組建、站位分配、局內好感度 vs `startAffinity` |
| ⑳ 屬性貨幣 | [20_attributes_currency.md](docs/architecture/20_attributes_currency.md) — 唯一門檻查詢入口、寫入權限表 |
| ㉑ 官階系統 | [21_career_rank.md](docs/architecture/21_career_rank.md) — 文武雙軌、三個用途 |
| ㉒ 陣營系統 | [22_faction.md](docs/architecture/22_faction.md) — 資格門檻、切換影響面 |
| ㉓ 技能系統 | [23_skill.md](docs/architecture/23_skill.md) — 兩個作用都用既有機制（⚠️ 內容待 GDD 補） |
| ㉔ 寶物局內 | [24_treasure_runtime.md](docs/architecture/24_treasure_runtime.md) — 「重複」的定義、二選一事件的顯示 |

### 7.6 結束層

| 模組 | 檔案 |
|---|---|
| ㉕ 結局判定 | [25_ending.md](docs/architecture/25_ending.md) — 結局在前夢醒在後、`trigger` vs `requirements` |
| ㉖ 結算產出 | [26_settlement.md](docs/architecture/26_settlement.md) — 唯一交接點、原子性、冪等 |

### 7.7 呈現層

| 模組 | 檔案 |
|---|---|
| ㉗ 畫面路由 | [27_screen_routing.md](docs/architecture/27_screen_routing.md) — 動線、UI 禁則、成功率必須可見 |
| ㉘ 文本模板 | [28_text_template.md](docs/architecture/28_text_template.md) — 兩層解析、缺參數是載入期問題 |
| ㉙ 音效音樂 | [29_audio.md](docs/architecture/29_audio.md) — 純週邊、可整體移除 |

### 7.8 工具鏈

| 模組 | 檔案 |
|---|---|
| ㉚ 內容編譯器 | [30_content_compiler.md](docs/architecture/30_content_compiler.md) — 決定性序列化、產物同步門禁 |
| ㉛ 平衡模擬器 | [31_balance_simulator.md](docs/architecture/31_balance_simulator.md) — 決定了「核心不依賴 UI」這條約束 |

---

## 8. 首批需要凍結的契約

在任何實作開始前，先完成並審核：

1. **`RunState` 與 `MetaState` 各 Slice 的型別與所有權** → [03 §1](docs/architecture/03_run_state.md)
2. **`GameCommand` ／ `InternalCommand` ／ `DomainEvent` 的語意與信封** → [00 §9](docs/architecture/00_shared_contracts.md)
3. **`EffectRef`、FuncType 列舉、Target 註冊表、Handler 註冊格式** → [01](docs/architecture/01_effect_system.md)
4. **內容包 Manifest、Definition kind 登記表、驗證錯誤格式** → §6 ＋ [02](docs/architecture/02_data_runtime.md)
5. **RNG stream 命名與 seed 傳遞規則** → [04](docs/architecture/04_rng.md)
6. **`RunContext` 與 `TurnContext` 的分界** → [03 §2](docs/architecture/03_run_state.md)
7. **`ModuleContract` 的註冊格式與雙向驗證** → [00 §11](docs/architecture/00_shared_contracts.md)

其後可平行開發：⑯ 鍛鍊槽、⑰ 事件槽、⑱ 檢定引擎、⑲ 名士局內、⑳ 屬性貨幣、㉑ 官階彼此只依賴 `contracts/`，可各自完成。

---

## 9. 架構層發現、需回頭補 GDD 的項目

寫契約的過程中發現的缺口。**這些是資料或玩法設計問題，不是架構問題**——架構已預留位置。

| # | 項目 | 出處 | 說明 |
|---|---|---|---|
| 1 | **四維上限未定義** | [20 §2](docs/architecture/20_attributes_currency.md) | 沒有上限就無法設計 DC 曲線。這是最優先的待補數值 |
| 2 | **資質「±N 檔」的語意未定** | [16 §2.1](docs/architecture/16_training_slot.md) | S 資質 +4 檔若直譯為「全部移到紅光」會破壞光階系統 |
| 3 | **`RevealInfo.majorCheckDC` 多餘** | [18 §3.2](docs/architecture/18_check_engine.md) | 成功率一律可見 ⇒ DC 可反推。建議改為揭露**檢定值組成明細** |
| 4 | **技能內容清單缺** | [23](docs/architecture/23_skill.md) | 架構完整，缺的是 `content-source/*/skills/*.ts` |
| 5 | **技能的 pack 歸屬未定** | [23 §2.2](docs/architecture/23_skill.md) | 依判準預設歸陣營包 |
| 6 | **結算兩線相加 vs 取高值** | [26 §4.1](docs/architecture/26_settlement.md) | 與官階門檻曲線互為表裡，需一併決定 |
| 7 | **天命商店定價全缺** | [09](docs/architecture/09_destiny_shop.md) | 輪迴點數的產出已定義，消耗完全沒有 |
| 8 | **★5 寶物碎片期望值** | [24 §3.1](docs/architecture/24_treasure_runtime.md) | 需 ㉛ 模擬器驗證是否接近 0（若是，獲得條件太窄） |
