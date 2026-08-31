# 20 · 屬性與貨幣

> **職責**：持有四維、名聲、功績，並提供**唯一的門檻查詢入口**。
>
> | | |
> |---|---|
> | **owns** | `RunState.attributes`、`RunState.currencies` |
> | **reads** | 01 效果系統 |
> | **handles** | `attr.grant`（內部，來自 16）／`currency.grant`（內部，來自 17／18） |
> | **emits** | `attribute.gained` / `currency.gained` |
> | **ownsDefinitions** | `attributeCap` |

> 🔧 **[RFC-01](../RFC-01-campaign-rework.md) 改動**：
> `attributeCap.attrMax` **999 → 100**（七個價格帶對齊七個等級 G–S，見 32 §3.1）。
> 本模組**不再由 16 直接寫入** —— `attributes` 的唯一寫入者變成
> [32 養成兌現](32_growth_conversion.md)。四類經驗池歸 32 的 `growth` slice，不在這裡。
> 所有引用四維的門檻（事件選項、委託、小檢定 DC）都要重新標定到 0–100 尺度。
> §2 那條「GDD 尚未定義四維上限」的待補註記可以關閉。

---

## 1. State

```ts
interface AttributeState {
  readonly values: Readonly<Record<Attr, number>>;
}

interface CurrencyState {
  readonly fame: Readonly<Record<FameKind, number>>;    // civil / martial / moral
  readonly merit: Readonly<Record<MeritKind, number>>;  // civil / martial
}
```

### 1.1 `fame.moral` 是有正負號的單一軸

善惡名不是兩個欄位，是一個可為負的數（GDD §7.2）。善事推正、惡事推負。**唯一可為負的貨幣欄位**。

### 1.2 總名聲不含善惡名

```
totalFame  = fame.civil + fame.martial          // 不含 moral
totalMerit = merit.civil + merit.martial
```

善惡名是**方向**不是**多寡**，加進總量沒有意義（做惡也算有名，會讓「總名聲門檻」變成可以刷惡名達成）。

---

## 2. Data Schema

```ts
interface AttributeCapDefinition extends DefinitionHeader {
  readonly kind: 'attributeCap';
  readonly attrMax: number;
  readonly moralMin: number;        // 善惡名下限（負值）
  readonly moralMax: number;
}
```

> ⚠️ **待定數值**：GDD 尚未定義四維上限。它是 DC 曲線設計的前提（沒有上限就無法設計 DC），列為 GDD 待補項。架構只保證它是**資料**。

---

## 3. 唯一的門檻查詢入口 ★

```ts
interface StatQuery {
  read(path: StatPath, ctx: RunContext): number;
  totalFame(ctx: RunContext): number;
  totalMerit(ctx: RunContext): number;
}
```

`StatPath`（00 §10.1 定義於 01）涵蓋 `attr.*` / `fame.*` / `merit.*` / `career.*`。

**所有門檻判定都走這個介面**：

| 消費者 | 用途 |
|---|---|
| 01 效果系統 | `Condition.statGte` 求值 |
| 17 事件槽 | 事件與選項的進池／解鎖門檻 |
| 18 檢定引擎 | 難度解鎖門檻 |
| 21 官階系統 | 升遷門檻 |
| 22 陣營系統 | 陣營資格（善惡名） |
| 25 結局判定 | 結局稱號門檻 |

> **為什麼要有這一層**：六個模組各自 `state.currencies.fame.civil` 讀下去也能跑，但那樣「總名聲」的定義會出現六份，而且 `career.*` 這種需要跨 slice 的路徑會誘使模組直接 import 21。**單一入口讓門檻語意只有一個真相。**

---

## 4. 寫入權限

| Slice | 誰可以寫 | 經由 |
|---|---|---|
| `attributes` | **只有 16 鍛鍊槽** | `attr.grant` |
| `currencies.fame` | 17 事件槽、18 檢定引擎 | `currency.grant` |
| `currencies.merit` | 17 事件槽、18 檢定引擎 | `currency.grant` |

### 4.1 鍛鍊不產出貨幣，事件不產出四維（除獎勵外）

- **16 只能寫 `attributes`**，不得寫 `currencies`（GDD §5.1，門禁可驗證）
- 17 的 `EventReward.attr` 可以給四維，但那是**事件獎勵**，與鍛鍊產出是不同來源

這條分工是門檻貨幣設計成立的前提：若鍛鍊也給功績，玩家可以靠猛練繞過事件系統升官。

### 4.2 加值一律為正

`grant` 的 `amount` 必須 > 0，唯一例外是 `fame.moral`（可為負，代表惡行）。用負數當扣除是門禁應檢查的錯誤。

---

## 5. 效果套用點

| Target | 套用時機 |
|---|---|
| `training.exp.<attr>` | 16 結算時（乘性） |
| `stat.<attr>` | 寶物直給，入夢時與獲得時（加性） |
| `currency.fame.<kind>` | `currency.grant` 時（乘性） |
| `currency.merit.<kind>` | `currency.grant` 時（乘性） |

**乘性修正在寫入前套用**，因此存下來的永遠是最終值——不需要在讀取時重算，也不會出現「改了天賦後歷史數值跟著變」。

---

## 6. 不變量

1. `attributes.values[attr]` ∈ `[0, attrMax]`，單調不減
2. `fame.civil` / `fame.martial` / `merit.*` ≥ 0，單調不減
3. `fame.moral` ∈ `[moralMin, moralMax]`，**可雙向變動**
4. `totalFame` 不含 `fame.moral`
5. 16 從未寫入 `currencies`（門禁）
6. 所有門檻判定都經 `StatQuery`，無模組直接讀取 slice（門禁）

---

## 7. 刻意不做

- 不做屬性的衰退或上限突破
- 不做貨幣之間的兌換
- 不在此模組實作門檻的**判定邏輯**（那是 `Condition` 求值，屬 01）——本模組只提供取值
