// Arithmetic audit for the Wei v2 DESIGN PROPOSAL. This is NOT a battle or player simulation.
// node scripts/wei-v2-audit.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const configUrl = new URL('../docs/balance/wei-v2.proposal.json', import.meta.url);
const cfg = JSON.parse(readFileSync(configUrl, 'utf8'));
const sum = xs => xs.reduce((a, b) => a + b, 0);
const round = n => Math.round(n * 100) / 100;
const g = cfg.growth;
const unitCost = value => {
  const band = g.bands.find(x => value >= x.min && value <= x.max);
  assert.ok(band, `No growth cost for ${value}`);
  return band.cost;
};
const costTo = (from, to) => sum(Array.from({ length: to - from }, (_, i) => unitCost(from + i + 1)));
const grow = (exp, cap = 100, from = g.referenceStart) => {
  let value = from;
  while (value < cap && exp >= unitCost(value + 1)) exp -= unitCost(++value);
  return { value, unspent: round(exp) };
};
const baseNonBattle = cfg.progression.actionsPerChapter * (
  sum(g.referenceTrainingPerActionByChapter) + sum(g.referenceEventExpPerActionByChapter)
);
const reference = (star, factor = 1) => {
  const depths = g.referenceDepthByStar[star];
  const nonBattle = baseNonBattle * g.mentorshipByStar[star] * factor;
  const battle = sum(depths.map(n => sum(g.stageExp.slice(0, n))));
  // Reference depth is an INPUT target, not a simulated outcome. Final rewards cannot fund final battle.
  const beforeFinalBattle = battle - sum(g.stageExp.slice(0, depths.at(-1)));
  const attributes = (shares, reward, caps = [100, 100, 100, 100]) => shares.map(
    (share, i) => grow(nonBattle * share + reward / 4, caps[i]).value
  );
  const caps = star === 0 ? [75, 75, 75, 75] : [94, 94, 94, 88];
  return {
    star, mentorship: g.mentorshipByStar[star],
    assumedDepths: depths, nonBattleExp: round(nonBattle), battleExp: battle,
    totalExpAndLearningCurrency: round(nonBattle + battle),
    balanced: attributes(g.balancedShares, battle, caps),
    balancedBeforeFinalBattle: attributes(g.balancedShares, beforeFinalBattle, caps),
    focusedUncapped: attributes(g.focusedShares, battle),
    // A specialist who buys S/D/D/D needs 14 aptitude points.
    focusedWithCaps: attributes(g.focusedShares, battle, star === 0 ? caps : [100, 75, 75, 75])
  };
};

const costs = cfg.progression.fragmentCosts;
const thresholds = costs.map((_, i) => sum(costs.slice(0, i + 1)));
const roundsAtIncome = income => thresholds.map(n => Math.ceil(n / income));
assert.deepEqual(roundsAtIncome(100), [1, 2, 4, 7, 12]);
assert.equal(sum(costs), 1200);
assert.equal(cfg.progression.fragmentCapPerCharacterPerRun * 11 < sum(costs), true);

const aptitudePoints = sum(g.aptitudePointPurchases.map(x => x.points));
assert.equal(aptitudePoints, 32);
assert.equal(3 * g.aptitudeCost.A + g.aptitudeCost.B, aptitudePoints);
assert.ok(4 * g.aptitudeCost.A > aptitudePoints);
const aptitudePurchaseCost = sum(g.aptitudePointPurchases.map(x => x.cost));
const threeAOneBCapCost = 3 * sum(g.aptitudeCapUpgradeCosts.slice(0, 2)) + g.aptitudeCapUpgradeCosts[0];

const rows = g.mentorshipByStar.map((_, s) => reference(s));
assert.ok(sum(rows[0].balanced) / 4 >= 48 && sum(rows[0].balanced) / 4 <= 52);
assert.ok(rows[0].focusedWithCaps[0] >= 68 && rows[0].focusedWithCaps[0] <= 72);
assert.ok(rows[5].balanced.slice(0, 3).every(n => n >= 90));
assert.ok(rows[5].balanced[3] >= 80 && rows[5].balanced[3] <= 89);
assert.ok(rows[5].balancedBeforeFinalBattle.slice(0, 3).every(n => n >= 90));

const paidCosts = (kind, multiplier = 1) => cfg.learning[kind].map(x => Math.round(x * multiplier));
const skillMax = sum(paidCosts('skillIncrementalCosts'));
const traitMax = sum(paidCosts('traitIncrementalCosts'));
const maxBuild = 3 * skillMax + 4 * traitMax;
assert.equal(skillMax, 1040);
assert.equal(traitMax, 840);
assert.ok(maxBuild <= rows[5].totalExpAndLearningCurrency);
// Monetary affordability alone is insufficient: requirements and time of income must also be checked.
const skillPower = Object.fromEntries(Object.entries(cfg.learning.baseRatios).map(([kind, base]) => [
  kind, cfg.learning.levelPower.map(level => round(base * level))
]));
const actualMinorRate = (attr, dc) => {
  const { rollMin, rollMax } = cfg.minorChecks;
  let successes = 0;
  for (let r = rollMin; r <= rollMax; r++) if (Math.round(attr * r / 100) >= dc) successes++;
  return round(successes / (rollMax - rollMin + 1));
};
const enemyTables = cfg.battle.enemyTroopsByChapter.map((base, ch) => ({
  chapter: ch + 1,
  stages: cfg.battle.troopsByStage.map((mul, i) => ({
    stage: i + 1,
    troops: Math.round(base * mul),
    totalDamageBudget: Math.round(cfg.battle.enemyDamageByChapter[ch] * cfg.battle.damageByStage[i])
  }))
}));

const result = {
  version: cfg.version,
  scope: 'Deterministic budget arithmetic only. Depths and reward averages are assumptions, NOT observed gameplay.',
  milestones: [100, 80, 65, 50].map(income => ({ income, starAtEndOfRuns: roundsAtIncome(income), firstRunUsingFiveStars: roundsAtIncome(income).at(-1) + 1 })),
  growth: { baseNonBattleExp: baseNonBattle, referenceProfiles: rows,
    sensitivity: [0.8, 1, 1.2].map(factor => ({ factor, zero: reference(0, factor), five: reference(5, factor) })),
    costFrom22: Object.fromEntries([50, 70, 85, 90, 92, 94, 95, 100].map(n => [n, costTo(22, n)])),
    minimumExpFor92_92_92_85: 3 * costTo(22, 92) + costTo(22, 85)
  },
  aptitude: { points: aptitudePoints, pointPurchaseCost: aptitudePurchaseCost, threeAOneBCapCost,
    totalForThreeAOneB: aptitudePurchaseCost + threeAOneBCapCost },
  learning: { commonSkillTo5: skillMax, commonTraitTo5: traitMax, threeSkillsFourTraits: maxBuild,
    threeSkillsFourTraitsWithAllPeerless: 3 * sum(paidCosts('skillIncrementalCosts', 1.5)) + 4 * sum(paidCosts('traitIncrementalCosts', 1.5)),
    commonSkillRatios: skillPower },
  minorExamples: [50, 70, 92].map(attr => ({ attr, chapterFourLowMidHigh: cfg.minorChecks.dcByChapter[3].map(dc => actualMinorRate(attr, dc)) })),
  enemyCandidatesNotValidated: enemyTables
};
writeFileSync(new URL('../docs/balance/wei-v2.audit.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log('Wei v2 arithmetic audit passed. No runtime game data changed.');
console.table(result.milestones);
console.table(rows.map(r => ({ star: r.star, exp: r.totalExpAndLearningCurrency, balanced: r.balanced.join('/'), beforeFinal: r.balancedBeforeFinalBattle.join('/'), focused: r.focusedWithCaps.join('/') })));
console.log(JSON.stringify({ aptitude: result.aptitude, learning: result.learning, checks: result.minorExamples }, null, 2));
