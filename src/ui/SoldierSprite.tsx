import type { CSSProperties } from 'react';
export function SoldierSprite({leader=false,clip='idle',side='host'}:{leader?:boolean;clip?:string;side?:'host'|'enemy'}):React.ReactElement {
  const url=(name:string):string=>`url('./models/wei-infantry/${side==='enemy'?'enemy-':''}${name}.png')`;
  return <foreignObject className={leader?'soldier leader':'soldier'} x="-18" y="-30" width="88" height="96"><div className={`infantry-sprite faction-${side} clip-${clip}`} style={{backgroundImage:url(clip),'--run-sprite':url('run'),'--cheer-sprite':url('cheer')} as CSSProperties}/></foreignObject>;
}
