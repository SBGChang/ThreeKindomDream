import { defs, wiring, emptyMeta, emptyDraft, t } from './bootstrap.js';
import { Session } from './session.js';
import { seed } from '../contracts/core/ids.js';
import { optionStates } from '../modules/commission.js';
import { storyRarity } from '../modules/stories.js';
/** Real offers and settlement in an isolated session; no player storage is touched. */
export function dialogueReview(scene: string): Session {
  const meta = emptyMeta(),
    s = Session.start(wiring, meta, emptyDraft(meta, defs), seed(77));
  s.selectSlot(0);
  const state = s.current,
    event = defs
      .reader('event')
      .all()
      .find((d) =>
        scene === 'night' ? t(d.titleKey) === '夜巡異響' : scene === 'chase' || scene === 'chain'
          ? d.dialogue?.outcomes?.some((o) =>
              o.beats.some((b) => b.moves?.some((m) => m.path.length > 2)),
            )
          : scene === 'fall'
            ? d.dialogue?.intro.some((b) =>
                b.moves?.some((m) => m.path.some((p) => p.opacity === 0)),
              )
            : scene === 'approach'
              ? d.dialogue?.intro.some((b) =>
                  b.moves?.some((m) => m.duration >= 2000),
                )
              : d.trigger.kind ===
                (scene === 'notable' ? 'notable' : 'commission'),
      )!;
  const prepared = Session.restore(wiring, {
    ...state,
    attributes: { values: scene === 'night' ? { lead: 36, war: 29, int: 37, pol: 24 } : { lead: 75, war: 75, int: 75, pol: 75 } },
    economy: {
      ...state.economy,
      money: 6000,
      earned: 6000 + state.economy.spent,
    },
    roster: {
      members: defs
        .reader('notable')
        .all()
        .map((d) => ({
          notableId: d.notableId,
          origin: 'companion' as const,
          affinity: 65,
          cooperations: 6,
        })),
    },
    turn: {
      ...state.turn,
      pending: [],
      resolved: [],
      encounterCandidates: [],
      slots: state.turn.slots.map((slot) => ({
        ...slot,
        hasEncounter: false,
        hasCommission: false,
      })),
    },
  });
  const offer = {
    eventDefId: event.eventDefId,
    rarity: storyRarity(event),
    params: Object.fromEntries(
      event.paramSlots.map((slot) => [
        slot.name,
        defs.reader('paramPool').get(String(slot.poolId)).entries[0]!,
      ]),
    ),
    optionStates: optionStates(
      event,
      storyRarity(event),
      prepared.ctx,
      wiring.fx,
    ),
  };
  const next = defs.reader('event').all().find(d => d.trigger.kind === 'notable' && storyRarity(d) === 1)!;
  const pending = scene === 'chain' ? [offer, {eventDefId:next.eventDefId,rarity:storyRarity(next),params:{},optionStates:optionStates(next,storyRarity(next),prepared.ctx,wiring.fx)}] : [offer];
  return Session.restore(wiring, {
    ...prepared.current,
    turn: { ...prepared.current.turn, pending },
  });
}
