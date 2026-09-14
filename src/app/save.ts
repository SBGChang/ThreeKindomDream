import { validBattleSnapshot } from './realtime-battle-model.js';
import type { RunState } from '../contracts/core/state.js';
import { Session } from './session.js';
import type { Wiring } from './composition.js';
import { migrateStoryRun } from './story-save.js';

const KEY = 'sgd.run.v3';
const OLD_KEY = 'sgd.run.v2';
export interface SavedRun {
  readonly state: RunState;
  readonly log: readonly string[];
}
export function saveRun(session: Session | null, log: readonly string[]): void {
  if (session === null) localStorage.removeItem(KEY);
  else
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 4, state: session.current, log }),
    );
}
/** Validate before construction; storage errors never prevent opening the app. */
export function restoreRun(w: Wiring): {
  session: Session | null;
  log: readonly string[];
  notice: string;
} {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null)
      return {
        session: null,
        log: [],
        notice: localStorage.getItem(OLD_KEY)
          ? '經濟系統已更新，舊局保留備份；天命與圖鑑不受影響，請重新入夢。'
          : '',
      };
    const saved = JSON.parse(raw) as {
      version: number;
      state: RunState;
      log: unknown;
    };
    const s = saved.state;
    if (
      ![3, 4].includes(saved.version) ||
      s === null ||
      typeof s !== 'object' ||
      !s.economy ||
      !Number.isSafeInteger(s.economy.money) ||
      s.economy.money < 0 ||
      !Array.isArray(s.economy.ledger) ||
      !Array.isArray(s.economy.market?.offers) ||
      !Number.isSafeInteger(s.economy.earned) ||
      !Number.isSafeInteger(s.economy.spent) ||
      !s.stories?.history ||
      !s.progress ||
      !s.config ||
      !s.attributes?.values ||
      !Array.isArray(s.growth?.unlockedSkills) ||
      !Array.isArray(s.growth?.unlockedTraits) ||
      !s.metaSnapshot?.shop ||
      !s.currencies?.merit ||
      !s.career ||
      !s.items?.count ||
      !Array.isArray(s.roster?.members) ||
      !Array.isArray(s.abilities?.skills) ||
      (s.abilities?.activeTraits !== undefined &&
        !Array.isArray(s.abilities.activeTraits)) ||
      !s.items.fragments ||
      !s.items.naturalCounts ||
      !Array.isArray(s.abilities?.traits) ||
      !Array.isArray(s.turn?.pending) ||
      !Array.isArray(s.turn?.slots) ||
      !s.rngCursors ||
      !Number.isFinite(s.seed)
    )
      throw new Error('存檔格式不符');
    if(s.campaign?.realtime&&!validBattleSnapshot(s.campaign.realtime))throw new Error('即時戰役存檔格式不符');
    w.defs.reader('chapter').get(String(s.progress.chapterId));
    for (const id of s.abilities.skills) w.defs.reader('skill').get(String(id));
    for (const id of s.abilities.traits) w.defs.reader('trait').get(String(id));
    for (const m of s.roster.members)
      w.defs.reader('notable').get(String(m.notableId));
    return {
      session: Session.restore(w, migrateStoryRun(s, saved.version, w.defs)),
      log: Array.isArray(saved.log)
        ? saved.log.filter((v): v is string => typeof v === 'string')
        : [],
      notice: '',
    };
  } catch {
    return { session: null, log: [], notice: '未能讀取本輪存檔' };
  }
}
