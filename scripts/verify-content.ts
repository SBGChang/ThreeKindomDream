// 兩道檢查：產物同步（＝重新編譯的結果）＋ 可載入（通過三層驗證）。
// 「編得出來」不等於「載得進去」—— 跨 pack 重複 ID 只有載入器看得到（30 §3.1）。
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { compile } from './lib/compile.js';

const OUT = join(resolve(import.meta.dirname, '..'), 'content');
const problems: string[] = [];
const NL = String.fromCharCode(10);

// ── 1. 同步 ────────────────────────────────────────
const { files } = compile();
for (const f of files) {
  const abs = join(OUT, f.path);
  if (!existsSync(abs)) {
    problems.push(`缺少產物 content/${f.path}${NL}    修法：npm run content:build 後提交產物。`);
    continue;
  }
  const committed = readFileSync(abs, 'utf8');
  if (committed === f.text) continue;
  let at = 0;
  while (at < committed.length && at < f.text.length && committed[at] === f.text[at]) at += 1;
  const from = Math.max(0, at - 40);
  problems.push(
    `content/${f.path} 與作者層不同步（第 ${at} 字元起）${NL}`
    + `    committed : …${committed.slice(from, from + 100)}${NL}`
    + `    重建結果  : …${f.text.slice(from, from + 100)}${NL}`
    + '    修法：npm run content:build 後提交產物。',
  );
}

// ── 2. 可載入 ──────────────────────────────────────
const result = loadContent(diskRepository());
if (!result.ok) problems.push(result.report);

if (problems.length > 0 || !result.ok) {
  console.error('verify:content 失敗');
  for (const p of problems) console.error(`  ${p}${NL}`);
  process.exit(1);
} else {
  const reg = result.registry;
  console.log('verify:content 通過');
  console.log(`  已安裝 pack：${reg.installedPacks().join(', ')}`);
  console.log(
    `  名士 ${reg.reader('notable').all().length} 位`
    + ` / 事件 ${reg.reader('event').all().length} 則`
    + ` / 章節 ${reg.reader('chapter').all().length} 章`
    + ` / 戰役 ${reg.reader('campaign').all().length} 場`
    + ` / 能力 ${reg.reader('trait').all().length + reg.reader('skill').all().length} 條`
    + ` / 結局 ${reg.reader('ending').all().length} 種`
    + ` / 文案 ${reg.allTextKeys().length} 條`,
  );
}
