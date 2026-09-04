# 14 · 入夢配置

> **職責**：把元層買到的能力上限，轉成一份合法的入夢配置，並在入夢時凍結。
>
> | | |
> |---|---|
> | **owns** | `RunState.config`（一次性寫入後不可變） |
> | **reads** | 09 天命商店、10 名士圖鑑、11 寶物圖鑑 |
> | **handles** | `config.setAptitude` / `config.toggleTalent` / `config.toggleTreasure` / `config.designateCompanion` / `config.confirm` |
> | **emits** | `dream.entered` |
> | **ownsDefinitions** | `talent`、`aptitudeCost` |

---

## 1. 它是 Meta 與 Run 的唯一橋樑

```
MetaState（商店等級、圖鑑進度）
      ↓ 決定合法範圍
玩家配置（本模組）
      ↓ config.confirm
DreamEntryConfig ──凍結──▶ RunState.config
                            ＋ RunState.metaSnapshot（整份 MetaState 快照）
```

`config.confirm` 是**唯一**建立 RunState 的入口。它同時凍結配置與 MetaState 快照（ARCHITECTURE §2.11）。

---

## 2. Data Schema

### 2.1 產出

```ts
interface DreamEntryConfig {
  readonly aptitudes: Readonly<Record<Attr, AptitudeGrade>>;
  readonly talents: readonly TalentId[];
  readonly carriedItems: readonly ItemId[];
  readonly designatedCompanions: readonly NotableId[];   // 0..3，未滿由 19 以 RNG 補
  readonly careerCap: number;                            // 本輪官階能爬到第幾階
}
```

> `designatedCompanions` 是**意圖**，不是結果。實際陣容（3 兒時玩伴 ＋ 3 陣營上司）由 19 名士局內狀態組建。

### 2.1.1 兩道天花板 ★★ 這一版新增的跨輪成長軸

| 天花板 | 誰決定 | 第一輪 | 全滿 |
|---|---|---|---|
| **四維上限**（逐維） | `aptitudes[attr]` → `aptitudeGrade.attrCap` | 75（資質 D） | 100（資質 S） |
| **官階上限** | `careerCap` ＝ `gameRules.careerCapBase` ＋ 買到的〈官途〉 | 5（都尉／功曹） | 12（四方將軍／軍師將軍） |

**為什麼要有天花板 —— 實測數字** ★

「第一輪 對 天命全滿」（[headroom.ts](../../scripts/headroom.ts)，40 輪／策略）：

| | 第一輪 | 天命全滿 | 第一輪就佔 |
|---|---|---|---|
| 最高四維 | 83.1 | 98.2 | **85%** |
| 官階 | 7.2 | 11.1 | 65% |
| 輪迴點數 | 7289 | 9514 | 77% |
| 特質 | 2.6 | 5.8 | 45% ← 唯一健康的 |

病因：**天命商店賣的全部是「經驗產量」的乘數**（資質倍率、配點、升階機率），
而經驗的出口是四維、上限 100、第一輪就摸到 83。
階梯計價（85→95 每點 76–136）讓產量的邊際報酬掉得極快，
於是「把經驗產量翻倍」只換到四維 +15 ——
**跨輪成長被自己的定價吃掉了。**

對照組是特質（45%）：它的成長來自【解鎖】（好感、星階）而不是產量。

> **買「新東西」有跨輪成長，買「更快」沒有。**

而官階更極端：改之前的商店九個品項有 **0 個**碰它 ——
它在第一輪與第五十輪爬法完全一樣，卻是狀態列上最顯眼的那個數字。
沒有閘門，階梯就只能訂成「第一輪爬得動」，而那必然是「第一輪爬掉一半」。

**改完之後**（同一份量測）：

| | 第一輪 | 天命全滿 | 第一輪就佔 |
|---|---|---|---|
| 最高四維 | 75.0 | 100.0 | 75%（等級 B → S，四個帶） |
| 官階 | 5.0 | 11.4 | **44%** |
| 輪迴點數 | 5267 | 9627 | **55%** |

順帶的結果：〈丞相〉與〈大將軍〉需要官階 ≥ 6，
於是**第一輪拿不到那兩個稱號** —— 頂端的稱號第一次真的鎖在跨輪成長後面。

### 2.1.2 天花板要**看得見** ★

- 養成畫面每一維一欄：`本輪上限 75（資質 D）`
- 狀態列的官階後面：`（本輪上限 第5階）`，到頂時把「差 N 功績」換成「已達本輪上限」

**這是天花板勝過倍率的真正理由。** 「產量 +15%」要玩三輪才感覺得出來；
一道寫著數字的牆，玩家第一眼就知道它在哪、以及什麼買得動它。

### 2.2 天賦

```ts
interface TalentDefinition extends DefinitionHeader {
  readonly kind: 'talent';
  readonly cost: number;                     // 配帶點數
  readonly effects: readonly EffectRef[];
  readonly exclusiveGroup: string | null;    // 互斥組
}
```

**`exclusiveGroup` 是必要的**：GDD 的〈忠義之心〉（善名 +50%／惡名 −50%）與〈梟雄之姿〉（惡名 +50%／善名 −50%）同時配帶會互相抵銷成無意義狀態。同組內最多選一個。

規則驗證：同組天賦不得有相同 `cost` 以外的隱含假設；`exclusiveGroup` 為 null 表示無限制。

### 2.3 資質成本

```ts
interface AptitudeCostDefinition extends DefinitionHeader {
  readonly kind: 'aptitudeCost';
  readonly defaultGrade: AptitudeGrade;                          // 未配點時的階級
  readonly cumulativeCost: Readonly<Record<AptitudeGrade, number>>; // 從 default 升到該階的累計成本
}
```

用**累計成本**而非逐階成本，因為玩家的操作是「直接把武設成 A」而不是「連按四次升階」。累計表讓「切換階級」的成本計算是一次減法，不需要走訪路徑。

---

## 3. 合法性驗證 ★

`config.confirm` 前必須全部通過。任一失敗回 typed rejection，**不得自動修正玩家的配置**。

| 檢查 | 資料來源 | 失敗 code |
|---|---|---|
| 每個 `aptitudes[attr]` ≤ 商店解鎖的該維上限 | 09 `aptitudeCap` | `threshold.not-met` |
| Σ `cumulativeCost[grade]` ≤ 商店給的資質點數 | 09 `aptitudePoints` | `threshold.not-met` |
| 每個 `talents[i]` 已解鎖 | 09 `unlockTalent` | `capability.disabled` |
| Σ `talent.cost` ≤ 商店給的配帶點數 | 09 `talentPoints` | `threshold.not-met` |
| `talents` 內無同 `exclusiveGroup` 衝突 | Definition | `threshold.not-met` |
| `carriedTreasures.length` ≤ 商店給的攜帶格 | 09 `treasureSlots` | `threshold.not-met` |
| 每個 `carriedTreasures[i].discovered === true` | 11 圖鑑 | `capability.disabled` |
| `designatedCompanions.length` ≤ 3 | 常數 | `threshold.not-met` |
| 每位 companion 的 `startAffinity ≥ designationThreshold` | 10 圖鑑 | `threshold.not-met` |
| `designatedCompanions` 無重複 | — | `threshold.not-met` |

### 3.1 為什麼不自動修正

配置畫面是玩家表達策略意圖的地方。自動把超支的天賦拿掉，玩家會不知道自己少了什麼上場。**明確拒絕並指出哪一項超了**才是正確行為（這也是「五個合法出口」第 4 條）。

---

## 4. 公開介面

```ts
interface DreamEntryConfigurator {
  // 依當前 MetaState 算出合法範圍，供 UI 呈現
  limits(meta: MetaState): ConfigLimits;

  // 逐項編輯（回傳新的草稿，不變異）
  setAptitude(draft: ConfigDraft, attr: Attr, grade: AptitudeGrade): CommandOutcome<ConfigDraft>;
  toggleTalent(draft: ConfigDraft, id: TalentId): CommandOutcome<ConfigDraft>;
  toggleTreasure(draft: ConfigDraft, id: TreasureId): CommandOutcome<ConfigDraft>;
  designateCompanion(draft: ConfigDraft, slot: 0 | 1 | 2, id: NotableId | null): CommandOutcome<ConfigDraft>;

  // 凍結並建立 RunState
  confirm(draft: ConfigDraft, meta: MetaState, seed: Seed): CommandOutcome<RunState>;
}

interface ConfigLimits {
  readonly aptitudeCaps: Readonly<Record<Attr, AptitudeGrade>>;
  readonly aptitudePoints: number;
  readonly talentPoints: number;
  readonly treasureSlots: number;
  readonly unlockedTalents: readonly TalentId[];
  readonly carryableTreasures: readonly TreasureId[];
  readonly designatableNotables: readonly NotableId[];
  readonly factionBonds: Readonly<Record<FactionId, number>>;   // 供 UI 預告入朝自選名額
}
```

### 4.1 `limits()` 全部現算

不快取。上限與可選池由 `MetaState.shop.purchased` ＋ Definition 推導（09 §1.2）。加一個商店品項不需要 migration，也不會出現快取與實際不一致。

### 4.2 草稿與確認分離

編輯期是 `ConfigDraft`（可含非法中間狀態，例如暫時超支），`confirm` 才做完整驗證。這讓 UI 可以顯示「超支 3 點」而不是每次點擊都被拒絕。

> 但**每個編輯操作仍回 `CommandOutcome`**——用於擋下「選了未解鎖的天賦」這類永遠非法的操作。區別是：超支是暫時的（可繼續編輯），未解鎖是絕對的（不該進草稿）。

---

## 5. 不變量

1. `confirm` 成功產出的 `RunState.config` 通過 §3 全部檢查
2. `RunState.config` 與 `RunState.metaSnapshot` 在整個 Run 生命週期內位元不變
3. `limits()` 是 `MetaState` 的純函式
4. 資質未配點的維度等於 `defaultGrade`，不是 undefined

---

## 6. 刻意不做

- 不做配置預設模板或「上次的配置」快速套用（第一版）
- 不做局內改配置
- 不在此模組決定實際陣容（那是 19）
- 不做配置的模擬預覽（若要做，走 31 平衡模擬器的介面）
