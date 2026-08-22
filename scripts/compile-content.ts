// 作者層 → 產物。可重複執行、結果位元相同（30）。
// 執行：npm run content:build
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { AUTHORED_MANIFEST } from '../content-source/packs.js';
import { compile } from './lib/compile.js';

const OUT = join(resolve(import.meta.dirname, '..'), 'content');

const { files, hash } = compile();
rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  const abs = join(OUT, f.path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, f.text, 'utf8');
}

const totalDefs = AUTHORED_MANIFEST.packs.reduce((s, p) => s + p.defs.length, 0);
const totalTexts = AUTHORED_MANIFEST.packs.reduce((s, p) => s + Object.keys(p.texts).length, 0);
console.log(`編譯完成：${files.length} 個檔案、${totalDefs} 筆 Definition、${totalTexts} 條文案`);
console.log(`內容雜湊：${hash}`);
for (const p of AUTHORED_MANIFEST.packs) {
  console.log(`  ${p.packId.padEnd(12)} v${p.version}  ${String(p.defs.length).padStart(4)} 筆`);
}
