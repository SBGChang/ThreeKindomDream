export type DebateCard='claim'|'proof'|'question'|'rebut'|'borrow'|'focus'|'pressure';
export type DebateTrait='scholar'|'orator'|'counter'|'calm';
export type DebateResource='heart'|'mind'|'evidence'|'momentum';
export interface DebateBuild {int:number;pol:number;trait:DebateTrait}
export interface Debater {build:DebateBuild;heart:number;maxHeart:number;mind:number;maxMind:number;evidence:number;momentum:number;hand:DebateCard[];deck:DebateCard[];discard:DebateCard[]}
export interface DebateTurn {ally:DebateCard;enemy:DebateCard;allyFallback:boolean;allyHand:DebateCard[];allyChange:Record<DebateResource,number>;enemyChange:Record<DebateResource,number>;damageToAlly:number;damageToEnemy:number;notes:string[]}
export interface CardDebate {ally:Debater;enemy:Debater;rng:number;round:number;enemyChoice:number;last:DebateTurn|null;history:DebateTurn[];result:'ally'|'enemy'|'draw'|null}
