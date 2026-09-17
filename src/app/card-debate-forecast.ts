import {DEBATE_RECOVER,debateBlock,resolveCardDebate,type CardDebate,type DebateCard,type Debater} from './card-debate-model.js';
import type {DebateResource} from '../contracts/core/card-debate.js';

export type DebateResourceForecast=Record<DebateResource,readonly [number,number]>;
export interface DebateForecast {ally:DebateResourceForecast;enemy:DebateResourceForecast}
const resources=['heart','mind','evidence','momentum'] as const;
/** Project public hypothetical replies through the real resolver, never the hidden committed reply. */
export function forecastCardDebate(state:CardDebate,index:number,replies:readonly DebateCard[]):DebateForecast|null {
 if(state.result||!Number.isInteger(index)||index<DEBATE_RECOVER||index>=state.ally.hand.length)return null;
 if(index!==DEBATE_RECOVER&&debateBlock(state.ally,state.ally.hand[index]!))return null;
 const outcomes:CardDebate[]=[];
 for(const reply of new Set(replies)){
  if(debateBlock(state.enemy,reply))continue;
  // The recovery fallback is public and has a different recovery amount than a focus card.
  for(const fallback of reply==='focus'?[false,true]:[false]){
   const copy=structuredClone(state);
   copy.enemy.hand[0]=reply;copy.enemyChoice=fallback?DEBATE_RECOVER:0;
   if(resolveCardDebate(copy,index))outcomes.push(copy);
  }
 }
 if(!outcomes.length)return null;
 const side=(key:'ally'|'enemy'):DebateResourceForecast=>{
  const range=(resource:DebateResource):readonly [number,number]=>{
   const values=outcomes.map(state=>state[key][resource]);return [Math.min(...values),Math.max(...values)];
  };
  return {heart:range('heart'),mind:range('mind'),evidence:range('evidence'),momentum:range('momentum')};
 };
 return {ally:side('ally'),enemy:side('enemy')};
}
/** Reconstruct visible pre-reveal resources without modifying the resolved simulation. */
export function beforeDebateTurn(f:Debater,change:Record<DebateResource,number>):Debater {
 return {...f,...Object.fromEntries(resources.map(key=>[key,f[key]-change[key]]))};
}
export function settledDebateForecast(f:Debater):DebateResourceForecast {
 return {heart:[f.heart,f.heart],mind:[f.mind,f.mind],evidence:[f.evidence,f.evidence],momentum:[f.momentum,f.momentum]};
}
/** Absolute resource intervals, shared by the filled bars and the supply-style icon slots. */
export function debateForecastSegments(value:number,capacity:number,range:readonly [number,number]|undefined){
 const clamp=(v:number)=>Math.max(0,Math.min(capacity,v));
 const current=clamp(value),low=range?clamp(Math.min(...range)):current,high=range?clamp(Math.max(...range)):current;
 return {steady:Math.min(current,low),lossStart:Math.min(current,low),loss:Math.max(0,current-low),gainStart:current,gain:Math.max(0,high-current)};
}
