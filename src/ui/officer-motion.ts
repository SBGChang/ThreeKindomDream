import {COMMAND_GROUPS,UNIFIED_OFFICERS} from '../contracts/core/officer-motion.js';
import {loadDuelArt,keepFrameInk} from './duel-art.js';
import {duelActorForName} from '../contracts/core/duel-art.js';
export {duelActorForName};
/** Normalize real authored cells while retaining protruding weapons. */
export function repackOfficer(raw:HTMLCanvasElement,columns:number,rows:number,frames:readonly number[]):HTMLCanvasElement{
 const out=document.createElement('canvas');out.width=1280;out.height=Math.ceil(frames.length/4)*320;const ctx=out.getContext('2d')!,w=raw.width/columns,h=raw.height/rows;
 // Generated sheets retain their row order but gutters may drift from the nominal grid.
 // Find the nearby empty gutter before cropping so the following row cannot leak in.
 const rawPixels=raw.getContext('2d')!.getImageData(0,0,raw.width,raw.height).data;
 const cuts=Array.from({length:rows+1},(_,row)=>{if(!row)return 0;if(row===rows)return raw.height;const nominal=row*h;let best=Math.round(nominal),score=Infinity;for(let y=Math.max(1,Math.floor(nominal-h*.45));y<Math.min(raw.height,nominal+h*.45);y++){let ink=0;for(let x=0;x<raw.width;x++)if(rawPixels[(y*raw.width+x)*4+3]!>128)ink++;const value=ink*raw.height+Math.abs(y-nominal);if(value<score){score=value;best=y;}}return best;});
 const cells=frames.map(f=>{const row=Math.floor(f/columns),y=cuts[row]!,height=cuts[row+1]!-y;const x=f%columns*w,left=Math.max(0,Math.floor(x-w*.2)),right=Math.min(raw.width,Math.ceil(x+w*1.2));const canvas=document.createElement('canvas');canvas.width=right-left;canvas.height=height;const cc=canvas.getContext('2d')!;cc.drawImage(raw,left,y,right-left,height,0,0,right-left,height);const pixels=cc.getImageData(0,0,canvas.width,canvas.height);keepFrameInk(pixels,x-left,w);cc.putImageData(pixels,0,0);let top=height,bottom=0;for(let p=0;p<pixels.width*pixels.height;p++)if(pixels.data[p*4+3]!>128){top=Math.min(top,Math.floor(p/pixels.width));bottom=Math.max(bottom,Math.floor(p/pixels.width)+1);}return {canvas,top,bottom,offset:left-x};});
 const maxHeight=Math.max(1,...cells.map(c=>c.bottom-c.top)),scale=Math.min(220/maxHeight,300/w);
 cells.forEach(({canvas,bottom,offset},f)=>ctx.drawImage(canvas,f%4*320+160-w*scale/2+offset*scale,Math.floor(f/4)*320+252-bottom*scale,canvas.width*scale,canvas.height*scale));return out;
}
export async function loadOfficerCommands(ids:readonly string[]):Promise<Record<string,HTMLCanvasElement>>{
 const pairs=await Promise.all([...new Set(ids)].map(async id=>{
  if((UNIFIED_OFFICERS as readonly string[]).includes(id)){const raw=await loadDuelArt(id+'-v1');return ['officer-'+id,repackOfficer(raw,8,6,Array.from({length:32},(_,f)=>f<16?32+f%8:40+f%8))] as const;}
  const group=COMMAND_GROUPS.findIndex(g=>(g as readonly string[]).includes(id));if(group<0)return null;
  const members=COMMAND_GROUPS[group]!,member=(members as readonly string[]).indexOf(id),raw=await loadDuelArt('commands-group-'+group+'-v1');
  return ['officer-'+id,repackOfficer(raw,4,members.length*2,Array.from({length:32},(_,f)=>member*8+(f<16?Math.min(3,Math.floor(f%8/2)):4+Math.floor(f%16/4))))] as const;
 }));return Object.fromEntries(pairs.filter((p):p is NonNullable<typeof p>=>p!==null));
}
