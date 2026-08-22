// ⑲ 名士局內狀態 · 唯讀查詢（無 RNG）。
import type { RunContext } from '../contracts/core/context.js';
import type { LinkBonusDef, MajorCheckDef, NotableBaseDef } from '../contracts/core/definitions.js';
import type { NotableId } from '../contracts/core/ids.js';
import type { AffinityStage, Attr } from '../contracts/core/primitives.js';
import type { RosterMember, RunState } from '../contracts/core/state.js';

export const ATTR_ORDER: readonly Attr[] = ['war', 'int', 'pol', 'cha'];

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

export function stageOf(id: NotableId, ctx: RunContext): AffinityStage {
  const m = ctx.state.roster.members.find((x) => x.notableId === id);
  return stageForValue(m?.affinity ?? 0, ctx);
}

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
 * 單一名士站在某一維格子上的加成（19 §5）。
 *
 *   base.trainingBonus                        他本來就會的
 * ＋ base.specialtyBonus（僅專長對位時）        對位加成
 * ＋ trainingBonusByStage[stage]              養出來的
 *
 * 【必須吃 attr】。舊版只看好感度階段，於是開局 ★5 與 ★1 站著一模一樣 ——
 * 「這格有誰站著」不構成資訊，站位就沒有意義。
 */
export function notableSlotBonus(id: NotableId, attr: Attr, ctx: RunContext): number {
  const base = baseOf(id, ctx);
  const staged = link(ctx).trainingBonusByStage[stageOf(id, ctx)] ?? 0;
  return base.trainingBonus + (base.specialty === attr ? base.specialtyBonus : 0) + staged;
}

/**
 * 格子倍率 ＝ Π（1 ＋ 各名士的加成） × 同格人數倍率，夾在 `maxSlotMultiplier` 以內。
 *
 * 【相乘而非相加】★ 這是刻意的：本作要的就是「全員擠進同一格」的爆發感。
 * 相加會把那個時刻壓成一個平淡的加值，等於把整套站位 RNG 最好玩的地方拿掉。
 *
 * 代價是那一回合其他三格會失去意義 —— 但那正是【爆發】的定義，
 * 而且站位是 RNG 決定的、玩家無法安排，所以它是驚喜而不是最優解。
 * 稀有度由分佈保證：六人分四格，全擠一格的機率極低。
 *
 * 上限是資料（`maxSlotMultiplier`），不是程式裡的魔術數字。
 */
export function trainingMultiplier(
  slot: readonly NotableId[], attr: Attr, ctx: RunContext,
): number {
  const lb = link(ctx);
  const product = slot.reduce((acc, id) => acc * (1 + notableSlotBonus(id, attr, ctx)), 1);
  // 同格人數的額外倍率：爆發只放在人多的時候，一兩人同格幾乎不受影響。
  const pile = lb.pileMultiplier[slot.length] ?? lb.pileMultiplier.at(-1) ?? 1;
  return Math.min(lb.maxSlotMultiplier, product * pile);
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

/** 已達階段但尚未觸發的名士事件（給 ⑰ 判斷可抽池）。 */
export function pendingChainEvents(
  ctx: RunContext,
): readonly { id: NotableId; stage: AffinityStage }[] {
  const order = stageOrder(ctx);
  const out: { id: NotableId; stage: AffinityStage }[] = [];
  for (const m of ctx.state.roster.members) {
    const def = ctx.defs.reader('notable').get(String(m.notableId));
    const reached = order.indexOf(stageOf(m.notableId, ctx));
    for (const chain of def.eventChain) {
      if (order.indexOf(chain.stage) > reached) continue;
      if (m.firedStages.includes(chain.stage)) continue;
      out.push({ id: m.notableId, stage: chain.stage });
    }
  }
  return out;
}
