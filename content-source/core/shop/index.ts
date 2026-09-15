import type { ShopItemDef } from '../../../src/contracts/core/definitions.js';
import type { Attr } from '../../../src/contracts/core/primitives.js';
import { effectId, factionId, shopItemId, talentId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const glow = (id: number) => ({ funcType: 'GlowUpgradeBonus' as const, referId: effectId(id) });
const tal = (id: string) => talentId(id);

// 核心配置約 14–22 輪、全商品約 49–65 輪；完整人生收入約 940–1580 點。
const aptCap = (attr: Attr): ShopItemDef =>
  coreDef('shopItem', `shop:aptCap.${attr}`, {
    item: shopItemId(`shop:aptCap.${attr}`), category: 'aptitude',
    nameKey: k(`shop.aptCap.${attr}.name`), descKey: k(`shop.aptCap.${attr}.desc`),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 300, grant: { kind: 'aptitudeCap', attr, toGrade: 'B' } },
      { level: 2, cost: 900, grant: { kind: 'aptitudeCap', attr, toGrade: 'A' } },
      { level: 3, cost: 2400, grant: { kind: 'aptitudeCap', attr, toGrade: 'S' } },
    ],
  });

export const shopItems: readonly ShopItemDef[] = [
  ...(['marketSlots','marketQuality'] as const).map((kind)=>coreDef('shopItem','shop:'+kind,{
    item:shopItemId('shop:'+kind),category:'bond' as const,nameKey:k('shop.'+kind+'.name'),descKey:k('shop.'+kind+'.desc'),requiresItems:[],requiresPack:null,
    levels:(kind==='marketSlots'?[400,900,1800]:[500,1200,2400]).map((cost,i)=>({level:i+1,cost,grant:{kind}})),
  })),
  aptCap('lead'), aptCap('war'), aptCap('int'), aptCap('pol'),
  /**
   * 官途 ★★ **官階那條線唯一的跨輪成長**
   *
   * 實測：舊的九個品項有 **0 個**碰官階，於是它在第一輪與第五十輪
   * 爬法完全一樣 —— 而它是全遊戲最顯眼的數字（稱號寫在狀態列上）。
   *
   * 第一輪上限 5（都尉／功曹）。七階買到頂（12，四方將軍／軍師將軍），
   * 每一階都是一個**新的稱號**，不是同一個稱號來得更快。
   *
   * 定價比資質陡：它同時解開官階背後的三件事 ——
   * 兵量糧量（hostScale）、委託報酬（tierMultiplier）、高檔委託的門檻。
   */
  coreDef('shopItem', 'shop:career', {
    item: shopItemId('shop:career'), category: 'career',
    nameKey: k('shop.career.name'), descKey: k('shop.career.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 300, grant: { kind: 'careerCap', delta: 1 } },
      { level: 2, cost: 500, grant: { kind: 'careerCap', delta: 1 } },
      { level: 3, cost: 800, grant: { kind: 'careerCap', delta: 1 } },
      { level: 4, cost: 1200, grant: { kind: 'careerCap', delta: 1 } },
      { level: 5, cost: 1800, grant: { kind: 'careerCap', delta: 1 } },
      { level: 6, cost: 2400, grant: { kind: 'careerCap', delta: 1 } },
      { level: 7, cost: 3000, grant: { kind: 'careerCap', delta: 1 } },
    ],
  }),
  coreDef('shopItem', 'shop:aptPoints', {
    item: shopItemId('shop:aptPoints'), category: 'aptitude',
    nameKey: k('shop.aptPoints.name'), descKey: k('shop.aptPoints.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 300, grant: { kind: 'aptitudePoints', delta: 2 } },
      { level: 2, cost: 600, grant: { kind: 'aptitudePoints', delta: 3 } },
      { level: 3, cost: 1000, grant: { kind: 'aptitudePoints', delta: 4 } },
      { level: 4, cost: 1500, grant: { kind: 'aptitudePoints', delta: 5 } },
      { level: 5, cost: 2600, grant: { kind: 'aptitudePoints', delta: 8 } },
      { level: 6, cost: 4000, grant: { kind: 'aptitudePoints', delta: 10 } },
    ],
  }),
  coreDef('shopItem', 'shop:talentPoints', {
    item: shopItemId('shop:talentPoints'), category: 'talent',
    nameKey: k('shop.talentPoints.name'), descKey: k('shop.talentPoints.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 500, grant: { kind: 'talentPoints', delta: 2 } },
      { level: 2, cost: 1000, grant: { kind: 'talentPoints', delta: 2 } },
      { level: 3, cost: 2000, grant: { kind: 'talentPoints', delta: 2 } },
      { level: 4, cost: 3500, grant: { kind: 'talentPoints', delta: 2 } },
      { level: 5, cost: 5000, grant: { kind: 'talentPoints', delta: 2 } },
    ],
  }),
  coreDef('shopItem', 'shop:glowUpgrade', {
    item: shopItemId('shop:glowUpgrade'), category: 'glow',
    nameKey: k('shop.glowUpgrade.name'), descKey: k('shop.glowUpgrade.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 600, grant: { kind: 'effect', ref: glow(3101) } },
      { level: 2, cost: 1200, grant: { kind: 'effect', ref: glow(3102) } },
      { level: 3, cost: 2200, grant: { kind: 'effect', ref: glow(3103) } },
      { level: 4, cost: 3600, grant: { kind: 'effect', ref: glow(3104) } },
    ],
  }),
  coreDef('shopItem', 'shop:talents', {
    item: shopItemId('shop:talents'), category: 'talent',
    nameKey: k('shop.talents.name'), descKey: k('shop.talents.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 300, grant: { kind: 'unlockTalent', talentId: tal('talent:photographic') } },
      { level: 2, cost: 500, grant: { kind: 'unlockTalent', talentId: tal('talent:diligence') } },
      { level: 3, cost: 800, grant: { kind: 'unlockTalent', talentId: tal('talent:brawn') } },
      { level: 4, cost: 1200, grant: { kind: 'unlockTalent', talentId: tal('talent:sudden-fame') } },
      { level: 5, cost: 1800, grant: { kind: 'unlockTalent', talentId: tal('talent:wide-circle') } },
      { level: 6, cost: 2600, grant: { kind: 'unlockTalent', talentId: tal('talent:keen-eye') } },
      { level: 7, cost: 3600, grant: { kind: 'unlockTalent', talentId: tal('talent:destined') } },
    ],
  }),
  // 勢力緣分：宣告 requiresPack，未安裝該陣營包時不出現在 catalog（09 §2）
  coreDef('shopItem', 'shop:bond.wei', {
    item: shopItemId('shop:bond.wei'), category: 'bond',
    nameKey: k('shop.bond.wei.name'), descKey: k('shop.bond.wei.desc'),
    requiresItems: [], requiresPack: null,
    levels: [
      { level: 1, cost: 500, grant: { kind: 'factionBond', faction: factionId('faction:wei'), toLevel: 1 } },
      { level: 2, cost: 1000, grant: { kind: 'factionBond', faction: factionId('faction:wei'), toLevel: 2 } },
      { level: 3, cost: 2000, grant: { kind: 'factionBond', faction: factionId('faction:wei'), toLevel: 3 } },
    ],
  }),
];
