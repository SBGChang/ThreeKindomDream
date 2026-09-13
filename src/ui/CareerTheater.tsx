import { useEffect,useRef,useState } from 'react';
import { CAREER_LABELS,THEATER_DURATION,THEATER_STEPS,type CareerPresentation } from './career-presentation.js';
const root='./art/theater/career/';
const cache=new Map<string,Promise<HTMLCanvasElement>>();
function art(file:string,key=false):Promise<HTMLCanvasElement>{
 const id=file+key,cached=cache.get(id);if(cached)return cached;
 const promise=new Promise<HTMLCanvasElement>((resolve,reject)=>{
  const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d')!;ctx.drawImage(im,0,0);
   if(key){const px=ctx.getImageData(0,0,c.width,c.height),d=px.data;for(let i=0;i<d.length;i+=4){const r=d[i]!,g=d[i+1]!,b=d[i+2]!;if(r>100&&b>100&&g<Math.min(r,b)*.65)d[i+3]=Math.round(d[i+3]!*Math.max(0,Math.min(1,(g/Math.min(r,b)-.15)/.5)));}ctx.putImageData(px,0,0);}resolve(c);
  };im.onerror=()=>{cache.delete(id);reject(new Error('無法載入 '+file));};im.src=root+file;
 });cache.set(id,promise);return promise;
}
export function preloadCareerTheater(tier:number):Promise<unknown>{return Promise.all([art('stage-'+tier+'.png'),art('frames.png',true)]);}
export function CareerHero({profile}:{profile:CareerPresentation}):React.ReactElement{
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let alive=true;void art(profile.line==='civil'&&profile.tier===2?'wardrobe-hat-fixed.png':'wardrobe.png',true).then(im=>{if(!alive||!ref.current)return;const c=ref.current,w=im.width/4,h=im.height/2;c.width=Math.round(w);c.height=Math.round(h);c.getContext('2d')!.drawImage(im,profile.tier*w,(profile.line==='civil'?1:0)*h,w,h,0,0,c.width,c.height);}).catch(()=>{});return()=>{alive=false;};},[profile.tier,profile.line]);
 return <canvas ref={ref} className="character-halfbody career-hero-art" role="img" aria-label={'主角：'+(profile.line==='civil'?'文職':'武職')+CAREER_LABELS[profile.tier]+'造型'}/>;
}
export function CareerTheater({profile,paused=false,frameOverride,onReady}:{profile:CareerPresentation;paused?:boolean;frameOverride?:number;onReady?:()=>void}):React.ReactElement{
 const ref=useRef<HTMLCanvasElement>(null),clock=useRef(0),ready=useRef(onReady),[error,setError]=useState(false);
 ready.current=onReady;
 useEffect(()=>{clock.current=0;},[profile.tier,profile.row]);
 useEffect(()=>{
  let alive=true,raf=0;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;setError(false);
  void Promise.all([art('stage-'+profile.tier+'.png'),art('frames.png',true)]).then(([scene,frame])=>{
   if(!alive||!ref.current)return;const ctx=ref.current.getContext('2d')!;let previous=performance.now(),last=-1;
   const draw=(now:number):void=>{if(!alive)return;if(!paused&&!reduce)clock.current+=Math.min(100,now-previous);previous=now;
    const step=frameOverride??Math.min(THEATER_STEPS.length-1,Math.floor(clock.current/(THEATER_DURATION/THEATER_STEPS.length))),pose=THEATER_STEPS[step]!;
    if(last!==pose){ctx.clearRect(0,0,720,540);const w=scene.width/4,h=scene.height/4;
     // Fit all of the illustration inside the aperture; frame ornaments only overlap its outer edge.
     const lower=profile.row>=2;
     ctx.drawImage(scene,pose*w,profile.row*h,w,h,lower?88:80,lower?76:64,lower?548:560,lower?358:395);
     // The supplied atlas has unequal row heights; use its actual painted boundaries.
     const fw=frame.width/2,fy=lower?584:0,fh=lower?670:580;ctx.drawImage(frame,(profile.row%2)*fw,fy,fw,fh,0,0,720,540);last=pose;
    }if(!paused&&!reduce&&frameOverride===undefined&&clock.current<THEATER_DURATION)raf=requestAnimationFrame(draw);
   };draw(performance.now());ready.current?.();
  }).catch(()=>{if(alive){setError(true);ready.current?.();}});
  return()=>{alive=false;cancelAnimationFrame(raf);};
 },[profile.tier,profile.row,paused,frameOverride]);
 return <div className="task-performance inspection-theater career-theater" role="status" aria-label={profile.action+'小劇場，'+CAREER_LABELS[profile.tier]+(profile.tier===0?'主角接受長官指示':'主角處理職務')}>{error?<p>小劇場素材載入失敗</p>:<canvas ref={ref} width={720} height={540} role="img" aria-label={profile.action+'單次動作'}/>}</div>;
}
