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
  readonly carriedTreasures: readonly TreasureId[];
  readonly designatedCompanions: readonly NotableId[];   // 0..3，未滿由 19 以 RNG 補
}
```

> `designatedCompanions` 是**意圖**，不是結果。實際陣容（3 兒時玩伴 ＋ 3 陣營上司）由 19 名士局內狀態組建。

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
