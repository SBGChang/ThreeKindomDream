import {itemPrice} from './equipment.js';
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { ItemId } from '../contracts/core/ids.js';
import type { MarketOffer, RunState } from '../contracts/core/state.js';
import { balance, economyRule, purse, transact } from './economy.js';
import {
  acquire,
  heldCount,
  itemCodex,
  addFragments,
  discovered,
} from './item.js';

export const canManage = (ctx: RunContext) =>
  ctx.state.ending === null &&
  shelf(ctx).chapter === ctx.state.progress.chapter &&
  (purse(ctx).chapterCamp ||
    (!ctx.state.progress.pendingFactionChoice &&
      !ctx.state.progress.pendingSuperiorAssign)) &&
  ctx.state.turn.pending.length === 0 &&
  (ctx.state.campaign === null || ctx.state.campaign.phase === 'configuring');
export const shelf = (ctx: RunContext) => purse(ctx).market;
export function marketLevel(
  kind: 'marketSlots' | 'marketQuality',
  ctx: RunContext,
): number {
  return ctx.defs
    .reader('shopItem')
    .all()
    .reduce(
      (level, item) =>
        Math.max(
          level,
          ...item.levels
            .slice(
              0,
              ctx.state.metaSnapshot.shop.purchased[String(item.item)] ?? 0,
            )
            .filter((x) => x.grant.kind === kind)
            .map((x) => x.level),
        ),
      0,
    );
}
const maxRarity = (ctx: RunContext) =>
  economyRule(ctx).shopChapterCaps[
    Math.min(
      ctx.state.progress.chapter,
      economyRule(ctx).shopChapterCaps.length,
    ) - 1
  ]!;
const eligible = (ctx: RunContext) =>
  ctx.defs
    .reader('item')
    .all()
    .filter(
      (d) =>
        d.rarity <= maxRarity(ctx) &&
        (d.perRunCap > 1 || discovered(d.itemId, ctx)) &&
        !(
          itemCodex.nextCost(d.itemId, ctx.state.metaSnapshot, ctx.defs) ===
            null && heldCount(d.itemId, ctx) > 0
        ),
    );
export function refresh(ctx: TurnContext): RunState {
  if (shelf(ctx).chapter === ctx.state.progress.chapter) return ctx.state;
  const rule = economyRule(ctx),
    weights = rule.shopWeights[marketLevel('marketQuality', ctx)]!;
  const count = rule.shopSlots[marketLevel('marketSlots', ctx)]! - 1;
  let pool = eligible(ctx);
  const offers: MarketOffer[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const rarities = [...new Set(pool.map((d) => d.rarity))]
      .map((r) => ({ item: r, weight: weights[r - 1]! }))
      .filter((x) => x.weight > 0);
    if (!rarities.length) break;
    const rarity = ctx.rng.weighted('market.stock', rarities);
    const chosen = ctx.rng.pick(
      'market.stock',
      pool.filter((d) => d.rarity === rarity),
    );
    offers.push({
      id: ctx.state.progress.chapter + '/' + i,
      itemId: chosen.itemId,
      price: rule.itemPrices[rarity - 1]!,
      bought: false,
    });
    pool = pool.filter((d) => d.itemId !== chosen.itemId);
  }
  const oldTarget = shelf(ctx).target;
  const target =
    oldTarget && fragmentTargets(ctx).some((x) => x.itemId === oldTarget)
      ? oldTarget
      : null;
  return {
    ...ctx.state,
    economy: {
      ...purse(ctx),
      market: {
        chapter: ctx.state.progress.chapter,
        offers,
        target,
        fragmentBought: false,
      },
    },
  };
}
export function fragmentTargets(ctx: RunContext) {
  return ctx.defs
    .reader('item')
    .all()
    .filter(
      (d) =>
        d.rarity <= maxRarity(ctx) &&
        discovered(d.itemId, ctx) &&
        itemCodex.nextCost(d.itemId, ctx.state.metaSnapshot, ctx.defs) !== null,
    );
}
export function selectTarget(id: ItemId, ctx: RunContext): RunState {
  if (
    !canManage(ctx) ||
    shelf(ctx).fragmentBought ||
    !fragmentTargets(ctx).some((d) => d.itemId === id)
  )
    return ctx.state;
  return {
    ...ctx.state,
    economy: { ...purse(ctx), market: { ...shelf(ctx), target: id } },
  };
}
export function buy(
  id: string,
  ctx: RunContext,
): { state: RunState; ok: boolean } {
  const row = shelf(ctx).offers.find((x) => x.id === id);
  if (!canManage(ctx) || !row || row.bought || balance(ctx) < itemPrice(row.price,ctx))
    return { state: ctx.state, ok: false };
  const paid = transact('market/' + id, -itemPrice(row.price,ctx), '購買道具', ctx);
  if (paid === ctx.state) return { state: ctx.state, ok: false };
  const received = acquire(row.itemId, { ...ctx, state: paid }, 'market').state;
  return {
    ok: true,
    state: {
      ...received,
      economy: {
        ...purse({ ...ctx, state: received }),
        market: {
          ...shelf(ctx),
          offers: shelf(ctx).offers.map((x) =>
            x.id === id ? { ...x, bought: true } : x,
          ),
        },
      },
    },
  };
}
export function buyFragment(ctx: RunContext): { state: RunState; ok: boolean } {
  const market = shelf(ctx),
    item = fragmentTargets(ctx).find((d) => d.itemId === market.target);
  if (!canManage(ctx) || !item || market.fragmentBought)
    return { state: ctx.state, ok: false };
  const cost = economyRule(ctx).fragmentPrices[item.rarity - 1]!;
  if (balance(ctx) < cost) return { state: ctx.state, ok: false };
  const paid = transact(
    'fragment/' + market.chapter,
    -cost,
    '訂購道具碎片',
    ctx,
  );
  if (paid === ctx.state) return { state: ctx.state, ok: false };
  const received = addFragments(item.itemId, 1, { ...ctx, state: paid });
  return {
    ok: true,
    state: {
      ...received,
      economy: {
        ...purse({ ...ctx, state: received }),
        market: { ...market, fragmentBought: true },
      },
    },
  };
}
