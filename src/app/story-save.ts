import type { RunState } from '../contracts/core/state.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import { emptyStory } from '../modules/story.js';
import { candidatesFor, SEQUENCE_DONE } from '../modules/ending.js';
import { sequenceOf } from '../modules/turn.js';

/** Legacy runs finish without retroactively inserting missed plot decisions. */
export function migrateStoryRun(state: RunState, version: number, defs: DefinitionRegistry): RunState {
  if (version === 3) return { ...state, schemaVersion: 4, story: emptyStory(false) };
  if (version !== 4) throw new Error('不支援的本輪存檔版本');
  const story = state.story;
  if (!story || typeof story.enabled !== 'boolean' || typeof story.awaitingChapterClose !== 'boolean' || typeof story.awaitingEndingChoice !== 'boolean'
    || !story.choices || typeof story.choices !== 'object' || Array.isArray(story.choices)
    || !story.depths || typeof story.depths !== 'object' || Array.isArray(story.depths)
    || !Array.isArray(story.milestones) || !Array.isArray(story.scenes) || !Array.isArray(story.seenScenes)) {
    throw new Error('主線存檔格式不符');
  }
  const roots = defs.reader('storyChapter').all();
  const chapters = roots.flatMap(c=>[c,...(c.variants??[]).map(v=>v.chapter)]);
  const nodes = chapters.flatMap(c=>[...c.nodes,...(c.legacy?.nodes??[]),...(c.companions??[]).flatMap(p=>p.nodes??[])]);
  const milestoneIds = new Set(chapters.flatMap(c => c.milestones.map(m => m.id)));
  for(const c of chapters)for(const st of [...(c.fieldStories??[]),...(c.companions??[]).flatMap(p=>p.fieldStories??[])])for(const marks of [st.progressMarks?.visited,st.progressMarks?.rewards])for(const id of Object.values(marks??{}))milestoneIds.add(id);
  for(const c of chapters)for(const row of c.afterChallenges??[]){milestoneIds.add('resolved:'+row.id);milestoneIds.add('won:'+row.id);}
  for(const c of chapters)for(const event of [...(c.fieldStories??[]),...(c.companions??[]).flatMap(p=>p.fieldStories??[])])milestoneIds.add('field:'+event.id);
  const scenes = new Map(chapters.flatMap(c => [...(c.legacy?.scenes??[]),c.opening, ...c.aftermaths.map(a => a.scene), ...c.milestones.map(m => m.scene), ...c.nodes.flatMap(n => n.options.flatMap(o => o.response ? [o.response] : [])),...(c.companions??[]).flatMap(p=>[p.opening,p.aftermath,...(p.nodes??[]).flatMap(n=>n.options.flatMap(o=>o.response?[o.response]:[]))])])
    .map(s => [s.id, s]));
  for (const [node, option] of Object.entries(story.choices)) {
    if (!nodes.some(n=>n.id===node&&n.options.some(o => o.id === option))) throw new Error('主線選擇不屬於目前內容');
  }
  for (const id of story.milestones) if (!milestoneIds.has(id)) throw new Error('救援紀錄不存在');
  for (const id of story.seenScenes) if (!scenes.has(id)) throw new Error('劇情紀錄不存在');
  for (const [id, depth] of Object.entries(story.depths)) {
    const campaign = defs.reader('campaign').all().find(c => c.chapterId === id);
    if (!campaign || !Number.isInteger(depth) || depth < 0 || depth > campaign.stages.length) throw new Error('戰役深度不合法');
  }
  for (const scene of story.scenes) {
    const def = scenes.get(scene?.id);
    if (!def || def.bodyKey !== scene.bodyKey || def.titleKey !== scene.titleKey) throw new Error('待播劇情不存在');
  }
  if (new Set(story.milestones).size !== story.milestones.length
    || new Set([...story.seenScenes, ...story.scenes.map(s => s.id)]).size !== story.seenScenes.length + story.scenes.length) {
    throw new Error('主線紀錄重複');
  }
  if (!story.enabled && (story.awaitingChapterClose || story.awaitingEndingChoice || story.scenes.length)) {
    throw new Error('舊局不得等待新主線');
  }
  if(state.eventChallenge?.source==='chapter'&&!chapters.some(c=>c.chapterId===state.progress.chapterId&&c.afterChallenges?.some(r=>r.id===state.eventChallenge!.eventId)))throw new Error('章末挑戰不存在');
  if (story.awaitingChapterClose && (story.scenes.length === 0 && state.eventChallenge?.source!=='chapter' || state.progress.pendingCampaign || state.ending)) {
    throw new Error('章末演出狀態不一致');
  }
  if (story.awaitingEndingChoice) {
    const ctx = { state, defs };
    if (state.ending || state.campaign || state.progress.pendingCampaign || story.awaitingChapterClose || story.scenes.length
      || state.progress.chapterId !== sequenceOf(state.faction, ctx).at(-1)
      || candidatesFor(SEQUENCE_DONE, ctx).filter(e => (e.storyRequirements?.length ?? 0) > 0).length < 2) {
      throw new Error('主結局選擇狀態不一致');
    }
  }
  return { ...state, story: { ...story, scenes: story.scenes.map(s => scenes.get(s.id)!) } };
}
