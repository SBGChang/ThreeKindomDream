import { abilityTexts } from './abilities.js';
import { attrTexts, phaseTexts } from './attrs.js';
import { careerTalentTexts } from './career-talents.js';
import { chapterTexts } from './chapters.js';
import { endingTexts } from './endings.js';
import { eventTexts } from './events.js';
import { itemTexts } from './items.js';
import { notableEventTexts } from './notable-events.js';
import { notableTexts } from './notables.js';
import { paramTexts } from './params.js';

/** 全部繁體中文文案。缺 key 是建置期問題，不是執行期（06 §3）。 */
export const zhTW: Readonly<Record<string, string>> = {
  'item.ledger.name':'行軍簿', 'item.ledger.desc':'整理軍中文書，文功收益提升。',
  'item.rations.name':'乾糧袋', 'item.rations.desc':'備妥行軍糧秣，武功收益提升。',
  ...Object.fromEntries(Array.from({length:6},(_,i)=>['item.ledger.tier.'+i,'文功 +5%'])),
  ...Object.fromEntries(Array.from({length:6},(_,i)=>['item.rations.tier.'+i,'武功 +5%'])),
  'shop.marketSlots.name':'商路擴張',
  'shop.marketSlots.desc':'每章商店增加一件商品，最多七格（含指定碎片）',
  'shop.marketQuality.name':'珍品門路',
  'shop.marketQuality.desc':'提高合法珍品出現權重，不跳過章節與遺物發現條件',
  ...attrTexts,
  ...phaseTexts,
  ...paramTexts,
  ...notableTexts,
  ...chapterTexts,
  ...eventTexts,
  ...notableEventTexts,
  ...itemTexts,
  ...abilityTexts,
  ...careerTalentTexts,
  ...endingTexts,
};
