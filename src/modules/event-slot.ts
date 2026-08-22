// ⑰ 事件槽。0–3 個、與鍛鍊互斥（選了事件本回合就不鍛鍊）、產貨幣＋少量四維（17）。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type {
  EventDef, EventPractice, EventReward, EventYieldCurveDef,
} from '../contracts/core/definitions.js';
import type { EventDefId, L10nKey } from '../contracts/core/ids.js';
import { targetId } from '../contracts/core/ids.js';
import type {
  AttrGain, EventOffer, EventSlotState, OptionState, RunState, TurnAction,
} from '../contracts/core/state.js';
import type { EffectResolver } from './effect.js';
import { evaluateCondition } from './effect-core.js';
import { addAffinity, markChainFired } from './roster.js';
import { pendingChainEvents } from './roster-query.js';
import { preview, resolveCheck, specForMinor } from './check.js';
import { statQuery, type StatWriter } from './stats.js';

const readStat = statQuery.read.bind(statQuery);

const yieldCurve = (ctx: RunContext): EventYieldCurveDef => ctx.defs.single('eventYieldCurve');

/** 本章的縮放倍率。四維與貨幣共用 —— 兩者是同一件事的兩面（見 EventYieldCurveDef）。 */
const chapterScale = (ctx: RunContext): number => {
  const c = yieldCurve(ctx);
  return c.chapterMultiplier[ctx.state.progress.chapter - 1] ?? c.chapterMultiplier.at(-1) ?? 1;
};

/** 供 15 組合出「本回合的動作」。本模組只回報自己這一半（15 §2.1）。 */
export const resolvedAction = (ctx: RunContext): TurnAction | null => {
  const r = ctx.state.slots.event.resolved;
  return r === null
    ? null
    : { kind: 'event', offerIndex: r.offerIndex, optionIndex: r.optionIndex };
};

/**
 * 事上磨練的產出（17 §6.2）。乘法鏈的形狀刻意與 16 §4 對齊：
 *
 *   amount = baseByAttr[attr] × chapterMultiplier[chapter−1] × weight × ratio
 *
 * `ratio` 是檢定結果的折扣：成功 1、失敗 failRatio。
 * 沒有光階、沒有名士站位 —— 那兩者只屬於鍛鍊槽（GDD §4.2）。
 * 這裡是【做事的收穫】，穩定但小；鍛鍊才是會爆發的那一邊。
 */
export function practiceYield(
  practice: readonly EventPractice[], ratio: number, ctx: RunContext, fx: EffectResolver,
): readonly AttrGain[] {
  const c = yieldCurve(ctx);
  const chapterMul = chapterScale(ctx);
  return practice.map((p) => {
    const raw = (c.baseByAttr[p.attr] ?? 0) * chapterMul * p.weight * ratio;
    return {
      attr: p.attr,
      amount: Math.round(fx.resolve(targetId(`event.practice.${p.attr}`), raw, ctx)),
    };
  }).filter((g) => g.amount > 0);
}

/**
 * 可抽池。純函式且獨立匯出 —— 門檻過濾的正確性是本模組最需要測試的部分（17 §3）。
 * 「不足就少、完全不符就 0」是門檻設計最直觀的體現。
 */
export function eligiblePool(ctx: RunContext): readonly EventDef[] {
  const seen = new Set(ctx.state.slots.event.seenUniqueIds.map(String));
  const chainReady = new Set(pendingChainEvents(ctx).map((p) => {
    const def = ctx.defs.reader('notable').get(String(p.id));
    return String(def.eventChain.find((c) => c.stage === p.stage)?.eventDefId ?? '');
  }));

  return ctx.defs.reader('event').all().filter((e) => {
    if (e.unique && seen.has(String(e.eventDefId))) return false;
    if (e.eventKind === 'faction' && ctx.state.faction === null) return false;
    // 名士事件：必須在陣容中且好感度已達對應階段
    if (e.eventKind === 'notable' && !chainReady.has(String(e.eventDefId))) return false;
    return e.requirements.every((c) => evaluateCondition(c, ctx, readStat));
  });
}

export function optionStates(
  offer: EventOffer, ctx: RunContext, fx: EffectResolver,
): readonly OptionState[] {
  const def = ctx.defs.reader('event').get(String(offer.eventDefId));
  const chapterIdx = ctx.state.progress.chapter - 1;
  return def.options.map((o) => {
    const unmet = o.requirements.filter((c) => !evaluateCondition(c, ctx, readStat));
    let rate: number | null = null;
    if (o.check !== null) {
      const curveDef = ctx.defs.reader('dcCurve').get(String(o.check.dcCurveId));
      const dc = curveDef.byChapter[chapterIdx] ?? curveDef.byChapter.at(-1) ?? 0;
      rate = preview(specForMinor(o.check.attr, dc), [], ctx, fx).successRate;
    }
    return {
      enabled: unmet.length === 0,
      blockedReasonKeys: unmet.map(() => ('rejection.threshold.not-met' as L10nKey)),
      successRate: rate,
      practicePreview: practiceYield(o.practice, 1, ctx, fx),
    };
  });
}

export function draw(ctx: TurnContext, fx: EffectResolver): EventSlotState {
  const rules = ctx.defs.single('gameRules');
  const max = Math.max(0, rules.eventSlotMax + fx.eventDrawAdd(ctx));
  let pool = [...eligiblePool(ctx)];
  const offers: EventOffer[] = [];

  while (offers.length < max && pool.length > 0) {
    const chosen = ctx.rng.weighted('event.draw',
      pool.map((e) => ({ item: e, weight: e.weight })));
    pool = pool.filter((e) => e.eventDefId !== chosen.eventDefId);
    const params: Record<string, L10nKey> = {};
    for (const slot of chosen.paramSlots) {
      const p = ctx.defs.reader('paramPool').get(String(slot.poolId));
      params[slot.name] = ctx.rng.pick('event.params', p.entries);
    }
    const base: EventOffer = { eventDefId: chosen.eventDefId, params, optionStates: [] };
    offers.push({ ...base, optionStates: optionStates(base, ctx, fx) });
  }

  return {
    offers,
    resolved: null,
    seenUniqueIds: ctx.state.slots.event.seenUniqueIds,
  };
}

// 沒有 skip。一回合只能投一個動作，「不做事件」＝改選鍛鍊（15 §2、17 §1.1）。
// 保留一個什麼都不做的動作，等於給玩家一個永遠不該按的按鈕。

function applyRewards(
  rewards: readonly EventReward[], eventKind: string, ownerId: EventDefId | null,
  ctx: RunContext, fx: EffectResolver, writer: StatWriter,
): RunState {
  const mul = fx.eventRewardMul(eventKind, ctx);
  // 門檻貨幣隨章節放大；四維與好感度不隨（17 §6.4）。
  //   fame／merit  對照的是官階門檻（30 → 1830），必須跟著長，否則後段委託等於白做
  //   attr         劇情級的一次性躍升，作者手寫、刻意不縮放
  //   affinity     好感度是 0..100 的有界軸，縮放會直接爆掉階段判定
  const scale = chapterScale(ctx);
  let state = ctx.state;
  for (const r of rewards) {
    const c: RunContext = { state, defs: ctx.defs };
    const amount = Math.round(r.amount * mul);
    const scaled = Math.round(r.amount * mul * scale);
    if (r.kind === 'fame') state = writer.grantFame(r.fame, scaled, c);
    else if (r.kind === 'merit') state = writer.grantMerit(r.merit, scaled, c);
    else if (r.kind === 'attr') state = writer.grantAttr(r.attr, amount, c);
    else if (r.kind === 'affinity') {
      const target = r.notableId ?? c.state.roster.members[0]?.notableId ?? null;
      if (target !== null) state = addAffinity(target, amount, c);
    }
  }
  void ownerId;
  return state;
}

export interface EventResult {
  readonly state: RunState;
  readonly passed: boolean;
  readonly practiceGained: readonly AttrGain[];
}

export function selectOption(
  offerIndex: number, optionIndex: number,
  ctx: TurnContext, fx: EffectResolver, writer: StatWriter,
): EventResult {
  const offer = ctx.state.slots.event.offers[offerIndex];
  if (offer === undefined) throw new Error(`事件槽位不存在: ${offerIndex}`);
  const def = ctx.defs.reader('event').get(String(offer.eventDefId));
  const option = def.options[optionIndex];
  if (option === undefined) throw new Error(`選項不存在: ${optionIndex}`);

  let passed = true;
  if (option.check !== null) {
    const curveDef = ctx.defs.reader('dcCurve').get(String(option.check.dcCurveId));
    const dc = curveDef.byChapter[ctx.state.progress.chapter - 1]
      ?? curveDef.byChapter.at(-1) ?? 0;
    passed = resolveCheck(specForMinor(option.check.attr, dc), [], ctx, fx).passed;
  }

  // 小檢定失敗只是沒獎勵，絕不寫入 ending（17 §9-5）
  let state = ctx.state;
  if (passed) {
    state = applyRewards(option.rewards, def.eventKind, null, ctx, fx, writer);
    if (option.moralDelta !== 0) {
      state = writer.grantFame('moral', option.moralDelta, { state, defs: ctx.defs });
    }
  }

  // 事上磨練：無論成敗都給，失敗時打 failRatio 折（17 §6.3）。
  // 一回合只能投一個動作，若失敗＝顆粒無收，事件在高 DC 下會被鍛鍊完全支配，
  // 整個事件系統會死掉。這個下限是單動作回合制逼出來的，不是慈悲。
  const ratio = passed ? 1 : yieldCurve(ctx).failRatio;
  const practiceGained = practiceYield(option.practice, ratio, ctx, fx);
  for (const g of practiceGained) {
    state = writer.grantAttr(g.attr, g.amount, { state, defs: ctx.defs });
  }

  // 名士事件：標記該階段已觸發
  if (def.eventKind === 'notable' && def.ownerNotable !== null) {
    const owner = ctx.defs.reader('notable').get(String(def.ownerNotable));
    const stage = owner.eventChain.find((c) => c.eventDefId === def.eventDefId)?.stage;
    if (stage !== undefined) state = markChainFired(def.ownerNotable, stage, { state, defs: ctx.defs });
  }

  const seen = def.unique
    ? [...state.slots.event.seenUniqueIds, def.eventDefId]
    : state.slots.event.seenUniqueIds;

  return {
    passed,
    practiceGained,
    state: {
      ...state,
      slots: {
        ...state.slots,
        event: {
          ...state.slots.event,
          seenUniqueIds: seen,
          resolved: { offerIndex, optionIndex, passed, practiceGained },
        },
      },
    },
  };
}
