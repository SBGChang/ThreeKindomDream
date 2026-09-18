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
 'event.lvbu.trial.body':'呂布將畫戟插在演武場中：「先接我五成功力，再接全力，最後是飛將之勢。三關連勝，我便傳你無雙飛將。」每關前可收手領獎，戰間恢復血量、體力並清空 Combo；敗北或平手即結束，本輪不再重試。',
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
    {title:'第一試・五成之力（50%）',power:.5,opening:'呂布：第一試，我只用五成功力。\n呂布：我的攻擊與防禦降至 50%，無雙飛將仍會發動。只守不攻，可接不住我的戟！',victory:'呂布：這一關算你過了。\n呂布：接下來是全力。收下 60 金就此作罷，還是恢復氣力再戰？'},
    {title:'第二試・飛將本色（100%）',power:1,opening:'呂布：第二試，攻擊與防禦恢復 100%。\n呂布：方才的留手到此為止。你可準備好了？',victory:'呂布：竟能接住我的全力，好！\n呂布：最後一試，我將激起飛將之勢。現在收手可領 120 金，繼續便要面對 150% 攻防。'},
    {title:'第三試・無雙之境（150%）',power:1.5,opening:'呂布：第三試，飛將之勢！攻擊與防禦提升至 150%。\n呂布：勝過此時的我，無雙飛將便傳給你！',victory:'呂布：三關皆破。你配得上這一招。'},
   ],outcomes:{win:'呂布：無雙不在一味逞勇，而在看穿對手守勢的一瞬。\n你領悟了特性「無雙飛將」！可前往特性配置啟用。',lose:'呂布收戟止戰：「敗在何處，回去想清楚。」本輪試煉結束，未取得無雙飛將。',draw:'鳴金聲響，勝負未分。呂布搖頭：「試煉須勝，平手不算。」本輪試煉結束。',retreat:'呂布：今日便到這裡。收下獎勵，記住交手所得。\n本輪試煉結束，未取得無雙飛將。'}},
 },{tier:'story',labelKey:asKey('event.lvbu.trial.leave'),resultKey:asKey('event.lvbu.trial.leave.result'),requirements:[],check:null,practice:[{attr:'war',weight:0.2}],rewards:[{kind:'money',amount:20}]}],
});
