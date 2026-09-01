# 01 · 效果系統（Effect System）

> **職責**：把所有來源（天賦、名士解鎖條、寶物、技能）產出的效果，用單一格式表述、單一管線結算。
>
> | | |
> |---|---|
> | **owns** | 無 State slice（純解析與計算） |
> | **reads** | 全部 `EffectSource` 實作者 |
> | **handles** | 無 GameCommand |
> | **emits** | 無 |
> | **ownsDefinitions** | 17 個 FuncType 的效果表 |

---

## 1. 職責邊界

**做**：解析 `EffectRef` → 取出定義 → 依整合點分派 → 結算數值／旗標／資源 → 提供 `explain()`。

**不做**：

- 不理解「名士」「天賦」「寶物」是什麼
- 不做 `supersedes` 判斷（由來源模組過濾後才交進來，見 §6）
- 不擁有任何 State

---

## 2. 核心模式：FuncType ＋ ReferID

`funcType` 同時決定三件事：**資料在哪張表**、**那張表的 Schema**、**由誰執行**。
`referId` 決定是那張表裡的哪一筆。

### 2.1 為什麼不用單一扁平 Schema

若強制所有效果共用 `target / op / value`，以下 GDD 既有效果無法表達：

| 效果 | 缺少的維度 |
|---|---|
| 荀彧 50「每章節可重抽一次行動格配置」 | 時機 ＋ 次數 ＋ 對象 |
| 貂蟬 50「開局隨機一位常駐名士初始好感 +15」 | 目標選擇規則 ＋ 數值 |
| 郭嘉 40「紅光時額外掉落寶物碎片」 | 觸發條件 ＋ 掉落池 ＋ 數量 |
| 寶物〈破陣〉「【險】失敗時 30% 降為【進】重判」 | 條件 ＋ 機率 ＋ 降級行為 |

扁平 Schema 的結局必然是萬用參數欄位，或各系統各開後門——解耦當場破功。

> 扁平設計沒有白費：它成為 `StatModifier` 這一個 FuncType，服務佔比最高的同構數值加成，因此不會造成表爆炸。

---

## 3. 整合點介面

「同一批效果上有多種操作」是 Visitor 的典型使用理由。這裡改用**介面分類**，不用雙分派：

```ts
interface ValueContributor {
  readonly targets: readonly TargetId[];
  contribute(def: EffectDef, ctx: RunContext): readonly Contribution[];
}

interface EventReactor {
  readonly reactsTo: readonly string[];      // DomainEvent kind
  react(def: EffectDef, e: DomainEvent, ctx: RunContext): readonly InternalCommand[];
}

interface RuleOverride {
  readonly decision: DecisionPoint;
  override(def: EffectDef, input: unknown, ctx: RunContext): OverrideResult;
}

type DecisionPoint =
  | 'check.onFailure'      // 失敗後可否降級重判
  | 'slot.onGenerate'      // 行動格生成後可否重抽
  | 'event.onDraw';        // 事件抽取後可否重抽

interface Contribution {
  readonly target: TargetId;
  readonly op: 'add' | 'mulPct' | 'override' | 'clampMin' | 'clampMax';
  readonly value: number;
  readonly sourceId: string;   // 用於 explain()
}
```

一個 Handler 可實作多個介面。**消費端依介面收集，不認識具體型別**——新增效果型別時消費端一行都不用改。

### 3.1 為什麼是 Strategy 而不是 Visitor

| | Visitor | Strategy |
|---|---|---|
| 適合 | 型別集合**穩定** | 型別集合**持續增長** |
| 加一個效果型別 | 要改**所有** visitor | 加一個 handler ＋ 註冊一行 |

本專案每加一個名士、寶物、技能都可能帶來新機制，型別集合永遠不會穩定。

---

## 4. 結算順序

```
value(target) = (base + Σ add) × Π(1 + mulPct)
                → 套用 override（多筆時取 sourceId 排序最高者）
                → 套用 clampMin / clampMax
```

**順序固定寫在 code，不可由資料改變。** 這是本模組唯一的業務知識。

---

## 5. Condition Schema

```ts
type Condition =
  | { readonly type: 'phase';       readonly value: Phase }
  | { readonly type: 'faction';     readonly value: FactionId }
  | { readonly type: 'chapterGte';  readonly value: number }
  | { readonly type: 'statGte';     readonly stat: StatPath; readonly value: number }
  | { readonly type: 'glowTier';    readonly value: GlowTier }
  | { readonly type: 'hasSkill';    readonly value: SkillId }
  | { readonly type: 'and';         readonly all: readonly Condition[] }
  | { readonly type: 'or';          readonly any: readonly Condition[] }
  | { readonly type: 'not';         readonly of: Condition };
```

`type` 亦需註冊表，未登記型別於載入時硬失敗。

---

## 6. 取代語意：不進管線 ★

關羽 60 級「取代 20 級效果」由引用層的 `supersedes` 宣告，**由來源模組（10 名士圖鑑）在 `collect()` 時過濾**。

```ts
interface EffectSource {
  collect(ctx: RunContext): readonly ResolvedEffectRef[];   // 已完成 supersedes 過濾
}

interface ResolvedEffectRef extends EffectRef {
  readonly sourceId: string;   // 'notable:guanyu@60'，供 explain() 溯源
}
```

若把取代邏輯放進管線，管線就得認識名士、天賦、寶物各自的規則，變成上帝物件。**這條界線必須守住。**

---

## 7. 公開介面

```ts
interface EffectResolver {
  resolve(target: TargetId, baseValue: number, ctx: RunContext): number;
  hasFlag(flag: FlagId, ctx: RunContext): boolean;
  chargesOf(charge: ChargeId, ctx: RunContext): number;
  consumeCharge(charge: ChargeId, ctx: RunContext): CommandOutcome;

  reactorsFor(eventKind: string, ctx: RunContext): readonly EventReactor[];
  overridesFor(point: DecisionPoint, ctx: RunContext): readonly RuleOverride[];

  explain(target: TargetId, ctx: RunContext): readonly EffectTrace[];
}

interface EffectTrace {
  readonly sourceId: string;      // 'notable:guanyu@60'
  readonly funcType: FuncType;
  readonly op: string;
  readonly value: number;
  readonly applied: boolean;      // false ＝ 條件未滿足
}
```

**`explain()` 必須在第一版就做。** 它同時是 UI 顯示「這個 +65% 是誰給的」的資料來源、平衡調校唯一有效的除錯工具、以及疊加行為的測試接口。後補的代價是所有消費端回頭改一次介面。

---

## 8. 不變量

1. 同一組 `EffectRef` ＋ 同一個 `RunContext` → `resolve()` 結果必然相同（純函式）
2. `explain()` 列出的貢獻，重新套用結算順序後必然等於 `resolve()` 的回傳值
3. 未註冊的 `funcType`、`target`、`condition.type` 一律在載入期硬失敗，不得到執行期
4. `consumeCharge` 對已耗盡的資源必回 `charge.exhausted` 拒絕，不得靜默 no-op

---

## 9. 刻意不做

- 不支援資料驅動的運算式（無 `eval`、無公式字串）
- 不支援效果之間互相引用或串接
- 不支援執行期新增 FuncType

---

## 10. Data Schema：17 個 FuncType

### 10.1 共用路徑型別

```ts
type FameKind  = 'civil' | 'martial' | 'moral';   // 文名 / 武名 / 善惡名（單一有正負號的軸）
type MeritKind = 'civil' | 'martial';             // 文功績 / 武功績
type CareerLine = 'civil' | 'martial';

type StatPath =
  | `attr.${Attr}`
  | `fame.${FameKind}`
  | `merit.${MeritKind}`
  | `career.${CareerLine}`;

type CurrencyPath = `fame.${FameKind}` | `merit.${MeritKind}`;
type EventKind = 'notable' | 'resident' | 'faction';
```

### 10.2 註冊表：FuncType → 整合點

| FuncType | Value | Reactor | Override |
|---|:--:|:--:|:--:|
| `StatModifier` | ● | | |
| `GlowUpgradeBonus` | ● | | |
| `GlowBaseWeight` | ● | | |
| `SlotBias` | ● | | |
| `EventRewardBonus` | ● | | |
| `EventDrawModify` | ● | | |
| `CheckValueBonus` | ● | | |
| `CurrencyBonus` | ● | | |
| `AffinityGrowth` | ● | | |
| `RevealInfo` | ● (flag) | | |
| `EventReroll` | ● (charge) | | ● |
| `SlotReroll` | ● (charge) | | ● |
| `CheckRetry` | ● (charge) | | ● |
| `CheckDowngradeRetry` | ● (charge) | | ● |
| `AffinityGrant` | | ● | |
| `FragmentDrop` | | ● | |
| `SkillGrant` | | ● | |

### 10.3 各表 Schema

所有表共用 `condition?: Condition`（省略 ＝ 恆常生效），以下不重複列出。

```ts
// 1. 通用數值修正（佔比最高）
interface StatModifierDef {
  readonly target: TargetId;
  readonly op: 'add' | 'mulPct' | 'override' | 'clampMin' | 'clampMax';
  readonly value: number;
}

// 2. 升階機率加成（第二層 RNG）
interface GlowUpgradeBonusDef {
  readonly scope: Attr | 'all';
  readonly chanceAdd: number;          // 加法，0.15 = +15%
}

// 3. 光階保底權重偏移（資質作用點，第一層 RNG）
interface GlowBaseWeightDef {
  readonly scope: Attr | 'all';
  readonly tierShift: number;          // 整檔位移，+2 = 保底往上兩檔
}

// 4. 名士站位機率偏移
interface SlotBiasDef {
  readonly attrWeights: Readonly<Partial<Record<Attr, number>>>;  // 乘性權重
}

// 5. 事件獎勵倍率
interface EventRewardBonusDef {
  readonly eventKind: EventKind | 'all';
  readonly mulPct: number;
}

// 6. 事件槽抽取數量與出現率
interface EventDrawModifyDef {
  readonly drawCountAdd: number;                                   // 可為 0
  readonly appearWeights: Readonly<Partial<Record<EventKind, number>>>;
}

// 7. 事件槽重抽
interface EventRerollDef {
  readonly usesPer: 'run' | 'chapter';
  readonly count: number;
}

// 8. 行動格重抽
interface SlotRerollDef {
  readonly usesPer: 'run' | 'chapter';
  readonly count: number;
}

// 9. 好感度授予（觸發型）
interface AffinityGrantDef {
  readonly timing: 'onDreamEnter' | 'onChapterStart';
  readonly targetRule: 'self' | 'randomRoster' | 'allRoster';
  readonly amount: number;
}

// 10. 好感度成長率
interface AffinityGrowthDef {
  readonly scope: 'self' | 'allRoster';
  readonly mulPct: number;
}

// 11. 碎片掉落（觸發型）
interface FragmentDropDef {
  readonly trigger: 'onGlowResult' | 'onCheckPass' | 'onEventComplete';
  readonly glowTier: GlowTier | null;      // trigger=onGlowResult 時必填
  readonly fragmentKind: 'notable' | 'treasure';
  readonly poolId: string | null;          // null = 掉落來源自身
  readonly count: number;
}

// 12. 檢定值加成
interface CheckValueBonusDef {
  readonly attr: Attr | 'all';
  readonly scope: 'minor' | 'major' | 'both';
  readonly add: number;
}

// 13. 檢定重擲
interface CheckRetryDef {
  readonly scope: 'minor' | 'major';
  readonly usesPerRun: number;
}

// 14. 直接解鎖一項能力（不含學費，見 32 §6）
interface UnlockGrantDef {
  readonly trait: TraitId | null;
  readonly skill: SkillId | null;
  readonly condition: Condition | null;
}

// 15. 授予技能（觸發型）
interface SkillGrantDef {
  readonly skillId: SkillId;
  readonly timing: 'onDreamEnter' | 'onUnlock';
}

// 16. 揭露資訊（旗標）
interface RevealInfoDef {
  readonly what: 'nextTurnSlots' | 'battleTrace';
}

// 17. 名聲／功績獲得量
interface CurrencyBonusDef {
  readonly currency: CurrencyPath | 'allFame' | 'allMerit';
  readonly mulPct: number;
}
```

**沒有一張表有 null 語意曖昧的欄位，也沒有一張表有萬用參數。**
`FragmentDropDef.glowTier` 與 `poolId` 的 null 是有明確語意的（不適用／自身），並由**規則驗證層**檢查一致性（見 02 §規則驗證）。

### 10.4 StatModifier 的 Target 註冊表

僅適用於 `StatModifier.target`。其他 FuncType 有各自的欄位詞彙。

| 分類 | Target |
|---|---|
| 鍛鍊 | `training.exp.{war,int,pol,cha,all}`、`training.noGlowBonus` |
| 名士 | `notable.startAffinity`、`notable.linkBonus` |
| 事件 | `event.rewardMul` |
| 檢定 | `check.value.{war,int,pol,cha}`、`check.majorValue` |
| 貨幣 | `currency.fame.{civil,martial,moral}`、`currency.merit.{civil,martial}` |
| 屬性 | `stat.{war,int,pol,cha}` |

> 與 `GlowUpgradeBonus` 等專屬 FuncType 的分工原則：**單純的加／乘走 `StatModifier`；需要額外維度（scope、timing、次數、機率）才另開 FuncType。**

---

## 11. 新增一種效果的完整步驟

1. `GDD.md` 描述玩法效果
2. 本檔 §10.2 登記 FuncType 與整合點
3. 新增 `content-source/core/effects/<func-type>.ts` 與其 Def 型別
4. Code 新增 `FuncType` 成員
5. Code 新增 Handler，實作適用的整合點介面
6. 註冊 Handler（由反向綁定斷言確認已接線）

**步驟 1–3 是資料與設計，4–6 是實作。消費端與結算管線在任何步驟都不需要修改。**
這是驗證本模組設計是否成功的唯一標準。
