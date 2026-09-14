import type { Session } from './session.js';
import type { SlotIndex } from '../contracts/core/primitives.js';
import type { BattleLoadout, EventOffer } from '../contracts/core/state.js';
import type { FactionId, NotableId } from '../contracts/core/ids.js';

/** Headless policies drive the exact Session methods called by the player interface. */
export interface RunPolicy {
  chooseFaction?(s: Session): FactionId | null;
  chooseSuperiors?(s: Session): readonly NotableId[];
  chooseSlot(s: Session): SlotIndex;
  chooseOption(s: Session, offer: EventOffer): number;
  spend(s: Session): void;
  chooseLoadout(s: Session): BattleLoadout;
  chooseEngage(s: Session): boolean;
}
export interface DriveResult { readonly actions: number; readonly depths: readonly number[] }
export function driveRun(s: Session, policy: RunPolicy): DriveResult {
  let actions = 0;
  const depths: number[] = [];
  for (let guard = 0; guard < 1000 && !s.isOver; guard++) {
    if(s.needsChapterCamp){s.continueChapter();continue;}
    if (s.needsFactionChoice) {
      const faction = policy.chooseFaction ? policy.chooseFaction(s) : s.factionOptions().find(x => x.eligible)?.factionId;
      if (faction) s.chooseFaction(faction); else s.noFactionAvailable();
    } else if (s.needsSuperiors) {
      s.assignSuperiors(policy.chooseSuperiors?.(s) ?? s.superiorCandidates().slice(0, s.bondQuota()));
    } else if (s.needsCampaign) {
      if (s.campaignState()?.phase === 'configuring') {
        policy.spend(s);
        s.configureCampaign(policy.chooseLoadout(s));
      }
      let cleared = s.campaignState()?.clearedStages ?? 0;
      while (s.needsCampaign && s.nextStage() !== null && policy.chooseEngage(s)) {
        const result = s.engage();
        if (result.defeated) break;
        cleared++;
      }
      if (s.needsCampaign) s.withdraw();
      depths.push(cleared);
    } else {
      if (!s.hasActed) { s.selectSlot(policy.chooseSlot(s)); actions++; }
      let events = 0;
      while (s.pendingEvent !== null) {
        if (++events > 64) throw new Error('事件佇列未收斂');
        s.resolveEvent(policy.chooseOption(s, s.pendingEvent));
      }
      s.advance();
    }
  }
  if (!s.isOver) throw new Error('策略未完成一輪');
  return { actions, depths };
}
