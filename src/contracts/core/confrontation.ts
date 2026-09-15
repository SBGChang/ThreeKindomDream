import type {DuelBuild,DuelState,DuelParticipant,DuelFighter} from './duel.js';
import type {BattleState,Side} from './realtime-battle.js';
import type {CardDebate,DebateBuild} from './card-debate.js';
export type ContestKind='duel'|'debate';
export type ContestPhase='clear'|'approach'|'read'|'clash'|'verdict'|'restore'|'retreat';
export type PreviewMode=ContestKind|'random'|'campaign'|'cards';
export interface Challenge {cue:string;hint:string;choices:readonly[string,string,string];correct:number;answer:string}
export interface Contest {
 /** Display snapshot while the already-resolved turn is being revealed. */
 duelBefore?:{ally:DuelFighter;enemy:DuelFighter};
 cards?:CardDebate;
 duel:DuelState|null;draw:boolean;kind:ContestKind;phase:ContestPhase;phaseTime:number;round:number;
 allyHp:number;enemyHp:number;insight:number;revealed:boolean;challenge:Challenge;choice:number|null;success:boolean;perfect:boolean;
 feedback:string;winner:Side|null;elapsed:number;allyId:string;allyName:string;enemyId:string;enemyName:string;
}
/** JSON-safe progress; the battlefield is stored separately, avoiding duplicate armies. */
export interface EncounterProgress {
 debateBuilds?:{ally:DebateBuild;enemy:DebateBuild};
 duelBuilds:{ally:DuelBuild;enemy:DuelBuild};participants:{ally:DuelParticipant;enemy:DuelParticipant};waveOpponents:DuelParticipant[];
 contest:Contest|null;mode:PreviewMode;rng:number;waveSeen:number;waveTime:number;nextRoll:number;attempted:boolean;
 victories:number;retreats:number;lastResult:string;
}
export interface EncounterDemo extends EncounterProgress {battle:BattleState}
