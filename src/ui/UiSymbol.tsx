import { useEffect, useRef } from 'react';
type SymbolName='red'|'gold'|'green'|'event'|'commission'|'arrow';
const indices:Record<SymbolName,number>={red:0,gold:1,green:2,event:3,commission:4,arrow:5};
let source:Promise<HTMLCanvasElement>|undefined;
function atlas():Promise<HTMLCanvasElement>{
 return source??=new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>{
   const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
   const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
   const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data;
   for(let i=0;i<d.length;i+=4)if(d[i]!>100&&d[i+2]!>100&&d[i+1]!<Math.min(d[i]!,d[i+2]!)*.65)d[i+3]=0;
   ctx.putImageData(pixels,0,0);resolve(c);
  };img.onerror=()=>{source=undefined;reject(new Error('UI 圖示載入失敗'));};img.src='./art/ui/demo-match/signals.png';
 });
}
export function UiSymbol({name,className=''}:{name:SymbolName;className?:string}):React.ReactElement{
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let alive=true;void atlas().then(img=>{if(!alive||!ref.current)return;const ctx=ref.current.getContext('2d')!,w=img.width/3,h=img.height/2,i=indices[name];ctx.clearRect(0,0,128,128);ctx.drawImage(img,(i%3)*w,Math.floor(i/3)*h,w,h,0,0,128,128);}).catch(()=>{});return()=>{alive=false;};},[name]);
 return <canvas ref={ref} width={128} height={128} className={'ui-symbol '+className} aria-hidden="true"/>;
}
