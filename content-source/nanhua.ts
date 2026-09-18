import {FX} from './core/effects/ids.js';
import {effectId} from '../src/contracts/core/ids.js';
import {coreDef} from './core/pack-id.js';
import {weiDef} from './wei/pack-id.js';
import {asKey} from './authoring.js';
import {notableBase} from './core/config/notable-base.js';
import {eventDefId,eventChainId,notableId,traitId,skillId,itemId} from '../src/contracts/core/ids.js';
import type {EventDef,TraitDef,ItemDef} from '../src/contracts/core/definitions.js';
import type {EventChallengeDef} from '../src/contracts/core/event-challenge.js';
import type {ChapterChallenge,StoryRequirement} from '../src/contracts/core/story.js';

export const nanhuaTexts:Record<string,string>={
 'notable.nanhua.name':'南華老仙','notable.nanhua.link':'一同修練時，指導加成 +10%',
 'trait.daofaziran.name':'道法自然','trait.daofaziran.desc':'同一場戰鬥中，我軍施放水計、火攻、落石各一次後，自動追加不耗糧的落雷，再清空紀錄。順序不限；重複同種不累加。',
 'trait.tianmingzhiren.name':'天命之人','trait.tianmingzhiren.desc':'啟用後，正向好感收益額外 +3（仍受每回合上限限制），經驗與功績收益 +15%。經驗先加成再按能力區間換算；直接能力禮包不加成。',
 'item.taiping.name':'太平要書','item.taiping.desc':'南華傳授的兵法道書。裝備於寶物欄，計策傷害 +15%。','item.taiping.tier':'計策傷害 +15%。',
 'event.nanhua.trial.title':'道法自然的試煉','event.nanhua.trial.body':'南華老仙：「先論道，再觀水火山石之勢。三關皆過，方知道法自然。」首關舌戰，後兩關只能施放計策。試煉借用水計、火攻與落石，離場後歸還。',
 'event.nanhua.trial.accept':'接受三階試煉','event.nanhua.trial.leave':'暫且告退','event.nanhua.trial.leave.result':'南華老仙：「各人自有時節，不必逞強。」',
};
const special=(slug:string,extra:Partial<TraitDef>):TraitDef=>coreDef('trait','trait:'+slug,{traitId:traitId('trait:'+slug),tier:'peerless',nameKey:asKey('trait.'+slug+'.name'),descKey:asKey('trait.'+slug+'.desc'),cost:{int:300,pol:220,lead:150},polarity:'positive',effects:[],eventExclusive:true,...extra});
export const nanhuaTraits=[special('daofaziran',{battleTrigger:'nature'}),special('tianmingzhiren',{growthBonus:.15,meritBonus:.15,affinityBonus:3})];
export const taiping:ItemDef=coreDef('item','item:taiping',{itemId:itemId('item:taiping'),rarity:5,perRunCap:1,nameKey:asKey('item.taiping.name'),descKey:asKey('item.taiping.desc'),sourceHint:'虎牢結束後，通過南華老仙的舌戰。',equipment:{slot:'treasure',strategyDamage:.15},tiers:[{tier:0,fragmentCost:0,effects:[],descKey:asKey('item.taiping.tier')}]});
export const nanhua=weiDef('notable','notable:nanhua',{notableId:notableId('notable:nanhua'),factionId:null,affiliation:'方外',duelArtId:'nanhua',rarity:5,nameKey:asKey('notable.nanhua.name'),base:notableBase(5,'int'),recruitment:{hint:'虎牢後通過南華老仙的舌戰'},abilities:{attrs:{lead:90,war:35,int:100,pol:100},traits:[traitId('trait:daofaziran')],skills:['water','fire','rocks'].map((id,i)=>({star:[0,2,4][i]!,skillId:skillId('skill:tactic-'+id)}))},unlocks:[{star:0,funcType:'LinkBonus',referId:effectId(FX.linkAll10),descKey:asKey('notable.nanhua.link')}]});
const outcomes={win:'南華老仙：能看清局勢，便能另闢天地。',lose:'南華老仙：今日所見，留待來日細想。',draw:'南華老仙：未分高下，尚待磨練。',retreat:'南華老仙：知進知退，亦是一得。'};
const debate=(opening:string,int=85,pol=85):EventChallengeDef=>({mode:'debate',opponent:'nanhua',opponentName:'南華老仙',ability:int,debate:{enemy:{int,pol,special:null,passives:[]}},opening,outcomes});
const battle=(ability:number,troops:number):EventChallengeDef=>({mode:'battle',opponent:'nanhua',opponentName:'南華老仙',ability,opening:'南華老仙：以計策破陣。水、火、山石皆可為師。',outcomes,enemySquads:3,enemyTroops:troops,strategyOnly:true,loanSkills:['skill:tactic-water','skill:tactic-fire','skill:tactic-rocks']});
export const nanhuaTrial:EventDef=weiDef('event','event:nanhua.trial',{eventDefId:eventDefId('event:nanhua.trial'),trigger:{kind:'notable',chainId:eventChainId('chain:nanhua.trial'),step:0,cast:[{notableId:notableId('notable:nanhua'),minStage:'close'}]},progression:{rarity:3,previous:[]},unique:true,collectible:true,weight:100,requirements:[],paramSlots:[],titleKey:asKey('event.nanhua.trial.title'),bodyKey:asKey('event.nanhua.trial.body'),options:[{tier:'story',labelKey:asKey('event.nanhua.trial.accept'),requirements:[],check:null,practice:[{attr:'int',weight:1}],rewards:[{kind:'unlock',trait:traitId('trait:daofaziran'),skill:null}],challenge:{...debate('南華老仙：徒兒，先說說何謂順勢而為。',90,90),cashOutGold:[20,60,120],stages:[{title:'第一試・論道',power:1,opening:'南華老仙：勝負豈只在刀兵？說出你的道理。',victory:'南華老仙：知其理，還須驗其行。',encounter:debate('先論道。',90,90)},{title:'第二試・借勢',power:1,opening:'南華老仙：水火山石，皆可借力。此戰僅能使用計策。',victory:'南華老仙：已能借勢，再看你能否應變。',encounter:battle(80,240)},{title:'第三試・自然',power:1,opening:'南華老仙：陣勢再變，莫拘一法。此戰僅能使用計策。',victory:'南華老仙：徒兒，你已懂得道法自然。',encounter:battle(100,360)}],outcomes:{...outcomes,win:'南華老仙：水火相濟，山石為引，天雷自至。\n你領悟了特性「道法自然」，可在特性配置啟用。'}}},{tier:'story',labelKey:asKey('event.nanhua.trial.leave'),resultKey:asKey('event.nanhua.trial.leave.result'),requirements:[],check:null,practice:[{attr:'int',weight:.2}],rewards:[]}]});

const roster=(id:string,present=true):StoryRequirement=>({kind:'roster',id:'notable:'+id,present});
const mark=(id:string,present=true):StoryRequirement=>({kind:'milestone',id,present});
const martial:StoryRequirement={kind:'any',requirements:[[mark('hulao:won')],[mark('won:chapter:hulao-lvbu')]]};
const noMartial:StoryRequirement[]=[mark('hulao:won',false),mark('won:chapter:hulao-lvbu',false)];
const nanhuaReward={allStats:5,gold:0,items:['item:taiping'],unlocks:['notable:nanhua']};
export const hulaoAfterChallenges:readonly ChapterChallenge[]=[
 {id:'chapter:hulao-lvbu',requirements:[roster('lvbu')],challenge:{mode:'duel',opponent:'lvbu',opponentName:'呂布',ability:100,duel:{enemy:{war:100,lead:90,trait:'peerless',traitChance:.25,comboEnabled:false,power:1}},opening:'呂布：我曾夢見在虎牢關與你搏殺，竟敗在你的手下。\n呂布：讓我看看，你如今可有那樣的實力！這次不激起飛將之勢，接招！',outcomes:{win:'呂布：我開始期待，你真正能與我一戰的那一天了。莫讓這天下再無有趣的對手！\n你獲得四維各 +5、方天化戟與赤兔馬。\n曹操：方才見閣下武藝，將來必有一番作為！這青釭、倚天雙劍與五百金，便作相贈。',lose:'呂布：原來……只是一場夢嗎。',draw:'呂布：勝負未分，還不是夢中那場痛快的一戰。',retreat:'呂布：原來……只是一場夢嗎。'}},reward:{allStats:5,gold:500,items:['item:fangtian','item:chitu','item:qinggang','item:yitian'],unlocks:['notable:lvbu']}},
 {id:'chapter:hulao-nanhua-wise',requirements:[roster('nanhua'),martial],challenge:{...debate('南華老仙：徒兒，既已有冠絕天下的武藝，不知你能否成為智勇雙全的天下第一人？\n南華老仙：今日，便與為師論上一論。',95,95),outcomes:{...outcomes,win:'南華老仙：看來你終於成長到為師期盼的樣子了。\n他輕拍你的肩。你感到心境與身軀一同產生變化。\n獲得四維各 +5、太平要書與特性「天命之人」。'}},reward:{...nanhuaReward,trait:traitId('trait:tianmingzhiren')}},
 {id:'chapter:hulao-nanhua',optionalWhen:[roster('nanhua',false)],requirements:[{kind:'any',requirements:[[roster('nanhua'),...noMartial],[roster('nanhua',false),roster('lvbu',false),mark('hulao:challenged',false)]]}],challenge:{...debate('南華老仙：徒兒，可曾想過，若當初好好學武，今日便有機會扭轉戰局？\n南華老仙：莫困於一途。用頭腦，一樣可以爭天下。來，與為師探討一番。'),outcomes:{...outcomes,win:'南華老仙：天下何止一條道路。這部太平要書，便交予你了。\n獲得四維各 +5、太平要書，解鎖南華老仙。'}},reward:nanhuaReward},
];
