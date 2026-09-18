import {playEventChallenge} from './event-challenge-driver.js';
import {fieldDialogueVisible} from './battle-story-field.js';
import {chooseRallyAction} from './debate-rally-model.js';
import { actionBlock } from './duel-model.js';
import type { Session } from './session.js';
import type { SlotIndex } from '../contracts/core/primitives.js';
import type { BattleLoadout, EventOffer } from '../contracts/core/state.js';
import type { FactionId, NotableId } from '../contracts/core/ids.js';

/** Headless policies drive the exact Session methods called by the player interface. */
export interface RunPolicy {
  chooseStory?(s: Session): string;
  chooseFaction?(s: Session): FactionId | null;
  chooseSuperiors?(s: Session): readonly NotableId[];
  chooseSlot(s: Session): SlotIndex;
  chooseOption(s: Session, offer: EventOffer): number;
  spend(s: Session): void;
  chooseLoadout(s: Session): BattleLoadout;
  chooseEngage(s: Session): boolean;
  chooseRealtimeSkill?(s:Session):string|null;
  chooseDuel?(s:Session):number;
}
export interface DriveResult { readonly actions: number; readonly depths: readonly number[] }
export function driveRun(s: Session, policy: RunPolicy, options:{battle?:'legacy'|'realtime'}={}): DriveResult {
  let actions = 0;
  const depths: number[] = [];
  for (let guard = 0; guard < 1000 && !s.isOver; guard++) {
    if(s.current.eventChallenge?.source==='chapter'){playEventChallenge(s,0);continue;}
    if(s.needsChapterCamp){s.continueChapter();continue;}
    if (s.needsEndingChoice) {
      const ending = s.storyEndingOptions()[0];
      if (!ending) throw new Error('沒有可紀念的改命結局');
      s.chooseStoryEnding(String(ending.ending));
    } else if (s.storyScene) {
      s.acknowledgeStory(s.storyScene.id);
    } else if (s.storyChoice) {
      const option = policy.chooseStory?.(s) ?? s.storyChoice.options[0]?.id;
      if (!option) throw new Error('主線缺少選項');
      s.chooseStory(s.storyChoice.id, option);
    } else if (s.needsFactionChoice) {
      const faction = policy.chooseFaction ? policy.chooseFaction(s) : s.factionOptions().find(x => x.eligible)?.factionId;
      if (faction) s.chooseFaction(faction); else s.noFactionAvailable();
    } else if (s.needsSuperiors) {
      s.assignSuperiors(policy.chooseSuperiors?.(s) ?? s.superiorCandidates().slice(0, s.bondQuota()));
    } else if (s.needsCampaign) {
      if (s.campaignState()?.phase === 'configuring') {
        policy.spend(s);
        s.configureCampaign(policy.chooseLoadout(s));
      }
      if(options.battle==='realtime'){
        const battle=s.startRealtimeCampaign();
        for(let frame=0;frame<120000&&battle.status!=='finished';frame++){
          const story=s.battlefieldStory;
          if(story&&story.field.mode==='story'){const node=story.data.nodes[story.field.story.node]!;if(node.kind==='debate'){const rally=story.field.story.rally!;if(rally.winner)s.finishBattleDebate();else s.answerBattleDebate(rally.turn,chooseRallyAction(rally));}else if(fieldDialogueVisible(story.data,story.field)){s.advanceBattleStory(story.field.story.revision,node.kind==='choice'?node.options[0]!.id:undefined);}}
          const encounter=s.realtimeConfrontation();
          if(encounter?.contest?.phase==='read')s.answerRealtimeDuel(policy.chooseDuel?.(s)??(encounter.contest.duel&&actionBlock(encounter.contest.duel.ally,'attack')?2:0));
          if(frame%15===0){
            if(policy.chooseRealtimeSkill){const id=policy.chooseRealtimeSkill(s);if(id)s.castRealtimeSkill(id);}
            else for(const skill of battle.skills)if(s.castRealtimeSkill(skill.id))break;
          }
          s.advanceRealtimeCampaign(1/60);
        }
        if(battle.status!=='finished')throw new Error('即時戰役策略未收斂');
        depths.push(s.realtimeCampaignResult().cleared);s.settleRealtimeCampaign();continue;
      }
      let cleared = s.campaignState()?.clearedStages ?? 0;
      while (s.needsCampaign && s.nextStage() !== null && policy.chooseEngage(s)) {
        const result = s.engage();
        if (result.defeated) break;
        cleared++;
        while (s.current.story.scenes.length > 0 && s.needsCampaign) s.acknowledgeStory(s.current.story.scenes[0]!.id);
      }
      if (s.needsCampaign) s.withdraw();
      depths.push(cleared);
    } else {
      if (!s.hasActed) { s.selectSlot(policy.chooseSlot(s)); actions++; }
      let events = 0;
      while (s.pendingEvent !== null) {
        if (++events > 64) throw new Error('事件佇列未收斂');
        playEventChallenge(s,policy.chooseOption(s, s.pendingEvent));
      }
      if (s.canAdvance()) s.advance();
    }
  }
  if (!s.isOver) throw new Error('策略未完成一輪');
  return { actions, depths };
}
