/** Authored infantry run cells are 25% larger than slash/hurt cells.
 * Use one scale for the whole clip (never normalize weapon/pose bounds per frame).
 * Foot samples are opaque boot bottoms in the 256px atlases, not shadow bounds.
 */
const runFeet:Readonly<Record<string,readonly number[]>>={
 run:[225,224,226,224,211,210,215,211,215,215,212,215,208,212,208,208],
 'enemy-run':[227,226,228,225,212,211,216,212,216,217,214,216,211,213,210,210],
};
export function battleSpriteRect(name:string,frame:number,size:number) {
 const feet=runFeet[name];
 if(!feet)return {x:-size/2,y:-size*.89,width:size,height:size};
 const scale=.8,foot=feet[Math.max(0,Math.min(15,Math.floor(frame)))]!;
 // Keep the established slash/hurt boot baseline (214/256) relative to world y.
 return {x:-size*scale/2,y:size*(214/256-.89)-size*scale*foot/256,width:size*scale,height:size*scale};
}
