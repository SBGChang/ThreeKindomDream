# 03 · RunState（局內單一真相來源）

> **職責**：持有本局全部可變狀態、界定 slice 所有權、提供交易邊界與唯讀 Context。
>
> | | |
> |---|---|
> | **owns** | `RunState` 容器本身（各 slice 由對應模組獨占寫入） |
> | **reads** | 無 |
> | **handles** | 無 GameCommand（它是狀態容器，不是玩法模組） |
> | **emits** | 無 |

---

## 1. Slice 所有權表 ★

**每個 slice 只有一個模組可寫。** 這張表由 Composition 在啟動時對照 `ModuleContract.owns` 驗證；宣告與實際不符即拒絕啟動。

| Slice | 型別 | 獨占寫入者 |
|---|---|---|
| `seed` / `rngCursors` | `Seed` / `RngCursors` | 04 RNG 服務 |
| `metaSnapshot` | `MetaState` | **無人可寫**（入夢時一次性凍結） |
| `config` | `DreamEntryConfig` | **無人可寫**（入夢時一次性凍結） |
| `progress` | `TurnProgress` | 15 章節回合推進 |
| `faction` | `FactionId \| null` | 22 陣營系統 |
| `attributes` | `AttributeState` | 20 屬性與貨幣 |
| `currencies` | `CurrencyState` | 20 屬性與貨幣 |
| `career` | `CareerState` | 21 官階系統 |
| `roster` | `RosterState` | 19 名士局內狀態 |
| `treasures` | `RunTreasureState` | 24 寶物局內狀態 |
| `abilities` | `AbilityState` | 23 特質與技能 |
| `growth` | `GrowthState` | 32 養成兌現（四類經驗池 ＋ 本輪解鎖清單） |
| `campaign` | `CampaignState \| null` | 33 戰役（軍勢、糧秣、關卡進度、已保住的獎勵） |
| `slots` | `SlotState` | 16 鍛鍊槽 ＋ 17 事件槽（各寫自己那半；二者互斥，見 15 §2） |
| `actions` | `ActionTally` | 15 章節回合（本輪練了幾回合、辦事幾回合） |
| `ending` | `EndingOutcome \| null` | 25 結局判定 |

> `attributes` 的獨占寫入者是 **32 養成兌現**，不是 20 —— 16 鍛鍊槽產出的是經驗，
> 屬性要花經驗買。

### 1.1 `metaSnapshot` 與 `config` 是不可變的

兩者在入夢時寫入一次，之後**任何模組都不得修改**。門禁層面靠型別（`readonly`）＋ 依賴圖檢查；語意層面由本表的「無人可寫」宣告。

`slots` 是唯一由兩個模組分寫的 slice，因此它的型別必須把兩半分開，不共用可寫欄位：

```ts
interface SlotState {
  readonly training: TrainingSlotState;   // 16 獨占
  readonly event: EventSlotState;         // 17 獨占
}
```

---

## 2. Context：唯讀查詢 vs 需要隨機 ★

效果系統的 `resolve()` 必須是純函式（01 §8.1）。若 Context 一律帶 RNG，那個不變量在型別上就守不住。因此**分成兩層**：

```ts
// 唯讀查詢。給效果結算、條件判定、Query、ViewModel 使用
interface RunContext {
  readonly state: RunState;
  readonly defs: DefinitionReader;
}

// 需要隨機的地方才拿得到。給槽位生成、事件抽取、檢定骰使用
interface TurnContext extends RunContext {
  readonly rng: DeterministicRng;
}
```

> **由建構決定，不靠自律**：拿到 `RunContext` 的程式在型別上就摸不到 RNG，因此「效果結算不得引入隨機」不需要人工審查。

哪些模組拿哪一種：

| Context | 使用者 |
|---|---|
| `RunContext` | 01 效果系統、20 屬性貨幣、21 官階、25 結局判定、read-models |
| `TurnContext` | 16 鍛鍊槽、17 事件槽、18 檢定引擎、19 名士陣容組建、24 寶物掉落 |

---

## 3. 生命週期

```
入夢（14 入夢配置完成）
  → 凍結 metaSnapshot 與 config
  → 初始化 seed 與全部 rngCursors 為 0
  → progress = { turn: 1, chapter: 1, phase: 'nanhua' }
  → faction = null
  → 其餘 slice 由各自模組初始化
        ↓
每回合（15 推進）
        ↓
達成結局（25 寫入 ending）
        ↓
結算（26）→ 讀 RunState、寫活的 MetaState
        ↓
銷毀 RunState
```

**RunState 在結算完成前不得銷毀**；結算是唯一同時持有 RunState 與活的 MetaState 的地方（00 §6.1）。

---

## 4. 交易邊界

一個 GameCommand 的全部狀態變更是原子的（00 §10）。RunState 提供：

```ts
interface RunStateStore {
  current(): RunState;
  begin(cmd: GameCommand): Transaction;
}
```

- 交易期間的中間狀態**不對外可見**
- 事件在 commit 後才從 outbox 發出
- 任一 slice 的寫入被拒 → 整筆回退

---

## 5. 序列化

```ts
interface RunStateCodec {
  serialize(s: RunState): string;                       // 決定性：key 排序
  deserialize(raw: string, v: number): RunState | Rejection;
}
```

- 全部 slice 必須可 JSON 序列化。**禁止在 State 中放函式、Map、Set、class 實例**
- `schemaVersion` 不符時走 Migration；無路徑則回 `content.version-mismatch` 拒絕（00 §9.1）
- `metaSnapshot` 完整序列化，不做去重最佳化——那會讓存檔與 MetaState 產生隱性耦合

---

## 6. 不變量

1. 任一 slice 的寫入者集合與 `ModuleContract.owns` 完全一致（啟動時雙向驗證）
2. `metaSnapshot` 與 `config` 在整個 Run 生命週期內位元相同
3. `serialize → deserialize → serialize` 的結果位元相同
4. 同一 `seed` ＋ 同一 `config` ＋ 同一 `metaSnapshot` ＋ 同一指令序列 → 逐 slice 完全相同的最終 RunState
5. `progress.turn` 單調遞增，不得回退

> 第 4 條就是可重播（ARCHITECTURE §2.7）的正式定義，也是平衡模擬器與 bug 重現的基礎。**必須有測試釘住。**

---

## 7. 刻意不做

- 不做時間回溯或 undo（roguelite 不需要，且會讓可重播定義變複雜）
- 不做局內自動存檔以外的多存檔點
- 不在 RunState 放任何衍生快取（衍生值一律由 read-models 計算）
