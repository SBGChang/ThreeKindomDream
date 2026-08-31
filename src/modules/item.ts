// ⑪ 道具。圖鑑（跨局）與局內持有（23）。
//
// 道具與名士共用同一套 FuncType —— 名士的星階突破與道具的階級解放寫的是
// 同一種東西。差別只有兩個：
//
//   一 · 道具【不吃好感門檻】。它沒有好感可查，因此第一回合就全開。
//        名士那層要七到十個回合才打得開 —— 這正是道具存在的理由。
//   二 · 道具有【每輪獲得次數上限】，而碎片＝本輪已持有再度獲得。
//        低階無上限（自己會滿），高階一輪一次（不帶進場就永遠 0 碎片）。
import type { RunContext } from '../contracts/core/context.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type { ItemDef, ItemTierDef } from '../contracts/core/definitions.js';
import type { ResolvedEffectRef } from '../contracts/core/effects.js';
import { itemSourceId } from '../contracts/core/effects.js';
import type { ItemId, ItemPoolId } from '../contracts/core/ids.js';
import type { ItemCodexEntry, ItemGain, MetaState, RunState } from '../contracts/core/state.js';
import type { EffectSource } from './effect.js';

const EMPTY: ItemCodexEntry = { tier: 0, fragments: 0 };

export interface ItemCodexQuery {
  entry(id: ItemId, meta: MetaState): ItemCodexEntry;
  tierOf(id: ItemId, meta: MetaState): number;
  /** 已解放的階（含 0 階基底）。累加不取代，與名士星階同構。 */
  unlockedTiers(id: ItemId, meta: MetaState, defs: DefinitionRegistry): readonly ItemTierDef[];
  /** 解放下一階要多少碎片。null ＝ 已滿階。 */
  nextCost(id: ItemId, meta: MetaState, defs: DefinitionRegistry): number | null;
  /** 圖鑑裡已經見過的道具（tier ≥ 0 且有紀錄）。攜帶清單由它篩。 */
  known(meta: MetaState, defs: DefinitionRegistry): readonly ItemId[];
}

export const itemCodex: ItemCodexQuery = {
  entry: (id, meta) => meta.itemCodex[String(id)] ?? EMPTY,

  tierOf(id, meta) {
    return this.entry(id, meta).tier;
  },

  unlockedTiers(id, meta, defs) {
    const def = defs.reader('item').get(String(id));
    const tier = this.tierOf(id, meta);
    return def.tiers.filter((t) => t.tier <= tier);
  },

  nextCost(id, meta, defs) {
    const def = defs.reader('item').get(String(id));
    const next = this.tierOf(id, meta) + 1;
    const row = def.tiers.find((t) => t.tier === next);
    return row === undefined ? null : row.fragmentCost;
  },

  known: (meta, defs) => defs.reader('item').all()
    .filter((d) => meta.itemCodex[String(d.itemId)] !== undefined)
    .map((d) => d.itemId),
};

// ── 局內持有 ────────────────────────────────────────

/** 本輪已獲得幾次。攜帶進場的算第一次。 */
export const heldCount = (id: ItemId, ctx: RunContext): number =>
  ctx.state.items.count[String(id)] ?? 0;

export const isHeld = (id: ItemId, ctx: RunContext): boolean => heldCount(id, ctx) > 0;

/** 本輪持有中的全部道具。效果來源與結算都吃它。 */
export const heldItems = (ctx: RunContext): readonly ItemId[] =>
  Object.keys(ctx.state.items.count).filter((k) => (ctx.state.items.count[k] ?? 0) > 0)
    .map((k) => k as ItemId);

/**
 * 還能不能再拿一次（23 §5）★
 *
 * 這是整個道具系統的核心取捨來源：高階 `perRunCap` ＝ 1，因此那唯一一次
 * 是「首次獲得」而不是重複 —— 不帶進場就永遠拿不到碎片。
 */
export function canAcquire(id: ItemId, ctx: RunContext): boolean {
  const def = ctx.defs.reader('item').get(String(id));
  return heldCount(id, ctx) < def.perRunCap;
}

/**
 * 獲得一件道具。回傳新的 RunState 與這一次是不是【重複】。
 *
 * 上限已滿時回傳 `null` 的 gain —— 呼叫端據此決定要不要改給替代獎勵。
 * 這裡不靜靜吞掉：「拿不到」是玩家該看見的結果（§2.2）。
 */
export function acquire(
  id: ItemId, ctx: RunContext,
): { readonly state: RunState; readonly gain: ItemGain | null } {
  if (!canAcquire(id, ctx)) return { state: ctx.state, gain: null };
  const before = heldCount(id, ctx);
  return {
    state: {
      ...ctx.state,
      items: { count: { ...ctx.state.items.count, [String(id)]: before + 1 } },
    },
    gain: { itemId: id, duplicate: before > 0 },
  };
}

/** 攜帶進場：把配置裡的道具種進局內持有。入夢時呼叫一次（14 §5）。 */
export function seedCarried(ctx: RunContext): RunState {
  const limit = ctx.defs.single('gameRules').carrySlots;
  const count: Record<string, number> = {};
  for (const id of ctx.state.config.carriedItems.slice(0, limit)) {
    count[String(id)] = (count[String(id)] ?? 0) + 1;
  }
  return { ...ctx.state, items: { count } };
}

/** 一個道具池的可抽清單。上限已滿者不在其中 —— 抽出來卻拿不到是假獎勵。 */
export function poolCandidates(
  poolId: ItemPoolId, ctx: RunContext,
): readonly { readonly item: ItemId; readonly weight: number }[] {
  const pool = ctx.defs.reader('itemPool').get(String(poolId));
  return pool.entries
    .filter((e) => canAcquire(e.itemId, ctx))
    .map((e) => ({ item: e.itemId, weight: e.weight }));
}

/**
 * 道具的效果來源（01 §11.1）★
 *
 * 【不吃好感門檻】。名士那層的門檻寫在 ⑩ 的來源端，這裡刻意沒有對應的判斷 ——
 * 那不是遺漏，是兩層分工：道具就是「不用再等一次」的那一層。
 */
export function itemEffectSource(): EffectSource {
  return {
    collect(ctx: RunContext): readonly ResolvedEffectRef[] {
      const out: ResolvedEffectRef[] = [];
      for (const id of heldItems(ctx)) {
        // 讀 metaSnapshot，不讀活的 MetaState —— 可重播的前提（module-map §2）
        const tiers = itemCodex.unlockedTiers(id, ctx.state.metaSnapshot, ctx.defs);
        for (const t of tiers) {
          for (const ref of t.effects) {
            out.push({ ...ref, sourceId: itemSourceId(id, t.tier) });
          }
        }
      }
      return out;
    },
  };
}

/**
 * 結算時的寫入。只有 ㉖ 可呼叫（23 §7）。
 *
 * 【第二次以後才算碎片】—— 首次獲得換到的是圖鑑登錄本身。因此低階
 * （一輪可拿多次）自然產碎片，高階（一輪一次）只有攜帶進場才產。
 */
export function awardItemFragments(
  acquired: Readonly<Record<string, number>>,
  meta: MetaState,
  defs: DefinitionRegistry,
): { meta: MetaState; gained: Record<string, number>; raised: Record<string, number> } {
  const codex: Record<string, ItemCodexEntry> = { ...meta.itemCodex };
  const gained: Record<string, number> = {};
  const raised: Record<string, number> = {};

  for (const [key, times] of Object.entries(acquired)) {
    if (times <= 0) continue;
    const def: ItemDef = defs.reader('item').get(key);
    const cur = codex[key] ?? EMPTY;
    const dup = times - 1;
    if (dup > 0) gained[key] = dup;

    let tier = cur.tier;
    let frags = cur.fragments + dup;
    for (;;) {
      const row = def.tiers.find((t) => t.tier === tier + 1);
      if (row === undefined) break;
      if (frags < row.fragmentCost) break;
      frags -= row.fragmentCost;
      tier += 1;
    }
    if (tier !== cur.tier) raised[key] = tier - cur.tier;
    codex[key] = { tier, fragments: frags };
  }

  return { meta: { ...meta, itemCodex: codex }, gained, raised };
}
