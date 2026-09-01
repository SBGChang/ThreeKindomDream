# 介面全表（public surface）

> **定位**：33 個模組的完整對外函式，以及模組間的持有關係。
>
> 決策記錄見 [RFC-01](../RFC-01-campaign-rework.md)。
> 每個模組只從 `public.ts` 匯出這些；其餘一律 internal。
> **不含實作**。簽章是契約，不是指定寫法。

---

## 1. 簽章慣例

以下五條貫穿全表，不得個案例外。

| 慣例 | 形式 | 理由 |
|---|---|---|
| **唯讀查詢** | `f(args, ctx: RunContext): T` | 純函式，可在任何地方呼叫，不消耗 RNG |
| **需要隨機** | `f(args, ctx: TurnContext): T` | 由型別保證只有該拿到的模組拿得到 RNG |
| **狀態變更** | `f(args, ctx): CommandOutcome<RunState>` | 回傳新狀態；失敗回 typed rejection |
| **元層寫入** | `f(args, meta: MetaState): MetaState` | 同上，但回新的 MetaState |
| **`ctx` 一律最後一個參數** | — | 讓呼叫端讀起來是「做什麼」而非「在哪做」 |

三條禁則：

- **不用 optional 參數**，需要「沒有」時明確傳 `null`
- **不用函式多載**，語意不同就是不同函式名
- **不回 `undefined`**，查不到就 `throw`（引用完整性已由載入驗證保證）；真的可能不存在時用 `tryXxx` 明示

### 1.1 兩處與先前契約不同的修正

寫介面時發現兩個洞：

| # | 問題 | 修正 |
|---|---|---|
| 1 | ① 效果系統原本宣告「無 State slice」，但 `charge` 的已消耗次數必須存在某處 | ① **改為擁有 `RunState.charges`** |
| 2 | 「⑯ 不可寫 currencies」原本只靠門禁 | ⑳ **拆成 `StatQuery` / `StatWriter`**，⑯ 的建構式只收 `Pick<StatWriter,'grantAttr'>` —— 由型別擋，不靠掃描 |

---

## 2. 橫切層

### ① 效果系統 — `modules/effect/public.ts`

```ts
export interface EffectResolver {
  resolve(target: TargetId, baseValue: number, ctx: RunContext): number;
  hasFlag(flag: FlagId, ctx: RunContext): boolean;
  chargesOf(charge: ChargeId, ctx: RunContext): number;
  consumeCharge(charge: ChargeId, ctx: RunContext): CommandOutcome<RunState>;
  reactorsFor(eventKind: string, ctx: RunContext): readonly BoundReactor[];
  overridesFor(point: DecisionPoint, ctx: RunContext): readonly BoundOverride[];
  explain(target: TargetId, ctx: RunContext): readonly EffectTrace[];
}

export interface EffectSource {
  collect(ctx: RunContext): readonly ResolvedEffectRef[];   // 已完成 supersedes 過濾
}

export interface EffectHandler {
  readonly type: FuncType;
  parse(row: unknown): EffectDef;                          // 解析自己那張表的一列
}

export function evaluateCondition(c: Condition, ctx: RunContext): boolean;
export function applyResolveOrder(base: number, cs: readonly Contribution[]): number;

export const EFFECT_TARGETS: readonly TargetId[];          // Target 註冊表
export const EFFECT_FLAGS: readonly FlagId[];
export const EFFECT_CHARGES: readonly ChargeId[];
export const FUNC_TYPES: readonly FuncType[];
export const effectContract: ModuleContract;
```

`applyResolveOrder` 單獨匯出成純函式，讓「(base + Σadd) × Π(1+mulPct) → override → clamp」的順序可以獨立測試，不需要建整個 Run。

### ② Data Runtime — `data-runtime/public.ts`

```ts
export interface DefinitionCompiler {
  compile(repo: ContentRepository): CompileResult;
}

export interface DefinitionRegistry {
  reader<K extends DefinitionKind>(kind: K): TypedReader<K>;
  version(): ContentVersionStamp;
  installedPacks(): readonly PackId[];
  hasPack(id: PackId): boolean;
}

export interface TypedReader<K extends DefinitionKind> {
  get(id: string): DefinitionOf<K>;                        // 查不到 throw
  tryGet(id: string): DefinitionOf<K> | null;
  allIds(): readonly string[];
  where(pred: (d: DefinitionOf<K>) => boolean): readonly DefinitionOf<K>[];
}

export interface ContentRepository {                        // platform 實作
  list(): readonly string[];
  read(path: string): string;
}

export type CompileResult =
  | { readonly ok: true;  readonly registry: DefinitionRegistry; readonly version: ContentVersionStamp }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

export const DEFINITION_KINDS: readonly DefinitionKindEntry[];
export const DEFINITION_MIGRATIONS: readonly DefinitionMigration[];
```

`where()` 而非匯出整個索引 —— 讓 Reader 保持窄化，模組拿不到「全部資料」的把手。

### ③ RunState — `modules/run-state/public.ts`

```ts
export interface RunStateStore {
  current(): RunState;
  begin(cmd: GameCommand): Transaction;
}

export interface Transaction {
  readonly command: GameCommand;
  readonly before: RunState;
  write<K extends SliceKey>(slice: K, next: RunState[K], by: ModuleId): void;
  emit(event: DomainEvent): void;
  commit(): CommandOutcome<RunState>;
  reject(r: Rejection): CommandOutcome<never>;
}

export interface RunStateCodec {
  serialize(s: RunState): string;
  deserialize(raw: string, version: number): RunState | Rejection;
}

export function createRunState(
  config: DreamEntryConfig, metaSnapshot: MetaState, seed: Seed, defs: DefinitionRegistry,
): RunState;

export function contextOf(state: RunState, defs: DefinitionRegistry): RunContext;
export function turnContextOf(state: RunState, defs: DefinitionRegistry, rng: DeterministicRng): TurnContext;

export const SLICE_OWNERS: Readonly<Record<SliceKey, ModuleId>>;
```

`write(slice, next, by)` 帶 `by: ModuleId` —— **交易在執行期對照 `SLICE_OWNERS` 檢查所有權**。宣告（ModuleContract）與實際（這個參數）雙向對得上，才是真的守住。

### ④ RNG — `kernel/rng/public.ts`

```ts
export interface DeterministicRng {
  next(stream: RngStream): number;
  int(stream: RngStream, minIncl: number, maxExcl: number): number;
  pick<T>(stream: RngStream, items: readonly T[]): T;
  weighted<T>(stream: RngStream, entries: readonly Weighted<T>[]): T;
  cursors(): RngCursors;
  trace(): readonly RngTrace[];                            // 僅開發模式
}

export function createRng(seed: Seed, cursors: RngCursors): DeterministicRng;
export function emptyCursors(): RngCursors;
export const RNG_STREAMS: readonly RngStream[];
```

`cursors()` 讓回合結束時把游標寫回 RunState。**沒有 `reset()`** —— 那會破壞可重播。

### ⑤ 事件匯流排 — `kernel/event-bus/public.ts`

```ts
export interface EventBus {
  publish(events: readonly DomainEvent[]): void;           // 僅 Transaction.commit 可呼叫
  subscribe(kind: string, handler: EventHandler): Unsubscribe;
  subscribeAll(handler: EventHandler): Unsubscribe;
}

export type EventHandler = (e: DomainEvent) => void;
export type Unsubscribe = () => void;
export const EVENT_KINDS: readonly string[];
```

### ⑥ 本地化 — `modules/l10n/public.ts`

```ts
export interface Localizer {
  readonly lang: LangCode;
  text(key: L10nKey): string;
  has(key: L10nKey): boolean;
  allKeys(): readonly L10nKey[];
}

export function key(raw: string): L10nKey;                 // 唯一的 branded 建構子
export function collectUsedKeys(roots: readonly string[]): readonly L10nKey[];
```

`collectUsedKeys` 是**建置門禁**用的：掃出 code 與資料中所有 key，比對資源檔，缺任何一個就讓 CI 失敗。
`key()` 是唯一能造出 `L10nKey` 的地方，因此靜態掃描找得到全部使用處。

---

## 3. 元層

### ⑦ 存檔 — `modules/save/public.ts`

```ts
export interface SaveService {
  write(slot: SaveSlot, meta: MetaState, run: RunState | null): Promise<CommandOutcome<void>>;
  load(slot: SaveSlot): Promise<LoadResult>;
  remove(slot: SaveSlot): Promise<CommandOutcome<void>>;
  exists(slot: SaveSlot): Promise<boolean>;
}

export type LoadResult =
  | { readonly ok: true;  readonly meta: MetaState; readonly run: RunState | null }
  | { readonly ok: false; readonly rejection: Rejection;
      readonly recovery: readonly RecoveryOption[] };

export type RecoveryOption =
  | { readonly kind: 'discardRun'; readonly labelKey: L10nKey };   // 保 meta、棄進行中的夢

export interface SaveStore {                                // platform 實作
  read(slot: SaveSlot): Promise<string | null>;
  write(slot: SaveSlot, raw: string): Promise<void>;
  remove(slot: SaveSlot): Promise<void>;
}

export const SAVE_MIGRATIONS: readonly SaveMigration[];
export const SAVE_FORMAT_VERSION: number;
```

`recovery` 是 §「五個合法出口」第 5 條的具體形狀：**降級選項回給玩家，由玩家決定**，不自動執行。

### ⑧ 輪迴點數 — `modules/points/public.ts`

```ts
export interface PointsLedger {
  balance(meta: MetaState): number;
  grant(amount: number, reason: GrantReason, meta: MetaState): CommandOutcome<MetaState>;
  spend(amount: number, reason: SpendReason, meta: MetaState): CommandOutcome<MetaState>;
}

export function computeSettlementPoints(
  summary: RunSummary, formula: SettlementFormulaDef,
): number;
```

`grant` 只接受 ㉖ 呼叫、`spend` 只接受 ⑨ 呼叫 —— 由 Composition 注入時限制，不是靠約定。
`computeSettlementPoints` 匯出成純函式，讓公式可獨立測試與被 ㉛ 模擬器直接呼叫。

### ⑨ 天命商店 — `modules/shop/public.ts`

```ts
export interface Shop {
  catalog(meta: MetaState): readonly ShopEntry[];
  entry(itemId: ShopItemId, meta: MetaState): ShopEntry | null;
  purchase(itemId: ShopItemId, meta: MetaState): CommandOutcome<MetaState>;
  shopLimits(meta: MetaState): ShopDerivedLimits;
  effectRefs(meta: MetaState): readonly EffectRef[];        // grant.kind === 'effect' 的部分
}

export interface ShopEntry {
  readonly itemId: ShopItemId;
  readonly currentLevel: number;
  readonly nextLevel: ShopLevel | null;                    // null ＝ 已購滿
  readonly affordable: boolean;
  readonly blockedBy: readonly ShopItemId[];
}

export interface ShopDerivedLimits {
  readonly aptitudeCaps: Readonly<Record<Attr, AptitudeGrade>>;
  readonly aptitudePoints: number;
  readonly talentPoints: number;
  readonly treasureSlots: number;
  readonly unlockedTalents: readonly TalentId[];
  readonly factionBonds: Readonly<Record<FactionId, number>>;
}
```

**只回自己那部分的上限**。完整的 `ConfigLimits` 由 ⑭ 從 ⑨＋⑩＋⑪ 三處組裝 —— 商店不該知道「哪些名士可指定」。

### ⑩ 名士圖鑑 — `modules/notable-codex/public.ts`

```ts
export interface NotableCodexQuery {
  entry(id: NotableId, meta: MetaState): NotableCodexEntry;
  startAffinity(id: NotableId, meta: MetaState): number;
  unlockedRows(id: NotableId, meta: MetaState): readonly UnlockRow[];   // 已套 supersedes
  designatable(meta: MetaState): readonly NotableId[];
  maxedCount(meta: MetaState): number;
  nextCost(id: NotableId, meta: MetaState): number | null;              // null ＝ 已滿
}

export interface NotableCodexWriter {
  awardFragments(
    entries: readonly { notableId: NotableId; finalStage: AffinityStage }[],
    isFullDream: boolean,
    meta: MetaState,
  ): MetaState;
}

export function notableEffectSource(roster: readonly NotableId[]): EffectSource;
```

**`unlockedRows` 就是 `supersedes` 過濾的落點**（效果管線不做這件事）。
`notableEffectSource(roster)` 是工廠：吃本輪陣容、產出對應的 `EffectSource`。

### ⑪ 寶物圖鑑 — `modules/treasure-codex/public.ts`

```ts
export interface TreasureCodexQuery {
  entry(id: TreasureId, meta: MetaState): TreasureCodexEntry;
  carryable(meta: MetaState): readonly TreasureId[];       // discovered === true
  activeEffects(id: TreasureId, meta: MetaState): readonly EffectRef[];
  discoveredCount(meta: MetaState): number;
  nextCost(id: TreasureId, meta: MetaState): number | null;
}

export interface TreasureCodexWriter {
  markDiscovered(ids: readonly TreasureId[], meta: MetaState): MetaState;
  awardFragments(
    entries: Readonly<Record<TreasureId, number>>, meta: MetaState,
  ): MetaState;
}

export function treasureEffectSource(held: readonly TreasureId[]): EffectSource;
```

`activeEffects` 依 `enhanceLevel` 回**該級的完整效果集**（強化是取代，不是疊加）。

### ⑫ 收集圖鑑 — `modules/collection/public.ts`

```ts
export interface CollectionQuery {
  progress(meta: MetaState, defs: DefinitionRegistry): CollectionProgress;
  seenEvent(id: EventDefId, meta: MetaState): boolean;
  reachedEnding(id: EndingId, meta: MetaState): boolean;
  collectibleTotals(defs: DefinitionRegistry): CollectionTotals;
}

export interface CollectionWriter {
  recordEvents(ids: readonly EventDefId[], runIndex: number, meta: MetaState): MetaState;
  recordEnding(id: EndingId, runIndex: number, points: number, meta: MetaState): MetaState;
}
```

`collectibleTotals(defs)` 的分母**只計已安裝 pack 宣告 `collectible` 的內容** —— 否則完成度永遠達不到。

### ⑬ 成就與統計 — `modules/achievements/public.ts`

```ts
export interface AchievementService {
  unlocked(meta: MetaState): readonly AchievementId[];
  visible(meta: MetaState): readonly AchievementView[];    // hidden 者未達成前不揭露描述
  onEvent(e: DomainEvent, meta: MetaState): MetaState;     // 純訂閱者
}

export function verifyPointsLedger(meta: MetaState): boolean;
```

`verifyPointsLedger` 斷言 `pointsEarnedTotal − pointsSpentTotal === points`。兩個模組各自獨立累加，對不上就代表其中一邊漏記或重複記 —— 一條免費的正確性檢查，載入存檔時跑一次。

---

## 4. 配置層

### ⑭ 入夢配置 — `modules/dream-entry/public.ts`

```ts
export interface DreamEntryConfigurator {
  limits(meta: MetaState): ConfigLimits;                   // 組裝 ⑨＋⑩＋⑪
  emptyDraft(meta: MetaState): ConfigDraft;
  setAptitude(draft: ConfigDraft, attr: Attr, grade: AptitudeGrade): CommandOutcome<ConfigDraft>;
  toggleTalent(draft: ConfigDraft, id: TalentId): CommandOutcome<ConfigDraft>;
  toggleTreasure(draft: ConfigDraft, id: TreasureId): CommandOutcome<ConfigDraft>;
  designateCompanion(draft: ConfigDraft, slot: 0 | 1 | 2, id: NotableId | null): CommandOutcome<ConfigDraft>;
  cost(draft: ConfigDraft): DraftCost;                     // 已用點數／格數，供 UI 顯示超支
  validate(draft: ConfigDraft, meta: MetaState): readonly Rejection[];
  confirm(draft: ConfigDraft, meta: MetaState, seed: Seed): CommandOutcome<RunState>;
}

export interface DraftCost {
  readonly aptitudePointsUsed: number;
  readonly talentPointsUsed: number;
  readonly treasureSlotsUsed: number;
  readonly overBudget: boolean;
}

export function configEffectSource(config: DreamEntryConfig): EffectSource;  // 天賦與資質
```

**`validate` 回陣列不回第一個錯誤**：玩家一次可能超支多項，逐個修太慢。
**`cost` 與 `validate` 分開**：編輯期允許暫時超支（顯示「超支 3 點」），`confirm` 才做完整驗證。

---

## 5. 局內層

### ⑮ 章節回合推進 — `modules/turn/public.ts`

```ts
export interface TurnService {
  canAdvance(ctx: RunContext): boolean;                    // ⟺ slots.training.selected !== null
  advance(ctx: TurnContext): CommandOutcome<RunState>;
  currentChapter(ctx: RunContext): ChapterDefinition;
  isChapterEnd(ctx: RunContext): boolean;
  sequenceOf(faction: FactionId | null, defs: DefinitionRegistry): readonly ChapterId[];
  onChapterPassed(ctx: RunContext): CommandOutcome<RunState>;
  progressOf(turn: TurnIndex, faction: FactionId | null, defs: DefinitionRegistry): TurnProgress;
}
```

`progressOf` 匯出成純函式：`turn` 是唯一權威，`chapter` 與 `turnInChapter` 由它 ＋ 章節表推導。獨立可測，也擋下「反向用固定除法算章節」這種在非等長章節上會錯的寫法。

### ⑯ 鍛鍊槽 — `modules/training/public.ts`

```ts
export interface TrainingSlotService {
  generate(ctx: TurnContext): TrainingSlotState;
  select(index: SlotIndex, ctx: TurnContext): CommandOutcome<RunState>;
  reroll(ctx: TurnContext): CommandOutcome<RunState>;
  preview(index: SlotIndex, ctx: RunContext): TrainingPreview;
}

export interface TrainingPreview {
  readonly attr: Attr;
  readonly baseGlow: GlowTier;
  readonly expectedGain: number;                           // 以保底光階計
  readonly upgradeChance: number;
  readonly notableMultiplier: number;
  readonly breakdown: readonly EffectTrace[];
}

export function applyShift(
  weights: readonly number[], shiftSteps: number, stepRatio: number,
): readonly number[];

export function resolveGain(input: GainInput): number;
```

**建構式只收 `Pick<StatWriter, 'grantAttr'>`** —— ⑯ 在型別上寫不到 `currencies`。這是「鍛鍊不產出貨幣」從門禁規則升級為型別保證。

`applyShift` 與 `resolveGain` 匯出成純函式，讓兩層 RNG 的權重變換與乘法鏈可以脫離 Run 獨立測試。

### ⑰ 事件槽 — `modules/event-slot/public.ts`

```ts
export interface EventSlotService {
  draw(ctx: TurnContext): EventSlotState;
  optionStates(offerIndex: number, ctx: RunContext): readonly OptionState[];
  selectOption(offerIndex: number, optionIndex: number, ctx: TurnContext): CommandOutcome<RunState>;
  reroll(ctx: TurnContext): CommandOutcome<RunState>;
  /** 供 ⑮ 組合出「本回合的動作」（15 §2.1）。 */
  resolvedAction(ctx: RunContext): TurnAction | null;
}

export function eligiblePool(ctx: RunContext): readonly EventDefId[];
export function drawParams(def: EventDefinition, ctx: TurnContext): Readonly<Record<string, L10nKey>>;
/** 事上磨練，純函式 —— 預覽與結算共用同一條算式，兩者不可能不一致（17 §6.2）。 */
export function practiceYield(
  practice: readonly EventPractice[], ratio: number, ctx: RunContext,
): readonly AttrGain[];
```

`eligiblePool` 是純函式且獨立匯出 —— **門檻過濾的正確性是本模組最需要測試的部分**（名聲不足時池會不會意外變空、faction 類事件會不會在南華村篇漏出來），不該綁在需要 RNG 的 `draw` 裡才能測。

**沒有 `skip`。** 一回合只能投一個動作，「不做事件」等於改選鍛鍊（15 §2、17 §1.2）。

`practiceYield` 獨立匯出的理由與 `eligiblePool` 相同，但更強：UI 必須用它算預覽
（`OptionState.practicePreview`），結算也必須用它算實得。若各算一次，兩者就會有
悄悄分岔的一天 —— 而那正好是玩家最不能被騙的數字。

### ⑱ 檢定引擎 — `modules/check/public.ts`

本模組**只服務事件內的小檢定**。章末那一格是 ㉝ 戰役，有自己的算式。

```ts
export function preview(
  spec: CheckSpec, ctx: RunContext, fx: EffectResolver,
): CheckPreview;
export function resolveCheck(
  spec: CheckSpec, ctx: TurnContext, fx: EffectResolver,
): CheckOutcome;
export function specForMinor(attr: Attr, dc: number): CheckSpec;

export function successRate(
  base: number, bonus: number, dc: number, rule: CheckRuleDefinition,
): number;
```

`preview` 收 `RunContext`、`resolveCheck` 收 `TurnContext` —— 由型別保證預覽不消耗隨機。

`successRate` 獨立匯出，供 ㉛ 模擬器對照實測通過率 —— 預覽公式與實際判定若不一致，模擬器直接抓到。

### ⑲ 名士局內狀態 — `modules/roster/public.ts`

```ts
export interface RosterService {
  assembleCompanions(ctx: TurnContext): CommandOutcome<RunState>;      // 入夢時
  selfSelectQuota(ctx: RunContext): number;                            // 由勢力緣分決定
  superiorCandidates(ctx: RunContext): readonly NotableId[];
  assignSuperiors(chosen: readonly NotableId[], ctx: TurnContext): CommandOutcome<RunState>;

  members(ctx: RunContext): readonly RosterMember[];
  stageOf(id: NotableId, ctx: RunContext): AffinityStage;

  distributeSlots(ctx: TurnContext): readonly (readonly NotableId[])[];  // 長度 4
  trainingMultiplier(slotNotables: readonly NotableId[], ctx: RunContext): number;
  gainAffinity(ids: readonly NotableId[], ctx: RunContext): CommandOutcome<RunState>;

  eligibleForSortie(checkId: MajorCheckId, ctx: RunContext): readonly NotableId[];

  unlockedEventStages(ctx: RunContext): readonly NotableStageRef[];
}
```

`unlockedEventStages` 是給 ⑰ 的：名士事件在對應好感度階段解鎖前不進可抽池。
`eligibleForSortie` 排除該檢定的 `enemyNotables` —— 「選呂布當玩伴，虎牢關就不能靠他」在這裡落實。

### ⑳ 屬性與貨幣 — `modules/stats/public.ts`

```ts
export interface StatQuery {
  read(path: StatPath, ctx: RunContext): number;
  attr(a: Attr, ctx: RunContext): number;
  fame(k: FameKind, ctx: RunContext): number;
  merit(k: MeritKind, ctx: RunContext): number;
  totalFame(ctx: RunContext): number;                      // civil + martial，不含 moral
  totalMerit(ctx: RunContext): number;
}

export interface StatWriter {
  grantAttr(attr: Attr, amount: number, ctx: RunContext): CommandOutcome<RunState>;
  grantFame(kind: FameKind, amount: number, ctx: RunContext): CommandOutcome<RunState>;
  grantMerit(kind: MeritKind, amount: number, ctx: RunContext): CommandOutcome<RunState>;
}
```

**拆成兩個介面是為了讓寫入權限可以逐項注入**：

| 模組 | 拿到的 |
|---|---|
| ⑯ 鍛鍊槽 | 只有 `grantAttr` |
| ⑰ 事件槽 | `StatWriter` 全部（貨幣獎勵 ＋ 事上磨練的四維） |
| ⑱ 檢定引擎 | 只有 `grantFame` 與 `grantMerit` |
| ① ⑰ ⑱ ㉑ ㉒ ㉕ | `StatQuery` |

`grantFame('moral', amount)` 是唯一允許負值的呼叫。

### ㉑ 官階系統 — `modules/career/public.ts`

```ts
export interface CareerService {
  levels(ctx: RunContext): CareerState;
  rankOf(line: CareerLine, ctx: RunContext): CareerRankDefinition;
  commissionTierUnlocked(ctx: RunContext): number;
  reevaluate(ctx: RunContext): CommandOutcome<RunState>;         // 訂閱 currency.gained
}
```

`reevaluate` 內部用 while 迴圈而非 if：戰役深關的功績可能一次跨兩階。

`rankOf(line).hostScale` 是 ㉝ 算兵量與糧量的來源（33 §5.1）。

### ㉒ 陣營系統 — `modules/faction/public.ts`

```ts
export interface FactionService {
  selectable(ctx: RunContext): readonly FactionOption[];
  choose(id: FactionId, ctx: RunContext): CommandOutcome<RunState>;
  current(ctx: RunContext): FactionId | null;
  lordOf(id: FactionId, defs: DefinitionRegistry): NotableId;
}

export interface FactionOption {
  readonly factionId: FactionId;
  readonly eligible: boolean;
  readonly blockedBy: readonly Condition[];
  readonly rejectReasonKey: L10nKey | null;
}
```

`selectable` 回**全部已安裝陣營**（含不合格者，附 `blockedBy`）—— 讓玩家看得到「我這輪惡名太高所以蜀漢不收」。未安裝 pack 的完全不出現在陣列裡。

### ㉓ 特質與技能 — `modules/ability/public.ts`

```ts
export interface AbilityService {
  traits(ctx: RunContext): readonly TraitId[];
  skills(ctx: RunContext): readonly SkillId[];
  hasTrait(id: TraitId, ctx: RunContext): boolean;
  hasSkill(id: SkillId, ctx: RunContext): boolean;
  actionOf(id: SkillId, ctx: RunContext): SkillAction;      // 33 消費
}

export function traitEffectSource(traits: readonly TraitId[]): EffectSource;
```

> 🔧 **RFC-01**：舊版的 `learn(id)` 已移除 —— 學習的唯一入口在 ㉜。
> 技能**不進** `EffectSource`（23 §5）：它的效果只在戰役中發生。

### ㉔ 寶物局內狀態 — `modules/treasure-run/public.ts`

```ts
export interface TreasureRuntimeService {
  held(ctx: RunContext): readonly TreasureId[];
  isHeld(id: TreasureId, ctx: RunContext): boolean;
  displayFor(id: TreasureId, ctx: RunContext): TreasureDisplay;
  acquire(id: TreasureId, ctx: RunContext): CommandOutcome<RunState>;
  rollFromPool(poolId: string, ctx: TurnContext): TreasureId;
  summary(ctx: RunContext): TreasureRunSummary;
}

export interface TreasureDisplay {
  readonly treasureId: TreasureId;
  readonly willBeDuplicate: boolean;
  readonly fragmentCount: number;
}
```

**`displayFor` 在本模組算，不在 UI 算。** 這讓「玩家在二選一事件裡看不看得到自己放棄了碎片」成為一條可測試的規則，而不是 UI 的自由心證。

---

### ㉜ 養成兌現 — `modules/growth/public.ts`

```ts
export interface GrowthQuery {
  exp(attr: Attr, ctx: RunContext): number;
  gradeOf(attr: Attr, ctx: RunContext): AttrGrade;
  attrCost(attr: Attr, target: number, ctx: RunContext): number;
  nextGrade(attr: Attr, ctx: RunContext): NextGrade | null;
  learnableTraits(ctx: RunContext): readonly TraitOffer[];
  learnableSkills(ctx: RunContext): readonly SkillOffer[];
}

export interface GrowthService {
  learnAttr(attr: Attr, target: number, ctx: RunContext): CommandOutcome<RunState>;
  learnTrait(id: TraitId, ctx: RunContext): CommandOutcome<RunState>;
  learnSkill(id: SkillId, ctx: RunContext): CommandOutcome<RunState>;
}
```

三個 `learn*` 全部收 `RunContext` —— **兌換不得引入隨機**，由型別保證（32 §7.1）。

### ㉝ 戰役 — `modules/campaign/public.ts`

```ts
export interface CampaignService {
  hostLimits(ctx: RunContext, fx: EffectResolver): HostLimits;   // 兵量／糧量上限
  hostPower(ctx: RunContext, fx: EffectResolver): number;        // 每回合期望輸出
  hostSustain(ctx: RunContext, fx: EffectResolver): number;      // 糧秣換得回多少軍勢
  nextStagePreview(ctx: RunContext): StagePreview | null;        // 情報，不含勝率
  isOverwhelming(ctx: RunContext, fx: EffectResolver): boolean;  // 掃蕩的判準
  configure(loadout: BattleLoadout, ctx: RunContext): RunState;
  engage(ctx: TurnContext, fx: EffectResolver): { state: RunState; outcome: StageOutcome };
  withdraw(ctx: RunContext): RunState;
}
```

`engage` 是本模組唯一收 `TurnContext` 的方法。`nextStagePreview` **不含勝率**（33 §8.1）——
在一個玩家不操作但變數眾多的系統裡，那個百分比是假的精確。

`hostPower` 不是勝率：它是玩家自己就讀得出來的東西（技能寫著「以兵量的 30%」）。

## 6. 結束層

### ㉕ 結局判定 — `modules/ending/public.ts`

```ts
export interface EndingResolver {
  resolve(trigger: EndingTrigger, ctx: RunContext): EndingOutcome;   // 永不回 null
  reach(trigger: EndingTrigger, ctx: RunContext): CommandOutcome<RunState>;
  moralBandOf(ctx: RunContext): MoralBand;
  candidatesFor(trigger: EndingTrigger, ctx: RunContext): readonly EndingId[];
}
```

`candidatesFor` 獨立匯出，讓「每個 trigger 型別是否都有兜底結局」可以被規則驗證與測試檢查 —— 而不是等到玩家真的走到那個組合才發現沒有結局可達。

### ㉖ 結算產出 — `modules/settlement/public.ts`

```ts
export interface Settlement {
  summarize(run: RunState): RunSummary;
  settle(summary: RunSummary, meta: MetaState): CommandOutcome<SettlementResult>;
  alreadySettled(seed: Seed, meta: MetaState): boolean;
}

export interface SettlementResult {
  readonly meta: MetaState;
  readonly pointsGained: number;
  readonly notableFragments: Readonly<Record<NotableId, number>>;
  readonly treasureFragments: Readonly<Record<TreasureId, number>>;
  readonly newlyDiscovered: readonly TreasureId[];
  readonly affinityRaised: readonly AffinityDelta[];
}
```

`SettlementResult` 帶完整明細，因為結算畫面要逐項展示「這一輪拿到了什麼」。
`alreadySettled(seed)` 支撐冪等：同一輪重複 settle 不重複發放。

---

## 7. 呈現層與工具鏈

### ㉗ 畫面路由 — `ui/routing/public.ts`

```ts
export type Screen =
  | 'menu' | 'shop' | 'codex' | 'config'
  | 'run' | 'learn' | 'campaign' | 'factionChoice'
  | 'ending' | 'settlement';

export interface ScreenRouter {
  current(): Screen;
  allowedFrom(s: Screen): readonly Screen[];
  navigate(to: Screen): CommandOutcome<Screen>;
  derivedFrom(meta: MetaState, run: RunState | null): Screen;
}
```

`derivedFrom` 讓畫面狀態**不進存檔**：重啟後由 MetaState ＋ RunState 推導該在哪個畫面。

### ㉘ 文本模板 — `modules/text-template/public.ts`

```ts
export interface TextTemplate {
  fill(bodyKey: L10nKey, params: Readonly<Record<string, L10nKey>>): string;
  placeholdersOf(bodyKey: L10nKey): readonly string[];
}
```

`placeholdersOf` 讓 ② 的規則驗證能檢查「佔位符集合 ＝ `paramSlots` 集合」雙向相等。

### ㉙ 音效音樂 — `modules/audio/public.ts`

```ts
export interface AudioService {
  onEvent(e: DomainEvent): void;                           // 純訂閱者
  setVolume(channel: AudioChannel, v: number): void;
  mute(channel: AudioChannel, on: boolean): void;
}
```

**不收任何 `ctx`。** 型別上就拿不到 State 或 RNG —— 「移除本模組後同一 seed 結果位元相同」由建構保證，不靠審查。

### ㉚ 內容編譯器 — `scripts/lib/content-compiler.ts`

```ts
export function compileContentSource(manifest: AuthoredManifest): CompileOutput;
export function verifySync(outDir: string, manifest: AuthoredManifest): readonly SyncProblem[];
export function serializeDeterministic(value: unknown): string;
```

`serializeDeterministic` 獨立匯出並單獨測試：key 排序 ＋ 固定縮排 ＋ LF ＋ 數字格式。**產物同步門禁的可靠性完全建立在它的決定性上** —— 若它不穩定，門禁會因無關差異而誤報，最後被繞過。

### ㉛ 平衡模擬器 — `scripts/lib/simulator.ts`

```ts
export function runSimulation(config: SimConfig): SimReport;

export interface AgentPolicy {
  readonly name: string;
  chooseSlot(s: Session): SlotIndex;
  chooseOption(s: Session, offer: EventOffer): number;
  /** 經驗怎麼花（32）。 */
  spend(s: Session): void;
  /** 戰役配置：三招 ＋ 三位指揮各一招（33 §3）。 */
  chooseLoadout(s: Session): BattleLoadout;
  /** 走還留（33 §6）。**這是策略組的主軸線。** */
  chooseEngage(s: Session): boolean;
}

export function playCampaign(s: Session, policy: AgentPolicy): number;
export const POLICIES: readonly AgentPolicy[];
```

`AgentPolicy` 的五個方法**恰好對應玩家在一輪裡的全部決策**。若日後新增第六種，
這個介面會強制被檢視 —— 那正是「模擬器有沒有跟上遊戲」的提醒機制。

`chooseEngage` 的 `margin`（撐得住幾回合 ／ 對面要打幾回合）是策略組鋪開的軸線：
1.05 是「算得剛剛好就上」、2.4 是「要有兩倍餘裕」。兩端的點數差就是貪心的定價。

---

## 8. 跨 slice 讀取規則 ★

`RunContext.state` 是完整的 `RunState`，因此**任何模組在型別上都讀得到別人的 slice**。所有權表（03 §1）只限制了寫入。

若放任直接讀取，模組之間仍會耦合在對方的 slice 形狀上 —— ⑱ 直接寫 `ctx.state.career.civil`，那 ㉑ 改欄位名就會打破 ⑱，而「模組可獨立替換」就是假的。

因此加一條門禁規則：

> **模組只能直接讀取自己擁有的 slice。他人的 slice 必須經擁有者的 Query 介面。**

| 寫法 | 判定 |
|---|---|
| ⑱ 讀 `ctx.state.career.civil` | ❌ 門禁擋下 |
| ㉝ 呼叫 `careerService.rankOf(line, ctx).hostScale` | ✅ |
| ⑯ 讀 `ctx.state.slots.training` | ✅（自己的） |
| ⑮ 讀 `ctx.state.slots.training.selected` | ❌ —— 改呼叫 `trainingSlot.selectedAction(ctx)` |

**這條規則反過來要求每個 slice 擁有者都必須匯出足夠的 Query。** 因此兩個槽各補一個函式：

```ts
// modules/training/public.ts 追加
selectedAction(ctx: RunContext): TurnAction | null;
// modules/event-slot/public.ts 追加
resolvedAction(ctx: RunContext): TurnAction | null;
```

⑮ 的 `actionOf` 是這兩者的 `??` 組合。否則回合推進條件只能靠直接讀兩個 slice 實作
—— 而互斥規則正是最不該偷讀的地方（15 §2.1）。

**檢查方式**：靜態掃 `ctx.state.<slice>` 的存取，比對該檔所屬模組的 `ModuleContract.owns`。這是可完全自動化的門禁，不需要人工審查。

---

## 9. 模組間持有關係

「持有」＝ 在建構式注入該介面。表中不列 `DefinitionReader`（每個模組都收自己需要的窄化 Reader）與 `EventBus`（訂閱關係另列）。

| 模組 | 持有的介面 |
|---|---|
| ① 效果系統 | `EffectSource[]`（全部來源） |
| ② Data Runtime | `ContentRepository` |
| ③ RunState | `DefinitionRegistry` |
| ④ RNG | — |
| ⑤ 事件匯流排 | — |
| ⑥ 本地化 | — |
| ⑦ 存檔 | `SaveStore`、`RunStateCodec` |
| ⑧ 輪迴點數 | — |
| ⑨ 天命商店 | `PointsLedger`（只有 `spend`） |
| ⑩ 名士圖鑑 | — |
| ⑪ 寶物圖鑑 | — |
| ⑫ 收集圖鑑 | `DefinitionRegistry`（算完成度分母） |
| ⑬ 成就統計 | — （純訂閱者） |
| ⑭ 入夢配置 | `Shop`、`NotableCodexQuery`、`TreasureCodexQuery` |
| ⑮ 章節回合 | `TrainingSlotService`（只有 `hasSelection`） |
| ⑯ 鍛鍊槽 | `EffectResolver`、`RosterService`、`StatWriter`（只有 `grantAttr`） |
| ⑰ 事件槽 | `EffectResolver`、`CheckEngine`、`StatQuery`、`StatWriter`、`RosterService`、`TreasureRuntimeService`、`SkillService`、`TextTemplate` |
| ⑱ 檢定引擎 | `EffectResolver`、`StatQuery`、`StatWriter`（只有 fame／merit）、`CareerService`、`RosterService` |
| ⑲ 名士局內 | `EffectResolver`、`NotableCodexQuery` |
| ⑳ 屬性貨幣 | `EffectResolver` |
| ㉑ 官階系統 | `StatQuery` |
| ㉒ 陣營系統 | `StatQuery` |
| ㉓ 技能系統 | — |
| ㉔ 寶物局內 | `TreasureCodexQuery` |
| ㉕ 結局判定 | `StatQuery`、`CareerService`、`FactionService`、`TurnService` |
| ㉖ 結算產出 | `PointsLedger`、`NotableCodexWriter`、`TreasureCodexWriter`、`CollectionWriter`、`SaveService`、`RosterService`、`TreasureRuntimeService`、`SkillService`、`CareerService`、`FactionService`、`TurnService` |
| ㉗ 畫面路由 | read-models |
| ㉘ 文本模板 | `Localizer` |
| ㉙ 音效音樂 | — （純訂閱者） |
| ㉚ 內容編譯器 | — |
| ㉛ 平衡模擬器 | 全核心（唯讀） |

### 9.1 兩個觀察

**⑰ 事件槽持有 8 個介面，是全專案最多的。** 這是合理的 —— 它是唯一同時碰到檢定、貨幣、名士、寶物、技能、文本的模組。但它也因此是**最需要拆的候選**：若日後超過 10 個，該把「委託執行」與「名士事件執行」拆成兩個模組。

**㉖ 結算持有 11 個介面，但全是唯讀查詢 ＋ 元層寫入。** 它不持有任何局內的寫入介面 —— 因為結算時 Run 已經結束，不該再改變它。這在型別上就守住了。

### 9.2 沒有任何雙向持有

檢查過全表：不存在 A 持有 B 且 B 持有 A 的情況。所有需要「回頭通知」的關係一律走事件：

| 想要的關係 | 實際做法 |
|---|---|
| ㉑ 官階想在功績變動時升遷 | ⑳ 發 `currency.gained`，㉑ 訂閱 |
| ㉒ 陣營想在虎牢關通過時介入 | ⑮ 發 `chapter.passed`，㉒ 訂閱 |
| ⑰ 想在好感度跨階時開放名士事件 | ⑲ 發 `affinity.changed`，⑰ 訂閱 |
| ㉖ 想在結局達成時結算 | ㉕ 發 `ending.reached`，㉖ 訂閱 |

---

## 10. GameCommand 全表

UI 只能送出這些，且**一律以序號指定，不含核心 ID**。

| Command | Handler | Payload |
|---|---|---|
| `config.setAptitude` | ⑭ | `{ attr, grade }` |
| `config.toggleTalent` | ⑭ | `{ talentIndex }` |
| `config.toggleTreasure` | ⑭ | `{ treasureIndex }` |
| `config.designateCompanion` | ⑭ | `{ slot, candidateIndex \| null }` |
| `config.confirm` | ⑭ | `{}` |
| `shop.purchase` | ⑨ | `{ itemIndex }` |
| `training.select` | ⑯ | `{ slotIndex }` |
| `training.reroll` | ⑯ | `{}` |
| `event.select` | ⑰ | `{ offerIndex, optionIndex }` |
| `event.reroll` | ⑰ | `{}` |
| `turn.advance` | ⑮ | `{}` |
| `learn.attr` | ㉜ | `{ attrIndex, target }` |
| `learn.trait` | ㉜ | `{ offerIndex }` |
| `learn.skill` | ㉜ | `{ offerIndex }` |
| `campaign.configure` | ㉝ | `{ skillIndices, commanderIndices, commanderSkillIndices }` |
| `campaign.engage` | ㉝ | `{}` |
| `campaign.sweep` | ㉝ | `{}` |
| `campaign.withdraw` | ㉝ | `{}` |
| `faction.choose` | ㉒ | `{ optionIndex }` |
| `roster.assignSuperiors` | ⑲ | `{ candidateIndices }` |
| `run.retire` | ㉕ | `{}` |
| `run.settle` | ㉖ | `{}` |
| `save.load` | ⑦ | `{ slot, recovery \| null }` |
| `save.delete` | ⑦ | `{ slot }` |

**沒有 `save.write`** —— 存檔由 §11 列的四個時機自動觸發，不是玩家指令。

---

## 11. Composition 組裝順序

依賴方向決定的建構順序。**每一階都必須在上一階完成後才能建**：

```
1. platform          ContentRepository・SaveStore
2. data-runtime       DefinitionCompiler → DefinitionRegistry（驗證失敗即中止）
3. kernel             DeterministicRng・EventBus・RunStateStore
4. 無依賴模組          ④⑤⑥⑧⑩⑪⑬㉓㉘㉙
5. 單層依賴模組        ⑦⑨⑫⑳㉑㉒㉔
6. ① 效果系統          注入 ⑩⑪㉓⑭ 的 EffectSource
7. 依賴 ① 的模組        ⑯⑲
8. 交叉依賴模組        ⑮⑰⑱㉕
9. ⑭ 入夢配置          注入 ⑨⑩⑪
10. ㉖ 結算            注入 11 個介面
11. 啟動驗證           雙向對照 ModuleContract（見下）
12. ui / read-models
```

### 11.1 第 6 步的順序問題

① 效果系統要注入 `EffectSource[]`，而其中 ⑭ 的 `configEffectSource` 需要 `DreamEntryConfig` —— 那要到第 9 步才有。

**解法：`EffectSource` 是工廠不是實例。** ⑩⑪㉓⑭ 匯出的是 `xxxEffectSource(input)` 函式，在每次 `resolve()` 時由 ① 依當前 `RunContext` 現算。因此第 6 步注入的是**函式**，不是綁定了資料的物件 —— 沒有循環。

這也是為什麼 §2–§7 的 `EffectSource` 一律寫成 `notableEffectSource(roster)` 這種工廠形式，而不是 `interface NotableCodex extends EffectSource`。

### 11.2 啟動驗證（第 11 步）

```
正向：每個 ModuleContract.handles 都有對應 Handler          否則中止
反向：每個 Handler 都被某個 ModuleContract.handles 宣告      否則中止
正向：每個 ModuleContract.emits 的 kind 在 EVENT_KINDS 內    否則中止
反向：每個 Subscriber 綁定的 kind 有發出者                   否則中止
所有權：SLICE_OWNERS 與 ModuleContract.owns 完全一致         否則中止
Definition：每個 declaredKind 有 ownerModule                否則中止
FuncType：每個 requiredFuncType 有註冊 Handler               否則中止
```

**反向那兩條是最容易漏的。** 只做正向檢查時，「有實作但沒宣告」與「有訂閱者但沒人發那個事件」都會讓啟動驗證綠、測試綠，而那段程式永遠不會被呼叫。

### 11.3 存檔寫入時機（非玩家指令）

| 時機 | 寫什麼 |
|---|---|
| `turn.advanced` 後 | `meta` ＋ `run` |
| `run.settled` 後 | `meta`，`run` 設為 null |
| `shop.purchased` 後 | `meta` |
| `dream.entered` 後 | `meta` ＋ 新建的 `run` |
