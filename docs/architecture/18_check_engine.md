# 18 · 檢定引擎

> **職責**：小檢定與大檢定共用的判定核心。計算檢定值、成功率、執行判定、處理重擲與降級。
>
> | | |
> |---|---|
> | **owns** | 無 State slice（純計算 ＋ 大檢定結果轉發） |
> | **reads** | 01 效果系統、19 名士局內狀態、20 屬性與貨幣 |
> | **handles** | `majorCheck.attempt`（含難度選擇） |
> | **emits** | `chapter.passed` / `chapter.failed` / `check.resolved` |
> | **ownsDefinitions** | `majorCheck`、`checkRule` |

> ✂️ **[RFC-01](../RFC-01-campaign-rework.md) 縮編**：**大檢定的職責整體移交
> [33 戰役](33_campaign.md)**，本模組只保留小檢定。
> 隨之作廢：`majorCheck` / `checkRule.maxSortie` 定義、難度自選、出戰名士、
> `check.majorValue`、`careerService.checkBonus` 的加值路徑、§5 的失敗處理鏈、
> §3.2 對「大檢定成功率一律可見」的承諾（戰役改為 D8：不顯示勝率、只給情報）。
> **保留不動**：§3 的算式、§3.1 的封閉式、`specForMinor`、`preview` / `resolve` 的型別分層。

---

## 1. 兩種檢定，一套算式

| | 小檢定 | 大檢定 |
|---|---|---|
| 來源 | 事件選項（17） | 章末（15 發 `majorCheck.due`） |
| 難度 | 固定（由事件定義） | **玩家自選三檔** |
| 失敗後果 | 無獎勵，繼續遊戲 | **導向中止類結局**（25） |
| 出戰名士 | 否 | 是 |

算式相同，差別只在加值來源與失敗後果。**共用一套實作**，否則兩邊的平衡會各自漂移。

---

## 2. Data Schema

```ts
interface CheckRuleDefinition extends DefinitionHeader {
  readonly kind: 'checkRule';
  readonly secondaryWeight: number;       // 副屬性權重，GDD 暫定 0.5
  readonly rollMin: number;               // 1
  readonly rollMax: number;               // 100
  readonly maxSortie: number;             // 大檢定可派出的名士數上限
}

interface MajorCheckDefinition extends DefinitionHeader {
  readonly kind: 'majorCheck';
  readonly chapterId: ChapterId;
  readonly primaryAttr: Attr;
  readonly secondaryAttr: Attr | null;
  readonly tiers: Readonly<Record<Difficulty, MajorCheckTier>>;
  readonly enemyNotables: readonly NotableId[];   // 該檢定中屬敵方，不可出戰
  readonly collectible: boolean;
}

interface MajorCheckTier {
  readonly dc: number;
  readonly requirements: readonly Condition[];    // 該難度的解鎖門檻
  readonly rewards: readonly EventReward[];
  readonly briefKey: L10nKey;                     // 該難度的任務說明
}
```

### 2.1 難度門檻

`tiers.hard.requirements` 可要求功績或官階達標——功績不足時【險】難度**鎖定但顯示所需條件**（GDD §7.4）。這與事件選項的處理一致（17 §3.2）。

---

## 3. 檢定值與成功率

```
base  = attr[primary] + attr[secondary] × secondaryWeight
bonus = resolve('check.value.<primary>', 0)
      + resolve('check.majorValue', 0)          // 僅大檢定
      + Σ 出戰名士加值（19 依好感度階段提供）
roll  = rng.int('check.roll', rollMin, rollMax + 1)
total = base + bonus + roll
passed = total >= dc
```

### 3.1 成功率是可計算的封閉式

```
need = dc − base − bonus
successRate = clamp(0, 1, (rollMax − need + 1) / (rollMax − rollMin + 1))
```

- `need ≤ rollMin` → 必成功（1.0）
- `need > rollMax` → 必失敗（0.0）

### 3.2 成功率一律可見 ★

GDD §8.7 的設計意圖是「**走到中止類結局是玩家自己貪心的結果**，不是系統的隨機暴斃」。

**若玩家看不到成功率，難度自選就不是決策而是盲賭**，那個意圖無法成立。因此：

| 資訊 | 可見性 |
|---|---|
| 三檔難度的成功率 | **一律可見**，不需任何解鎖 |
| 檢定值的組成明細（`explain()`） | 需 `flag.previewCheckBreakdown` |

> ⚠️ **這推導出一個 GDD 修正**：`RevealInfo.what = 'majorCheckDC'`（郭嘉 50 級效果）變得多餘——成功率可見即可反推 DC。建議把它改成揭露**組成明細**（讓玩家知道「我這 47% 是被政治拖累的」），這比看到一個裸數字更有價值。
>
> 需同步更新 GDD §6.7 與 [01 §10.3](01_effect_system.md) 的 `RevealInfoDef.what` 列舉。

---

## 4. 出戰名士

```ts
interface SortieSelection {
  readonly notableIds: readonly NotableId[];      // ≤ maxSortie
}
```

規則：

1. 只能從本輪陣容（19 `RosterState`）中選
2. **列於 `enemyNotables` 的不可出戰**（GDD §6.2：選呂布當玩伴，虎牢關就不能靠他）
3. 加值由 19 依各名士的**局內好感度階段**計算

違反 1 或 2 → `threshold.not-met` 拒絕。

---

## 5. 失敗處理鏈

```
判定失敗
  ├ 查 RuleOverride（decision = 'check.onFailure'）
  │   └ CheckDowngradeRetry：機率成功則降級重判（消耗 usesPerRun）
  ├ 查 charge.majorCheckReroll
  │   └ 有可用 → 提示玩家是否重擲（消耗後重跑 §3）
  └ 皆無 → 小檢定：無獎勵結束
           大檢定：emit chapter.failed → 25 結局判定接手
```

**順序固定**：先降級重判、後重擲。理由是降級是「條件性的自動搶救」（來自寶物），重擲是「玩家主動花資源」（來自天賦）——自動的先跑，才不會浪費玩家的主動資源。

### 5.1 重擲必須重抽 roll，不得重用

`rng.int('check.roll', ...)` 再取一次，cursor 前進。若重用同一個 roll，重擲毫無意義。

---

## 6. 公開介面

```ts
interface CheckEngine {
  // 純計算，供 UI 顯示與 17 的 optionStates
  preview(spec: CheckSpec, ctx: RunContext): CheckPreview;

  // 執行判定（需要 rng）
  resolve(spec: CheckSpec, sortie: SortieSelection | null, ctx: TurnContext): CheckOutcome;
}

interface CheckPreview {
  readonly base: number;
  readonly bonus: number;
  readonly dc: number;
  readonly successRate: number;
  readonly breakdown: readonly EffectTrace[];   // 僅在 flag 開啟時填入
}

interface CheckOutcome {
  readonly passed: boolean;
  readonly roll: number;
  readonly total: number;
  readonly difficulty: Difficulty | null;       // 大檢定才有；降級後為降級後的值
  readonly downgraded: boolean;
  readonly rerolled: boolean;
}
```

`preview` 用 `RunContext`（無 RNG），`resolve` 用 `TurnContext`（有 RNG）——由型別保證預覽不會消耗隨機（03 §2）。

---

## 7. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `tiers` 三檔齊全 | 否則玩家少一個選擇 |
| `dc` 沿 safe → normal → hard 嚴格遞增 | 否則難度標籤與實際不符 |
| `rewards` 的價值沿難度遞增 | 「難度越高獎勵越高」是 GDD 承諾 |
| `enemyNotables` 引用的名士存在 | 引用完整性 |
| `enemyNotables` 不得與該檢定的推薦出戰名單重疊 | 見 02 §3.3 |
| `secondaryAttr ≠ primaryAttr` | 否則主屬性被重複計算 |
| `checkRule.rollMax > rollMin` | 否則骰子退化 |

---

## 8. 不變量

1. `preview` 是純函式，不消耗 RNG cursor
2. `preview().successRate` 與大量 `resolve()` 的實測通過率在統計上一致（可由 31 模擬器驗證）
3. 小檢定的 `resolve` **絕不寫入 `RunState.ending`**
4. 大檢定失敗必然發出 `chapter.failed`，且必然在該回合導向結局
5. 降級重判最多一次（`usesPerRun` 已扣除後不得再觸發）
6. 同一 `(seed, cursors, state, sortie)` → 相同 roll 與相同結果

---

## 9. 刻意不做

- 不做多輪對抗式戰鬥（GDD 明確採單次骰定）
- 不做局部成功／部分獎勵（三檔難度已提供風險梯度）
- 不做玩家自訂 DC
- 不在此模組執行結局判定（那是 25）
