import { describe, eq, it, ok } from '../lib/tinytest.js';
import { Session } from '../../src/app/session.js';
import { driveRun } from '../../src/app/run-driver.js';
import { expectedDistinctCasts } from '../../src/modules/campaign.js';
import { emptyMeta } from '../../src/modules/dream-entry.js';
import { factionId } from '../../src/contracts/core/ids.js';
import { defs, newSession, newStorySession, wiring } from './harness.js';
import { POLICIES } from '../lib/policies.js';

export function run():void {
  describe('完整歷程稽核回歸',()=>{
    it('技能不重複施放的預估遵守實際裝備格數',()=>{
      const chances=defs.single('battleRule').castChances;
      eq(expectedDistinctCasts(chances,0),0);
      eq(expectedDistinctCasts(chances,1),1);
      // At two skills: 1 guaranteed plus P(at least one of the two bonus rolls).
      ok(Math.abs(expectedDistinctCasts(chances,2)-(2-(1-chances[1]!)*(1-chances[2]!)))<1e-9,'兩招上限的期望');
      ok(Math.abs(expectedDistinctCasts(chances,3)-chances.reduce((a,b)=>a+b,0))<1e-9,'三招期望不變');
    });
    for(const narrative of [true,false])it(`戰役清空後仍保留每章戰績：主線${narrative?'開':'關'}`,()=>{
      const s=narrative?newStorySession(9000):newSession(9000);
      const prepared:Record<string,string>={'S4.A':'pact','S5.B':'handover','S6.A':'corridor','S6.B':'handover','S7.A':'rescue','S7.B':'pact','S8.A':'delegate','S8.B':'handover'};
      const result=driveRun(s,{...POLICIES.find(p=>p.name==='greedy-gain')!,chooseFaction:()=>factionId('faction:shu'),
        chooseStory:r=>prepared[r.storyChoice!.id]??r.storyChoice!.options[0]!.id});
      eq(s.current.campaign,null);
      const summary=s.summary(),total=result.depths.reduce((a,b)=>a+b,0);
      ok(total>0,'實際打過關卡');
      eq(summary.stagesCleared,total);
      eq(Object.keys(summary.chapterDepths??{}).length,result.depths.length);
      eq(JSON.stringify(Object.values(summary.chapterDepths??{})),JSON.stringify(result.depths));
      const restored=Session.restore(wiring,JSON.parse(JSON.stringify(s.current)));
      eq(restored.summary().stagesCleared,total);
      const settled=restored.settle(emptyMeta());
      eq(settled.meta.stats.stagesCleared,total);
      eq(JSON.stringify(settled.meta.collection.completedRoutes),JSON.stringify(s.storyProgress().milestones));
      const repeated=restored.settle(settled.meta);
      eq(repeated.meta.stats.stagesCleared,total);
      eq(repeated.pointsGained,0);
      if(!narrative)eq(s.storyProgress().milestones.length,0);
    });
  });
}
