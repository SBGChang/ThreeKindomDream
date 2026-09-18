import type { Contest } from './confrontation.js';
import type { RallyState, RallyBuild } from './debate-rally.js';
import type { DuelBuild } from './duel.js';
import type { BattleState } from './realtime-battle.js';
export type ChallengeOutcome='win'|'lose'|'draw'|'retreat';
export interface EventChallengeDef {
 readonly strategyOnly?:boolean;
 readonly loanSkills?:readonly string[];
 readonly mode:'duel'|'debate'|'battle';
 readonly opponent:string;
 readonly opponentName:string;
 readonly ability:number;
 /** Optional full enemy build; ability remains the fallback for old content/saves. */
 readonly duel?:{readonly enemy:DuelBuild;readonly ally?:Pick<DuelBuild,'comboEnabled'>};
 /** Player attributes always come from this run; authored traits configure the encounter. */
 readonly debate?:{readonly enemy:RallyBuild;readonly ally?:Pick<RallyBuild,'special'|'specials'|'passives'>};
 readonly opening:string;
 readonly outcomes:Readonly<Record<ChallengeOutcome,string>>;
 readonly enemySquads?:number;
 readonly enemyTroops?:number;
 /** A single event, with a decision and a fresh duel between rounds. */
 readonly stages?:readonly {readonly title:string;readonly power:number;readonly opening:string;readonly victory:string;readonly encounter?:EventChallengeDef}[];
 /** Gold on voluntary withdrawal, indexed by completed stages (including zero). */
 readonly cashOutGold?:readonly number[];
}
/** A standalone challenge never owns a campaign or advances its stages. */
export interface EventChallengeState {
 source?:'chapter';
 canDecline?:boolean;
 eventId:string;option:number;turn:number;seed:number;
 phase:'opening'|'prep'|'playing'|'intermission'|'result';paused:boolean;
 stage?:number;completed?:number;
 definition:EventChallengeDef;outcome:ChallengeOutcome|null;
 skills:string[];infantryPercent:number;
 contest:Contest|null;rally:RallyState|null;battle:BattleState|null;
}
export const stageChallenge=(s:EventChallengeState):EventChallengeDef=>s.definition.stages?.[s.stage??0]?.encounter??s.definition;
