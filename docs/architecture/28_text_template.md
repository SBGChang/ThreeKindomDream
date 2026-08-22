# 28 · 文本模板填充

> **職責**：把委託模板的佔位符換成本次抽出的參數。
>
> | | |
> |---|---|
> | **owns** | 無 |
> | **reads** | 06 本地化、17 事件槽 |
> | **handles** | 無 |
> | **emits** | 無 |

---

## 1. 分工

```
06 本地化   →  commission.subdue.body
               「{place} 有 {bandit} 作亂，{patron} 命你前去清剿。」

17 事件槽   →  抽出參數（需要 rng ＋ Definition，屬玩法）
               { place: 'place.baima', bandit: 'bandit.baibo', patron: 'notable.xiahoudun.name' }

28 本模組   →  解析佔位符 ＋ 遞迴解析每個參數的 l10n key ＋ 替換
               「白馬津有白波賊作亂，夏侯惇命你前去清剿。」
```

**參數值本身也是 l10n key**，因此填充是兩層解析：先取模板字串，再逐個解析參數。這讓地名、賊名都能被翻譯。

### 1.1 為什麼不併進 06

模板參數的**取值**需要 `TurnContext`（RNG ＋ Definition），字串的**存放**不需要。合在一起會讓本地化模組依賴局內狀態，而它應該是最底層的無狀態服務。

### 1.2 為什麼不併進 17

17 已經負責抽取邏輯與門檻過濾。把字串處理也放進去，會讓一個玩法模組同時擁有「抽什麼」與「怎麼顯示」兩種職責——而後者在測試時完全不需要 RunState。

---

## 2. 介面

```ts
interface TextTemplate {
  fill(bodyKey: L10nKey, params: Readonly<Record<string, L10nKey>>): string;
  placeholdersOf(bodyKey: L10nKey): readonly string[];   // 供建置門禁比對
}
```

`placeholdersOf` 讓 02 的規則驗證能檢查「佔位符集合 ＝ paramSlots 集合」（17 §8）。

---

## 3. 缺參數是**載入期**問題

| 情況 | 處理 |
|---|---|
| 模板有佔位符但 `paramSlots` 沒宣告 | **載入失敗**（02 規則驗證） |
| `paramSlots` 宣告了但模板沒用到 | **載入失敗** |
| 執行期 `params` 缺鍵 | **程式錯誤，throw** |

第三種不該發生——載入驗證已保證兩邊集合相等。若發生，代表 17 的抽取邏輯有 bug，**必須 throw 而不是留下 `{place}` 在畫面上**。

> 留下未替換的佔位符是最糟的處理：玩家會看到 `{place}` 而開發者不會收到任何訊號。

---

## 4. 不變量

1. `fill` 的結果不含任何未替換的佔位符
2. `fill` 是純函式（不需要 RNG 或 State）
3. `placeholdersOf` 的結果與實際替換時所需的鍵完全一致

---

## 5. 刻意不做

- 不做條件式文本（`{if x}...{endif}`）——那會讓資料變成程式（ARCHITECTURE §1.2 禁止可執行的資料檔）
- 不做複數／性別變化（中文不需要）
- 不做巢狀模板
