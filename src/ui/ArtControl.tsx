import { useId,type ButtonHTMLAttributes,type Ref } from 'react';
import { RealmIcon } from './RealmArt.js';
export function ArtControl({kind,label,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{kind:'close'|'back'|'book';label:string;ref?:Ref<HTMLButtonElement>}):React.ReactElement{
 const id=useId();return <button {...props} data-game-back={kind !== 'book' || undefined} className={'art-control '+className} aria-label={label} title={label}>{kind==='book'?<RealmIcon name="book"/>:<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id={id} x2="0" y2="1"><stop stopColor="#fff4b2"/><stop offset=".48" stopColor="#eac46d"/><stop offset="1" stopColor="#ac702c"/></linearGradient></defs><path d={kind==='close'?'M13 8 24 19 35 8 40 13 29 24 40 35 35 40 24 29 13 40 8 35 19 24 8 13Z':'M5 24 24 7 24 17 41 17 41 31 24 31 24 41Z'} fill={'url(#'+id+')'} stroke="#593017" strokeWidth="2" strokeLinejoin="round"/></svg>}</button>;
}
