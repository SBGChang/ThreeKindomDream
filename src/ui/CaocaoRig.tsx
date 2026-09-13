import { useEffect, useRef, useState } from 'react';

type Box = readonly [number, number, number, number];
const regions: readonly Box[] = [[0,0,547,520],[554,70,431,443],[1050,100,448,305],[54,548,300,415],[523,532,482,430],[1007,539,520,429]];
let cached: Promise<HTMLCanvasElement[]> | undefined;
/** Draw-time chroma-key and atlas extraction. The authored source remains intact. */
function loadParts(): Promise<HTMLCanvasElement[]> {
  return cached ??= new Promise((resolve,reject)=>{
    const image = new Image();
    image.onload=()=>resolve(regions.map(([x,y,w,h])=>{
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d')!;ctx.drawImage(image,x,y,w,h,0,0,w,h);
      const pixels=ctx.getImageData(0,0,w,h),d=pixels.data;
      let l=w,t=h,r=0,b=0;
      for(let py=0;py<h;py++)for(let px=0;px<w;px++){
        const i=(py*w+px)*4,red=d[i]!,green=d[i+1]!,blue=d[i+2]!;
        if(red>100&&blue>100&&green<Math.min(red,blue)*.65)d[i+3]=0;
        else {l=Math.min(l,px);t=Math.min(t,py);r=Math.max(r,px);b=Math.max(b,py);}
      }
      ctx.putImageData(pixels,0,0);
      const crop=document.createElement('canvas');crop.width=r-l+1;crop.height=b-t+1;
      crop.getContext('2d')!.drawImage(c,l,t,crop.width,crop.height,0,0,crop.width,crop.height);return crop;
    }));
    image.onerror=()=>{cached=undefined;reject(new Error('曹操拆件圖載入失敗'));};
    image.src='./art/rigs/caocao/parts-v1.png';
  });
}

export function CaocaoRig({motion='idle',paused=false,exploded=false}:{motion?:'idle'|'command';paused?:boolean;exploded?:boolean}):React.ReactElement{
  const ref=useRef<HTMLCanvasElement>(null),elapsed=useRef(0),[error,setError]=useState(false);
  useEffect(()=>{
    let live=true,raf=0;const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    void loadParts().then(parts=>{
      if(!live||!ref.current)return;
      const ctx=ref.current.getContext('2d')!;let previous=performance.now();
      const draw=(now:number):void=>{
        if(!live)return;
        if(!paused&&!reduce.matches&&!exploded)elapsed.current+=(now-previous)/1000;
        previous=now;const time=elapsed.current;
        const breathe=Math.sin(time*2),gesture=motion==='command'?Math.sin(time*3)*.11:Math.sin(time*1.5)*.018;
        ctx.clearRect(0,0,500,700);
        const part=(i:number,x:number,y:number,w:number,h:number,rotation=0,px=.5,py=.5,mirror=false):void=>{
          ctx.save();ctx.translate(x+w*px,y+h*py);ctx.rotate(rotation);if(mirror)ctx.scale(-1,1);ctx.drawImage(parts[i]!, mirror?-w*(1-px):-w*px,-h*py,w,h);ctx.restore();
        };
        if(exploded){
          const positions:readonly Box[]=[[5,5,240,225],[265,18,210,205],[15,270,210,138],[300,245,130,220],[15,470,230,205],[260,485,230,190]];
          positions.forEach(([x,y,w,h],i)=>part(i,x,y,w,h));return;
        }
        part(5,98,270,345,300,Math.sin(time*1.6)*.025,.5,0);
        part(4,142,419,246,216);
        ctx.save();ctx.translate(0,breathe*2);
        part(1,163,281,214,215,0);
        part(3,333,296,112,205,Math.sin(time*2)*.014,.25,.12,true);
        part(0,113,48,320,302,Math.sin(time*1.3)*.025,.43,.89);
        part(2,30,280,218,139,gesture,.89,.46);
        ctx.restore();
        if(!paused&&!reduce.matches)raf=requestAnimationFrame(draw);
      };
      draw(performance.now());
    }).catch(()=>{if(live)setError(true);});
    return()=>{live=false;cancelAnimationFrame(raf);};
  },[motion,paused,exploded]);
  return error?<img className="caocao-rig" src="./art/characters-v2/caocao.png" alt="曹操靜態立繪"/>:<canvas ref={ref} width={500} height={700} className="caocao-rig" role="img" aria-label={exploded?'曹操六個拆件':motion==='command'?'曹操指揮動作':'曹操呼吸待機'}/>;
}

export function RigReview():React.ReactElement{
 const [motion,setMotion]=useState<'idle'|'command'>('idle'),[paused,setPaused]=useState(false),[exploded,setExploded]=useState(false);
 return <main className="rig-review"><header><h1>曹操 · 拆件動作試作</h1><p>六部件獨立關節：頭、軀幹、指揮手、另一手、雙腿、披風。</p><p>此版本驗證切圖與骨架動作，尚非 Spine／Live2D 專案或網格變形。</p></header><div className="rig-controls"><button aria-pressed={motion==='idle'} onClick={()=>setMotion('idle')}>呼吸待機</button><button aria-pressed={motion==='command'} onClick={()=>setMotion('command')}>指揮手勢</button><button aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'播放':'暫停'}</button><button aria-pressed={exploded} onClick={()=>setExploded(!exploded)}>{exploded?'組合人物':'查看拆件'}</button><a href="./">返回遊戲</a></div><CaocaoRig motion={motion} paused={paused} exploded={exploded}/></main>;
}
