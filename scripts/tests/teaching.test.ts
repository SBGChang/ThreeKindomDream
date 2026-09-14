import { describe, eq, it, ok, throws } from '../lib/tinytest.js';
import { defs, newSession, wiring } from './harness.js';
import { Session } from '../../src/app/session.js';
import { grantUnlock } from '../../src/modules/growth.js';
import { acknowledgeStory, grantStoryTeachings } from '../../src/modules/story.js';
import { teachingRewardLines } from '../../src/ui/teaching-receipt.js';
import { eventRewardLines } from '../../src/ui/event-receipt.js';
import { storyRarity } from '../../src/modules/stories.js';
import type { StoryScene } from '../../src/contracts/core/story.js';
import { turnIndex } from '../../src/contracts/core/ids.js';

export function run(): void {
  describe('教學解鎖、突破與折金', () => {
    it('未解鎖常階也不出現在訓練，直接呼叫不能購買', () => {
      const base = newSession(2).current;
      const s = Session.restore(wiring, { ...base, attributes: { values: {lead:95,war:95,int:95,pol:95} }, economy:{...base.economy,money:10000} });
      const hidden = defs.reader('skill').all().find(d => d.tier === 'common' && !base.abilities.skills.includes(d.skillId))!;
      ok(!s.learningOffers().some(o => o.id === hidden.skillId), '未解鎖項目不列出');
      ok(s.learningOffers().every(o => o.level > 0), '訓練只有已學會的項目');
      const before = s.current;
      ok(!s.upgradeAbility(hidden.skillId), '不可繞過介面購買');
      eq(s.current, before);
    });
    it('與高好感名士同格不會直接授課', () => {
      const base = newSession(2).current;
      const s = Session.restore(wiring, { ...base, roster: { members: defs.reader('notable').all().map(n => ({ notableId:n.notableId,origin:'companion' as const,affinity:100,cooperations:20 })) } });
      const before = s.current;
      s.selectSlot(0);
      eq(s.current.abilities, before.abilities);
      eq(s.current.growth.unlockedSkills, before.growth.unlockedSkills);
      eq(s.current.growth.unlockedTraits, before.growth.unlockedTraits);
    });
    it('教學不用付費或達到訓練門檻；同一筆教學不可重播突破', () => {
      const before = newSession(2).current;
      const skill = defs.reader('skill').all().find(d => d.tier === 'peerless')!;
      const first = grantUnlock(null, skill.skillId, {state:before,defs}, 'lesson/1');
      eq(first.abilities.levels?.[skill.skillId], 1);
      eq(first.economy.money, before.economy.money);
      eq(grantUnlock(null, skill.skillId, {state:first,defs}, 'lesson/1'), first);
      const second = grantUnlock(null, skill.skillId, {state:first,defs}, 'lesson/2');
      eq(second.abilities.levels?.[skill.skillId], 2);
      const receipt = teachingRewardLines(first, second, defs);
      eq(receipt[0]?.note, '突破至 2 級');
      eq(receipt[0]?.amount, 1);
    });
    it('只要獎勵的該招已滿級便折金，不必全部技能滿級', () => {
      let state = newSession(2).current;
      const skill = state.abilities.skills[0]!;
      for (let i=0;i<2;i++) state=grantUnlock(null,skill,{state,defs},'level/'+i);
      const full = state;
      const paid = grantUnlock(null,skill,{state,defs},'mastered');
      eq(paid.abilities, full.abilities);
      const amount = defs.single('growthRule').economy.skillPrices[defs.reader('skill').get(skill).tier].at(-1)!;
      eq(paid.economy.money-full.economy.money, amount);
      eq(paid.economy.earned-paid.economy.spent, paid.economy.money);
      eq(teachingRewardLines(full, paid, defs)[0]?.amount, amount);
      eq(grantUnlock(null,skill,{state:paid,defs},'mastered'), paid);
    });
    it('主線教學在場景結束後入帳，預覽、讀檔與重複確認不重複領取', () => {
      const base = newSession(2).current;
      const skill = defs.reader('skill').all().find(d => !base.abilities.skills.includes(d.skillId))!;
      const authored = defs.reader('storyChapter').all().flatMap(c=>c.aftermaths.map(a=>a.scene)).find(s=>s.teachings?.length)!;
      ok(authored !== undefined, '有正式接入的劇情教學');
      const scene: StoryScene = {...authored, teachings:[{skill:skill.skillId,trait:null}]};
      const before = {...base, story:{...base.story,enabled:true,scenes:[scene]}};
      const preview = grantStoryTeachings(scene,{state:before,defs});
      ok(!before.abilities.skills.includes(skill.skillId), '預覽不改原狀態');
      const after = acknowledgeStory(scene.id,{state:before,defs});
      eq(after.abilities, preview.abilities);
      eq(after.economy, preview.economy);
      throws(()=>acknowledgeStory(scene.id,{state:after,defs}), '劇情場景已變更');
      const restored = Session.restore(wiring, JSON.parse(JSON.stringify(after)));
      eq(restored.current.abilities, after.abilities);
      eq(grantStoryTeachings(scene,restored.ctx), restored.current);
    });
    it('人物事件實際結算會解鎖、突破並顯示滿級折金，不重複列額外報酬', () => {
      const event = defs.reader('event').all().find(e => e.trigger.kind === 'notable' && e.options.some(o=>o.check===null && o.rewards.some(r=>r.kind==='unlock' && r.skill!==null)))!;
      const option = event.options.findIndex(o=>o.check===null && o.rewards.some(r=>r.kind==='unlock' && r.skill!==null));
      const lesson = event.options[option]!.rewards.find(r=>r.kind==='unlock' && r.skill!==null)!;
      if (lesson.kind !== 'unlock' || !lesson.skill) throw new Error('缺少教學測試事件');
      let state = newSession(2).current;
      for(let i=0;i<4;i++) {
        const s = Session.restore(wiring,{...state,
          progress:{...state.progress,turn:turnIndex(state.progress.turn+i)},
          turn:{...state.turn,pending:[{eventDefId:event.eventDefId,rarity:storyRarity(event),params:{},optionStates:[]}],encounterCandidates:[]},
        });
        const before = s.current;
        s.resolveEvent(option);
        state = s.current;
        const result = state.turn.resolved.at(-1)!;
        const lines = eventRewardLines(before,state,result,defs);
        ok(lines.some(r => r.label.includes(defs.text(String(defs.reader('skill').get(lesson.skill!).nameKey)))), '教學結果有對話獎勵');
        if (i===3) {
          ok(lines.some(r=>r.note==='金錢' && r.label.includes('滿級教學折金')), '滿級顯示折金');
          eq(lines.filter(r=>r.note==='金錢').reduce((sum,r)=>sum+(r.amount??0),0), state.economy.money-before.economy.money);
        }
      }
    });
  });
}
