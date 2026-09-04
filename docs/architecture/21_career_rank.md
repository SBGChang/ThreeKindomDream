# 21 · 官階系統

> **職責**：文武雙軌的升遷判定，作為陣營委託的門檻，並提供**戰役的兵量與糧量係數**。
>
> ```
> 兵量係數 = 1.0 × hostScale[武階] + 0.5 × hostScale[文階]
> 糧量係數 = 0.5 × hostScale[武階] + 1.0 × hostScale[文階]
> ```
>
> **功績因此不只是門檻貨幣，它就是玩家的血條**（33 §5.1）。
> 0.5 那一項自帶防退化底線：純武官的糧量有近八成來自他自己的武官階，
> 因此「零糧秣」不可能出現 —— 不需要另加基底常數。
>
> | | |
> |---|---|
> | **owns** | `RunState.career` |
> | **reads** | 20 屬性與貨幣（經 `StatQuery`） |
> | **handles** | 無（升遷是功績變動的被動結果） |
> | **emits** | `career.promoted` |
> | **ownsDefinitions** | `careerRank` |

---

## 1. Data Schema

```ts
interface CareerRankDefinition extends DefinitionHeader {
  readonly kind: 'careerRank';
  readonly line: CareerLine;                 // 'civil' | 'martial'
  readonly level: number;                    // 1..12
  readonly nameKey: L10nKey;
  readonly requiredMerit: number;            // 該線功績門檻
  readonly hostScale: number;                // 兵量／糧量的係數，見 33 §5.1
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

### 2.1 本輪的官階上限 ★★ 官階唯一的跨輪成長

```
career.maxLevel(line) = min(內容裡的階數(12), config.careerCap)
config.careerCap       = gameRules.careerCapBase(5) + 買到的〈官途〉階數(0..7)
```

`reevaluate` 升遷時到上限就停。**功績超過上限不會浪費** ——
兵量吃 `hostScale[官階]`，而上限同時封住兵量，所以那是一句可讀的話：
**「你只是個都尉，帶不了那麼多兵。」**

── **為什麼需要它** ★ ───────────────────────────

改之前，天命商店九個品項有 **0 個**碰官階：它在第一輪與第五十輪爬法完全一樣，
而它是狀態列上最顯眼的那個數字。實測第一輪爬到 rank 7.2 ／ 全滿 11.1 ——
**沒有閘門，階梯就只能訂成「第一輪爬得動」，而那必然是「第一輪爬掉一半」。**

訂在 5（都尉／功曹）之後：第一輪 5.0 ／ 全滿 11.4（44%）。
順帶的結果是〈丞相〉與〈大將軍〉需要 ≥ 6 ——
**第一輪拿不到那兩個稱號。** 頂端的稱號第一次真的鎖在跨輪成長後面。

（舊制「入朝初始階級由總名聲決定」已刪除：名聲整條退場之後，
官階從第一回合起就只由功績決定。）

### 2.2 升遷是功績變動的被動結果

訂閱 `currency.gained`，每次功績變動後檢查：

```
while merit[line] ≥ rankDef(line, level + 1).requiredMerit:
  level += 1
  emit career.promoted
```

**用 while 而非 if**：單次獎勵可能一次跨兩階（尤其戰役深關的功績）。

---

## 3. 官階的三個用途

| 用途 | 消費者 |
|---|---|
| **陣營委託門檻** | 17 事件槽（經 `Condition.statGte` with `career.*`） |
| **兵量與糧量** | 33 戰役（`hostScale` 依 1.0／0.5 組合兩線） |
| **委託與事件的報酬倍率** | 17（`eventYieldCurve.tierMultiplier`） |
| **小檢定的 DC** | 18（`dcCurve.byTier` 同一個索引 —— 難度與報酬一起長） |
| **結局門檻** | 25 結局判定 |
| **鍛鍊的基礎值** | 16（`trainingBaseAdd`，相加不相乘） |

**官階管六件事，所以它的上限是一個很大的旋鈕。** 那也是把它做成跨輪貨幣
（§2.1）划算的原因：買一階官途，六件事一起往上。

> **`hostScale` 是門檻貨幣唯一的「換成戰力」管道。** 若功績換不到戰力，
> 事件就被鍛鍊完全支配，門檻貨幣淪為純懲罰。

### 3.1 委託門檻的表達方式

`commissionTierUnlocked` 是**階級提供的能力**；委託那邊用 `Condition.statGte { stat: 'career.civil', value: N }` 表達需求。

兩種寫法並存是刻意的：前者讓「這一階能接到什麼」在官階表上一目瞭然（設計時好讀），後者讓委託自己宣告需求（載入時可驗證）。**規則驗證須確認兩者一致**——否則官階表寫著解鎖第 3 階委託，卻沒有任何第 3 階委託要求該官階。

---

## 4. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| 每線 `level` 從 1 起連續至 12，無缺口重複 | 否則升遷會卡住 |
| `requiredMerit` 沿 `level` 單調不減 | 否則出現「升上去又掉回來」 |
| `hostScale` 沿 `level` 嚴格遞增 | 否則升官變成懲罰 |
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
