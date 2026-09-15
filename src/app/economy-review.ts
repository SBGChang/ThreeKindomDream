import { Session } from './session.js';
import { defs, wiring, emptyMeta, emptyDraft } from './bootstrap.js';
import { seed } from '../contracts/core/ids.js';
import { emptyStory } from '../modules/story.js';
/** Isolated fixture for UI regression review. Never reads or writes player saves. */
export function economyReview(): Session {
  const base = emptyMeta(),
    meta = {
      ...base,
      shop: {
        purchased: Object.fromEntries(
          defs
            .reader('shopItem')
            .all()
            .filter((d) =>
              d.levels.some((l) =>
                ['marketSlots', 'marketQuality', 'factionBond'].includes(
                  l.grant.kind,
                ),
              ),
            )
            .map((d) => [String(d.item), 3]),
        ),
      },
      itemCodex: Object.fromEntries(
        defs
          .reader('item')
          .all()
          .map((d) => [String(d.itemId), { tier: 0, fragments: 0 }]),
      ),
    };
  const initial = Session.start(wiring, meta, emptyDraft(meta, defs), seed(4242));
  const s = Session.restore(wiring, {...initial.current, story:emptyStory(false)});
  for (let i = 0; i < 8; i++) {
    s.selectSlot(0);
    while (s.pendingEvent)
      s.resolveEvent(s.pendingEvent.optionStates.findIndex((o) => o.enabled));
    s.advance();
  }
  s.configureCampaign({
    skills: s.current.abilities.skills.slice(0, 3),
    commanders: [],
  });
  s.withdraw();
  const state = s.current;
  return Session.restore(wiring, {
    ...state,
    economy: {
      ...state.economy,
      money: 6000,
      earned: state.economy.spent + 6000,
    },
    attributes: { values: { lead: 75, war: 75, int: 75, pol: 75 } },
  });
}

/** Stable layout examples: two people, signals alone, six people, and empty. */
export function runLayoutReview(): Session {
  const meta = emptyMeta(),
    s = Session.start(wiring, meta, emptyDraft(meta, defs), seed(77)),
    state = s.current;
  const ids = defs
    .reader('notable')
    .all()
    .slice(0, 6)
    .map((n) => n.notableId);
  return Session.restore(wiring, {
    ...state,
    attributes: { values: { lead: 33.02, war: 25.54, int: 18.71, pol: 70.25 } },
    story: emptyStory(false),
    roster: {
      members: ids.map((notableId, i) => ({
        notableId,
        origin: 'companion' as const,
        affinity: 20 + i * 8,
      })),
    },
    turn: {
      ...state.turn,
      slots: state.turn.slots.map((slot, i) => ({
        ...slot,
        notables: i === 0 ? ids.slice(0, 2) : i === 2 ? ids : [],
        hasEncounter: i === 0,
        hasCommission: i === 0 || i === 1,
      })),
    },
  });
}

/** Filled inventory and maximum-tier descriptions for bounded UI layout checks. */
export function fullEconomyReview(): Session {
  const s = economyReview(), state = s.current, items = defs.reader('item').all();
  return Session.restore(wiring, {
    ...state,
    metaSnapshot: { ...state.metaSnapshot, itemCodex: Object.fromEntries(items.map(d => [String(d.itemId), { tier: 5, fragments: 0 }])) },
    items: { ...state.items, count: Object.fromEntries(items.map(d => [String(d.itemId), 1])), fragments: Object.fromEntries(items.map(d => [String(d.itemId), 7])) },
  });
}

/** Isolated low-wallet state for validating unavailable purchase controls. */
export function limitedEconomyReview(): Session {
  const state = economyReview().current;
  return Session.restore(wiring, { ...state, economy: { ...state.economy, money: 120, earned: state.economy.spent + 120 } });
}

/** Find a deterministic real roll; the UI still performs the action and computes its receipt. */
export function fixedActionReview(outcome: string, withEvent = false): Session {
  for (let value = 1; value <= 100; value++) {
    const meta = emptyMeta();
    const initial = Session.start(wiring, meta, emptyDraft(meta, defs), seed(value)).current;
    const state = { ...initial, story: emptyStory(false),
      turn: { ...initial.turn, slots: initial.turn.slots.map(slot => ({ ...slot, notables: [], hasCommission: withEvent, hasEncounter: false })) },
    };
    const trial = Session.restore(wiring, state);
    trial.selectSlot(0);
    const tier = trial.current.turn.training!.finalGlow;
    const actual = tier === 'none' ? 'bad' : tier === 'silver' ? 'normal' : 'success';
    if (actual === outcome) return Session.restore(wiring, state);
  }
  throw new Error('找不到固定行動驗收種子');
}

/** Training-only fixtures: pagination, mastered lessons and teaching-empty state. */
export function trainingArtReview(empty = false): Session {
  const state = economyReview().current;
  const skills = empty ? [] : defs.reader('skill').all().map(d => d.skillId);
  const traits = empty ? [] : defs.reader('trait').all().filter(d => d.polarity === 'positive').map(d => d.traitId);
  return Session.restore(wiring, {
    ...state,
    attributes: { values: { lead: 95, war: 95, int: 95, pol: 95 } },
    growth: { ...state.growth, unlockedSkills: skills, unlockedTraits: traits },
    abilities: { ...state.abilities, skills, traits, activeTraits: traits.slice(0, 4),
      levels: Object.fromEntries([...skills, ...traits].map((id, i) => [String(id), i === 0 ? 5 : 1])),
    },
  });
}
