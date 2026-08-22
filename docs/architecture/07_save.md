# 07 · 存檔

> **職責**：把 MetaState 與（若有）進行中的 RunState 寫成一份檔案，並在不相容時**拒絕載入**。
>
> | | |
> |---|---|
> | **owns** | 存檔檔案格式與 Migration |
> | **reads** | 03 RunState、全部元層模組 |
> | **handles** | `save.write` / `save.load` / `save.delete` |
> | **emits** | `save.written` / `save.loaded` |

---

## 1. 檔案結構：一份檔案，兩層狀態

```ts
interface SaveFile {
  readonly formatVersion: number;
  readonly contentVersion: ContentVersionStamp;
  readonly meta: MetaState;
  readonly run: RunState | null;     // null ＝ 目前沒有進行中的夢
}
```

`run.metaSnapshot` 與頂層 `meta` **會有內容重複，這是刻意的**（ARCHITECTURE §2.11）。不做去重最佳化——那會讓存檔與活的 MetaState 產生隱性耦合，而且反序列化後的 Run 就不再自我封閉。

---

## 2. 何時拒絕載入

依「五個合法出口」第 5 條，以下情況**明確拒絕並告知玩家**，不得靜默修補：

| 情況 | 行為 |
|---|---|
| `formatVersion` 高於本版程式支援 | 拒絕：「存檔來自較新版本」 |
| `formatVersion` 較舊但有 Migration 路徑 | 執行 Migration 後載入 |
| `formatVersion` 較舊且無 Migration 路徑 | 拒絕 |
| `contentVersion` 引用的 pack 未安裝 | 拒絕，列出缺少的 pack |
| `contentVersion` 的 pack 版本不相容 | 拒絕 |
| 反序列化失敗或欄位缺失 | 拒絕，回報 JSON 路徑 |

### 2.1 進行中的 Run 特別嚴格

`meta` 可以在內容更新後繼續使用（圖鑑、點數是玩家資產）。但 `run` **不可以**——內容版本改變意味著章節、DC、效果都可能不同，續玩會產生與存檔時不一致的行為。

因此允許一種降級處理：**丟棄 `run`、保留 `meta`**，並明確告知玩家「進行中的夢因版本更新而中斷」。這是玩家可理解的取捨，不是靜默修補。

> 這個降級**必須經玩家確認**，不得自動執行。

---

## 3. Migration

```ts
interface SaveMigration {
  readonly from: number;
  readonly to: number;
  migrate(raw: unknown): unknown;
}
```

- 只搬形狀，**不得推測缺失的內容**
- 每個 migration 必須附**舊版存檔 fixture** 測試（無 fixture 不得合併）
- Migration 鏈必須連續：不允許 `1→3` 跳過 `2`

---

## 4. 平台邊界

```ts
interface SaveStore {
  read(slot: SaveSlot): Promise<string | null>;
  write(slot: SaveSlot, raw: string): Promise<void>;
  delete(slot: SaveSlot): Promise<void>;
}
```

由 `platform/save/` 實作（Electron 檔案系統；未來 Steam Cloud）。
**本模組不知道檔案存在哪裡**，也不處理雲端衝突——那是平台層的責任。

---

## 5. 自動存檔時機

| 時機 | 寫什麼 |
|---|---|
| 每回合推進後 | `meta` ＋ `run` |
| 結算完成後 | `meta`，`run` 設為 null |
| 商店購買後 | `meta` |
| 入夢配置完成後 | `meta` ＋ 新建的 `run` |

**每回合都寫**：Run 長度 72 回合、10–15 分鐘，中途離開是常態。寫入量是幾十 KB 文字，代價可忽略。

---

## 6. 不變量

1. `serialize → write → read → deserialize` 後的狀態與寫入前**位元相同**
2. 拒絕載入時**不產生任何部分載入的狀態**
3. 寫入是原子的（先寫暫存檔再改名），中途斷電不得產生半份存檔
4. 存檔中的 `run.metaSnapshot` 與寫入當時的 `meta` 可以不同（玩家在夢中買不了東西，但夢醒前的 meta 不會變；此欄位僅需自我一致）

---

## 7. 刻意不做

- 第一版單存檔位（`SaveSlot` 保留擴充但只用一個）
- 不做雲端衝突合併
- 不做存檔加密或防作弊
