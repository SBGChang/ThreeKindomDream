import { Session } from './session.js';
import { defs, emptyDraft, emptyMeta, wiring } from './bootstrap.js';
import { chapterIndex, seed } from '../contracts/core/ids.js';
import { begin } from '../modules/campaign.js';
/** Synthetic, isolated art fixtures. Never read or write a player's repository. */
export function campaignReviewSession(sample: string): Session {
  const meta = emptyMeta();
  const initial = Session.start(wiring, meta, emptyDraft(meta, defs), seed(4242)).current;
  const skills = sample === 'empty' ? [] : sample === 'single' ? initial.abilities.skills : defs.reader('skill').all().map(x => x.skillId);
  const people = sample === 'empty' ? [] : defs.reader('notable').all().filter(x => x.abilities.skills.length > 0).slice(0, sample === 'single' ? 1 : 6);
  const veteran = sample === 'veteran';
  const lastCampaign = defs.reader('campaign').all().at(-1)!;
  const highestRank = Math.max(...defs.reader('careerRank').all().map(x => x.level));
  const highestMerit = Math.max(...defs.reader('careerRank').all().map(x => x.requiredMerit));
  const state = {
    ...initial,
    config: { ...initial.config, careerCap: veteran ? highestRank : initial.config.careerCap },
    career: veteran ? { civil: highestRank, martial: highestRank } : initial.career,
    currencies: veteran ? { merit: { civil: highestMerit, martial: highestMerit } } : initial.currencies,
    attributes: { values: veteran ? { lead: 100, war: 100, int: 100, pol: 100 } : sample === 'full' ? { lead: 58, war: 72, int: 43, pol: 39 } : initial.attributes.values },
    progress: { ...initial.progress, pendingCampaign: true, turnInChapter: 8, ...(veteran ? { chapter: chapterIndex(4), chapterId: lastCampaign.chapterId } : {}) },
    abilities: { ...initial.abilities, skills },
    roster: { members: people.map((x, i) => ({ notableId: x.notableId, affinity: 30 + i * 10, origin: 'companion' as const })) },
    metaSnapshot: { ...initial.metaSnapshot, notableCodex: Object.fromEntries(people.map(x => [String(x.notableId), { star: 3, fragments: 0 }])) },
  };
  return Session.restore(wiring, begin(state.progress.chapterId, { state, defs }, wiring.fx));
}

