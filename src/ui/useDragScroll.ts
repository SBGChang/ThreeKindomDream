import { useEffect } from 'react';
/** Mouse drag only starts after a threshold so ordinary card clicks still work. */
export function useDragScroll():void{useEffect(()=>{
 let active:{el:HTMLElement;x:number;y:number;left:number;top:number;scale:number;dragged:boolean;id:number}|undefined,suppressUntil=0;
 const down=(e:PointerEvent):void=>{if(e.button!==0||e.pointerType==='touch'||!(e.target instanceof HTMLElement)||e.target.closest('input,select,textarea,[contenteditable=true]'))return;
  let el:HTMLElement|null=e.target;while(el&&el.closest('.game-stage')){const cs=getComputedStyle(el);if((/auto|scroll/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+2)||(/auto|scroll/.test(cs.overflowX)&&el.scrollWidth>el.clientWidth+2)){active={el,x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop,scale:el.getBoundingClientRect().width/el.offsetWidth||1,dragged:false,id:e.pointerId};break;}el=el.parentElement;}
 };
 const move=(e:PointerEvent):void=>{if(!active||e.pointerId!==active.id)return;const dx=e.clientX-active.x,dy=e.clientY-active.y;if(!active.dragged&&Math.hypot(dx,dy)<7)return;active.dragged=true;active.el.classList.add('is-drag-scrolling');e.preventDefault();active.el.scrollLeft=active.left-dx/active.scale;active.el.scrollTop=active.top-dy/active.scale;};
 const up=():void=>{if(active?.dragged){suppressUntil=performance.now()+250;active.el.classList.remove('is-drag-scrolling');}active=undefined;};
 const click=(e:MouseEvent):void=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopPropagation();suppressUntil=0;}};
 document.addEventListener('pointerdown',down);document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);document.addEventListener('click',click,true);
 return()=>{up();document.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);document.removeEventListener('click',click,true);};
 },[]);}
