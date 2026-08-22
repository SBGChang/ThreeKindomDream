# 29 · 音效與音樂

> **職責**：訂閱 DomainEvent 播放音效與音樂。純週邊。
>
> | | |
> |---|---|
> | **owns** | 無遊戲狀態 |
> | **reads** | 05 事件匯流排（只訂閱） |
> | **handles** | 無 |
> | **emits** | 無 |

---

## 1. 定位：可整體移除

與 13 成就同型：**移除本模組後，遊戲的任何隨機結果與狀態轉移必須完全不變**。這是驗證方向規則（05 §1）是否成立的第二個測試點。

因此本模組**不得**：

- 被任何核心模組依賴
- 讀取 `RunState` 或 `MetaState`
- 消耗任何 RNG stream
- 阻擋事件處理（播放失敗只記錄，不拋錯中斷流程）

---

## 2. Data Schema

```ts
interface AudioCueDefinition extends DefinitionHeader {
  readonly kind: 'audioCue';
  readonly onEvent: string;                    // DomainEvent kind
  readonly condition: AudioCueCondition | null;
  readonly assetId: string;
  readonly channel: 'sfx' | 'bgm' | 'voice';
  readonly priority: number;
}

type AudioCueCondition =
  | { readonly kind: 'glowTier'; readonly value: GlowTier }
  | { readonly kind: 'passed';   readonly value: boolean }
  | { readonly kind: 'endingKind'; readonly value: 'fullDream' | 'aborted' };
```

### 2.1 音效對應是資料，不是 switch

「紅光要有特別的音效」是**內容決定**，不是程式決定（ARCHITECTURE §2.1）。用資料表述讓調整音效不需要改 code，也讓「哪些事件有音效」可被清單化檢查。

`AudioCueCondition` 是刻意窄化的小型別——它只需要區分少數呈現差異，不需要 01 的完整 `Condition`（那會讓音效模組依賴效果系統）。

---

## 3. 不變量

1. 核心模組的依賴圖中不存在指向本模組的邊
2. 本模組不呼叫任何 `rng.*`
3. 音訊播放失敗不影響遊戲流程
4. 移除本模組後，同一 seed 的 Run 結果位元相同

---

## 4. 刻意不做

- 不做動態音樂分層（第一版）
- 不做語音
- 不讓音效影響任何遊戲判定
