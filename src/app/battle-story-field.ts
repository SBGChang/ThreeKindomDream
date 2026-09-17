import {createEncounterDemo} from './confrontation-demo.js';
import {startBattle,tickBattle,castSkill} from './realtime-battle-model.js';
import {createBattle} from './realtime-battle-model.js';
import {duelActionStart,duelClashDuration} from './duel-presentation.js';
import {advanceStory,createStoryRun,stepStoryCombat,storySpeech} from './battle-story.js';
import type {BattleStory,StoryRun} from '../contracts/core/battle-story.js';
import type {EncounterDemo,Contest} from '../contracts/core/confrontation.js';
import type {DuelAction} from '../contracts/core/duel.js';

import type {StoryField} from '../contracts/core/battle-story.js';
export type {StoryField} from '../contracts/core/battle-story.js';
export function createStoryField(d:BattleStory):StoryField {
 const encounter=createEncounterDemo('campaign');encounter.battle=createBattle(d.field.troops);encounter.battle.waveNames=[d.actors[d.field.enemy]!.name];
 const general=encounter.battle.commanders.find(c=>c.side==='enemy');if(general)general.name=d.actors[d.field.enemy]!.name;
 return {encounter,story:createStoryRun(d),mode:'field',triggered:false,paused:false,combatNode:null,outcome:null,contactTime:null};
}
export function startStoryField(s:StoryField):void {startBattle(s.encounter.battle);}
/** Melee contact or the first arrow hit; a pure archer formation also enters the story. */
export function armiesEngaged(s:StoryField):boolean {
 const b=s.encounter.battle;return b.phase==='combat'&&!b.cinematic&&(b.units.some(u=>u.hp<u.maxHp)||b.units.some(u=>u.kind==='infantry'&&u.hp>0&&u.struck&&b.units.some(v=>v.id===u.targetId&&v.side!==u.side)));
}
function syncContest(d:BattleStory,s:StoryField):void {
 const n=d.nodes[s.story.node]!;
 if(n.kind!=='combat'){s.encounter.contest=null;s.combatNode=null;return;}
 if(s.combatNode===s.story.node)return;
 const a=d.actors[n.ally.actor]!,b=d.actors[n.enemy.actor]!;
 s.encounter.contest={duel:s.story.duel,draw:false,kind:'duel',phase:'clear',phaseTime:0,round:1,allyHp:100,enemyHp:n.enemy.health*100,insight:0,revealed:false,challenge:{cue:'',hint:'',choices:['','',''],correct:-1,answer:''},choice:null,success:false,perfect:false,feedback:'',winner:null,elapsed:0,allyId:a.art,allyName:a.name,enemyId:b.art,enemyName:b.name};
 s.combatNode=s.story.node;
}
export function fieldDialogueVisible(d:BattleStory,s:StoryField):boolean {
 if(s.mode!=='story')return false;
 const n=d.nodes[s.story.node]!;return n.kind!=='debate'&&(n.kind!=='combat'||s.encounter.contest?.phase==='read'&&!!storySpeech(d,s.story));
}
export function advanceFieldStory(d:BattleStory,s:StoryField,revision:number,choice?:string):boolean {
 if(s.paused||!fieldDialogueVisible(d,s)||revision!==s.story.revision)return false;
 if(d.nodes[s.story.node]!.kind==='end'){
  s.story.revision++;s.mode='field';s.encounter.contest=null;
  // The demonstration returns to the SAME army state, without spawning a new battle.
  const b=s.encounter.battle;
  if(!d.returnToBattle&&s.outcome&&s.outcome!=='draw'){
   const loser=s.outcome==='ally'?'enemy':'ally';
   const withdrawn=b.units.filter(u=>u.side===loser).reduce((sum,u)=>sum+u.hp,0);
   if(loser==='enemy')b.kills+=withdrawn;else b.lost+=withdrawn;
   b.units=b.units.filter(u=>u.side!==loser);
   b.defeated=loser;b.phase='flee';b.phaseTime=0;
   for(const u of b.units){u.pose=u.side===loser?'run':'guard';u.poseTime=0;}
  }
  return true;
 }
 if(!advanceStory(d,s.story,revision,choice))return false;syncContest(d,s);return true;
}
function resolve(d:BattleStory,s:StoryField,action?:DuelAction):boolean {
 const c=s.encounter.contest;if(!c?.duel)return false;
 const before={ally:structuredClone(c.duel.ally),enemy:structuredClone(c.duel.enemy)};
 if(!stepStoryCombat(d,s.story,s.story.revision,action))return false;
 c.duelBefore=before;c.phase='clash';c.phaseTime=0;c.round=c.duel.round;c.choice=action?['attack','defend','rest'].indexOf(action):null;
 // Spectated exchanges go straight to the character collision, without the player's reveal ceremony.
 const node=d.nodes[s.story.node]!;
 if(node.kind==='combat'&&node.mode==='auto')c.phaseTime=duelActionStart(c);
 c.success=c.duel.last!.damageToEnemy>=c.duel.last!.damageToAlly;c.feedback=c.duel.last!.allyEvolution??'交鋒';return true;
}
export function answerFieldDuel(d:BattleStory,s:StoryField,action:DuelAction):boolean {
 const n=d.nodes[s.story.node]!;return !s.paused&&s.mode==='story'&&n.kind==='combat'&&n.mode==='player'&&s.encounter.contest?.phase==='read'&&!storySpeech(d,s.story)?resolve(d,s,action):false;
}
export function castFieldSkill(s:StoryField,id:string):boolean {return !s.paused&&s.mode==='field'&&castSkill(s.encounter.battle,id);}
const phase=(c:Contest,p:Contest['phase'])=>{c.phase=p;c.phaseTime=0;};
function continueAuto(d:BattleStory,s:StoryField,c:Contest):void {
 if(storySpeech(d,s.story))return;
 if(c.duel!.result){c.draw=c.duel!.result==='draw';c.winner=c.draw?null:c.duel!.result as 'ally'|'enemy';phase(c,'verdict');}
 else resolve(d,s);
}
export function tickStoryField(d:BattleStory,s:StoryField,delta:number):void {
 if(s.paused||s.mode==='finished'||s.encounter.battle.status!=='running')return;
 const dt=Math.max(0,Math.min(.05,delta));
 if(s.mode==='field'){
  const b=s.encounter.battle;tickBattle(b,dt);
  if(!s.triggered&&b.wave===d.field.wave&&armiesEngaged(s)){s.triggered=true;s.mode='story';s.contactTime=b.time;syncContest(d,s);}
  if(!d.returnToBattle&&(b.status==='finished'||b.phase==='exit'||b.phase==='fade-out')){s.mode='finished';b.status='finished';b.reason=b.defeated==='ally'?'虎牢關前敗退。':b.defeated==='enemy'?'虎牢第一關突破。':'鳴金收兵。';}
  return;
 }
 const c=s.encounter.contest,n=d.nodes[s.story.node]!;if(!c||n.kind!=='combat')return;
 if(c.phase==='read'){
  if(storySpeech(d,s.story))return;
  if(c.duel!.result){c.draw=c.duel!.result==='draw';c.winner=c.draw?null:c.duel!.result as 'ally'|'enemy';phase(c,'verdict');return;}
  if(n.mode==='auto')resolve(d,s);
  else if(c.duel!.ally.fainted){c.phaseTime+=dt;if(c.phaseTime>=.9)resolve(d,s);}
  return;
 }
 c.phaseTime+=dt;
 if(c.phase==='clear'&&c.phaseTime>=.9)phase(c,'approach');
 else if(c.phase==='approach'&&c.phaseTime>=1.2){phase(c,'read');if(n.mode==='auto')continueAuto(d,s,c);}
 else if(c.phase==='clash'&&c.phaseTime>=duelClashDuration(c)){phase(c,'read');if(n.mode==='auto')continueAuto(d,s,c);}
 else if(c.phase==='verdict'&&c.phaseTime>=1.8)phase(c,'restore');
 else if(c.phase==='restore'&&c.phaseTime>=.8){
  if(n.mode==='player')s.outcome=c.duel!.result;
  advanceStory(d,s.story,s.story.revision);syncContest(d,s);
 }
}
