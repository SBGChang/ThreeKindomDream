import type {DebateCard} from '../contracts/core/card-debate.js';
import {DUEL_ACTORS} from '../contracts/core/duel-art.js';
import {repackOfficer} from './officer-motion.js';

export const DEBATE_MOTION_ROWS:Record<DebateCard,number>={claim:0,proof:1,question:2,rebut:3,borrow:4,focus:5,pressure:6};
/** Prepare, gesture, emphasis (particle contact at .65s), then recover. Never loop a command. */
export function debateFrame(card:DebateCard|null,time:number):number {
 const t=Math.max(0,Number.isFinite(time)?time:0);
 return card===null?28+Math.floor(t/.6)%4:DEBATE_MOTION_ROWS[card]*4+(t<.2?0:t<.55?1:t<1.2?2:3);
}

export const DEBATE_SOURCES:Readonly<Record<string,string>>=Object.fromEntries(Object.keys(DUEL_ACTORS).map(id=>[id,`art/debate/${id==='npc_soldier'?'enemy':id}-commands-v${id==='guojia'||id==='npc_soldier'?1:2}.png`]));
const cache=new Map<string,Promise<HTMLCanvasElement>>();
function loadDebateActor(id:string):Promise<HTMLCanvasElement>{
 const source=DEBATE_SOURCES[id];if(!source)return Promise.reject(Error(`缺少舌戰角色：${id}`));
 const found=cache.get(id);if(found)return found;
 const promise=new Promise<HTMLCanvasElement>((resolve,reject)=>{
  const im=new Image();im.onerror=()=>reject(Error(`舌戰動作載入失敗：${id}`));im.onload=()=>{try{
   const raw=document.createElement('canvas');raw.width=im.width;raw.height=im.height;
   const ctx=raw.getContext('2d')!;ctx.drawImage(im,0,0);
   const pixels=ctx.getImageData(0,0,im.width,im.height),d=pixels.data;
   for(let i=0;i<d.length;i+=4){const r=d[i]!,g=d[i+1]!,b=d[i+2]!;if(r>100&&b>100&&g<Math.min(r,b)*.65){const a=Math.max(0,Math.min(1,(g/Math.min(r,b)-.15)/.5));d[i+3]=Math.round(d[i+3]!*a);if(a>0){d[i]=Math.max(0,(r-255*(1-a))/a);d[i+1]=Math.min(255,g/a);d[i+2]=Math.max(0,(b-255*(1-a))/a);}}}
   ctx.putImageData(pixels,0,0);
   resolve(repackOfficer(raw,4,8,Array.from({length:32},(_,i)=>id==='nanhua'&&i>=28?0:i),284,260));
  }catch(error){reject(error);}};im.src='./'+source;
 });cache.set(id,promise);promise.catch(()=>cache.delete(id));return promise;
}
/** Load only the selected people; named opponents never borrow the generic enemy. */
export async function loadDebateImages(ids:readonly string[]=['guojia','npc_soldier']):Promise<Record<string,HTMLCanvasElement>> {
 const images=Object.fromEntries(await Promise.all([...new Set(ids)].map(async id=>['debate-'+id,await loadDebateActor(id)] as const)));
 if(images['debate-npc_soldier'])images['debate-enemy']=images['debate-npc_soldier'];
 return images;
}
