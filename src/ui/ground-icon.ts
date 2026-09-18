/** Fit visible pixels to the icon box, resting its silhouette on the bottom edge. */
export function groundIcon(canvas: HTMLCanvasElement): void {
 const ctx=canvas.getContext('2d')!,{width:w,height:h}=canvas;
 const data=ctx.getImageData(0,0,w,h).data;
 let left=w,right=-1,top=h,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]!>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left)return;
 const copy=document.createElement('canvas');copy.width=w;copy.height=h;copy.getContext('2d')!.drawImage(canvas,0,0);
 const sw=right-left+1,sh=bottom-top+1,scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
 ctx.clearRect(0,0,w,h);ctx.drawImage(copy,left,top,sw,sh,(w-dw)/2,h-dh,dw,dh);
}
