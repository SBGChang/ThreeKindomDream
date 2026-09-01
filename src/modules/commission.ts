// ⑰ 委託與人物事件。一個回合三拍，兩個決定（15 §3）。
//
//   拍一 · 固定事件   必定發生。玩家四選一 —— 這是唯一的「選什麼」。
//   拍二 · 委託       每格獨立 50%（`gameRules.commissionChance`）。
//   拍三 · 人物事件   每格獨立 50%。與委託【沒有從屬關係】。
//
// 【兩段抽取】★ 回合開始時逐格擲「會不會有」，四個旗標全部可見；
// 玩家選定之後才抽「是哪一則」。玩家因此有四件事可以權衡：
// 光階、誰站在這格、會不會有委託、會不會有人物事件。
//
// 為什麼要分兩段：內容若在回合開始就抽好，玩家等於在選一份已知的答案，
// 「選之前看得見」與「選之後有驚喜」就只能二選一。分開之後兩者都成立。
import type { RunContext, TurnContext } from '../contracts/core/context.js';
import type {
  EventDef, EventOptionDef, EventPractice, EventYieldCurveDef, GlowTierDef,
} from '../contracts/core/definitions.js';
import type { EventDefId, ItemId, L10nKey, NotableId } from '../contracts/core/ids.js';
import { targetId } from '../contracts/core/ids.js';
import type { Attr, GlowTier, Rarity } from '../contracts/core/primitives.js';
import { RARITIES } from '../contracts/core/primitives.js';
import type {
  ExpGain, EventOffer, EventResolution, ItemGain, MeritGain, OptionState, RunState,
} from '../contracts/core/state.js';
import { grantBoon, type EffectResolver } from './effect.js';
import { evaluateCondition } from './effect-core.js';
import { acquire, canAcquire, poolCandidates } from './item.js';
import { addAffinity, addAffinityAll, atLeastStage } from './roster.js';
import { preview, resolveCheck, specForMinor } from './check.js';
import { careerService } from './career.js';
import { grantExp } from './growth.js';
import { statQuery, type StatWriter } from './stats.js';

const readStat = statQuery.read.bind(statQuery);

const yieldCurve = (ctx: RunContext): EventYieldCurveDef => ctx.defs.single('eventYieldCurve');

const glowOf = (tier: GlowTier, ctx: RunContext): GlowTierDef => {
  const def = ctx.defs.reader('glowTier').all().find((g) => g.tier === tier);
  if (def === undefined) throw new Error(`光階不存在: ${tier}`);
  return def;
};

/**
 * 委託階級 ＝【該委託所屬官階線的階級】（17 §4）★
 *
 * 不是章節。章節索引讓後期才開始練文政的玩家，拿第 1 章的政去對第 4 章的
 * DC —— 成功率恆為 0%，轉換道路在制度上不可能。
 *
 * 人物事件沒有維度，取兩線較高者 —— 它問的是「你這個人現在什麼身分」。
 */
export function commissionTier(def: EventDef, ctx: RunContext): number {
  if (def.trigger.kind === 'commission') {
    return careerService.rankOf(statQuery.lineOf(def.trigger.attr, ctx), ctx).level;
  }
  return Math.max(
    careerService.rankOf('civil', ctx).level,
    careerService.rankOf('martial', ctx).level,
  );
}

const tierScale = (tier: number, ctx: RunContext): number => {
  const t = yieldCurve(ctx).tierMultiplier;
  return t[tier - 1] ?? t.at(-1) ?? 1;
};

const dcAt = (curveId: string, tier: number, ctx: RunContext): number => {
  const curve = ctx.defs.reader('dcCurve').get(curveId).byTier;
  return curve[tier - 1] ?? curve.at(-1) ?? 0;
};

// ── 第一段：旗標（回合開始，四格各擲一次）─────────────

/**
 * 這一格【選了會不會有委託】（15 §3.1）★
 *
 * 四格各自獨立 —— 因此可能四格全有。玩家只選一格，所以有效觸發率
 * 由玩家決定：一路追驚嘆號約 1−(1−p)^4，一路追光階就只有 p。
 * 功績收入因此是玩家可調的旋鈕，不是系統常數。
 *
 * 保證條（`guarantee`）不是「＋很多％」的簡寫：保證可以拿來計畫，
 * 機率只能拿來期待。它仍然必須擲一次骰 —— 否則「有沒有保證」會改變
 * 擲骰次數，重播就對不上。
 */
export function rollCommissionFlag(
  attr: Attr, standing: readonly NotableId[], ctx: TurnContext, fx: EffectResolver,
): boolean {
  const base = ctx.defs.single('gameRules').commissionChance;
  const mod = fx.commissionChance(attr, standing, ctx);
  const hit = ctx.rng.chance('slot.flag', base + mod.chance);
  return mod.guaranteed || hit;
}

/**
 * 這一格【選了會不會有人物事件】（15 §3.2）★
 *
 * 【旗標不能說謊】：先算可抽池空不空，非空才擲。顯示「有」卻抽不出東西，
 * 比不顯示更糟 —— 玩家會為了那個驚嘆號放棄一格紅光。
 *
 * 委託沒有這個問題（驗證保證每桶非空），人物事件有 —— 它吃 cast 與好感門檻。
 */
export function rollEncounterFlag(
  attr: Attr, standing: readonly NotableId[], ctx: TurnContext, fx: EffectResolver,
): boolean {
  if (encounterPool(ctx).length === 0) return false;
  const base = ctx.defs.single('gameRules').encounterChance;
  const mod = fx.encounterChance(attr, standing, ctx);
  const hit = ctx.rng.chance('slot.flag', base + mod.chance);
  return mod.guaranteed || hit;
}

// ── 第二段：內容（選定之後才抽）─────────────────────

/**
 * 光階 → 委託稀有度（17 §2.2）。
 *
 * 位移（`RarityWeight`）作用在【權重分佈】上，地板（`RarityFloor`）作用在
 * 【抽出的結果】上。兩者分開是刻意的：位移是機率上的偏好，地板是保證 ——
 * 賈詡的「★1／★2 直接升為 ★3」是後者，不是把權重調高。
 */
export function rollRarity(tier: GlowTier, ctx: TurnContext, fx: EffectResolver): Rarity {
  const weights = glowOf(tier, ctx).rarityWeights;
  const shift = fx.rarityShift(ctx);
  const entries = RARITIES
    .map((r, i) => ({ item: r, weight: Math.max(0, shiftedWeight(weights, i, shift)) }))
    .filter((e) => e.weight > 0);
  if (entries.length === 0) {
    throw new Error(`光階 ${tier} 的 rarityWeights 全為零 —— 它抽不到任何委託`);
  }
  const drawn = ctx.rng.weighted('event.rarity', entries);
  const floor = fx.rarityFloor(ctx);
  return drawn >= floor ? drawn : floor;
}

/**
 * 稀有度位移：把權重往高階搬 `shift` 檔（小數合法）。
 *
 * 線性內插而不是整檔跳 —— +0.3 檔要真的是「三成的機會往上挪一格」，
 * 否則作者只能寫整數，而 0.3／0.4 這種細粒度正是名士之間的差異所在。
 *
 * ── 位移【不得開出新的稀有度】★ ────────────────────────
 *
 * 原權重為 0 的那一階，位移之後仍然是 0。少了這一條，+0.3 檔會讓
 * ★5 從 0 變成正權重 —— 而灰盒沒有 ★5 的委託，執行期就會抽到空池。
 *
 * 這不是把問題掩蓋掉：`rarityWeights` 宣告的是「這個光階【搆得到】哪些稀有度」，
 * 位移只在那個範圍內重新分配機率。它因此也讓載入期的靜態可達性分析仍然成立 ——
 * 驗證器算得出來的那組組合，就是執行期真的會抽到的那組。
 */
function shiftedWeight(weights: readonly number[], index: number, shift: number): number {
  const own = weights[index] ?? 0;
  if (shift === 0 || own <= 0) return own;
  const src = index - shift;
  const lo = Math.floor(src);
  const hi = lo + 1;
  const f = src - lo;
  return (weights[lo] ?? 0) * (1 - f) + (weights[hi] ?? 0) * f;
}

/**
 * (維 × 稀有度) 的可抽池（17 §3）。
 *
 * 空池是【程式錯誤】而不是要靜靜處理掉的情況：載入期驗證要求每個可抽到的
 * (維 × 稀有度) 都至少有一則無門檻的委託，因此執行期不可能空（§2.2）。
 *
 * 【人物委託也走這裡】—— 它就是 `requirements` 指名了某位名士 ＋ 好感門檻、
 * 而且 `unique` 的普通委託。不需要第二套抽取機制。
 */
export function commissionPool(
  attr: Attr, rarity: Rarity, ctx: RunContext,
): readonly EventDef[] {
  const seen = new Set(ctx.state.turn.seenUniqueIds.map(String));
  return ctx.defs.reader('event').all().filter((e) => {
    if (e.trigger.kind !== 'commission') return false;
    if (e.trigger.attr !== attr || e.trigger.rarity !== rarity) return false;
    if (e.unique && seen.has(String(e.eventDefId))) return false;
    return e.requirements.every((c) => evaluateCondition(c, ctx, readStat));
  });
}

/**
 * 現在拿得出來的人物事件（19 §6.2）★
 *
 * 三個條件，全部與【同格無關】：
 *   一 · cast 全員在陣容中，且各自好感達到 `minStage`
 *   二 · 同鏈的前一步本輪已經發生過（step 0 無此限制）
 *   三 · 本輪尚未觸發過
 *
 * 鏈的進度【不另存】—— 鏈上的事件一律 `unique`，所以「step N−1 發生過沒有」
 * 就是 `seenUniqueIds` 裡有沒有那一則。第二份真相不存在，也就不會不一致。
 */
export function encounterPool(ctx: RunContext): readonly EventDef[] {
  const seen = new Set(ctx.state.turn.seenUniqueIds.map(String));
  const all = ctx.defs.reader('event').all();
  const firedSteps = new Map<string, number>();
  for (const e of all) {
    if (e.trigger.kind !== 'notable') continue;
    if (!seen.has(String(e.eventDefId))) continue;
    const key = String(e.trigger.chainId);
    firedSteps.set(key, Math.max(firedSteps.get(key) ?? -1, e.trigger.step));
  }

  return all.filter((e) => {
    if (e.trigger.kind !== 'notable') return false;
    if (seen.has(String(e.eventDefId))) return false;
    const prior = firedSteps.get(String(e.trigger.chainId)) ?? -1;
    if (e.trigger.step > prior + 1) return false;
    if (!e.trigger.cast.every((c) => atLeastStage(c.notableId, c.minStage, ctx))) return false;
    return e.requirements.every((c) => evaluateCondition(c, ctx, readStat));
  });
}

function fillParams(def: EventDef, ctx: TurnContext): Readonly<Record<string, L10nKey>> {
  const params: Record<string, L10nKey> = {};
  for (const slot of def.paramSlots) {
    const pool = ctx.defs.reader('paramPool').get(String(slot.poolId));
    params[slot.name] = ctx.rng.pick('event.params', pool.entries);
  }
  return params;
}

const offerOf = (
  def: EventDef, rarity: Rarity, ctx: TurnContext, fx: EffectResolver,
): EventOffer => ({
  eventDefId: def.eventDefId,
  rarity,
  params: fillParams(def, ctx),
  optionStates: optionStates(def, rarity, ctx, fx),
});

/** 抽一則委託。attr 定位池，最終光階定位稀有度。旗標為真時才呼叫。 */
export function drawCommission(
  attr: Attr, tier: GlowTier, ctx: TurnContext, fx: EffectResolver,
): EventOffer {
  const rarity = rollRarity(tier, ctx, fx);
  const pool = commissionPool(attr, rarity, ctx);
  if (pool.length === 0) {
    throw new Error(
      `委託池為空: attr=${attr} rarity=${rarity}。`
      + '載入期驗證要求每個可抽到的組合都有一則無門檻委託，此處為空代表驗證被繞過。',
    );
  }
  const chosen = ctx.rng.weighted('event.draw', pool.map((e) => ({ item: e, weight: e.weight })));
  return offerOf(chosen, rarity, ctx, fx);
}

/**
 * 抽一則人物事件。旗標為真時才呼叫 —— 而旗標只在池非空時才會為真，
 * 因此這裡的空池與委託同性質：是驗證被繞過，不是要靜靜處理的情況。
 *
 * 稀有度取 cast 中【最高】的那位：多人事件本來就該比單人大，
 * 而人數多寡已經反映在 cast 的門檻上，不必再另立一條規則。
 */
export function drawEncounter(ctx: TurnContext, fx: EffectResolver): EventOffer {
  const pool = encounterPool(ctx);
  if (pool.length === 0) throw new Error('人物事件池為空 —— 旗標不該為真');
  const chosen = ctx.rng.weighted('event.notable',
    pool.map((e) => ({ item: e, weight: e.weight })));
  return offerOf(chosen, castRarity(chosen, ctx), ctx, fx);
}

function castRarity(def: EventDef, ctx: RunContext): Rarity {
  if (def.trigger.kind !== 'notable') return 1;
  return def.trigger.cast.reduce<Rarity>((acc, c) => {
    const r = ctx.defs.reader('notable').get(String(c.notableId)).rarity;
    return r > acc ? r : acc;
  }, 1);
}

// ── 產出 ────────────────────────────────────────────

/**
 * 事上磨練的產出 ★ **它吃的是經驗那兩條平緩曲線，不是功績那兩條。**
 *
 * 功績要追得上官階門檻（最高 6405），所以它可以乘到 178 倍；
 * 經驗對照的是 0–100 的四維與一輪約 900 的總量，乘 178 倍會讓
 * 一則事件就給掉一整個等級。兩者【必須用不同的縮放】——
 * 舊版共用一條，那是「產出即屬性、上限 999」時代留下來的尺度錯誤。
 */
export function practiceYield(
  practice: readonly EventPractice[], ratio: number, rarity: Rarity, tier: number,
  ctx: RunContext, fx: EffectResolver,
): readonly ExpGain[] {
  const c = yieldCurve(ctx);
  const mul = practiceTierMul(tier, ctx) * practiceRarityMul(rarity, ctx);
  return practice.map((p) => {
    const raw = (c.baseByAttr[p.attr] ?? 0) * mul * p.weight * ratio * fx.gainMul(p.attr, ctx);
    return {
      attr: p.attr,
      amount: Math.round(fx.resolve(targetId(`event.practice.${p.attr}`), raw, ctx)),
    };
  }).filter((g) => g.amount > 0);
}

const rarityMul = (rarity: Rarity, ctx: RunContext): number =>
  yieldCurve(ctx).rarityMultiplier[rarity - 1] ?? 1;

/** 經驗的官階縮放。與功績的 `tierScale` 是兩條不同的曲線（見 practiceYield）。 */
const practiceTierMul = (tier: number, ctx: RunContext): number => {
  const curve = yieldCurve(ctx).practiceTierMul;
  return curve[Math.max(0, tier - 1)] ?? curve.at(-1) ?? 1;
};

const practiceRarityMul = (rarity: Rarity, ctx: RunContext): number =>
  yieldCurve(ctx).practiceRarityMul[rarity - 1] ?? 1;

/**
 * 選項的功績產出【交給 writer 之前】的值。
 *
 * `StatWriter.grantMerit` 之後還會再乘一次貨幣倍率（`CurrencyBonus`），
 * 因此這個函式的回傳值【不是】玩家最後拿到的數字 —— 要顯示請用 `meritShown`。
 * 兩者分成兩個函式而不是一個帶旗標的：漏乘與重複乘都不會讓任何測試失敗，
 * 而名字不同時，呼叫端一眼看得出自己拿到的是哪一個。
 */
export function meritYield(
  option: EventOptionDef, ratio: number, rarity: Rarity, tier: number,
  ctx: RunContext, fx: EffectResolver,
): readonly MeritGain[] {
  const mul = tierScale(tier, ctx) * rarityMul(rarity, ctx) * fx.eventRewardMul('commission', ctx);
  return option.rewards
    .filter((r) => r.kind === 'merit')
    .map((r) => ({ line: r.merit, amount: Math.round(r.amount * mul * ratio) }))
    .filter((m) => m.amount > 0);
}

/**
 * 玩家【最後真的會拿到】的功績 ★
 *
 * 卡面與選項預覽一律用它。舊版直接印 `meritYield` 的結果，於是
 * 陣容裡只要有一位「事件文功結算 +10%」的名士，畫面就開始說謊 ——
 * 而那不會讓任何測試失敗，因為兩邊各自都算得沒錯。
 */
export const meritShown = (
  gains: readonly MeritGain[], ctx: RunContext, fx: EffectResolver,
): readonly MeritGain[] => gains.map((g) => ({
  line: g.line,
  amount: Math.round(g.amount * fx.currencyMul(`merit.${g.line}`, ctx)),
}));

export function optionStates(
  def: EventDef, rarity: Rarity, ctx: RunContext, fx: EffectResolver,
): readonly OptionState[] {
  const tier = commissionTier(def, ctx);
  return def.options.map((o) => {
    const unmet = o.requirements.filter((c) => !evaluateCondition(c, ctx, readStat));
    let rate: number | null = null;
    if (o.check !== null) {
      rate = preview(
        specForMinor(o.check.attr, dcAt(String(o.check.dcCurveId), tier, ctx)), ctx, fx,
      ).successRate;
    }
    return {
      tier: o.tier,
      enabled: unmet.length === 0,
      blockedReasonKeys: unmet.map(() => ('rejection.threshold.not-met' as L10nKey)),
      successRate: rate,
      practicePreview: practiceYield(o.practice, 1, rarity, tier, ctx, fx),
      meritPreview: meritShown(meritYield(o, 1, rarity, tier, ctx, fx), ctx, fx),
    };
  });
}

// ── 佇列 ────────────────────────────────────────────

/** 隊首。null ＝ 本回合沒有待處理的事件。 */
export const head = (ctx: RunContext): EventOffer | null => ctx.state.turn.pending[0] ?? null;

/** 佇列已清空。⑮ 靠這個查詢判斷回合能否推進（15 §2）。 */
export const isClear = (ctx: RunContext): boolean => ctx.state.turn.pending.length === 0;

export const enqueue = (offer: EventOffer, ctx: RunContext): RunState => ({
  ...ctx.state,
  turn: { ...ctx.state.turn, pending: [...ctx.state.turn.pending, offer] },
});

/**
 * 本回合已經結算過某一種事件了嗎（15 §3.4）★
 *
 * 【不另存旗標】—— `turn.resolved` 已經記下本回合結算過哪幾則，
 * 再加一個「委託發過了沒」的布林只會多出一個可能不一致的真相來源。
 */
function resolvedKind(kind: 'commission' | 'notable', ctx: RunContext): boolean {
  return ctx.state.turn.resolved.some(
    (r) => ctx.defs.reader('event').get(String(r.eventDefId)).trigger.kind === kind,
  );
}

/**
 * 推進到下一拍（15 §3.4）★
 *
 * 三拍的順序固定：固定事件 → 委託 → 人物事件。前一拍結算完之後
 * 才抽下一拍的內容 —— 因此人物事件的可抽池會看到委託帶來的好感變化，
 * 而連鎖的下一步也能在同一輪裡接上。
 *
 * 【人物事件不是委託的尾巴】★ 舊版把它寫在 `resolveHead` 裡面
 * （委託結算完 → 若該格有名士 → 骰），於是它既是委託的附屬品、
 * 又綁在同格上。現在它是平行的第三拍：沒有委託也可以有人物事件。
 */
export function openBeats(ctx: TurnContext, fx: EffectResolver): RunState {
  if (!isClear(ctx)) return ctx.state;
  const index = ctx.state.turn.selected;
  if (index === null) return ctx.state;
  const slot = ctx.state.turn.slots[index];
  if (slot === undefined) return ctx.state;

  if (slot.hasCommission && !resolvedKind('commission', ctx)) {
    const result = ctx.state.turn.training;
    if (result === null) throw new Error('固定事件已選但未留下結果');
    return enqueue(drawCommission(result.attr, result.finalGlow, ctx, fx), ctx);
  }
  if (slot.hasEncounter && !resolvedKind('notable', ctx)) {
    // 旗標是回合開始擲的，而好感只會上升、連鎖只會前進 ——
    // 池子只會變大不會變小。這裡仍然守一下：事件的 requirements
    // 可能帶有上限型條件，那就真的可能失效。
    if (encounterPool(ctx).length === 0) return ctx.state;
    return enqueue(drawEncounter(ctx, fx), ctx);
  }
  return ctx.state;
}

/**
 * 道具獎勵的發放（23 §6）★
 *
 * 兩種寫法共用一段：`item` 指名一件，`itemPool` 從池裡抽一件。
 * 上限已滿的道具【不進候選】—— 抽出來卻拿不到是假獎勵。
 * 沒有替代品時就是沒有掉落，不靜靜換成別的東西（§2.2）。
 */
function grantItems(
  option: EventOptionDef, ctx: TurnContext,
): { readonly state: RunState; readonly gains: readonly ItemGain[] } {
  let state = ctx.state;
  const gains: ItemGain[] = [];
  const at = (): TurnContext => ({ state, defs: ctx.defs, rng: ctx.rng });

  for (const r of option.rewards) {
    let target: ItemId | null = null;
    if (r.kind === 'item') {
      if (!ctx.rng.chance('item.drop', r.chance)) continue;
      target = canAcquire(r.itemId, at()) ? r.itemId : null;
    } else if (r.kind === 'itemPool') {
      if (!ctx.rng.chance('item.drop', r.chance)) continue;
      const cands = poolCandidates(r.poolId, at());
      target = cands.length === 0 ? null : ctx.rng.weighted('item.drop', cands);
    } else {
      continue;
    }
    if (target === null) continue;
    const out = acquire(target, at());
    state = out.state;
    if (out.gain !== null) gains.push(out.gain);
  }
  return { state, gains };
}

/**
 * 結算隊首的事件。
 *
 * 【不再從這裡追加人物事件】★ 人物事件是獨立的第三拍，由 ⑮ 在委託清空後
 * 依旗標推進。舊版把它做成委託的尾巴（「委託結算完 → 若該格有名士 → 骰」），
 * 那讓它變成委託的附屬品，而且綁在同格上 —— 兩者都與設計相反。
 */
export function resolveHead(
  optionIndex: number, ctx: TurnContext, fx: EffectResolver, writer: StatWriter,
): RunState {
  const offer = head(ctx);
  if (offer === null) throw new Error('本回合沒有待處理的事件');
  const def = ctx.defs.reader('event').get(String(offer.eventDefId));
  const option = def.options[optionIndex];
  if (option === undefined) throw new Error(`選項不存在: ${optionIndex}`);
  if (!offer.optionStates[optionIndex]?.enabled) {
    throw new Error(`選項門檻不足: ${optionIndex}`);
  }

  const tier = commissionTier(def, ctx);
  let passed = true;
  if (option.check !== null) {
    const dc = dcAt(String(option.check.dcCurveId), tier, ctx);
    passed = resolveCheck(specForMinor(option.check.attr, dc), ctx, fx).passed;
  }

  // 檢定失敗仍給四成（17 §6.3）。一回合只有這一次機會，若失敗＝顆粒無收，
  // 高 DC 的選項會沒人敢碰，「用哪個方法度過」就退化成只選最穩的那個。
  const ratio = passed ? 1 : yieldCurve(ctx).failRatio;
  const practiceExp = practiceYield(option.practice, ratio, offer.rarity, tier, ctx, fx);
  const meritRaw = meritYield(option, ratio, offer.rarity, tier, ctx, fx);
  // 紀錄的是【實際入帳】的數字，不是交給 writer 之前的那個 —— 回合紀錄要與存摺一致。
  const meritGained = meritShown(meritRaw, ctx, fx);

  let state = ctx.state;
  const at = (): RunContext => ({ state, defs: ctx.defs });
  // 事上磨練也給【經驗】（D32）。做事會練到一點，只是比專心練少。
  for (const g of practiceExp) state = grantExp(g.attr, g.amount, at());
  for (const m of meritRaw) state = writer.grantMerit(m.line, m.amount, at());

  // 劇情級的一次性獎勵：好感度與道具。四維與功績走上面的曲線，這裡只處理例外。
  let itemsGained: readonly ItemGain[] = [];
  if (passed) {
    for (const r of option.rewards) {
      if (r.kind === 'boon') { state = grantBoon(r.ref, at()); continue; }
      if (r.kind !== 'affinity') continue;
      if (r.notableId === null) {
        // 陳群〈定品〉那種【當局獎勵】：全員加好感，直接打在好感 60 的門檻上。
        state = addAffinityAll(r.amount, at());
      } else {
        state = addAffinity(r.notableId, r.amount, at());
      }
    }
    const drop = grantItems(option, { state, defs: ctx.defs, rng: ctx.rng });
    state = drop.state;
    itemsGained = drop.gains;
  }

  const resolution: EventResolution = {
    eventDefId: def.eventDefId, optionIndex, passed, practiceExp, meritGained, itemsGained,
  };
  const seen: readonly EventDefId[] = def.unique
    ? [...state.turn.seenUniqueIds, def.eventDefId]
    : state.turn.seenUniqueIds;

  return {
    ...state,
    turn: {
      ...state.turn,
      pending: state.turn.pending.slice(1),
      resolved: [...state.turn.resolved, resolution],
      seenUniqueIds: seen,
    },
  };
}
