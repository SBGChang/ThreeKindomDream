import type {RallyCard} from '../contracts/core/debate-rally.js';
/** Display-only ordering; card IDs and the model's draw order stay intact. */
export function sortedRallyHand(hand:readonly RallyCard[]):RallyCard[]{
 const colors={reason:0,evidence:1,presence:2},specials={induct:0,shout:1,concentrate:2,reflect:3,wild:4};
 return [...hand].sort((a,b)=>a.kind==='normal'&&b.kind==='normal'?colors[a.color]-colors[b.color]||a.value-b.value||a.id-b.id:a.kind==='special'&&b.kind==='special'?specials[a.special]-specials[b.special]||a.id-b.id:a.kind==='normal'?-1:1);
}
export function rallyFanSlot(index:number,count:number):{x:number;y:number;angle:number}{
 const middle=(count-1)/2,offset=index-middle,spread=Math.min(7.4,66/Math.max(1,count-1)),normalized=middle?offset/middle:0;
 return {x:offset*spread,y:normalized*normalized*2.5,angle:normalized*Math.min(11,Math.max(0,count-1)*1.5)};
}
