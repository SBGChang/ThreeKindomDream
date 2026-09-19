import {ArtControl} from './ArtControl.js';

/** Both rulebooks use the game's back arrow, with one shared size and treatment. */
export function GuideBackButton({label,onClick}:{label:string;onClick:()=>void}){
 return <ArtControl kind="back" className="rg-close" label={label} onClick={onClick}/>;
}
