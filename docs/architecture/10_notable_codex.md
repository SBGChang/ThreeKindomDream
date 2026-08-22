# 10 · 名士圖鑑

> **職責**：名士的永久養成軌道。碎片 → 初始好感度 → 跨門檻解鎖被動條。也是名士效果的 `EffectSource`。
>
> | | |
> |---|---|
> | **owns** | `MetaState.notableCodex` |
> | **reads** | 01 效果系統（作為 EffectSource 被它收集） |
> | **handles** | `codex.notable.invest`（若採手動投入；預設自動） |
> | **emits** | `codex.notable.affinityRaised` / `codex.notable.unlockGained` |
> | **ownsDefinitions** | `notable`、`affinityCurve` |

---

## 1. 單一軌道 ★

```
記憶碎片 ──▶ 初始好感度 ──┬──▶ 解鎖被動條（永久生效）
                          └──▶ 局內好感度起跑點（更快撞到事件閾值）
```

**一個數字幹兩件事。** 這是 GDD §6.5 的核心，也是本模組唯一的成長軸。

### 1.1 稀有度與培養度是兩回事

| 概念 | 欄位 | 性質 |
|---|---|---|
| **稀有度** | `NotableDefinition.rarity` | 固有、作者指定。決定解鎖條強度與碎片成本 |
| **培養度** | `NotableCodexEntry.startAffinity` | 玩家投入的成果。UI 上以星數呈現 |

**兒時玩伴的指定權查培養度，不查稀有度**（GDD §6.2）。因此低星名士也能靠養成取得指定權——這是「低星滿級 > 高星低級」設計原則（GDD §6.7）的一部分。

### 1.2 碎片自動轉換

碎片是**名士專屬**的（關羽的碎片只能用在關羽身上），囤積沒有任何策略價值。因此結算後**自動轉換**，`fragments` 只保留「不足以升下一點」的餘額。

> 不做手動投入介面，那會是純粹的無意義點擊。

---

## 2. Data Schema

### 2.1 名士定義

```ts
interface NotableDefinition extends DefinitionHeader {
  readonly kind: 'notable';                    // 家族（不裝變體，見 00 §8.1）
  readonly rarity: 1 | 2 | 3 | 4 | 5;
  readonly factionId: FactionId;               // 決定可否作為該陣營上司
  readonly base: NotableBaseDef;               // 見 §2.3，第一回合就生效
  readonly unlocks: readonly UnlockRow[];      // 見 §2.2
  readonly eventChain: readonly NotableEventStage[];
}

interface NotableEventStage {
  readonly stage: AffinityStage;      // 觸發階段
  readonly eventDefId: EventDefId;    // 由 17 事件槽抽取的事件
}

type AffinityStage = 'stranger' | 'acquainted' | 'friendly' | 'close' | 'sworn';
```

> **`role` 已移除。** 它原本是「UI 分類，不參與任何計算」的作者標籤 ——
> 但沒有任何程式讀它，連 UI 也沒有，所以它是假裝成資料的註解。
> 角色的定位現在由 `base.specialty` 與 `base` 的數值承擔，那些是**會生效**的宣告。
> 若日後 UI 真的需要分類，從 `base.specialty` ＋ `unlocks` 的 `funcType` 分佈就能推出來。

### 2.2 基底（第一回合就生效）★

```ts
interface NotableBaseDef {
  readonly specialty: Attr;          // 專長維
  readonly trainingBonus: number;    // 站任何一格都有
  readonly specialtyBonus: number;   // 專長對位時追加
  readonly specialtyWeight: number;  // 專長格的站位權重（≥ 1）
  readonly sortieBonus: number;      // 大檢定出戰的基底加值
}
```

**`rarity` 的承諾兌現在這裡。** 它原本只影響碎片成本與作者給的解鎖條強度 ——
兩者都在**投資之後**才看得到。基底讓 ★5 從第一次站上格子就明顯強於 ★1，
稀有度因此成為玩家當場讀得懂的東西，而不是要養才知道。

數值以稀有度為基準（`content-source/core/config/notable-base.ts`），
逐人可微調以寫出性格，但**偏離基準必須寫理由** ——
否則基準表會被逐人微調淹沒，稀有度不再是可預期的承諾。

機制細節與加成算式見 [19 §5.1](19_notable_runtime.md)。

### 2.3 解鎖條

```ts
interface UnlockRow {
  readonly affinity: number;                 // 門檻
  readonly funcType: FuncType;
  readonly referId: EffectId;
  readonly supersedes?: readonly number[];   // 同名士內被取代的門檻
}
```

規則驗證（由 02 執行）：

| 規則 | 理由 |
|---|---|
| `affinity` 嚴格遞增、不重複 | 否則解鎖刻度語意不明 |
| `supersedes` 引用的門檻必須存在於同一 `unlocks` | 否則過濾失效 |
| `supersedes` 只能引用**較低**的門檻 | 否則出現循環取代 |
| `affinity` ≤ `affinityCurve.maxStartAffinity` | 否則該條永遠解不開 |

### 2.4 成長曲線（core，依稀有度）

```ts
interface AffinityCurveDefinition extends DefinitionHeader {
  readonly kind: 'affinityCurve';
  readonly maxStartAffinity: number;                              // 例 60
  readonly costPerPoint: Readonly<Record<1|2|3|4|5, readonly number[]>>;
  readonly designationThreshold: number;                          // 兒時玩伴指定權門檻，例 30
  readonly fragmentsByStage: Readonly<Record<AffinityStage, number>>;
  readonly fullDreamMultiplier: number;                           // 圓夢時碎片倍率，例 2
}
```

`costPerPoint[rarity][n]` ＝ 從 `startAffinity = n` 升到 `n+1` 所需碎片。
陣列長度必須 ≥ `maxStartAffinity`，否則載入失敗。

### 2.5 State

```ts
interface NotableCodexEntry {
  readonly startAffinity: number;   // 0 .. maxStartAffinity
  readonly fragments: number;       // 不足以升下一點的餘額
}
```

**不存「已解鎖哪些條」** ——那由 `startAffinity` ＋ Definition 現算。否則加一條解鎖就要 migration。

---

## 3. 作為 EffectSource

```ts
// 實作 01 §6 的 EffectSource
collect(ctx: RunContext): readonly ResolvedEffectRef[]
```

流程：

```
1. 取本輪陣容（19 RosterState）中的每位名士
2. 讀 ctx.state.metaSnapshot.notableCodex[id].startAffinity
3. 篩出 affinity ≤ startAffinity 的 unlocks
4. 套用 supersedes 過濾 ← 在這裡做，不進效果管線（01 §6）
5. 標上 sourceId = 'notable:guanyu@60'
```

### 3.1 讀 `metaSnapshot`，不讀活的 MetaState ★

第 2 步刻意寫 `ctx.state.metaSnapshot`。這是 ARCHITECTURE §2.11 三條方向規則的具體落點——本模組在**局內身分**是 EffectSource（只讀快照），在**元層身分**才寫活的 codex。兩個身分不得混用。

### 3.2 局內好感度不在這裡

`startAffinity` 只是**起跑點**。局內實際好感度由 19 名士局內狀態持有，解鎖條的判定用的是 `startAffinity`（永久解鎖），不是局內當下值。

> **這點容易搞混**：局內把某位名士的好感度養到 80，不會臨時解鎖他 60 級的被動條——那條要靠碎片投入永久提升 `startAffinity` 才會開。局內好感度影響的是**連動加成倍率**與**事件鏈階段**。

---

## 4. 結算時的寫入（由 26 呼叫）

```ts
interface NotableCodexWriter {
  awardFragments(
    entries: readonly { notableId: NotableId; finalStage: AffinityStage }[],
    isFullDream: boolean,
    meta: MetaState,
  ): MetaState;
}
```

- 依 `fragmentsByStage[finalStage]` 發放，圓夢時乘 `fullDreamMultiplier`
- 發放後立即依 `costPerPoint` 自動轉換為 `startAffinity`，餘額留在 `fragments`
- 只有結算模組（26）可呼叫（Composition 註冊限制）

---

## 5. 不變量

1. `startAffinity` 單調不減，永不下降
2. `startAffinity ≤ affinityCurve.maxStartAffinity`
3. `fragments < costPerPoint[rarity][startAffinity]`（否則應已自動轉換）
4. 由 `startAffinity` 重算的已解鎖條集合，與 `collect()` 實際產出的（在 supersedes 過濾前）完全一致
5. 兒時玩伴指定權 ⟺ `startAffinity ≥ designationThreshold`

---

## 6. 刻意不做

- 不做碎片的手動投入（見 §1.2）
- 不做跨名士的碎片轉換（那會消滅「養誰」的選擇）
- 不做名士的降級或洗點
- **不在此模組決定本輪陣容** —— 那是 19 名士局內狀態的職責
