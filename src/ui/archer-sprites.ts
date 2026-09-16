import type {Troop} from './realtime-battle-model.js';
import {loadCharacterSprite} from './CharacterArt.js';
/** Chroma-keyed authored frames, normalized to the existing volley atlas baseline. */
export async function loadArcherMotion():Promise<HTMLCanvasElement>{
 const source=await loadCharacterSprite('./art/units/sequences-v2/archer-team-motion-v1.png');
 const cell=source.width/4,out=document.createElement('canvas');out.width=1024;out.height=1536;
 const ctx=out.getContext('2d')!,data=source.getContext('2d')!.getImageData(0,0,source.width,source.height).data;
 for(let f=0;f<24;f++){
  const ox=f%4*cell,oy=Math.floor(f/4)*cell;let l=cell,r=0,t=cell,b=0;
  const visited=new Uint8Array(cell*cell);let largest:number[]=[];
  for(let start=0;start<visited.length;start++){
   if(visited[start])continue;const queue=[start],group:number[]=[];visited[start]=1;
   for(let n=0;n<queue.length;n++){
    const at=queue[n]!,x=at%cell,y=Math.floor(at/cell);
    if(data[((oy+y)*source.width+ox+x)*4+3]!<200)continue;
    group.push(at);
    for(const next of [x>0?at-1:-1,x<cell-1?at+1:-1,y>0?at-cell:-1,y<cell-1?at+cell:-1])if(next>=0&&!visited[next]){visited[next]=1;queue.push(next);}
   }
   if(group.length>largest.length)largest=group;
  }
  for(const at of largest){const x=at%cell,y=Math.floor(at/cell);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}

  if(r<=l||b<=t)continue;
  const h=148,w=(r-l+1)*h/(b-t+1);
  ctx.drawImage(source,ox+l,oy+t,r-l+1,b-t+1,f%4*256+(256-w)/2,Math.floor(f/4)*256+205-h,w,h);
 }
 return out;
}
export function archerFrame(u:Troop,retreat=false):{name:string;frame:number;flip:boolean}{
 const enemy=u.side==='enemy',moving=u.pose==='run';
 return {name:moving||enemy?'archer-motion':'archer',frame:moving?(enemy?8:0)+Math.floor((u.poseTime+u.seed)*12)%8:(enemy?16:0)+(u.pose==='slash'?Math.min(7,Math.floor(u.poseTime/.8*8)):0),flip:retreat?!enemy:moving?(u.facingLeft??enemy):enemy};
}
