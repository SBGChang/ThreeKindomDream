// 紀律門禁。擋的是【測試抓不到的那一類】：
//   內容 ID 寫死在 code、玩法數值寫進 code、跨 slice 直接讀、依賴方向倒反。
// 這四類的共同點是它們不會讓任何測試失敗 —— 功能照跑、型別照過。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const NL = String.fromCharCode(10);

interface Violation { readonly file: string; readonly line: number; readonly text: string; readonly why: string }

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const BS = String.fromCharCode(92);
const rel = (f: string): string => relative(ROOT, f).split(BS).join('/');

/** 逐行讀取並剝除註解與字串外的雜訊。CRLF-safe。 */
function codeLines(f: string): readonly { n: number; raw: string; code: string }[] {
  return readFileSync(f, 'utf8').split(/\r?\n/).map((raw, i) => ({
    n: i + 1,
    raw,
    code: raw.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, ''),
  }));
}

const violations: Violation[] = [];
const add = (f: string, n: number, text: string, why: string): void => {
  violations.push({ file: rel(f), line: n, text: text.trim().slice(0, 110), why });
};

// ── 1. 內容 ID 只允許出現在 content-source ─────────
// 命名空間前綴（notable: / event: / chapter: …）是 ID 的識別特徵。
const ID_PREFIX = /'(?:notable|event|chapter|check|faction|ending|shop|talent|pool|dc|glow|apt|rank|train|stage|seq|curve|link|cap|rules|settle|aptCost|careerInit|checkRule|affCurve):/;
for (const f of files) {
  for (const l of codeLines(f)) {
    if (ID_PREFIX.test(l.code)) {
      add(f, l.n, l.raw, '內容 ID 字面值只允許出現在 content-source/');
    }
  }
}

// ── 2. 玩法數值不得寫進 code ───────────────────────
// 具名常數帶有「可調數值」的味道。技術參數（陣列長度、索引）不在此列。
const NUMERIC_CONST = /^\s*(?:const|let)\s+[A-Z_][A-Z0-9_]*\s*[:=]\s*-?\d+(?:\.\d+)?\s*;/;
for (const f of files) {
  if (/\/(contracts|kernel)\//.test(rel(f))) continue;
  for (const l of codeLines(f)) {
    if (NUMERIC_CONST.test(l.code)) {
      add(f, l.n, l.raw, '玩法數值必須來自資料，不得是 code 裡的具名常數');
    }
  }
}

// ── 3. 跨 slice 直接讀取 ──────────────────────────
// 規則的精確形式（比 interfaces.md §8 初稿更細）：
//
//   【座標型 slice】progress / faction / config / metaSnapshot / seed / rngCursors
//     —— 這些是「這一輪是誰、走到哪」的識別與位置，不是累積的領域數值。
//        它們凍結或單調，任何模組讀它都不會產生對他人資料形狀的耦合。
//        → 全域可讀。
//
//   【領域型 slice】attributes / currencies / career / roster / slots / charges / ending
//     —— 這些是累積的領域狀態，有擁有者、有寫入規則。
//        直接讀它就是耦合在對方的形狀上。
//        → 必須經擁有者的 Query 介面。
//
// 這個區分是實作時才浮現的：把兩類混為一談，規則會逼出一堆
// 只為了過門禁而存在的 getter，反而讓程式更難讀。
const UNIVERSAL: readonly string[] = [
  'progress', 'faction', 'config', 'metaSnapshot', 'seed', 'rngCursors', 'schemaVersion',
];
const OWNS: Readonly<Record<string, readonly string[]>> = {
  // ⑯ 與 ⑰ 共同擁有 `turn`：一個回合就是「固定事件 ＋ 它引出的事件」，
  // 硬把它切成兩個 slice 會讓「本回合做了什麼」需要兩處對帳（15 §2）。
  'training.ts': ['turn'],
  'commission.ts': ['turn'],
  'roster.ts': ['roster'],
  'roster-query.ts': ['roster'],
  'stats.ts': ['attributes', 'currencies', 'career'],
  'career.ts': ['career'],
  // 15 擁有回合座標與行動配比；動作互斥的規則寫在它身上（15 §2）
  'turn.ts': ['actions'],
  'faction.ts': [],
  'ending.ts': ['ending'],
  'shop.ts': [],
  'notable-codex.ts': ['roster'],
  // ⑩ 擁有局內道具持有。效果來源要讀 metaSnapshot（座標型，全域可讀）。
  'item.ts': ['items'],
  'dream-entry.ts': [],
  'effect.ts': ['charges', 'turn', 'lastMajorCheck', 'boons'],
  'effect-core.ts': ['turn', 'lastMajorCheck'],
  // ㉖ 結算是唯一可以讀全部的地方 —— 它的職責就是把整輪彙總（26 §3）
  'settlement.ts': [
    'ending', 'roster', 'career', 'turn', 'attributes', 'currencies', 'actions',
  ],
  'check.ts': [],
  // ㉜ 擁有 growth。它【寫】attributes 但一律經 ⑳ 的 StatWriter，因此不需要讀權。
  'growth.ts': ['growth'],
  'ability.ts': ['abilities'],
  // ㉝ 擁有 campaign。career／attributes／roster 一律經各自的 Query。
  'campaign.ts': ['campaign'],
};
const SLICE_READ = /(?:ctx|tc)\.state\.([a-zA-Z]+)/g;
for (const f of files) {
  const base = rel(f).split('/').pop() ?? '';
  const owned = OWNS[base];
  if (owned === undefined) continue;
  for (const l of codeLines(f)) {
    for (const m of l.code.matchAll(SLICE_READ)) {
      const slice = m[1] ?? '';
      if (!UNIVERSAL.includes(slice) && !owned.includes(slice)) {
        add(f, l.n, l.raw, `直接讀取他人的 slice「${slice}」—— 應經其 Query 介面`);
      }
    }
  }
}

// ── 4. 依賴方向 ───────────────────────────────────
for (const f of files) {
  const r = rel(f);
  const text = readFileSync(f, 'utf8');
  const imports = [...text.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '');
  for (const imp of imports) {
    if (r.startsWith('src/contracts/') && /modules|app|ui|platform/.test(imp)) {
      add(f, 1, `import ${imp}`, 'contracts/ 不得依賴模組、app、ui 或平台');
    }
    if (r.startsWith('src/kernel/') && /modules|app|ui/.test(imp)) {
      add(f, 1, `import ${imp}`, 'kernel/ 不得依賴模組、app 或 ui');
    }
    if (r.startsWith('src/app/') && /\/ui\//.test(imp)) {
      add(f, 1, `import ${imp}`, 'app/ 不得依賴 ui/（方向只能是 ui → app）');
    }
    if (r.startsWith('src/ui/') && /\/modules\/(?!career|roster-query|shop)/.test(imp)) {
      add(f, 1, `import ${imp}`, 'ui/ 只能經 app/ 或唯讀 Query 取用核心');
    }
    if (/content-source/.test(imp) && !r.startsWith('scripts/')) {
      add(f, 1, `import ${imp}`, 'Runtime 只讀產物 content/，不得讀作者層');
    }
  }
}

if (violations.length > 0) {
  console.error(`verify:discipline 失敗（${violations.length} 筆）${NL}`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.text}`);
    console.error(`    → ${v.why}${NL}`);
  }
  process.exit(1);
}
console.log(`verify:discipline 通過（受檢 ${files.length} 個檔案，4 道檢查）`);
