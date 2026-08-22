# 13 · 成就與統計

> **職責**：跨 Run 的累計統計與成就判定。純訂閱者，不影響任何遊戲規則。
>
> | | |
> |---|---|
> | **owns** | `MetaState.stats` |
> | **reads** | 05 事件匯流排（只訂閱） |
> | **handles** | 無 |
> | **emits** | `achievement.unlocked` |
> | **ownsDefinitions** | `achievement` |

---

## 1. 定位：純週邊

本模組**不得被任何核心模組依賴**。它只訂閱事件、累加數字、判定條件。整個模組移除後遊戲必須照常運作——這是驗證方向規則（05 §1）是否成立的最好測試。

---

## 2. Data Schema

```ts
interface AchievementDefinition extends DefinitionHeader {
  readonly kind: 'achievement';
  readonly condition: AchievementCondition;
  readonly hidden: boolean;              // 達成前是否隱藏描述
  readonly requiresPack: PackId | null;
}

type AchievementCondition =
  | { readonly kind: 'statGte';     readonly stat: StatKey; readonly value: number }
  | { readonly kind: 'endingReached'; readonly endingId: EndingId }
  | { readonly kind: 'allEndingsOfFaction'; readonly factionId: FactionId }
  | { readonly kind: 'notableMaxed'; readonly notableId: NotableId }
  | { readonly kind: 'and';         readonly all: readonly AchievementCondition[] };
```

```ts
interface LifetimeStats {
  readonly runsStarted: number;
  readonly runsFullDream: number;
  readonly chaptersPassed: number;
  readonly majorChecksFailed: Readonly<Record<Difficulty, number>>;
  readonly turnsPlayed: number;
  readonly glowResults: Readonly<Record<GlowTier, number>>;
  readonly actionsTraining: number;   // 回合花在鍛鍊的次數（15 §2.2）
  readonly actionsEvent: number;      // 回合花在事件的次數
  readonly highestCareer: Readonly<Record<CareerLine, number>>;
  readonly pointsEarnedTotal: number;
  readonly pointsSpentTotal: number;
}

type StatKey = keyof LifetimeStats | `glowResults.${GlowTier}` | `highestCareer.${CareerLine}`;
```

### 2.1 統計欄位的挑選原則

只記錄**能回答平衡問題**的數字。`glowResults` 分佈可以驗證光階機率是否符合設計；`majorChecksFailed` 按難度分組可以看出玩家實際上敢賭到什麼程度；`actionsTraining` ／ `actionsEvent` 的比值可以驗證「上課 vs 工作」是否真的形成抉擇 —— 若某一邊永遠是 0，那一半的系統就沒有發揮作用（15 §2.2）。

不記錄「看起來很酷但沒人會問」的數字。

---

## 3. 與點數帳本的交叉驗算

`pointsEarnedTotal − pointsSpentTotal` 必須等於 `MetaState.points`（08 §4 不變量 2）。

**這是一條免費的正確性檢查**：兩個模組各自獨立累加，對不上就代表其中一邊漏記或重複記。建議在載入存檔時做一次斷言，開發模式下失敗即 throw。

---

## 4. 不變量

1. 所有統計欄位單調不減
2. 核心模組的依賴圖中不存在指向本模組的邊
3. `pointsEarnedTotal − pointsSpentTotal === MetaState.points`
4. 移除本模組後，遊戲的任何隨機結果與狀態轉移完全不變

---

## 5. 刻意不做

- 不做 Steam 成就對接（那是 `platform/steam/`，訂閱 `achievement.unlocked`）
- 不做排行榜或線上統計
- 不讓成就給予任何遊戲內獎勵（否則它就不再是純週邊）
