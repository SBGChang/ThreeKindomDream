import { describe, eq, it, ok, near } from '../lib/tinytest.js';
import { defs, wiring, newSession, META } from './harness.js';
import { emptyDraft, emptyMeta, limits } from '../../src/modules/dream-entry.js';
import { awardNotableFragments } from '../../src/modules/notable-codex.js';
import { settle } from '../../src/modules/settlement.js';
import { guidance } from '../../src/modules/progression.js';
import { candidatesFor, SEQUENCE_DONE } from '../../src/modules/ending.js';
import { recordStoryDepth } from '../../src/modules/story.js';
import { Session } from '../../src/app/session.js';
import { seed, factionId } from '../../src/contracts/core/ids.js';
import type { RunSummary } from '../../src/contracts/core/state.js';
import { POLICIES } from '../lib/policies.js';
import { driveRun } from '../../src/app/run-driver.js';

export function run():void {
  describe('十二輪記憶與成果結算',()=>{
    it('各稀有度同額滿星，六人可同輪成長；重複名單與倍率不能加速',()=>{
      const people=defs.reader('notable').all().slice(0,6);
      const entries=people.map(n=>({notableId:n.notableId,finalStage:'sworn' as const,attendance:32}));
      let meta=emptyMeta();
      for(let life=1;life<=12;life++){
        const out=awardNotableFragments([...entries,...entries],true,meta,defs);meta=out.meta;
        const expected=life>=12?5:life>=7?4:life>=4?3:life>=2?2:1;
        for(const n of people){eq(out.gained[String(n.notableId)],100);eq(meta.notableCodex[String(n.notableId)]?.star,expected);}
      }
      eq(limits(meta,defs).designatable.length,6);
    });
    it('短暫加入不領全額；零星與五星以在隊平均計算',()=>{
      const s=newSession(901),people=s.current.roster.members;
      eq(awardNotableFragments([{notableId:people[0]!.notableId,finalStage:'sworn',attendance:7}],true,META,defs).gained,{});
      const state={...s.current,metaSnapshot:{...META,notableCodex:{[String(people[0]!.notableId)]:{star:5,fragments:0}}}};
      near(guidance({state,defs},'growth'),(5.8+people.length-1)/people.length,1e-9);
      eq(s.current.metaSnapshot.notableCodex,META.notableCodex);
    });
    it('最高職涯結局要雙十階與每章實際戰果；單線也有頂級結局',()=>{
      const base=newSession(903).current,faction=factionId('faction:wei');
      const ids=defs.reader('chapterSequence').all().filter(s=>s.factionId===null||s.factionId===faction).flatMap(s=>s.chapters);
      let state={...base,faction,career:{civil:10,martial:10},story:{...base.story,depths:{}}};
      const top=()=>candidatesFor(SEQUENCE_DONE,{state,defs})[0]!;
      ok(!top().campaignRequirements,'沒有戰績不能靠頭銜領頂級');
      state={...state,story:{...state.story,depths:Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?7:6]))}};
      eq(top().campaignRequirements,{finalDepth:7,priorDepth:6});
      state={...state,career:{civil:10,martial:3}};
      eq(top().campaignRequirements,{finalDepth:5,priorDepth:0});
    });
    it('正式人生結算一次；相同種子的下一輪有獨立記帳身分',()=>{
      const s=newSession(904);
      driveRun(s,{...POLICIES[0]!,chooseEngage:()=>false});
      const summary=s.summary(),out=settle(summary,META,defs);
      ok(out.pointsGained>0&&out.pointsGained<1600,'天命收益沒有整筆結局倍增');
      eq(settle(summary,out.meta,defs).pointsGained,0);
      const next=Session.start(wiring,out.meta,emptyDraft(out.meta,defs),seed(904));
      ok(next.current.runId!==s.current.runId,'新人生不因沿用種子而失去獎勵');
      const future:RunSummary={...summary,runId:next.current.runId!};
      ok(settle(future,out.meta,defs).pointsGained>0,'新身分可結算');
      const missing=awardNotableFragments([{notableId:s.current.roster.members[0]!.notableId,finalStage:'sworn',attendance:0}],true,META,defs);
      eq(missing.gained,{});
    });
    it('無盡波次不使劇情深度超過章節表，讀檔可恢復',()=>{
      const s=newSession(905),id=s.current.progress.chapterId;
      const state=recordStoryDepth(id,20,{state:s.current,defs});
      eq(state.story.depths[String(id)],7);
      eq(Session.restore(wiring,JSON.parse(JSON.stringify(state))).current.story.depths,state.story.depths);
    });
    it('走完普通結局仍領完整同行記憶，提早中止則依共事時間計算',()=>{
      const s=newSession(906);
      driveRun(s,{...POLICIES[0]!,chooseEngage:()=>false});
      const summary=s.summary(),person=s.current.roster.members[0]!.notableId;
      const ordinary:RunSummary={...summary,isFullDream:false,pointsMultiplier:1,
        notables:[{notableId:person,finalStage:'stranger',attendance:32}]};
      const out=settle(ordinary,META,defs);
      eq(out.notableFragments[String(person)],40);
      eq(out.meta.notableCodex[String(person)]?.completedWith,true);
      const aborted=settle({...ordinary,chaptersPassed:0,notables:[{notableId:person,finalStage:'sworn',attendance:8}]},META,defs);
      eq(aborted.notableFragments[String(person)],10);
      ok(!aborted.meta.notableCodex[String(person)]?.completedWith,'未走完不可獲得故人邀請');
    });
  });
}
