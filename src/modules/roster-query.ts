// ⑲ 名士局內狀態 · 唯讀查詢（無 RNG）。
import type { RunContext } from '../contracts/core/context.js';
import type {
  LinkBonusDef, MajorCheckDef, NotableBaseDef,
} from '../contracts/core/definitions.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { AffinityStage, Attr } from '../contracts/core/primitives.js';
import type { RosterMember, RunState } from '../contracts/core/state.js';
import type { EffectResolver } from './effect.js';

export const link = (ctx: RunContext): LinkBonusDef => ctx.defs.single('linkBonus');

export const withRoster = (ctx: RunContext, ms: readonly RosterMember[]): RunState =>
  ({ ...ctx.state, roster: { members: ms } });

export const maxAffinity = (ctx: RunContext): number =>
  ctx.defs.reader('affinityStage').all().reduce((m, s) => Math.max(m, s.max), 0);

export const stageOrder = (ctx: RunContext): readonly AffinityStage[] =>
  ctx.defs.reader('affinityStage').all().slice()
    .sort((a, b) => a.min - b.min).map((s) => s.stage);

export function stageForValue(value: number, ctx: RunContext): AffinityStage {
  const found = ctx.defs.reader('affinityStage').all()
    .find((s) => value >= s.min && value <= s.max);
  if (found === undefined) throw new Error(`好感度 ${value} 落在所有階段之外`);
  return found.stage;
}

export const members = (ctx: RunContext): readonly RosterMember[] => ctx.state.roster.members;

export const rosterIds = (ctx: RunContext): readonly NotableId[] =>
  ctx.state.roster.members.map((m) => m.notableId);

export const inRoster = (id: NotableId, ctx: RunContext): boolean =>
  ctx.state.roster.members.some((m) => m.notableId === id);

/** 某位名士的局內好感值。不在陣容時為 0 —— 那正好等同「好感不夠」。 */
export const affinityOf = (id: NotableId, ctx: RunContext): number =>
  ctx.state.roster.members.find((m) => m.notableId === id)?.affinity ?? 0;

export function stageOf(id: NotableId, ctx: RunContext): AffinityStage {
  const m = ctx.state.roster.members.find((x) => x.notableId === id);
  return stageForValue(m?.affinity ?? 0, ctx);
}

/** 好感階段的序號。跨階比較一律走它 —— 字串比較沒有順序（19 §5.4）。 */
export function stageRank(stage: AffinityStage, ctx: RunContext): number {
  const idx = stageOrder(ctx).indexOf(stage);
  if (idx < 0) throw new Error(`好感階段不存在: ${stage}`);
  return idx;
}

/** 這位名士的好感是否【已達】某階段。事件門檻與站位門檻共用它。 */
export const atLeastStage = (
  id: NotableId, stage: AffinityStage, ctx: RunContext,
): boolean => inRoster(id, ctx) && stageRank(stageOf(id, ctx), ctx) >= stageRank(stage, ctx);

/**
 * 陣容中好感【已達】某階段的人數（19 §5.4）★
 *
 * ⑳ 的 `StatPath` 走這個查詢，因此「陣容中有四位以上知交」可以直接寫成
 * `statGte`，不必為它新開一種 Condition —— 而 roster 仍然只有一個擁有者。
 */
export const countAtStage = (stage: AffinityStage, ctx: RunContext): number =>
  ctx.state.roster.members.filter((m) => atLeastStage(m.notableId, stage, ctx)).length;

/** 候選池 ＝ 所有已載入 pack 的名士聯集，不是一張資料表（19 §2.1）。 */
export const companionCandidates = (ctx: RunContext): readonly NotableId[] =>
  ctx.defs.reader('notable').all().map((n) => n.notableId);

export function superiorCandidates(ctx: RunContext): readonly NotableId[] {
  if (ctx.state.faction === null) return [];
  const faction = ctx.defs.reader('faction').get(String(ctx.state.faction));
  const pool = ctx.defs.reader('notablePool').get(String(faction.superiorPoolId));
  const taken = new Set(rosterIds(ctx).map(String));
  return pool.entries.filter((e) => !taken.has(String(e.notableId))).map((e) => e.notableId);
}

export const baseOf = (id: NotableId, ctx: RunContext): NotableBaseDef =>
  ctx.defs.reader('notable').get(String(id)).base;

/**
 * 單一名士站在某一維格子上的加成（19 §5.1）★
 *
 *   （他自己的 LinkBonus 總和）×（1 ＋ 同格他人的 LinkAmplify）
 *
 * 【全部走效果系統】—— 沒有任何一項繞過好感門檻。0 星那條「所有同框 +10%」
 * 也是一條 `LinkBonus` 解鎖條，因此它一樣要好感 60。
 *
 * 門檻的判斷不在這裡：⑩ 的 EffectSource 在【發放端】就把好感不足者的
 * 站位條濾掉了，所以此處只要相加即可（單一實作處，見 notable-codex.ts）。
 *
 * `standing` 是同格的全部名士 —— 放大條（陳群的九品官人法）要知道還有誰在。
 */
export function notableSlotBonus(
  id: NotableId, attr: Attr, standing: readonly NotableId[],
  ctx: RunContext, fx: EffectResolver,
): number {
  const own = fx.linkBonusPct(id, attr, standing, ctx);
  return own * (1 + fx.linkAmplifyPct(id, standing, ctx));
}

/**
 * 格子倍率 ＝ Π（1 ＋ 各名士的加成） × 同格人數倍率 × 尺寸條，夾在上限以內。
 *
 * 【相乘而非相加】★ 本作要的就是「全員擠進同一格」的爆發感。
 *
 * `slotSizeMul` 是第三個乘項，而且方向可以與 `pileMultiplier` 【相反】：
 * 逍遙津令獎勵單人站格（八百破十萬），pileMultiplier 獎勵人多。
 * 兩者同時存在是刻意的 —— 玩家因此有兩種相斥的站位流派可選。
 */
export function trainingMultiplier(
  slot: readonly NotableId[], attr: Attr, ctx: RunContext, fx: EffectResolver,
): number {
  const lb = link(ctx);
  const product = slot.reduce(
    (acc, id) => acc * (1 + notableSlotBonus(id, attr, slot, ctx, fx)), 1,
  );
  // 人數倍率也【只數已達門檻的人】★
  //
  // 少了這一條，三位好感 20 的名士擠一格照樣給 ×1.4 ——「跨過之前回報是零」
  // 就變成假的，而那句話正是「星階買到的是時間」整個論證的前提。
  // 站在那裡而還沒交上朋友的人，幫不上忙；他只是在那裡。
  const linked = slot.filter((id) => atLeastStage(id, lb.linkStage, ctx));
  const pile = lb.pileMultiplier[linked.length] ?? lb.pileMultiplier.at(-1) ?? 1;
  const sized = fx.slotSizeMul(linked.length, linked, ctx);
  return Math.min(lb.maxSlotMultiplier, product * pile * sized);
}

export function sortieBonus(ids: readonly NotableId[], ctx: RunContext): number {
  const table = link(ctx).checkBonusByStage;
  return ids.reduce(
    (acc, id) => acc + (table[stageOf(id, ctx)] ?? 0) + baseOf(id, ctx).sortieBonus,
    0,
  );
}

/** 排除該檢定的敵方名士 —— 選呂布當玩伴，虎牢關就不能靠他（18 §4）。 */
export function eligibleForSortie(
  check: MajorCheckDef, ctx: RunContext,
): readonly NotableId[] {
  const enemies = new Set(check.enemyNotables.map(String));
  return rosterIds(ctx).filter((id) => !enemies.has(String(id)));
}
