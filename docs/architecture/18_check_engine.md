# 18 · 檢定引擎

> **職責**：事件內小檢定的判定核心。計算檢定值、成功率、執行判定。
>
> | | |
> |---|---|
> | **owns** | 無 State slice（純計算） |
> | **reads** | 01 效果系統、20 屬性與貨幣 |
> | **handles** | 無（由 17 事件槽在結算選項時呼叫） |
> | **emits** | 無 |
> | **ownsDefinitions** | `checkRule` |

> 章末那一格是 [33 戰役](33_campaign.md) —— 七關的自動戰役，有自己的算式
> 與自己的失敗後果。本模組只服務**事件內的小檢定**。

---

## 1. 小檢定是什麼

| | |
|---|---|
| 來源 | 事件選項（17 §5） |
| 難度 | 固定，由事件的 `dcCurveId` × 該線官階決定 |
| 失敗後果 | **不會夢醒** —— 但**顆粒無收**（`eventYieldCurve.failRatio = 0`） |

**失敗＝顆粒無收**是刻意的（17 §6.3）。舊值 0.4 的理由正好相反
（「怕高 DC 沒人敢碰」），但實測是它讓**高檔怎麼算都贏** ——
高檔失敗拿到的還比低檔成功的多兩倍，三檔於是退化成一檔。

「想穩」那條路由**低檔的 DC 幾乎必過**（0.50 倍 → 99%）承擔，
不由「失敗也有獎」承擔。

---

## 2. Data Schema

```ts
interface CheckRuleDefinition extends DefinitionHeader {
  readonly kind: 'checkRule';
  readonly rollMin: number;        // 1
  readonly rollMax: number;        // 100
  readonly rollCenter: number;     // 50
  readonly rollSpread: number;     // 100
  readonly baseFloor: number;      // 四維全 0 時的地板
}
```

`dcCurve` 的 `byTier` 索引**官階階級**，不是章節（17 §6.4）——
難度與報酬必須一起長，否則壓低某一線的官階會變成刷簡單高報酬的農場。

---

## 3. 檢定值與成功率

**比例擺幅**，不是加減骰：

```
value  = max(baseFloor, attr[primary]) + resolve('CheckValueBonus')
roll   = rng.int('check.roll', rollMin, rollMax + 1)
total  = round(value × (1 + (roll − rollCenter) / rollSpread))
passed = total >= dc
```

`rollSpread = 100` 讓 roll 1–100 對應倍率 0.51–1.50。因此 DC 應訂在
「該階級的期望單維值」的 0.50 ／ 1.00 ／ 1.26 倍附近，三檔選項才會落在
約 **99% ／ 51% ／ 25%** 的成功率上。

低檔刻意是【幾乎必過】（舊值 0.72 → 79%）：「交差了事」不該是一個要
考慮的賭注，它換走的是報酬（3 功績、磨練權重 0.6），不是你的注意力。

### 3.1 成功率是可計算的封閉式

```
need = ceil(rollCenter + rollSpread × (dc / value − 1))
successRate = clamp(0, 1, (rollMax − need + 1) / (rollMax − rollMin + 1))
```

`value <= 0` 時退化為「dc <= 0 才必成功」。

### 3.2 小檢定的成功率一律可見

事件選項是一條**費力程度的階梯**（低／中／高），玩家要看得出取捨。
沒有成功率，那三個選項就只剩文案差異。

> ⚠️ **戰役那一側刻意不給勝率**（[RFC-01](../RFC-01-campaign-rework.md) D8）。
> 兩邊的判準不同是因為兩邊的系統不同：小檢定是一次擲骰、算得出封閉式；
> 戰役是幾十回合的模擬 ＋ 玩家自己的配置，那個百分比會是**假的精確**。

---

## 4. 公開介面

```ts
// 純計算，供 17 的 optionStates 顯示
function preview(spec: CheckSpec, ctx: RunContext, fx: EffectResolver): CheckPreview;

// 執行判定（需要 rng）
function resolveCheck(spec: CheckSpec, ctx: TurnContext, fx: EffectResolver): CheckOutcome;

interface CheckSpec {
  readonly scope: 'minor';
  readonly primaryAttr: Attr;
  readonly dc: number;
}
```

`preview` 用 `RunContext`（無 RNG），`resolveCheck` 用 `TurnContext`（有 RNG）——
由型別保證預覽不會消耗隨機（03 §2）。

`scope` 仍留在型別上：效果系統的 `CheckValueBonusDef` 之後若要再分種類，
擴充點在這裡；目前只有 `'minor'` 一種。

---

## 5. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `dcCurve.byTier` 長度 ＝ 官階階數（12） | 索引對不上會靜靜取到 undefined |
| `byTier` 嚴格遞增 | 否則高階反而更容易 |
| `checkRule.rollMax > rollMin` | 否則骰子退化 |
| `rollSpread > 0` | 否則比例擺幅除以零 |

---

## 6. 不變量

1. `preview` 是純函式，不消耗 RNG cursor
2. `preview().successRate` 與大量 `resolveCheck()` 的實測通過率在統計上一致
   （可由 31 模擬器驗證）
3. 小檢定**絕不寫入 `RunState.ending`** —— 它不會導向任何結局
4. 同一 `(seed, cursors, state)` → 相同 roll 與相同結果

---

## 7. 刻意不做

- 不做多輪對抗式判定（那是 33 戰役的事）
- 不做局部成功／部分獎勵（`failRatio` 是那個位置，而它現在訂在 0）
- 不做玩家自訂 DC
