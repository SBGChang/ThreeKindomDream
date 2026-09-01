# 15 · 章節與回合推進

> **職責**：持有回合進度與行動配比、宣告「一回合一個動作」、決定何時進入章末戰役、執行章節通過後的特殊動作。
>
> | | |
> |---|---|
> | **owns** | `RunState.progress`、`RunState.actions` |
> | **reads** | 16 鍛鍊槽 ／ 17 事件槽（各回報自己那半的動作）、33 戰役 |
> | **handles** | `turn.advance` |
> | **emits** | `turn.advanced` / `chapter.entered` / `campaign.due` |
> | **ownsDefinitions** | `chapter`、`chapterSequence` |

---

## 1. Data Schema

```ts
interface ChapterDefinition extends DefinitionHeader {
  readonly kind: 'chapter';
  readonly factionId: FactionId | null;     // null ＝ 南華村篇（共用）
  readonly order: number;                   // 在該序列中的位置，1-based 連續
  readonly length: number;                  // 回合數（資料，非常數）
  readonly onPass: ChapterPassAction | null;
  readonly collectible: boolean;            // 是否進收集圖鑑（見 12）
}

type ChapterPassAction =
  | { readonly kind: 'chooseFaction' };     // 虎牢關通過後選陣營

interface ChapterSequenceDefinition extends DefinitionHeader {
  readonly kind: 'chapterSequence';
  readonly factionId: FactionId | null;
  readonly chapters: readonly ChapterId[];  // 依序
}
```

### 1.1 `length` 是資料，不是常數

GDD 目前訂 8 回合，但那是**平衡數值**（ARCHITECTURE §2.1）。逐章可設不同長度——例如南華村篇前期給短一點以加快教學節奏。

因此 `TurnProgress.turnInChapter` 必須由章節表推導，**不得反向以固定除法計算**（00 §3）。

### 1.2 兩條序列的接續

```
chapterSequence(factionId: null)   →  南華村篇：黃巾、虎牢
        ↓ 虎牢關 onPass = chooseFaction
chapterSequence(factionId: 'wei')  →  魏線 7 章
```

選陣營後切換序列。**南華村篇的章節不進入陣營序列**，兩者是接續而非合併。

---

## 2. 一回合恰好一個動作 ★

```ts
type TurnAction =
  | { kind: 'training'; index: SlotIndex }
  | { kind: 'event';    offerIndex: number; optionIndex: number }

actionOf(ctx): TurnAction | null      // 本回合已投入的動作
canAdvance(ctx): boolean              // ⟺ actionOf(ctx) !== null
assertActable(ctx): void              // 已行動 → 拒絕
```

**鍛鍊與事件是同一個動作槽的兩邊，互斥。** 選了鍛鍊就不能再做事件，反之亦然；
選完即結束本回合（GDD §4.2）。

> **為什麼互斥**：兩槽並存時，「兩個都選」永遠是最優解 —— 事件不花任何代價，
> 於是事件槽不是決策而是免費贈品，而鍛鍊槽是唯一真正的選擇。
> 改成互斥之後，每一回合都在問同一個問題：
> **這一回合要練本事（上課），還是要去辦事換名聲功績（工作）。**

### 2.1 不另存 commitment 欄位

兩個槽各自已經記了自己的結果（`training.selected` ／ `event.resolved`），
互斥性讓「其中恰有一個非 null」本身就是完整資訊。再加一個 `committed` 欄位
只會多出一個可能與兩者不一致的真相來源。

因此 15 的職責是**組合這兩個查詢並宣告規則**：

```
actionOf = training.selectedAction(ctx) ?? event.resolvedAction(ctx)
```

兩個槽各自匯出一個回報函式，15 不直接讀對方的 slice —— 依賴方向與紀律門禁一致。

### 2.2 行動配比要記帳

`RunState.actions: Record<TurnActionKind, number>`（「練了幾回合、辦事幾回合」）
由本模組在動作成立後累加。

這不是統計裝飾：**行動配比就是單動作回合制的核心度量**。平衡校準要問的
「事件佔比多少時輪迴點數最高」，沒有這個計數器就答不出來（見 31）。
以 `TurnActionKind` 為鍵而非兩個具名欄位 —— 日後多一種動作型別時這裡編不過，
不會靜靜漏記。

### 2.3 自動推進

「選完就跳下一回合」仍是**呈現層行為**：UI 觀察到動作已成立就送出 `turn.advance`。
核心只認一條規則（已行動 ⇒ 可推進）。

> 但呈現層因此多了一個責任：**動作的結果必須在推進前被讀出來並留在畫面上**。
> 少了這一步，玩家永遠看不到自己剛才練出什麼、檢定成不成 ——
> 灰盒的做法是把結果寫進一份由 App 持有的「回合紀錄」，
> 讓它跨得過章末立刻切換的戰役畫面（見 27）。

### 2.4 沒有「什麼都不做」

事件槽的 `skip` 已移除。一回合只能投一個動作，「不做事件」就等於改選鍛鍊 ——
再保留一個什麼都不做的動作，等於給玩家一個永遠不該按的按鈕。

`turn.advance` 在尚未行動時回 `turn.not-ready` 拒絕。

---

## 3. 推進流程

```
turn.advance
  ├ 檢查 canAdvance（已行動？）             → 否則 turn.not-ready
  ├ progress.turn += 1
  ├ 重算 chapter / turnInChapter / phase
  ├ 若跨入新章節 → emit chapter.entered
  ├ 若 turnInChapter > chapter.length      → emit campaign.due
  │     └ 交由 33 戰役處理（本模組不打仗）
  ├ 清空 slots（16／17 各自重新生成）
  └ emit turn.advanced
```

### 3.1 章末的戰役不由本模組執行

本模組只**宣告到期**（`campaign.due`）。配置、七關推進、走留決策、戰敗判定全在 33。
玩家收兵後 33 發 `chapter.passed`，本模組訂閱它並執行 `onPass`。

這個分工讓「回合怎麼走」與「仗怎麼打」可獨立實作與測試。

### 3.2 章節通過後的動作

```
chapter.passed
  ├ 若 onPass = chooseFaction → 進入陣營選擇狀態（22 陣營系統）
  ├ 若序列已走完             → emit sequence.completed（25 結局判定接手：圓夢）
  └ 否則                     → 進入下一章
```

`chapter.failed` 不由本模組處理——它直接導向中止類結局（25）。

---

## 4. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `chapterSequence.chapters` 的 `order` 從 1 起連續無缺口 | 否則章節推進會斷 |
| 每個 `ChapterId` 只出現在一條序列中 | 否則歸屬不明 |
| `length ≥ 1` | 否則章節長度為零 |
| `onPass = chooseFaction` 只出現在 `factionId = null` 的序列 | 陣營篇不該再選陣營 |
| 每條陣營序列至少一章 | 否則入陣營即圓夢 |

---

## 5. 不變量

1. `progress.turn` 單調遞增，永不回退
2. `progress.chapter` 與 `turnInChapter` 恆等於由 `turn` ＋ 章節表推導的值
3. `phase === 'nanhua' ⟺ faction === null`
4. 章末戰役在每章恰好觸發一次
5. `canAdvance` ⟺ 兩個槽中恰有一個已結算（互斥，見 §2）
6. `actions.training + actions.event` ＝ 已行動的回合數

---

## 6. 刻意不做

- 不做回合回溯
- 不做「跳過章節」
- 不在此模組執行檢定或結算
