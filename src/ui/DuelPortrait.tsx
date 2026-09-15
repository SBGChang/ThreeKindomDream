import {useEffect,useRef} from 'react';
import {CharacterArt,CHARACTERS} from './CharacterArt.js';
import {loadDuelArt} from './duel-art.js';

/** Most officers share the framed story portraits; Xiahou Yuan has duel art only. */
export function DuelPortrait({id,name}:{id:string;name:string}):React.ReactElement {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(id!=='xiahouyuan')return;let active=true;void loadDuelArt('xiahouyuan-v1').then(im=>{if(!active||!ref.current)return;const c=ref.current;c.width=256;c.height=256;c.getContext('2d')!.drawImage(im,im.width*.067,im.height*.009,im.width*.105,im.height*.07,0,0,256,256);});return()=>{active=false;};},[id]);
 return id==='xiahouyuan'?<canvas ref={ref} className="character-face" role="img" aria-label={name}/>:<CharacterArt name={Object.keys(CHARACTERS).find(key=>CHARACTERS[key]===id)??name} portrait/>;
}
