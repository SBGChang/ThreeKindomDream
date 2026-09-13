import type { RunState } from '../contracts/core/state.js';
import { Session } from './session.js';
import type { Wiring } from './composition.js';

const KEY = 'sgd.run.v2';
export interface SavedRun { readonly state: RunState; readonly log: readonly string[] }
export function saveRun(session: Session | null, log: readonly string[]): void {
  if (session === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify({ version: 2, state: session.current, log }));
}
/** Validate before construction; storage errors never prevent opening the app. */
export function restoreRun(w: Wiring): { session: Session | null; log: readonly string[]; notice: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { session: null, log: [], notice: '' };
    const saved = JSON.parse(raw) as { version: number; state: RunState; log: unknown };
    const s = saved.state;
    if (saved.version !== 2 || s === null || typeof s !== 'object'
      || !s.progress || !s.config || !s.attributes?.values || !s.growth?.exp || !s.growth?.spent
      || !s.metaSnapshot?.shop || !s.currencies?.merit || !s.career || !s.items?.count
      || !Array.isArray(s.roster?.members) || !Array.isArray(s.abilities?.skills)
      || !Array.isArray(s.abilities?.traits) || !Array.isArray(s.turn?.pending)
      || !Array.isArray(s.turn?.slots) || !s.rngCursors || !Number.isFinite(s.seed)) throw new Error('存檔格式不符');
    w.defs.reader('chapter').get(String(s.progress.chapterId));
    for (const id of s.abilities.skills) w.defs.reader('skill').get(String(id));
    for (const id of s.abilities.traits) w.defs.reader('trait').get(String(id));
    for (const m of s.roster.members) w.defs.reader('notable').get(String(m.notableId));
    return { session: Session.restore(w, s), log: Array.isArray(saved.log) ? saved.log.filter((v): v is string => typeof v === 'string') : [], notice: '' };
  } catch {
    return { session: null, log: [], notice: '未能讀取本輪存檔' };
  }
}
