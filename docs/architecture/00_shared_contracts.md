# 00 · 共用核心契約

> **定位**：所有模組共同引用的型別與信封。本檔的任何變更都是**破壞式變更**，需更新 `ARCHITECTURE.md` §7 與全部消費者。
> **不含實作**。以下 pseudo-TypeScript 是契約說明，不是指定寫法。

---

## 1. ID 家族

全部使用 branded type。**禁止裸 string 當 ID 傳遞**——這是跨語意轉型門禁的主要目標。

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

// 內容 ID（字串，帶命名空間前綴）
type PackId      = Brand<string, 'PackId'>;      // 'pack:core' | 'pack:wei'
type NotableId   = Brand<string, 'NotableId'>;   // 'notable:guanyu'
type TreasureId  = Brand<string, 'TreasureId'>;  // 'treasure:qinggang'
type TalentId    = Brand<string, 'TalentId'>;
type SkillId     = Brand<string, 'SkillId'>;
type ChapterId   = Brand<string, 'ChapterId'>;   // 'chapter:wei.guandu'
type EventDefId  = Brand<string, 'EventDefId'>;
type FactionId   = Brand<string, 'FactionId'>;   // 'faction:wei'
type EndingId    = Brand<string, 'EndingId'>;
type ShopItemId  = Brand<string, 'ShopItemId'>;
type RankId      = Brand<string, 'RankId'>;      // 'rank:civil.7'

// 效果引用（數字，見 §7）
type EffectId    = Brand<number, 'EffectId'>;

// 修正點詞彙（見 01_effect_system）
type TargetId    = Brand<string, 'TargetId'>;    // 'training.exp.war'
type FlagId      = Brand<string, 'FlagId'>;
type ChargeId    = Brand<string, 'ChargeId'>;

// 局內實例（RunState 內部，不進資料檔）
type RunInstanceId = Brand<string, 'RunInstanceId'>;
```

**命名空間前綴是強制的**：`notable:guanyu` 而非 `guanyu`。理由是載入錯誤訊息與 debug log 只看到 ID 時仍能判斷它是什麼。

---

## 2. 屬性、光階與四維

```ts
type Attr = 'war' | 'int' | 'pol' | 'cha';              // 武 智 政 魅
type GlowTier = 'none' | 'silver' | 'gold' | 'red';     // 無 銀 金 紅
type AptitudeGrade = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
type AttrGrade = 'G' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';   // 四維的等級
type AbilityTier = 'common' | 'fine' | 'peerless';      // 常 良 絕
type SkillKind = 'physical' | 'magic' | 'heal' | 'buff' | 'debuff';
type Phase = 'nanhua' | 'faction';                      // 南華村篇 / 陣營篇
```

這五個是 `ARCHITECTURE.md` §2.1 認定的**結構性不變量**（enum 在 code，數值在 data）。
`GlowTier` 的**有序性**由 code 保證；各階的機率與倍率一律來自 `pack:core` 的資料。

---

## 3. 回合座標

```ts
type TurnIndex    = Brand<number, 'TurnIndex'>;     // 1-based，整局遞增（1..72）
type ChapterIndex = Brand<number, 'ChapterIndex'>;  // 1-based（1..9）

interface TurnProgress {
  readonly turn: TurnIndex;
  readonly chapter: ChapterIndex;
  readonly chapterId: ChapterId;
  readonly turnInChapter: number;      // 衍生值
  readonly phase: Phase;
}
```

**`turn` 是唯一權威**，`chapter` 與 `turnInChapter` 由章節表推導。不得反向以 `turnInChapter` 推 `turn`——章節長度是資料，可能非等長。

---

## 4. RNG 契約

```ts
type Seed = Brand<number, 'Seed'>;

type RngStream =
  | 'glow.base'          // 光階保底抽取
  | 'glow.upgrade'       // 升階判定
  | 'notable.slot'       // 名士站位分配
  | 'notable.roster'     // 入夢時的陣容組建
  | 'event.draw'         // 事件槽抽取
  | 'event.params'       // 委託模板參數填充
  | 'check.roll'         // 檢定骰
  | 'treasure.drop';     // 寶物與碎片掉落

interface Weighted<T> { readonly item: T; readonly weight: number }

interface DeterministicRng {
  next(stream: RngStream): number;                                   // [0, 1)
  int(stream: RngStream, minIncl: number, maxExcl: number): number;
  pick<T>(stream: RngStream, items: readonly T[]): T;
  weighted<T>(stream: RngStream, entries: readonly Weighted<T>[]): T;
}
```

### 4.1 每個 stream 各自持有 counter

```ts
type RngCursors = Readonly<Record<RngStream, number>>;
```

**這是存檔相容性的關鍵**：若所有隨機共用一條序列，未來新增一個用到 RNG 的功能會**位移**既有序列，導致舊存檔續玩時後續結果全變。獨立 stream 讓新增功能只影響它自己那條。

新增 stream 是**相容變更**（舊存檔該 stream counter 視為 0）；刪除或改名是破壞式變更。

### 4.2 禁則

- 禁止使用全域隨機源（門禁檢查）
- 禁止在同一個決策中跨 stream 取值（會讓「這個結果從哪來」無法追溯）
- `pick` / `weighted` 傳入空集合是**程式錯誤，必須 throw**，不得靜默回退

---

## 5. MetaState 頂層形狀

跨 Run 持久。**只有結算模組（26）與元層模組（7–13）可寫。**

```ts
interface MetaState {
  readonly schemaVersion: number;
  readonly contentVersion: ContentVersionStamp;   // §8

  readonly points: number;                        // 輪迴點數
  readonly notableCodex: Readonly<Record<NotableId, NotableCodexEntry>>;
  readonly treasureCodex: Readonly<Record<TreasureId, TreasureCodexEntry>>;
  readonly shop: ShopState;                       // 已購買／已解鎖
  readonly collection: CollectionState;           // 事件圖鑑、結局圖鑑
  readonly stats: LifetimeStats;                  // 跨 Run 統計
}

interface NotableCodexEntry {
  readonly startAffinity: number;   // 碎片投入的成果，同時是解鎖刻度
  readonly fragments: number;       // 未投入的碎片存量
}

interface TreasureCodexEntry {
  readonly enhanceLevel: number;
  readonly fragments: number;
  readonly discovered: boolean;     // 是否曾取得過（決定能否攜帶）
}
```

各欄位的完整 Schema 由對應模組契約擁有。本檔只固定**頂層鍵與所有權**。

---

## 6. RunState 頂層形狀

單局夢境。夢醒即銷毀。

```ts
interface RunState {
  readonly schemaVersion: number;
  readonly seed: Seed;
  readonly rngCursors: RngCursors;

  // 入夢當下的 MetaState 完整凍結快照（ARCHITECTURE §2.11）
  readonly metaSnapshot: MetaState;

  readonly config: DreamEntryConfig;      // 14
  readonly progress: TurnProgress;        // §3
  readonly faction: FactionId | null;     // 虎牢關前為 null
  readonly attributes: AttributeState;    // 20
  readonly currencies: CurrencyState;     // 20
  readonly career: CareerState;           // 21
  readonly roster: RosterState;           // 19
  readonly treasures: RunTreasureState;   // 24
  readonly skills: RunSkillState;         // 23
  readonly slots: SlotState;              // 16 + 17
  readonly ending: EndingOutcome | null;  // 25，達成後才寫入
}
```

### 6.1 metaSnapshot 的三條方向規則

| 規則 | 由誰保證 |
|---|---|
| 局內模組只讀 `metaSnapshot`，不得 import 活的 MetaState | 依賴圖門禁 |
| 局內模組不得寫 MetaState | 依賴圖門禁 |
| 只有結算模組（26）可同時持有 RunState 與活的 MetaState | Composition 註冊 |

### 6.2 slots 為什麼進存檔

`SlotState` 是本回合已抽出的四個鍛鍊格與 0–3 個事件。它**必須存檔**，否則玩家中途離開再回來，槽位會用新的 RNG cursor 重抽——等同白送一次重抽。

---

## 7. 效果引用

```ts
interface EffectRef {
  readonly funcType: FuncType;
  readonly referId: EffectId;
}

interface UnlockRow extends EffectRef {
  readonly affinity: number;               // 解鎖門檻
  readonly supersedes?: readonly number[]; // 同來源內被取代的門檻
}
```

完整語意見 [01 · 效果系統](01_effect_system.md)。

---

## 8. Definition 共通形狀

```ts
interface DefinitionHeader {
  readonly id: string;              // 帶命名空間前綴
  readonly kind: DefinitionKind;    // 家族判別
  readonly schemaVersion: number;
  readonly packId: PackId;
}

interface ContentVersionStamp {
  readonly packs: Readonly<Record<PackId, string>>;  // packId → version
  readonly hash: string;                             // 全部產物的內容雜湊
}
```

### 8.1 `kind` 只裝家族，變體另開欄位 ★

`kind` 是 Registry 判斷「這是哪一族 Definition、由哪個模組擁有」的依據。**不得同時用它裝領域變體。**

```ts
// 正確
interface TreasureDefinition extends DefinitionHeader {
  readonly kind: 'treasure';            // 家族
  readonly treasureTier: TreasureTier;  // 變體
}

// 錯誤：Registry 用 kind 永遠找不到任何 treasure
interface TreasureDefinition extends DefinitionHeader {
  readonly kind: TreasureTier;          // 變體佔用了家族欄位
}
```

這個錯誤**不會讓任何測試失敗**——fixture 若自己寫成程式期待的樣子，雙方會一起錯，直到接上真內容才發現查詢永遠回空。

同理：事件的家族是 `kind: 'event'`，三類用 `eventKind`；委託的細分用 `commissionKind`。

### 8.2 `contentVersion` 的用途

存檔記錄它是為了**拒絕在不相容內容版本上續玩**，而不是為了自動修補。內容版本不合時明確拒絕載入並告知玩家，不得靜默沿用。

---

## 9. 訊息信封

```ts
interface GameCommand<K extends string = string, P = unknown> {
  readonly kind: K;        // 'training.select' | 'event.select' | 'turn.advance' | …
  readonly payload: P;
}

interface InternalCommand<K extends string = string, P = unknown> {
  readonly kind: K;
  readonly payload: P;
}

interface DomainEvent<K extends string = string, P = unknown> {
  readonly kind: K;        // 'glow.resolved' | 'affinity.changed' | 'chapter.passed' | …
  readonly payload: P;
  readonly turn: TurnIndex;
}
```

### 9.1 結果與拒絕

```ts
type CommandOutcome<T = void> =
  | { readonly ok: true;  readonly value: T; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly rejection: Rejection };

interface Rejection {
  readonly code: RejectionCode;   // 具名列舉，非自由字串
  readonly detail: string;        // 給開發者，不直接顯示給玩家
  readonly l10nKey: string;       // 給玩家的訊息鍵
}

type RejectionCode =
  | 'turn.not-ready'            // 鍛鍊未選，不可推進
  | 'slot.already-used'
  | 'threshold.not-met'         // 名聲／功績／官階門檻不足
  | 'faction.not-eligible'      // 善惡名不符陣營資格
  | 'capability.disabled'       // 功能因資料缺失未啟用
  | 'charge.exhausted'
  | 'content.version-mismatch';
```

**`capability.disabled` 是「五個合法出口」第 3 條的載體。** 任何「資料還沒有」的情況都必須走到這個 code，不得回傳成功。

### 9.2 UI 不得看到核心 ID

`ui/` 送出的是 `GameCommandRequest`：以**槽位序號**（0–3）而非 `EventDefId` 指定選擇。ID 的解析由 app 層完成。這讓 UI 在型別上就無法構造非法指令。

---

## 10. 交易（Transaction）

一個 GameCommand 引發的狀態變更必須是**原子的**：

```ts
interface Transaction {
  readonly command: GameCommand;
  readonly stateBefore: RunState;
  commit(): CommandOutcome;    // 全成功才提交
  reject(r: Rejection): void;  // 任一步拒絕即整筆回退
}
```

- 事件 outbox 在 commit 後才發送。**禁止在交易中途發事件**——否則訂閱者會看到未提交的狀態
- `app/workflows/` 可編排多個 InternalCommand，但**不得把失敗藏成成功**

---

## 11. ModuleContract 註冊格式

每個模組必須宣告，由 Composition 驗證：

```ts
interface ModuleContract {
  readonly moduleId: ModuleId;
  readonly owns: readonly string[];          // 它獨占寫入的 State slice 鍵
  readonly reads: readonly ModuleId[];       // 它依賴的模組（僅 contracts）
  readonly handles: readonly string[];       // 它處理的 command kind
  readonly emits: readonly string[];         // 它發出的 event kind
  readonly ownsDefinitions: readonly DefinitionKind[];
  readonly invariants: readonly string[];    // 人類可讀；每條須有測試釘住
}
```

**啟動驗證必須雙向檢查**：

| 方向 | 擋什麼 |
|---|---|
| 正向 | 宣告了 `handles` 但沒有 Handler 實作 |
| **反向** | 有 Handler 實作但沒有任何 `ModuleContract` 宣告它 |

反向那條是「宣告 ≠ 接線」最難察覺的方向：兩邊都綠，而那段程式永遠不會被呼叫。

---

## 12. 驗證錯誤格式

```ts
interface ValidationError {
  readonly layer: 'schema' | 'reference' | 'rule';
  readonly file: string;            // 產物路徑
  readonly jsonPath: string;        // 例 'unlocks[4].referId'
  readonly definitionId: string | null;
  readonly message: string;
  readonly hint: string | null;     // 怎麼修
}
```

六個欄位都不可省。只說「有問題」而不說「在哪、怎麼來的」的錯誤訊息會被當成雜訊繞過。
