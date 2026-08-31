# 19 · 名士局內狀態

> **職責**：組建本輪 3+3 陣容、持有局內好感度、分配行動格站位、提供連動加成與出戰加值。
>
> | | |
> |---|---|
> | **owns** | `RunState.roster` |
> | **reads** | 10 名士圖鑑（讀 `metaSnapshot`）、22 陣營系統 |
> | **handles** | `roster.designateSuperior`（入朝時） |
> | **emits** | `affinity.changed` / `notable.eventUnlocked` / `roster.assembled` |
> | **ownsDefinitions** | `notablePool`、`linkBonus` |
>
> 名士的 `base`（§5.1）隨 `notable` 定義走，由 10 名士圖鑑擁有；本模組只讀它。

> 🔧 **[RFC-01](../RFC-01-campaign-rework.md) 改動**：名士在戰役中的角色整體改寫。
>
> | | 舊 | 新 |
> |---|---|---|
> | 好感度的戰鬥用途 | `linkBonus.checkBonusByStage` ＝ 大檢定出戰**加值** | 同一張表**原地換語意** ＝ 傳令的**施放機率**（33 §4.3） |
> | 星階 | 起始好感與解鎖條 | 額外決定他**有幾招可選**（33 §3.1） |
> | 名士數值 | 無（只有 `base.sortieBonus` 1–8） | **完整能力表：四維 0–100 ＋ 特質 ＋ 技能池** |
> | 出戰 | `sortieBonus` 加總、`eligibleForSortie` | `sortieBonus` 作廢；`eligibleForSortie` 保留（敵方名士不可指揮） |
>
> 並新增一條職責：**他能教你的，就是他自己表上有的**（32 §5.1）——
> 名士的能力表**就是**他的教學表，不另立「誰能教什麼」的資料。

---

## 1. 陣容結構：3 + 3

| 來源 | 數量 | 時點 | 特性 |
|---|---|---|---|
| **兒時玩伴** | 3 | 入夢時 | 跨陣營，可為任何已載入 pack 的名士 |
| **陣營上司** | 3 | 入朝時（虎牢關後選陣營） | 限該陣營池，含主公本人 |

```ts
interface RosterState {
  readonly companions: readonly [RosterMember, RosterMember, RosterMember];
  readonly superiors: readonly RosterMember[];      // 入朝前為空陣列
}

interface RosterMember {
  readonly notableId: NotableId;
  readonly affinity: number;          // 局內當下值
  readonly chainStage: number;        // 已觸發的事件鏈階段數
}
```

**不存 `stage`**——它由 `affinity` ＋ `affinityStages` 現算。存下來就會有兩份真相。

---

## 2. 兒時玩伴的組建

```
1. 讀 config.designatedCompanions（0..3 位，14 已驗證過門檻）
2. 空位從「所有已載入 pack 的名士聯集」中抽補   ← rng 'notable.roster'
3. 每位的 affinity 初始化為 metaSnapshot.notableCodex[id].startAffinity
```

### 2.1 候選池是 pack 聯集，不是一張資料表 ★

「兒時玩伴池」**不存在對應的 Definition**。它是 Registry 在載入後計算的所有名士聯集（ARCHITECTURE §2.12）。

因此關羽住在 `pack:shu`，玩魏線照樣能被指定或抽到——符合 GDD「夢中無勢力與年齡限制」的設定。若做成一張資料表，加新陣營就得回頭改它，「加 `pack:huangjin` 不動 core」的驗收標準立刻破功。

### 2.2 南華先生的兩種台詞由 UI 依門檻選

- 無任何指定權（全部名士 `startAffinity < designationThreshold`）→ RNG 全給的台詞
- 有指定權 → 詢問的台詞

這是**呈現層判斷**，核心只提供「可指定名單」（14 §4 `ConfigLimits.designatableNotables`）。

---

## 3. 陣營上司的組建

```ts
interface NotablePoolDefinition extends DefinitionHeader {
  readonly kind: 'notablePool';
  readonly factionId: FactionId;
  readonly entries: readonly PoolEntry[];
}

interface PoolEntry {
  readonly notableId: NotableId;
  readonly weight: number;
  readonly requirements: readonly Condition[];   // 進池門檻（可空）
}
```

```
入朝流程：
1. bond = metaSnapshot.shop 推導的 factionBond[factionId]   （0..3）
2. 玩家自選 bond 位（從通過 requirements 的池內）
3. 其餘 (3 − bond) 位依 weight 抽補                        ← rng 'notable.roster'
4. 主公本人在池內，可被自選或抽到
5. affinity 初始化為 startAffinity
```

### 3.1 幼年抽到的，成年不會再抽到 ★

兒時玩伴與陣營上司**來自同一批名士**，因此上司抽補必須排除已在陣容中的人。

```
上司可抽池 = 陣營池 − 現有陣容成員
```

少了這條，同一個人會在一輪裡出現兩次 —— 好感度分裂成兩筆、站位分配把他算兩次、
事件鏈也會重複觸發。

排除來源刻意用 `roster.members` **現算**，不另存一份「已抽過名單」：
陣容成員只增不減，它本身就是完整的答案（同 15 §2.1 的理由）。

**池若被玩伴掏空，上司會靜靜少於 `superiorCount`。** 這由 02 擋在載入期：

> `notablePool.entries.length ≥ gameRules.companionCount + gameRules.superiorCount`

灰盒目前是 8 人池、3 ＋ 3，剩 2 人餘裕。

### 3.2 `requirements` 是預留的平衡槓桿

GDD 目前只用緣分決定自選名額，池本身無門檻。但 `PoolEntry.requirements` 讓「武名 ≥ N 才可能抽到張遼」這類設計**不需要架構變更**即可加入——這是 GDD §7.1「隨機事件抽取門檻」概念的自然延伸。

留空即為現行行為。

### 3.3 緣分台詞由資料提供

`lord.<faction>.affinity.<level>` 的 l10n key（06 §2）。三家語氣分明是內容工作，不是程式工作。

---

## 4. 站位分配

每回合為 16 鍛鍊槽的四格分配名士。

```
roster = companions ∪ superiors          // 入朝前 3 位，入朝後 6 位
對 roster 按【宣告順序】逐位處理：        // 順序固定，保證可重播
  weights = 四格的基礎權重（均等）
          × base.specialtyWeight（僅該名士的專長格）    ← 第一回合就生效
          × Σ SlotBias.attrWeights（解鎖條帶來的效果）
  格 = rng.weighted('notable.slot', 未滿的格子)
  若所有格皆滿 → 該名士本回合不上場
```

- 每格上限 **2 位**（GDD §6.1）
- 可能有格無人
- **仍然不設得意行動**：`specialtyWeight` 是權重不是限制，任何名士都可能站到任何一格。
  做成硬性限制，「紅光但沒人站 vs 無光但他站著」的糾結會消失

> **這條原本寫的是「方向性由解鎖條內容體現」，已修正。** 解鎖條最早在好感度 20
> 才觸發，於是開局完全沒有方向性 —— 每個名士站在每一格都一樣。
> 方向性現在由**基底**負責（第一回合就有），解鎖條是在它之上加強。

### 4.1 順序固定是可重播要求

按陣容宣告順序處理，不得按 ID 排序或依效果強度重排。改動這個順序是**破壞式變更**（04 §1）。

---

## 5. 好感度

```ts
interface AffinityStageDefinition extends DefinitionHeader {
  readonly kind: 'affinityStage';
  readonly stage: AffinityStage;
  readonly min: number;
  readonly max: number;
}

interface LinkBonusDefinition extends DefinitionHeader {
  readonly kind: 'linkBonus';
  readonly trainingBonusByStage: Readonly<Record<AffinityStage, number>>;  // 加成，不是倍率
  readonly checkBonusByStage: Readonly<Record<AffinityStage, number>>;
  readonly gainPerTraining: number;      // 踩到一格的基礎增長
  readonly maxPerSlot: number;           // 必須 ≥ 陣容人數，見 §5.2
  readonly pileMultiplier: readonly number[];   // index ＝ 同格人數，見 §5.2
  readonly maxSlotMultiplier: number;    // 乘法疊加的安全閥
}
```

### 5.1 基底：站位必須從第一回合就有意義 ★

```ts
interface NotableBaseDef {
  readonly specialty: Attr;          // 專長維
  readonly trainingBonus: number;    // 站任何一格都有
  readonly specialtyBonus: number;   // 專長對位時追加
  readonly specialtyWeight: number;  // 專長格的站位權重（≥ 1）
  readonly sortieBonus: number;      // 大檢定出戰的基底加值
}
```

**單一名士在某一維格子上的加成：**

```
base.trainingBonus
＋ base.specialtyBonus（僅專長對位時）
＋ trainingBonusByStage[stage]
```

**格子倍率 ＝ Π（1 ＋ 各名士的加成）× 同格人數倍率**，夾在 `maxSlotMultiplier` 以內。

#### 為什麼要有這一層

舊版的 `trainingMultiplier` **只看好感度階段**，不看是誰。結果是開局時
★5 與 ★1 站在格子上數值完全相同 —— 「這格有誰站著」不構成資訊，
玩家沒有理由在意站位，兩層 RNG 的第一層也少了一半的可讀性。

基底與解鎖條的分工：

| | 何時生效 | 內容 | 逐人不同 |
|---|---|---|---|
| **base** | 進入陣容的第一回合 | 他本來就會的事 | ✅ 依稀有度與角色性格 |
| **unlocks** | 好感度／升星達標 | 提升 ＋ 新功能 | ✅ 但要投資才拿到 |

#### 四維各需至少一位專長者

否則那一維的行動格永遠沒有對位名士，站位對它失去意義。由 02 的規則驗證強制。

### 5.2 名士之間相乘 —— 爆發是設計目標 ★

**全員擠進同一格是本作刻意保留的爆發時刻。** 相加會把那個瞬間壓成一個平淡的加值，
等於把整套站位 RNG 最好玩的地方拿掉。

代價是那一回合其他三格會失去意義 —— **但那正是「爆發」的定義**。
而且站位由 RNG 決定、玩家無法安排，所以它是驚喜而不是最優解。

#### 純相乘到不了爆發的量級

實測 400 輪（純相乘、無人數倍率）：

```
同格人數分佈（每輪）  0 人 29　1 人 36　2 人 19　3 人 6.1　4 人 1.3　5 人 0.2　6 人 ~0
最高倍率              ×2.75
```

四人同格也才 ×2 出頭。原因是**每人的加成必須夠小**才不會在六人同格時指數爆炸，
而那個顧慮反過來壓死了三、四人同格的爽感。

#### 因此加一條「同格人數倍率」

```
pileMultiplier[人數] = [1, 1, 1.15, 1.4, 1.8, 2.3, 3.0]
```

它把爆發**只放在人多的時候**：一兩人同格幾乎不受影響（常見情況不通膨），
四人以上才陡升。加上之後的實測分佈：

```
×1.0–1.2  61%　×1.2–1.5  20%　×1.5–2.0  13%
×2.0–2.5 4.2%　×2.5–3.0 1.1%　×3.0–4.0 1.0%　×4.0+ 0.24%
最高倍率 ×6.64（上限 ×8）
```

**約每輪一次會出現 ×3 以上的格子**，偶爾 ×5–6.6。那就是爆發點。

#### 爆發是誘惑，不是免費的獎賞

「全員擠在交遊格，但我需要武」是這個機制製造的真正兩難。實測（400 輪／策略）：

| 策略 | 圓夢率 | 輪迴點數 |
|---|---|---|
| 專精主維、兩成回合辦事 | 60.3% | 3045 |
| **看情況決定（機會主義）** | 59.5% | **3057** |
| **追爆發（永遠練期望值最高的格）** | 34.8% | **1964** |

追爆發**明顯最差** —— 四維被打散（258/232/226/180）過不了大檢定。
爆發是誘惑，接不接是決策，而不是「看到就該拿」。

> **附帶效果**：乘法制讓「逐回合看情況」開始值錢了。加法制時機會主義輸給固定比例
> （2891 vs 2998）；乘法制之後它反超了全押鍛鍊（3057 vs 3021）。
> 好回合與壞回合的差距夠大，讀盤才有報酬。

#### 上限是資料，不是魔術數字

`maxSlotMultiplier`（目前 8）。沒有它，六人同格 × 滿好感會到 ×9 以上，
一回合把四維推上限 —— **爆發反而被四維上限吃掉**。

#### `maxPerSlot` 必須 ≥ 陣容人數

否則「全員擠進同一格」根本不可能發生，爆發感只是空話。
由 02 的規則驗證強制（`maxPerSlot ≥ companionCount + superiorCount`）。

### 5.3 上升途徑

| 途徑 | 來源 |
|---|---|
| 鍛鍊槽：選中該名士站位的格子 | 16 |
| 事件槽：執行該名士的名士事件 | 17 |

```
gain = gainPerTraining
     × resolve('training.affinityGain', 1)
     × Σ AffinityGrowth.mulPct（scope 相符者）
```

### 5.4 跨階段時發出解鎖

好感度跨入新階段 → 發 `notable.eventUnlocked`，該階段的事件進入 17 的可抽池。

### 5.5 起跑點是 `startAffinity`，解鎖條也看 `startAffinity` ★

局內把好感度養到 80，**不會臨時解鎖該名士 60 級的被動條**。被動條的解鎖刻度是永久的 `startAffinity`（10 §3.3）。

局內好感度影響的是：**連動加成倍率**、**出戰加值**、**事件鏈階段**。

> 這是最容易搞混的一條，必須有測試釘住。

---

## 6. 公開介面

```ts
interface RosterService {
  members(ctx: RunContext): readonly RosterMember[];
  stageOf(id: NotableId, ctx: RunContext): AffinityStage;
  /** 【必須吃 attr】—— 專長對位是基底的一部分（§5.1）。 */
  trainingMultiplier(slotNotables: readonly NotableId[], attr: Attr, ctx: RunContext): number;
  /** 單一名士在該格的加成。UI 靠它把「他站這裡值多少」顯示出來。 */
  notableSlotBonus(id: NotableId, attr: Attr, ctx: RunContext): number;
  sortieBonus(ids: readonly NotableId[], ctx: RunContext): number;
  eligibleForSortie(checkId: MajorCheckId, ctx: RunContext): readonly NotableId[];
}
```

`eligibleForSortie` 排除該檢定的 `enemyNotables`（18 §4）。

---

## 7. 不變量

1. `companions.length === 3` 恆成立（入夢時即補滿）
2. `superiors.length` 為 0（入朝前）或 3（入朝後），無中間狀態
3. 陣容內無重複 `notableId`
4. `affinity` 初始值 ＝ `metaSnapshot.notableCodex[id].startAffinity`
5. `affinity` 在 `[0, affinityStages` 最大值`]` 內，單調不減
6. 每格站位 ≤ 2 位
7. 解鎖條的判定只用 `startAffinity`，從不使用局內 `affinity`
8. 同一 `(seed, cursors, config, metaSnapshot)` → 相同陣容與相同每回合站位

---

## 8. 刻意不做

- 不做局內更換陣容
- 不做名士之間的關係／羈絆網（第一版）
- 不做好感度下降
- 不在此模組決定被動條內容（那是 10 圖鑑）
