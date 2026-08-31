// ㉝ 戰役。章末的七關自動戰役（33）。
//
// 四條規格是骨架：
//   玩家不操作（D1）      技巧全投在戰前配置上，與前八回合用的是同一種能力
//   跨關不回滿（D10）     風險必須是玩家自己一路打出來的
//   每關都可以走（D4/D5） 沒有及格線 ——【沒有任何一條路能殺死你，
//                          除了你自己按下「再打一關」】
//   不顯示勝率（D8）      你已經打過前幾關，看得到自己剩多少血
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type {
  BattleRuleDef, CampaignDef, CampaignStageDef, EnemyDef, EventReward, SkillDef,
} from '../contracts/core/definitions.js';
import { CHARGES } from '../contracts/core/effects.js';
import type { ChapterId, L10nKey, NotableId, SkillId } from '../contracts/core/ids.js';
import { targetId } from '../contracts/core/ids.js';
import type { Attr } from '../contracts/core/primitives.js';
import type {
  ActiveBuff, BattleLoadout, BattleLogEntry, CampaignState, HostState, RunState,
} from '../contracts/core/state.js';
import * as ability from './ability.js';
import { careerService } from './career.js';
import { consumeCharge, type EffectResolver } from './effect.js';
import { rosterIds, stageOf } from './roster-query.js';
import { statQuery } from './stats.js';

const rule = (ctx: RunContext): BattleRuleDef => ctx.defs.single('battleRule');

export const campaignFor = (chapterId: ChapterId, ctx: RunContext): CampaignDef => {
  const found = ctx.defs.reader('campaign').all()
    .find((c) => String(c.chapterId) === String(chapterId));
  if (found === undefined) throw new Error(`章節缺少戰役: ${String(chapterId)}`);
  return found;
};

export const currentCampaign = (ctx: RunContext): CampaignDef => {
  const st = ctx.state.campaign;
  if (st === null) throw new Error('目前不在戰役中');
  return ctx.defs.reader('campaign').get(String(st.campaignId));
};

export const stageCount = (ctx: RunContext): number => currentCampaign(ctx).stages.length;

export function stageAt(index: number, ctx: RunContext): CampaignStageDef {
  const st = currentCampaign(ctx).stages[index];
  if (st === undefined) throw new Error(`關卡不存在: ${index}`);
  return st;
}

// ── 兩條資源上限（33 §5.1）★ ──────────────────────────
//
// 【血量只能用功績買。經驗買不到血量。】這讓單動作回合制第一次真的有兩邊：
//   鍛鍊 → 經驗 → 數值／特質／技能  ＝ 倍率（你能打多痛）
//   委託 → 功績 → 官階 → 兵量／糧量  ＝ 規模（你能撐多深）
// 兩者相乘，因此都不可缺。
//
// 0.5 那一項自帶防退化底線：純武官的糧量有近八成來自他自己的武官階，
// 所以「零糧秣」不可能出現 —— 不需要另加基底常數。

export interface HostLimits {
  readonly troopsMax: number;
  readonly supplyMax: number;
}

export function hostLimits(ctx: RunContext, fx: EffectResolver): HostLimits {
  const r = rule(ctx);
  const m = careerService.rankOf('martial', ctx).hostScale;
  const c = careerService.rankOf('civil', ctx).hostScale;
  const troops = r.troopsBase * (m + r.crossLineRatio * c);
  const supply = r.supplyBase * (r.crossLineRatio * m + c);
  // 特質經由這兩個 target 抬高上限 —— 不需要為戰役新增任何 FuncType。
  return {
    troopsMax: Math.round(fx.resolve(targetId('battle.troopsMax'), troops, ctx)),
    supplyMax: Math.round(fx.resolve(targetId('battle.supplyMax'), supply, ctx)),
  };
}

const freshHost = (ctx: RunContext, fx: EffectResolver): HostState => {
  const { troopsMax, supplyMax } = hostLimits(ctx, fx);
  return { troops: troopsMax, troopsMax, supply: supplyMax, supplyMax, buffs: [] };
};

// ── 戰前配置（33 §3）──────────────────────────────────

/** 屬敵方者不可派為指揮 —— 沿用 18 §4 的規則。 */
export function eligibleCommanders(ctx: RunContext): readonly NotableId[] {
  const enemies = new Set(currentCampaign(ctx).enemyNotables.map(String));
  return rosterIds(ctx).filter((id) => !enemies.has(String(id)));
}

/**
 * 他有幾招可選 ＝ 星階開放到哪（33 §3.1）★
 *
 * 星階開放選項、好感決定頻率、玩家挑一招 —— 三件事各管一塊，
 * 都不碰他的數值。「名士配置固定」的原則保住，玩家仍然有一個小決定。
 */
export function skillOptionsFor(id: NotableId, ctx: RunContext): readonly SkillId[] {
  const nd = ctx.defs.reader('notable').get(String(id));
  const star = ctx.state.metaSnapshot.notableCodex[String(id)]?.star ?? 0;
  return nd.abilities.skills.filter((r) => r.star <= star).map((r) => r.skillId);
}

export function begin(
  chapterId: ChapterId, ctx: RunContext, fx: EffectResolver,
): RunState {
  const def = campaignFor(chapterId, ctx);
  const st: CampaignState = {
    campaignId: def.campaignId,
    phase: 'configuring',
    loadout: null,
    host: freshHost(ctx, fx),
    clearedStages: 0,
    banked: [],
    log: [],
    rallied: false,
  };
  return { ...ctx.state, campaign: st };
}

/** `loadout` 在此凍結。關卡之間不得更換 —— 張力來自「只能帶著現有狀態往前」。 */
export function configure(loadout: BattleLoadout, ctx: RunContext): RunState {
  const st = ctx.state.campaign;
  if (st === null || st.phase !== 'configuring') throw new Error('戰役已開打，配置已凍結');
  return {
    ...ctx.state,
    campaign: { ...st, loadout, phase: 'awaitingDecision' },
  };
}

// ── 算式（33 §5.2）★ ──────────────────────────────────
//
// 傷害【也按兵量比例算】是刻意的：你造成的傷害來自你帶的兵，武力是倍率。
// 一萬人衝陣比五百人衝陣傷害大。於是整套算式尺度一致 ——
// 官階＝規模、四維＝倍率，兩者相乘；只有 enemyTroopsByRank 一條要校準。

const coefOf = (attrs: Readonly<Record<Attr, number>>, a: Attr, r: BattleRuleDef): number =>
  (attrs[a] ?? 0) / r.actorDivisor;

const playerAttrs = (ctx: RunContext): Readonly<Record<Attr, number>> => ({
  lead: statQuery.attr('lead', ctx), war: statQuery.attr('war', ctx),
  int: statQuery.attr('int', ctx), pol: statQuery.attr('pol', ctx),
});

/**
 * 敵方兵力基準 —— **索引官階，不索引章節**（D25）。
 *
 * 這是 17 6.4 已立的規矩：難度與報酬必須一起長，否則壓低某一線的官階
 * 會變成刷簡單高報酬的農場。取兩線較高者：你有多大本錢，對面就派多大的敵人。
 */
const enemyBase = (ctx: RunContext): number => {
  const r = rule(ctx);
  const lvl = Math.max(
    statQuery.read('career.civil', ctx), statQuery.read('career.martial', ctx),
  );
  return r.enemyTroopsByRank[lvl - 1] ?? r.enemyTroopsByRank.at(-1) ?? 1;
};

/**
 * 我軍每回合的期望輸出（33 §8.1）★
 *
 * 這【不是勝率】—— 它是玩家自己就讀得出來的東西：技能寫著「以兵量的 30%」，
 * 他知道自己的武是多少。把它算好顯示出來，是「情報可見」而不是「盲賭」；
 * 而勝率仍然不給，因為在這個系統裡那個百分比是假的精確。
 *
 * 期望施放次數由 `castChances` 相加得出（1 + 0.6 + 0.3 = 1.9），
 * 指揮則各自乘上他的好感機率。
 */
export function hostPower(ctx: RunContext, fx: EffectResolver): number {
  const st = ctx.state.campaign;
  if (st === null || st.loadout === null) return 0;
  const r = rule(ctx);
  const me = playerAttrs(ctx);
  const troopsMax = st.host.troopsMax;

  const dmgOf = (
    id: SkillId, attrs: Readonly<Record<Attr, number>>, weight: number,
  ): number => {
    const a = ability.skillDef(id, ctx).action;
    if (a.kind !== 'physical' && a.kind !== 'magic') return 0;
    const raw = troopsMax * a.ratio * coefOf(attrs, a.actorAttr, r);
    return fx.resolve(targetId(`battle.damage.${a.kind}`), raw, ctx) * weight;
  };

  const casts = r.castChances.reduce((n, c) => n + c, 0);
  const mine = st.loadout.skills.length === 0 ? 0
    : st.loadout.skills.reduce((n, id) => n + dmgOf(id, me, 1), 0)
      / st.loadout.skills.length * casts;

  const aid = st.loadout.commanders.reduce((n, c) => {
    const nd = ctx.defs.reader('notable').get(String(c.notableId));
    const chance = r.commandChanceByStage[stageOf(c.notableId, ctx)] ?? 0;
    return n + dmgOf(c.skillId, nd.abilities.attrs, chance);
  }, 0);

  return Math.round(mine + aid);
}

/**
 * 糧秣實際能換回多少軍勢（33 §5.3）★
 *
 * **只有帶了恢復招的人算得到它。** 純武系的糧量是死的 ——
 * 這正是「文系靠把池子填回來撐、武系靠大池子撐」那條分工的機制本體：
 * 恢復是有限【資源】，但你得先有人會用它。
 */
export function hostSustain(ctx: RunContext, fx: EffectResolver): number {
  const st = ctx.state.campaign;
  if (st === null || st.loadout === null) return 0;
  const r = rule(ctx);
  const me = playerAttrs(ctx);
  const all = [
    ...st.loadout.skills.map((id) => ({ id, attrs: me })),
    ...st.loadout.commanders.map((c) => ({
      id: c.skillId,
      attrs: ctx.defs.reader('notable').get(String(c.notableId)).abilities.attrs,
    })),
  ];
  const best = all.reduce((n, x) => {
    const a = ability.skillDef(x.id, ctx).action;
    if (a.kind !== 'heal') return n;
    return Math.max(n, coefOf(x.attrs, a.actorAttr, r));
  }, 0);
  if (best <= 0) return 0;
  const raw = (st.host.supply / r.supplyPerTroop) * best;
  return Math.round(fx.resolve(targetId('battle.heal'), raw, ctx));
}

/** 關底敵將那一招的輸出。與雜兵的基本輸出同一把尺（見 §5.2）。 */
const bossHit = (
  enemyTroops: number, ratio: number, coef: number, r: BattleRuleDef,
): number => enemyTroops * r.enemyDamageRatio * ratio * coef;

export interface StagePreview {
  readonly index: number;
  readonly brief: L10nKey;
  readonly enemyTroops: number;
  readonly enemyDamage: number;
  readonly boss: EnemyDef | null;
  readonly rewards: readonly EventReward[];
}

/** 下一關的【情報】。不含勝率（33 §8.1）—— 假的精確比沒有更糟。 */
export function nextStagePreview(ctx: RunContext): StagePreview | null {
  const st = ctx.state.campaign;
  if (st === null || st.clearedStages >= stageCount(ctx)) return null;
  const stage = stageAt(st.clearedStages, ctx);
  const r = rule(ctx);
  const troops = Math.round(enemyBase(ctx) * stage.troopsMul);
  const boss = stage.boss === null ? null : ctx.defs.reader('enemy').get(String(stage.boss));
  // 情報要【含關底敵將那一下】—— 少算它，玩家與模擬器都會低估這一關。
  const extra = boss === null ? 0 : (() => {
    const a = ability.skillDef(boss.skillId, ctx).action;
    return bossHit(troops, a.ratio, coefOf(boss.attrs, a.actorAttr, r), r);
  })();
  return {
    index: st.clearedStages,
    brief: stage.briefKey,
    enemyTroops: troops,
    enemyDamage: Math.round(troops * r.enemyDamageRatio * stage.damageMul + extra),
    boss,
    rewards: stage.rewards,
  };
}

// ── 一關的結算（33 §4）────────────────────────────────

export interface StageOutcome {
  readonly cleared: boolean;
  readonly defeated: boolean;
  readonly log: readonly BattleLogEntry[];
  readonly host: HostState;
  readonly rewards: readonly EventReward[];
}

interface Sim {
  troops: number;
  supply: number;
  enemy: number;
  buffs: ActiveBuff[];
  log: BattleLogEntry[];
  rallied: boolean;
}

const pctOf = (buffs: readonly ActiveBuff[], kind: 'buff' | 'debuff'): number =>
  buffs.filter((b) => b.kind === kind).reduce((a, b) => a + b.mulPct, 0);

/** 抽 n 招，【不重複】—— 否則一個強招會靠重複抽自我放大，三格的意義又塌回去。 */
function pickDistinct(
  pool: readonly SkillId[], n: number, ctx: TurnContext,
): readonly SkillId[] {
  const rest = [...pool];
  const out: SkillId[] = [];
  for (let i = 0; i < n && rest.length > 0; i += 1) {
    const at = ctx.rng.int('battle.pick', 0, rest.length);
    const [taken] = rest.splice(at, 1);
    if (taken !== undefined) out.push(taken);
  }
  return out;
}

function applyCast(
  sim: Sim, def: SkillDef, attrs: Readonly<Record<Attr, number>>,
  actor: BattleLogEntry['actor'], actorKey: L10nKey | null,
  troopsMax: number, turn: number, r: BattleRuleDef,
  ctx: RunContext, fx: EffectResolver, fromHost: boolean,
): void {
  const a = def.action;
  const coef = coefOf(attrs, a.actorAttr, r);
  const magnitude = troopsMax * a.ratio * coef;
  const why: string[] = [`${a.actorAttr} ${Math.round((attrs[a.actorAttr] ?? 0))} → x${coef.toFixed(2)}`];
  let amount = 0;

  if (a.kind === 'physical' || a.kind === 'magic') {
    const buff = pctOf(sim.buffs, 'buff');
    if (buff > 0) why.push(`增益 +${Math.round(buff * 100)}%`);
    // 特質只作用在【我方】的施放上。敵將走同一段程式，因此要擋掉。
    const withTraits = fromHost
      ? fx.resolve(targetId(`battle.damage.${a.kind}`), magnitude, ctx) : magnitude;
    if (withTraits !== magnitude) {
      why.push(`特質 +${Math.round((withTraits / magnitude - 1) * 100)}%`);
    }
    amount = Math.round(withTraits * (1 + buff));
    sim.enemy = Math.max(0, sim.enemy - amount);
  } else if (a.kind === 'heal') {
    // 糧秣是有限資源（D11）。恢復 1 點軍勢消耗 supplyPerTroop 點糧秣 ——
    // 於是【糧量就是「你能把軍隊填回幾成」】（33 §5.3）。
    const room = troopsMax - sim.troops;
    const afford = sim.supply / r.supplyPerTroop;
    const want = fromHost ? fx.resolve(targetId('battle.heal'), magnitude, ctx) : magnitude;
    amount = Math.round(Math.max(0, Math.min(want, room, afford)));
    sim.troops += amount;
    sim.supply = Math.max(0, sim.supply - amount * r.supplyPerTroop);
    if (afford < magnitude) why.push('糧秣不足');
  } else {
    const pct = a.ratio * coef;
    amount = Math.round(pct * 100);
    sim.buffs.push({
      kind: a.kind === 'buff' ? 'buff' : 'debuff',
      mulPct: pct, remaining: a.duration, sourceKey: def.nameKey,
    });
  }

  sim.log.push({
    turn, actor, actorKey, skillKey: def.nameKey, kind: a.kind, amount, why,
    troopsAfter: Math.round(sim.troops), supplyAfter: Math.round(sim.supply),
    enemyAfter: Math.round(sim.enemy),
  });
}

/**
 * 打下一關。收 `TurnContext` —— 本模組唯一需要 RNG 的方法。
 *
 * 每回合固定四步（33 §4）。**先我軍、後敵方**是刻意的：
 * 保底一招一定會發生至少一次，「還沒動手就被清空」在結構上不可能。
 */
export function engage(
  ctx: TurnContext, fx: EffectResolver,
): { readonly state: RunState; readonly outcome: StageOutcome } {
  const st = ctx.state.campaign;
  if (st === null || st.loadout === null) throw new Error('戰役尚未配置');
  if (st.phase === 'resolved') throw new Error('戰役已結束');
  if (st.clearedStages >= stageCount(ctx)) throw new Error('七關已打完');

  const r = rule(ctx);
  const stage = stageAt(st.clearedStages, ctx);
  const loadout = st.loadout;
  const me = playerAttrs(ctx);
  const troopsMax = st.host.troopsMax;
  const enemyTroops = enemyBase(ctx) * stage.troopsMul;
  const enemyHit = enemyTroops * r.enemyDamageRatio * stage.damageMul;
  const boss = stage.boss === null
    ? null : ctx.defs.reader('enemy').get(String(stage.boss));

  const sim: Sim = {
    troops: st.host.troops, supply: st.host.supply, enemy: enemyTroops,
    buffs: [...st.host.buffs], log: [], rallied: st.rallied,
  };

  let turn = 1;
  for (; turn <= r.maxTurns && sim.enemy > 0 && sim.troops > 0; turn += 1) {
    // 1. 我軍施放：先擲次數，再抽哪一招（33 §4.2）
    let casts = 0;
    for (const [i, chance] of r.castChances.entries()) {
      if (i === 0 || ctx.rng.chance('battle.cast', chance)) casts += 1;
    }
    for (const id of pickDistinct(loadout.skills, casts, ctx)) {
      applyCast(
        sim, ability.skillDef(id, ctx), me, 'host', null, troopsMax, turn, r, ctx, fx, true,
      );
    }

    // 2. 指揮傳令：各自獨立擲，機率由好感決定（33 §4.3）
    for (const c of loadout.commanders) {
      const chance = r.commandChanceByStage[stageOf(c.notableId, ctx)] ?? 0;
      if (!ctx.rng.chance('battle.command', chance)) continue;
      const nd = ctx.defs.reader('notable').get(String(c.notableId));
      applyCast(
        sim, ability.skillDef(c.skillId, ctx), nd.abilities.attrs,
        'commander', nd.nameKey, troopsMax, turn, r, ctx, fx, true,
      );
    }
    if (sim.enemy <= 0) break;

    // 3. 敵方行動
    const reduce = Math.min(1, pctOf(sim.buffs, 'debuff'));
    const dealt = Math.round(enemyHit * (1 - reduce));
    sim.troops = Math.max(0, sim.troops - dealt);
    sim.log.push({
      turn, actor: 'enemy', actorKey: boss?.nameKey ?? null, skillKey: null,
      kind: null, amount: dealt,
      why: reduce > 0 ? [`削弱 −${Math.round(reduce * 100)}%`] : [],
      troopsAfter: Math.round(sim.troops), supplyAfter: Math.round(sim.supply),
      enemyAfter: Math.round(sim.enemy),
    });
    if (boss !== null && sim.troops > 0) {
      // 關底敵將的那一招【與雜兵的基本輸出同尺】——
      // 少乘 enemyDamageRatio 的話，第五關的華雄一擊 1587，
      // 對照玩家的 762 兵量是【一回合秒殺】。實測就是這樣死的。
      const bd = ability.skillDef(boss.skillId, ctx);
      const coef = coefOf(boss.attrs, bd.action.actorAttr, r);
      const hit = Math.round(bossHit(enemyTroops, bd.action.ratio, coef, r));
      sim.troops = Math.max(0, sim.troops - hit);
      sim.log.push({
        turn, actor: 'enemy', actorKey: boss.nameKey, skillKey: bd.nameKey,
        kind: bd.action.kind, amount: hit, why: [],
        troopsAfter: Math.round(sim.troops), supplyAfter: Math.round(sim.supply),
        enemyAfter: Math.round(sim.enemy),
      });
    }

    // 4. 原地再起：夠殘忍的機制需要一個稀缺的安全閥（RFC-01 §3.6）
    if (sim.troops <= 0 && !sim.rallied && fx.chargesOf(CHARGES.majorRetry, ctx) > 0) {
      sim.troops = Math.round(troopsMax * r.rallyRatio);
      sim.rallied = true;
      sim.log.push({
        turn, actor: 'host', actorKey: null, skillKey: null, kind: null,
        amount: sim.troops, why: ['天命所歸：原地再起'],
        troopsAfter: sim.troops, supplyAfter: Math.round(sim.supply),
        enemyAfter: Math.round(sim.enemy),
      });
    }

    sim.buffs = sim.buffs
      .map((b) => ({ ...b, remaining: b.remaining - 1 }))
      .filter((b) => b.remaining > 0);
  }

  const cleared = sim.enemy <= 0 && sim.troops > 0;
  const host: HostState = {
    troops: Math.round(sim.troops), troopsMax,
    supply: Math.round(sim.supply), supplyMax: st.host.supplyMax,
    buffs: sim.buffs,
  };
  const outcome: StageOutcome = {
    cleared, defeated: !cleared, log: sim.log, host,
    rewards: cleared ? stage.rewards : [],
  };

  let next: RunState = ctx.state;
  if (sim.rallied && !st.rallied) next = consumeCharge(CHARGES.majorRetry, ctx);
  const campaign: CampaignState = {
    ...st,
    host,
    log: sim.log,
    rallied: sim.rallied,
    clearedStages: cleared ? st.clearedStages + 1 : st.clearedStages,
    banked: cleared ? [...st.banked, ...stage.rewards] : st.banked,
    phase: cleared ? 'awaitingDecision' : 'resolved',
  };
  return { state: { ...next, campaign }, outcome };
}

/**
 * 收兵。`clearedStages === 0` 時【合法】——【按兵不動】，沒有及格線（33 §6.2）。
 *
 * 它拿不到任何獎勵，但章節照過。膽小的懲罰是難看的結局（D7），不是死亡。
 */
export function withdraw(ctx: RunContext): RunState {
  const st = ctx.state.campaign;
  if (st === null || st.phase === 'resolved') throw new Error('戰役已結束');
  return { ...ctx.state, campaign: { ...st, phase: 'resolved' } };
}

export const bankedOf = (ctx: RunContext): readonly EventReward[] =>
  ctx.state.campaign?.banked ?? [];

export const clearedOf = (ctx: RunContext): number => ctx.state.campaign?.clearedStages ?? 0;

export const isComplete = (ctx: RunContext): boolean => {
  const st = ctx.state.campaign;
  return st !== null && (st.phase === 'resolved' || st.clearedStages >= stageCount(ctx));
};

export const clear = (ctx: RunContext): RunState => ({ ...ctx.state, campaign: null });
