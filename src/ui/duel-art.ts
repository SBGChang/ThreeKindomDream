import {UNIFIED_OFFICERS} from '../contracts/core/officer-motion.js';
import {DUEL_ACTORS} from '../contracts/core/duel-art.js';
export {DUEL_ACTORS} from '../contracts/core/duel-art.js';
const cache=new Map<string,Promise<HTMLCanvasElement>>();
export const DUEL_ART_VERSIONS:Readonly<Record<string,number>>={lord:2,npc_soldier:2,shenpei:2,simayi:2,zhangfei:2,zhangliao:2};
export const DUEL_SOURCE_COLUMNS:Readonly<Record<string,number>>={guojia:8,huaxiong:8};
/** Key the documented magenta production source at native resolution. Keep costumes intact. */
export function loadDuelArt(file:string):Promise<HTMLCanvasElement>{
 const found=cache.get(file);if(found)return found;
 const promise=new Promise<HTMLCanvasElement>((resolve,reject)=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d')!;ctx.drawImage(im,0,0);const p=ctx.getImageData(0,0,c.width,c.height),d=p.data;for(let i=0;i<d.length;i+=4){const r=d[i]!,g=d[i+1]!,b=d[i+2]!;if(r>100&&b>100&&g<Math.min(r,b)*.65){const a=Math.max(0,Math.min(1,(g/Math.min(r,b)-.15)/.5));d[i+3]=Math.round(d[i+3]!*a);if(a>0){d[i]=Math.max(0,(r-255*(1-a))/a);d[i+1]=Math.min(255,g/a);d[i+2]=Math.max(0,(b-255*(1-a))/a);}}}ctx.putImageData(p,0,0);resolve(c);};im.onerror=()=>{cache.delete(file);reject(Error(`單挑素材載入失敗：${file}`));};im.src=`./art/duel/${file}.png`;});cache.set(file,promise);return promise;
}
export async function loadDuelImages(ids:readonly string[]):Promise<Record<string,HTMLCanvasElement>>{
 if(ids.length)await Promise.all([loadDuelArt('action-kit-v1'),loadDuelArt('status-scroll-v1'),loadDuelArt('status-icons-v1'),loadDuelArt('wheel-platter-v1'),loadDuelArt('wheel-counter-arrow-v1'),loadDuelArt('matchup-icons-v1'),...['attack','defend','rest'].map(action=>loadDuelArt(`evolution-${action}-v1`))]);
 const entries=await Promise.all([...new Set(ids)].map(async id=>{if(!DUEL_ACTORS[id])throw Error(`缺少武將動作登錄：${id}`);const raw=await loadDuelArt(id+'-v'+(DUEL_ART_VERSIONS[id]??1));return ['duel-'+id,(UNIFIED_OFFICERS as readonly string[]).includes(id)?(await import('./officer-motion.js')).repackOfficer(raw,8,6,Array.from({length:32},(_,i)=>i)):normalizeDuelAtlas(raw,DUEL_SOURCE_COLUMNS[id]??4)] as const;}));return Object.fromEntries(entries);
}
/** Repack full cells with an invariant scale and baseline; never stretch portrait cells. */
function normalizeDuelAtlas(raw:HTMLCanvasElement,columns:number):HTMLCanvasElement {
 const out=document.createElement('canvas');out.width=1280;out.height=2560;const ctx=out.getContext('2d')!,w=raw.width/columns,h=raw.height/8;
 const pixels=raw.getContext('2d')!.getImageData(0,0,raw.width,raw.height).data;
 const cutY=(nominal:number)=>{let best=Math.round(nominal),score=Infinity;for(let y=Math.max(0,Math.floor(nominal-h*.1));y<Math.min(raw.height,nominal+h*.1);y++){let ink=0;for(let x=0;x<raw.width;x++)if(pixels[(y*raw.width+x)*4+3]!>128)ink++;if(ink<score){score=ink;best=y;}if(ink===0&&Math.abs(y-nominal)<2)return y;}return best;};
 const yCuts=Array.from({length:9},(_,n)=>n===0?0:n===8?raw.height:cutY(n*h));
 const scale=Math.min(220/w,220/h);
 for(let f=0;f<32;f++){const source=columns===8?Math.floor(f/8)*16+f%8:f,row=Math.floor(source/columns),col=source%columns,x0=col*w,y0=yCuts[row]!,y1=yCuts[row+1]!;
  const cropLeft=Math.max(0,Math.floor(x0-w*.18)),cropRight=Math.min(raw.width,Math.ceil(x0+w*1.18)),cropWidth=cropRight-cropLeft;
  const cell=document.createElement('canvas');cell.width=cropWidth;cell.height=y1-y0;const cellCtx=cell.getContext('2d')!;
  cellCtx.drawImage(raw,cropLeft,y0,cropWidth,y1-y0,0,0,cropWidth,y1-y0);
  const image=cellCtx.getImageData(0,0,cell.width,cell.height);
  keepFrameInk(image,x0-cropLeft,w);cellCtx.putImageData(image,0,0);
  let foot=0;for(let p=0;p<image.width*image.height;p++)if(image.data[p*4+3]!>128)foot=Math.floor(p/image.width)+1;
  // Extra transparent margins retain the weapon outside its nominal source cell.
  ctx.drawImage(cell,0,0,cropWidth,y1-y0,(f%4)*320+160-w*scale/2+(cropLeft-x0)*scale,Math.floor(f/4)*320+252-foot*scale,cropWidth*scale,(y1-y0)*scale);
 }
 return out;
}
/** Retain the central actor, including connected overshooting weapons, plus detached ink inside its cell. */
export function keepFrameInk(image:ImageData,left:number,width:number):void {
 const {width:w,height:h,data}=image,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n);
 const components:{id:number;count:number;core:number;sumX:number}[]=[];let id=0;
 for(let start=0;start<n;start++){
  if(labels[start]||data[start*4+3]!<24)continue;
  id++;let head=0,tail=1,core=0,sumX=0;queue[0]=start;labels[start]=id;
  while(head<tail){const p=queue[head++]!,x=p%w,y=Math.floor(p/w);sumX+=x;if(x>left+width*.2&&x<left+width*.8)core++;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const q=ny*w+nx;if(!labels[q]&&data[q*4+3]!>=24){labels[q]=id;queue[tail++]=q;}}
  }
  components.push({id,count:tail,core,sumX});
 }
 const main=components.reduce((best,c)=>c.core>best.core?c:best,{id:0,core:-1});
 const keep=new Set(components.filter(c=>c.id===main.id||c.count>=8&&c.sumX/c.count>=left&&c.sumX/c.count<left+width).map(c=>c.id));
 for(let p=0;p<n;p++)if(!keep.has(labels[p]!)){
  // Retain the antialiased fringe adjoining kept ink as well.
  const x=p%w,y=Math.floor(p/w);let fringe=false;
  for(let dy=-1;dy<=1&&!fringe;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<w&&ny>=0&&ny<h&&keep.has(labels[ny*w+nx]!)){fringe=true;break;}}
  if(!fringe)data[p*4+3]=0;
 }
}
export type DuelPose='attack'|'defend'|'rest'|'hurt'|'idle';
export function duelFrame(pose:DuelPose,progress:number):number {return pose==='idle'?23:({attack:0,defend:8,rest:16,hurt:24}[pose]+Math.min(7,Math.max(0,Math.floor(progress*8))));}
