// ⑭ 入夢配置。Meta 與 Run 的唯一橋樑（14 §1）。
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type { EffectRef, ResolvedEffectRef } from '../contracts/core/effects.js';
import type { NotableId, Seed, TalentId } from '../contracts/core/ids.js';
import { chapterIndex, turnIndex } from '../contracts/core/ids.js';
import type { AptitudeGrade, Attr } from '../contracts/core/primitives.js';
import { APTITUDE_GRADES, ATTRS, GLOW_TIERS } from '../contracts/core/primitives.js';
import type {
  DreamEntryConfig, MetaState, RunState,
} from '../contracts/core/state.js';
import { emptyCursors } from '../kernel/rng.js';
import type { EffectSource } from './effect.js';
import { notableCodex } from './notable-codex.js';
import { shopLimits } from './shop.js';
import { sequenceOf } from './turn.js';

export interface ConfigLimits {
  readonly aptitudeCaps: Readonly<Record<Attr, AptitudeGrade>>;
  readonly aptitudePoints: number;
  readonly talentPoints: number;
  readonly unlockedTalents: readonly TalentId[];
  readonly designatable: readonly NotableId[];
  readonly factionBonds: Readonly<Record<string, number>>;
  readonly companionSlots: number;
}

/** 組裝 ⑨＋⑩ 的上限。全部現算（14 §4.1）。 */
export function limits(meta: MetaState, defs: DefinitionRegistry): ConfigLimits {
  const shop = shopLimits(meta, defs);
  return {
    aptitudeCaps: shop.aptitudeCaps,
    aptitudePoints: shop.aptitudePoints,
    talentPoints: shop.talentPoints,
    unlockedTalents: shop.unlockedTalents,
    designatable: notableCodex.designatable(meta, defs),
    factionBonds: shop.factionBonds,
    companionSlots: defs.single('gameRules').companionCount,
  };
}

export function emptyDraft(meta: MetaState, defs: DefinitionRegistry): DreamEntryConfig {
  const aptCost = defs.single('aptitudeCost');
  const aptitudes: Record<string, AptitudeGrade> = {};
  for (const a of ATTRS) aptitudes[a] = aptCost.defaultGrade;
  void meta;
  return {
    aptitudes: aptitudes as Record<Attr, AptitudeGrade>,
    talents: [],
    designatedCompanions: [],
  };
}

export interface DraftCost {
  readonly aptitudePointsUsed: number;
  readonly talentPointsUsed: number;
  readonly overBudget: boolean;
}

export function cost(
  draft: DreamEntryConfig, meta: MetaState, defs: DefinitionRegistry,
): DraftCost {
  const aptCost = defs.single('aptitudeCost');
  const lim = limits(meta, defs);
  const apt = ATTRS.reduce(
    (sum, a) => sum + (aptCost.cumulativeCost[draft.aptitudes[a]] ?? 0), 0,
  );
  const tal = draft.talents.reduce(
    (sum, t) => sum + defs.reader('talent').get(String(t)).cost, 0,
  );
  return {
    aptitudePointsUsed: apt,
    talentPointsUsed: tal,
    overBudget: apt > lim.aptitudePoints || tal > lim.talentPoints,
  };
}

/** 回全部錯誤而非第一個 —— 玩家一次可能超支多項（14 §4）。 */
export function validate(
  draft: DreamEntryConfig, meta: MetaState, defs: DefinitionRegistry,
): readonly string[] {
  const lim = limits(meta, defs);
  const c = cost(draft, meta, defs);
  const out: string[] = [];

  for (const a of ATTRS) {
    const capIdx = APTITUDE_GRADES.indexOf(lim.aptitudeCaps[a]);
    if (APTITUDE_GRADES.indexOf(draft.aptitudes[a]) > capIdx) {
      out.push(`${a} 資質 ${draft.aptitudes[a]} 超過上限 ${lim.aptitudeCaps[a]}`);
    }
  }
  if (c.aptitudePointsUsed > lim.aptitudePoints) {
    out.push(`資質點超支 ${c.aptitudePointsUsed - lim.aptitudePoints} 點`);
  }
  if (c.talentPointsUsed > lim.talentPoints) {
    out.push(`天賦點超支 ${c.talentPointsUsed - lim.talentPoints} 點`);
  }
  const unlocked = new Set(lim.unlockedTalents.map(String));
  const groups = new Map<string, string>();
  for (const t of draft.talents) {
    if (!unlocked.has(String(t))) out.push(`天賦 ${String(t)} 尚未解放`);
    const def = defs.reader('talent').get(String(t));
    if (def.exclusiveGroup !== null) {
      const prev = groups.get(def.exclusiveGroup);
      if (prev !== undefined) out.push(`天賦 ${String(t)} 與 ${prev} 互斥`);
      groups.set(def.exclusiveGroup, String(t));
    }
  }
  if (draft.designatedCompanions.length > lim.companionSlots) {
    out.push(`兒時玩伴超過 ${lim.companionSlots} 位`);
  }
  const desig = new Set(lim.designatable.map(String));
  for (const n of draft.designatedCompanions) {
    if (!desig.has(String(n))) out.push(`${String(n)} 的培養度未達指定門檻`);
  }
  if (new Set(draft.designatedCompanions.map(String)).size !== draft.designatedCompanions.length) {
    out.push('兒時玩伴有重複');
  }
  return out;
}

/** 天賦與資質的效果來源。 */
export function configEffectSource(): EffectSource {
  return {
    collect(ctx): readonly ResolvedEffectRef[] {
      const out: ResolvedEffectRef[] = [];
      for (const t of ctx.state.config.talents) {
        const def = ctx.defs.reader('talent').get(String(t));
        for (const ref of def.effects as readonly EffectRef[]) {
          out.push({ ...ref, sourceId: `talent:${String(t)}` });
        }
      }
      return out;
    },
  };
}

/** 唯一建立 RunState 的入口。同時凍結配置與 MetaState 快照（ARCHITECTURE §2.11）。 */
export function createRunState(
  draft: DreamEntryConfig, meta: MetaState, seed: Seed, defs: DefinitionRegistry,
): RunState {
  const glow: Record<string, number> = {};
  for (const g of GLOW_TIERS) glow[g] = 0;
  void glow;
  const seq = sequenceOf(null, { state: SKELETON(meta, draft, seed), defs });
  const first = seq[0];
  if (first === undefined) throw new Error('南華村篇序列為空');

  return {
    ...SKELETON(meta, draft, seed),
    progress: {
      turn: turnIndex(1),
      chapter: chapterIndex(1),
      chapterId: first,
      turnInChapter: 1,
      phase: 'nanhua',
      chaptersPassed: 0,
      pendingMajorCheck: false,
      pendingFactionChoice: false,
      pendingSuperiorAssign: false,
    },
  };
}

const SKELETON = (meta: MetaState, config: DreamEntryConfig, seed: Seed): RunState => ({
  schemaVersion: 1,
  seed,
  rngCursors: emptyCursors(),
  metaSnapshot: meta,
  config,
  progress: {
    turn: turnIndex(1), chapter: chapterIndex(1),
    chapterId: '' as RunState['progress']['chapterId'],
    turnInChapter: 1, phase: 'nanhua', chaptersPassed: 0,
    pendingMajorCheck: false, pendingFactionChoice: false, pendingSuperiorAssign: false,
  },
  faction: null,
  attributes: { values: { war: 0, int: 0, pol: 0, cha: 0 } },
  currencies: { fame: { civil: 0, martial: 0, moral: 0 }, merit: { civil: 0, martial: 0 } },
  career: { civil: 1, martial: 1 },
  roster: { members: [] },
  slots: {
    training: { slots: [], selected: null, result: null },
    event: { offers: [], resolved: null, seenUniqueIds: [] },
  },
  actions: { training: 0, event: 0 },
  charges: {},
  ending: null,
  lastMajorCheck: null,
});

export const emptyMeta = (): MetaState => ({
  schemaVersion: 1,
  points: 0,
  notableCodex: {},
  shop: { purchased: {} },
  collection: { seenEvents: [], reachedEndings: [] },
  stats: {
    runsStarted: 0, runsFullDream: 0, chaptersPassed: 0, turnsPlayed: 0,
    glowResults: { none: 0, silver: 0, gold: 0, red: 0 },
    actionsTraining: 0, actionsEvent: 0,
    pointsEarnedTotal: 0, pointsSpentTotal: 0,
  },
  runIndex: 0,
  settledSeeds: [],
});
