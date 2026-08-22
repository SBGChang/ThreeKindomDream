# 04 · RNG 服務

> **職責**：提供可重現的具名隨機流，並把 cursor 存進 RunState。
>
> | | |
> |---|---|
> | **owns** | `seed`、`rngCursors` |
> | **reads** | 無 |
> | **handles** | 無 |
> | **emits** | 無 |

契約型別見 [00 §4](00_shared_contracts.md#4-rng-契約)。本檔只補充服務層的規則。

---

## 1. 為什麼每個用途一條獨立 stream

若共用一條序列，**新增任何一個用到隨機的功能都會位移既有序列**。後果是舊存檔續玩時，後續所有結果與存檔前的預期完全不同——而且不會有任何測試失敗，因為測試通常從頭跑。

獨立 stream 讓「新增功能」只影響它自己那條：

| 變更 | 相容性 |
|---|---|
| 新增一條 stream | **相容**（舊存檔該 stream cursor 視為 0） |
| 刪除 stream | 破壞式 |
| 改 stream 名稱 | 破壞式 |
| 改某條 stream 的取值次數／順序 | **破壞式**（同 seed 結果會變） |

最後一條特別容易忽略：修改「鍛鍊槽先抽光階還是先抽名士站位」就是破壞式變更，即使程式看起來只是重排兩行。

---

## 2. 演算法要求

- 純函式：`(seed, stream, counter) → value`。不持有隱性狀態
- 跨平台一致：不得依賴浮點運算順序或平台整數寬度
- 不使用密碼學安全隨機（沒必要，且通常不可重現）
- 建議 counter-based（如 PCG／splitmix64 家族），因為它天然支援「跳到第 N 次」——這是重播與偵錯的關鍵能力

---

## 3. 偵錯支援

```ts
interface RngTrace {
  readonly stream: RngStream;
  readonly counter: number;
  readonly raw: number;
  readonly consumedBy: string;   // 'training.glow.base' 等呼叫點標籤
}
```

開發模式下記錄 trace。玩家回報「第 37 回合出現不合理結果」時，用同一 seed 重播到該回合，比對 trace 即可定位是哪次取值出了問題。

---

## 4. 不變量

1. `(seed, stream, counter)` 相同 → 回傳值必然相同，跨平台跨版本
2. 讀取任一 stream 不影響其他 stream 的 cursor
3. `pick` / `weighted` 收到空集合或權重總和 ≤ 0 時**必須 throw**，不得回退到任意值

---

## 5. 刻意不做

- 不提供「重設某條 stream」的 API（會破壞可重播）
- 不提供全域單例 RNG（必須經 `TurnContext` 注入，見 03 §2）
