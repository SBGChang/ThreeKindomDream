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

因此本模組**不處理「失敗」**，它處理「達成了哪一種結局」。大檢定失敗只是其中一類觸發條件。

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
  readonly moralVariants: Readonly<Record<MoralBand, L10nKey>>;
  readonly pointsMultiplier: number;
  readonly collectible: boolean;
}

type EndingTrigger =
  | { readonly kind: 'sequenceCompleted' }                              // 走完全部大事件
  | { readonly kind: 'checkFailed'; readonly attr: Attr | 'any';
      readonly difficulty: Difficulty | 'any' }
  | { readonly kind: 'noFactionEligible' }                              // 在野
  | { readonly kind: 'playerRetired' };                                 // 歸隱

type MoralBand = 'veryGood' | 'neutral' | 'veryEvil';
```

### 2.1 `trigger` 與 `requirements` 的分工

| | 回答什麼 | 例 |
|---|---|---|
| `trigger` | **什麼事件**導致結局 | 武系大檢定失敗 |
| `requirements` | 當下的**狀態**是否符合 | 文官階 ≥ 10 |

分開是必要的：〈戰歿〉與〈流放〉的 trigger 相同（檢定失敗），差別在 `requirements`（惡名高低）。若合成一套，就得為每個組合寫一個 trigger 型別。

### 2.2 `moralVariants` 是文本修飾，不是不同結局

同一個結局，善惡名決定用詞（GDD §12.3）：

| MoralBand | 文線 | 武線 |
|---|---|---|
| `veryGood` | 賢相・純臣 | 忠武・國之干城 |
| `neutral` | （原稱號） | （原稱號） |
| `veryEvil` | 權相・國賊 | 梟將・虎狼之臣 |

**不做成三個 EndingDefinition**——那會讓圖鑑分母膨脹三倍，而玩家心裡它們是同一個結局的三種說法。

`MoralBand` 的邊界值來自 `config/game-rules`（資料）。

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
  readonly moralBand: MoralBand;
  readonly titleKey: L10nKey;          // 已套用 moralVariants
  readonly pointsMultiplier: number;
}
```

```
1. 篩出 trigger 相符的候選
2. 篩出 factionId 相符者（null 視為通用，恆相符）
3. 篩出 requirements 全部通過者
4. 取 priority 最高的一筆
5. 依 fame.moral 決定 MoralBand，套用 moralVariants
```

### 3.1 必須永遠有結局可達 ★

第 4 步若候選為空，就會出現「夢醒了但沒有結局」——那是 GDD §2.2 明確排除的狀態。

因此每個 `trigger` 型別**必須存在至少一筆 `requirements` 為空的通用結局**作為兜底（例如 `checkFailed` 對應〈布衣一夢〉）。這由規則驗證強制，**不是執行期 fallback**——若資料不齊，載入就失敗（ARCHITECTURE §2.2）。

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
| `moralVariants` 三個 band 齊全 | 否則某個善惡區間無文本 |
| `pointsMultiplier > 0` | 否則該結局結算為零 |
| `factionId ≠ null ⇒ packId` 為該陣營包 | 陣營結局不得進 core |
| 每個 `collectible` 結局至少有一組可達的門檻組合 | 否則圖鑑分母有永遠拿不到的項目 |
| `endingKind === 'fullDream' ⇒ trigger.kind === 'sequenceCompleted'` | 語意一致 |

倒數第二條需要對 `requirements` 做可達性分析（官階上限 12、四維上限、功績可達範圍）。這擋下「寫了結局但門檻互相矛盾」——不會有任何測試失敗，玩家卻永遠湊不滿圖鑑。

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
