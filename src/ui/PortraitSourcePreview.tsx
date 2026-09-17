import { useEffect, useRef, useState } from 'react';
import { loadCharacterSprite } from './CharacterArt.js';
import { characterFraming, portraitCrop, portraitFaceGuide, type SourceRect } from './portrait-framing.js';
import type { PortraitContext } from './portrait-layouts.js';

/** Review-only guides are drawn on a separate canvas, never on source assets. */
export function PortraitSourcePreview({id, name, context}: {id: string; name: string; context: PortraitContext}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const source = characterFraming(id).source;
  useEffect(() => {
    let active = true;
    void loadCharacterSprite(`./${source}`).then(image => {
      if (!active || !ref.current) return;
      const canvas = ref.current, ctx = canvas.getContext('2d')!;
      canvas.width = image.width; canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      const { face } = characterFraming(id);
      const crop = portraitCrop(image.width, image.height, id, context);
      ctx.lineWidth = image.width / 100;
      ctx.strokeStyle = '#ffe171';
      ctx.strokeRect(face.x*image.width,face.y*image.height,face.width*image.width,face.height*image.height);
      const x=(face.x+face.width/2)*image.width,y=(face.y+face.height/2)*image.height,arm=image.width*.02;
      ctx.strokeStyle = '#ff7777';
      ctx.beginPath();ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);ctx.moveTo(x,y-arm);ctx.lineTo(x,y+arm);ctx.stroke();
      ctx.lineWidth = image.width / 180;
      ctx.strokeStyle = '#68e6ed';
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    }).catch(() => { if (active && ref.current) ref.current.width = 0; });
    return () => { active = false; };
  }, [id, source, context]);
  return <canvas ref={ref} className="portrait-source-preview" role="img" aria-label={`${name}原圖：黃框為純臉部，紅十字為臉部中心，青框為取景範圍`}/>;
}

/** Overlay the measured facial plane, rather than a generic centered square. */
export function PortraitFaceGuide({id, context}: {id: string; context: PortraitContext}) {
  const [guide,setGuide]=useState<SourceRect|null>(null);
  const source=characterFraming(id).source;
  useEffect(()=>{
    let active=true;
    void loadCharacterSprite(`./${source}`).then(im=>{
      if(active)setGuide(portraitFaceGuide(im.width,im.height,id,context));
    }).catch(()=>{if(active)setGuide(null);});
    return()=>{active=false;};
  },[id,source,context]);
  return guide?<svg className="portrait-face-guide" viewBox="0 0 100 100" aria-hidden="true">
    <rect x={guide.x*100} y={guide.y*100} width={guide.width*100} height={guide.height*100} fill="none" stroke="#ffe171" strokeWidth="1"/>
    <circle cx="50" cy="50" r="1.5" fill="#ff7777"/>
  </svg>:null;
}
