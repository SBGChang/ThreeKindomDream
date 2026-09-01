import type {
  AffinityCurveDef, AffinityStageDef, LinkBonusDef,
} from '../../../src/contracts/core/definitions.js';
import { coreDef } from '../pack-id.js';

/**
 * 各階段的下界。人物委託的門檻（`statGte` 的 `affinity.<id>`）直接引用它 ——
 * 若讓作者逐條手寫 40／60，那個數字就會有兩份，改階段時只改得到一份。
 */
export const STAGE_MIN = {
  stranger: 0, acquainted: 20, friendly: 40, close: 60, sworn: 80,
} as const;

export const affinityStages: readonly AffinityStageDef[] = [
  coreDef('affinityStage', 'stage:stranger', { stage: 'stranger', min: STAGE_MIN.stranger, max: 19 }),
  coreDef('affinityStage', 'stage:acquainted', { stage: 'acquainted', min: STAGE_MIN.acquainted, max: 39 }),
  coreDef('affinityStage', 'stage:friendly', { stage: 'friendly', min: STAGE_MIN.friendly, max: 59 }),
  coreDef('affinityStage', 'stage:close', { stage: 'close', min: STAGE_MIN.close, max: 79 }),
  coreDef('affinityStage', 'stage:sworn', { stage: 'sworn', min: STAGE_MIN.sworn, max: 100 }),
];

/**
 * 局內好感度的產出與回收（10 §2）。
 *
 * ── 好感的四階梯 ★ ──────────────────────────────────
 * 四個階段各自解鎖【不同種類】的東西，不是同一件事的大小之分：
 *
 *   20 相識  入門人物事件            敘事
 *   40 友好  人物委託進池            功績 ＋ 道具
 *   60 知交  站位效果全開            數值   ← linkStage
 *   80 莫逆  鏈末事件                高階道具（保證）
 *
 * 40 這一階原本是空的。人物委託補上它之後，在站位層打開【之前】就有回報 ——
 * 那七個回合的投資不再全部押在最後一刻。
 */
export const affinityCurve: AffinityCurveDef = coreDef('affinityCurve', 'affCurve:main', {
  // 指定玩伴需要星 2。預設是【皇甫嵩替你指派】，自己挑是特權（14 §3）。
  designateStar: 2,
  /**
   * 全體共通的入夢起始好感 ★
   *
   * 逐人的差異由星階解鎖條的 `AffinityGrant` 相加（典韋 0 星就 +20、
   * 二星再 +20 到 60）。舊版由一張全域星階表推導，於是同一階只能給同一個值，
   * 「典韋二星就開得起連動、曹操二星還不行」這種設計無法表達。
   */
  baseStartAffinity: 20,
  fragmentsByStage: { stranger: 0, acquainted: 5, friendly: 15, close: 30, sworn: 50 },
  fullDreamMultiplier: 2,
});

export const linkBonus: LinkBonusDef = coreDef('linkBonus', 'link:main', {
  /**
   * 站位效果的門檻 ＝ 知交（60）★
   *
   * 名士身上【所有帶 standing 的效果】都要好感達到這一階才發放。
   * 跨過之前，把人放進格子的回報是【零】—— 不是比較少。
   *
   * ── 門檻的真正代價是回合 ──────────────────────────
   * `gainPerTraining` ＝ 6，因此 20 → 60 要同框七次：
   *   隨機打法 28 回合、刻意追 7 回合，而一輪只有 32 回合。
   *   隨機打法連一個人都開不了站位層。
   *
   * 所以 0 星的名士不是「比較弱」，是【比較晚】—— 晚到在一輪之內來不及。
   * 星階買到的起始好感省下的不是點數，是【十六個回合】。
   * 這正是跨局投資真正的產品：時間。
   *
   * 【道具不吃這道門檻】—— 它沒有好感可查。那是兩層的分工：
   * 名士那層延遲七到十個回合才開，道具那層第一回合就開。
   */
  linkStage: 'close',
  gainPerTraining: 6,
  /**
   * 站位分配的基礎權重。四格都是它，偏好完全由 `SlotBias` 疊上去（19 §4）★
   *
   * 訂成 10 讓「權重 10 → 15」這種寫法有字面意義：那正好是 ×1.5。
   * 於是「統系名士更常站統御格」是星階或道具【買來的】，不是與生俱來的。
   */
  slotBaseWeight: 10,
  // 陣容上限就是 6（玩伴 3 ＋ 上司 3）。設成 6 ＝ 不設限：
  // 「全員擠進同一格」必須真的做得到，否則爆發感只是空話。
  maxPerSlot: 6,
  /**
   * 同格人數的額外倍率（index ＝ 人數）★
   *
   * 純相乘到不了爆發的量級，這條曲線把爆發【只放在人多的時候】。
   *
   * 注意它有一個【方向相反】的對手：`SlotSizeBonus`（逍遙津令）獎勵單人站格。
   * 兩者同時存在是刻意的 —— 玩家因此有兩種互斥的站位流派可以選。
   */
  pileMultiplier: [1, 1, 1.15, 1.4, 1.8, 2.3, 3.0],
  // 安全閥。沒有它，六人同格 × 滿星會到 ×9 以上，一回合把四維推上限。
  maxSlotMultiplier: 8,
});
