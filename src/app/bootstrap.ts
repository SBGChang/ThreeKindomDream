// 應用層的啟動接線：載入內容、組裝 wiring、存檔。
// 放在 app/ 而非 ui/ —— 接線本來就是應用層的職責，UI 只消費它的輸出。
import { compose, type Wiring } from './composition.js';
import { Session } from './session.js';
import { loadContent } from '../data-runtime/loader.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import { seed as mkSeed } from '../contracts/core/ids.js';
import type { MetaState } from '../contracts/core/state.js';
import { designateQuota, emptyDraft, emptyMeta } from '../modules/dream-entry.js';
import { browserRepository } from '../platform/browser-repository.js';

const loaded = loadContent(browserRepository);
if (!loaded.ok) throw new Error(loaded.report);

export const defs: DefinitionRegistry = loaded.registry;
export const wiring: Wiring = compose(defs);
export const t = (key: unknown): string => defs.text(String(key));

const SAVE_KEY = 'sgd.meta.v1';

export function loadMeta(): MetaState {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return emptyMeta();
  try {
    return JSON.parse(raw) as MetaState;
  } catch {
    return emptyMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(meta));
}

export function resetMeta(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function startRun(meta: MetaState, config = emptyDraft(meta, defs)): Session {
  return Session.start(wiring, meta, config, mkSeed(Date.now() % 2_000_000_000));
}

export { designateQuota, emptyDraft, emptyMeta };

// UI 需要的唯讀 Query 與元層操作，經此層轉出（ui/ 不直接 import modules/）。
export { catalog, purchase } from '../modules/shop.js';
export { careerService } from '../modules/career.js';
export { baseOf, notableSlotBonus, stageOf } from '../modules/roster-query.js';
// ⑩ 只轉出唯讀查詢。`awardNotableFragments` 是寫入函式，只有 ㉖ 可呼叫，
// 因此不從這裡出去 —— UI 拿不到它才是這道轉出的意義。
export { notableCodex } from '../modules/notable-codex.js';
