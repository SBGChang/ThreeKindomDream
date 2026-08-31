import type { ShopItemDef } from '../../../src/contracts/core/definitions.js';
import type { Attr } from '../../../src/contracts/core/primitives.js';
import { effectId, factionId, shopItemId, talentId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const glow = (id: number) => ({ funcType: 'GlowUpgradeBonus' as const, referId: effectId(id) });
const tal = (id: string) => talentId(id);

// GREYBOX 定價（ARCHITECTURE §9-7 標記為全缺）。
// 反推：首輪失敗約得 500–800 點，因此第一階落在 250–500 才有「立刻買得到」的回饋。
const aptCap = (attr: Attr): ShopItemDef =>
  coreDef('shopItem', `shop:aptCap.${attr}`, {
    item: shopItemId(`shop:aptCap.${attr}`), category: 'aptitude',
    nameKey: k(`shop.aptCap.${attr}.name`), descKey: k(`shop.aptCap.${attr}.desc`),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 400, grant: { kind: 'aptitudeCap', attr, toGrade: 'B' } },
      { level: 2, cost: 1200, grant: { kind: 'aptitudeCap', attr, toGrade: 'A' } },
      { level: 3, cost: 3000, grant: { kind: 'aptitudeCap', attr, toGrade: 'S' } },
    ],
  });

export const shopItems: readonly ShopItemDef[] = [
  aptCap('lead'), aptCap('war'), aptCap('int'), aptCap('pol'),
  coreDef('shopItem', 'shop:aptPoints', {
    item: shopItemId('shop:aptPoints'), category: 'aptitude',
    nameKey: k('shop.aptPoints.name'), descKey: k('shop.aptPoints.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 300, grant: { kind: 'aptitudePoints', delta: 2 } },
      { level: 2, cost: 700, grant: { kind: 'aptitudePoints', delta: 2 } },
      { level: 3, cost: 1400, grant: { kind: 'aptitudePoints', delta: 3 } },
      { level: 4, cost: 2600, grant: { kind: 'aptitudePoints', delta: 3 } },
    ],
  }),
  coreDef('shopItem', 'shop:talentPoints', {
    item: shopItemId('shop:talentPoints'), category: 'talent',
    nameKey: k('shop.talentPoints.name'), descKey: k('shop.talentPoints.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 350, grant: { kind: 'talentPoints', delta: 2 } },
      { level: 2, cost: 900, grant: { kind: 'talentPoints', delta: 2 } },
      { level: 3, cost: 1800, grant: { kind: 'talentPoints', delta: 3 } },
    ],
  }),
  coreDef('shopItem', 'shop:glowUpgrade', {
    item: shopItemId('shop:glowUpgrade'), category: 'glow',
    nameKey: k('shop.glowUpgrade.name'), descKey: k('shop.glowUpgrade.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 500, grant: { kind: 'effect', ref: glow(3101) } },
      { level: 2, cost: 1300, grant: { kind: 'effect', ref: glow(3102) } },
      { level: 3, cost: 2800, grant: { kind: 'effect', ref: glow(3103) } },
      { level: 4, cost: 5500, grant: { kind: 'effect', ref: glow(3104) } },
    ],
  }),
  coreDef('shopItem', 'shop:talents', {
    item: shopItemId('shop:talents'), category: 'talent',
    nameKey: k('shop.talents.name'), descKey: k('shop.talents.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 250, grant: { kind: 'unlockTalent', talentId: tal('talent:photographic') } },
      { level: 2, cost: 250, grant: { kind: 'unlockTalent', talentId: tal('talent:diligence') } },
      { level: 3, cost: 450, grant: { kind: 'unlockTalent', talentId: tal('talent:brawn') } },
      { level: 4, cost: 600, grant: { kind: 'unlockTalent', talentId: tal('talent:sudden-fame') } },
      { level: 5, cost: 600, grant: { kind: 'unlockTalent', talentId: tal('talent:wide-circle') } },
      { level: 6, cost: 800, grant: { kind: 'unlockTalent', talentId: tal('talent:keen-eye') } },
      { level: 7, cost: 1500, grant: { kind: 'unlockTalent', talentId: tal('talent:destined') } },
    ],
  }),
  // 勢力緣分：宣告 requiresPack，未安裝該陣營包時不出現在 catalog（09 §2）
  coreDef('shopItem', 'shop:bond.wei', {
    item: shopItemId('shop:bond.wei'), category: 'bond',
    nameKey: k('shop.bond.wei.name'), descKey: k('shop.bond.wei.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 600, grant: { kind: 'factionBond', faction: factionId('faction:wei'), toLevel: 1 } },
      { level: 2, cost: 1500, grant: { kind: 'factionBond', faction: factionId('faction:wei'), toLevel: 2 } },
      { level: 3, cost: 3200, grant: { kind: 'factionBond', faction: factionId('faction:wei'), toLevel: 3 } },
    ],
  }),
];
