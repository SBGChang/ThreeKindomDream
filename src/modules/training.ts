// ⑯ 固定事件（原「鍛鍊槽」）。兩層 RNG、名士站位、產四維與少量功績（16）。
//
// 這是玩家在一個回合裡【唯一的第一個決定】：四維各一格，擇一投入。
// 委託不在這裡 —— 它是選完之後跳出來的（⑰），玩家不選它。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type { GlowTierDef, TrainingCurveDef } from '../contracts/core/definitions.js';
import type { NotableId } from '../contracts/core/ids.js';
import type {
  Attr, CareerLine, GlowTier, SlotIndex, StatPath,
} from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import type { MeritGain, RunState, TrainingSlot } from '../contracts/core/state.js';
import { targetId } from '../contracts/core/ids.js';
import type { EffectResolver } from './effect.js';
import { careerService } from './career.js';
import { distributeSlots, gainAffinity, trainingMultiplier } from './roster.js';
import { rollCommissionFlag, rollEncounterFlag } from './commission.js';
import { grantExp } from './growth.js';
import { statQuery, type StatWriter } from './stats.js';

const curve = (ctx: RunContext): TrainingCurveDef => ctx.defs.single('trainingCurve');
const tiers = (ctx: RunContext): readonly GlowTierDef[] =>
  ctx.defs.reader('glowTier').all().slice().sort((a, b) => a.order - b.order);

/**
 * 純函式：把 shiftSteps 套到光階權重上。
 * 語意固定在 code —— 每一步把 stepRatio 比例的權重由最低非零階移轉至次高階（16 §2.1）。
 * ⚠️ GDD §5.2 的「±N 檔」對應到 stepRatio 的具體數值尚未定案。
 */
export function applyShift(
  weights: readonly number[], shiftSteps: number, stepRatio: number,
): readonly number[] {
  const w = [...weights];
  const steps = Math.trunc(shiftSteps);
  const dir = steps >= 0 ? 1 : -1;
  for (let s = 0; s < Math.abs(steps); s += 1) {
    const from = dir > 0
      ? w.findIndex((x) => x > 0)
      : w.length - 1 - [...w].reverse().findIndex((x) => x > 0);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= w.length) break;
    const move = (w[from] ?? 0) * stepRatio;
    w[from] = (w[from] ?? 0) - move;
    w[to] = (w[to] ?? 0) + move;
  }
  return w;
}

function rollBaseGlow(attr: Attr, ctx: TurnContext, fx: EffectResolver): GlowTier {
  const all = tiers(ctx);
  const shift = fx.glowTierShift(attr, ctx) + aptitudeShift(attr, ctx);
  const shifted = applyShift(all.map((t) => t.baseWeight), shift, curve(ctx).shiftStepRatio);
  const entries = all.map((t, i) => ({ item: t.tier, weight: Math.max(0, shifted[i] ?? 0) }));
  return ctx.rng.weighted('glow.base', entries);
}

function aptitudeShift(attr: Attr, ctx: RunContext): number {
  const grade = ctx.state.config.aptitudes[attr];
  const def = ctx.defs.reader('aptitudeGrade').all().find((g) => g.grade === grade);
  return def?.shiftSteps ?? 0;
}

function aptitudeMul(attr: Attr, ctx: RunContext): number {
  const grade = ctx.state.config.aptitudes[attr];
  const def = ctx.defs.reader('aptitudeGrade').all().find((g) => g.grade === grade);
  return def?.yieldMul ?? 1;
}

/**
 * 四個格子，一維一格，順序即 `ATTRS`（16 §2）。
 *
 * 一格帶四個【選之前就看得見】的訊號（15 §3）★
 *   baseGlow      保底光階（升階留到選完才揭曉 —— 那是驚喜不是資訊）
 *   notables      誰站在這格
 *   hasCommission 選了會不會有委託
 *   hasEncounter  選了會不會有人物事件
 *
 * 旗標在這裡擲 —— 兩段抽取的第一段。內容則要等到選定之後（⑧）。
 * 順序固定：先站位（notable.slot）、再逐格光階（glow.base）、
 * 最後逐格兩個旗標（slot.flag）。改動即破壞可重播。
 */
export function generate(ctx: TurnContext, fx: EffectResolver): readonly TrainingSlot[] {
  const phase = ctx.state.progress.phase;
  const actions = ctx.defs.reader('trainingAction').where((a) => a.phase === phase);
  const placed = distributeSlots(ctx, fx);

  const partial = ATTRS.map((attr, i) => {
    const action = actions.find((a) => a.attr === attr);
    if (action === undefined) throw new Error(`缺少 ${phase}/${attr} 的固定事件定義`);
    return {
      attr,
      labelKey: action.labelKey,
      subtitleKey: ctx.rng.pick('event.params', action.subtitleKeys),
      baseGlow: rollBaseGlow(attr, ctx, fx),
      notables: placed[i] ?? [],
    };
  });

  return partial.map((p) => ({
    ...p,
    hasCommission: rollCommissionFlag(p.attr, p.notables, ctx, fx),
    hasEncounter: rollEncounterFlag(p.attr, p.notables, ctx, fx),
  }));
}

/**
 * 格子卡要的全部資訊（15 §3.3）★
 *
 * 【不含升階率與名士倍率】—— `expectedGain` 本身就是倍率的結果，
 * 再寫一個 ×N.NN 只是把同一件事說兩遍；而升階是選完之後的那一下驚喜，
 * 先講機率反而把它變成一個要計算的東西。
 */
export interface TrainingPreview {
  readonly attr: Attr;
  readonly baseGlow: GlowTier;
  /** 保底光階下的四維產出。名士倍率已經算進去了。 */
  readonly expectedGain: number;
  /** 固定事件自己的功績產出。走哪一條線也一起給出來 —— 那是生涯選擇。 */
  readonly meritGain: MeritGain;
  readonly notableCount: number;
  readonly hasCommission: boolean;
  readonly hasEncounter: boolean;
}

/**
 * 本回合是否已投入固定事件。⑮ 靠這個查詢宣告規則，而不是直接讀 `turn`
 * —— slice 有擁有者，跨 slice 讀取由紀律門禁擋下（interfaces §8）。
 */
export const hasSelected = (ctx: RunContext): boolean => ctx.state.turn.selected !== null;

export const slotAt = (index: SlotIndex, ctx: RunContext): TrainingSlot => {
  const slot = ctx.state.turn.slots[index];
  if (slot === undefined) throw new Error(`固定事件不存在: ${index}`);
  return slot;
};

export function preview(index: SlotIndex, ctx: RunContext, fx: EffectResolver): TrainingPreview {
  const slot = slotAt(index, ctx);
  return {
    attr: slot.attr,
    baseGlow: slot.baseGlow,
    expectedGain: computeGain(slot.attr, slot.baseGlow, slot.notables, ctx, fx),
    meritGain: shownMerit(computeMerit(slot.attr, ctx, fx), ctx, fx),
    notableCount: slot.notables.length,
    hasCommission: slot.hasCommission,
    hasEncounter: slot.hasEncounter,
  };
}

/**
 * 官階抬高的 base（21 §3）。訓練設施升級的語意 ——【相加】不是再乘一層倍率。
 *
 * 本行全額、另一行打折（`crossLineRatio`）。純本行的話，武官八階想轉練文政時
 * base 只有新兵水準，轉換道路的代價過重；打折共用之後，
 * 「我已經是個大官」這件事本身也值一點，只是本行值更多。
 */
function rankBaseAdd(attr: Attr, ctx: RunContext): number {
  const own = statQuery.lineOf(attr, ctx);
  const other: CareerLine = own === 'civil' ? 'martial' : 'civil';
  const ratio = curve(ctx).crossLineRatio;
  return careerService.rankOf(own, ctx).trainingBaseAdd
    + careerService.rankOf(other, ctx).trainingBaseAdd * ratio;
}

function computeGain(
  attr: Attr, tier: GlowTier, notables: readonly NotableId[],
  ctx: RunContext, fx: EffectResolver,
): number {
  const c = curve(ctx);
  const glow = tiers(ctx).find((t) => t.tier === tier);
  if (glow === undefined) throw new Error(`光階不存在: ${tier}`);
  const chapterMul = c.chapterMultiplier[ctx.state.progress.chapter - 1] ?? 1;
  // 同框的基礎值加在【乘法鎄之前】，與官階同一層（⑦ §4.3）——
  // 走乘法會與光階、名士倍率複合成指數，一回合就把四維推上限。
  const base = (c.baseByAttr[attr] ?? 0) + rankBaseAdd(attr, ctx)
    + fx.slotBaseAdd(attr, notables, ctx);
  const raw = base * chapterMul * glow.yieldMul * aptitudeMul(attr, ctx)
    * fx.gainMul(attr, ctx) * trainingMultiplier(notables, attr, ctx, fx);
  const withFx = fx.resolve(targetId(`training.exp.${attr}`), raw, ctx);
  const noGlowBonus = tier === 'none'
    ? withFx * fx.resolve(targetId('training.noGlowBonus'), 0, ctx)
    : 0;
  return Math.round(withFx + noGlowBonus);
}

/**
 * 固定事件的功績（16 §4.2）。刻意【不吃光階、不吃名士倍率】——
 * 那兩者是四維的獎勵。功績只隨章節放大，因為它對照的是官階門檻。
 *
 * 這是玩家對官途的主導權：選武統的格子就是在爬武功，選智政就是在爬文功。
 * 若功績全由抽出來的委託決定，生涯方向會變成純運氣。
 */
function computeMerit(attr: Attr, ctx: RunContext, fx: EffectResolver): MeritGain {
  const c = curve(ctx);
  const chapterMul = c.chapterMultiplier[ctx.state.progress.chapter - 1] ?? 1;
  const raw = (c.meritByAttr[attr] ?? 0) * chapterMul;
  const line = statQuery.lineOf(attr, ctx);
  return {
    line,
    amount: Math.round(fx.resolve(targetId(`training.merit.${attr}`), raw, ctx)),
  };
}

/**
 * 玩家【最後真的會拿到】的功績 ★
 *
 * `StatWriter.grantMerit` 之後還會再乘一次貨幣倍率，因此 `computeMerit`
 * 的回傳值不是卡面該印的數字。卡面承諾「直接寫最後給的數值」——
 * 少乘這一層，陣容裡只要有一位「事件武功結算 +10%」的名士，畫面就開始說謊。
 */
const shownMerit = (g: MeritGain, ctx: RunContext, fx: EffectResolver): MeritGain => ({
  line: g.line,
  amount: Math.round(g.amount * fx.currencyMul(`merit.${g.line}`, ctx)),
});

/**
 * 第二層：升階判定，選擇後才揭曉（16 §2.2）。
 *
 * 這一步結算三件事：四維、功績、站位名士的好感度。
 * 【委託不在這裡】—— 它由 ⑰ 依本次的最終光階抽出，因此必須在這之後（17 §2.2）。
 */
export function select(
  index: SlotIndex, ctx: TurnContext, fx: EffectResolver, writer: StatWriter,
): RunState {
  const slot = slotAt(index, ctx);

  const all = tiers(ctx);
  const baseOrder = all.find((t) => t.tier === slot.baseGlow)?.order ?? 0;
  const chance = curve(ctx).upgradeBaseChance + fx.glowUpgradeChance(slot.attr, ctx);
  const upgraded = ctx.rng.chance('glow.upgrade', chance);
  const finalOrder = upgraded ? Math.min(all.length - 1, baseOrder + 1) : baseOrder;
  const finalTier = all.find((t) => t.order === finalOrder)?.tier ?? slot.baseGlow;

  const gained = computeGain(slot.attr, finalTier, slot.notables, ctx, fx);
  const merit = computeMerit(slot.attr, ctx, fx);

  // RFC-01 D32：產出是【經驗】，不是屬性點。屬性只能經 ㉜ 花經驗買 ——
  // 這一行就是「玩家終於有一個分配決策」的全部技術內容。
  let next = grantExp(slot.attr, gained, ctx);
  next = writer.grantMerit(merit.line, merit.amount, { state: next, defs: ctx.defs });
  next = gainAffinity(slot.notables, { state: next, defs: ctx.defs }, fx);
  // 留下的是【實際入帳】的數字，與卡面預覽同一個值。
  const meritLogged = shownMerit(merit, ctx, fx);

  return {
    ...next,
    turn: {
      ...next.turn,
      selected: index,
      training: {
        finalGlow: finalTier, upgraded, attr: slot.attr, expGained: gained,
        meritGained: meritLogged,
      },
    },
  };
}
