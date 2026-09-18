import { groundIcon } from './ground-icon.js';
import { useEffect,useRef } from 'react';
const images=new Map<string,Promise<HTMLCanvasElement>>();
const names=['career','aptitude','talent','bond','glow','currency','book','chest'];
const relics=['竹簡','鐵槍','良弓','印綬','青釭劍','孟德新書','短戟','奉孝遺書','王佐印綬','逍遙津令','五子印'];
export function RealmIcon({name,relic=false,className='',grounded=false}:{name:string;relic?:boolean;className?:string;grounded?:boolean}):React.ReactElement{
 const ref=useRef<HTMLCanvasElement>(null),index=relic?Math.max(0,relics.indexOf(name)):Math.max(0,names.indexOf(name)),src='./art/ui/realms/'+(relic?'relics-keyed':'icons')+'.png';
 useEffect(()=>{let alive=true;let pending=images.get(src);if(!pending){pending=new Promise<HTMLCanvasElement>((resolve,reject)=>{const img=new Image();img.onload=()=>{const sheet=document.createElement('canvas');sheet.width=img.width;sheet.height=img.height;const ctx=sheet.getContext('2d')!;ctx.drawImage(img,0,0);if(src.includes('keyed')){const px=ctx.getImageData(0,0,sheet.width,sheet.height),d=px.data;for(let i=0;i<d.length;i+=4){const r=d[i]!,g=d[i+1]!,b=d[i+2]!;if(r>160&&b>160&&g<Math.min(r,b)*.55)d[i+3]=0;}ctx.putImageData(px,0,0);}resolve(sheet);};img.onerror=()=>{images.delete(src);reject();};img.src=src;});images.set(src,pending);}void pending.then(im=>{if(!alive||!ref.current)return;const c=ref.current,w=im.width/4,h=im.height/(relic?3:2),ctx=c.getContext('2d')!;ctx.clearRect(0,0,160,160);ctx.drawImage(im,(index%4)*w+3,Math.floor(index/4)*h+3,w-6,h-6,0,0,160,160);if(grounded)groundIcon(c);}).catch(()=>{});return()=>{alive=false;};},[src,index,relic,grounded]);
 return <canvas ref={ref} width={160} height={160} className={'realm-icon '+className} aria-hidden="true"/>;
}
export function RealmStars({count,total=count}:{count:number;total?:number}):React.ReactElement{return <div className="realm-stars painted-stars" role="img" aria-label={count+' 星，共 '+total+' 星'}>{Array.from({length:total},(_,i)=><RealmIcon key={i} name="talent" className={i<count?'':'unlit'}/>)}</div>;}
