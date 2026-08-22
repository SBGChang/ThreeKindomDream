// ⑩ 名士圖鑑。碎片 → 初始好感度 → 跨門檻解鎖被動條（10 §1）。
import type { RunContext } from '../contracts/core/context.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type {
  AffinityCurveDef, NotableDef, UnlockRow,
} from '../contracts/core/definitions.js';
import type { ResolvedEffectRef } from '../contracts/core/effects.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { AffinityStage, Rarity } from '../contracts/core/primitives.js';
import type { MetaState, NotableCodexEntry } from '../contracts/core/state.js';
import type { EffectSource } from './effect.js';

const EMPTY: NotableCodexEntry = { startAffinity: 0, fragments: 0 };

export interface NotableCodexQuery {
  entry(id: NotableId, meta: MetaState): NotableCodexEntry;
  startAffinity(id: NotableId, meta: MetaState): number;
  /** 已套 supersedes 過濾 —— 這是過濾的落點，效果管線不做這件事（10 §3）。 */
  unlockedRows(id: NotableId, meta: MetaState, defs: DefinitionRegistry): readonly UnlockRow[];
  designatable(meta: MetaState, defs: DefinitionRegistry): readonly NotableId[];
  nextCost(id: NotableId, meta: MetaState, defs: DefinitionRegistry): number | null;
}

export const notableCodex: NotableCodexQuery = {
  entry: (id, meta) => meta.notableCodex[String(id)] ?? EMPTY,

  startAffinity(id, meta) {
    return this.entry(id, meta).startAffinity;
  },

  unlockedRows(id, meta, defs) {
    const def = defs.reader('notable').get(String(id));
    const reached = this.startAffinity(id, meta);
    const eligible = def.unlocks.filter((u) => u.affinity <= reached);
    const superseded = new Set(eligible.flatMap((u) => u.supersedes));
    return eligible.filter((u) => !superseded.has(u.affinity));
  },

  designatable(meta, defs) {
    const curve = defs.single('affinityCurve');
    return defs.reader('notable').all()
      .filter((n) => this.startAffinity(n.notableId, meta) >= curve.designationThreshold)
      .map((n) => n.notableId);
  },

  nextCost(id, meta, defs) {
    const curve = defs.single('affinityCurve');
    const def = defs.reader('notable').get(String(id));
    const at = this.startAffinity(id, meta);
    if (at >= curve.maxStartAffinity) return null;
    return costAt(curve, def.rarity, at);
  },
};

const costAt = (curve: AffinityCurveDef, rarity: Rarity, at: number): number =>
  curve.costPerPoint[rarity][at] ?? Number.MAX_SAFE_INTEGER;

/** 工廠：吃本輪陣容，產出對應的 EffectSource（01 §11.1 —— 必須是工廠不是實例）。 */
export function notableEffectSource(roster: readonly NotableId[]): EffectSource {
  return {
    collect(ctx: RunContext): readonly ResolvedEffectRef[] {
      const out: ResolvedEffectRef[] = [];
      for (const id of roster) {
        // 讀 metaSnapshot，不讀活的 MetaState（10 §3.1）
        const rows = notableCodex.unlockedRows(id, ctx.state.metaSnapshot, ctx.defs);
        for (const r of rows) {
          out.push({
            funcType: r.funcType,
            referId: r.referId,
            sourceId: `${String(id)}@${r.affinity}`,
          });
        }
      }
      return out;
    },
  };
}

/** 結算時的寫入。只有 ㉖ 可呼叫（10 §4）。碎片自動轉換，餘額留在 fragments。 */
export function awardNotableFragments(
  entries: readonly { notableId: NotableId; finalStage: AffinityStage }[],
  isFullDream: boolean,
  meta: MetaState,
  defs: DefinitionRegistry,
): { meta: MetaState; gained: Record<string, number>; raised: Record<string, number> } {
  const curve = defs.single('affinityCurve');
  const codex: Record<string, NotableCodexEntry> = { ...meta.notableCodex };
  const gained: Record<string, number> = {};
  const raised: Record<string, number> = {};

  for (const e of entries) {
    const key = String(e.notableId);
    const def: NotableDef = defs.reader('notable').get(key);
    const base = curve.fragmentsByStage[e.finalStage];
    const amount = Math.round(base * (isFullDream ? curve.fullDreamMultiplier : 1));
    if (amount === 0) continue;

    const cur = codex[key] ?? EMPTY;
    let start = cur.startAffinity;
    let frags = cur.fragments + amount;
    gained[key] = (gained[key] ?? 0) + amount;

    for (;;) {
      if (start >= curve.maxStartAffinity) break;
      const cost = costAt(curve, def.rarity, start);
      if (frags < cost) break;
      frags -= cost;
      start += 1;
    }
    if (start !== cur.startAffinity) raised[key] = start - cur.startAffinity;
    codex[key] = { startAffinity: start, fragments: frags };
  }

  return { meta: { ...meta, notableCodex: codex }, gained, raised };
}
