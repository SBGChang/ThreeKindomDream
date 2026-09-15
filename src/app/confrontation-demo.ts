import {duelClashDuration} from './duel-presentation.js';
import type {ContestKind,ContestPhase,PreviewMode,Challenge,Contest,EncounterDemo} from '../contracts/core/confrontation.js';
export type {ContestKind,ContestPhase,PreviewMode,Challenge,Contest,EncounterDemo} from '../contracts/core/confrontation.js';
import type {DuelParticipant} from '../contracts/core/duel.js';
import {createCardDebate,resolveCardDebate,DEBATE_CARDS,DEBATE_RECOVER} from './card-debate-model.js';
import { armyCount, createBattle, startBattle, tickBattle, type BattleState, type Side } from './realtime-battle-model.js';

import { ACTION_NAME, DUEL_ACTIONS, DEFAULT_DUEL_BUILD, createDuel, resolveDuel, counters, type DuelBuild, type DuelState } from './duel-model.js';

const DEBATE: readonly Challenge[] = [
  {cue:'你們糧車未到，再戰下去，人人都得餓死！',hint:'對方把補給問題說成必然潰敗。',choices:['糧車已走南道，哨騎剛剛回報。','我軍人多，根本不需要糧草。','你說得響亮，便是你有道理？'],correct:0,answer:'以補給實情，拆開誇大的結論。'},
  {cue:'我軍旗多勢盛，你們此刻不降，更待何時？',hint:'旗幟的數量，能否證明真實兵力？',choices:['旗越多，便一定越容易取勝。','旗後有多少兵？何不先說清楚？','今日風大，旗自然飛得好看。'],correct:1,answer:'追問依據，迫使對方收回威嚇。'},
  {cue:'只要你退讓，我便保證百姓安穩，不必問條件！',hint:'漂亮承諾缺少能執行的約束。',choices:['你既然保證，我們便立刻退兵。','百姓如何，與今日勝負無關。','先定撤兵界線與交接時辰，再談承諾。'],correct:2,answer:'把空泛承諾落到可履行的條件。'},
  {cue:'你們接連受挫，還有誰願意跟著你？',hint:'對方正在動搖軍心；回應共同守護的目標。',choices:['身後是同袍與家園，我們知道為誰而戰。','只要我的官位還在，何必管別人？','過去的傷亡，全是士卒自己的錯。'],correct:0,answer:'穩住軍心，讓將士重新站在一起。'},
  {cue:'我既說不傷百姓，徵走他們所有糧食又有何妨？',hint:'前後兩句是否能同時成立？',choices:['你的軍糧比百姓的生計重要。','取盡口糧仍稱不傷民，你要如何自圓其說？','糧袋的顏色倒是十分整齊。'],correct:1,answer:'指出前後矛盾，令敵將無言以對。'},
];
export const replyWindow = (c: Contest): number => c.duel || c.kind === 'duel' ? Infinity : c.cards ? 25 : 14;
const random = (s: EncounterDemo): number => {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 0x100000000;
};
const nextChallenge = (s: EncounterDemo, kind: ContestKind, round: number): Challenge => {
  if(s.mode==='cards')return {cue:'',hint:'',choices:['','',''],correct:-1,answer:''};
  if(kind==='duel')return {cue:'敵方已鎖定動作，雙方同時揭招。',hint:'攻擊剋休養，休養剋防守，防守剋攻擊。',choices:['攻擊','防守','休養'],correct:-1,answer:''};
  const source=DEBATE[(round-1)%DEBATE.length]!;
  // Move answers as a whole so the correct position cannot be memorised as 1,2,3.
  const offset = Math.floor(random(s) * 3);
  return {...source,choices:[source.choices[offset]!,source.choices[(offset+1)%3]!,source.choices[(offset+2)%3]!],correct:(source.correct-offset+3)%3};
};
/** Isolated preview state: no Session, content mutation, storage or campaign rewards. */
export function createEncounterDemo(mode: PreviewMode = 'duel', seed = 20260914, builds:{ally:DuelBuild;enemy:DuelBuild}={ally:DEFAULT_DUEL_BUILD,enemy:DEFAULT_DUEL_BUILD},participants?:{ally:DuelParticipant;enemy:DuelParticipant}): EncounterDemo {
  return {participants:structuredClone(participants??{ally:{id:'lord',name:'主角',build:builds.ally},enemy:{id:'npc_soldier',name:'敵軍指揮官',build:builds.enemy}}),waveOpponents:[],duelBuilds:structuredClone(builds),battle:createBattle(600),contest:null,mode,rng:seed>>>0,waveSeen:1,waveTime:0,nextRoll:8,attempted:false,victories:0,retreats:0,lastResult:''};
}
export function beginEncounterDemo(s: EncounterDemo): void { startBattle(s.battle); }
export function beginContest(s: EncounterDemo, kind: ContestKind): boolean {
  const b=s.battle;
  if(s.contest||s.attempted||b.status!=='running'||b.phase!=='combat'||b.cinematic||b.time>=b.duration||!armyCount(b,'ally')||!armyCount(b,'enemy'))return false;
  s.attempted=true;
  const enemy=s.waveOpponents[Math.min(b.wave-1,s.waveOpponents.length-1)]??s.participants.enemy;
  s.contest={duel:kind==='duel'?createDuel(s.duelBuilds.ally,enemy.build,s.rng):null,draw:false,kind,phase:'clear',phaseTime:0,round:1,allyHp:100,enemyHp:100,insight:2,revealed:false,challenge:nextChallenge(s,kind,1),choice:null,success:false,perfect:false,feedback:'',winner:null,elapsed:0,allyId:kind==='duel'?s.participants.ally.id:'guojia',allyName:kind==='duel'?s.participants.ally.name:'郭嘉',enemyId:enemy.id,enemyName:enemy.name};
  if(s.mode==='cards'&&kind==='debate')s.contest.cards=createCardDebate(s.debateBuilds?.ally,s.debateBuilds?.enemy,s.rng);
  return true;
}
function phase(c: Contest, next: ContestPhase): void { c.phase=next;c.phaseTime=0; }
function verdict(c: Contest): void {
  if(c.cards){c.draw=c.cards.result==='draw';c.winner=c.draw?null:c.cards.result as Side;c.feedback=c.draw?'辯勢相當，各自歸陣。':c.winner==='ally'?'敵將理屈，全軍退卻！':'我方失勢，全軍撤退。';phase(c,'verdict');return;}
  if(c.duel){c.draw=c.duel.result==='draw';c.winner=c.draw?null:c.duel.result as Side;c.feedback=c.draw?'勢均力敵，各自歸陣。':c.winner==='ally'?'敵將敗陣，全軍退卻！':'我方失利，全軍撤退。';phase(c,'verdict');return;}
  c.winner=c.enemyHp<=0?'ally':c.allyHp<=0?'enemy':c.allyHp>c.enemyHp?'ally':'enemy';
  c.feedback=c.winner==='ally'?(c.kind==='duel'?'敵將敗陣，全軍退卻！':'敵將理屈，軍心已散！'):'我方失利，全軍撤退。';
  phase(c,'verdict');
}
export function revealArgument(s: EncounterDemo): boolean {
  const c=s.contest;
  if(s.battle.status!=='running'||!c||c.kind!=='debate'||c.phase!=='read'||c.revealed||c.insight<=0)return false;
  c.insight--;c.revealed=true;return true;
}
export function answerContest(s: EncounterDemo, choice: number): boolean {
  const c=s.contest;
  if(s.battle.status!=='running'||!c||c.phase!=='read'||!Number.isInteger(choice)||choice<(c.cards?DEBATE_RECOVER:0)||choice>(c.cards?c.cards.ally.hand.length-1:2))return false;
  if(c.cards){if(!resolveCardDebate(c.cards,choice))return false;const d=c.cards,last=d.last!;c.choice=choice;c.success=last.damageToEnemy>=last.damageToAlly;c.feedback=DEBATE_CARDS[last.ally].name+' · '+DEBATE_CARDS[last.enemy].name;c.allyHp=Math.round(d.ally.heart/d.ally.maxHeart*100);c.enemyHp=Math.round(d.enemy.heart/d.enemy.maxHeart*100);phase(c,'clash');return true;}
  if(c.duel)return answerDuel(s,choice);
  c.choice=choice;
  c.success=choice===c.challenge.correct;
  c.perfect=false;
  if(c.success){
    c.enemyHp=Math.max(0,c.enemyHp-34);
    c.feedback=c.challenge.answer;
  }else{
    c.allyHp=Math.max(0,c.allyHp-30);
    c.feedback='答非所問，對方乘隙反駁。';
  }
  phase(c,'clash');return true;
}
function answerDuel(s:EncounterDemo,choice:number|null):boolean {
  const c=s.contest;if(!c?.duel)return false;
  const action=choice===null?null:DUEL_ACTIONS[choice];
  if(action===undefined)return false;
  const before={ally:structuredClone(c.duel.ally),enemy:structuredClone(c.duel.enemy)};
  if(!resolveDuel(c.duel,action))return false;
  c.duelBefore=before;
  const d=c.duel,last=d.last!;
  c.choice=choice;c.success=counters(last.ally,last.enemy)||last.damageToEnemy>last.damageToAlly;
  c.perfect=!!last.allyEvolution;
  c.allyHp=Math.round((1-d.ally.injury/d.ally.injuryLimit)*100);c.enemyHp=Math.round((1-d.enemy.injury/d.enemy.injuryLimit)*100);
  c.feedback=[last.allyEvolution?('我方・'+last.allyEvolution):'',(last.ally?ACTION_NAME[last.ally]:'昏厥')+' 對 '+(last.enemy?ACTION_NAME[last.enemy]:'昏厥')].filter(Boolean).join(' · ');
  phase(c,'clash');return true;
}
function timeout(c: Contest): void {
  if(c.duel||c.kind==='duel')return;
  c.choice=null;c.success=false;c.perfect=false;c.allyHp=Math.max(0,c.allyHp-30);
  c.feedback='遲未應答，軍心動搖。';phase(c,'clash');
}
function completeRetreat(s: EncounterDemo, c: Contest): void {
  const b=s.battle,loser=c.winner==='ally'?'enemy':'ally';
  const withdrawn=armyCount(b,loser);
  // Routed soldiers leave alive. Count them as driven off, never play death sprites.
  if(loser==='enemy'){b.kills+=withdrawn;s.victories++;}else{b.lost+=withdrawn;s.retreats++;}
  b.units=b.units.filter(u=>u.side!==loser);
  b.defeated=loser;b.phase='cheer';b.phaseTime=0;
  for(const u of b.units){u.pose='guard';u.poseTime=0;u.hitTime=0;}
  for(const g of b.commanders){g.pose=g.side===c.winner?'cheer':'move';g.poseTime=0;}
  s.lastResult=c.feedback;b.log.unshift(c.feedback);s.contest=null;
}
export function tickEncounterDemo(s: EncounterDemo, delta: number): void {
  if(s.battle.status!=='running')return;
  const dt=Math.max(0,Math.min(.05,delta));if(!dt)return;
  const c=s.contest;
  if(c){
    // A duel decision is an input gate, not a timed phase. Do not advance any
    // clocks or enter the debate timeout path, including after save/resume.
    if(c.phase==='read'&&(c.duel||c.kind==='duel')){
      if(c.duel?.ally.fainted){
        c.phaseTime+=dt;
        if(c.phaseTime>=.8)answerDuel(s,null);
      }
      return;
    }
    c.phaseTime+=dt;
    if(c.phase==='read'||c.phase==='clash')c.elapsed+=dt;
    if(c.phase==='clear'&&c.phaseTime>=.9)phase(c,'approach');
    else if(c.phase==='approach'&&c.phaseTime>=1.2)phase(c,'read');
    else if(c.phase==='read'&&c.phaseTime>=replyWindow(c)){if(c.cards)answerContest(s,DEBATE_RECOVER);else timeout(c);}
    else if(c.phase==='clash'&&c.phaseTime>=(c.duel?duelClashDuration(c):c.cards?1.8:1.15)){
      if(c.cards?!!c.cards.result:c.duel?!!c.duel.result:c.allyHp<=0||c.enemyHp<=0||c.round>=5)verdict(c);
      else{c.round=c.cards?c.cards.round:c.duel?c.duel.round:c.round+1;c.challenge=nextChallenge(s,c.kind,c.round);c.choice=null;c.revealed=false;phase(c,'read');}
    }else if(c.phase==='verdict'&&c.phaseTime>=1.8)phase(c,'restore');
    else if(c.phase==='restore'&&c.phaseTime>=.8){
      if(c.draw){s.lastResult=c.feedback;s.battle.log.unshift(c.feedback);s.contest=null;return;}
      phase(c,'retreat');
      const loser=c.winner==='ally'?'enemy':'ally';
      for(const u of s.battle.units){u.pose=u.side===loser?'run':'guard';u.poseTime=0;u.hitTime=0;}
      for(const g of s.battle.commanders){g.pose=g.side===loser?'move':'command';g.poseTime=0;if(g.side===loser)g.flip=loser==='ally';}
    }else if(c.phase==='retreat'){
      const loser=c.winner==='ally'?'enemy':'ally',direction=loser==='enemy'?1:-1;
      for(const u of s.battle.units){u.poseTime+=dt;if(u.side===loser)u.x+=direction*600*dt;}
      for(const g of s.battle.commanders){g.poseTime+=dt;if(g.side===loser)g.x+=direction*600*dt;}
      if(c.phaseTime>=3)completeRetreat(s,c);
    }
    return;
  }
  const before=s.battle.time;
  tickBattle(s.battle,dt);
  if(s.battle.wave!==s.waveSeen){s.waveSeen=s.battle.wave;s.waveTime=0;s.nextRoll=8;s.attempted=false;}
  s.waveTime+=s.battle.time-before;
  if(s.battle.status!=='running'||s.battle.phase!=='combat'||s.battle.cinematic||s.attempted)return;
  if((s.mode==='duel'||s.mode==='debate')&&s.waveTime>=3.5){beginContest(s,s.mode);return;}
  if(s.mode==='cards'&&s.waveTime>=3.5){beginContest(s,'debate');return;}
  if((s.mode==='random'||s.mode==='campaign')&&s.waveTime>=s.nextRoll){
    s.nextRoll+=8;
    if(random(s)<.18)beginContest(s,s.mode==='campaign'?'duel':random(s)<.5?'duel':'debate');
  }
}
