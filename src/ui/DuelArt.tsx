import {useEffect,useRef} from 'react';
import {loadDuelArt} from './duel-art.js';
import type {DuelAction} from '../app/duel-model.js';
export function DuelArt({file='action-kit-v1',cell,className=''}:{file?:string;cell?:number;className?:string}):React.ReactElement {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let alive=true;void loadDuelArt(file).then(im=>{if(!alive||!ref.current)return;const c=ref.current,ctx=c.getContext('2d')!;if(cell!==undefined){c.width=256;c.height=256;if(file==='matchup-icons-v1'){
 // The authored inter-row gutter is at y=600, not the nominal square midpoint.
 const split=im.height*600/1254,sy=cell<2?0:split,sh=cell<2?split:im.height-split,sw=im.width/2,scale=Math.min(256/sw,256/sh);
 ctx.drawImage(im,(cell%2)*sw,sy,sw,sh,(256-sw*scale)/2,(256-sh*scale)/2,sw*scale,sh*scale);
 }else ctx.drawImage(im,(cell%2)*im.width/2,Math.floor(cell/2)*im.height/2,im.width/2,im.height/2,0,0,256,256);}else{c.width=im.width;c.height=im.height;ctx.drawImage(im,0,0);}});return()=>{alive=false;};},[file,cell]);
 return <canvas ref={ref} className={className} aria-hidden="true"/>;
}
export const actionCell=(action:DuelAction)=>({attack:0,defend:1,rest:2}[action]);
