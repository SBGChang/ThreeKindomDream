// ㉒ 陣營系統。資格門檻、切換序列（22）。
import type { RunContext } from '../contracts/core/context.js';
import type { Condition } from '../contracts/core/effects.js';
import type { FactionId, L10nKey } from '../contracts/core/ids.js';
import type { RunState } from '../contracts/core/state.js';
import { evaluateCondition } from './effect-core.js';
import { statQuery } from './stats.js';
import { progressOf } from './turn.js';

const readStat = statQuery.read.bind(statQuery);

export interface FactionOption {
  readonly factionId: FactionId;
  readonly nameKey: L10nKey;
  readonly eligible: boolean;
  readonly blockedBy: readonly Condition[];
  readonly rejectReasonKey: L10nKey | null;
}

/**
 * 回全部已安裝陣營（含不合格者，附 blockedBy）——
 * 讓玩家看得到「我這輪惡名太高所以蜀漢不收」。
 * 未安裝 pack 的完全不出現（22 §2.1）。
 */
export function selectable(ctx: RunContext): readonly FactionOption[] {
  return ctx.defs.reader('faction').all().map((f) => {
    const unmet = f.requirements.filter((c) => !evaluateCondition(c, ctx, readStat));
    return {
      factionId: f.faction,
      nameKey: f.nameKey,
      eligible: unmet.length === 0,
      blockedBy: unmet,
      rejectReasonKey: unmet.length === 0 ? null : f.rejectReasonKey,
    };
  });
}

export function choose(id: FactionId, ctx: RunContext): RunState {
  // 切換序列：南華村篇的章節不進入陣營序列，兩者是接續（15 §1.2）
  const passed = ctx.state.progress.chaptersPassed;
  const next: RunState = { ...ctx.state, faction: id };
  const progress = progressOf(1, id, passed, { state: next, defs: ctx.defs });
  return {
    ...next,
    progress: { ...progress, pendingSuperiorAssign: true },
  };
}

export const lordOf = (id: FactionId, ctx: RunContext) =>
  ctx.defs.reader('faction').get(String(id)).lordId;

export const bondLevelOf = (id: FactionId, ctx: RunContext): number => {
  // 由商店的 factionBond grant 推導（09 §1.1）
  const purchased = ctx.state.metaSnapshot.shop.purchased;
  let level = 0;
  for (const item of ctx.defs.reader('shopItem').all()) {
    const bought = purchased[String(item.item)] ?? 0;
    for (const lv of item.levels.slice(0, bought)) {
      if (lv.grant.kind === 'factionBond' && lv.grant.faction === id) {
        level = Math.max(level, lv.grant.toLevel);
      }
    }
  }
  return level;
};
