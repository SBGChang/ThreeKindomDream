# 25 · 結局判定

> **職責**：決定本輪達成哪個結局。結局是**夢裡真正發生的事**，達成後才夢醒。
>
> | | |
> |---|---|
> | **owns** | `RunState.ending` |
> | **reads** | 20 屬性與貨幣、21 官階、15 章節、22 陣營 |
> | **handles** | `run.retire`（主動歸隱） |
> | **emits** | `ending.reached` |
> | **ownsDefinitions** | `ending` |

---

## 1. 結局在前，夢醒在後 ★

```
局內進行 → 達成結局（局內演出）→ 夢醒 → 結算（26）
```

**「夢醒」是所有 Run 的統一出口，不是失敗的同義詞；結局才是分歧點**（GDD §2.2）。

因此本模組**不處理「失敗」**，它處理「達成了哪一種結局」。戰役中軍勢歸零只是其中一類觸發條件。

---

## 2. Data Schema

```ts
interface EndingDefinition extends DefinitionHeader {
  readonly kind: 'ending';                              // 家族
  readonly endingKind: 'fullDream' | 'aborted';          // 變體（見 00 §8.1）
  readonly factionId: FactionId | null;                  // null ＝ 通用
  readonly trigger: EndingTrigger;
  readonly requirements: readonly Condition[];           // 觸發當下的狀態門檻
  readonly priority: number;                             // 多個符合時取最高
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly pointsMultiplier: number;
  readonly collectible: boolean;
}

type EndingTrigger =
  | { readonly kind: 'sequenceCompleted' }        // 走完全部大事件
  | { readonly kind: 'noFactionEligible' };       // 在野
```

### 2.1 只剩兩個 trigger 型別 ★

| 已刪除 | 為什麼 |
|---|---|
| `checkFailed` | 「戰役中軍勢歸零」。**戰敗改成獎勵減半、章節照過**（33 §6.4），這個事件不再結束一輪，所以它不再導向任何結局 |
| `playerRetired` | 從來沒有內容用它，也沒有指令會發出它 |
| `moralVariants` / `MoralBand` | 善惡名整條退場（20）。同一個結局現在只有一段本文（`bodyKey`） |

**局內因此沒有任何死亡路徑了。** 直接的後果是〈戰歿〉那一筆被刪除 ——
它的本文寫的是「最後看見的是塵土」，需要一個死亡，而那已經不存在。
要把它拿回來只需要一個死亡來源（例如「一關未過就戰敗 ＝ 全軍覆沒」），
那是一個設計決定，不是一行程式。

### 2.2 `trigger` 與 `requirements` 的分工

| | 回答什麼 | 例 |
|---|---|---|
| `trigger` | **什麼事件**導致結局 | 走完章節序列 |
| `requirements` | 當下的**狀態**是否符合 | 文官階 ≥ 6 |

分開仍然必要：**十個結局裡有八個共用 `sequenceCompleted`**，
差別全在 `requirements`（官階高低）與 `priority`。
若合成一套，就得為每個組合寫一個 trigger 型別。

### 2.3 `aborted` 讀作【沒有圓夢】，不是【中途結束】★

戰敗不再夢醒，所以每一輪都會走完章節序列。
`endingKind: 'aborted'` 因此改由 `sequenceCompleted` ＋ **官階上限**觸發：

| 結局 | 門檻 | priority |
|---|---|---|
| 〈布衣一夢〉 | `career.civil ≤ 1` 且 `career.martial ≤ 1` | 6 |
| 〈罷官〉 | `career.civil ≤ 2` 且 `career.martial ≤ 2` | 5 |
| 〈功成〉 | 無（`fullDream` 兜底） | 1 |

門檻嚴的排前面。`isFullDream` 仍然是那條分界，只是它現在量的是
**「你有沒有經營出一份前程」**，而不是「你有沒有活下來」——
那正是 D7 一直想做的事：**膽小與失手的懲罰是難看的結局，不是死亡。**
現在它是唯一的懲罰。

---

## 3. 判定流程

```ts
interface EndingResolver {
  resolve(input: EndingEvalInput): EndingOutcome;
}

interface EndingEvalInput {
  readonly trigger: EndingTrigger;
  readonly ctx: RunContext;
}

interface EndingOutcome {
  readonly endingId: EndingId;
  readonly titleKey: L10nKey;
  readonly bodyKey: L10nKey;
  readonly pointsMultiplier: number;
  readonly isFullDream: boolean;
}
```

```
1. 篩出 trigger 相符的候選
2. 篩出 factionId 相符者（null 視為通用，恆相符）
3. 篩出 requirements 全部通過者
4. 取 priority 最高的一筆
```

### 3.1 必須永遠有結局可達 ★

第 4 步若候選為空，就會出現「夢醒了但沒有結局」——那是 GDD §2.2 明確排除的狀態。

因此每個 `trigger` 型別**必須存在至少一筆 `requirements` 為空的通用結局**作為兜底（`sequenceCompleted` 對應〈功成〉、`noFactionEligible` 對應〈隱者〉）。這由規則驗證強制，**不是執行期 fallback**——若資料不齊，載入就失敗（ARCHITECTURE §2.2）。

> 這是「五個合法出口」的正確用法：不在執行期硬給一個預設結局，而是在載入期保證資料一定齊。

### 3.2 圓夢與稱號分開判定

走完全部大事件但官階不足時，仍得到 `endingKind: 'fullDream'` 的結局，只是稱號較低（GDD §12.3）。

**圓夢是進度成就，稱號是養成成就。** 因此 `sequenceCompleted` 的候選裡要有一整排不同 `requirements` 的圓夢結局（丞相 / 三公 / 尚書令 / …），由 `priority` 排序。

---

## 4. 主動歸隱

`run.retire` 由特定劇情事件的選項觸發（17 的 `EventReward` 之外的特殊出口）。

它是**玩家的選擇**，不是失敗——因此有自己的 trigger 型別與專屬結局。這讓「我這輪不想再賭下去了」成為一個有結局演出的正當出路，而不是關掉遊戲。

---

## 5. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| 每個 `EndingTrigger` 型別至少有一筆 `requirements` 為空的通用結局 | 見 §3.1 |
| `priority` 在同一 `(trigger, factionId)` 組內不重複 | 否則選擇不決定性 |
| `titleKey` / `bodyKey` 都存在於文案表 | 否則結局畫面是空的 |
| `pointsMultiplier > 0` | 否則該結局結算為零 |
| `factionId ≠ null ⇒ packId` 為該陣營包 | 陣營結局不得進 core |
| 每個 `collectible` 結局至少有一組可達的門檻組合 | 否則圖鑑分母有永遠拿不到的項目 |
| `endingKind === 'fullDream' ⇒ trigger.kind === 'sequenceCompleted'` | 語意一致 |

倒數第二條需要對 `requirements` 做可達性分析（官階上限 12、四維上限、功績可達範圍）。這擋下「寫了結局但門檻互相矛盾」——不會有任何測試失敗，玩家卻永遠湊不滿圖鑑。

**它目前沒有實作**，而〈戰歿〉正是它該抓到的那一種：`checkFailed` 的來源
被刪掉之後，那一筆變成永遠拿不到的圖鑑格，四道門禁全綠（33 §6.4 那一版
是靠人看出來的）。

---

## 6. 不變量

1. `resolve()` 對任何合法 `EndingEvalInput` 必回傳一個結局，永不回 null
2. `resolve()` 是純函式（`RunContext`，無 RNG）——同一狀態必得同一結局
3. `RunState.ending` 一旦寫入即不可變更
4. `ending.reached` 在單局內最多發出一次
5. `endingKind === 'fullDream'` ⟺ 該陣營序列全部章節已通過

---

## 7. 刻意不做

- 不做結局的隨機成分（結局必須是玩家選擇與養成的結果）
- 不做多重結局同時達成
- 不在此模組執行結算（那是 26）
- 不做結局後的後續遊玩（New Game+ 由元層的商店與圖鑑承擔）
