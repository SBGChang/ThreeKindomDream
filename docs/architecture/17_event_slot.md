# 17 · 事件槽

> **職責**：依門檻抽出 0–3 個事件、執行選項的檢定、發放貨幣獎勵與事上磨練。
>
> | | |
> |---|---|
> | **owns** | `RunState.slots.event` |
> | **reads** | 18 檢定引擎、19 名士局內狀態、20 屬性與貨幣、21 官階、24 寶物 |
> | **handles** | `event.selectOption` / `event.reroll` |
> | **emits** | `event.slotRefreshed` / `event.completed` |
> | **ownsDefinitions** | `event`、`paramPool`、`dcCurve`、`eventYieldCurve` |

---

## 1. 定位：與鍛鍊互斥的另一半 ★

| 特性 | 規則 |
|---|---|
| 數量 | **0–3 個**（符合門檻者不足時遞減，可為 0） |
| 是否強制 | 否 —— 但「不做事件」＝**改選鍛鍊**，不是一個獨立動作 |
| 與鍛鍊的關係 | **互斥**。一回合只能投一個動作（15 §2） |
| 刷新 | 每回合**全部重抽**，未選中者消失 |

**做事件要花掉一整個鍛鍊回合。** 這是與舊雙槽制最大的差別，也是本模組所有
數值設計的前提：事件不再是免費贈品，它必須在數值上**值得放棄一次鍛鍊**。

### 1.1 上課 vs 工作

| | 鍛鍊（16） | 事件（17） |
|---|---|---|
| 產出 | 四維，**量大、有光階、會爆發** | 名聲／功績為主，**四維少量但穩定** |
| 隨機性 | 兩層 RNG（光階保底 ＋ 升階） | 檢定成敗（成功率可見） |
| 名士 | 站位加成、好感度 | 名士事件、好感度 |
| 買到什麼 | **進度**（過檢定 → 章節 → 圓夢） | **官階**（→ 結局稱號、輪迴點數） |

這正是《明星志願》裡上課與工作的分野：上課長能力，工作換錢與名氣。
兩邊都不可放棄 —— 只練不做事會有一身本事卻帶不動兵；只做事不練則兵多而打不動。

### 1.2 `skip` 已移除

舊設計有 `event.skip`（「不做事件」是一個獨立動作）。互斥之後它沒有語意了：
不做事件就是去鍛鍊。保留一個什麼都不做的動作，等於給玩家一個永遠不該按的按鈕。

因此 `EventResolution` 不再有 `kind: 'completed' | 'skipped'`，
`LifetimeStats.eventsSkipped` 也隨之改成 `actionsTraining` ／ `actionsEvent`
（「回合花在哪一邊」才是這個制度要度量的東西，見 15 §2.2）。

> **善惡名的守護仍然不需要機制成本**（GDD §8.5）。玩家不接髒活的方式從
> 「跳過」變成「改去鍛鍊」—— 代價從零變成一次鍛鍊的機會成本，
> 這讓守住善名比以前更有重量，而不是更輕。

---

## 2. 事件庫兩類架構 ★

單 Run 最多抽取 72 × 3 ＝ 216 次。若全部要求唯一，內容量不可能撐住。

| 類別 | `unique` | 供給策略 | 進圖鑑 |
|---|---|---|---|
| **委託型**（居民、陣營） | `false` | 模板 × 隨機參數 | ❌ |
| **劇情型**（名士事件、專屬事件） | `true` | 手寫，本 Run 觸發過即移出池 | ✅ |

> **設計理由**：委託本來就該是重複性的工作——「這個月又去討一次匪」符合現實邏輯。而名士事件是玩家追求的目標，重複出現會直接毀掉價值感。

委託不進圖鑑還有第二個理由：模板數量隨參數池變動，若進完成度分母，玩家的收集進度會因為策劃加了一個地名而倒退（見 12 §3）。

---

## 3. Data Schema

### 3.1 事件共通

```ts
interface EventDefinition extends DefinitionHeader {
  readonly kind: 'event';                       // 家族（不裝變體，見 00 §8.1）
  readonly eventKind: EventKind;                // 'notable' | 'resident' | 'faction'
  readonly unique: boolean;
  readonly collectible: boolean;
  readonly weight: number;                      // 抽取權重
  readonly requirements: readonly Condition[];  // 進池門檻，見 §4
  readonly bodyKey: L10nKey;
  readonly options: readonly EventOption[];
}
```

### 3.2 選項

```ts
interface EventOption {
  readonly labelKey: L10nKey;
  readonly requirements: readonly Condition[];   // 選項級門檻
  readonly check: EventCheckSpec | null;         // null ＝ 無檢定，直接結算
  readonly practice: readonly EventPractice[];   // 事上磨練，非空（見 §6.2）
  readonly rewards: readonly EventReward[];
  readonly moralDelta: number;                   // 善惡名傾向，可為負
}

interface EventPractice {
  readonly attr: Attr;
  readonly weight: number;                       // 1.0 主要能力 ／ 0.4 順帶 ／ 1.4 高強度
}

interface EventCheckSpec {
  readonly attr: Attr;
  readonly dcCurveId: string;                    // 依章節縮放，見 §3.4
}

type EventReward =
  | { readonly kind: 'fame';     readonly fame: FameKind;   readonly amount: number }
  | { readonly kind: 'merit';    readonly merit: MeritKind; readonly amount: number }
  | { readonly kind: 'attr';     readonly attr: Attr;       readonly amount: number }
  | { readonly kind: 'affinity'; readonly notableId: NotableId | 'eventOwner'; readonly amount: number }
  | { readonly kind: 'treasure'; readonly poolId: string | null; readonly treasureId: TreasureId | null }
  | { readonly kind: 'skill';    readonly skillId: SkillId };
```

**選項級門檻未達標時鎖定但仍顯示**，並附上所需條件——讓玩家知道下次該往哪養（GDD §8.6）。

`practice` 與 `rewards` 裡的 `attr` 是兩件不同的事，不可互相取代：

| | practice | reward.attr |
|---|---|---|
| 語意 | 做事本身的經驗累積 | 劇情級的一次性躍升 |
| 縮放 | 隨章節倍率 | 不縮放，作者手寫 |
| 覆蓋率 | **每個選項都有**（驗證強制） | 例外，少數劇情事件 |

早期版本用零星的 `reward.attr`（+4 智、+5 武）當作事件的四維產出。那在後段
會變成死數字 —— 第 9 章一次鍛鍊給近百點，委託給 +4 等於沒給。

### 3.3 委託模板

```ts
interface CommissionTemplateDefinition extends EventDefinition {
  readonly unique: false;
  readonly commissionKind: CommissionKind;       // 變體欄位
  readonly paramSlots: readonly ParamSlot[];
}

type CommissionKind = 'subdue' | 'procure' | 'reclaim' | 'escort' | 'errand' | 'festival';

interface ParamSlot {
  readonly name: string;      // 佔位符名稱，對應 bodyKey 中的 {name}
  readonly poolId: string;
}

interface ParamPoolDefinition extends DefinitionHeader {
  readonly kind: 'paramPool';
  readonly entries: readonly L10nKey[];          // 地名、委託人、賊名、物資…
}
```

參數填充由 [28 文本模板](28_text_template.md) 執行；本模組只負責**抽出參數值**（需要 `rng`，屬玩法）。

### 3.4 DC 曲線（共享）

```ts
interface DcCurveDefinition extends DefinitionHeader {
  readonly kind: 'dcCurve';
  readonly byChapter: readonly number[];         // index ＝ chapterIndex − 1
}
```

多個模板共享同一條曲線。長度須 ≥ 最長序列章節數，否則載入失敗。

### 3.5 事件產出曲線

```ts
interface EventYieldCurveDefinition extends DefinitionHeader {
  readonly kind: 'eventYieldCurve';
  readonly baseByAttr: Readonly<Record<Attr, number>>;  // 每點 practice 權重的值
  readonly chapterMultiplier: readonly number[];        // 四維與貨幣共用
  readonly failRatio: number;                           // 檢定失敗仍給的比例
}
```

形狀刻意與 16 §1.4 的 `TrainingCurveDefinition` 對齊：
**「上課 vs 工作」的差距就是這兩張表 `baseByAttr` 的比值**，只有一個平衡旋鈕。

`chapterMultiplier` 同時縮放四維與貨幣，因為它們是同一件事的兩面 ——
後期的委託是更大的任務，出的力更多，拿到的名聲功績也更多。

---

## 4. 門檻與抽取

### 4.1 統一使用 `Condition` ★

事件門檻**不另定一套型別**，直接用 01 §5 的 `Condition`。`Condition.statGte` 的 `StatPath` 已涵蓋 `fame.*`／`merit.*`／`career.*`／`attr.*`。

> 好處是只有一個條件註冊表、一個驗證器、一套測試。若各模組自訂門檻型別，「武名 ≥ 80」會出現兩種寫法而語意可能微妙不同。

### 4.2 抽取邏輯

```
可抽池 = 全事件庫
       ∩ requirements 全部滿足（Condition 求值）
       ∩ unique 且本 Run 已觸發者排除
       ∩ eventKind 對應階段可用（faction 類需 faction ≠ null）
          ↓
       依 weight × Σ EventDrawModify.appearWeights 加權
          ↓
       抽出 0 ～ (3 + Σ EventDrawModify.drawCountAdd) 個   ← rng 'event.draw'
```

**「不足就少、完全不符就 0」是門檻設計最直觀的體現** —— 養不夠就沒得挑，甚至沒得看。這是遊戲早期天然的教學曲線：新手前幾輪事件槽多半空著，只需先學會鍛鍊槽。

### 4.3 名士事件的額外門檻

名士事件除了 `requirements`，還需要**該名士在本輪陣容中**且**局內好感度已達對應階段**。這由 19 發出的 `notable.eventUnlocked` 驅動：事件在解鎖前不進可抽池。

---

## 5. State

```ts
interface EventSlotState {
  readonly offers: readonly EventOffer[];        // 0..3
  readonly resolved: EventResolution | null;     // 已結算（＝本回合的動作是事件）
  readonly seenUniqueIds: readonly EventDefId[]; // 本 Run 已觸發的唯一事件
}

interface EventOffer {
  readonly eventDefId: EventDefId;
  readonly params: Readonly<Record<string, L10nKey>>;   // 模板參數，唯一型為空
  readonly optionStates: readonly OptionState[];
}

interface OptionState {
  readonly enabled: boolean;
  readonly blockedBy: readonly Condition[];        // 未滿足的條件，供 UI 顯示
  readonly successRate: number | null;             // 見 18；無檢定時為 null
  readonly practicePreview: readonly AttrGain[];   // 成功時的磨練產出，見 §6.2
}

// 沒有 skipped —— 互斥之後「不做事件」＝改選鍛鍊（§1.2）
interface EventResolution {
  readonly offerIndex: number;
  readonly optionIndex: number;
  readonly passed: boolean;
  readonly practiceGained: readonly AttrGain[];
}
```

`offers` 與 `params` 必須進存檔，理由同 16 §3.1。

### 5.1 `practicePreview` 是必要的，不是裝飾

互斥之後，玩家每回合都要拿事件選項跟鍛鍊格**比大小**。若事件只顯示成功率而不
顯示磨練值，那個比較就無法進行 —— 玩家只知道「會拿到名聲」，不知道放棄了多少四維。

因此它與 16 的 `expectedGain` **同單位**，UI 得以並排呈現：

```
鍛鍊　演武   銀光   武≈16　升階 15%
事件　流寇之患  擊退了便算 79% 武+4  │  一個不留 31% 武+6
```

### 5.2 一個回合只能有一種 resolved

`resolved !== null` 與 `slots.training.selected !== null` **不得同時成立**。
這條由 15 的 `assertActable` 在指令入口守門，不在本模組重複實作（15 §2）。

---

## 6. 執行

```
event.selectOption(offerIndex, optionIndex)
  ├ 檢查本回合尚未行動                     → 否則 turn.already-acted（15 §2）
  ├ 檢查 optionStates[i].enabled          → 否則 threshold.not-met
  ├ 若 check ≠ null → 交 18 檢定引擎判定（小檢定）
  │     └ 失敗 → 無 rewards，但【不導向結局】（GDD §2.2）
  ├ 成功 → 逐筆套用 rewards（fame／merit 乘章節倍率，見 §6.4）
  ├ 成功 → 套用 moralDelta 到善惡名
  ├ 無論成敗 → 套用 practice（失敗打 failRatio 折，見 §6.3）
  ├ unique → 加入 seenUniqueIds
  └ emit event.completed
```

### 6.2 事上磨練

```
amount = baseByAttr[attr] × chapterMultiplier[chapter−1] × weight × ratio
       → EffectResolver.resolve('event.practice.<attr>', amount)
```

乘法鏈的形狀刻意與 16 §4 對齊，但**沒有光階、沒有名士站位** —— 那兩者只屬於
鍛鍊槽（GDD §4.2）。事件的四維產出是「穩定但小」，鍛鍊才是會爆發的那一邊。

`event.practice.all` 對四維各自的 target 都生效，與 `training.exp.all` 同一套通則。

### 6.3 檢定失敗仍給磨練 ★

`ratio = passed ? 1 : failRatio`。

**這個下限是互斥制度逼出來的，不是慈悲。** 做事件要花掉一整個鍛鍊回合；
若失敗等於顆粒無收，事件在高 DC 下會被鍛鍊完全支配，整個事件系統會死掉。
留下 `failRatio` 的比例，「事情辦砸了但人還是走過那一趟」既合理又救活了決策。

`failRatio` 是資料。設成 0 就回到舊行為 —— 那時請一併確認事件仍值得選。

### 6.4 貨幣獎勵隨章節縮放 ★

| reward kind | 是否隨 `chapterMultiplier` 縮放 | 理由 |
|---|---|---|
| `fame` / `merit` | ✅ | 對照的是官階門檻（30 → 1830），不長就等於白做 |
| `attr` | ❌ | 劇情級的一次性躍升，作者手寫 |
| `affinity` | ❌ | 好感度是 0..100 的有界軸，縮放會爆掉階段判定 |
| `moralDelta` | ❌ | 善惡名是 ±100 的有界軸 |

作者寫死的固定值在後段會失效：第 9 章一則委託給 22 功績，對照官階門檻 1830
等於沒給。這與 §3.2 的四維問題同一類 —— **乘法縮放的遊戲裡不能放固定值**。

### 6.5 已攜帶寶物的獲得事件

若 `rewards` 含 `treasure` 且該寶物**本輪已持有**，選項標籤必須顯示為「〈青釭劍〉（碎片 ×N）」（GDD §9.5）。

本模組向 24 查詢持有狀態並產出顯示資訊；**碎片轉換的判定在 24**，不在此處。避免玩家在二選一事件中不知道自己放棄了碎片。

---

## 7. 重抽

`event.reroll` 消耗 `charge.eventReroll`（來自 `EventReroll` 效果，例如荀彧 50 級）。重抽重新執行 §4.2 全部流程。

---

## 8. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `paramSlots[i].poolId` 引用的池存在且**非空** | 否則 `rng.pick` 會 throw |
| `bodyKey` 的佔位符集合 ⊇ `paramSlots` 的 `name` 集合 | 否則有參數抽了沒用到 |
| `bodyKey` 的佔位符集合 ⊆ `paramSlots` 的 `name` 集合 | 否則有佔位符填不出來 |
| `unique === false` ⇒ `collectible === false` | 模板不得進圖鑑分母 |
| `eventKind === 'faction'` ⇒ `requirements` 含 faction 條件 | 否則會在南華村篇抽到 |
| `dcCurveId` 存在且長度足夠 | 引用完整性 |
| `options` 非空 | 否則事件無法結束 |
| `weight > 0` | 否則永遠抽不到（等於死內容） |
| **每個選項的 `practice` 非空** | 做了事卻學不到東西，事件就只是資源販賣機 |
| `practice[i].weight > 0` | 宣告了卻不生效的死資料 |
| 同一選項的 `practice` 不重複 `attr` | 否則數值來源分散，調校時看不出總量 |
| `eventYieldCurve` 恰好一筆 | `registry.single()` 會在執行期 throw |
| `eventYieldCurve.chapterMultiplier` 覆蓋最長序列總章數 | 否則後段落回 fallback，玩得到但數值是錯的 |
| `chapterMultiplier` 單調不減且 > 0 | 否則升章變成減益 |
| `failRatio ∈ [0, 1]` | 它是折扣不是倍率 |

---

## 9. 不變量

1. `offers.length ≤ 3 + Σ drawCountAdd`
2. `offers` 內無重複 `eventDefId`
3. `seenUniqueIds` 內的事件不再進可抽池
4. `resolved !== null` ⇒ 本回合的動作是事件，`slots.training.selected === null`（15 §2）
5. 小檢定失敗**不寫入 `RunState.ending`**（只有戰役的戰敗才會），且仍給 `failRatio` 折後的磨練
6. 同一 `(seed, cursors, state)` → 抽出完全相同的 offers 與 params

---

## 10. 刻意不做

- 不做事件排隊或保留（未選即消失是刻意設計）
- 不做「跳過事件」動作（互斥之後它等於改選鍛鍊，見 §1.2）
- 不做事件的玩家主動觸發
- 不在此模組計算檢定成功率（那是 18）
- 不在此模組判定寶物重複（那是 24）
