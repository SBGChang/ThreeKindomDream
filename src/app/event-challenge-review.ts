import {dialogueReview} from './dialogue-review.js';
import {Session} from './session.js';
import {defs,wiring} from './bootstrap.js';
import {optionStates} from '../modules/commission.js';
import {storyRarity} from '../modules/stories.js';
export function eventChallengeReview(mode:string):Session {
 const initial=dialogueReview('notable'),d=defs.reader('event').all().find(d=>mode==='trial'?d.options.some(o=>o.challenge?.stages):d.trigger.kind==='commission'&&d.options.some(o=>o.challenge?.mode===mode))!;
 const state={...initial.current,career:{...initial.current.career,martial:10,civil:10}};
 return Session.restore(wiring,{...state,turn:{...state.turn,pending:[{eventDefId:d.eventDefId,rarity:storyRarity(d),params:Object.fromEntries(d.paramSlots.map(slot=>[slot.name,defs.reader('paramPool').get(String(slot.poolId)).entries[0]!])),optionStates:optionStates(d,storyRarity(d),{state,defs},wiring.fx)}]}});
}

