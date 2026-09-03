# 32 · 養成兌現

> **職責**：持有四類經驗池與本輪解鎖清單，並作為**經驗 → 能力的唯一兌換點**。
>
> | | |
> |---|---|
> | **owns** | `RunState.growth` |
> | **reads** | 01 效果系統、20 屬性與貨幣、23 特質與技能 |
> | **handles** | `exp.grant`（內部，來自 16／17）／`learn.attr`／`learn.trait`／`learn.skill`／`unlock.grant`（內部） |
> | **emits** | `exp.gained` / `attr.learned` / `trait.learned` / `skill.learned` / `unlock.granted` |
> | **ownsDefinitions** | `growthRule` |

> 決議來源見 [RFC-01](../RFC-01-campaign-rework.md) D30–D40。

---

## 1. 為什麼需要這個模組

現況 [training.ts](../../src/modules/training.ts) 把鍛鍊產出**直接寫進**
`AttributeState.values`。於是：

- 玩家沒有「這些點數要花在哪」的決策 —— 產出是既定的，不是可分配的
- 特質與技能沒有一個購買它們的貨幣，只能靠事件白給
- 「練什麼」與「變成什麼」之間沒有中間層，因此沒有取捨

這個模組就是那個中間層。**它是唯一的兌換點**：經驗進，數值／特質／技能出。
與 26 結算是 `RunState → MetaState` 的唯一交接點同一個理由 —— 把單一寫入點做成
模組邊界，「產出總和 − 消耗總和 ＝ 餘額」才是可斷言的不變量。

---

## 2. State

```ts
interface GrowthState {
  readonly exp: Readonly<Record<Attr, number>>;      // 四類經驗池，不共用
  readonly unlockedTraits: readonly TraitId[];        // 本輪可學
  readonly unlockedSkills: readonly SkillId[];
}
```

### 2.1 四類不共用

`武／統／智／政` 各一池，對應 16 的四格鍛鍊。**共用一個池會讓「這回合練哪一格」
失去意義** —— 那是回合制唯一的長期決策，不能被一個萬用貨幣抹平。

### 2.2 解鎖清單只在本輪有效

夢醒即銷毀。跨輪的預先解鎖若要做，走 09 天命商店（RFC-01 D37）。
12 收集圖鑑仍記錄「你學過什麼」，那是收集品不是進度。

---

## 3. Data Schema

```ts
type AttrGrade = 'G' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

interface GrowthRuleDefinition extends DefinitionHeader {
  readonly kind: 'growthRule';
  readonly bands: readonly AttrCostBand[];      // 依 min 遞增，無洞無重疊，覆蓋 0..attrMax
  readonly teachStage: Readonly<Record<AbilityTier, AffinityStage>>;   // 向名士學的好感門檻
  readonly startMin: number;                    // 入夢時的起始四維範圍
  readonly startMax: number;
}

interface AttrCostBand {
  readonly grade: AttrGrade;
  readonly min: number;            // 下界（含）
  readonly max: number;            // 上界（含）
  readonly costPerPoint: number;
}
```

特質與技能的消耗**掛在它們自己的 Definition 上**（23 §2），不在這裡另立一張表 ——
否則同一件事會有兩份資料。這個模組只負責**讀那個 cost 並執行扣款**。

### 3.1 價格帶 ＝ 等級帶 ★

| 評 | 分數 | 每點消耗 | 進入該級的累計 |
|---|---|---|---|
| **G** | 0 | — | 0 |
| **F** | 1–19 | 4 | 4 |
| **E** | 20–39 | 8 | 84 |
| **D** | 40–59 | 16 | 252 |
| **C** | 60–74 | 28 | 584 |
| **B** | 75–84 | 44 | 1020 |
| **A** | 85–94 | 76 | 1492 |
| **S** | 95–100 | 136 | 2312 |

（練滿 100 累計 **2992**。）

**成本區間與等級邊界對齊是刻意的**：玩家看到「武 B」就知道下一點要付 44。
七個價格帶 ＝ 七個等級，不需要額外教學，也不需要在 UI 另外解釋成本曲線。

> **這張表【與能力消耗表一起 ×1.5】過一次** ★
> 事件經驗改成「基礎值 × 星數」（玩家訂的規矩）之後收入漲了四成，
> 舊表下最強的策略四維全部點到 82 以上 —— **買得完，就沒有取捨**。
> 只動一邊會讓取捨偏向便宜的那一邊，所以兩張表必須同時動。
>
> **實測**（13 策略 × 300 輪，四章）：一輪總經驗 **3630–6312**。
>
> | 玩法 | 四維終值 | 特質 |
> |---|---|---|
> | 專精 `focus-martial` | 統54 武**85** 智48 政46 | 4.5 |
> | 均衡 `greedy-gain` | 統71 武69 智61 政56 | 5.2 |
> | 關係 `encounter-chaser` | 統79 武73 智68 政67 | 6.2 |
>
> **專精者四章走完摸到 A 帶（1492），S 帶（2312）留給後五章。**
> 均衡者一維都上不了 A，換來的是多一半的特質 —— 那就是這張表要產出的決策。
> 所有策略都剩 **478–743 未花（總量的 12–13%）—— 買不完。**

### 3.2 起始四維是 15–30，不是 0 ★

逐維獨立擲（`growthRule.startMin` / `startMax`）。全 0 開局有三個問題：

1. 第一場戰役**打不出任何傷害** —— 傷害 = 兵量 × ratio × (attr/50)，attr 為 0 就是 0
2. 等級表上四個 **G 看不出角色性格**
3. F 帶每點 4 經驗，**前 20 點便宜到根本不構成決定**

四維各自不同，於是「這一輪我是誰」從第一個畫面就成立 ——
玩家因此有理由順著抽到的底子走，而不是每輪照同一套練。

（`checkRule.baseFloor` 的存在感也因此下降：它本來是在遮全 0 開局的洞。）

---

## 4. 三張消耗表的分工

| | 消耗 | 稀缺在哪 |
|---|---|---|
| **數值** | 階梯計價（§3.1） | 越高越貴 |
| **特質** | 多類混合，不佔格 | 經驗總量 |
| **技能** | 多類混合，**只有 3 格** | 格數 |

### 4.1 混合消耗是專精者的天花板 ★

| 階 | 特質 | 技能 |
|---|---|---|
| 常 | 單類 150 | 單類 210 |
| 良 | 220 ＋ 150 | 280 ＋ 210 |
| 絕 | 300 ＋ 220 ＋ 150 | 380 ＋ 280 ＋ 210 |

**純專精買不起絕階** —— 他沒有另外兩類的經驗。這與階梯計價形成方向相反的夾擠：

| | 拿得到 | 拿不到 |
|---|---|---|
| **專精** | 高數值（前段階梯便宜） | 絕階 |
| **均衡** | 絕階（四類齊全） | 高數值（後段階梯貴） |

**這條軸線是兩張表自己夾出來的，不是額外規則。** 它同時修掉一個現存問題：
GDD §5.4 實測「追爆發明顯最差」，也就是專精目前是無條件正解。

實測（13 策略 × 300 輪，四章）：專精收在 **武85、特質 4.5**；
均衡收在 **統71 武69、特質 5.2**；投資關係的收在 **統79 武73、特質 6.2**。
「A 級帶四條特質」與「均衡帶六條」兩端都走得通，而且**沒有一端支配另一端**
（點數 6578–9956，差 51%，而墊底的是賭得最兇的 `risk-seeking`）。

### 4.2 機會成本的驗算

| 玩家站在 | 每點數值 | 一個常階特質（150）等於 | 一個絕階（670）等於 |
|---|---|---|---|
| A 帶（專精） | 76 | 2 點數值 | 買不起（沒有另外兩類） |
| C 帶（均衡） | 28 | 5 點數值 | 24 點數值 |

兩邊都落在「有感但不致命」的位置 —— 這是這組數字唯一的設計目標。

### 4.3 技能貴四成，因為它是行動

技能是你每一回合的行動，特質是常駐。但技能**只有 3 格**，所以學第 4 個技能的
理由只有一個：不同章節的敵人性質不同，你要換帶（33 §3）。

**特質不佔格 —— 買得起就一直帶著。** 兩者因此是不同種類的決策：
特質是經濟決策，技能是編組決策。

---

## 5. 解鎖層

**一切都要先解鎖，含常階。** 這是與實況的分野（實況除金特外可直接以經驗點購買）。

| 來源 | 規則 | 狀態 |
|---|---|---|
| **名士傳授** | **他能教的，就是他自己表上有的**（19 §5）。好感達該項門檻 → 進入可學清單 | ✅ |
| **道具** | `UnlockGrant` 效果。〈孟德新書〉→〈節制〉、〈奉孝遺書〉→〈料敵〉 | ✅ |
| **戰役的深關** | `EventReward.unlock`，只在第 4 關之後 | ✅ |
| **事件／委託** | `EventReward.unlock` | ⬜ 尚無內容用它 |
| **官階** | 升階時授予對應線的項 | ⬜ 未做 |

**名士傳授是主要來源**，其餘三條是它的補充 —— 道具那條的意義是
**時機**：名士那層要七到十個回合才打得開，道具第一回合就開。

### 5.1 不需要「誰能教什麼」這張表 ★

名士的能力表**就是**他的教學表。推導出兩個結果：

1. 內容作者一人一張表寫完，不會有兩份資料互相漂移
2. 玩家看得懂 —— **你能學什麼，取決於你這輩子跟誰共處過**

### 5.2 解鎖與學習是兩道獨立的門

```
未解鎖  → 顯示，但不可學，並顯示解鎖來源（誰能教）
已解鎖  → 顯示價碼；經驗不足時顯示還差多少
已學    → 不可再學（拒絕，非 no-op —— 見 §7.2）
```

**未解鎖的項目仍然要顯示。** 與 17 §3.2 的選項處理同一個判準：
看不見的東西不會讓玩家想去達成它的門檻。

---

## 6. 道具的三種降耗

三種裡有兩種**完全不需要新機制** —— 它們是既有 `StatModifier` 指到新的 target
（RFC-01 D39）。只有「直接解鎖」需要一個新的 FuncType，因為它給的不是數值。

| 類型 | 機制 | 作用 |
|---|---|---|
| **折扣** | `StatModifier` → `learn.cost.<attr>` | 某一類經驗的學費打折 |
| **階梯緩和** | `StatModifier` → `learn.bandShift` | 計價時把現值往下移一帶（B 帶按 C 帶算） |
| **直接解鎖** | `UnlockGrant`（新） | 讓某項進入可學清單（**不含學習費**） |

**我們沒有會消耗的道具** —— 三種全部是買斷型的常駐效果，
與 GDD §9.1「寶物 ＝ 買斷型 Buff」一致。

**「直接解鎖」不含學習費是刻意的**：否則道具會同時繞過兩道門，
而 §5.2 的兩道門是這套設計的核心。

---

## 7. 公開介面

```ts
interface GrowthQuery {
  gradeOf(attr: Attr, ctx: RunContext): AttrGrade;
  // 從現值買到 target 的總價（已含折扣與階梯緩和）
  attrCost(attr: Attr, target: number, ctx: RunContext): number;
  // 下一級的價碼 —— UI 的主要顯示
  nextGrade(attr: Attr, ctx: RunContext): { grade: AttrGrade; at: number; cost: number } | null;
  learnableTraits(ctx: RunContext): readonly TraitOffer[];
  learnableSkills(ctx: RunContext): readonly SkillOffer[];
}

interface TraitOffer {
  readonly def: TraitDefinition;
  readonly tier: AbilityTier;
  readonly cost: Readonly<Partial<Record<Attr, number>>>;   // 已含折扣
  readonly state: 'learnable' | 'locked' | 'unaffordable' | 'learned';
  /** 誰能教這一項、以及他現在教不教得動。locked 時 UI 要把它顯示出來。 */
  readonly teachers: readonly { notableId: NotableId; ready: boolean }[];
}

interface GrowthService {
  learnAttr(attr: Attr, target: number, ctx: RunContext): CommandOutcome;
  learnTrait(id: TraitId, ctx: RunContext): CommandOutcome;
  learnSkill(id: SkillId, ctx: RunContext): CommandOutcome;
}
```

### 7.1 學習沒有隨機，因此收 `RunContext` ★

三個 `learn*` 全部收 `RunContext`（無 RNG）。這是型別層面的保證：
**兌換不得引入隨機**，不需要人工審查（03 §2 的同一個手法）。

這也讓學習畫面可以任意預覽而不消耗 cursor。

### 7.2 重複學習是**拒絕**，不是冪等 no-op ★

與 23 舊版的 `skill.learn` 不同 —— 舊版技能是白給的，冪等 no-op 合理。
現在學習**要扣款**，靜默 no-op 會讓「已扣款但沒東西」與「沒扣款」無法區分。

因此：已學的項目回 `already-learned` 拒絕。UI 端本來就該把它顯示為 `learned`
而非可按，所以這條拒絕只是防禦。

### 7.3 學習不佔行動、隨時可做

它不是行動決策，而且數值會擋事件門檻（17 §3.2），玩家有理由早花。
把它 gate 在章末只會讓玩家忘記自己有經驗沒花。

---

## 8. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `bands` 覆蓋 `0..attributeCap.attrMax`，無洞無重疊 | 否則某個數值區間算不出價 |
| `bands` 的 `grade` 不重複、依 `min` 遞增 | 等級與價格帶一對一是 §3.1 的前提 |
| `costPerPoint` 沿 `bands` 嚴格遞增 | 否則會有「往上比較便宜」的區段 |
| `attributeCap.attrMax === 100` | 0–100 是 RFC-01 D30 的規格；等級表寫死在文案裡 |
| 每個 `trait` / `skill` 的 `cost` 非空 | 免費的能力會讓整套經濟失去意義 |
| `cost` 的類數與其 `tier` 相符（常 1／良 2／絕 3） | 混合消耗是 §4.1 的機制本體，不能被個別內容繞過 |
| 每個 `collectible` 的 `trait` / `skill` 至少有一個解鎖來源 | 否則圖鑑分母有永遠拿不到的項目（沿用 23 舊規則） |
| `UnlockGrant` 引用的 id 存在 | 引用完整性 |

倒數第二條特別重要：它擋下「寫了特質但忘了掛在任何名士或道具上」——
那不會有任何測試失敗，玩家卻永遠學不到。

---

## 9. 不變量

1. `exp` 各類**只增不減**，唯一的減少路徑是 `learn.*` 的扣款
2. **扣款與授予在同一筆交易** —— 不存在「扣了款沒拿到」的中間狀態
3. `learn.attr` 不得使目標值超過 `attrMax`
4. 未出現在 `unlockedTraits` / `unlockedSkills` 的項目不得被學習
5. `attrCost(attr, target)` 是純函式，不消耗 RNG cursor
6. `attrCost` 的分段求和與逐點求和結果相同（可測）
7. 學習不可撤銷、不退款
8. 同一 `(exp, attributes, learned, unlocked, effects)` → 相同的 `learnableTraits` 結果

---

## 10. 刻意不做

- **不做退款或重置**（洗點）。它會把每一次學習從決定降級為草稿
- **不做經驗值互換**（武經驗換智經驗）。四類不共用是 §2.1 的機制本體
- **不做經驗上限或衰減**。囤積本來就有代價 —— 數值擋著事件門檻
- **不做特質格數上限**。技能的稀缺在格數，特質的稀缺在經濟，兩者刻意不同（§4.3）
- **不做跨輪解鎖繼承**（RFC-01 D37）
- **不做學習的隨機成敗**。兌換是玩家唯一完全可控的一層，加隨機會抹掉它的定位
