const companionship:Record<string,readonly (readonly [string,string,string,string])[]>={};
import type { CampaignDef, ChapterDef, EndingDef, EnemyDef, EventDef, NotableDef, ShopItemDef } from '../../src/contracts/core/definitions.js';
import type { Attr, Rarity } from '../../src/contracts/core/primitives.js';
import { campaignId, chapterId, effectId, endingId, enemyId, eventChainId, eventDefId, notableId, notablePoolId, shopItemId, skillId, traitId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { buildStages } from '../core/campaigns/build.js';
import { notableBase } from '../core/config/notable-base.js';
import { FX } from '../core/effects/ids.js';
import { WU, WU_F, wuDef } from './pack-id.js';
import { wuScript } from './script.js';
import { choice, milestone, wuStories, wuStoryTexts } from './story.js';

const texts: Record<string, string> = { ...wuStoryTexts };
const k = (key: string, body: string) => { texts[key] = body; return asKey(key); };
const roster: readonly { slug:string;name:string;attr:Attr;rarity:Rarity;stats:readonly [number,number,number,number];skills:readonly string[];traits:readonly string[];story:string }[] = [{"slug": "sunjian", "name": "孫堅", "attr": "lead", "rarity": 5, "stats": [94, 90, 72, 70], "skills": ["tuzhen", "xianzhen", "guwu"], "traits": ["chenyi", "liande"], "story": "孫堅把備旗交給你：「別只記得向前。回頭點名，一個都不能少。」"}, {"slug": "sunce", "name": "孫策", "attr": "war", "rarity": 5, "stats": [94, 96, 74, 68], "skills": ["tuzhen", "xianzhen", "wanrenzhi"], "traits": ["danshi", "jimin"], "story": "孫策拉你修船，笑說總有一天它會載不下同行的人。"}, {"slug": "sunquan", "name": "孫權", "attr": "lead", "rarity": 5, "stats": [90, 68, 84, 93], "skills": ["guwu", "haoling", "zhirong"], "traits": ["chenyi", "liande"], "story": "孫權把主位旁的椅子拉開，請你坐下一同看軍報。"}, {"slug": "zhouyu", "name": "周瑜", "attr": "int", "rarity": 5, "stats": [96, 72, 98, 87], "skills": ["huoji", "shuiyan", "lianhuan"], "traits": ["danshi", "jimin"], "story": "周瑜聽出你敲錯的鼓點，卻先教你聽見身邊人的節拍。"}, {"slug": "lusu", "name": "魯肅", "attr": "pol", "rarity": 4, "stats": [83, 56, 93, 95], "skills": ["fumin", "tuntian", "wangzuo"], "traits": ["chenyi", "liande"], "story": "魯肅分完兩營的飯，自己那碗最少。你把半塊餅放回他碗裡。"}, {"slug": "lumeng", "name": "呂蒙", "attr": "lead", "rarity": 4, "stats": [93, 86, 89, 75], "skills": ["haoling", "jiezhi", "xianzhen"], "traits": ["chenyi", "liande"], "story": "呂蒙抱著書來問你問題，這一次，你竟也答不出來。"}, {"slug": "luxun", "name": "陸遜", "attr": "int", "rarity": 5, "stats": [96, 63, 97, 91], "skills": ["huoji", "shuiyan", "lianhuan"], "traits": ["danshi", "jimin"], "story": "陸遜攤開輪防表，請你替最年輕的隊長留一段能接得住的路。"}, {"slug": "taishici", "name": "太史慈", "attr": "war", "rarity": 4, "stats": [85, 95, 68, 59], "skills": ["tuzhen", "xianzhen", "wanrenzhi"], "traits": ["danshi", "jimin"], "story": "太史慈依約回營，馬背上還載著替新兵找回的木弓。"}, {"slug": "ganning", "name": "甘寧", "attr": "war", "rarity": 4, "stats": [89, 94, 74, 54], "skills": ["tuzhen", "xianzhen", "wanrenzhi"], "traits": ["danshi", "jimin"], "story": "甘寧替新兵解開錯繩結：「先學會讓同袍平安回來，再談奇襲。」"}, {"slug": "huanggai", "name": "黃蓋", "attr": "lead", "rarity": 4, "stats": [88, 86, 73, 66], "skills": ["guwu", "jiezhi", "zhirong"], "traits": ["chenyi", "liande"], "story": "黃蓋親自試過每件救生浮具，才把出擊旗交到你手上。"}, {"slug": "zhangzhao", "name": "張昭", "attr": "pol", "rarity": 4, "stats": [66, 33, 90, 98], "skills": ["fumin", "luanci", "wangzuo"], "traits": ["chenyi", "liande"], "story": "張昭逐條聽完你的新辦法，將原本準備駁回的文書重新攤平。"}, {"slug": "buzhi", "name": "步騭", "attr": "pol", "rarity": 3, "stats": [72, 47, 82, 92], "skills": ["fumin", "luanci", "tuntian"], "traits": ["chenyi", "liande"], "story": "步騭邀你重畫商路，地圖上第一筆卻是給移居百姓留的水井。"}];
const boosts = { lead: FX.linkLead15, war: FX.linkWar15, int: FX.linkInt15, pol: FX.linkPol15 };
const biases = { lead: FX.biasSelfLead15, war: FX.biasSelfWar15, int: FX.biasSelfInt18, pol: FX.biasSelfPol16 };
export const wuNotables: readonly NotableDef[] = roster.map(r => wuDef('notable', `notable:${r.slug}`, {
  duelArtId:r.slug,
  notableId: notableId(`notable:${r.slug}`), factionId: WU_F, rarity: r.rarity,
  nameKey: k(`notable.${r.slug}.name`, r.name), base: notableBase(r.rarity, r.attr),
  abilities: { attrs: { lead: r.stats[0], war: r.stats[1], int: r.stats[2], pol: r.stats[3] },
    traits: r.traits.map(x => traitId(`trait:${x}`)),
    skills: r.skills.map((x, i) => ({ star: [0, 2, 4][i]!, skillId: skillId(`skill:${x}`) })),
  },
  unlocks: [
    { star: 0, funcType: 'LinkBonus', referId: effectId(FX.linkAll10), descKey: k(`notable.${r.slug}.link`, '同格共事加成 +10%（好感達知交後生效）') },
    { star: 1, funcType: 'LinkBonus', referId: effectId(boosts[r.attr]), descKey: k(`notable.${r.slug}.specialty`, '專長格同框加成 +15%') },
    { star: 2, funcType: 'SlotBias', referId: effectId(biases[r.attr]), descKey: k(`notable.${r.slug}.bias`, '更常出現在自己的專長格') },
    { star: 3, funcType: 'LinkBonus', referId: effectId(boosts[r.attr]), descKey: asKey(`notable.${r.slug}.specialty`) },
    { star: 5, funcType: 'LinkBonus', referId: effectId(boosts[r.attr]), descKey: asKey(`notable.${r.slug}.specialty`) },
  ],
}));

const superiors = wuDef('notablePool', 'pool:wu.superiors', {
  poolId: notablePoolId('pool:wu.superiors'), factionId: WU_F,
  entries: roster.map(r => ({ notableId: notableId(`notable:${r.slug}`), weight: 10, requirements: [] })),
});
const faction = wuDef('faction', 'faction:wu', {
  faction: WU_F, lordId: notableId('notable:sunquan'), superiorPoolId: superiors.poolId, requirements: [],
  nameKey: k('faction.wu.name', '吳 · 孫權'), rejectReasonKey: k('faction.wu.reject', '願意同行，便有你的位置。'),
  bondSpeechKeys: [0, 1, 2, 3].map(n => k(`lord.wu.bond.${n}`, n === 0
    ? '孫權：「這幾位往後與你同行。先認識人，事情一起做。」'
    : `孫權：「故人的情分一直記著。${n} 位同伴由你自己選，餘下的我來安排。」`)),
});
const bond: ShopItemDef = wuDef('shopItem', 'shop:bond.wu', {
  item: shopItemId('shop:bond.wu'), category: 'bond', requiresItems: [], requiresPack: WU,
  nameKey: k('shop.bond.wu.name', '江東緣分'), descKey: k('shop.bond.wu.desc', '入吳時可自行挑選更多同行上司。'),
  levels: [600, 1500, 3200].map((cost, i) => ({ level: i + 1, cost,
    grant: { kind: 'factionBond', faction: WU_F, toLevel: i + 1 } })),
});
const chapters: readonly ChapterDef[] = wuScript.map((r, i) => wuDef('chapter', `ch:wu.${r.slug}`, {
  chapterId: chapterId(`ch:wu.${r.slug}`), factionId: WU_F, order: i + 1, length: 8,
  titleKey: k(`chapter.wu.${r.slug}.title`, r.title), onPass: null,
}));
const sequence = wuDef('chapterSequence', 'seq:wu', { factionId: WU_F, chapters: chapters.map(c => c.chapterId) });
const enemyRows=[['huaxiong','華雄',80,91,48,36,'xianzhen'],['taishici','太史慈・交鋒',85,95,68,59,'tuzhen'],['assassin','伏擊首領',80,86,78,45,'jiezhi'],['cao','曹軍水寨',90,82,83,75,'huoji'],['jingzhou','荊州守軍',87,88,80,65,'shuiyan'],['shu','蜀軍後陣',89,90,76,70,'xianzhen'],['caoxiu','曹休',88,86,74,69,'tuzhen'],['private','私兵首領',90,82,85,60,'jiezhi']] as const;
const enemies:readonly EnemyDef[]=enemyRows.map(([slug,name,lead,war,int,pol,skill])=>wuDef('enemy',`enemy:wu.${slug}`,{duelArtId:['huaxiong','taishici','caoxiu'].includes(slug)?slug:'npc_soldier',enemyId:enemyId(`enemy:wu.${slug}`),nameKey:k(`enemy.wu.${slug}.name`,name),attrs:{lead,war,int,pol},skillId:skillId(`skill:${skill}`)}));
const bossSlugs=enemyRows.map(r=>'wu.'+r[0]);
const campaigns: readonly CampaignDef[] = wuScript.map((r, i) => {
  r.stages.forEach((label, j) => k(`campaign.wu.${r.slug}.stage.${j}`, label));
  return wuDef('campaign', `campaign:wu.${r.slug}`, { campaignId: campaignId(`campaign:wu.${r.slug}`),
    chapterId: chapterId(`ch:wu.${r.slug}`), enemyNotables: [],
    stages: buildStages({ slug: `wu.${r.slug}`, bosses: [null, null, enemyId(`enemy:${bossSlugs[i]}`), null, enemyId(`enemy:${bossSlugs[i]}`), null, enemyId(`enemy:${bossSlugs[i]}`)],
      deepUnlocks: [null, null, null, { kind: 'unlock', trait: traitId('trait:chenyi'), skill: null },
        { kind: 'unlock', trait: null, skill: skillId('skill:jiezhi') }, null,
        { kind: 'unlock', trait: null, skill: skillId(i >= 6 ? 'skill:lianhuan' : 'skill:xianzhen') }],
    }),
  });
});
const introductions: readonly EventDef[] = roster.map(r => wuDef('event', `event:wu.${r.slug}.companionship`, {
  eventDefId: eventDefId(`event:wu.${r.slug}.companionship`),
  progression: { rarity: 1, previous: [] },
  trigger: { kind: 'notable', chainId: eventChainId(`chain:wu.${r.slug}`), step: 0,
    cast: [{ notableId: notableId(`notable:${r.slug}`), minStage: 'acquainted' }] },
  unique: true, collectible: true, weight: 100, paramSlots: [], requirements: [{ type: 'faction', value: WU_F }],
  titleKey: k(`event.wu.${r.slug}.title`, `${r.name}・並肩小事`), bodyKey: k(`event.wu.${r.slug}.body`, r.story),
  options: ['一起動手', '請他教我'].map((label, i) => ({ tier: 'story',
    labelKey: k(`event.wu.${r.slug}.${i}`, label), requirements: [], check: null,
    practice: [{ attr: r.attr, weight: 1.5 }],
    rewards: [{ kind: 'merit', merit: r.attr === 'war' || r.attr === 'lead' ? 'martial' : 'civil', amount: 8 },
      { kind: 'affinity', notableId: notableId(`notable:${r.slug}`), amount: 5 }],
  })),
}));
const encounters: readonly EventDef[] = [...introductions, ...roster.flatMap(r => (companionship[r.slug] ?? []).map(([title, body, first, second], i) => {
  const rarity = (i + 2) as Rarity, slug = `event:wu.${r.slug}.bond${rarity}`;
  const previous = i === 0 ? `event:wu.${r.slug}.companionship` : `event:wu.${r.slug}.bond${rarity-1}`;
  return wuDef('event', slug, {
    eventDefId:eventDefId(slug), progression:{rarity,previous:[eventDefId(previous)]},
    trigger:{kind:'notable',chainId:eventChainId(`chain:wu.${r.slug}`),step:i+1,
      cast:[{notableId:notableId(`notable:${r.slug}`),minStage:(['acquainted','friendly','close','sworn'] as const)[i]!}]},
    unique:true,collectible:true,weight:100,paramSlots:[],requirements:[{type:'faction',value:WU_F}],
    titleKey:k(slug+'.title',title),bodyKey:k(slug+'.body',body),
    options:[first,second].map((label,j)=>({tier:'story' as const,labelKey:k(slug+'.option'+j,label),requirements:[],check:null,
      practice:[{attr:r.attr,weight:1}],rewards:[{kind:'merit' as const,merit:r.attr==='lead'||r.attr==='war'?'martial' as const:'civil' as const,amount:8},
        {kind:'affinity' as const,notableId:notableId(`notable:${r.slug}`),amount:j===0?5:3}]})),
  });
}))];
const endings:readonly EndingDef[]=[
 wuDef('ending','ending:wu.brothers',{ending:endingId('ending:wu.brothers'),endingKind:'fullDream',factionId:WU_F,trigger:{kind:'sequenceCompleted'},requirements:[],storyRequirements:[milestone('wu.sunce-rescued'),choice('U3.B','handover')],priority:605,titleKey:k('ending.wu.brothers.title','雙璧同舟'),bodyKey:k('ending.wu.brothers.body','孫策把船頭讓給孫權，回頭招呼你：「上船！這次咱們一起走。」周瑜輕敲船沿，江東群英的笑聲越過江面。你救回了一個人，也替兄弟留下了能並肩的明天。'),pointsMultiplier:1.8,collectible:true}),
 wuDef('ending','ending:wu.tomorrow',{ending:endingId('ending:wu.tomorrow'),endingKind:'fullDream',factionId:WU_F,trigger:{kind:'sequenceCompleted'},requirements:[],storyRequirements:[milestone('wu.hearing-restored'),choice('U8.B','handover')],priority:606,titleKey:k('ending.wu.tomorrow.title','江東共曉'),bodyKey:k('ending.wu.tomorrow.body','孫權親自撤回失當的處分，公開繼承與輔政新令。陸遜終於在明亮的議事堂裡展開奏疏。江上的戰燈依次熄下，換成歸航燈。你與群英守住的家業，終於能交到明天。'),pointsMultiplier:1.8,collectible:true})
];

export const wuDefs = [...wuNotables, superiors, faction, bond, ...chapters, sequence, ...enemies, ...campaigns, ...encounters, ...wuStories, ...endings];
export const wuTexts = texts;
