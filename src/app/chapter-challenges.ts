import type {RunContext} from '../contracts/core/context.js';
import type {RunState} from '../contracts/core/state.js';
import {chapterStory,meetsStory} from '../modules/story.js';
import {createEventChallenge} from './event-challenge.js';
import {itemId} from '../contracts/core/ids.js';
import {acquire} from '../modules/item.js';
import {grantUnlock} from '../modules/growth.js';
import {transact} from '../modules/economy.js';

export function nextChapterChallenge(ctx:RunContext):RunState {
 if(ctx.state.eventChallenge)return ctx.state;
 const row=chapterStory(ctx)?.afterChallenges?.find(r=>!ctx.state.story.milestones.includes('resolved:'+r.id)&&meetsStory(r.requirements,ctx));
 return row?{...ctx.state,eventChallenge:{...createEventChallenge(row.id,0,row.challenge,ctx),source:'chapter',canDecline:!!row.optionalWhen&&meetsStory(row.optionalWhen,ctx)}}:ctx.state;
}
export function settleChapterChallenge(ctx:RunContext):RunState {
 const s=ctx.state.eventChallenge;
 if(s?.source!=='chapter'||s.phase!=='result'||!s.outcome)throw Error('章末挑戰尚未完成');
 const row=chapterStory(ctx)?.afterChallenges?.find(r=>r.id===s.eventId);
 if(!row||!meetsStory(row.requirements,ctx))throw Error('章末挑戰來源失效');
 let state=ctx.state;const done='resolved:'+row.id;
 if(!state.story.milestones.includes(done)){
  if(s.outcome==='win'){
   const r=row.reward,values={...state.attributes.values};
   for(const a of ['lead','war','int','pol'] as const)values[a]=Math.min(ctx.defs.single('attributeCap').attrMax,values[a]+r.allStats);
   state={...state,attributes:{...state.attributes,values},earnedUnlocks:[...new Set([...(state.earnedUnlocks??[]),...r.unlocks])]};
   for(const id of r.items)state=acquire(itemId(id),{...ctx,state}).state;
   if(r.gold)state=transact(row.id,r.gold,'虎牢後的贈禮',{...ctx,state});
   if(r.trait)state=grantUnlock(r.trait,null,{...ctx,state},row.id);
  }
  state={...state,story:{...state.story,milestones:[...state.story.milestones,done,...(s.outcome==='win'?['won:'+row.id]:[])]}};
 }
 return nextChapterChallenge({...ctx,state:{...state,eventChallenge:null}});
}
