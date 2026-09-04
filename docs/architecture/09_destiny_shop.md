# 09 · 天命商店

> **職責**：把輪迴點數換成入夢前的能力上限與可選項。
>
> | | |
> |---|---|
> | **owns** | `MetaState.shop` |
> | **reads** | 08 點數帳本 |
> | **handles** | `shop.purchase` |
> | **emits** | `shop.purchased` |
> | **ownsDefinitions** | `shopItem` |

---

## 1. Data Schema

```ts
interface ShopItemDefinition extends DefinitionHeader {
  readonly kind: 'shopItem';                       // 家族（不裝變體，見 00 §8.1）
  readonly category: ShopCategory;
  readonly levels: readonly ShopLevel[];           // 階梯式，1-based 連續
  readonly requiresItems: readonly ShopItemId[];   // 前置品項（須已購滿）
  readonly requiresPack: PackId | null;            // 陣營包相依
}

type ShopCategory = 'aptitude' | 'talent' | 'career' | 'bond' | 'glow';

interface ShopLevel {
  readonly level: number;
  readonly cost: number;        // 輪迴點數
  readonly grant: ShopGrant;
}
```

### 1.1 ShopGrant：明確列舉，不用萬用欄位

購買的產出是異質的（有些改配置上限、有些解鎖可選項、有些是局內效果）。用 discriminated union 逐一列出，讓驗證與 UI 都能靜態處理：

```ts
type ShopGrant =
  | { readonly kind: 'aptitudeCap';    readonly attr: Attr; readonly toGrade: AptitudeGrade }
  | { readonly kind: 'aptitudePoints'; readonly delta: number }
  | { readonly kind: 'talentPoints';   readonly delta: number }
  | { readonly kind: 'treasureSlots';  readonly delta: number }
  | { readonly kind: 'factionBond';    readonly factionId: FactionId; readonly toLevel: number }
  | { readonly kind: 'unlockTalent';   readonly talentId: TalentId }
  | { readonly kind: 'effect';         readonly ref: EffectRef };
```

前六種改變**入夢配置的合法範圍**（由 14 消費）；最後一種是**局內效果**，走既有的 FuncType 管線（升階機率就用 `GlowUpgradeBonus`）。

> **為什麼不全部走 EffectRef**：資質上限、配帶點數、攜帶格都是「配置階段的合法性約束」，不是局內某個計算點的修正。硬塞進效果系統會讓 14 入夢配置反過來依賴效果解析，而配置階段還沒有 `RunContext`。

### 1.2 State

```ts
interface ShopState {
  readonly purchased: Readonly<Record<ShopItemId, number>>;   // itemId → 已購到第幾級（0 ＝ 未購）
}
```

只存等級，**不存衍生結果**。上限、預算、可選池全部由 `purchased` ＋ Definition 現算——否則加一個品項就要 migration。

---

## 2. 對應 GDD §11 的品項

| 品項 | category | grant | 買到什麼 |
|---|---|---|---|
| **官途（5→12 階）** ★ | `career` | `careerCap` | **新的稱號** |
| 資質上限（四維各一條） | `aptitude` | `aptitudeCap` | **更高的四維天花板** ＋ 產量倍率 |
| 初始資質配點 | `aptitude` | `aptitudePoints` | 把天花板分配到哪一維 |
| 天賦解鎖（逐一） | `talent` | `unlockTalent` | 新的可選項 |
| 天賦配帶點數 | `talent` | `talentPoints` | 一次帶幾個 |
| 勢力緣分・魏（0→3） | `bond` | `factionBond` | 指定上司的名額（`requiresPack: pack:wei`） |
| 升階機率（15%→40%） | `glow` | `effect` → `GlowUpgradeBonus` | 產量 |

### 2.1 「買什麼」那一欄是這張表的重點 ★

實測「第一輪 對 天命全滿」抓到的病：**買「更快」沒有跨輪成長，買「新東西」才有。**

改之前商店只賣產量倍率（資質倍率、配點、升階機率），而產量的出口
（四維）有硬上限、又走階梯計價 —— 於是把產量翻倍只換到四維 +15，
第一輪就拿到全滿的 85%。對照組是特質（45%），它靠的是【解鎖】。

所以這一版把兩個**天花板**加進來：〈官途〉買官階上限、〈資質上限〉
同時買四維上限。詳見 [14 §2.1.1](14_dream_entry_config.md)。

（`treasure` 那一類已刪除：道具攜帶格改由 `gameRules.carrySlots` 直接給，
不再是商店品項 —— 而它目前**沒有入口**，見 §5 的內容債。）

**`requiresPack` 是必要的**：只安裝 `core + pack:wei` 的玩家不該在商店看到買不到用處的蜀吳緣分。未安裝對應 pack 的品項走「功能不啟用」出口——不註冊、不出現在清單、UI 不顯示。

---

## 3. 購買規則

```ts
interface Shop {
  catalog(meta: MetaState): readonly ShopEntry[];
  purchase(itemId: ShopItemId, meta: MetaState): CommandOutcome<MetaState>;
}

interface ShopEntry {
  readonly itemId: ShopItemId;
  readonly currentLevel: number;
  readonly nextLevel: ShopLevel | null;      // null ＝ 已購滿
  readonly affordable: boolean;
  readonly blockedBy: readonly ShopItemId[]; // 未滿足的前置
}
```

- 只能**逐級購買**，不可跳級
- 前置品項未購滿 → `threshold.not-met` 拒絕
- 點數不足 → `threshold.not-met` 拒絕
- `requiresPack` 未安裝 → `capability.disabled` 拒絕（且該品項本來就不該出現在 catalog）
- **不可退款**（無退款需求，也避免 grant 反向套用的複雜度）

### 3.1 catalog 回傳 `blockedBy` 而非隱藏

前置未滿足的品項**照樣列出但標示阻擋原因**。roguelite 的元進度需要讓玩家看得到目標——隱藏未解鎖項目會讓「該往哪存點數」失去方向。

`requiresPack` 未安裝是唯一該完全隱藏的情況（那不是進度問題，是內容不存在）。

---

## 4. 依賴圖必須是 DAG

`requiresItems` 構成有向圖，載入時檢查：

| 檢查 | 失敗行為 |
|---|---|
| 無循環 | 拒絕啟動 |
| 前置引用的 itemId 存在 | 拒絕啟動 |
| `levels` 的 `level` 從 1 起連續遞增 | 拒絕啟動 |
| `cost` 沿等級單調不減 | 拒絕啟動 |
| `aptitudeCap.toGrade` 沿等級單調上升 | 拒絕啟動 |
| `factionBond.toLevel` 沿等級單調上升且 ≤ 3 | 拒絕啟動 |

---

## 5. 不變量

1. `ShopState.purchased` 的每個值都 ≤ 該品項的 `levels.length`
2. 任何已購買的品項，其全部前置也已購滿
3. 由 `purchased` 重算的配置上限與 UI 顯示的完全一致（無快取）
4. `purchase` 成功 ⟺ 點數帳本恰好扣除 `nextLevel.cost`
5. **每一個品項都要能回答「它買到什麼新東西」** —— 只賣產量倍率的品項
   在跨輪尺度上是隱形的（§2.1 的實測）

### 5.1 未清的內容債：三條蓋好卻碰不到的跨輪線 ★

| 線 | 程式 | 玩家 |
|---|---|---|
| **道具攜帶** `carriedItems` | `gameRules.carrySlots`、`item.seedCarried` 都在跑 | `emptyDraft` 寫死 `[]`，**沒有任何畫面設定它** |
| **道具階級** `itemCodex` | 每件道具 6 階、碎片升階、結算算出 `itemFragments`／`itemTierRaised` | **沒有畫面** |
| **名士星階** `notableCodex` | 決定可選招與起始好感 | 只在天命畫面列出，看不到「差幾片」以外的東西 |

第一條特別要緊：高階道具 `perRunCap = 1`，那唯一一次是「首次獲得」而不是重複，
**所以不帶進場就永遠拿不到碎片** —— 整條道具的跨輪成長卡在一個不存在的入口上。

（局內【持有中】的道具已經看得見了：狀態列的「隨身」列，含效果說明。）

---

## 6. 刻意不做

- 不做限時品項、折扣、隨機商店
- 不做退款或洗點
- 不做商店內的即時預覽模擬（那是 14 入夢配置的職責）
