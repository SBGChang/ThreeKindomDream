# 11 · 寶物圖鑑

> **職責**：寶物的永久強化軌道與攜帶資格。也是攜帶寶物效果的 `EffectSource`。
>
> | | |
> |---|---|
> | **owns** | `MetaState.treasureCodex` |
> | **reads** | 01 效果系統 |
> | **handles** | 無（碎片自動轉換） |
> | **emits** | `codex.treasure.enhanced` / `codex.treasure.discovered` |
> | **ownsDefinitions** | `treasure`、`treasurePool` |

---

## 1. Data Schema

```ts
interface TreasureDefinition extends DefinitionHeader {
  readonly kind: 'treasure';                  // 家族
  readonly treasureTier: 1 | 2 | 3 | 4 | 5;   // 變體（見 00 §8.1）
  readonly baseEffects: readonly EffectRef[];
  readonly enhanceLevels: readonly TreasureEnhanceLevel[];
}

interface TreasureEnhanceLevel {
  readonly level: number;                     // 1-based 連續
  readonly fragmentCost: number;
  readonly effects: readonly EffectRef[];     // 該級的【完整】效果集
}
```

### 1.1 強化是取代，不是疊加 ★

`enhanceLevels[n].effects` 是**該級的完整效果集**，取代前一級（含 `baseEffects`）。不用 `supersedes`。

理由是作者體感：寫「這一級長什麼樣」比寫「這一級比上一級多什麼、又蓋掉什麼」好懂太多，也不會出現「疊了三層互相矛盾的修正」這種難以推理的狀態。

> 與名士解鎖條的差異是刻意的：名士是**累積多條不同面向**的被動（所以需要 `supersedes` 處理少數取代），寶物是**同一件東西變強**（整體換掉最自然）。

### 1.2 掉落池

```ts
interface TreasurePoolDefinition extends DefinitionHeader {
  readonly kind: 'treasurePool';
  readonly entries: readonly { treasureId: TreasureId; weight: number }[];
}
```

規則驗證：`entries` 非空、`weight > 0`、總和 > 0。否則 `rng.weighted` 會 throw（04 §4.3）。

### 1.3 State

```ts
interface TreasureCodexEntry {
  readonly discovered: boolean;      // 是否曾在任一 Run 中取得過
  readonly enhanceLevel: number;     // 0 ＝ 未強化
  readonly fragments: number;        // 不足以升下一級的餘額
}
```

`discovered` 是**攜帶資格的唯一依據**：沒在夢裡拿過的寶物，帶不進夢裡。

---

## 2. 碎片機制：「重複」的定義 ★

> **重複 ＝ 本輪已持有再度獲得**，而非圖鑑已有。

判定發生在局內（24 寶物局內狀態），本模組只負責接收碎片。但這條定義推導出的兩個結果決定了本模組的資料設計：

| 寶物類型 | 碎片產出路徑 |
|---|---|
| **極稀有**（全遊戲僅一次獲得機會） | **必須自己攜帶進場**，否則永遠刷不到碎片 |
| **低階**（多路徑獲得） | 本輪內天然重複 → 碎片湧入 → 快速升滿 |

因此攜帶格同時是**戰力配置**與**碎片產線配置**，兩者互相排擠。

### 2.1 高階寶物的強化成本必須反映這個結構

`fragmentCost` 的設計要意識到：★5 寶物一輪最多產出極少量碎片（且必須佔一格攜帶）。若成本按線性外推，會出現「理論上要刷幾百輪」的死路。這是**平衡問題，不是架構問題**，但必須在 GDD 數值調校時一併處理。

---

## 3. 作為 EffectSource

```
1. 取 config.carriedTreasures（14 入夢配置）∪ RunTreasureState.acquired（24）
2. 讀 ctx.state.metaSnapshot.treasureCodex[id].enhanceLevel
3. enhanceLevel = 0 → 用 baseEffects
   enhanceLevel = n → 用 enhanceLevels[n-1].effects（完整取代）
4. 標上 sourceId = 'treasure:qinggang@lv2'
```

**局內獲得的寶物同樣生效**（GDD §9.3），因此第 1 步是兩個來源的聯集，不只是攜帶的那些。

同樣讀 `metaSnapshot` 而非活的 codex（ARCHITECTURE §2.11）。

---

## 4. 結算時的寫入（由 26 呼叫）

```ts
interface TreasureCodexWriter {
  markDiscovered(ids: readonly TreasureId[], meta: MetaState): MetaState;
  awardFragments(
    entries: readonly { treasureId: TreasureId; count: number }[],
    meta: MetaState,
  ): MetaState;
}
```

- `markDiscovered`：本輪首次取得的寶物解鎖攜帶資格
- `awardFragments`：本輪「重複獲得」累積的碎片，發放後自動轉換為 `enhanceLevel`

---

## 5. 不變量

1. `enhanceLevel ≤ enhanceLevels.length`
2. `fragments < enhanceLevels[enhanceLevel].fragmentCost`（否則應已自動轉換）
3. `enhanceLevel > 0 ⇒ discovered === true`（沒拿過的不可能強化過）
4. `enhanceLevel` 單調不減
5. 任一 `enhanceLevel` 的效果集**完全取代**較低級，不與之疊加

---

## 6. 刻意不做

- 不做寶物分解、轉換、交易
- 不做寶物的隨機詞綴（那會讓「同一件寶物」不再是同一筆 Definition）
- 不在此模組判定「重複」—— 那需要 `RunState`，屬 24 的職責
