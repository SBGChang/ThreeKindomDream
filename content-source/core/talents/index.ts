import type { TalentDef } from '../../../src/contracts/core/definitions.js';
import type { EffectRef, FuncType } from '../../../src/contracts/core/effects.js';
import { effectId, talentId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const ref = (funcType: FuncType, id: number): EffectRef => ({ funcType, referId: effectId(id) });

/** 養成型 Buff：改寫養成過程的係數與規則（GDD §10.1）。 */
export const talents: readonly TalentDef[] = [
  coreDef('talent', 'talent:photographic', {
    talentId: talentId('talent:photographic'), cost: 2, exclusiveGroup: null,
    nameKey: k('talent.photographic.name'), descKey: k('talent.photographic.desc'),
    effects: [ref('StatModifier', 1101)],
  }),
  coreDef('talent', 'talent:brawn', {
    talentId: talentId('talent:brawn'), cost: 3, exclusiveGroup: null,
    nameKey: k('talent.brawn.name'), descKey: k('talent.brawn.desc'),
    effects: [ref('GlowBaseWeight', 2901)],
  }),
  coreDef('talent', 'talent:diligence', {
    talentId: talentId('talent:diligence'), cost: 2, exclusiveGroup: null,
    nameKey: k('talent.diligence.name'), descKey: k('talent.diligence.desc'),
    effects: [ref('StatModifier', 1103)],
  }),
  coreDef('talent', 'talent:sudden-fame', {
    talentId: talentId('talent:sudden-fame'), cost: 3, exclusiveGroup: null,
    nameKey: k('talent.sudden-fame.name'), descKey: k('talent.sudden-fame.desc'),
    effects: [ref('GlowUpgradeBonus', 3201)],
  }),
  // 「世家門閥」買的是【選擇權】而不是數值：皇甫嵩本來要替你指派三名，
  // 有門第的人可以自己挑。兩階互斥 —— 挑一位與挑三位是同一件事的兩個價位。
  coreDef('talent', 'talent:noble-house', {
    talentId: talentId('talent:noble-house'), cost: 2, exclusiveGroup: 'designate',
    nameKey: k('talent.noble-house.name'), descKey: k('talent.noble-house.desc'),
    effects: [ref('DesignateSlots', 8001)],
  }),
  coreDef('talent', 'talent:great-clan', {
    talentId: talentId('talent:great-clan'), cost: 5, exclusiveGroup: 'designate',
    nameKey: k('talent.great-clan.name'), descKey: k('talent.great-clan.desc'),
    effects: [ref('DesignateSlots', 8002)],
  }),
  coreDef('talent', 'talent:precocious', {
    talentId: talentId('talent:precocious'), cost: 1, exclusiveGroup: null,
    nameKey: k('talent.precocious.name'), descKey: k('talent.precocious.desc'),
    effects: [ref('CurrencyBonus', 7001)],
  }),
  coreDef('talent', 'talent:wide-circle', {
    talentId: talentId('talent:wide-circle'), cost: 3, exclusiveGroup: null,
    nameKey: k('talent.wide-circle.name'), descKey: k('talent.wide-circle.desc'),
    effects: [ref('AffinityGrant', 5002), ref('AffinityGrowth', 5101)],
  }),
  coreDef('talent', 'talent:usurper', {
    // 善惡名退場後「忠義之心」（善惡名變動 +50%）失去功能，已刪除。
    // 這個互斥組因此只剩一人 —— 留一個單人互斥組是假的約束，改為 null。
    talentId: talentId('talent:usurper'), cost: 1, exclusiveGroup: null,
    nameKey: k('talent.usurper.name'), descKey: k('talent.usurper.desc'),
    effects: [ref('CurrencyBonus', 7003)],
  }),
  coreDef('talent', 'talent:destined', {
    talentId: talentId('talent:destined'), cost: 4, exclusiveGroup: null,
    nameKey: k('talent.destined.name'), descKey: k('talent.destined.desc'),
    effects: [ref('CheckRetry', 6101)],
  }),
  coreDef('talent', 'talent:keen-eye', {
    talentId: talentId('talent:keen-eye'), cost: 2, exclusiveGroup: null,
    nameKey: k('talent.keen-eye.name'), descKey: k('talent.keen-eye.desc'),
    effects: [ref('RevealInfo', 6201)],
  }),
];
