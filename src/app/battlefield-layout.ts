import type {Side} from '../contracts/core/realtime-battle.js';
/** Painted battlefield edges; reserve half a soldier sprite inside each edge. */
export const BATTLEFIELD={left:340,right:1340,padding:80} as const;
export const troopX=(x:number)=>Math.max(BATTLEFIELD.left+BATTLEFIELD.padding,Math.min(BATTLEFIELD.right-BATTLEFIELD.padding,x));
/** Fit any army size into its deployment area without occupying commander space. */
export function formationX(side:Side,column:number,columns:number):number {
 const distance=columns<=1?0:column*200/(columns-1);
 return troopX(side==='ally'?620-distance:1060+distance);
}
