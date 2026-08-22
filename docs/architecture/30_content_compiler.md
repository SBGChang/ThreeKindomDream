# 30 · 內容編譯器

> **職責**：把 `content-source/**`（TypeScript 作者層）編譯成 `content/**`（純 JSON 產物）。
>
> | | |
> |---|---|
> | **owns** | 編譯規則與序列化格式 |
> | **reads** | `content-source/**` |
> | **執行方式** | `npm run content:build`（開發者手動 ＋ CI 驗證） |

---

## 1. 兩層結構的理由

```
content-source/**   TypeScript，以真實 Definition 型別標註
        ↓ 編譯器
content/**          純 JSON、零邏輯、進版控
        ↓
Runtime             只讀產物
```

**`tsc` 直接成為內容的 Schema 驗證器。** 純手寫 JSON 沒有型別檢查，打錯欄位名要等 runtime 驗證才發現；作者層用真實型別標註，編譯當下就炸。

### 1.1 作者層的位置就是它的授權

| 規則 | 由誰保證 |
|---|---|
| 內容 ID 字面值**只允許出現在 `content-source/`** | 紀律門禁（依**位置**判斷，不依註解） |
| 作者層**不得寫任何規則邏輯** | 門禁：禁止 import `src/modules/**`、`src/kernel/**` |
| Runtime 不得讀 `content-source/` | 依賴圖門禁 |

**依位置而非依註解**是關鍵：慣例可以被工具檢查，標註會忘記加。

---

## 2. 決定性序列化 ★

```
key 排序（字典序）＋ 固定縮排（2 空格）＋ LF 換行 ＋ 結尾換行
```

**必須是決定性的**，否則「產物同步」門禁（§3）會因為無關的順序差異而誤報，最後被繞過。

數字序列化也要固定：不得出現 `1` 與 `1.0` 混用、不得依賴平台的浮點格式化。

---

## 3. 產物同步門禁

> `content/**` 必須等於「用當前 `content-source/**` 重新編譯的結果」。

手改產物、或改了作者層忘記重編，**都不會有任何測試失敗**——Runtime 讀到的內容與作者意圖不同，而且行為看起來正常。只能靠門禁擋。

失敗訊息必須**指出第一個差異點的字元位置與前後文**，否則開發者還得自己 diff 一份幾十 KB 的 JSON。

### 3.1 「編得出來」不等於「載得進去」

門禁分兩道：

| 門禁 | 檢查 |
|---|---|
| 同步 | 產物 ＝ 重新編譯的結果 |
| **可載入** | 產物真的能被 `ContentRepository` 讀進來並通過 02 的三層驗證 |

第二道是必要的：**跨 pack 重複 ID 只有載入器看得到**，編譯器各自編各自的 pack 不會發現。

---

## 4. Pack 宣告

```ts
// content-source/packs.ts
interface AuthoredManifest {
  readonly packs: readonly AuthoredPack[];
}

interface AuthoredPack {
  readonly packId: PackId;
  readonly version: string;
  readonly contentRoot: string;                  // 'core' | 'wei' | …
  readonly requiredPacks: readonly { packId: PackId; version: string }[];
  readonly declaredKinds: readonly DefinitionKind[];
  readonly requiredFuncTypes: readonly FuncType[];
  readonly domains: readonly AuthoredDomain[];
}
```

`declaredKinds` 與 `requiredFuncTypes` 讓 Bootstrap 能在載入前確認「這個 pack 用到的東西都已註冊」（02 §2.1）。

### 4.1 歸屬判準

> 這個值換陣營會改變嗎？會 → 陣營包。三陣營都相同且屬遊戲結構 → core。
> **判不出來的一律放陣營包**——放陣營包只是多複製一份；放 core 會讓該陣營永遠改不動它。

**驗收標準**：加黃巾線 ＝ 新增 `pack:huangjin`，`pack:core` 一行不動。

---

## 5. 不變量

1. 同一份作者層 → 位元相同的產物（跨平台、跨執行次數）
2. 產物中不含任何 TypeScript 語法或註解
3. `content-source/` 的依賴圖不含 `src/modules/**` 或 `src/kernel/**`
4. 產物的 `hash` 由全部檔案內容決定，與檔案系統順序無關

---

## 6. 刻意不做

- 不做增量編譯（全量編譯的成本遠低於增量的正確性風險）
- 不做產物壓縮或混淆
- 不在編譯期做遊戲規則驗證（那是 02 的三層驗證的職責）
