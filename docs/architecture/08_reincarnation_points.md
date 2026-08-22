# 08 · 輪迴點數經濟

> **職責**：輪迴點數的唯一帳本。產出只來自結算，消耗只來自天命商店。
>
> | | |
> |---|---|
> | **owns** | `MetaState.points` |
> | **reads** | 無 |
> | **handles** | `points.grant`（內部）／`points.spend`（內部） |
> | **emits** | `points.changed` |

---

## 1. 為什麼要獨立成一個模組

點數只有一個欄位，看起來不值得一個模組。但它是**唯一同時被結算與商店碰到的資源**，若讓兩邊各自 `meta.points += x`，就會出現：

- 沒有單一地方可以斷言「產出總和 − 消耗總和 ＝ 餘額」
- 加負數當扣款、扣款不檢查餘額這類錯誤沒有守門人
- 無法回答「這一輪賺了多少」——那是 UI 與統計都需要的資訊

---

## 2. Data Schema

```ts
// content-source/core/meta/settlement.ts
interface SettlementFormulaDef extends DefinitionHeader {
  readonly kind: 'settlementFormula';
  readonly perCareerRank: number;        // 每一階官階的點數（文武階級相加後乘）
  readonly perChapterPassed: number;     // 每通過一個大事件
  readonly fullDreamBonus: number;       // 圓夢加成
  readonly endingMultipliers: Readonly<Record<EndingId, number>>;
}
```

**公式的形狀在 code，係數在資料**（ARCHITECTURE §2.1）：

```
points = (careerCivil + careerMartial) × perCareerRank
       + chaptersPassed × perChapterPassed
       + (isFullDream ? fullDreamBonus : 0)
       ... 然後 × endingMultipliers[endingId]
```

> 兩線相加 vs 取高值仍是待定平衡問題（GDD §12.2）。**形狀留在 code，選擇留在資料**：`perCareerRank` 若要改成「取高值」則屬架構變更，須更新本檔。

---

## 3. 帳本規則

```ts
interface PointsLedger {
  balance(): number;
  grant(amount: number, reason: GrantReason): CommandOutcome;
  spend(amount: number, reason: SpendReason): CommandOutcome;
}

type GrantReason = { readonly kind: 'settlement'; readonly runId: string };
type SpendReason = { readonly kind: 'shop'; readonly itemId: ShopItemId; readonly level: number };
```

- `grant` 與 `spend` 的 `amount` **必須為正**。加負數當扣款是型別無法阻止但門禁應檢查的錯誤
- `spend` 餘額不足 → 回 `threshold.not-met` 拒絕，**不得扣成負數**
- 每筆變動都帶 `reason`，供統計與偵錯

---

## 4. 不變量

1. `balance() ≥ 0` 恆成立
2. `Σ grant − Σ spend = balance()`（統計模組可獨立驗算）
3. 只有結算模組（26）可呼叫 `grant`；只有商店（09）可呼叫 `spend`——由 Composition 註冊限制

---

## 5. 刻意不做

- 不做第二種貨幣（碎片由 10／11 各自管，不經此帳本）
- 不做點數的時效或衰減
