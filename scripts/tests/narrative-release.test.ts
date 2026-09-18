import assert from 'node:assert/strict';
import {saveRun,restoreRun} from '../../src/app/save.js';
import {migrateStoryRun} from '../../src/app/story-save.js';
import {acquire} from '../../src/modules/item.js';
import {createDuel,resolveDuel,forecastDuel} from '../../src/app/duel-model.js';
import {createRally,chooseRallyAction,actRally} from '../../src/app/debate-rally-model.js';
import {armiesEngaged} from '../../src/app/battle-story-field.js';
import {defs,wiring,newStorySession} from './harness.js';
import {Session} from '../../src/app/session.js';
import {chapterId,chapterIndex,itemId,factionId} from '../../src/contracts/core/ids.js';
import {emptyMeta} from '../../src/modules/dream-entry.js';
import {chapterStory} from '../../src/modules/story.js';
import {recruited,earnedRecruits,preserveRecruitment} from '../../src/modules/recruitment.js';
import {begin} from '../../src/modules/campaign.js';
import {bankFieldRewards} from '../../src/app/campaign-field-story.js';
import {validateBattleStory,createStoryRun,advanceStory} from '../../src/app/battle-story.js';
import {buy,refresh} from '../../src/modules/market.js';
import {itemPrice,equip} from '../../src/modules/equipment.js';
import {createRng} from '../../src/kernel/rng.js';
import type {RunState} from '../../src/contracts/core/state.js';

const meta=emptyMeta(),initial=newStorySession(713).current;
assert.equal(defs.reader('notable').all().length,37);
assert.equal(defs.reader('notable').all().filter(n=>recruited(String(n.notableId),meta,defs)).length,18);
assert.equal(defs.reader('item').all().length,20);
for(const id of ['wei','shu','wu']){const seq=defs.reader('chapterSequence').all().find(s=>s.factionId==='faction:'+id)!;assert.equal(seq.chapters.length,8);assert(seq.chapters.every(id=>defs.reader('chapter').get(String(id)).length===8));}
// Display values must track the converted training growth, not the legacy integer unit.
const growthRatio=defs.single('growthRule').economy.legacyBaseRatio;
const checkBaseText=(descKey:string,effects:readonly {funcType:string;referId:number}[])=>{
 for(const ref of effects)if(ref.funcType==='SlotBaseAdd'){
  const effect=defs.effect('SlotBaseAdd',ref.referId) as {add:number};
  const growth=Number((effect.add*growthRatio).toFixed(6));
  const text=defs.text(descKey);
  assert(text.includes('+'+growth+'（'),text);
  assert(text.includes(Number((growth*100).toFixed(4))+' 基礎經驗'),text);
 }
};
for(const item of defs.reader('item').all())for(const tier of item.tiers)checkBaseText(String(tier.descKey),tier.effects);
for(const notable of defs.reader('notable').all())for(const row of notable.unlocks)checkBaseText(String(row.descKey),[row]);
const stories=defs.reader('storyChapter').all().flatMap(s=>[s,...(s.variants??[]).map(v=>v.chapter)]);
for(const chapter of stories){assert.equal(chapter.nodes.length,2);for(const d of chapter.fieldStories??[])validateBattleStory(d);}
const ctx=(state:RunState)=>({state,defs});
const scenario=(id:string,choices:Record<string,string>={},depths:Record<string,number>={})=>({...initial,progress:{...initial.progress,chapterId:chapterId(id)},story:{...initial.story,choices,depths}});
const red={'W4.A':'boats','W4.B':'counterfire'},redDepth={'ch:wei.chibi':7};
assert.match(defs.text(String(chapterStory(ctx(scenario('ch:wei.hanzhong',red,redDepth)))!.opening.titleKey)),/成都/);
assert.match(defs.text(String(chapterStory(ctx(scenario('ch:wei.hanzhong',red,{'ch:wei.chibi':6})))!.opening.titleKey)),/漢中/);
assert.match(defs.text(String(chapterStory(ctx(scenario('ch:wei.dynasty',red,{...redDepth,'ch:wei.hanzhong':7})))!.opening.titleKey)),/北拒/);
assert.match(defs.text(String(chapterStory(ctx(scenario('ch:wei.gaoping',red,{...redDepth,'ch:wei.hanzhong':7,'ch:wei.dynasty':7})))!.opening.titleKey)),/治世/);
assert.match(defs.text(String(chapterStory(ctx(scenario('ch:wei.gaoping',red,{...redDepth,'ch:wei.hanzhong':7,'ch:wei.dynasty':6})))!.opening.titleKey)),/高平陵/);
assert(earnedRecruits(ctx({...initial,attributes:{...initial.attributes,values:{...initial.attributes.values,lead:80,war:85}}})).includes('notable:zhangliao'));
const saved=preserveRecruitment({...meta,unlockedNotables:['notable:guanyu']},ctx(initial));assert(saved.unlockedNotables!.includes('notable:guanyu'));
assert(!recruited('notable:lvbu',initial.metaSnapshot,defs));

let state:RunState={...scenario('ch:wei.hulao'),faction:factionId('faction:wei'),progress:{...initial.progress,chapter:chapterIndex(2),chapterId:chapterId('ch:wei.hulao'),pendingCampaign:true},roster:{members:[]}};
state=begin(state.progress.chapterId,ctx(state),wiring.fx);
let s=Session.restore(wiring,state);s.configureCampaign({skills:[],commanders:[]});const battle=s.startRealtimeCampaign();
assert(s.battlefieldStory);assert.equal(s.battlefieldStory.field.mode,'field');
for(let i=0;i<6000&&s.battlefieldStory.field.mode==='field';i++)s.advanceRealtimeCampaign(1/60);
assert.equal(s.battlefieldStory.field.mode,'story');const stopped=battle.time;
for(let i=0;i<100;i++)s.advanceRealtimeCampaign(1/60);assert.equal(battle.time,stopped);
const restored=Session.restore(wiring,JSON.parse(JSON.stringify(s.current)) as RunState);assert.equal(restored.battlefieldStory!.field.encounter.battle,restored.current.campaign!.realtime);
restored.pauseRealtimeCampaign(false);s=restored;
const p=s.battlefieldStory!,reward=Object.values(p.data.nodes).find(n=>n.kind==='reward'&&n.reward.allStats===10)!;assert(reward.kind==='reward');
// Exercise the production reward transaction independently of duel balance.
p.field.story.granted.push(reward.reward.id);let paid=bankFieldRewards(s.ctx),again=bankFieldRewards(ctx(paid));
assert.equal(paid.items.count['item:fangtian'],1);assert.equal(again.items.count['item:fangtian'],1);assert(again.earnedUnlocks!.includes('notable:lvbu'));
assert.equal(paid.attributes.values.war,Math.min(100,s.current.attributes.values.war+10));
assert(!recruited('notable:lvbu',paid.metaSnapshot,defs));assert(recruited('notable:lvbu',preserveRecruitment(meta,ctx(paid)),defs));

const trade=itemId('item:trade-pass');const merchant={...initial,campaign:null,items:{...initial.items,count:{[trade]:1}},equipment:{treasure:trade},economy:{...initial.economy,money:1000,chapterCamp:true,market:{chapter:initial.progress.chapter,offers:[{id:'test',itemId:itemId('item:bamboo'),price:120,bought:false}],target:null,fragmentBought:false}}};
assert.equal(itemPrice(120,ctx(merchant)),108);const bought=buy('test',ctx(merchant));assert(bought.ok);assert.equal(bought.state.economy.money,892);assert.equal(buy('test',ctx(bought.state)).ok,false);
assert.equal(equip(itemId('item:fangtian'),'weapon',ctx(merchant)),merchant);
assert.equal(defs.reader('item').get(String(trade)).tiers.length,1);
console.log('narrative release: 37 recruits / 20 items / fixed routes / actual contact / pause / resume / idempotent rewards / market passed');

// Fixed chapter replacements and both endings' prerequisites.
for(const id of ['wei','shu','wu'])assert.equal(defs.reader('notable').all().filter(n=>n.factionId==='faction:'+id).length,12);
assert.equal(defs.reader('notable').get('notable:lvbu').factionId,null);
const title=(state:RunState)=>defs.text(String(chapterStory(ctx(state))!.opening.titleKey));
const shuChoices={'S4.A':'pact','S6.A':'corridor','S7.B':'pact'};
assert.match(title(scenario('ch:shu.jingzhou',shuChoices,{'ch:shu.hanzhong':7})),/荊襄/);
assert.match(title(scenario('ch:shu.northern',shuChoices,{'ch:shu.hanzhong':7,'ch:shu.jingzhou':7})),/中興/);
assert.doesNotMatch(title(scenario('ch:shu.northern',shuChoices,{'ch:shu.hanzhong':7,'ch:shu.jingzhou':6})),/中興/);
const wuChoices={'U2.A':'scouts','U3.A':'escort','U3.B':'handover','U4.A':'pact','U4.B':'handover','U7.A':'charter','U7.B':'handover'};
const wuDepths={'ch:wu.hunt':5,'ch:wu.chibi':7,'ch:wu.jinghuai':7,'ch:wu.yiling':7,'ch:wu.shiting':7};
assert.match(title(scenario('ch:wu.jinghuai',wuChoices,wuDepths)),/合肥/);
assert.match(title(scenario('ch:wu.yiling',wuChoices,wuDepths)),/淮泗/);
assert.match(title(scenario('ch:wu.succession',wuChoices,wuDepths)),/大航海/);
assert.match(title(scenario('ch:wu.succession',wuChoices,{...wuDepths,'ch:wu.shiting':6})),/江東議局/);
assert.match(title(scenario('ch:wu.yiling',wuChoices,{...wuDepths,'ch:wu.jinghuai':6})),/江防重整/);
const ocean=defs.reader('ending').get('ending:wu.ocean');assert(ocean.storyRequirements?.some(r=>r.kind==='milestone'&&r.id==='field:battle:trade'));
for(const item of defs.reader('item').all())assert(item.sourceHint,'every item has a discoverable source');
// Full archer contact is a real hit, not a timer.
const archerField=structuredClone(p.field);archerField.encounter.battle.phase='combat';archerField.encounter.battle.cinematic=null;for(const u of archerField.encounter.battle.units){u.kind='archer';u.struck=false;u.hp=u.maxHp;}assert(!armiesEngaged(archerField));archerField.encounter.battle.units[0]!.hp-=1;assert(armiesEngaged(archerField));
// Gear affects resolved damage, the forecast and the saved one-use recovery together.
const build={war:70,lead:70,trait:'none' as const},plain=createDuel(build,build,711);plain.enemyAction='rest';const armed=structuredClone(plain);armed.ally.equipmentDamage=.1;assert(resolveDuel(plain,'attack'));assert(resolveDuel(armed,'attack'));assert.equal(armed.last!.damageToEnemy,Math.round(plain.last!.damageToEnemy*1.1));
const hurt=createDuel(build,build,811);hurt.ally.injury=hurt.ally.injuryLimit*.72;hurt.ally.emergencyHeal={threshold:.3,ratio:.1,used:false};hurt.enemyAction='rest';const preview=forecastDuel(hurt,'rest','rest');assert(preview);const hpBefore=hurt.ally.injury;resolveDuel(hurt,'rest');assert(hurt.ally.emergencyHeal.used);assert(hurt.ally.injury<hpBefore);const resumed=JSON.parse(JSON.stringify(hurt));resumed.enemyAction='rest';resolveDuel(resumed,'rest');assert.equal(resumed.ally.injury,hurt.ally.injury);
const rally=createRally({int:70,pol:70,special:null,passives:[]},{int:65,pol:65,special:null,passives:[]},171);const copy=JSON.parse(JSON.stringify(rally));const action=chooseRallyAction(rally,rally.turn);actRally(rally,rally.turn,action);actRally(copy,copy.turn,action);assert.deepEqual(copy,rally,'saved rally has identical next draw and result');
console.log('Additional integration: three routes, archer contact, tagged ending gates, damage/healing and deterministic rally restore passed.');

const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}});
saveRun(Session.restore(wiring,paid),[]);const fromDisk=restoreRun(wiring);assert(fromDisk.session,fromDisk.notice);assert(fromDisk.session.current.story.milestones.includes('field:battle:hulao'));
const alternate=scenario('ch:wu.succession',{...wuChoices,'U8.A':'hearing','U8.B':'handover'},wuDepths),alternateChapter=chapterStory(ctx(alternate))!;
const queued={...alternate,story:{...alternate.story,scenes:[alternateChapter.opening]}};assert.equal(migrateStoryRun(queued,4,defs).story.scenes[0]!.id,alternateChapter.opening.id);
for(const chapter of stories)for(const companion of chapter.companions??[])for(const event of companion.fieldStories??[])validateBattleStory(event);
const dupGear=acquire(itemId('item:fangtian'),ctx({...paid,items:{...paid.items,naturalCounts:{}}}));assert.equal(dupGear.state.items.fragments?.['item:fangtian']??0,0);
console.log('Disk save migration passed: earned field flags, alternative choices/scenes and no fragments for single-tier gear.');
