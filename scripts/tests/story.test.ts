import { Session } from '../../src/app/session.js';
import { driveRun } from '../../src/app/run-driver.js';
import { migrateStoryRun } from '../../src/app/story-save.js';
import { chapterId, factionId, skillId } from '../../src/contracts/core/ids.js';
import { emptyStory } from '../../src/modules/story.js';
import { describe, eq, it, ok, throws } from '../lib/tinytest.js';
import { defs, newStorySession as newSession, wiring, META } from './harness.js';
import { POLICIES } from '../lib/policies.js';

const SHU = factionId('faction:shu');
const readyChoices = { 'S4.A': 'pact', 'S5.B': 'handover', 'S6.A': 'corridor', 'S6.B': 'handover',
  'S7.A': 'rescue', 'S7.B': 'pact', 'S8.A': 'delegate', 'S8.B': 'handover' };
function pickStory(s: Session, choices: Readonly<Record<string, string>>): void {
  const node = s.storyChoice;
  if (node) s.chooseStory(node.id, choices[node.id] ?? node.options[0]!.id);
}
function acknowledge(s: Session): void {
  while (s.storyScene) s.acknowledgeStory(s.storyScene.id);
}
function march(s: Session, choices: Readonly<Record<string, string>>): void {
  if (s.storyScene) { acknowledge(s); return; }
  if (s.needsChapterCamp) { s.continueChapter(); return; }
  if (s.needsFactionChoice) { s.chooseFaction(SHU); return; }
  if (s.needsSuperiors) { s.assignSuperiors([]); return; }
  if (s.needsCampaign) { s.configureCampaign({ skills: [], commanders: [] }); s.withdraw(); return; }
  if (!s.hasActed) s.selectSlot(0);
  while (s.pendingEvent) s.resolveEvent(0);
  pickStory(s, choices);
  if (s.canAdvance()) s.advance();
}
function atCampaign(slug: string, choices: Readonly<Record<string, string>> = readyChoices): Session {
  const s = newSession(782);
  for (let i = 0; i < 400 && !(s.needsCampaign && s.current.progress.chapterId === `ch:shu.${slug}`); i++) march(s, choices);
  eq(s.current.progress.chapterId, chapterId(`ch:shu.${slug}`));
  ok(s.needsCampaign, '應抵達指定戰役');
  return s;
}
/** Explicit battle fixture: four prior victories, strong fifth-stage rescue. */
function fifthStage(s: Session): Session {
  const state = s.current, campaign = state.campaign;
  if (!campaign) throw new Error('fixture requires campaign');
  return Session.restore(wiring, { ...state,
    abilities: { ...state.abilities, skills: [skillId('skill:tuzhen')] },
    attributes: { values: { lead: 100, war: 100, int: 100, pol: 100 } },
    campaign: { ...campaign, phase: 'awaitingDecision', clearedStages: 4,
      loadout: { skills: [skillId('skill:tuzhen')], commanders: [] },
      host: { troops: 1_000_000, troopsMax: 1_000_000, supply: 1_000_000, supplyMax: 1_000_000, buffs: [] } },
  });
}

export function run(): void {
  describe('敘事狀態與可玩蜀篇', () => {
    it('零星真實行旅完成七十二行動；救援仍須相應戰果', () => {
      const s = newSession(9000);
      const policy = POLICIES.find(p => p.name === 'greedy-gain')!;
      const result = driveRun(s, { ...policy, chooseFaction: () => SHU,
        chooseStory: run => readyChoices[run.storyChoice!.id as keyof typeof readyChoices] ?? run.storyChoice!.options[0]!.id });
      eq(result.actions, 72);
      eq(s.storyProgress().milestones.includes('shu.guanyu-rescued'), result.depths[7]! >= 5);
      eq(s.storyProgress().milestones.includes('shu.kongming-rested'), result.depths[8]! >= 5);
      ok(s.isOver, '不足救援戰果也能正常收束');
    });
    it('正常入口跑完 72 回合、18 個選擇，零關收兵也有完整收束', () => {
      const s = newSession(2026);
      const result = driveRun(s, { chooseFaction: () => SHU, chooseSlot: () => 0, chooseOption: () => 0,
        spend: () => {}, chooseLoadout: () => ({ skills: [], commanders: [] }), chooseEngage: () => false });
      eq(result.actions, 72); eq(s.current.progress.chaptersPassed, 9);
      eq(Object.keys(s.current.story.choices).length, 18);
      eq(s.current.story.seenScenes.filter(id => id.endsWith('.opening')).length, 9);
      eq(new Set(s.current.story.seenScenes).size, s.current.story.seenScenes.length);
      eq(s.current.story.milestones, []);
      ok(s.isOver, '保底結局應可達');
      const result1 = s.settle(META), result2 = s.settle(result1.meta);
      eq(result2.pointsGained, 0); eq(result2.meta, result1.meta);
    });
    it('尚未行動不得答主線；選項只提交一次，R6 尚未救出人物', () => {
      const source = atCampaign('jingzhou');
      const s = Session.restore(wiring, { ...source.current, campaign: null,
        progress: { ...source.current.progress, turnInChapter: 6, pendingCampaign: false },
        turn: { ...source.current.turn, selected: null, pending: [] },
        story: { ...source.current.story, choices: Object.fromEntries(Object.entries(source.current.story.choices).filter(([id]) => id !== 'S7.B')) },
      });
      throws(() => s.chooseStory('S7.B', 'pact'), '未行動不得選');
      s.selectSlot(0); while (s.pendingEvent) s.resolveEvent(0);
      ok(!s.canAdvance(), '主線尚未回答必須擋住回合');
      s.chooseStory('S7.B', 'pact');
      throws(() => s.chooseStory('S7.B', 'handover'), '不得重答');
      eq(s.current.story.milestones, []);
      ok(s.canAdvance(), '委託與主線清完才推進');
    });
    it('沒有前置，戰役情境不冒充救關羽，五關也不會誤授改命', () => {
      const s = fifthStage(atCampaign('jingzhou', { ...readyChoices, 'S4.A': 'position' }));
      ok(defs.text(String(s.campaignDef().stages[6]!.briefKey)).includes('退軍'), '準備不足應為守岸情境');
      ok(s.engage().cleared, 'fixture 第五關應取勝');
      eq(s.current.story.milestones, []);
    });
    it('第五關救出，讀檔後第六關敗退，關羽仍在而深度仍是五', () => {
      let s = fifthStage(atCampaign('jingzhou'));
      ok(defs.text(String(s.campaignDef().stages[4]!.briefKey)).includes('關羽'), '救援情境第五關標示關羽');
      ok(s.engage().cleared, '第五關應取勝');
      ok(s.current.story.milestones.includes('shu.guanyu-rescued'), '立即保留救援');
      throws(() => s.engage(), '未確認救援不可繼續攻擊');
      const saved = JSON.parse(JSON.stringify(s.current));
      s = Session.restore(wiring, migrateStoryRun(saved, 4, defs));
      ok(s.storyScene !== null, '待播救援須恢復'); acknowledge(s);
      const campaign = s.current.campaign!;
      s = Session.restore(wiring, { ...s.current, campaign: { ...campaign,
        loadout: { skills: [], commanders: [] }, host: { ...campaign.host, troops: 1, supply: 0 } } });
      ok(s.engage().defeated, '第六關應敗退');
      eq(s.current.story.depths['ch:shu.jingzhou'], 5);
      ok(s.current.story.milestones.includes('shu.guanyu-rescued'), '敗退不得收回救援');
      eq(s.current.progress.chapterId, chapterId('ch:shu.jingzhou'));
      ok(s.current.story.awaitingChapterClose, '未播章末前不可切章');
      acknowledge(s);
      ok(s.needsChapterCamp, '章末演出後保留整備');
      s.continueChapter();
      eq(s.current.progress.chapterId, chapterId('ch:shu.northern'));
    });
    it('救出但未立約，章末承認存活，結局不冒充桃園再聚', () => {
      const s = fifthStage(atCampaign('jingzhou', { ...readyChoices, 'S7.B': 'handover' }));
      s.engage(); acknowledge(s); s.withdraw();
      ok(defs.text(String(s.storyScene!.bodyKey)).includes('平安歸營'), '應顯示存活但未完成承諾');
      for (let i = 0; i < 80 && !s.isOver; i++) march(s, { ...readyChoices, 'S7.B': 'handover' });
      ok(String(s.current.ending?.endingId) !== 'ending:shu.reunion', '不可發完整改命結局');
    });
    it('兩條改命能共存，末章演完才選主結局，無效選擇被拒絕', () => {
      let s = fifthStage(atCampaign('jingzhou'));
      s.engage(); acknowledge(s); s.withdraw(); acknowledge(s);
      for (let i = 0; i < 50 && !s.needsCampaign; i++) march(s, readyChoices);
      s = fifthStage(s); s.engage(); acknowledge(s); s.withdraw();
      ok(!s.isOver, '末章演出前不可夢醒');
      ok(!s.needsEndingChoice, '回應尚未播放');
      acknowledge(s);
      s.continueChapter();
      ok(s.needsEndingChoice, '兩改命應能紀念其一');
      s = Session.restore(wiring, migrateStoryRun(JSON.parse(JSON.stringify(s.current)), 4, defs));
      ok(s.needsEndingChoice, '讀檔後保留雙結局選擇');
      eq(s.storyEndingOptions().length, 2);
      throws(() => s.chooseStoryEnding('ending:chancellor'), '不能越權指定結局');
      s.chooseStoryEnding('ending:shu.dawn');
      eq(String(s.current.ending?.endingId), 'ending:shu.dawn');
      eq(s.current.story.milestones.length, 2);
      throws(() => s.chooseStoryEnding('ending:shu.reunion'), '不得二次結局');
    });
    it('v3 只補明示停用的敘事狀態；v4 的未知選項與異常深度拒載', () => {
      const state = newSession(5).current;
      eq(migrateStoryRun(state, 3, defs).story, emptyStory(false));
      throws(() => migrateStoryRun({ ...state, story: { ...state.story, choices: { 'S1.A': 'bad' } } }, 4, defs), '未知選項');
      throws(() => migrateStoryRun({ ...state, story: { ...state.story, depths: { 'ch:shu.jingzhou': 8 } } }, 4, defs), '不存在第八關');
      throws(() => migrateStoryRun({ ...state, story: { ...state.story, scenes: [{ id: 'bad', titleKey: '' as never, bodyKey: '' as never }] } }, 4, defs), '未知場景');
      throws(() => migrateStoryRun({ ...state, story: { ...state.story, awaitingEndingChoice: true } }, 4, defs), '未達末章不得等待選結局');
    });
  });
}
