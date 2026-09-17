import { drawPortrait } from './portrait-framing.js';
import { type PortraitContext } from './portrait-layouts.js';
import {useEffect,useRef} from 'react';
import {CharacterArt,CHARACTERS} from './CharacterArt.js';
import {loadDuelArt} from './duel-art.js';

/** Most officers share the framed story portraits; Xiahou Yuan has duel art only. */
export function DuelPortrait({id,name,context='duel'}:{id:string;name:string;context?:PortraitContext}):React.ReactElement {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(id!=='xiahouyuan')return;let active=true;void loadDuelArt('xiahouyuan-v1').then(im=>{if(!active||!ref.current)return;drawPortrait(ref.current.getContext('2d')!,im,id,context);});return()=>{active=false;};},[id,context]);
 return id==='xiahouyuan'?<canvas ref={ref} className="character-face" role="img" aria-label={name}/>:<CharacterArt name={Object.keys(CHARACTERS).find(key=>CHARACTERS[key]===id)??name} portrait context={context}/>;
}
