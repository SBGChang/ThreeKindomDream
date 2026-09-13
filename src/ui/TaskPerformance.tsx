import { CareerTheater } from './CareerTheater.js';
import type { CareerPresentation } from './career-presentation.js';
/** All four actions now use the rank-specific miniature theater. */
export function TaskPerformance({profile,onReady}:{profile:CareerPresentation;onReady:()=>void}):React.ReactElement { return <CareerTheater profile={profile} onReady={onReady}/>; }
