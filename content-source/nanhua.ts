import {mentorDialogue as story} from './mentor-dialogue.js';
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
 'event.nanhua.trial.title':'道法自然的試煉','event.nanhua.trial.body':'南華在溪邊等你，腳旁擺著三枚石子。他說今日不讀書，先問你一個問題，再請你破兩座陣。三關都過，便教你如何將水火山石之勢連成一氣。後兩關僅能使用計策，並暫借水計、火攻與落石。',
 'event.nanhua.trial.accept':'接受三階試煉','event.nanhua.trial.leave':'暫且告退','event.nanhua.trial.leave.result':'南華老仙：「各人自有時節，不必逞強。」',
};
const special=(slug:string,extra:Partial<TraitDef>):TraitDef=>coreDef('trait','trait:'+slug,{traitId:traitId('trait:'+slug),tier:'peerless',nameKey:asKey('trait.'+slug+'.name'),descKey:asKey('trait.'+slug+'.desc'),cost:{int:300,pol:220,lead:150},polarity:'positive',effects:[],eventExclusive:true,...extra});
export const nanhuaTraits=[special('daofaziran',{battleTrigger:'nature'}),special('tianmingzhiren',{growthBonus:.15,meritBonus:.15,affinityBonus:3})];
export const taiping:ItemDef=coreDef('item','item:taiping',{itemId:itemId('item:taiping'),rarity:5,perRunCap:1,nameKey:asKey('item.taiping.name'),descKey:asKey('item.taiping.desc'),sourceHint:'虎牢結束後，通過南華老仙的舌戰。',equipment:{slot:'treasure',strategyDamage:.15},tiers:[{tier:0,fragmentCost:0,effects:[],descKey:asKey('item.taiping.tier')}]});
export const nanhua=weiDef('notable','notable:nanhua',{notableId:notableId('notable:nanhua'),factionId:null,affiliation:'方外',duelArtId:'nanhua',rarity:5,nameKey:asKey('notable.nanhua.name'),base:notableBase(5,'int'),recruitment:{hint:'虎牢後通過南華老仙的舌戰'},abilities:{attrs:{lead:90,war:35,int:100,pol:100},traits:[traitId('trait:daofaziran')],skills:['water','fire','rocks'].map((id,i)=>({star:[0,2,4][i]!,skillId:skillId('skill:tactic-'+id)}))},unlocks:[{star:0,funcType:'LinkBonus',referId:effectId(FX.linkAll10),descKey:asKey('notable.nanhua.link')}]});
const outcomes={win:'南華老仙：能看清局勢，便能另闢天地。',lose:'南華老仙：今日所見，留待來日細想。',draw:'南華老仙：未分高下，尚待磨練。',retreat:'南華老仙：知進知退，亦是一得。'};
const debate=(opening:string,int=85,pol=85):EventChallengeDef=>({mode:'debate',opponent:'nanhua',opponentName:'南華老仙',ability:int,debate:{enemy:{int,pol,special:null,passives:[]}},opening,outcomes});
const battle=(ability:number,troops:number):EventChallengeDef=>({mode:'battle',opponent:'nanhua',opponentName:'南華老仙',ability,opening:'南華老仙：以計策破陣。水、火、山石皆可為師。',outcomes,enemySquads:3,enemyTroops:troops,strategyOnly:true,loanSkills:['skill:tactic-water','skill:tactic-fire','skill:tactic-rocks']});
export const nanhuaTrial:EventDef=weiDef('event','event:nanhua.trial',{eventDefId:eventDefId('event:nanhua.trial'),trigger:{kind:'notable',chainId:eventChainId('chain:nanhua.trial'),step:0,cast:[{notableId:notableId('notable:nanhua'),minStage:'close'}]},progression:{rarity:3,previous:[]},unique:true,collectible:true,weight:100,requirements:[],paramSlots:[],titleKey:asKey('event.nanhua.trial.title'),bodyKey:asKey('event.nanhua.trial.body'),options:[{tier:'story',labelKey:asKey('event.nanhua.trial.accept'),requirements:[],check:null,practice:[{attr:'int',weight:1}],rewards:[{kind:'unlock',trait:traitId('trait:daofaziran'),skill:null}],challenge:{...debate('南華老仙：徒兒，先說說何謂順勢而為。',90,90),cashOutGold:[20,60,120],stages:[{title:'第一試・論道',power:1,opening:story.nanhuaTrial.opening[0]!,victory:story.nanhuaTrial.victory[0]!,encounter:debate('先論道。',90,90)},{title:'第二試・借勢',power:1,opening:story.nanhuaTrial.opening[1]!,victory:story.nanhuaTrial.victory[1]!,encounter:battle(80,240)},{title:'第三試・自然',power:1,opening:story.nanhuaTrial.opening[2]!,victory:story.nanhuaTrial.victory[2]!,encounter:battle(100,360)}],outcomes:{win:story.nanhuaTrial.win,lose:story.nanhuaTrial.lose,draw:story.nanhuaTrial.draw,retreat:story.nanhuaTrial.retreat}}},{tier:'story',labelKey:asKey('event.nanhua.trial.leave'),resultKey:asKey('event.nanhua.trial.leave.result'),requirements:[],check:null,practice:[{attr:'int',weight:.2}],rewards:[]}]});

const roster=(id:string,present=true):StoryRequirement=>({kind:'roster',id:'notable:'+id,present});
const mark=(id:string,present=true):StoryRequirement=>({kind:'milestone',id,present});
const martial:StoryRequirement={kind:'any',requirements:[[mark('hulao:won')],[mark('won:chapter:hulao-lvbu')]]};
const noMartial:StoryRequirement[]=[mark('hulao:won',false),mark('won:chapter:hulao-lvbu',false)];
const nanhuaReward={allStats:5,gold:0,items:['item:taiping'],unlocks:['notable:nanhua']};
export const hulaoAfterChallenges:readonly ChapterChallenge[]=[
 {id:'chapter:hulao-lvbu',requirements:[roster('lvbu')],challenge:{mode:'duel',opponent:'lvbu',opponentName:'呂布',ability:100,duel:{enemy:{war:100,lead:90,trait:'peerless',traitChance:.25,comboEnabled:false,power:1}},opening:story.lvbu.opening,outcomes:{win:story.lvbu.win,lose:story.lvbu.lose,draw:story.lvbu.draw,retreat:story.lvbu.retreat}},reward:{allStats:5,gold:500,items:['item:fangtian','item:chitu','item:qinggang','item:yitian'],unlocks:['notable:lvbu']}},
 {id:'chapter:hulao-nanhua-wise',requirements:[roster('nanhua'),martial],challenge:{...debate(story.wise.opening,95,95),outcomes:{win:story.wise.win,lose:story.wise.lose,draw:story.wise.draw,retreat:story.wise.retreat}},reward:{...nanhuaReward,trait:traitId('trait:tianmingzhiren')}},
 {id:'chapter:hulao-nanhua',optionalWhen:[roster('nanhua',false)],requirements:[{kind:'any',requirements:[[roster('nanhua'),...noMartial],[roster('nanhua',false),roster('lvbu',false),mark('hulao:challenged',false)]]}],challenge:{...debate(story.ordinary.opening),outcomes:{win:story.ordinary.win,lose:story.ordinary.lose,draw:story.ordinary.draw,retreat:story.ordinary.retreat}},reward:nanhuaReward},
];
