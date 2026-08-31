# 21 · 官階系統

> **職責**：文武雙軌的升遷判定，並作為陣營委託的門檻與大檢定的加值來源。
>
> | | |
> |---|---|
> | **owns** | `RunState.career` |
> | **reads** | 20 屬性與貨幣（經 `StatQuery`） |
> | **handles** | 無（升遷是功績變動的被動結果） |
> | **emits** | `career.promoted` |
> | **ownsDefinitions** | `careerRank`、`careerInit` |

> 🔧 **[RFC-01](../RFC-01-campaign-rework.md) 改動**：官階的產出改變。
>
> | | 舊 | 新 |
> |---|---|---|
> | `careerRank.checkBonus` | 大檢定的檢定值加值 | **作廢**（大檢定不再是單次判定） |
> | 新增 | — | **`hostCoefficient(ctx)`** ＝ 兵量／糧量係數（33 §5.1） |
> | `trainingBaseAdd` | 抬高該線四維的固定事件基礎值 | 語意改為抬高該線**經驗**產出 |
>
> ```
> 兵量係數 = 1.0 × T[武階] + 0.5 × T[文階]
> 糧量係數 = 0.5 × T[武階] + 1.0 × T[文階]
> ```
>
> 於是**功績從門檻貨幣升級為玩家的血條**（D29）。0.5 那一項自帶防退化底線 ——
> 純武官的糧量有近八成來自他自己的武官階，「零糧秣」不可能出現，
> 因此**不需要另加基底常數**。驗算見 [RFC-01 §3.4](../RFC-01-campaign-rework.md)。

---

## 1. Data Schema

```ts
interface CareerRankDefinition extends DefinitionHeader {
  readonly kind: 'careerRank';
  readonly line: CareerLine;                 // 'civil' | 'martial'
  readonly level: number;                    // 1..12
  readonly nameKey: L10nKey;
  readonly requiredMerit: number;            // 該線功績門檻
  readonly checkBonus: number;               // 提供的大檢定加值
  readonly commissionTierUnlocked: number;   // 解鎖到第幾階的陣營委託
}

interface CareerInitDefinition extends DefinitionHeader {
  readonly kind: 'careerInit';
  readonly byTotalFame: readonly {
    readonly minTotalFame: number;
    readonly civilLevel: number;
    readonly martialLevel: number;
  }[];
}
```

### 1.1 全部階級都是軍閥可自封的職務

依 GDD §12.1：幕府屬官、州府佐吏、軍中職級與將軍號。**不含三公、九卿、尚書、侍中**——那些是中央官職，屬結局稱號（25），不是局內可爬的階級。

`nameKey` 三陣營共用同一套階級表，名稱不因陣營而異。

### 1.2 State

```ts
interface CareerState {
  readonly civil: number;       // 當前文官階，1..12
  readonly martial: number;     // 當前武官階
}
```

只存等級。名稱、加值、委託解鎖全部由 Definition 現算。

---

## 2. 兩線並行，互不排擠

```
civil   由 merit.civil   推進
martial 由 merit.martial 推進
```

偏科玩家單線衝頂，均衡玩家兩線中階。**不共用門檻、不互相扣抵。**

### 2.1 入朝初始階級由總名聲決定

```
入朝時（faction.joined）：
  tf = StatQuery.totalFame()
  取 byTotalFame 中 minTotalFame ≤ tf 的最高一筆
  career = { civil: 該筆 civilLevel, martial: 該筆 martialLevel }
```

這是南華村篇名聲的**唯一直接出口**（其餘出口都是門檻）。

### 2.2 升遷是功績變動的被動結果

訂閱 `currency.gained`，每次功績變動後檢查：

```
while merit[line] ≥ rankDef(line, level + 1).requiredMerit:
  level += 1
  emit career.promoted
```

**用 while 而非 if**：單次事件獎勵可能一次跨兩階（尤其大檢定【險】的獎勵）。

---

## 3. 官階的三個用途

| 用途 | 消費者 |
|---|---|
| **陣營委託門檻** | 17 事件槽（經 `Condition.statGte` with `career.*`） |

> **`checkBonus` 是門檻貨幣唯一的「換成檢定力」管道。** 雙槽制時事件不花回合、
> 功績純屬白賺，所以加值多小都無所謂。單動作回合制下做事要用掉一個鍛鍊回合 ——
> 若功績換不到檢定力，事件就被鍛鍊完全支配，門檻貨幣淪為純懲罰。
>
> 訂法：在玩家**自然會持有該階**的那一章，加值約為其四維檢定值的兩成。
> 兩成夠讓升官有感，又不足以取代鍛鍊 —— 檢定值的主體仍必須靠練。
| **大檢定加值** | 18 檢定引擎（`checkBonus` 加總兩線） |
| **結局門檻** | 25 結局判定 |

### 3.1 委託門檻的表達方式

`commissionTierUnlocked` 是**階級提供的能力**；委託那邊用 `Condition.statGte { stat: 'career.civil', value: N }` 表達需求。

兩種寫法並存是刻意的：前者讓「這一階能接到什麼」在官階表上一目瞭然（設計時好讀），後者讓委託自己宣告需求（載入時可驗證）。**規則驗證須確認兩者一致**——否則官階表寫著解鎖第 3 階委託，卻沒有任何第 3 階委託要求該官階。

---

## 4. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| 每線 `level` 從 1 起連續至 12，無缺口重複 | 否則升遷會卡住 |
| `requiredMerit` 沿 `level` 單調不減 | 否則出現「升上去又掉回來」 |
| `checkBonus` 沿 `level` 單調不減 | 否則升官變成懲罰 |
| `level = 1` 的 `requiredMerit === 0` | 白身是起點 |
| `byTotalFame` 依 `minTotalFame` 排序且首筆為 0 | 否則低名聲玩家無對應項 |
| `byTotalFame` 的 level 值都在 1..12 內 | 引用完整性 |
| `commissionTierUnlocked` 與實際委託的官階門檻一致 | 見 §3.1 |

---

## 5. 不變量

1. `civil` 與 `martial` ∈ `[1, 12]`，單調不減
2. `civil` 恆為「`merit.civil` 所能達到的最高階」（無延遲、無需手動領取）
3. 兩線互不影響：只改 `merit.civil` 絕不改變 `martial`
4. 入朝前 `career` 為 `{ civil: 1, martial: 1 }`（白身）

---

## 6. 刻意不做

- 不做降職（GDD 的「罷官」是中止類結局，不是官階變動）
- 不做兩線之間的功績轉換
- 不做地方官（太守、刺史、州牧不在遷轉序列內）
- 不做中央官職（那是結局稱號，屬 25）
