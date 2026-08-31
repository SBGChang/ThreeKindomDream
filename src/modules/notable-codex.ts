// ⑩ 名士圖鑑。記憶碎片 → 星階突破 → 逐人手寫的解鎖條（10 §1）。
//
// 星是【突破】不是稀有度。稀有度只決定碎片單價（`costByRarity`），
// 不決定天花板 —— 低星滿級可以強過高星低級，那是刻意的。
import type { RunContext } from '../contracts/core/context.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type {
  NotableDef, NotableStarDef, NotableStarTierDef, UnlockRow,
} from '../contracts/core/definitions.js';
import type { ResolvedEffectRef } from '../contracts/core/effects.js';
import { isStandingScoped, notableSourceId } from '../contracts/core/effects.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { AffinityStage } from '../contracts/core/primitives.js';
import type { MetaState, NotableCodexEntry } from '../contracts/core/state.js';
import type { EffectSource } from './effect.js';

const EMPTY: NotableCodexEntry = { star: 0, fragments: 0 };

export interface NotableCodexQuery {
  entry(id: NotableId, meta: MetaState): NotableCodexEntry;
  /** 目前星階。 */
  starOf(id: NotableId, meta: MetaState): number;
  /**
   * 已解鎖的能力條。門檻是【星階】不是好感度 —— 星是跨局投資，
   * 好感管的是站位效果開不開（見 `notableEffectSource`）。
   *
   * 【累加不取代】：`supersedes` 已移除，1／3／5 星的同類條全部並存。
   */
  unlockedRows(id: NotableId, meta: MetaState, defs: DefinitionRegistry): readonly UnlockRow[];
  designatable(meta: MetaState, defs: DefinitionRegistry): readonly NotableId[];
  /** 升下一階要多少碎片。null ＝ 已滿星。 */
  nextCost(id: NotableId, meta: MetaState, defs: DefinitionRegistry): number | null;
  /** 滿星是幾星。畫面與驗證共用同一個答案。 */
  maxStar(defs: DefinitionRegistry): number;
}

const ladder = (defs: DefinitionRegistry): NotableStarDef => defs.single('notableStar');

/**
 * 取某星階的那一列。超出表尾時夾到最後一列 ——
 * 這【不是】偽裝的 fallback：星階由 `awardNotableFragments` 夾在表長之內，
 * 讀不到只可能是存檔跨版本，而那由 schemaVersion 處理（§2.2）。
 */
function tierAt(star: number, defs: DefinitionRegistry): NotableStarTierDef {
  const tiers = ladder(defs).tiers;
  const row = tiers[Math.min(Math.max(0, star), tiers.length - 1)];
  if (row === undefined) throw new Error('notableStar.tiers 為空 —— 升星階梯不存在');
  return row;
}

export const notableCodex: NotableCodexQuery = {
  entry: (id, meta) => meta.notableCodex[String(id)] ?? EMPTY,

  starOf(id, meta) {
    return this.entry(id, meta).star;
  },

  unlockedRows(id, meta, defs) {
    const def = defs.reader('notable').get(String(id));
    const star = this.starOf(id, meta);
    return def.unlocks.filter((u) => u.star <= star);
  },

  designatable(meta, defs) {
    const curve = defs.single('affinityCurve');
    return defs.reader('notable').all()
      .filter((n) => this.starOf(n.notableId, meta) >= curve.designateStar)
      .map((n) => n.notableId);
  },

  nextCost(id, meta, defs) {
    const l = ladder(defs);
    const def = defs.reader('notable').get(String(id));
    const next = this.starOf(id, meta) + 1;
    const row = l.tiers[next];
    if (row === undefined) return null;
    return Math.round(row.fragmentCost * (l.costByRarity[def.rarity] ?? 1));
  },

  maxStar: (defs) => Math.max(0, ladder(defs).tiers.length - 1),
};

/**
 * 名士的效果來源（10 §3.1）★
 *
 * 這裡是【好感 60 門檻】的唯一實作處。判準只有一條：
 * 效果定義帶著 `standing` 且不是 `none` ⟹ 那位名士的好感必須達到
 * `linkBonus.linkStage`，否則這一條【不發放】。
 *
 * 為什麼寫在來源端而不是求值端：門檻是「這條算不算數」而不是
 * 「這條算多少」。放在來源端，加新的站位型 FuncType 只要帶上 `standing`
 * 就自動受管；放在求值端則每個新方法都得記得再判一次。
 *
 * 【道具不經這裡】—— 道具有自己的來源（⑪），沒有好感可查。這正是兩層
 * 分工的落點：名士那層延遲七到十個回合才開，道具那層第一回合就開。
 */
export function notableEffectSource(roster: readonly NotableId[]): EffectSource {
  return {
    collect(ctx: RunContext): readonly ResolvedEffectRef[] {
      const gateIndex = stageIndex(ctx.defs.single('linkBonus').linkStage, ctx);
      const out: ResolvedEffectRef[] = [];
      for (const id of roster) {
        // 讀 metaSnapshot，不讀活的 MetaState（10 §3.1）
        const star = notableCodex.starOf(id, ctx.state.metaSnapshot);
        const rows = notableCodex.unlockedRows(id, ctx.state.metaSnapshot, ctx.defs);
        const linked = affinityIndexOf(id, ctx) >= gateIndex;
        for (const r of rows) {
          const def = ctx.defs.effect(r.funcType, r.referId);
          if (!linked && isStandingScoped(def)) continue;
          out.push({
            funcType: r.funcType,
            referId: r.referId,
            sourceId: notableSourceId(id, star),
          });
        }
      }
      return out;
    },
  };
}

/** 好感階段的序號。⑩ 擁有 roster，因此門檻判斷落在這裡（interfaces §8）。 */
function stageIndex(stage: AffinityStage, ctx: RunContext): number {
  const ordered = ctx.defs.reader('affinityStage').all().slice()
    .sort((a, b) => a.min - b.min);
  const idx = ordered.findIndex((s) => s.stage === stage);
  if (idx < 0) throw new Error(`好感階段不存在: ${stage}`);
  return idx;
}

function affinityIndexOf(id: NotableId, ctx: RunContext): number {
  const m = ctx.state.roster.members.find((x) => x.notableId === id);
  const value = m?.affinity ?? 0;
  const ordered = ctx.defs.reader('affinityStage').all().slice()
    .sort((a, b) => a.min - b.min);
  const idx = ordered.findIndex((s) => value >= s.min && value <= s.max);
  if (idx < 0) throw new Error(`好感度 ${value} 落在所有階段之外`);
  return idx;
}

/**
 * 結算時的寫入。只有 ㉖ 可呼叫（10 §4）。
 *
 * 碎片自動換星階，餘額留在 `fragments`。用 while 而非 if ——
 * 一次結算可能一次跨兩階（例如圓夢加倍之後）。
 */
export function awardNotableFragments(
  entries: readonly { notableId: NotableId; finalStage: AffinityStage }[],
  isFullDream: boolean,
  meta: MetaState,
  defs: DefinitionRegistry,
): { meta: MetaState; gained: Record<string, number>; raised: Record<string, number> } {
  const curve = defs.single('affinityCurve');
  const l = ladder(defs);
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
    let star = cur.star;
    let frags = cur.fragments + amount;
    gained[key] = (gained[key] ?? 0) + amount;

    for (;;) {
      const row = l.tiers[star + 1];
      if (row === undefined) break;
      const cost = Math.round(row.fragmentCost * (l.costByRarity[def.rarity] ?? 1));
      if (frags < cost) break;
      frags -= cost;
      star += 1;
    }
    if (star !== cur.star) raised[key] = star - cur.star;
    codex[key] = { star, fragments: frags };
  }

  return { meta: { ...meta, notableCodex: codex }, gained, raised };
}
