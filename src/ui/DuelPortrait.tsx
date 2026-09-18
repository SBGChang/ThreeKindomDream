import { type PortraitContext } from './portrait-layouts.js';
import {CharacterArt} from './CharacterArt.js';
import {DUEL_ACTORS} from '../contracts/core/duel-art.js';

/** Dialogue, codex and confrontations share one measured identity. */
export function DuelPortrait({id,name,context='duel'}:{id:string;name:string;context?:PortraitContext}):React.ReactElement {
 return <CharacterArt name={DUEL_ACTORS[id]??name} portrait context={context}/>;
}
