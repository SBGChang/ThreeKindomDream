import { triggeredTraits } from './triggered.js';
import {peerlessTrait} from '../../lvbu-trial.js';
import { tacticalSkills } from './tactics.js';
import type { AbilityCost, SkillDef, TraitDef } from '../../../src/contracts/core/definitions.js';
import type { Attr, SkillKind } from '../../../src/contracts/core/primitives.js';
import { effectId, skillId, traitId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { FX } from '../effects/ids.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const duelTraits:Readonly<Record<string,NonNullable<TraitDef['duelTrait']>>>={danshi:'momentum',chenyi:'steady',liande:'breathing',jimin:'reversal',linzhen:'steady',zhechong:'breathing',liaodi:'reversal',wanrendi:'momentum',jingwei:'reversal'};

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
  ...(duelTraits[slug]?{duelTrait:duelTraits[slug]}:{}),
  effects: refs.map((n) => ({ funcType: 'StatModifier' as const, referId: effectId(n) })),
});

const skill = (
  slug: string, tier: SkillDef['tier'], c: AbilityCost,
  kind: SkillKind, actorAttr: Attr, ratio: number, duration: number,
): SkillDef => coreDef('skill', `skill:${slug}`, {
  skillId: skillId(`skill:${slug}`),
  legacy:true,
  tier,
  nameKey: k(`skill.${slug}.name`),
  descKey: k(`skill.${slug}.desc`),
  cost: c,
  action: { kind, actorAttr, ratio: ratio * 0.65, duration },
});

// ── 特質 ──────────────────────────────────────────────
export const coreTraits: readonly TraitDef[] = [
  peerlessTrait,
  ...triggeredTraits,
  trait('danshi', 'common', cost(['war', 150]), 'positive', [FX.battlePhys08]),
  trait('chenyi', 'common', cost(['lead', 150]), 'positive', [FX.battleTroops08]),
  trait('liande', 'common', cost(['pol', 150]), 'positive', [FX.battleHeal12]),
  trait('jimin', 'common', cost(['int', 150]), 'positive', [FX.battleMagic08]),

  trait('linzhen', 'fine', cost(['war', 220], ['lead', 150]), 'positive',
    [FX.battleTroops12, FX.battlePhys06]),
  trait('zhechong', 'fine', cost(['pol', 220], ['int', 150]), 'positive', [FX.battleSupply20]),
  trait('liaodi', 'fine', cost(['int', 220], ['pol', 150]), 'positive', [FX.battleMagic18]),

  trait('wanrendi', 'peerless', cost(['war', 300], ['lead', 220], ['int', 150]), 'positive',
    [FX.battlePhys30]),
  trait('jingwei', 'peerless', cost(['int', 300], ['pol', 220], ['lead', 150]), 'positive',
    [FX.battleMagic25, FX.battleHeal20]),

  /**
   * 負面特質不是懲罰性 debuff，而是角色刻畫（23 §2.3）——
   * 它的 effects 同時有正負，這才有取捨感。
   * 賈詡教得出來：他自己就有這一條。
   */
  trait('gangbi', 'common', cost(['war', 150]), 'negative',
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
  skill('tuzhen', 'common', cost(['war', 210]), 'physical', 'war', 0.30, 0),
  skill('xianzhen', 'fine', cost(['war', 280], ['lead', 210]), 'physical', 'war', 0.50, 0),
  skill('wanrenzhi', 'peerless', cost(['war', 380], ['lead', 280], ['int', 210]),
    'physical', 'war', 0.85, 0),

  // 智 · 法術
  skill('huoji', 'common', cost(['int', 210]), 'magic', 'int', 0.32, 0),
  skill('shuiyan', 'fine', cost(['int', 280], ['pol', 210]), 'magic', 'int', 0.52, 0),
  skill('lianhuan', 'peerless', cost(['int', 380], ['pol', 280], ['lead', 210]),
    'magic', 'int', 0.88, 0),

  // 政 · 恢復。吃糧秣 —— 這是文系續航的全部內容（33 §5.3）。
  skill('fumin', 'common', cost(['pol', 210]), 'heal', 'pol', 0.28, 0),
  skill('tuntian', 'fine', cost(['pol', 280], ['int', 210]), 'heal', 'pol', 0.46, 0),
  skill('wangzuo', 'peerless', cost(['pol', 380], ['int', 280], ['lead', 210]),
    'heal', 'pol', 0.75, 0),

  /**
   * 統與政【各有自己的輸出招】★ D19 的內容缺口，實測才發現
   *
   * 四職能（武＝物理／智＝法術／政＝恢復／統＝Buff）約束的是【名士】。
   * 主角不受此限 —— 他的四維決定他【怎麼打】，不決定他在隊裡的功能：
   *   沒有人想在自己的英雄故事裡當補師，而文武雙軌不能有一軌是廢的。
   *
   * 但內容裡原本只有武與智有輸出招，於是抽到統或政最高的人
   * **自己一點傷害都打不出來** —— 全靠指揮傳令。那讓 D19 只是一句話。
   *
   *   號令  統 · 物理 —— 你不親自砍，你叫別人砍
   *   亂辭  政 · 法術 —— 以言辭亂其軍心，那也是傷害
   *
   * 兩條都比同維的本行招弱一截（0.24／0.26 對 0.30／0.32）——
   * 主角能用四條路打，但每條路都有它更擅長的那一手。
   */
  skill('haoling', 'common', cost(['lead', 210]), 'physical', 'lead', 0.24, 0),
  skill('luanci', 'common', cost(['pol', 210]), 'magic', 'pol', 0.26, 0),

  // 統 · Buff／Debuff。不吃糧 —— 武系靠大池子撐，統把池子的每一下打得更重。
  skill('guwu', 'common', cost(['lead', 210]), 'buff', 'lead', 0.18, 3),
  skill('jiezhi', 'fine', cost(['lead', 280], ['war', 210]), 'debuff', 'lead', 0.22, 3),
  ...tacticalSkills,
  skill('zhirong', 'peerless', cost(['lead', 380], ['war', 280], ['pol', 210]),
    'buff', 'lead', 0.35, 4),
];
