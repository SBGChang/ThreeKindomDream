# 12 · 收集圖鑑（事件與結局）

> **職責**：記錄玩家見過的事件與達成的結局，並提供完成度指標。
>
> | | |
> |---|---|
> | **owns** | `MetaState.collection` |
> | **reads** | 05 事件匯流排 |
> | **handles** | 無 |
> | **emits** | `collection.entryAdded` |

---

## 1. 為什麼需要它

GDD 最早的設計就是「名士蒐集 **＋ 事件蒐集** ＋ 圖鑑強化」，但名士與寶物有自己的圖鑑模組，事件與結局沒有。

對 roguelite 而言，**「還有 37 個結局沒看過」這個數字往往比數值成長更能驅動下一輪**。少了它，元層只剩單向的數值變強，缺少橫向的探索目標。

---

## 2. Data Schema

本模組**不擁有 Definition**——它記錄的對象（事件、結局）由 17 與 25 擁有。它只需要知道「總共有幾個」以計算完成度，而那由 Registry 提供。

```ts
interface CollectionState {
  readonly seenEvents: Readonly<Record<EventDefId, EventSeenRecord>>;
  readonly reachedEndings: Readonly<Record<EndingId, EndingRecord>>;
}

interface EventSeenRecord {
  readonly firstSeenRunIndex: number;
  readonly timesSeen: number;
}

interface EndingRecord {
  readonly firstReachedRunIndex: number;
  readonly timesReached: number;
  readonly bestPoints: number;        // 該結局歷來最高結算點數
}
```

### 2.1 只記錄唯一性內容

**委託模板不進圖鑑。** 它們是可重複的模板 ＋ 隨機參數（見 17 §事件庫架構），記錄它們毫無意義且會讓完成度分母失真。

進圖鑑的是：

| 類型 | 進圖鑑 |
|---|---|
| 名士事件（4 階段鏈） | ✅ |
| 唯一性劇情事件 | ✅ |
| 大事件檢定的各難度分支 | ✅ |
| 結局 | ✅ |
| 居民委託（模板） | ❌ |
| 陣營委託（模板） | ❌ |

Definition 上以 `collectible: boolean` 標示，由 17／25 各自宣告。

---

## 3. 完成度指標

```ts
interface CollectionProgress {
  readonly events: { readonly seen: number; readonly total: number };
  readonly endings: { readonly reached: number; readonly total: number };
  readonly notables: { readonly maxed: number; readonly total: number };   // 讀 10
  readonly treasures: { readonly discovered: number; readonly total: number }; // 讀 11
  readonly overallPercent: number;
}
```

**分母來自已安裝 pack 的聯集**，不是全部可能內容。只裝 `core + pack:wei` 的玩家看到的 100% 就是魏線的 100%——否則完成度永遠達不到，反而變成負面回饋。

> 這條讓 §2.1 的「委託不進圖鑑」更重要：模板數量隨參數池變動，若進分母，完成度會因為策劃加了一個地名而倒退。

---

## 4. 不變量

1. `timesSeen ≥ 1` 對每個已記錄項目成立
2 `overallPercent` 由四個子項現算，不快取
3. 分母只計入已安裝 pack 宣告的 `collectible` 內容
4. 記錄只增不減；內容更新移除了某個事件時，舊記錄保留但不計入分母

---

## 5. 刻意不做

- 不記錄委託模板的參數組合
- 不做圖鑑的解鎖式獎勵（第一版；若要加，走 09 商店的 `requiresItems` 機制）
