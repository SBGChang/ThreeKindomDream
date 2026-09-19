import type { MetaState, RunState } from '../contracts/core/state.js';
import type { RecruitFarewellLine } from '../contracts/core/recruit-farewell.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import { meetsStory } from '../modules/story.js';

export const lifeSettled = (run:RunState,meta:MetaState):boolean => !!run.ending && (run.runId
  ? !!meta.settledRunIds?.includes(run.runId) : meta.settledSeeds.includes(run.seed));

export interface RecruitFarewell {
  readonly notableId:string;
  readonly name:string;
  readonly title:string;
  readonly lines:readonly RecruitFarewellLine[];
  readonly page:number;
}

/** A chapter, training result or even an unconfirmed ending cannot start a farewell. */
export function nextRecruitFarewell(run:RunState,meta:MetaState,defs:DefinitionRegistry):RecruitFarewell|null {
  if(!lifeSettled(run,meta))return null;
  const progress=meta.recruitFarewells;
  const id=progress?.pending.find(id=>!progress.completed.includes(id)&&!!defs.reader('notable').get(id).recruitFarewell);
  if(!id)return null;
  const d=defs.reader('notable').get(id),script=d.recruitFarewell!;
  const lines=script.variants?.find(v=>meetsStory(v.requirements,{state:run,defs}))?.lines??script.lines;
  // lines.length is the final, separate system unlock card.
  const page=progress?.cursor?.notableId===id?Math.max(0,Math.min(lines.length,Math.floor(progress.cursor.page)||0)):0;
  return {notableId:id,name:defs.text(String(d.nameKey)),title:script.title,lines,page};
}

/** Expected page guards stale/double input. Acknowledging the card consumes one hero. */
export function advanceRecruitFarewell(run:RunState,meta:MetaState,defs:DefinitionRegistry,id:string,page:number):MetaState {
  const scene=nextRecruitFarewell(run,meta,defs);
  if(!scene||scene.notableId!==id||scene.page!==page)return meta;
  const progress=meta.recruitFarewells!;
  if(page<scene.lines.length)return {...meta,recruitFarewells:{...progress,cursor:{notableId:id,page:page+1}}};
  return {...meta,recruitFarewells:{pending:progress.pending.filter(value=>value!==id),completed:[...new Set([...progress.completed,id])]}};
}
