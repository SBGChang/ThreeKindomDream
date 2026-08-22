# 06 · 本地化

> **職責**：所有玩家可見文字都由外部資源提供，程式與資料只持有 key。
>
> | | |
> |---|---|
> | **owns** | 語言資源表（唯讀） |
> | **reads** | 無 |
> | **handles** | 無 |
> | **emits** | 無 |

---

## 1. 為什麼從第一天就外部化

這是 ARCHITECTURE §2.1 的直接延伸：**文案是內容，不是結構。** 文案硬編進 code 或混在邏輯裡的專案，之後永遠搬不出來——不是技術做不到，是散落的位置太多，沒人願意動。

判準一樣：**修改這個字串，玩家看得到嗎？** 看得到 → 資源檔。

---

## 2. Key 慣例

```
<領域>.<實體或情境>.<欄位>
```

| Key | 用途 |
|---|---|
| `notable.guanyu.name` | 名士姓名 |
| `notable.guanyu.unlock.20` | 解鎖條描述 |
| `attr.war.nanhua.label` | 南華村篇「演武」 |
| `attr.war.nanhua.sub.0` | 小標題「習劍」 |
| `attr.war.faction.label` | 陣營篇「練兵」 |
| `chapter.wei.guandu.title` | 章節標題 |
| `chapter.wei.guandu.brief.hard` | 【險】難度的任務說明 |
| `commission.subdue.body` | 委託模板本文（含佔位符） |
| `ending.chancellor.text` | 結局文本 |
| `rejection.threshold-not-met` | 拒絕訊息 |
| `lord.wei.affinity.3` | 曹操的緣分 3 台詞 |

### 2.1 資源隨 Pack

每個 pack 帶自己的 `l10n/<lang>/*.json`。加 `pack:huangjin` 時張角的文案跟著進來，不需要動 core 的資源檔。

---

## 3. 缺 key 是**建置期**問題，不是執行期 ★

依「五個合法出口」，缺資料不得靜默 fallback。但對文案而言，執行期硬失敗代價過高（一個漏翻的字串不該讓遊戲開不起來）。因此把它推到更早：

| 階段 | 行為 |
|---|---|
| **建置門禁** | 掃出 code 與資料中所有 key，比對資源檔。缺任何一個 → **CI 失敗** |
| 開發模式 | 顯示醒目標記（如 `⟦MISSING notable.x.name⟧`），絕不顯示 key 本身或空字串 |
| 正式建置 | 不可能發生——門禁已擋下 |

**絕不允許的做法**：缺 key 時回傳 key 字串、回傳空字串、或回退到另一語言。那三種都會讓漏翻靜默出貨。

---

## 4. 模板填充的分工

委託模板的佔位符替換由 [28 · 文本模板填充](28_text_template.md) 負責。本模組只提供**含佔位符的原始字串**，不理解佔位符語意。

```
06 本地化：commission.subdue.body → 「{place} 有 {bandit} 作亂，{patron} 命你前去清剿。」
28 模板填充：注入參數 → 「白馬津有白波賊作亂，夏侯惇命你前去清剿。」
```

分工理由：模板參數的**取值**需要 RNG 與 Definition（是玩法），字串的**存放**不需要（是資源）。混在一起會讓本地化模組依賴 `TurnContext`。

---

## 5. 公開介面

```ts
interface Localizer {
  readonly lang: LangCode;
  text(key: L10nKey): string;                  // 缺 key 在開發模式回標記
  has(key: L10nKey): boolean;
  allKeys(): readonly L10nKey[];               // 供建置門禁比對
}

type L10nKey = Brand<string, 'L10nKey'>;
```

`L10nKey` 也用 branded type，避免任意字串被當成 key 傳進來——這樣建置門禁可以靜態掃出全部使用處。

---

## 6. 不變量

1. 玩家可見的字串**沒有任何一個**來自 code 字面值或產物資料的內文欄位
2. `allKeys()` 的聯集涵蓋 code 與資料中出現的全部 key（建置門禁保證）
3. 切換語言不改變任何遊戲狀態或隨機結果

---

## 7. 刻意不做

- 第一版只做繁體中文；但**介面與門禁從一開始就按多語言設計**
- 不做執行期語言熱切換以外的動態載入
- 不做語音
