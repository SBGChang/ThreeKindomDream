# 31 · 平衡模擬器

> **職責**：headless 跑大量 Run，輸出分佈統計，供數值調校。
>
> | | |
> |---|---|
> | **owns** | 無 |
> | **reads** | 核心全部（唯讀） |
> | **執行方式** | `npm run sim -- --runs 10000 --config <path>` |

---

## 1. 為什麼它是必需的，不是加分項

這個遊戲的光階機率、資質倍率、章節成長曲線、DC 曲線、官階門檻、結局門檻**互相糾纏**。改一個資質倍率會連帶影響：四維成長 → 檢定值 → 可選難度 → 通過章節數 → 官階 → 結局 → 輪迴點數 → 下一輪的起手。

**這種耦合靠手玩調不出來。** 必須能問出這類問題：

| 問題 | 需要的統計 |
|---|---|
| 全新玩家（無天命點數）走到第幾章？ | 章節到達分佈 |
| 光階實際分佈是否符合設計？ | `glowResults` 直方圖 |
| 【險】難度的實際通過率？ | 依難度分組的成敗率 |
| 圓夢率是多少？ | `endingKind` 比例 |
| ★5 寶物的碎片期望值是否接近 0？ | 碎片產出分佈（見 24 §3.1） |
| 偏科與均衡誰有利？ | 依配置分組的點數分佈 |

---

## 2. 它決定了一條架構約束 ★

模擬器要能跑，**核心邏輯就不能依賴 React 或 Electron**（ARCHITECTURE §1.4）。

這不是潔癖，是這個模組的存在條件。反過來說：**如果模擬器跑不起來，就代表核心的解耦失敗了。** 它同時是架構正確性的驗證工具。

---

## 3. 輸入

```ts
interface SimConfig {
  readonly runs: number;
  readonly seedBase: number;                 // seed = seedBase + runIndex，可重現
  readonly metaSnapshot: MetaState;          // 直接餵快照，不需要建整個元層
  readonly entryConfig: DreamEntryConfig;
  readonly policy: AgentPolicy;
}
```

### 3.1 只需要一份快照

因為 RunState 內含 `metaSnapshot`（ARCHITECTURE §2.11），模擬器**不需要模擬商店、不需要跑結算迴圈**，直接餵一份代表性的快照即可。

這是快照設計的直接紅利——若局內讀活的 MetaState，模擬器就得先建構整個元層。

### 3.2 決策策略

```ts
interface AgentPolicy {
  readonly name: string;
  chooseSlot(s: Session): SlotIndex;
  chooseOption(s: Session, offer: EventOffer): number;
  spend(s: Session): void;                    // 經驗怎麼花（32）
  chooseLoadout(s: Session): BattleLoadout;   // 三招 ＋ 三位指揮（33 §3）
  chooseEngage(s: Session): boolean;          // 走還留（33 §6）
}
```

內建幾種策略：

| 策略 | 用途 |
|---|---|
| `greedy-glow` | 永遠選最高光階 | 測光階價值上限 |
| `greedy-notable` | 永遠追名士 | 測名士養成路線 |
| `balanced` | 依門檻缺口動態選 | 近似有經驗的玩家 |
| `risk-averse` | 戰役要 2.4 倍餘裕才再打一關 | 測保守路線的天花板 |
| `risk-seeking` | 戰役只要 1.05 倍餘裕就再打一關 | 測激進路線的死亡率 |
| `random` | 均勻隨機 | 下界基準 |

**策略是程式碼，不是資料**——它不是遊戲內容，是分析工具的一部分。

---

## 4. 輸出

```ts
interface SimReport {
  readonly runs: number;
  readonly chapterReached: Histogram;
  readonly endingDistribution: Readonly<Record<EndingId, number>>;
  readonly fullDreamRate: number;
  readonly glowDistribution: Readonly<Record<GlowTier, number>>;
  readonly stageDepth: Stats;                             // 戰役打到第幾關
  readonly deathRate: number;                             // 陣亡（非圓夢）比例
  readonly finalAttrs: Readonly<Record<Attr, Stats>>;      // mean / p5 / p50 / p95
  readonly finalCareer: Readonly<Record<CareerLine, Stats>>;
  readonly pointsEarned: Stats;
  readonly notableFragments: Readonly<Record<NotableId, Stats>>;
  readonly treasureFragments: Readonly<Record<TreasureId, Stats>>;
  readonly eventSlotEmptyRate: number;                     // 事件槽為 0 的回合比例
  readonly eventShare: number;                             // 事件佔比（見下）
  readonly eventSkipRate: number;
}
```

### 4.1 兩個特別要看的指標

- **`eventSlotEmptyRate`**：驗證門檻設計。早期高（教學曲線）、後期低是預期形狀。若後期還很高，代表門檻訂得太嚴
- **`eventShare`**（事件佔比 ＝ `actionsEvent / (actionsTraining + actionsEvent)`）：單動作回合制的**主要校準軸**。策略介面因此是 `chooseAction(s): TurnAction` 而不是「挑鍛鍊 ＋ 挑事件」兩個獨立決定 —— 工具的形狀必須跟著規則的形狀（15 §2）。
  掃描時要把**鍛鍊的挑格方式固定**（例如一律專精主檢定屬性），否則「押單維 vs 平均分配」的差距會蓋掉事件佔比的影響，兩個變數混在一起就讀不出結論。
  健康的曲線應該有**峰**：0% 與 100% 都比中間差。若它單調遞減，事件就是被支配的選項，那是設計缺陷而不是玩家選擇

---

## 5. 不變量

1. 同一 `SimConfig` → 位元相同的 `SimReport`
2. 模擬器不 import `src/ui/**` 或 `src/platform/**`
3. 模擬器不修改任何 MetaState（純讀快照）
4. `preview().successRate` 與小檢定的實測通過率在統計上一致（18 §6.2）

> 第 4 條是一條免費的正確性檢查：預覽公式與實際判定若不一致，模擬器會直接抓到。

---

## 6. 刻意不做

- 不做自動調參（輸出報告，由人判斷）
- 不做 AI 學習型策略
- 不進正式建置（開發工具，不隨遊戲出貨）
