import { companionship } from './companionship.js';
import type { CampaignDef, ChapterDef, EndingDef, EnemyDef, EventDef, NotableDef, ShopItemDef } from '../../src/contracts/core/definitions.js';
import type { Attr, Rarity } from '../../src/contracts/core/primitives.js';
import { campaignId, chapterId, effectId, endingId, enemyId, eventChainId, eventDefId, notableId, notablePoolId, shopItemId, skillId, traitId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { buildStages } from '../core/campaigns/build.js';
import { notableBase } from '../core/config/notable-base.js';
import { FX } from '../core/effects/ids.js';
import { SHU, SHU_F, shuDef } from './pack-id.js';
import { shuScript } from './script.js';
import { choice, milestone, shuStories, shuStoryTexts } from './story.js';

const texts: Record<string, string> = { ...shuStoryTexts };
const k = (key: string, body: string) => { texts[key] = body; return asKey(key); };
const roster: readonly { slug: string; name: string; attr: Attr; rarity: Rarity; stats: readonly [number, number, number, number]; skills: readonly string[]; traits: readonly string[]; story: string }[] = [
  { slug: 'liubei', name: '劉備', attr: 'lead', rarity: 5, stats: [92, 76, 78, 88], skills: ['guwu', 'haoling', 'jiezhi'], traits: ['chenyi', 'liande'], story: '劉備正一個個問新兵的姓名。你問他記得住多少，他將名簿遞來：「記得多少，就多記一個。」你坐到他身旁，替下一個人騰出位置。' },
  { slug: 'guanyu', name: '關羽', attr: 'war', rarity: 5, stats: [90, 97, 72, 62], skills: ['tuzhen', 'xianzhen', 'wanrenzhi'], traits: ['danshi', 'linzhen'], story: '關羽替小兵削好一把木刀，抬頭卻見你看得入神。他把另一段木頭遞來：「鋒要直，握柄卻不可傷人。」原來大刀之外，他也有這樣細緻的手藝。' },
  { slug: 'zhangfei', name: '張飛', attr: 'lead', rarity: 4, stats: [86, 96, 56, 42], skills: ['guwu', 'haoling', 'xianzhen'], traits: ['danshi', 'linzhen'], story: '張飛嘴上嚷著新兵畫旗太慢，手裡卻替每人調好墨。你湊近一看，他把最細的幾筆都留給自己：「旗畫清楚，戰場上才能找著自己人。」' },
  { slug: 'zhaoyun', name: '趙雲', attr: 'war', rarity: 4, stats: [89, 94, 76, 69], skills: ['tuzhen', 'xianzhen', 'jiezhi'], traits: ['chenyi', 'danshi'], story: '趙雲牽著走失的小馬回營，主人卻以為牠早已丟了。他朝你笑：「多回頭找一次，也許就在下一個轉彎。」你接過韁繩，把這句話記住。' },
  { slug: 'zhugeliang', name: '諸葛亮', attr: 'int', rarity: 5, stats: [91, 40, 99, 96], skills: ['huoji', 'shuiyan', 'lianhuan'], traits: ['jimin', 'liaodi'], story: '風箏第三次落到樹上，孔明盯著它難得語塞。你去搬梯，他還在比劃竹骨的重量。等風箏終於飛起來，你們一起笑得像從未帶過兵的孩子。' },
  { slug: 'jiangwan', name: '蔣琬', attr: 'pol', rarity: 3, stats: [68, 42, 83, 93], skills: ['fumin', 'luanci', 'tuntian'], traits: ['liande', 'zhechong'], story: '最不起眼的案上，堆著明天每一隊兵需要的糧單。蔣琬將它們分給幾名年輕書吏，自己只留一份。他問你：「若我有一天不在，這裡也該照常運轉，對吧？」' },
  {"slug":"huangzhong","name":"黃忠","attr":"war","rarity":4,"stats":[87,95,66,58],"skills":["tuzhen","xianzhen","wanrenzhi"],"traits":["chenyi","liande"],"story":"弓弦未老，先看箭落之處，再問我的年歲。"},
  {"slug":"machao","name":"馬超","attr":"war","rarity":5,"stats":[91,97,52,42],"skills":["tuzhen","xianzhen","wanrenzhi"],"traits":["chenyi","liande"],"story":"衝得進去，也要帶弟兄回來。"},
  {"slug":"weiyan","name":"魏延","attr":"lead","rarity":4,"stats":[92,89,73,55],"skills":["haoling","jiezhi","xianzhen"],"traits":["chenyi","liande"],"story":"險路我敢走，撤路也會說清楚。"},
  {"slug":"pangtong","name":"龐統","attr":"int","rarity":5,"stats":[87,36,98,86],"skills":["huoji","shuiyan","lianhuan"],"traits":["chenyi","liande"],"story":"這張圖，還欠一條讓百姓回家的路。"},
  {"slug":"fazheng","name":"法正","attr":"int","rarity":4,"stats":[82,45,95,84],"skills":["huoji","lianhuan","shuiyan"],"traits":["chenyi","liande"],"story":"捷報先放下，先告訴我消息從哪裡來。"},
  {"slug":"jiangwei","name":"姜維","attr":"lead","rarity":5,"stats":[93,90,91,70],"skills":["haoling","xianzhen","jiezhi"],"traits":["chenyi","liande"],"story":"接旗的人，也要學會把旗交出去。"},
];
const boosts = { lead: FX.linkLead15, war: FX.linkWar15, int: FX.linkInt15, pol: FX.linkPol15 };
const biases = { lead: FX.biasSelfLead15, war: FX.biasSelfWar15, int: FX.biasSelfInt18, pol: FX.biasSelfPol16 };
export const shuNotables: readonly NotableDef[] = roster.map(r => shuDef('notable', `notable:${r.slug}`, {
  notableId: notableId(`notable:${r.slug}`), factionId: SHU_F, rarity: r.rarity,
  duelArtId: r.slug,
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

const superiors = shuDef('notablePool', 'pool:shu.superiors', {
  poolId: notablePoolId('pool:shu.superiors'), factionId: SHU_F,
  entries: roster.map(r => ({ notableId: notableId(`notable:${r.slug}`), weight: 10, requirements: [] })),
});
const faction = shuDef('faction', 'faction:shu', {
  faction: SHU_F, lordId: notableId('notable:liubei'), superiorPoolId: superiors.poolId, requirements: [],
  nameKey: k('faction.shu.name', '蜀 · 劉備'), rejectReasonKey: k('faction.shu.reject', '願意同行，便有你的位置。'),
  bondSpeechKeys: [0, 1, 2, 3].map(n => k(`lord.shu.bond.${n}`, n === 0
    ? '劉備：「這幾位往後與你同行。先認識人，事情一起做。」'
    : `劉備：「故人的情分一直記著。${n} 位同伴由你自己選，餘下的我來安排。」`)),
});
const bond: ShopItemDef = shuDef('shopItem', 'shop:bond.shu', {
  item: shopItemId('shop:bond.shu'), category: 'bond', requiresItems: [], requiresPack: SHU,
  nameKey: k('shop.bond.shu.name', '蜀漢緣分'), descKey: k('shop.bond.shu.desc', '入蜀時可自行挑選更多同行上司。'),
  levels: [600, 1500, 3200].map((cost, i) => ({ level: i + 1, cost,
    grant: { kind: 'factionBond', faction: SHU_F, toLevel: i + 1 } })),
});
const chapters: readonly ChapterDef[] = shuScript.map((r, i) => shuDef('chapter', `ch:shu.${r.slug}`, {
  chapterId: chapterId(`ch:shu.${r.slug}`), factionId: SHU_F, order: i + 1, length: 8,
  titleKey: k(`chapter.shu.${r.slug}.title`, r.title), onPass: null,
}));
const sequence = shuDef('chapterSequence', 'seq:shu', { factionId: SHU_F, chapters: chapters.map(c => c.chapterId) });
const enemyRows = [
  ['shu.lubu', '呂布', 80, 98, 40, 35, 'wanrenzhi'],
  ['shu.cao-vanguard', '曹軍前鋒', 80, 85, 65, 45, 'xianzhen'],
  ['shu.cao-archers', '曹軍弩陣', 78, 72, 84, 55, 'huoji'],
  ['shu.yizhou-guard', '益州守軍', 78, 80, 70, 65, 'jiezhi'],
  ['shu.xiahouyuan', '夏侯淵', 88, 90, 62, 50, 'xianzhen'],
  ['shu.wu-pursuit', '江東追軍', 86, 82, 80, 55, 'shuiyan'],
  ['shu.simayi', '司馬懿', 92, 45, 98, 86, 'lianhuan'],
] as const;
const enemies: readonly EnemyDef[] = enemyRows.map(([slug, name, lead, war, int, pol, skill]) => shuDef('enemy', `enemy:${slug}`, {
  enemyId: enemyId(`enemy:${slug}`), nameKey: k(`enemy.${slug}.name`, name), attrs: { lead, war, int, pol }, skillId: skillId(`skill:${skill}`),
}));
const bossSlugs = ['shu.lubu', 'shu.cao-vanguard', 'shu.cao-vanguard', 'shu.cao-archers', 'shu.yizhou-guard', 'shu.xiahouyuan', 'shu.wu-pursuit', 'shu.simayi'];
const campaigns: readonly CampaignDef[] = shuScript.map((r, i) => {
  r.stages.forEach((label, j) => k(`campaign.shu.${r.slug}.stage.${j}`, label));
  return shuDef('campaign', `campaign:shu.${r.slug}`, { campaignId: campaignId(`campaign:shu.${r.slug}`),
    chapterId: chapterId(`ch:shu.${r.slug}`), enemyNotables: [],
    stages: buildStages({ slug: `shu.${r.slug}`, bosses: [null, null, enemyId(`enemy:${bossSlugs[i]}`), null, enemyId(`enemy:${bossSlugs[i]}`), null, enemyId(`enemy:${bossSlugs[i]}`)],
      deepUnlocks: [null, null, null, { kind: 'unlock', trait: traitId('trait:chenyi'), skill: null },
        { kind: 'unlock', trait: null, skill: skillId('skill:jiezhi') }, null,
        { kind: 'unlock', trait: null, skill: skillId(i >= 6 ? 'skill:lianhuan' : 'skill:xianzhen') }],
    }),
  });
});
const introductions: readonly EventDef[] = roster.map(r => shuDef('event', `event:shu.${r.slug}.companionship`, {
  eventDefId: eventDefId(`event:shu.${r.slug}.companionship`),
  progression: { rarity: 1, previous: [] },
  trigger: { kind: 'notable', chainId: eventChainId(`chain:shu.${r.slug}`), step: 0,
    cast: [{ notableId: notableId(`notable:${r.slug}`), minStage: 'acquainted' }] },
  unique: true, collectible: true, weight: 100, paramSlots: [], requirements: [{ type: 'faction', value: SHU_F }],
  titleKey: k(`event.shu.${r.slug}.title`, `${r.name}・並肩小事`), bodyKey: k(`event.shu.${r.slug}.body`, r.story),
  options: ['一起動手', '請他教我'].map((label, i) => ({ tier: 'story',
    labelKey: k(`event.shu.${r.slug}.${i}`, label), requirements: [], check: null,
    practice: [{ attr: r.attr, weight: 1.5 }],
    rewards: [{ kind: 'merit', merit: r.attr === 'war' || r.attr === 'lead' ? 'martial' : 'civil', amount: 8 },
      { kind: 'affinity', notableId: notableId(`notable:${r.slug}`), amount: 5 }],
  })),
}));
const encounters: readonly EventDef[] = [...introductions, ...roster.flatMap(r => (companionship[r.slug] ?? []).map(([title, body, first, second], i) => {
  const rarity = (i + 2) as Rarity, slug = `event:shu.${r.slug}.bond${rarity}`;
  const previous = i === 0 ? `event:shu.${r.slug}.companionship` : `event:shu.${r.slug}.bond${rarity-1}`;
  return shuDef('event', slug, {
    eventDefId:eventDefId(slug), progression:{rarity,previous:[eventDefId(previous)]},
    trigger:{kind:'notable',chainId:eventChainId(`chain:shu.${r.slug}`),step:i+1,
      cast:[{notableId:notableId(`notable:${r.slug}`),minStage:(['acquainted','friendly','close','sworn'] as const)[i]!}]},
    unique:true,collectible:true,weight:100,paramSlots:[],requirements:[{type:'faction',value:SHU_F}],
    titleKey:k(slug+'.title',title),bodyKey:k(slug+'.body',body),
    options:[first,second].map((label,j)=>({tier:'story' as const,labelKey:k(slug+'.option'+j,label),requirements:[],check:null,
      practice:[{attr:r.attr,weight:1}],rewards:[{kind:'merit' as const,merit:r.attr==='lead'||r.attr==='war'?'martial' as const:'civil' as const,amount:8},
        {kind:'affinity' as const,notableId:notableId(`notable:${r.slug}`),amount:j===0?5:3}]})),
  });
}))];
const endings: readonly EndingDef[] = [
  shuDef('ending', 'ending:shu.reunion', { ending: endingId('ending:shu.reunion'), endingKind: 'fullDream', factionId: SHU_F,
    trigger: { kind: 'sequenceCompleted' }, requirements: [], storyRequirements: [milestone('shu.guanyu-rescued'), choice('S7.B', 'pact')], priority: 604,
    titleKey: k('ending.shu.reunion.title', '桃園再聚'),
    bodyKey: k('ending.shu.reunion.body', '張飛一把掀開酒壇封泥，嚷著誰都不許少喝。關羽正要板起臉，被劉備先按回座位。桌上多擺了一只碗，位置就在三人之間。\n\n你還站在門口，劉備已向你招手：「這席，等的就是你。」\n\n落花飄進酒裡。你曾在別人的故事裡見過這場相逢，如今終於能親自坐下，聽他們把明天說得很長。'), pointsMultiplier: 1.8, collectible: true }),
  shuDef('ending', 'ending:shu.dawn', { ending: endingId('ending:shu.dawn'), endingKind: 'fullDream', factionId: SHU_F,
    trigger: { kind: 'sequenceCompleted' }, requirements: [], storyRequirements: [milestone('shu.kongming-rested'), choice('S8.B', 'handover')], priority: 603,
    titleKey: k('ending.shu.dawn.title', '漢室再曉'),
    bodyKey: k('ending.shu.dawn.body', '重修的糧道、接棒的新軍、數次並肩完成的戰役，終於通向多年後的舊都。漢旗重新升上城頭，百姓的歡呼從城門一路推到階前。\n\n你回身去找那個總在最後收拾地圖的人，卻見孔明早已站在陽光下。他收起羽扇，朝你鄭重一揖。\n\n「這一次，亮看見了。」\n\n你伸手扶住他。晨鼓響起，你們一起向前。'), pointsMultiplier: 1.8, collectible: true }),
];

export const shuDefs = [...shuNotables, superiors, faction, bond, ...chapters, sequence, ...enemies, ...campaigns, ...encounters, ...shuStories, ...endings];
export const shuTexts = texts;
