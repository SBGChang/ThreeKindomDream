export type DuelAction='attack'|'defend'|'rest';
export type DuelTrait='none'|'momentum'|'steady'|'breathing'|'reversal';
export interface DuelBuild {war:number;lead:number;trait:DuelTrait}
export interface DuelFighter {
 /** Opponents do not earn Combo or action points. Omitted in older saves. */
 progression?:boolean;
 build:DuelBuild;attack:number;defense:number;maxStamina:number;stamina:number;injury:number;injuryLimit:number;recovery:number;combo:number;
 points:Record<DuelAction,number>;previous:DuelAction|null;streak:number;taunted:boolean;fainted:boolean;
}
export interface DuelTurn {
 ally:DuelAction|null;enemy:DuelAction|null;damageToAlly:number;damageToEnemy:number;allyEvolution:string|null;enemyEvolution:string|null;
 allyCost:number;enemyCost:number;allyRecovery:number;enemyRecovery:number;notes:string[];
 /** Optional for old saved encounters; actual capped changes for the result HUD. */
 changes?:{ally:{stamina:number;injury:number};enemy:{stamina:number;injury:number}};
}
export interface DuelState {
 ally:DuelFighter;enemy:DuelFighter;round:number;rng:number;enemyAction:DuelAction|null;
 last:DuelTurn|null;result:'ally'|'enemy'|'draw'|null;history:DuelTurn[];
}
export interface DuelParticipant {id:string;name:string;build:DuelBuild}
