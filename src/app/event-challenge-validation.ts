import {stageChallenge} from '../contracts/core/event-challenge.js';
import type {RunState} from '../contracts/core/state.js';
import {validEventChallengeDef} from '../data-runtime/event-challenge-validation.js';
import {validContest} from './confrontation-validation.js';
import {validRallySnapshot} from './rally-validation.js';
import {validBattleSnapshot} from './realtime-battle-model.js';
/** Validate the return address as well as the mode snapshot, before resuming any gameplay. */
export function validEventChallengeSnapshot(run:RunState):boolean {
 try {
 const s=run.eventChallenge;if(s==null)return true;
 const d=stageChallenge(s),won=s.contest?.duel?.result==='ally'||s.rally?.winner==='ally'||s.battle?.status==='finished'&&!s.battle.units.some(u=>u.side==='enemy'&&u.hp>0);
 const count=s.definition?.stages?.length,stage=s.stage??0,completed=s.completed??0;
 if(count){
  if(!Number.isInteger(stage)||stage<0||stage>=count||!Number.isInteger(completed)||completed<0||completed>count)return false;
  if(s.phase==='intermission'&&(completed!==stage+1||completed>=count||!won))return false;
  if(['opening','playing'].includes(s.phase)&&completed!==stage)return false;
  if(s.outcome==='win'&&(completed!==count||stage!==count-1||!won))return false;
 }else if(s.stage!==undefined||s.completed!==undefined||s.phase==='intermission')return false;
 if(!validEventChallengeDef(s.definition)||(s.source==='chapter'?(!s.eventId||!run.story.awaitingChapterClose||run.story.milestones.includes('resolved:'+s.eventId)):s.eventId!==String(run.turn.pending[0]?.eventDefId))||s.turn!==run.progress.turn||!Number.isInteger(s.option)||s.option<0||(s.source!=='chapter'&&!run.turn.pending[0]?.optionStates[s.option])||!Number.isSafeInteger(s.seed)||s.seed<0||typeof s.paused!=='boolean'||!['opening','prep','playing','intermission','result'].includes(s.phase)||![null,'win','lose','draw','retreat'].includes(s.outcome)||!Array.isArray(s.skills)||s.skills.length>3||new Set(s.skills).size!==s.skills.length||s.skills.some(id=>![...run.abilities.skills,...(d.loanSkills??[])].some(v=>String(v)===id))||!Number.isInteger(s.infantryPercent)||s.infantryPercent<0||s.infantryPercent>100)return false;
 if((s.phase==='result')!==(s.outcome!==null))return false;
 if(s.phase==='result'&&s.outcome==='retreat'&&(count||s.source==='chapter'&&s.canDecline)&&!s.contest&&!s.rally&&!s.battle)return true;
 if(s.phase==='opening'||s.phase==='prep')return !s.contest&&!s.rally&&!s.battle&&(s.phase!=='prep'||d.mode==='battle');
 if(d.mode==='duel')return !!s.contest&&!s.rally&&!s.battle&&validContest(s.contest);
 if(d.mode==='debate')return !!s.rally&&!s.contest&&!s.battle&&validRallySnapshot(s.rally);
 return !!s.battle&&!s.rally&&!s.contest&&validBattleSnapshot(s.battle)&&s.battle.maxWaves===1&&s.battle.commanders.filter(c=>c.side==='ally').length===1&&s.battle.commanders.filter(c=>c.side==='enemy').length===d.enemySquads;
 }catch{return false;}
}
