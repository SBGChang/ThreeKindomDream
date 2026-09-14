import { writeFileSync } from 'node:fs';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';

const loaded = loadContent(diskRepository());
if (!loaded.ok) throw new Error(loaded.report);
const defs = loaded.registry;
const rule = defs.single('growthRule').economy;
const stories = defs
  .reader('event')
  .all()
  .filter((e) => e.trigger.kind === 'notable');
const commissions = defs
  .reader('event')
  .all()
  .filter((e) => e.trigger.kind === 'commission');
const text = (key: unknown): string =>
  defs.text(String(key)).replaceAll('|', '／');
const lines = [
  '# 人物故事實作清單',
  '',
  `由目前編譯內容產生：${stories.length} 則人物故事、${commissions.length} 則委託。多人故事列於每位參與者之下，不能將各人列數再加總。`,
  '',
  '共通條件：全員同行、指定前置已完成、章節與共事達標，且上次該人物故事距今至少兩回合。陣營故事另外檢查魏線資格。每輪人物故事不重複發薪。',
  '',
  '重建：`npx tsx scripts/catalog-stories.ts`。',
  '',
];
for (const notable of defs.reader('notable').all()) {
  lines.push(
    `## ${text(notable.nameKey)}`,
    '',
    '| 故事／ID | 星數 | 最早章節 | 好感／共事 | 指定前置 |',
    '|---|---:|---:|---|---|',
  );
  const own = stories
    .filter(
      (e) =>
        e.trigger.kind === 'notable' &&
        e.trigger.cast.some((c) => c.notableId === notable.notableId),
    )
    .sort((a, b) => a.progression!.rarity - b.progression!.rarity);
  for (const event of own) {
    if (event.trigger.kind !== 'notable') continue;
    const star = event.progression!.rarity;
    const cast = event.trigger.cast.find(
      (c) => c.notableId === notable.notableId,
    )!;
    const affinity = Math.max(
      rule.storyAffinity[star - 1]!,
      defs
        .reader('affinityStage')
        .all()
        .find((s) => s.stage === cast.minStage)!.min,
    );
    lines.push(
      `| ${text(event.titleKey)} · \`${event.eventDefId}\` | ${star} | ${rule.storyChapter[star - 1]} | ${affinity}／${rule.storyCooperations[star - 1]} | ${event.progression!.previous.map((id) => text(defs.reader('event').get(String(id)).titleKey)).join('、') || '無'} |`,
    );
  }
  lines.push('');
}
writeFileSync('docs/STORY-CATALOG.md', lines.join('\n'));
console.log(`已產生 ${stories.length} 則故事的逐人條件清單。`);
