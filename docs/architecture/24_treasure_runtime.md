# 24 · 寶物局內狀態

> **職責**：持有本輪寶物、判定「重複」、累積碎片產出。也是寶物效果的 `EffectSource`。
>
> | | |
> |---|---|
> | **owns** | `RunState.treasures` |
> | **reads** | 11 寶物圖鑑（讀 `metaSnapshot`）、01 效果系統 |
> | **handles** | `treasure.acquire`（內部，來自 17／18 的獎勵） |
> | **emits** | `treasure.acquired` / `treasure.duplicated` |

---

## 1. 「重複」的定義 ★

> **重複 ＝ 本輪已持有再度獲得**，而非圖鑑已有。

這是整套寶物設計的樞紐（GDD §9.4）。推導出的兩個結果：

| 寶物類型 | 碎片產出路徑 |
|---|---|
| **極稀有**（全遊戲僅一次獲得機會） | 不帶進場就**永遠刷不到碎片** |
| **低階**（多路徑獲得） | 本輪內天然重複 → 碎片湧入 → 快速升滿 |

因此**攜帶格同時是「戰力配置」與「碎片產線配置」**，兩者互相排擠。「用一格養一個稀有寶物」成為明確的策略決定。

### 1.1 為什麼不能用「圖鑑已有」當判定

若「圖鑑已有再獲得」就算重複，那第二輪起所有寶物都在刷碎片，攜帶格的機會成本消失，整個張力歸零。

**這個定義差異在程式上只是一行條件判斷，在設計上是兩個完全不同的遊戲。** 必須有測試釘住。

---

## 2. State

```ts
interface RunTreasureState {
  readonly held: readonly TreasureId[];                 // 本輪持有（攜帶 ＋ 局內獲得）
  readonly fragmentsEarned: Readonly<Record<TreasureId, number>>;
}
```

`held` 在入夢時初始化為 `config.carriedTreasures`——**攜帶 ＝ 起手就有**，不代表本輪只能有這些（GDD §9.3）。

---

## 3. 獲得流程

```
treasure.acquire(id)
  ├ id ∈ held?
  │    ├ 是 → fragmentsEarned[id] += 1
  │    │      emit treasure.duplicated
  │    └ 否 → held.push(id)
  │           emit treasure.acquired
  └ 兩種情況都要讓 UI 明確呈現拿到了什麼
```

### 3.1 攜帶中的寶物必須保證產出碎片

若某寶物的唯一獲得機會綁在特定路線上，玩家帶了它卻走錯路線 → 一格白花、零碎片。**若攜帶格的投資風險太高，玩家會學會不帶，整個機制就死了。**

由於陣營與路線是玩家自選的（GDD 定案），這個風險由玩家自行控管，因此**架構不額外補償**。但這條必須由 31 平衡模擬器驗證：若模擬顯示某 ★5 寶物的碎片期望值接近 0，那是內容問題（獲得條件太窄），需回頭調資料。

### 3.2 二選一事件必須顯示碎片價值

若事件是「A 或 B 二選一」而玩家已持有 A，理性上會選 B（拿新的），A 的碎片就蒸發了。

因此 17 事件槽向本模組查詢持有狀態，把選項標籤顯示為 **「〈青釭劍〉（碎片 ×1）」**（GDD §9.5）。

```ts
interface TreasureRuntimeQuery {
  isHeld(id: TreasureId, ctx: RunContext): boolean;
  displayFor(id: TreasureId, ctx: RunContext): TreasureDisplay;
}

interface TreasureDisplay {
  readonly treasureId: TreasureId;
  readonly willBeDuplicate: boolean;
  readonly fragmentCount: number;      // willBeDuplicate 為 true 時 > 0
}
```

**顯示資訊在本模組算，UI 只呈現。** 這讓「玩家看不看得到自己放棄了什麼」成為一條可測試的規則，而不是 UI 的自由心證。

---

## 4. 作為 EffectSource

```
1. 取 held（攜帶 ∪ 局內獲得）
2. 讀 metaSnapshot.treasureCodex[id].enhanceLevel
3. level = 0 → baseEffects；level = n → enhanceLevels[n-1].effects（完整取代）
4. 標上 sourceId = 'treasure:qinggang@lv2'
```

**局內獲得的寶物立即生效**（GDD §9.3），不需等到下一輪。

讀 `metaSnapshot` 而非活的 codex（ARCHITECTURE §2.11）——因此局內獲得的寶物用的是**入夢當下的強化等級**，不會因為結算後升級而回溯生效。

---

## 5. 結算交接（由 26 呼叫）

```ts
interface TreasureRunSummary {
  readonly newlyDiscovered: readonly TreasureId[];   // held 中 metaSnapshot 未 discovered 者
  readonly fragments: Readonly<Record<TreasureId, number>>;
}
```

- `newlyDiscovered` → 11 的 `markDiscovered`（解鎖攜帶資格）
- `fragments` → 11 的 `awardFragments`

---

## 6. 不變量

1. `held` 無重複
2. `held ⊇ config.carriedTreasures` 恆成立（攜帶的不會消失）
3. `fragmentsEarned[id] > 0 ⇒ id ∈ held`（沒持有過不可能刷到碎片）
4. **首次獲得不產生碎片**；第 N 次獲得產生 N−1 個碎片
5. `held` 只增不減（本輪內不會失去寶物）
6. `isHeld` 的結果與 `displayFor().willBeDuplicate` 恆一致

> 第 4 條就是「重複」定義的正式表述。**必須有測試釘住**，而且測試要涵蓋「攜帶進場後再獲得 ⇒ 產生碎片」與「未攜帶且僅獲得一次 ⇒ 不產生碎片」兩個方向。

---

## 7. 刻意不做

- 不做局內丟棄或替換寶物
- 不做寶物的局內強化（強化是元層行為，屬 11）
- 不做寶物的持有上限（攜帶格只限制起手，不限制局內獲得）
