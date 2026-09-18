import {weiDef,WEI_F} from './wei/pack-id.js';
import {notableId,skillId,traitId,effectId} from '../src/contracts/core/ids.js';
import {asKey} from './authoring.js';
import {notableBase} from './core/config/notable-base.js';
import {FX} from './core/effects/ids.js';
export const lvbuTexts={'notable.lvbu.name':'呂布','notable.lvbu.link':'一同修練時，指導加成 +10%','notable.lvbu.war':'一同進行武力修練時，指導加成 +20%','notable.lvbu.bias':'更容易參與武力修練'};
export const lvbu=weiDef('notable','notable:lvbu',{
 notableId:notableId('notable:lvbu'),factionId:null,affiliation:'群雄',duelArtId:'lvbu',rarity:5,nameKey:asKey('notable.lvbu.name'),base:notableBase(5,'war'),
 abilities:{attrs:{lead:90,war:100,int:40,pol:30},traits:[traitId('trait:wushuangfeijiang'),traitId('trait:danshi'),traitId('trait:linzhen')],skills:['tuzhen','xianzhen','wanrenzhi'].map((id,i)=>({star:[0,2,4][i]!,skillId:skillId('skill:'+id)}))},
 unlocks:[{star:0,funcType:'LinkBonus',referId:effectId(FX.linkAll10),descKey:asKey('notable.lvbu.link')},{star:1,funcType:'LinkBonus',referId:effectId(FX.linkWar20),descKey:asKey('notable.lvbu.war')},{star:2,funcType:'SlotBias',referId:effectId(FX.biasSelfWar15),descKey:asKey('notable.lvbu.bias')},{star:3,funcType:'LinkBonus',referId:effectId(FX.linkWar20),descKey:asKey('notable.lvbu.war')},{star:5,funcType:'LinkBonus',referId:effectId(FX.linkWar20),descKey:asKey('notable.lvbu.war')}],
});
