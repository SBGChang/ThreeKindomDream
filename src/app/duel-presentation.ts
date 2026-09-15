import type {Contest} from '../contracts/core/confrontation.js';

export const DUEL_REVEAL_SECONDS=2.13;
export const DUEL_COLLISION={launch:.08,first:.34,release:.4,rebound:.52,second:.66,flash:.7,result:.94} as const;
export const DUEL_RESET_SECONDS=.25;
export const DUEL_EVOLUTION_SECONDS=2.8;
export const DUEL_ACTION_SECONDS=1.8;
export function duelActionStart(c:Contest):number {
 return DUEL_REVEAL_SECONDS+DUEL_RESET_SECONDS+(c.duel?.last?.allyEvolution?DUEL_EVOLUTION_SECONDS:0);
}
export const duelClashDuration=(c:Contest):number=>duelActionStart(c)+DUEL_ACTION_SECONDS;
/** One simulation clock drives icons, camera, character poses and pause/resume. */
export function duelPresentation(c:Contest):{stage:'none'|'reveal'|'reset'|'evolution'|'combat';time:number} {
 if(!c.duel||c.phase!=='clash')return {stage:'none',time:0};
 const t=c.phaseTime;
 if(t<DUEL_REVEAL_SECONDS)return {stage:'reveal',time:t};
 if(t<DUEL_REVEAL_SECONDS+DUEL_RESET_SECONDS)return {stage:'reset',time:t-DUEL_REVEAL_SECONDS};
 if(t<duelActionStart(c))return {stage:'evolution',time:t-DUEL_REVEAL_SECONDS-DUEL_RESET_SECONDS};
 return {stage:'combat',time:t-duelActionStart(c)};
}
