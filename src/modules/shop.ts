// ⑨ 天命商店 ＋ ⑧ 輪迴點數。把點數換成入夢前的能力上限與可選項（09）。
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type { RunContext } from '../contracts/core/context.js';
import type { ShopItemDef, ShopLevel } from '../contracts/core/definitions.js';
import type { EffectRef, ResolvedEffectRef } from '../contracts/core/effects.js';
import type { FactionId, ShopItemId, TalentId } from '../contracts/core/ids.js';
import type { AptitudeGrade, Attr } from '../contracts/core/primitives.js';
import { APTITUDE_GRADES, ATTRS } from '../contracts/core/primitives.js';
import type { MetaState } from '../contracts/core/state.js';
import type { EffectSource } from './effect.js';

export interface ShopEntry {
  readonly item: ShopItemDef;
  readonly currentLevel: number;
  readonly nextLevel: ShopLevel | null;
  readonly affordable: boolean;
  readonly blockedBy: readonly ShopItemId[];
}

export interface ShopLimits {
  readonly aptitudeCaps: Readonly<Record<Attr, AptitudeGrade>>;
  readonly aptitudePoints: number;
  readonly talentPoints: number;
  readonly unlockedTalents: readonly TalentId[];
  readonly factionBonds: Readonly<Record<string, number>>;
  /** 官階上限 ＝ `gameRules.careerCapBase` ＋ 買到的 `careerCap` 總和。 */
  readonly careerCap: number;
}

const boughtLevels = (item: ShopItemDef, meta: MetaState): readonly ShopLevel[] =>
  item.levels.slice(0, meta.shop.purchased[String(item.item)] ?? 0);

/** 未安裝對應 pack 的品項完全不出現 —— 那不是進度問題，是內容不存在（09 §3.1）。 */
export function catalog(meta: MetaState, defs: DefinitionRegistry): readonly ShopEntry[] {
  return defs.reader('shopItem').all()
    .filter((i) => i.requiresPack === null || defs.hasPack(i.requiresPack))
    .map((item) => {
      const current = meta.shop.purchased[String(item.item)] ?? 0;
      const next = item.levels[current] ?? null;
      const blockedBy = item.requiresItems.filter((req) => {
        const reqDef = defs.reader('shopItem').get(String(req));
        return (meta.shop.purchased[String(req)] ?? 0) < reqDef.levels.length;
      });
      return {
        item,
        currentLevel: current,
        nextLevel: next,
        affordable: next !== null && meta.points >= next.cost,
        blockedBy,
      };
    });
}

export type PurchaseResult =
  | { readonly ok: true; readonly meta: MetaState }
  | { readonly ok: false; readonly reason: string };

export function purchase(
  itemId: ShopItemId, meta: MetaState, defs: DefinitionRegistry,
): PurchaseResult {
  const entry = catalog(meta, defs).find((e) => e.item.item === itemId);
  if (entry === undefined) return { ok: false, reason: '品項不存在或未啟用' };
  if (entry.nextLevel === null) return { ok: false, reason: '已購滿' };
  if (entry.blockedBy.length > 0) return { ok: false, reason: '前置品項未購滿' };
  if (meta.points < entry.nextLevel.cost) return { ok: false, reason: '輪迴點數不足' };

  return {
    ok: true,
    meta: {
      ...meta,
      points: meta.points - entry.nextLevel.cost,
      shop: {
        purchased: {
          ...meta.shop.purchased,
          [String(itemId)]: entry.currentLevel + 1,
        },
      },
      stats: {
        ...meta.stats,
        pointsSpentTotal: meta.stats.pointsSpentTotal + entry.nextLevel.cost,
      },
    },
  };
}

/** 全部現算，不快取 —— 加一個品項不需要 migration（09 §1.2）。 */
export function shopLimits(meta: MetaState, defs: DefinitionRegistry): ShopLimits {
  const aptCost = defs.single('aptitudeCost');
  const caps: Record<string, AptitudeGrade> = {};
  for (const a of ATTRS) caps[a] = aptCost.defaultGrade;
  let aptitudePoints = 0;
  let talentPoints = 0;
  let careerCap = defs.single('gameRules').careerCapBase;
  const unlockedTalents: TalentId[] = [];
  const factionBonds: Record<string, number> = {};

  for (const item of defs.reader('shopItem').all()) {
    for (const lv of boughtLevels(item, meta)) {
      const g = lv.grant;
      if (g.kind === 'aptitudeCap') {
        const cur = caps[g.attr] ?? aptCost.defaultGrade;
        caps[g.attr] = APTITUDE_GRADES.indexOf(g.toGrade) > APTITUDE_GRADES.indexOf(cur)
          ? g.toGrade : cur;
      } else if (g.kind === 'careerCap') careerCap += g.delta;
      else if (g.kind === 'aptitudePoints') aptitudePoints += g.delta;
      else if (g.kind === 'talentPoints') talentPoints += g.delta;
      else if (g.kind === 'unlockTalent') unlockedTalents.push(g.talentId);
      else if (g.kind === 'factionBond') {
        factionBonds[String(g.faction)] = Math.max(
          factionBonds[String(g.faction)] ?? 0, g.toLevel,
        );
      }
    }
  }

  return {
    aptitudeCaps: caps as Record<Attr, AptitudeGrade>,
    aptitudePoints,
    talentPoints,
    unlockedTalents,
    factionBonds,
    careerCap: Math.min(careerCap, defs.reader('careerRank').all().length / 2),
  };
}

export function shopEffectRefs(meta: MetaState, defs: DefinitionRegistry): readonly EffectRef[] {
  const out: EffectRef[] = [];
  for (const item of defs.reader('shopItem').all()) {
    for (const lv of boughtLevels(item, meta)) {
      if (lv.grant.kind === 'effect') out.push(lv.grant.ref);
    }
  }
  return out;
}

/** 工廠：商店買到的局內效果（升階機率等）。 */
export function shopEffectSource(): EffectSource {
  return {
    collect(ctx: RunContext): readonly ResolvedEffectRef[] {
      return shopEffectRefs(ctx.state.metaSnapshot, ctx.defs)
        .map((r, i) => ({ ...r, sourceId: `shop#${i}` }));
    },
  };
}

export const bondOf = (
  faction: FactionId, meta: MetaState, defs: DefinitionRegistry,
): number => shopLimits(meta, defs).factionBonds[String(faction)] ?? 0;
