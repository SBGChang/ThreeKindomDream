# 23 · 技能系統

> **職責**：持有局內習得的技能，作為 `EffectSource`，並提供檢定分支的判定依據。
>
> | | |
> |---|---|
> | **owns** | `RunState.skills` |
> | **reads** | 01 效果系統 |
> | **handles** | 無（習得一律經效果或事件獎勵） |
> | **emits** | `skill.learned` |
> | **ownsDefinitions** | `skill` |

> ⚠️ **內容待補**：GDD 尚未定義技能清單。但**架構是完整的**——技能的兩個作用（提供效果、開檢定分支）都用既有機制表達，缺的只是 `content-source/<pack>/skills/*.ts` 的內容。這符合資料／程式分離：缺的是資料，不是設計。

---

## 1. 為什麼需要這個模組

GDD 有三處已經在引用技能，但從未定義它：

| 引用處 | 內容 |
|---|---|
| §9.3 寶物 | 「授予〈兵法〉技能」「授予〈破陣〉」 |
| §6.4 名士事件終獎 | 「寶物 / 特殊技能」 |
| 檢定分支 | 「你這輪學會了火攻，赤壁那章就多一個選項」 |

而《實況野球》的整個養成目標就是**金特**。沒有技能系統，名士事件鏈爬到「莫逆」的終點只剩數值，缺少「我這輪拿到了什麼」的收藏感。

它同時填補另一個缺口：**局內 build 偏弱**。資質、天賦、寶物都在入夢前決定；技能是唯一**局內獲得**的 build 載體。

---

## 2. Data Schema

```ts
interface SkillDefinition extends DefinitionHeader {
  readonly kind: 'skill';
  readonly skillTier: 'normal' | 'gold';        // gold ≈ 實況野球的金特
  readonly attr: Attr | null;                   // 方向；null ＝ 通用或負面
  readonly polarity: 'positive' | 'negative';
  readonly effects: readonly EffectRef[];
  readonly collectible: boolean;                // 進收集圖鑑
}
```

### 2.1 負面技能

GDD 提議過〈剛愎〉〈疑心〉〈酒癖〉這類來自惡名或失敗事件的負面技能。`polarity` 讓 UI 能分開呈現，也讓「移除負面技能」這種未來設計有掛載點。

**負面技能不是懲罰性 debuff，而是角色刻畫**：它的 `effects` 可以同時有正負（剛愎 ＝ 武系檢定 +10、魅系檢定 −15），這才有取捨感。

### 2.2 歸屬 pack

> ⚠️ **待定**：通用技能（〈火攻〉誰都能學）歸 `core`，陣營特色技能歸陣營包。依 ARCHITECTURE §2.12 的不對稱判準，**判不出來的一律放陣營包**。

### 2.3 State

```ts
interface RunSkillState {
  readonly learned: readonly SkillId[];
}
```

只存 ID。效果、分類、描述全由 Definition 現算。

---

## 3. 兩個作用都用既有機制 ★

| 作用 | 機制 | 已存在於 |
|---|---|---|
| 提供效果 | `SkillDefinition.effects` → `EffectRef` | 01 |
| 開檢定分支 | `Condition.hasSkill` 用於 `EventOption.requirements` 與 `MajorCheckTier.requirements` | 01 §5、17 §3.2、18 §2.1 |

**不需要為技能新增任何機制。** 這是效果系統與條件系統設計成功的驗證：一個 GDD 尚未設計的系統，接上來時架構一行都不用改。

---

## 4. 習得途徑

| 途徑 | 來源 |
|---|---|
| `SkillGrant` 效果（`timing: 'onDreamEnter'`） | 天賦、攜帶寶物 |
| `SkillGrant` 效果（`timing: 'onUnlock'`） | 名士解鎖條 |
| `EventReward.skill` | 名士事件終獎、劇情事件、大檢定獎勵 |

```
skill.learn(id)
  ├ 已習得 → 冪等 no-op（合法：契約明訂，見 ARCHITECTURE §2.2）
  ├ 未習得 → 加入 learned，emit skill.learned
  └ 該技能的 effects 立即生效（下一次 resolve 就會計入）
```

### 4.1 重複習得是合法的冪等 no-op

判斷依據（ARCHITECTURE §2.2）：問「如果資料齊全，這裡還會 no-op 嗎？」——會，因為技能本來就不該疊加。因此它是**冪等**，不是掩蓋缺口。

**必須有測試釘住這個冪等行為**，否則它與偽裝的 fallback 無法區分。

---

## 5. 作為 EffectSource

```
1. 取 RunState.skills.learned
2. 攤平每個 SkillDefinition.effects
3. 標上 sourceId = 'skill:huogong'
```

無 `supersedes` 語意——技能不互相取代。

---

## 6. 規則驗證（由 02 執行）

| 規則 | 理由 |
|---|---|
| `effects` 非空 | 沒有效果的技能是死內容 |
| `polarity === 'negative'` 的技能不得由 `SkillGrant.timing = 'onDreamEnter'` 授予 | 開局就給負面技能沒有敘事理由 |
| `Condition.hasSkill` 引用的 `skillId` 存在 | 引用完整性 |
| 至少有一個途徑可習得每個 `collectible` 技能 | 否則圖鑑分母有永遠拿不到的項目 |

最後一條特別重要：它擋下「寫了技能但忘了掛在任何獎勵上」——那不會有任何測試失敗，玩家卻永遠湊不滿圖鑑。

---

## 7. 不變量

1. `learned` 無重複
2. `learned` 只增不減（單局內）
3. 技能效果在 `skill.learned` 之後的下一次 `resolve()` 即生效
4. 技能不跨 Run 保留（僅圖鑑記錄它被習得過）

---

## 8. 刻意不做

- 不做技能等級或熟練度
- 不做技能之間的合成
- 不做主動使用技能（全部為被動與分支解鎖）
- 不做跨 Run 技能繼承（那會侵蝕入夢配置的角色）
