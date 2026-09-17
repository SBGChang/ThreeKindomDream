import type {ItemDef} from '../../../src/contracts/core/definitions.js';
import {itemId} from '../../../src/contracts/core/ids.js';
import {asKey} from '../../authoring.js';
import {coreDef} from '../pack-id.js';
export const equipmentTexts:Record<string,string>={'battle.enemy.replacement':'守關敵將'};
const rows:readonly [string,string,ItemDef['rarity'],NonNullable<ItemDef['equipment']>,string,string][]=[
 ['fangtian','方天化戟',5,{slot:'weapon',duelDamage:.1},'玩家單挑傷害 +10%。','虎牢關單挑擊敗呂布；首次取得後可於珍品商店購買。'],
 ['chitu','赤兔馬',5,{slot:'mount',retreatSpeed:.15,checkTags:['pursuit','escape'],checkBonus:5},'玩家單挑後撤速度 +15%；追擊／撤離檢定 +5。','虎牢關單挑擊敗呂布；首次取得後可於珍品商店購買。'],
 ['yitian','倚天劍',5,{slot:'weapon',armyDamage:.05},'主角領軍時，我軍部隊傷害 +5%。','虎牢关首次邀戰擊敗全盛呂布，曹操贈送；之後珍品商店。'],
 ['white-horse','白馬護符',3,{slot:'treasure',healThreshold:.3,healRatio:.1},'每場單挑首次生命低於 30% 且存活時，回復最大生命 10%。','長坂完成救援與百姓撤離；首次取得後商店。'],
 ['alliance','荊襄盟書',4,{slot:'treasure',checkTags:['alliance','surrender'],checkBonus:5},'結盟／議降檢定 +5；不替代本輪締盟成果。','荊襄會盟履約與議約成功；首次取得後商店。'],
 ['sea-chart','四海航圖',4,{slot:'treasure',seaIntel:true},'海上抉擇前揭示一條航路風險情報。','江東航路勘察成功，遠航之前取得；首次取得後商店。'],
 ['trade-pass','通商文牒',4,{slot:'treasure',discount:.1},'啟用時，夢中商店本體價格 −10%；碎片不折扣。','大航海或西域開拓完成和平通商；首次取得後商店。'],
];
export const equipmentItems:readonly ItemDef[]=rows.map(([slug,name,rarity,equipment,description,sourceHint])=>{
 const key=`item.${slug}`;equipmentTexts[key+'.name']=name;equipmentTexts[key+'.desc']=description;equipmentTexts[key+'.tier.0']=description;
 return coreDef('item',`item:${slug}`,{itemId:itemId(`item:${slug}`),rarity,perRunCap:1,equipment,sourceHint,nameKey:asKey(key+'.name'),descKey:asKey(key+'.desc'),tiers:[{tier:0,fragmentCost:0,effects:[],descKey:asKey(key+'.tier.0')}]});
});
