import {mentorDialogue as story} from './mentor-dialogue.js';
import {weiDef} from './wei/pack-id.js';
import {coreDef} from './core/pack-id.js';
import {asKey} from './authoring.js';
import {eventDefId,eventChainId,notableId,traitId} from '../src/contracts/core/ids.js';
import type {EventDef,TraitDef} from '../src/contracts/core/definitions.js';
export const peerlessChance=.25;
export const lvbuTrialTexts:Record<string,string>={
 'trait.wushuangfeijiang.name':'無雙飛將',
 'trait.wushuangfeijiang.desc':'單挑攻擊遇到防禦時，有 25% 機率無視防禦指令，強制對手下回合力竭。只可完成呂布三階試煉取得；需啟用。',
 'event.lvbu.trial.title':'無雙飛將的試煉',
 'event.lvbu.trial.body':'你踏進演武場時，呂布已把旁人遣開。「總看我的戟做什麼？想學，就自己來接。」他豎起三根手指：五成、全力，最後是飛將之勢。三關連勝，他才肯把壓箱底的本事交出來。每關前可收手領獎，戰間恢復血量、體力並清空 Combo；敗北或平手即結束，本輪不再重試。',
 'event.lvbu.trial.accept':'接受三階試煉',
 'event.lvbu.trial.leave':'今日收手，領取 20 金',
 'event.lvbu.trial.leave.result':'呂布收回畫戟：「知道進退，也不算白來。」你領取 20 金，結束本輪試煉。',
};
export const peerlessTrait:TraitDef=coreDef('trait','trait:wushuangfeijiang',{
 traitId:traitId('trait:wushuangfeijiang'),tier:'peerless',nameKey:asKey('trait.wushuangfeijiang.name'),descKey:asKey('trait.wushuangfeijiang.desc'),
 cost:{war:300,lead:220,int:150},polarity:'positive',effects:[],duelTrait:'peerless',duelProcChance:peerlessChance,eventExclusive:true,
});
export const lvbuTrial:EventDef=weiDef('event','event:lvbu.trial',{
 eventDefId:eventDefId('event:lvbu.trial'),trigger:{kind:'notable',chainId:eventChainId('chain:lvbu.trial'),step:0,cast:[{notableId:notableId('notable:lvbu'),minStage:'close'}]},
 progression:{rarity:3,previous:[]},unique:true,collectible:true,weight:100,requirements:[],paramSlots:[],
 titleKey:asKey('event.lvbu.trial.title'),bodyKey:asKey('event.lvbu.trial.body'),
 options:[{tier:'story',labelKey:asKey('event.lvbu.trial.accept'),requirements:[],check:null,practice:[{attr:'war',weight:1}],
  rewards:[{kind:'unlock',trait:peerlessTrait.traitId,skill:null}],
  challenge:{mode:'duel',opponent:'lvbu',opponentName:'呂布',ability:100,duel:{enemy:{war:100,lead:90,trait:'peerless',traitChance:peerlessChance,comboEnabled:false}},
   opening:'呂布：敢來挑戰，便先讓我看看你的膽量！',cashOutGold:[20,60,120],
   stages:[
    {title:'第一試・五成之力（50%）',power:.5,opening:story.lvbuTrial.opening[0]!,victory:story.lvbuTrial.victory[0]!},
    {title:'第二試・飛將本色（100%）',power:1,opening:story.lvbuTrial.opening[1]!,victory:story.lvbuTrial.victory[1]!},
    {title:'第三試・無雙之境（150%）',power:1.5,opening:story.lvbuTrial.opening[2]!,victory:story.lvbuTrial.victory[2]!},
   ],outcomes:{win:story.lvbuTrial.win,lose:story.lvbuTrial.lose,draw:story.lvbuTrial.draw,retreat:story.lvbuTrial.retreat}},
 },{tier:'story',labelKey:asKey('event.lvbu.trial.leave'),resultKey:asKey('event.lvbu.trial.leave.result'),requirements:[],check:null,practice:[{attr:'war',weight:0.2}],rewards:[{kind:'money',amount:20}]}],
});
