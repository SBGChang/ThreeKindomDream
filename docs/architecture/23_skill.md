# 23 · 特質與技能

> **職責**：持有本輪已學的**特質**與**技能**，作為 `EffectSource`（特質），
> 並提供 33 戰役的行動定義（技能）與事件分支的判定依據。
>
> | | |
> |---|---|
> | **owns** | `RunState.abilities` |
> | **reads** | 01 效果系統 |
> | **handles** | 無（學習一律經 32 —— 唯一兌換點） |
> | **emits** | `trait.learned` / `skill.learned` |
> | **ownsDefinitions** | `trait`、`skill` |

> ♻️ **本文件已依 [RFC-01](../RFC-01-campaign-rework.md) 重寫，並且已實作。**
> 舊版的「刻意不做」第三條寫著「不做主動使用技能（全部為被動與分支解鎖）」——
> 那一條被 D17 推翻：技能現在是**戰役裡每回合的行動**。
> 舊版的 State slice 名為 `skills`，現改為 `abilities`（它同時持有特質）。

---

## 1. 兩種能力，兩種稀缺

| | 是什麼 | 稀缺在哪 | 誰消費 |
|---|---|---|---|
| **特質** | 常駐被動 | **經驗總量**（不佔格） | 01 效果系統 |
| **技能** | 戰役中的行動 | **只有 3 格** | 33 戰役 |

**兩者刻意用不同種類的稀缺**（32 §4.3）：特質是經濟決策（買得起就一直帶著），
技能是編組決策（學得再多，一次只能帶三招）。若兩者都限格，經驗值就只有一個出口；
若兩者都不限格，「配置」這一層不存在。

---

## 2. Data Schema

```ts
type AbilityTier = 'common' | 'fine' | 'peerless';    // 常 / 良 / 絕

interface TraitDefinition extends DefinitionHeader {
  readonly kind: 'trait';
  readonly tier: AbilityTier;
  readonly cost: Readonly<Partial<Record<Attr, number>>>;   // 混合消耗（32 §4.1）
  readonly polarity: 'positive' | 'negative';
  readonly effects: readonly EffectRef[];
  readonly collectible: boolean;
}

interface SkillDefinition extends DefinitionHeader {
  readonly kind: 'skill';
  readonly tier: AbilityTier;
  readonly cost: Readonly<Partial<Record<Attr, number>>>;
  readonly action: SkillAction;
  readonly collectible: boolean;
}

interface SkillAction {
  readonly kind: 'physical' | 'magic' | 'heal' | 'buff' | 'debuff';
  readonly actorAttr: Attr;                  // 效果強度看施術者的哪一維（33 §5.2）
  readonly ratio: number;                    // 兵量上限的比例
  readonly effects: readonly EffectRef[];    // buff / debuff 的內容
}
```

### 2.1 `actorAttr` 一個欄位同時服務主角與名士 ★

技能自己宣告「我看哪一維」。主角施放時讀主角的那一維，名士傳令時讀該名士的 ——
**同一個欄位，兩種施術者，不需要分岔**。這也是為什麼四職能
（武＝物理／智＝法術／政＝恢復／統＝Buff）可以只寫在資料裡，而不是寫成程式分支。

### 2.2 消耗掛在 Definition 上，不另立一張階級表

32 只負責「讀這個 cost 並扣款」。作者層有一個 `abilityCost(tier, primary, ...)`
產生器（與 `notableBase(rarity, specialty, tweak)` 同一個手法），
但**產出的值落在 Definition 上** —— 否則同一件事會有兩份資料。

驗證會檢查 `cost` 的類數與 `tier` 相符（常 1／良 2／絕 3），
因此混合消耗這個機制不能被個別內容繞過（32 §8）。

### 2.3 負面特質

沿用舊版設計：〈剛愎〉〈疑心〉〈酒癖〉這類來自惡名或失敗事件的負面特質。

**負面特質不是懲罰性 debuff，而是角色刻畫**：它的 `effects` 可以同時有正負
（剛愎 ＝ 物理傷害 +10%、恢復效率 −15%），這才有取捨感。

`polarity` 讓 UI 分開呈現，也讓「移除負面特質」這種未來設計有掛載點。

### 2.4 State

```ts
interface AbilityState {
  readonly traits: readonly TraitId[];
  readonly skills: readonly SkillId[];
}
```

只存 ID。效果、消耗、描述、戰役行為全由 Definition 現算。

### 2.5 歸屬 pack

> ⚠️ **待定**：通用能力（〈火攻〉誰都能學）歸 `core`，陣營特色歸陣營包。
> 依 ARCHITECTURE §2.12 的不對稱判準，**判不出來的一律放陣營包**。

---

## 3. 三個作用

| 作用 | 機制 | 已存在於 |
|---|---|---|
| 特質提供效果 | `TraitDefinition.effects` → `EffectRef` | 01 |
| 特質／技能開事件分支 | `Condition.hasTrait` / `hasSkill` 用於 `EventOption.requirements` | 01 §5、17 §3.2 |
| **技能是戰役中的行動** | `SkillAction`，由 33 消費 | **新增** |

前兩個沿用既有機制、一行都不用改。**第三個是這次重寫的全部內容** ——
它把技能從「一個會發光的被動」變成「你每回合真的在做的事」。

---

## 4. 習得途徑：只有一條

```
32 養成兌現的 learn.trait / learn.skill
```

**舊版的三條白給途徑全部改成解鎖**（RFC-01 D35：一切都要先解鎖）：

| 舊 | 新 |
|---|---|
| `SkillGrant` 效果（天賦、攜帶寶物） | `UnlockGrant` → 進入可學清單 |
| `SkillGrant` 效果（名士解鎖條） | `UnlockGrant`，門檻為好感（19 §5） |
| `EventReward.skill` | `EventReward.unlock` |

於是「你能學什麼」與「你買不買得起」是兩道獨立的門（32 §5.2）。
本模組**不 handle 任何指令** —— 學習的唯一入口在 32，這樣「產出總和 − 消耗總和 ＝ 餘額」
才是可斷言的不變量。

### 4.1 重複學習是拒絕，不是冪等 no-op ★

舊版技能是白給的，冪等 no-op 合理。現在學習**要扣款** ——
靜默 no-op 會讓「已扣款但沒東西」與「沒扣款」無法區分。

判斷依據（ARCHITECTURE §2.2）：問「如果資料齊全，這裡還會 no-op 嗎？」——
**不會**，因為呼叫者本來就該先看 `state === 'learned'`。因此它是**錯誤**，不是冪等。

拒絕碼 `already-learned`。細節見 32 §7.2。

---

## 5. 作為 EffectSource

```
1. 取 RunState.abilities.traits
2. 攤平每個 TraitDefinition.effects
3. 標上 sourceId = 'trait:gangbi'
```

**只有特質進 EffectSource。** 技能不進 —— 它的效果只在戰役中、由 33 依
`SkillAction` 施放時才發生，不是常駐加成。混進來會讓「我的物理傷害是多少」
在戰役外也算得出一個沒有意義的數字。

無 `supersedes` 語意 —— 特質不互相取代，累加。

---

## 6. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `trait.effects` 非空 | 沒有效果的特質是死內容 |
| `skill.action.ratio > 0` | 零效果的技能佔一個格子卻什麼都不做 |
| `cost` 非空，且類數與 `tier` 相符 | 混合消耗是 32 §4.1 的機制本體 |
| `polarity === 'negative'` 的特質不得由任何 `UnlockGrant` 於入夢時解鎖 | 開局就給負面特質沒有敘事理由 |
| `Condition.hasTrait` / `hasSkill` 引用存在 | 引用完整性 |
| 每個 `collectible` 的能力至少有一個解鎖來源 | 否則圖鑑分母有永遠拿不到的項目 |
| `skill.action.kind` 與 `actorAttr` 的對應合法 | `heal` 必須是政、`buff` 必須是統、`physical` 必須是武、`magic` 必須是智（**名士適用**；主角的技能不受此限，見 RFC-01 D19） |

最後一條的例外是刻意的：**四職能對應約束名士，不約束主角**。
主角練政治也要能贏 —— 他的四維決定他**怎麼打**，不決定他在隊裡的功能。

倒數第二條特別重要：它擋下「寫了特質但忘了掛在任何名士或道具上」——
那不會有任何測試失敗，玩家卻永遠學不到。

---

## 7. 不變量

1. `traits` / `skills` 各自無重複
2. 兩者**只增不減**（單局內）
3. 特質效果在 `trait.learned` 之後的下一次 `resolve()` 即生效
4. 技能效果**只在戰役中發生**，不進 `EffectResolver`
5. 能力不跨 Run 保留（僅 12 收集圖鑑記錄它被學習過）
6. 未經 32 的扣款，不可能出現在 `traits` / `skills` 裡

---

## 8. 刻意不做

- **不做特質格數上限**。技能的稀缺在格數，特質的稀缺在經濟（§1）
- **不做直接授予（白給）**。一切都要先解鎖再花錢學（§4）
- 不做能力等級或熟練度
- 不做能力之間的合成
- 不做跨 Run 能力繼承（那會侵蝕入夢配置的角色）
- **不做技能觸發條件的玩家自訂**。抽哪一招由 33 §4.2 的兩段擲決定；
  「設定機器」是另一層，留待戰役玩起來之後
