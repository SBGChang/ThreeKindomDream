import type { Attr } from '../contracts/core/primitives.js';
import type { CareerState } from '../contracts/core/state.js';
export type CareerTier = 0 | 1 | 2 | 3;
export interface CareerPresentation { readonly attr:Attr; readonly line:'civil'|'martial'; readonly rank:number; readonly tier:CareerTier; readonly row:number; readonly label:string; readonly action:string }
export const CAREER_LABELS = ['白身','初階','中階','高階'] as const;
export const THEATER_DURATION = 1000;
export const THEATER_STEPS = [0,0,1,1,1,1,2,2,2,2] as const;
const rows:Record<Attr,number>={lead:0,war:1,int:2,pol:3};
const labels:Record<Attr,string>={lead:'軍務',war:'演武',int:'文務',pol:'農務'};
const actions:Record<Attr,readonly string[]>={lead:['運糧','點糧','整編','督軍'],war:['受訓','帶練','校閱','閱兵'],int:['抄錄','記帳','市易','鹽鐵'],pol:['耕作','度田','修渠','屯田']};
export function careerTier(rank:number):CareerTier { return rank<=1?0:rank<=3?1:rank<=7?2:3; }
/** One immutable snapshot drives hover, costume, action name and playback, before rewards/promotions. */
export function careerPresentation(attr:Attr,career:CareerState):CareerPresentation {
 const line=attr==='lead'||attr==='war'?'martial':'civil',rank=career[line],tier=careerTier(rank);
 return {attr,line,rank,tier,row:rows[attr],label:labels[attr],action:actions[attr][tier]!};
}
