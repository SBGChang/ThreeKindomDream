import { describe, eq, it, ok, throws } from '../lib/tinytest.js';
import { defs, newStorySession, wiring } from './harness.js';
import { Session } from '../../src/app/session.js';
import { migrateStoryRun } from '../../src/app/story-save.js';
import { storyPages } from '../../src/ui/story-presentation.js';
import { restoreRun, saveRun } from '../../src/app/save.js';

export function run(): void {
  describe('主線對話接線', () => {
    it('所有主線都有逐句內容，系統敘述無說話者；長文完整分頁', () => {
      const chapters = defs.reader('storyChapter').all();
      for (const chapter of chapters) {
        for (const source of [chapter.opening,...chapter.nodes,...chapter.aftermaths.map(a=>a.scene),...chapter.milestones.map(m=>m.scene),...chapter.nodes.flatMap(n=>n.options.flatMap(o=>o.response?[o.response]:[]))]) {
          ok(Boolean(source.beats?.length), '主線必須有逐句腳本：'+source.id);
          const pages = storyPages(source, key=>defs.text(key));
          ok(pages.length > 0 && pages.every(p=>p.text.length<=68), '對話不可溢出：'+source.id);
          for (const page of pages) ok(page.speaker===null || typeof page.speaker==='string', '明示人物或系統');
          eq(pages.map(p=>p.text).join('').replace(/\s/g,''), source.beats!.map(b=>defs.text(String(b.textKey))).join('').replace(/\s/g,''));
        }
      }
      const s = newStorySession(32), opening = s.storyScene!;
      eq(storyPages(opening,key=>defs.text(key)).map(p=>p.speaker), [null,'阿禾',null,'皇甫嵩']);
      throws(()=>s.selectSlot(0),'開場不可被固定行動略過');
    });
    it('主線佔人物事件位置，委託仍先結算，回答不另耗回合', () => {
      const s = newStorySession(77);
      s.acknowledgeStory(s.storyScene!.id);
      s.selectSlot(0); while(s.pendingEvent) s.resolveEvent(0); s.advance();
      eq(s.current.progress.turnInChapter,2);
      ok(s.current.turn.slots.every(slot=>!slot.hasEncounter),'固定主線回合不再抽人物事件');
      s.selectSlot(0);
      if(s.pendingEvent) eq(s.storyChoice,null);
      while(s.pendingEvent) s.resolveEvent(0);
      const node=s.storyChoice!, turn=s.current.progress.turn, money=s.money;
      ok(Boolean(node),'委託後出現主線'); s.chooseStory(node.id,node.options[0]!.id);
      eq(s.current.progress.turn,turn); eq(s.money,money);
      ok(Boolean(s.storyScene?.id.endsWith('.response')),'先播選擇的結果');
      ok(!s.canAdvance(),'回應未播完不可跳走');
      s.acknowledgeStory(s.storyScene!.id); ok(s.canAdvance(),'回應後可推進');
      throws(()=>s.chooseStory(node.id,node.options[1]!.id),'不可重複提交');
    });
    it('第六回合承諾只在戰後播放，先演章末再開整備', () => {
      const base=newStorySession(11);
      const chapter=defs.reader('storyChapter').all().find(c=>c.nodes.some(n=>n.responseTiming==='chapterEnd'&&n.options.some(o=>o.response)))!;
      const node=chapter.nodes.find(n=>n.responseTiming==='chapterEnd'&&n.options.some(o=>o.response))!;
      const option=node.options.find(o=>o.response)!;
      const s=Session.restore(wiring,{...base.current,progress:{...base.current.progress,chapterId:chapter.chapterId,turnInChapter:6},turn:{...base.current.turn,selected:0,pending:[]},story:{...base.current.story,scenes:[]}});
      s.chooseStory(node.id,option.id); eq(s.storyScene,null);
      ok(!s.current.story.seenScenes.includes(option.response!.id),'戰前不可演出結果');
    });
    it('新存檔保留待播句組；舊金幣局不倒灌開場，還原使用正式腳本', () => {
      const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'), memory=new Map<string,string>();
      Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}});
      try {
        const s=newStorySession(13); saveRun(s,[]);
        const restored=restoreRun(wiring); ok(Boolean(restored.session),'新局可讀'); eq(restored.session!.storyScene,s.storyScene);
        const raw=JSON.parse(memory.get('sgd.run.v3')!); eq(raw.version,4);
        raw.version=3; delete raw.state.story; memory.set('sgd.run.v3',JSON.stringify(raw));
        const legacy=restoreRun(wiring).session!; ok(Boolean(legacy),'舊金幣局可讀'); eq(legacy.current.story.enabled,false); eq(legacy.money,s.money);
        const changed={...s.current,story:{...s.current.story,scenes:[{...s.storyScene!,beats:[]}]}};
        eq(migrateStoryRun(changed,4,defs).story.scenes[0],s.storyScene);
      } finally { if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage'); }
    });
  });
}
