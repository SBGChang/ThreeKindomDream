import type {DefinitionRegistry} from '../data-runtime/registry.js';
import type {MetaState} from '../contracts/core/state.js';
import type {RunContext} from '../contracts/core/context.js';
import {meetsStory} from './story.js';
export const recruited=(id:string,meta:MetaState,defs:DefinitionRegistry):boolean=>{
 const d=defs.reader('notable').get(id);return !d.recruitment||!!d.recruitment.initial||!!meta.unlockedNotables?.includes(id)||!!meta.notableCodex[id];
};
export function earnedRecruits(ctx:RunContext):string[]{
 const s=ctx.state;return [...new Set([...(s.earnedUnlocks??[]),...ctx.defs.reader('notable').all().filter(d=>{
 const r=d.recruitment;if(!r||r.initial)return false;
 if(r.attr)return s.attributes.values[r.attr.name]>=r.attr.min;
 if(r.career)return s.career[r.career.line]>=r.career.min;
 if(r.items)return r.items.every(i=>(s.items.count[i]??0)>0||!!s.metaSnapshot.itemCodex[i]||!!s.metaSnapshot.discoveredItems?.includes(i));
 if(r.fullDream)return s.ending?.isFullDream&&s.faction===r.fullDream;
 if(r.story)return meetsStory(r.story,ctx);return false;
 }).map(d=>String(d.notableId))])];
}
export function preserveRecruitment(meta:MetaState,ctx:RunContext):MetaState{
 const earned=earnedRecruits(ctx);
 const previous=meta.recruitFarewells??{pending:[],completed:[]};
 // Existing codex/unlock records are grandfathered; never backfill every old hero.
 const fresh=earned.filter(id=>!recruited(id,meta,ctx.defs)&&!!ctx.defs.reader('notable').get(id).recruitFarewell);
 return {...meta,
  recruitFarewells:{...previous,pending:[...new Set([...previous.pending,...fresh])].filter(id=>!previous.completed.includes(id))},
  unlockedNotables:[...new Set([...(meta.unlockedNotables??[]),...earned])],discoveredItems:[...new Set([...(meta.discoveredItems??[]),...Object.keys(ctx.state.items.count).filter(id=>(ctx.state.items.count[id]??0)>0)])]};
}
