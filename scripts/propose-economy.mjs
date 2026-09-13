/** RFC-02 的純預算驗算。不是遊戲模擬，沒有驗證 runtime 或策略可達性。 */
import assert from 'node:assert/strict';

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const round = (x) => Math.round(x * 100) / 100;
const money = {
  initial: 120,
  fixed: [20, 25, 30, 35],
  attendance: [20, 25, 30, 35, 40],
  bonus: [30, 55, 90, 130, 180],
  story: [25, 35, 50, 70, 100],
  campaign: [15, 20, 25, 35, 45, 60, 80],
};
const prices = {
  skill: { common: [100, 160, 240], fine: [260, 360, 500], peerless: [650, 850, 1100] },
  trait: { common: [80, 120, 180], fine: [220, 300, 420], peerless: [520, 700, 900] },
};
const weights = [[55, 30, 12, 3, 0], [45, 32, 17, 5, 1], [35, 32, 22, 9, 2], [25, 30, 25, 15, 5]];
const scenarios = [
  { name: '保守', n: 16, success: 0.60, rarity: 1, stories: 6, depth: 2 },
  { name: '中線', n: 20, success: 0.75, rarity: 2, stories: 9, depth: 4 },
  { name: '高收入', n: 26, success: 0.85, rarity: 3, stories: 12, depth: 6 },
];

const incomeRows = scenarios.map((s) => {
  const fixed = 8 * sum(money.fixed);
  const commission = s.n * (money.attendance[s.rarity - 1] + s.success * money.bonus[s.rarity - 1]);
  const story = s.stories * money.story[2]; // ★3等價；並非實際逐章故事分布。
  const campaign = 4 * sum(money.campaign.slice(0, s.depth));
  return { 情境: s.name, 盤纏: money.initial, 固定: fixed, 委託: round(commission), 人物: story, 戰役: campaign,
    合計: round(money.initial + fixed + commission + story + campaign) };
});
assert.deepEqual(incomeRows.map((r) => r.合計), [2048, 3155, 5169]);

const training = 2 * prices.skill.common[0] + prices.skill.common[1]
  + sum(prices.skill.fine.slice(0, 2)) + prices.skill.peerless[0]
  + sum(prices.trait.common.slice(0, 2)) + prices.trait.fine[0];
assert.equal(training, 2050);
const middle = incomeRows[1].合計;
const shopping = 120 + 200 + 340;
assert.equal(middle - training - shopping, 445);
const firstChapter = money.initial + 8 * money.fixed[0]
  + 4 * (money.attendance[0] + 0.6 * money.bonus[0])
  + 2 * money.story[0] + sum(money.campaign.slice(0, 2));
assert.equal(firstChapter, 517);
// 基礎課程必須可買。此處檢查錢，未宣稱四維或課程前置必定達成。
assert.ok(firstChapter >= 2 * prices.skill.common[0] + prices.trait.common[0] + 120);

// 100面枚舉，包括Math.round，與RFC要求的預覽方式相同。
const rate = (value, dc) => Array.from({ length: 100 }, (_, i) => i + 1)
  .filter((r) => Math.round(value * (1 + (r - 50) / 100)) >= dc).length / 100;
const checks = [24, 36, 50, 66, 82].flatMap((t, i) => [1, 1.2].map((ratio) => {
  const p = [0.55, 0.9, 1.2].map((dc) => rate(t * ratio, Math.round(t * dc)));
  const bonusEV = p.map((v, idx) => round(v * [0.4, 1, 1.7][idx]));
  return { 星級: i + 1, 能力相對T: ratio, 成功率: p, 獎金期望係數: bonusEV };
}));

// 入陣營補償：固定候選規則的算例，不代表前期夥伴實測分布。
const joinBonuses = [12, 24, 36, 48];
function joiningAffinity(level, priorTurns, personalBonus = 0) {
  const base = 20 + Math.min(40, Math.max(0, personalBonus));
  const compensation = Math.round(joinBonuses[level] * Math.min(16, Math.max(0, priorTurns)) / 16);
  return Math.min(90, base + compensation);
}
const joinedAfter16 = joinBonuses.map((_, i) => joiningAffinity(i, 16));
const joinedAfter8 = joinBonuses.map((_, i) => joiningAffinity(i, 8));
assert.deepEqual(joinedAfter16, [32, 44, 56, 68]);
assert.deepEqual(joinedAfter8, [26, 32, 38, 44]);
assert.equal(joiningAffinity(3, 16, 40), 90);
assert.equal(joiningAffinity(3, 0), 20);
assert.equal(joiningAffinity(3, 32), 68);
const earlierCompanion = 20 + 6 * 4 + 2 * 3; // 一般共事與事件的明示算例。
assert.equal(earlierCompanion, 50);
assert.ok(joinedAfter16[0] < earlierCompanion && joinedAfter16[3] > earlierCompanion);
function newcomerFragments(affinity, interactionTurns) {
  const stageReward = affinity >= 80 ? 50 : affinity >= 60 ? 30 : affinity >= 40 ? 15 : affinity >= 20 ? 5 : 0;
  const limit = interactionTurns >= 8 ? 50 : interactionTurns >= 6 ? 30 : interactionTurns >= 3 ? 15 : interactionTurns >= 1 ? 5 : 0;
  return Math.min(stageReward, limit);
}
assert.equal(newcomerFragments(90, 0), 0);
assert.equal(newcomerFragments(90, 2), 5);
assert.equal(newcomerFragments(90, 5), 15);
assert.equal(newcomerFragments(90, 7), 30);
assert.equal(newcomerFragments(90, 8), 50);
assert.equal(newcomerFragments(32, 8), 5);

for (const row of weights) assert.equal(sum(row), 100);
const masked = (row, maxRarity) => {
  const w = row.map((v, i) => i < maxRarity ? v : 0);
  return w.map((v) => v / sum(w));
};
assert.deepEqual(masked(weights[3], 2).slice(2), [0, 0, 0]);
const shelfApprox = (row, randomSlots) => 1 - (1 - (row[3] + row[4]) / sum(row)) ** randomSlots;
assert.equal(round(shelfApprox(weights[0], 3) * 100), 8.73);
assert.equal(round(shelfApprox(weights[3], 6) * 100), 73.79);

const fragmentCosts = [[3, 5, 8, 12, 18], [3, 4, 6, 9, 12], [2, 4, 6, 8, 12], [2, 3, 4, 6, 9]];
assert.deepEqual(fragmentCosts.map(sum), [46, 34, 32, 24]);
assert.equal(sum([400, 900, 1800, 500, 1200, 2400]), 7200);
assert.ok(0.3 * 1.38 > 0.39);
assert.ok(0.39 * 1.38 > 0.50);

// 固定行動分配的四維包絡：不含事件、戰役、RNG或任何遊戲策略。
// 逐段消耗原始成長，確保跨區間不沿用起點倍率。
const bands = [[40, 1], [60, 0.8], [75, 0.6], [85, 0.4], [95, 0.25], [100, 0.15]];
function applyGrowth(value, raw, cap) {
  let out = value;
  for (const [boundary, factor] of bands) {
    const end = Math.min(boundary, cap);
    if (out >= end) continue;
    const consumed = Math.min(raw, (end - out) / factor);
    out += consumed * factor;
    raw -= consumed;
    if (raw <= 0 || out >= cap) break;
  }
  return Math.min(cap, out);
}
assert.equal(round(applyGrowth(39, 2, 75)), 40.8);
assert.equal(applyGrowth(74, 100, 75), 75);
function growthEnvelope(focused, cap, aptitude, modifiers) {
  const values = [22.5, 22.5, 22.5, 22.5];
  for (let t = 0; t < 32; t += 1) {
    const attr = focused ? (t % 4 === 3 ? 1 : 0) : t % 4;
    const raw = (2.4 + 0.15 * Math.floor(t / 8)) * 1.25 * aptitude * (1 + modifiers);
    values[attr] = applyGrowth(values[attr], raw, cap);
  }
  return values.map(round);
}

console.log('RFC-02 帳本估算（不是遊戲模擬，機會數／成功率均為外加假設）');
console.table(incomeRows);
console.log(JSON.stringify({
  中線支出: { 訓練: training, 商店: shopping, 餘額: middle - training - shopping,
    訓練占比: round(training / middle * 100), 商店占比: round(shopping / middle * 100) },
  首章示例: { 收入: firstChapter, 兩常階技能加常階特性及低階道具: 400, 餘額: firstChapter - 400 },
  新人入陣營好感: { 前段16回合: joinedAfter16, 前段8回合: joinedAfter8, 舊夥伴一般算例: earlierCompanion,
    個人加成滿40及緣分滿級: joiningAffinity(3, 16, 40), 勢力緣分總成本: 600 + 1500 + 3200 },
  人物事件機會上界估算: { 不追旗: round(32 * 0.35), 每次追任一亮旗: round(32 * (1 - 0.65 ** 4)) },
  各關累積賞金: money.campaign.map((_, i) => sum(money.campaign.slice(0, i + 1))),
  滿級課程總價: Object.fromEntries(Object.entries(prices).map(([kind, tiers]) =>
    [kind, Object.fromEntries(Object.entries(tiers).map(([tier, costs]) => [tier, sum(costs)]))])),
  商店獨立抽取近似: { 基礎至少一件四星以上百分比: round(shelfApprox(weights[0], 3) * 100),
    滿級至少一件四星以上百分比: round(shelfApprox(weights[3], 6) * 100),
    滿級初章有效權重: masked(weights[3], 2).map(round) },
  指定碎片單靠訂購滿階輪數: { 一二星: Math.ceil(46 / 4), 三星: Math.ceil(34 / 3), 四星: Math.ceil(32 / 2), 五星: 24 },
  只有固定事件的四維包絡: {
    初輪均衡: growthEnvelope(false, 75, 1, 0.15), 初輪專精: growthEnvelope(true, 75, 1, 0.15),
    資質B专精: growthEnvelope(true, 88, 1.12, 0.35),
  },
  精確小檢定範例: checks,
}, null, 2));
console.log('帳本、價格、權重及邊界算例檢查通過；未驗證戰鬥平衡／故事可達性。');
