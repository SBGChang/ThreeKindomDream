# 16 · 鍛鍊槽

> **職責**：生成四個行動格（光階保底值 ＋ 名士站位）、處理選擇、執行升階判定與結算。
>
> | | |
> |---|---|
> | **owns** | `RunState.slots.training` |
> | **reads** | 01 效果系統、19 名士局內狀態、20 屬性與貨幣 |
> | **handles** | `training.select` / `training.reroll` |
> | **emits** | `training.slotsGenerated` / `training.selected` / `glow.resolved` / `attribute.gained` |
> | **ownsDefinitions** | `trainingAction`、`glowTier`、`trainingCurve`、`aptitudeGrade` |

> 🔧 **[RFC-01](../RFC-01-campaign-rework.md) 改動**：產出從屬性點改為**四類經驗值**。
> `attr.grant` → **`exp.grant`**（收方由 20 改為 [32 養成兌現](32_growth_conversion.md)）；
> `attribute.gained` → `exp.gained`。
> `trainingCurve.baseByAttr` 的**數值可照用、語意改變**（產出是經驗不是屬性）。
> 本模組因此**不再寫入 `RunState.attributes`** —— 那成為 32 的專屬寫入權。

---

## 1. Data Schema

### 1.1 行動定義

```ts
interface TrainingActionDefinition extends DefinitionHeader {
  readonly kind: 'trainingAction';
  readonly attr: Attr;
  readonly phase: Phase;                     // 南華村篇 / 陣營篇（換皮）
  readonly labelKey: L10nKey;                // 'attr.war.nanhua.label'
  readonly subtitleKeys: readonly L10nKey[]; // 三選一小標題池
}
```

四維 × 兩階段 ＝ 8 筆。`subtitleKeys` 每回合以 `rng` 隨機取一個，純呈現，**不影響任何數值**。

### 1.2 光階

```ts
interface GlowTierDefinition extends DefinitionHeader {
  readonly kind: 'glowTier';
  readonly tier: GlowTier;
  readonly order: 0 | 1 | 2 | 3;      // 有序性由 code 保證，序號在此宣告
  readonly yieldMul: number;          // 收益倍率
  readonly baseWeight: number;        // 保底抽取權重
}
```

規則驗證：四筆 `order` 恰好覆蓋 0–3；`baseWeight` 總和 > 0；`yieldMul` 沿 `order` 單調遞增。

### 1.3 資質

```ts
interface AptitudeGradeDefinition extends DefinitionHeader {
  readonly kind: 'aptitudeGrade';
  readonly grade: AptitudeGrade;
  readonly shiftSteps: number;        // 保底光階位移（見 §2.2）
  readonly yieldMul: number;          // 收益倍率
}
```

### 1.4 成長曲線

```ts
interface TrainingCurveDefinition extends DefinitionHeader {
  readonly kind: 'trainingCurve';
  readonly baseByAttr: Readonly<Record<Attr, number>>;
  readonly chapterMultiplier: readonly number[];   // index ＝ chapterIndex − 1
  readonly upgradeBaseChance: number;              // 第二層基礎升階機率
  readonly shiftStepRatio: number;                 // 一「檔」的權重移轉比例，見 §2.2
}
```

`chapterMultiplier` 的長度必須 ≥ 全部序列中最長的章節數，否則載入失敗。

---

## 2. 兩層 RNG

### 2.1 第一層：保底光階（選擇前可見）

```
weights  = 四階的 baseWeight
shift    = 該格 attr 的資質 shiftSteps
         + Σ EffectResolver 的 GlowBaseWeight.tierShift（scope 相符者）
weights' = applyShift(weights, shift, shiftStepRatio)
tier     = rng.weighted('glow.base', weights')
```

**`applyShift` 的語意固定寫在 code**（每一步把 `shiftStepRatio` 比例的權重由最低非零階移轉至次高階）。`shiftStepRatio` 是資料。

> ⚠️ **待定平衡問題**：GDD §5.2 把資質寫成「±N 檔」。那個「檔」對應到 `shiftStepRatio` 的具體數值尚未定案（S 資質 +4 檔若直譯為「全部移到紅光」會破壞光階系統）。**架構不代為決定**——這是 GDD 數值調校項，需在 `chapterMultiplier` 與 DC 曲線一併確定時處理。

### 2.2 第二層：升階判定（選擇後揭曉）

```
chance = upgradeBaseChance
       + Σ GlowUpgradeBonus.chanceAdd（scope 相符者）
若 rng.next('glow.upgrade') < chance:
    order < 3 → order += 1
    order = 3 → 改為給予額外獎勵（走 FragmentDrop / AffinityGrant Reactor）
```

紅光已封頂時的替代獎勵**不在本模組寫死**——它由訂閱 `glow.resolved` 的效果 Reactor 提供（01 §3）。若沒有任何 Reactor，就只是沒有額外獎勵，這不是缺陷。

### 2.3 為什麼兩層作用在分佈的不同端

資質拉高**保底**，商店與名士拉高**升階率**。兩者不相乘，因此不會出現「全紅光」的破壞性配置（GDD §4.3）。這條是本模組存在的主要設計約束。

---

## 3. 槽位生成

```ts
interface TrainingSlotState {
  readonly slots: readonly [TrainingSlot, TrainingSlot, TrainingSlot, TrainingSlot];
  readonly selected: 0 | 1 | 2 | 3 | null;
  readonly result: TrainingResult | null;
}

interface TrainingSlot {
  readonly actionId: string;                    // TrainingActionDefinition.id
  readonly subtitleKey: L10nKey;
  readonly baseGlow: GlowTier;                  // 保底值，選擇前可見
  readonly notables: readonly NotableId[];      // 0..2 位站位名士
}

interface TrainingResult {
  readonly finalGlow: GlowTier;
  readonly upgraded: boolean;
  readonly attrGained: number;
  readonly affinityGained: readonly { notableId: NotableId; amount: number }[];
}
```

生成順序（**固定，改動即破壞可重播**，見 04 §1）：

```
1. 四格各取一個 attr（南華村篇／陣營篇的四筆行動，一格一維）
2. 各格抽 subtitleKey            ← rng 'event.params'
3. 各格抽 baseGlow               ← rng 'glow.base'
4. 名士站位分配                  ← rng 'notable.slot'（見 19）
```

### 3.1 `slots` 必須進存檔

否則玩家中途離開再回來會用新的 cursor 重抽，等同白送一次重抽（03 §6.2）。

---

## 4. 結算

```
attrGained = baseByAttr[attr]
           × chapterMultiplier[chapterIndex - 1]
           × glowTier.yieldMul
           × aptitudeGrade.yieldMul
           × 名士連動倍率（19 提供）
           × EffectResolver.resolve('training.exp.<attr>', 1)
           ＋ 無光補償（EffectResolver.resolve('training.noGlowBonus', 0)，僅 tier = none 時）
```

**乘法鏈的順序固定在 code**。各項的數值全部來自資料或效果系統。

### 4.1 只產出四維 ★

**鍛鍊槽不產出名聲或功績**（GDD §5.1）。那是事件槽的職責。

若讓鍛鍊也給功績，玩家可以靠猛練繞過事件系統升官，門檻貨幣的設計會被稀釋、事件槽失去存在意義。這條是**架構層的硬約束**：本模組的 `ModuleContract.reads` 不含 20 的貨幣寫入路徑。

單動作回合制讓這條約束變成整個抉擇的支點：鍛鍊給不了貨幣，事件給不了大量四維，
而一回合只能選一邊（15 §2）。四維的量級對照見 17 §1.1。

### 4.2 好感度

選中格上的每位名士好感度上升，實際數值由 19 計算（本模組只回報「誰被選到了」）。

### 4.3 與事件槽互斥

`training.select` 在本回合已行動時必須拒絕。這道檢查由 15 的 `assertActable`
在指令入口執行，**不在本模組重複實作** —— 否則規則會有兩份，且各自只看得到自己那半。

本模組只需匯出 `selectedAction(ctx)`，讓 15 組合出「本回合的動作」（15 §2.1）。

---

## 5. 重抽

`training.reroll` 消耗 `charge.slotReroll`（來自 `SlotReroll` 效果）。重抽會**重新執行 §3 的全部四步**，包含名士站位。

無可用 charge → `charge.exhausted` 拒絕。

---

## 6. 不變量

1. `slots` 恆為 4 格，每格 attr 互不重複
2. `selected` 為 null 時 `result` 必為 null；反之必同時有值
3. `selected !== null` ⇒ `slots.event.resolved === null`（互斥，見 15 §2）
4. 同一 `(seed, rngCursors, config, progress, roster)` → 生成完全相同的四格
5. `finalGlow.order ≥ baseGlow.order`（升階只能往上）
6. 本模組不寫 `currencies`（門禁可驗證）
7. `applyShift` 後的權重總和 > 0

---

## 7. 刻意不做

- 不做體力／幹勁系統（GDD 刻意排除：稀缺性來自回合數）
- 不做同一格多次執行
- 不做行動格的玩家自訂
- 不在此模組決定名士站位規則（那是 19；本模組只呼叫）
