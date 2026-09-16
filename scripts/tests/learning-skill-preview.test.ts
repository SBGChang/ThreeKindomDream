import assert from 'node:assert/strict';
import { Session } from '../../src/app/session.js';
import { chapterIndex } from '../../src/contracts/core/ids.js';
import { defs, newSession, wiring } from './harness.js';

const base = newSession(4242).current;
const skills = defs.reader('skill').all();
let checked = 0;
for (const def of skills) {
  for (const level of [0, 1, 2, 3, 4]) {
    const s = Session.restore(wiring, {
      ...base,
      progress: { ...base.progress, chapter: chapterIndex(8) },
      attributes: { values: { lead: 200, war: 200, int: 200, pol: 200 } },
      economy: { ...base.economy, money: 100000, earned: base.economy.spent + 100000 },
      growth: { ...base.growth, unlockedSkills: [def.skillId] },
      abilities: { ...base.abilities, skills: level ? [def.skillId] : [], levels: { [String(def.skillId)]: level } },
    });
    const before = JSON.stringify(s.current);
    const offer = s.learningOffers().find(o => o.id === def.skillId)!;
    assert.equal(offer.status, 'ready', `${def.skillId} ${level}: fixture can upgrade`);
    // Restoring an unlocked legacy skill teaches level 1; use the live offer,
    // just as the training screen does, rather than the pre-migration fixture.
    const forecast = s.previewSkillLevel(def.skillId, offer.level + 1);
    assert.equal(JSON.stringify(s.current), before, 'preview must not alter money, levels or saves');
    assert(s.upgradeAbility(def.skillId));
    assert.deepEqual(forecast, s.realtimeSkillInfo(def.skillId), 'preview must equal the combat skill after a real purchase');
    assert.equal(s.money, 100000 - offer.cost);
    if (forecast.effect === 'buff' || forecast.effect === 'debuff') assert(forecast.power! <= .9);
    checked++;
  }
}
assert.deepEqual(new Set(skills.map(s => s.action.kind)), new Set(['physical', 'magic', 'heal', 'buff', 'debuff']));
console.log(`Learning skill preview: ${checked} real purchases matched across all five effect kinds.`);
