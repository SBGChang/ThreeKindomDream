# 05 · 事件匯流排

> **職責**：把已提交的 `DomainEvent` 送給訂閱者，讓 UI、音效、成就、統計、效果 Reactor 不必被核心認識。
>
> | | |
> |---|---|
> | **owns** | 訂閱表（非 State） |
> | **reads** | 無 |
> | **handles** | 無 |
> | **emits** | 轉發，不自產 |

---

## 1. 方向規則 ★

> **核心模組只發事件，不訂閱週邊。訂閱方向永遠是「週邊 → 核心」。**

| 允許 | 禁止 |
|---|---|
| UI 訂閱 `glow.resolved` 播動畫 | 鍛鍊槽訂閱 UI 的任何東西 |
| 成就模組訂閱 `chapter.passed` | 章節模組 import 成就模組 |
| 效果 Reactor 訂閱 `glow.resolved` 掉碎片 | 效果系統反向呼叫觸發者 |

違反這條會讓依賴圖成環，門禁會擋下（ARCHITECTURE §2.6）。

---

## 2. Outbox 語意

事件在**交易 commit 之後**才發出（00 §10）。禁止在交易中途發事件——否則訂閱者會看到未提交的狀態，而那個狀態可能因後續拒絕而回退。

```
Command → Transaction → 各 slice 寫入 → commit
                                          ↓
                                       Outbox flush → 訂閱者
```

### 2.1 訂閱者不得回頭改狀態

訂閱者若需要改變世界，必須送出 `InternalCommand` 走新的一筆交易，**不得直接寫 slice**。這保證每次狀態變更都有明確的交易邊界，也讓事件鏈可追蹤。

**效果 Reactor 也遵守這條**：`react()` 回傳 `InternalCommand[]`，不直接施加效果（01 §3）。

---

## 3. 事件命名慣例

`<領域>.<已發生的事>`，一律用**過去式或完成態**——事件是結果，不是請求。

| 好 | 壞 |
|---|---|
| `glow.resolved` | `glow.resolve` |
| `affinity.changed` | `affinity.change` |
| `chapter.passed` | `chapter.check` |
| `treasure.acquired` | `treasure.give` |

### 3.1 首批事件清單

| Event | 發出者 | 主要訂閱者 |
|---|---|---|
| `training.selected` | 16 | UI、統計 |
| `glow.resolved` | 16 | UI、效果 Reactor（FragmentDrop）、統計 |
| `attribute.gained` | 20 | UI |
| `affinity.changed` | 19 | UI、19 自身（階段閾值檢查） |
| `notable.eventUnlocked` | 19 | 17 事件槽（進入可抽池） |
| `event.slotRefreshed` | 17 | UI |
| `event.completed` | 17 | UI、效果 Reactor、統計、12 收集圖鑑 |
| `currency.gained` | 20 | UI |
| `career.promoted` | 21 | UI、音效 |
| `turn.advanced` | 15 | UI、全體 |
| `chapter.passed` / `chapter.failed` | 18 | UI、15、25、13 成就 |
| `faction.joined` | 22 | UI、19（上司分配）、17（事件池切換） |
| `treasure.acquired` / `treasure.duplicated` | 24 | UI、統計 |
| `skill.learned` | 23 | UI |
| `ending.reached` | 25 | UI、26 結算、12 收集圖鑑 |
| `run.settled` | 26 | UI、10／11 圖鑑、8 點數 |

---

## 4. 不變量

1. 訂閱者的執行不影響事件本身的內容（事件是不可變的）
2. 一次 flush 內，事件按產生順序送達
3. 訂閱者拋出例外**不得吞掉**——它代表程式錯誤，必須讓開發者看到；但不得讓已提交的狀態回退
4. 依賴圖中不存在「核心 → 訂閱者」的邊

---

## 5. 刻意不做

- 不做事件持久化（除了明確寫入歷史紀錄的少數事件）
- 不做跨 Run 的事件重播
- 不支援訂閱者修改或攔截事件
