import type {DebateCard} from '../contracts/core/card-debate.js';

export const DEBATE_MOTION_ROWS:Record<DebateCard,number>={claim:0,proof:1,question:2,rebut:3,borrow:4,focus:5,pressure:6};
/** Prepare, gesture, emphasis (particle contact at .65s), then recover. Never loop a command. */
export function debateFrame(card:DebateCard|null,time:number):number {
 const t=Math.max(0,Number.isFinite(time)?time:0);
 return card===null?28+Math.floor(t/.6)%4:DEBATE_MOTION_ROWS[card]*4+(t<.2?0:t<.55?1:t<1.2?2:3);
}

/** Preserve a single scale across all poses, aligning every frame's feet. */
export async function loadDebateImages():Promise<Record<string,HTMLCanvasElement>> {
 const entries=await Promise.all(['guojia','enemy'].map(id=>new Promise<readonly [string,HTMLCanvasElement]>((resolve,reject)=>{
  const im=new Image();im.onerror=()=>reject(Error(`舌戰動作載入失敗：${id}`));im.onload=()=>{
   const raw=document.createElement('canvas');raw.width=im.width;raw.height=im.height;
   const rc=raw.getContext('2d')!;rc.drawImage(im,0,0);
   const pixels=rc.getImageData(0,0,im.width,im.height).data;
   const out=document.createElement('canvas');out.width=1280;out.height=2560;
   const ctx=out.getContext('2d')!,scale=260/(im.height/8);
   for(let f=0;f<32;f++){
    const col=f%4,row=Math.floor(f/4),x0=Math.round(col*im.width/4),x1=Math.round((col+1)*im.width/4),y0=Math.round(row*im.height/8),y1=Math.round((row+1)*im.height/8);
    let foot=y0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*im.width+x)*4+3]!>128)foot=y+1;
    const w=x1-x0,h=y1-y0;
    ctx.drawImage(im,x0,y0,w,h,col*320+160-w*scale/2,row*320+284-(foot-y0)*scale,w*scale,h*scale);
   }
   resolve(['debate-'+id,out]);
  };im.src=`./art/debate/${id}-commands-v1.png`;
 })));
 return Object.fromEntries(entries);
}
