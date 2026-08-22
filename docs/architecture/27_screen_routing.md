# 27 · 畫面路由

> **職責**：定義畫面之間的合法轉移，以及 UI 與核心的邊界。
>
> | | |
> |---|---|
> | **owns** | 畫面狀態機（呈現層，不進存檔） |
> | **reads** | app/read-models |
> | **handles** | 無核心 Command |
> | **emits** | 無 DomainEvent |

---

## 1. 動線

```
       ┌──────────────┐
       │   主選單     │
       └──┬────────┬──┘
          │        │ 有進行中的夢
          ▼        ▼
   ┌──────────┐  （直接回到局內）
   │ 天命商店 │
   └────┬─────┘
        ▼
   ┌──────────┐
   │ 入夢配置 │──── 資質／天賦／寶物／玩伴
   └────┬─────┘
        ▼ config.confirm
   ┌────────────────────────────┐
   │  局內：南華村篇（16 回合） │◄──┐
   └────┬───────────────────────┘   │ 回合推進
        ▼ 章末                       │
   ┌──────────┐                      │
   │ 大檢定   │──── 三難度選擇 ──────┘
   └────┬─────┘
        │ 虎牢關通過
        ▼
   ┌──────────┐
   │ 選陣營   │
   └────┬─────┘
        ▼ 入朝（分配上司）
   ┌────────────────────────────┐
   │  局內：陣營篇（8×N 回合）  │
   └────┬───────────────────────┘
        ▼ 達成結局
   ┌──────────┐
   │ 結局演出 │
   └────┬─────┘
        ▼
   ┌──────────┐
   │ 結算畫面 │──── 點數／碎片／圖鑑登錄
   └────┬─────┘
        ▼
     回主選單
```

**圖鑑**（名士／寶物／事件／結局）可從主選單與商店隨時進入，不在主動線上。

---

## 2. UI 禁則

| 禁止 | 原因 |
|---|---|
| 直接修改 `RunState` / `MetaState` | 所有變更必須經 Command 與交易 |
| 重算任何遊戲規則 | 規則只有一份，在核心 |
| 引用核心 Envelope、State、Handler、Resolver | 依賴圖門禁會擋下 |
| 傳遞核心 ID | 見 §3 |
| 在 View 裡判斷門檻是否滿足 | 由 read-model 提供 `enabled` / `blockedBy` |

### 2.1 UI 只收 ViewModel、只送 Request

```ts
// UI 收到的
interface TrainingSlotVM {
  readonly slots: readonly {
    readonly labelKey: L10nKey;
    readonly subtitleKey: L10nKey;
    readonly glow: GlowTier;
    readonly notables: readonly { readonly nameKey: L10nKey; readonly stage: AffinityStage }[];
  }[];
  readonly selectedIndex: number | null;
  readonly canAdvance: boolean;
}

// UI 送出的
type GameCommandRequest =
  | { readonly kind: 'training.select';     readonly slotIndex: 0 | 1 | 2 | 3 }
  | { readonly kind: 'event.select';        readonly offerIndex: number; readonly optionIndex: number }
  | { readonly kind: 'turn.advance' }
  | { readonly kind: 'majorCheck.attempt';  readonly difficulty: Difficulty;
      readonly sortieIndices: readonly number[] };
```

**以序號指定，不以 ID 指定**（00 §9.2）。ID 的解析由 app 層完成，因此 UI 在型別上就無法構造非法指令。

`sortieIndices` 也是索引（指向 roster 陣列），不是 `NotableId`。

---

## 3. 成功率必須在畫面上

大檢定的難度選擇畫面**必須同時顯示三檔的成功率**（18 §3.2）。

這不是 UI 偏好，是機制要求：GDD 的設計意圖是「走到中止類結局是玩家自己貪心的結果」，若成功率不可見，難度自選就退化為盲賭。因此它列在本模組的**不變量**，不是設計建議。

---

## 4. 單動作選單同畫面

鍛鍊四格與事件**在同一畫面同時呈現**（GDD §4.2）—— 但它們是**同一個動作槽的兩邊**，
玩家從中擇一，點下即結算並自動推進到下一回合（15 §2）。

因此不需要分頁或序列動畫，但呈現層多了一個責任：

### 4.1 回合紀錄由 App 持有

「選完就跳」讓動作結果沒有畫面可以停留。若把結果留在回合畫面的區域性狀態裡，
**章末那一次行動會立刻切到大檢定畫面，玩家永遠看不到它**。

因此結果摘要寫進一份由 App 持有的回合紀錄（rolling log），跨得過畫面切換。
它是純呈現狀態，不進 `RunState` —— 核心不需要知道玩家看過什麼。

### 4.2 兩邊的數值必須同單位並排

事件選項要顯示 `practicePreview`（17 §5.1），鍛鍊格要顯示 `expectedGain`。
少了任一邊，玩家就無法做這個回合唯一的決定。

自動推進（兩槽都選完）是**本模組的行為**，核心只認「鍛鍊已選 ⇒ 可推進」一條規則（15 §2.1）。

---

## 5. 不變量

1. UI 的依賴圖中不存在指向 `modules/*` 或 `kernel/*` 的邊
2. 大檢定畫面顯示三檔成功率
3. 任何 `GameCommandRequest` 的 payload 都不含核心 ID 型別
4. 畫面狀態不進存檔（重啟後由 RunState 推導當前該在哪個畫面）

---

## 6. 刻意不做

- 不做畫面狀態的持久化
- 不做自由的畫面跳轉（動線是狀態機，不是導覽列）
