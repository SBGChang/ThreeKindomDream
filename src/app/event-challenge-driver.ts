import type {Session} from './session.js';
import {chooseRallyAction} from './debate-rally-model.js';
import {DUEL_ACTIONS,actionBlock} from './duel-model.js';
/** Simulations use the same moves and outcome gate as the UI, never a synthetic success flag. */
export function playEventChallenge(s:Session,option:number):void {
 const offer=s.pendingEvent;if(!offer)return;
 const def=s.ctx.defs.reader('event').get(String(offer.eventDefId));
 if(!def.options[option]?.challenge){s.resolveEvent(option);return;}
 if(!s.current.eventChallenge)s.beginEventChallenge(option);
 const c=s.current.eventChallenge!;
 if(c.phase==='opening')s.enterEventChallenge();
 if(c.phase==='prep')s.enterEventChallenge();
 s.pauseEventChallenge(false);
 for(let frame=0;frame<90000&&c.phase!=='result';frame++){
  if(c.phase==='intermission'){s.continueEventChallenge();s.enterEventChallenge();}
  if(c.rally){if(c.rally.winner)s.finishEventDebate();else s.answerEventDebate(c.rally.turn,chooseRallyAction(c.rally));}
  if(c.contest?.phase==='read'&&c.contest.duel){const f=c.contest.duel.ally;const choices=DUEL_ACTIONS.map((_,i)=>(i+c.contest!.round)%3);const choice=choices.find(i=>!actionBlock(f,DUEL_ACTIONS[i]!));if(choice!==undefined)s.answerEventDuel(choice);}
  if(c.battle)for(const skill of c.battle.skills)s.castEventSkill(skill.id);
  s.tickEventChallenge(1/60);
 }
 if(c.phase!=='result')throw Error('事件挑戰未收斂');
 s.resolveEvent(option);
}
