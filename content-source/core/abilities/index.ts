// 特質與技能（23）。
//
// ── 兩種能力，兩種稀缺 ★ ────────────────────────────
//   特質  常駐被動，【不佔格】 → 稀缺在經驗總量（經濟決策）
//   技能  戰役中的行動，【只有 3 格】 → 稀缺在格數（編組決策）
//
// ── 混合消耗是專精者的天花板 ★ ──────────────────────
//   常  單類 40／55        良  兩類 60+40／75+55
//   絕  三類 80+60+40／100+75+55
//
// 純專精買不起絕階 —— 他沒有另外兩類的經驗。這與階梯計價（32 §3.1）
// 形成方向相反的夾擠：
//   專精 → 高數值（前段階梯便宜），但買不起絕階
//   均衡 → 絕階（四類齊全），但高數值很貴
// 這條軸線是兩張表【自己夾出來】的，不是額外規則。
//
// 技能比同階特質貴一成：它是你每一回合的行動，特質是常駐。
// 但技能只有三格，所以學第四個的理由只有一個 —— 換帶（不同章節的敵人性質不同）。
import type { AbilityCost, SkillDef, TraitDef } from '../../../src/contracts/core/definitions.js';
import type { Attr, SkillKind } from '../../../src/contracts/core/primitives.js';
import { effectId, skillId, traitId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { FX } from '../effects/ids.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

/** 混合消耗的產生器。偏離基準【必須寫理由】—— 否則這張表會被逐條微調淹沒。 */
const cost = (...pairs: readonly (readonly [Attr, number])[]): AbilityCost =>
  Object.fromEntries(pairs) as AbilityCost;

const trait = (
  slug: string, tier: TraitDef['tier'], c: AbilityCost,
  polarity: TraitDef['polarity'], refs: readonly number[],
): TraitDef => coreDef('trait', `trait:${slug}`, {
  traitId: traitId(`trait:${slug}`),
  tier,
  nameKey: k(`trait.${slug}.name`),
  descKey: k(`trait.${slug}.desc`),
  cost: c,
  polarity,
  effects: refs.map((n) => ({ funcType: 'StatModifier' as const, referId: effectId(n) })),
});

const skill = (
  slug: string, tier: SkillDef['tier'], c: AbilityCost,
  kind: SkillKind, actorAttr: Attr, ratio: number, duration: number,
): SkillDef => coreDef('skill', `skill:${slug}`, {
  skillId: skillId(`skill:${slug}`),
  tier,
  nameKey: k(`skill.${slug}.name`),
  descKey: k(`skill.${slug}.desc`),
  cost: c,
  action: { kind, actorAttr, ratio, duration },
});

// ── 特質 ──────────────────────────────────────────────
//
// 機會成本的驗算（32 §4.2）：
//   專精者站 A 帶（20／點）→ 常階 40 ＝ 放棄 2 點數值
//   均衡者站 C 帶（7／點） → 絕階 180 ＝ 放棄 26 點數值
// 兩邊都落在「有感但不致命」的位置 —— 這是這組數字唯一的設計目標。
export const coreTraits: readonly TraitDef[] = [
  trait('danshi', 'common', cost(['war', 40]), 'positive', [FX.battlePhys08]),
  trait('chenyi', 'common', cost(['lead', 40]), 'positive', [FX.battleTroops08]),
  trait('liande', 'common', cost(['pol', 40]), 'positive', [FX.battleHeal12]),
  trait('jimin', 'common', cost(['int', 40]), 'positive', [FX.battleMagic08]),

  trait('linzhen', 'fine', cost(['war', 60], ['lead', 40]), 'positive',
    [FX.battleTroops12, FX.battlePhys06]),
  trait('zhechong', 'fine', cost(['pol', 60], ['int', 40]), 'positive', [FX.battleSupply20]),
  trait('liaodi', 'fine', cost(['int', 60], ['pol', 40]), 'positive', [FX.battleMagic18]),

  trait('wanrendi', 'peerless', cost(['war', 80], ['lead', 60], ['int', 40]), 'positive',
    [FX.battlePhys30]),
  trait('jingwei', 'peerless', cost(['int', 80], ['pol', 60], ['lead', 40]), 'positive',
    [FX.battleMagic25, FX.battleHeal20]),

  /**
   * 負面特質不是懲罰性 debuff，而是角色刻畫（23 §2.3）——
   * 它的 effects 同時有正負，這才有取捨感。
   * 賈詡教得出來：他自己就有這一條。
   */
  trait('gangbi', 'common', cost(['war', 40]), 'negative',
    [FX.battlePhys15, FX.battleHealDown20]),
];

// ── 技能 ──────────────────────────────────────────────
//
// 四職能寫在【資料】裡，不是程式分支（23 §2.1）：
//   武＝物理輸出 ／ 智＝法術輸出 ／ 政＝恢復 ／ 統＝Buff・Debuff
//
// 主角【不吃這個對應】（RFC-01 D19）—— 他練哪一維就用哪一路打，
// 四條都能贏，只是贏的方式不同。恢復與純 Buff 留給名士，
// 那正好是你去陣容裡補位的理由。
export const coreSkills: readonly SkillDef[] = [
  // 武 · 物理
  skill('tuzhen', 'common', cost(['war', 55]), 'physical', 'war', 0.30, 0),
  skill('xianzhen', 'fine', cost(['war', 75], ['lead', 55]), 'physical', 'war', 0.50, 0),
  skill('wanrenzhi', 'peerless', cost(['war', 100], ['lead', 75], ['int', 55]),
    'physical', 'war', 0.85, 0),

  // 智 · 法術
  skill('huoji', 'common', cost(['int', 55]), 'magic', 'int', 0.32, 0),
  skill('shuiyan', 'fine', cost(['int', 75], ['pol', 55]), 'magic', 'int', 0.52, 0),
  skill('lianhuan', 'peerless', cost(['int', 100], ['pol', 75], ['lead', 55]),
    'magic', 'int', 0.88, 0),

  // 政 · 恢復。吃糧秣 —— 這是文系續航的全部內容（33 §5.3）。
  skill('fumin', 'common', cost(['pol', 55]), 'heal', 'pol', 0.28, 0),
  skill('tuntian', 'fine', cost(['pol', 75], ['int', 55]), 'heal', 'pol', 0.46, 0),
  skill('wangzuo', 'peerless', cost(['pol', 100], ['int', 75], ['lead', 55]),
    'heal', 'pol', 0.75, 0),

  // 統 · Buff／Debuff。不吃糧 —— 武系靠大池子撐，統把池子的每一下打得更重。
  skill('guwu', 'common', cost(['lead', 55]), 'buff', 'lead', 0.18, 3),
  skill('jiezhi', 'fine', cost(['lead', 75], ['war', 55]), 'debuff', 'lead', 0.22, 3),
  skill('zhirong', 'peerless', cost(['lead', 100], ['war', 75], ['pol', 55]),
    'buff', 'lead', 0.35, 4),
];
