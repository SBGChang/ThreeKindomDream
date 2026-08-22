# 02 · Data Runtime（載入、驗證、Registry）

> **職責**：把產物 JSON 變成型別安全的唯讀 Registry，並在任何一層驗證失敗時**拒絕啟動**。
>
> | | |
> |---|---|
> | **owns** | `DefinitionRegistry`（唯讀，非 State） |
> | **reads** | 平台層的 `ContentRepository` |
> | **handles** | 無 |
> | **emits** | 無 |

---

## 1. 三階段流程

```
ContentRepository（平台層，讀檔）
        ↓ raw JSON
解析 Parse       ── 逐欄讀取，禁止 as unknown as
        ↓
驗證 Validate    ── Schema → Reference → Rule 三層
        ↓
索引 Index       ── 建立唯讀 Registry 與窄化 Reader
```

`ContentRepository` 由平台層實作（Vite bundled / Electron 檔案系統 / 未來 DLC）。
**`modules/` 永遠不讀檔**，也不知道資料來自 bundle、磁碟或測試 Fixture。

### 1.1 禁止 `as unknown as` 讀外部輸入

外部 JSON 必須**逐欄讀取並檢查**。用雙重轉型硬套型別，缺欄位會一路飄到很深的地方才炸，錯誤訊息與真正原因差好幾層。

---

## 2. Pack 載入

```ts
interface PackManifest {
  readonly packId: PackId;
  readonly version: string;
  readonly requiredPacks: readonly { packId: PackId; version: string }[];
  readonly declaredKinds: readonly DefinitionKind[];
  readonly requiredFuncTypes: readonly FuncType[];
  readonly loadOrder: number;
}
```

### 2.1 啟動前必須全部成立

| 檢查 | 失敗行為 |
|---|---|
| `requiredPacks` 全部存在且版本相符 | 拒絕啟動 |
| `loadOrder` 無循環相依 | 拒絕啟動 |
| 跨 pack 無重複 Definition ID | 拒絕啟動 |
| `declaredKinds` 與實際載入的 kind 一致（雙向） | 拒絕啟動 |
| `requiredFuncTypes` 全部已註冊 Handler | 拒絕啟動 |
| `pack:core` 未引用任何陣營包 | 拒絕啟動 |

**「跨 pack 重複 ID」只有載入器看得見**——編譯得出來不等於載得進去。

### 2.2 陣營包缺席是合法狀態

只安裝 `core + pack:wei` 是有效組合：虎牢關後只有魏可選，蜀吳緣分不出現在天命商店。
這走的是「功能不啟用」出口，**不是錯誤**。商店品項需支援 `requiresPack` 宣告。

---

## 3. 三層驗證

### 3.1 Schema 層

欄位存在、型別正確、必填齊全、列舉可解析、數值在範圍內。

### 3.2 Reference 層

所有 ID 引用必須存在。含 **FuncType/ReferID 兩段式**：

```
1. funcType 字串 → 能否解析為 enum？          否 → 失敗
2. 該 enum 是否已註冊 Handler？                否 → 失敗
3. funcType 指定的表是否存在？                 否 → 失敗
4. referId 在該表中是否存在？                  否 → 失敗
5. 該列是否通過該 FuncType 的 Schema 驗證？    否 → 失敗
```

### 3.3 Rule 層（跨欄位一致性）

本專案已知需要檢查的規則：

| 規則 | 為什麼 |
|---|---|
| 大檢定的敵方名士不得同時列在該檢定的可出戰名單 | 否則玩家可派敵人幫自己打 |
| 名士 `unlocks` 的 `affinity` 嚴格遞增且不重複 | 否則解鎖刻度語意不明 |
| `supersedes` 引用的門檻必須存在於同一 `unlocks` 陣列 | 否則過濾失效 |
| `FragmentDropDef.trigger='onGlowResult'` 時 `glowTier` 必填 | 否則觸發條件不完整 |
| 章節序列的 `loadOrder` 連續且無缺口 | 否則章節推進會斷 |
| 官階門檻沿階級單調不減 | 否則出現「升上去又掉回來」 |
| 結局門檻至少有一個可達組合 | 否則該結局永遠拿不到 |
| 委託模板引用的參數池非空 | 否則 `rng.pick` 會 throw |

### 3.4 失敗行為

任一層失敗**不得啟動新遊戲**，並以 `ValidationError`（00 §12）回報六個欄位。
**禁止靜默 fallback 到預設值。**

---

## 4. 窄化 Definition Reader

模組不可拿到無限制的全域資料庫。Composition 注入窄化 Reader：

```ts
interface NotableReader {
  get(id: NotableId): NotableDefinition;              // 查不到 throw，不回 undefined
  tryGet(id: NotableId): NotableDefinition | null;    // 明確意圖才用
  allIds(): readonly NotableId[];
  byFaction(f: FactionId): readonly NotableId[];
}
```

**`get()` 查不到必須 throw**，因為 Reference 驗證已保證引用完整——查不到代表程式錯誤，不是資料問題。
需要「可能不存在」語意時明確呼叫 `tryGet()`。

這讓 `modules/notable-*` 在型別層面也看不到章節、寶物、商店的內容。

---

## 5. Definition Kind 登記表

```ts
interface DefinitionKindEntry {
  readonly kind: DefinitionKind;
  readonly ownerModule: ModuleId;
  readonly schemaVersion: number;
}
```

登記表**以各模組 Reader 匯出的常數組成，不重打字串**。這樣改 kind 名稱時編譯會抓到全部使用處。

完整清單見 `ARCHITECTURE.md` §8。

---

## 6. Migration

```ts
interface DefinitionMigration {
  readonly kind: DefinitionKind;
  readonly from: number;
  readonly to: number;
  migrate(raw: unknown): unknown;
}
```

- Migration 只搬資料形狀，**不得推測缺失的內容**
- 找不到可用的 migration 路徑 → 拒絕載入（不是猜）
- 每個 migration 必須附舊版 fixture 測試

---

## 7. 公開介面

```ts
interface DefinitionCompiler {
  compile(repo: ContentRepository): CompileResult;
}

type CompileResult =
  | { readonly ok: true;  readonly registry: DefinitionRegistry; readonly version: ContentVersionStamp }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };
```

**回傳 `errors` 陣列而非第一個錯誤**：策劃一次改一批資料，逐個修太慢。

---

## 8. 不變量

1. Registry 建立後**完全唯讀**，無任何 mutation API
2. 同一份產物 ＋ 同一版 compiler → 同一份 Registry 與同一個 `ContentVersionStamp.hash`
3. 驗證通過的 Registry 中，任何 `get()` 都不會失敗
4. 驗證失敗時**不產生任何部分可用的 Registry**

---

## 9. 刻意不做

- 不做熱重載（第一版）
- 不做執行期資料修改
- 不做遠端內容拉取
