# 22 · 陣營系統

> **職責**：陣營選擇的資格判定與執行，並切換事件池與章節序列。
>
> | | |
> |---|---|
> | **owns** | `RunState.faction` |
> | **reads** | 20 屬性與貨幣、02 Data Runtime（已安裝 pack） |
> | **handles** | `faction.choose` |
> | **emits** | `faction.joined` |
> | **ownsDefinitions** | `faction` |

---

## 1. Data Schema

```ts
interface FactionDefinition extends DefinitionHeader {
  readonly kind: 'faction';
  readonly lordId: NotableId;                        // 主公（也在上司池內）
  readonly requirements: readonly Condition[];       // 加入資格
  readonly chapterSequenceId: string;                // 引用 15 的序列
  readonly superiorPoolId: string;                   // 引用 19 的池
  readonly rejectReasonKey: L10nKey;                 // 資格不符時的說明
}
```

每個陣營包帶自己的 `faction.ts`（一包一筆）。

### 1.1 資格門檻走 `Condition`

GDD §7.2 的善惡名門檻表：

| 善惡名 | 蜀 | 魏 | 吳 |
|---|---|---|---|
| 大善 | ✅ 優待 | ✅ | ✅ |
| 中立 | ✅ | ✅ | ✅ |
| 大惡 | ❌ 拒收 | ✅ 權臣線 | ✅ |

蜀的 `requirements` ＝ `[{ type: 'statGte', stat: 'fame.moral', value: <中立下限> }]`。
魏的權臣線是**額外的事件與結局分支**（`Condition` 為負向門檻），不是另一個陣營。

---

## 2. 選擇時點與流程

```
虎牢關 chapter.passed，且該章 onPass = 'chooseFaction'（15 §3.2）
  ↓
進入陣營選擇狀態
  ├ 可選 = 已安裝 pack 的陣營 ∩ requirements 通過者
  ├ requirements 不通過 → 列出但標示 rejectReasonKey（不隱藏）
  └ pack 未安裝 → 完全不出現
  ↓
faction.choose(factionId)
  ├ 寫入 RunState.faction
  ├ emit faction.joined
  │    ├ 19 分配 3 位上司（依緣分決定自選名額）
  │    ├ 21 依總名聲設定初始官階
  │    ├ 17 切換事件池（faction 類事件開始進池）
  │    └ 15 切換章節序列
  └ phase 轉為 'faction'
```

### 2.1 為什麼不通過的陣營要列出

與 09 商店的 `blockedBy` 同一個理由：讓玩家看得到「我這輪惡名太高所以蜀漢不收」，才知道下一輪要怎麼養。隱藏會讓門檻設計失去教學價值。

**唯一該完全隱藏的是 pack 未安裝**——那不是進度問題，是內容不存在。

### 2.2 全部陣營都不合格時

理論上不會發生（魏吳無上限門檻），但架構不假設內容一定如此。若真的無可選陣營，走 `capability.disabled` 並導向**在野結局**（25）——這也正好是 GDD「三家 + 在野結局」設定的落點。

---

## 3. 陣營切換後的影響面

| 模組 | 變化 |
|---|---|
| 15 章節 | 序列切為該陣營的 7 章 |
| 17 事件槽 | `eventKind = 'faction'` 的事件開始進池；居民委託**繼續存在** |
| 19 名士 | 加入 3 位上司；兒時玩伴保留 |
| 21 官階 | 由總名聲設定初始階級 |
| 25 結局 | 可達結局集合限定為該陣營 ＋ 通用中止類 |

**居民委託不因入陣營而消失**（GDD §7.2）：南華村的村民變成治下的百姓，名聲因此全程可成長。

---

## 4. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `lordId` 存在，且在 `superiorPoolId` 的池內 | 主公必須可被分配為上司 |
| `chapterSequenceId` 與 `superiorPoolId` 存在 | 引用完整性 |
| 該序列的 `factionId` 與本 faction 一致 | 否則會走到別家的章節 |
| 至少一個已安裝陣營的 `requirements` 可被滿足 | 否則遊戲必然走在野結局 |
| `faction` Definition 的 `packId` 不是 `pack:core` | 陣營內容不得進 core |

---

## 5. 不變量

1. `faction` 一旦寫入即不可變更（單局內不可轉投）
2. `faction === null ⟺ phase === 'nanhua'`
3. `faction.joined` 在單局內最多發出一次
4. 未安裝 pack 的陣營永不出現在可選清單

---

## 6. 刻意不做

- 不做局內轉投陣營
- 不做多陣營同時效忠
- 不做陣營好感度／忠誠度（第一版；主公的關係走名士好感度）
