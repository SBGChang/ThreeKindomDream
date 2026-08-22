# 26 · 結算產出

> **職責**：RunState → MetaState 的**唯一交接點**。計算輪迴點數、發放碎片、登錄圖鑑。
>
> | | |
> |---|---|
> | **owns** | 無自己的 slice |
> | **reads** | 全部局內模組（唯讀）＋ 全部元層模組（可寫） |
> | **handles** | `run.settle` |
> | **emits** | `run.settled` |

---

## 1. 唯一交接點 ★

這是整個架構裡**唯一**可以同時持有 `RunState` 與**活的** `MetaState` 的模組（ARCHITECTURE §2.11、00 §6.1）。

```
局內模組：只讀 RunState.metaSnapshot，永不寫 MetaState
     ↓
26 結算：讀 RunState（含真實產出）→ 寫活的 MetaState
     ↓
RunState 銷毀
```

**為什麼要收斂到一點**：若允許多處寫 MetaState，就沒有單一地方可以斷言「這一輪的產出總和」，也無法保證「夢裡的行為不會即時改變夢外的狀態」——而後者正是可重播的前提。

由 Composition 註冊限制：`PointsLedger.grant`、`NotableCodexWriter.*`、`TreasureCodexWriter.*` 只接受本模組的呼叫。

---

## 2. 結算流程

```
run.settle（由 ending.reached 觸發）
  ├ 1. 蒐集產出摘要（各局內模組提供唯讀 summary）
  ├ 2. 計算輪迴點數 → 08 PointsLedger.grant
  ├ 3. 名士碎片 → 10 NotableCodexWriter.awardFragments（含自動轉換）
  ├ 4. 寶物：markDiscovered ＋ awardFragments → 11
  ├ 5. 圖鑑登錄（事件、結局）→ 12
  ├ 6. 統計累加 → 13（經事件訂閱，非直接呼叫）
  ├ 7. 寫存檔（meta 更新、run 設為 null）→ 07
  └ emit run.settled
```

**順序固定**。特別是第 7 步必須在最後：存檔失敗時前六步的 MetaState 變更必須一併回退（見 §5）。

---

## 3. 產出摘要介面

各局內模組提供唯讀摘要，本模組不直接讀它們的 slice 內部結構：

```ts
interface RunSummary {
  readonly endingId: EndingId;
  readonly endingKind: 'fullDream' | 'aborted';
  readonly pointsMultiplier: number;
  readonly career: { readonly civil: number; readonly martial: number };
  readonly chaptersPassed: number;
  readonly factionId: FactionId | null;
  readonly notables: readonly { readonly notableId: NotableId; readonly finalStage: AffinityStage }[];
  readonly treasures: TreasureRunSummary;                  // 見 24 §5
  readonly seenUniqueEvents: readonly EventDefId[];
  readonly learnedSkills: readonly SkillId[];
}
```

> **不傳整個 `RunState`。** 摘要介面讓「結算需要什麼」變成明確契約——加一個結算輸入就要改摘要型別，而那會強制檢視所有提供者。

---

## 4. 點數公式

```
points = (career.civil + career.martial) × perCareerRank
       + chaptersPassed × perChapterPassed
       + (endingKind === 'fullDream' ? fullDreamBonus : 0)
       ⟹ × pointsMultiplier
```

係數全部來自 `core/meta/settlement.ts`（08 §2）。

### 4.1 功績與名聲不直接計入 ★

它們是**門檻貨幣**（GDD §7.1）。功績的價值在於「它讓你升到哪一階」，已透過 `career` 間接反映；名聲的價值體現在整個 Run 中挑到了多好的事件菜單。

把它們加進公式會出現兩種計價，也會誘使玩家去刷不影響進度的功績。

> ⚠️ **待定平衡**：`career.civil + career.martial` 是相加（鼓勵均衡）。改成取高值（鼓勵偏科）屬**架構變更**，需同步更新本檔、08 §2 與 21 §2 的門檻曲線設計。

### 4.2 碎片產出

```
notable 碎片 = fragmentsByStage[finalStage]
             × (endingKind === 'fullDream' ? fullDreamMultiplier : 1)
treasure 碎片 = TreasureRunSummary.fragments（本輪重複次數，見 24 §1）
```

---

## 5. 原子性

結算是**一筆交易**。任一步失敗（例如存檔寫入失敗）必須整筆回退，不得留下「點數加了但碎片沒加」的狀態。

```ts
interface Settlement {
  settle(summary: RunSummary, meta: MetaState): CommandOutcome<MetaState>;
}
```

回傳新的 `MetaState` 而非原地修改——讓回退等於「丟掉回傳值」，不需要反向操作。

### 5.1 冪等

同一個 `RunSummary` 重複 settle **不得重複發放**。以 `RunState.seed`（單局唯一）作為結算識別，已結算過即回冪等 no-op。

這是合法的冪等 no-op（ARCHITECTURE §2.2）：問「如果資料齊全，這裡還會 no-op 嗎？」——會，因為這一輪本來就只該結算一次。**必須有測試釘住。**

---

## 6. 不變量

1. 本模組是唯一同時持有 RunState 與活的 MetaState 的地方（門禁 ＋ Composition）
2. `settle` 成功後 `MetaState.points` 恰好增加公式計算值
3. `settle` 失敗後 `MetaState` 位元不變
4. 同一 `seed` 重複 settle 不改變 `MetaState`
5. `LifetimeStats.pointsEarnedTotal` 的增量等於本次 grant 的數額（供 13 §3 交叉驗算）
6. 結算完成後 `SaveFile.run === null`

---

## 7. 刻意不做

- 不做結算結果的玩家選擇（沒有「要碎片還是要點數」這種取捨）
- 不做結算的重跑或補領
- 不在此模組決定結局（那是 25）
- 不做跨 Run 的產出補償機制
