/** Genuine in-memory journeys. No state injection, rerolls, UI storage or synthetic stars. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Session } from '../src/app/session.js';
import { factionId, seed } from '../src/contracts/core/ids.js';
import type { SkillId } from '../src/contracts/core/ids.js';
import type { DreamEntryConfig, MetaState, BattleLoadout } from '../src/contracts/core/state.js';
import { ATTRS, APTITUDE_GRADES } from '../src/contracts/core/primitives.js';
import { emptyDraft, emptyMeta, limits, validate, designateQuota } from '../src/modules/dream-entry.js';
import { catalog, purchase } from '../src/modules/shop.js';
import { defs, wiring } from './tests/harness.js';
import { POLICIES } from './lib/policies.js';

const families = Number(process.argv[2] ?? 8);
const maxLives = Number(process.argv[3] ?? 20);
const output = process.argv[4] ?? 'artifacts/gameplay-audit/2026-09-14';
const modes = (process.argv[5] ?? 'greedy-gain,focus-martial,focus-civil').split(',');
const resumeDir=process.argv[6]==='-'?undefined:process.argv[6];
const requireSameLife=process.argv[7]!=='milestones';
if (!Number.isInteger(families) || families < 1 || !Number.isInteger(maxLives) || maxLives < 1) throw Error('Positive integer counts required');
mkdirSync(output, { recursive: true });
const prepared: Record<string, string> = { 'S4.A': 'pact', 'S5.B': 'handover', 'S6.A': 'corridor',
  'S6.B': 'handover', 'S7.A': 'rescue', 'S7.B': 'pact', 'S8.A': 'delegate', 'S8.B': 'handover' };
type Entry = { step: number; turn: number; chapter: string; kind: string; detail: unknown; money: number };
const scoreItem = (id: string) => {
  const d = defs.reader('item').get(id);
  // Public item text only, not unseen drops or future random state.
  const text = d.tiers.map(t => defs.text(String(t.descKey))).join(' ');
  return (/兵力|軍勢|傷害|恢復|訓練|功績|好感|武功|文功/.test(text) ? 100 : 0) + d.rarity * 5;
};
function draftFor(meta: MetaState, mode: string): DreamEntryConfig {
  let draft = emptyDraft(meta, defs);
  const lim = limits(meta, defs);
  const preferred = mode.includes('focus-civil') ? ['int', 'pol', 'lead', 'war'] as const : ['war', 'lead', 'int', 'pol'] as const;
  for (let pass = 0; pass < 6; pass++) for (const attr of preferred) {
    const grade = APTITUDE_GRADES[APTITUDE_GRADES.indexOf(draft.aptitudes[attr]) + 1];
    if (!grade) continue;
    const next = { ...draft, aptitudes: { ...draft.aptitudes, [attr]: grade } };
    if (!validate(next, meta, defs).length) draft = next;
  }
  for (const talent of lim.unlockedTalents) {
    const next = { ...draft, talents: [...draft.talents, talent] };
    if (!validate(next, meta, defs).length) draft = next;
  }
  draft = { ...draft, carriedItems: lim.carriableItems.slice().sort((a,b) => scoreItem(b)-scoreItem(a)).slice(0,lim.carrySlots),
    designatedCompanions: lim.designatable.slice().sort((a,b) => (meta.notableCodex[b]?.star ?? 0)-(meta.notableCodex[a]?.star ?? 0)).slice(0,designateQuota(draft,defs)) };
  if (validate(draft,meta,defs).length) throw Error('Invalid entry draft');
  return draft;
}
function spendDestiny(meta: MetaState, mode: string) {
  const purchases: unknown[] = [];
  for (let i=0;i<100;i++) {
    const available = catalog(meta,defs).filter(x => x.nextLevel && !x.blockedBy.length);
    // Fund the core aptitude budget and rank ceiling before optional collection purchases.
    const core = available.filter(x=>String(x.item.item)==='shop:career'?x.currentLevel<5:
      String(x.item.item)==='shop:aptPoints'||String(x.item.item).startsWith('shop:aptCap.')&&x.currentLevel<2);
    const pool=core.length?core:available;
    const row=pool.slice().sort((a,b)=>a.nextLevel!.cost-b.nextLevel!.cost)[0];
    if (!row?.affordable || !row.nextLevel) break;
    const result = purchase(row.item.item,meta,defs);
    if (!result.ok) throw Error(result.reason);
    purchases.push({item:row.item.item,level:row.nextLevel.level,cost:row.nextLevel.cost});
    meta=result.meta;
  }
  return {meta,purchases};
}
function loadout(s:Session): BattleLoadout {
  const values = s.current.attributes.values;
  const score = (id:SkillId, player:boolean) => {
    const d=defs.reader('skill').get(String(id));
    const power=player ? (defs.single('growthRule').learning.power[s.abilityLevel(id)-1] ?? 1) : 1;
    return d.action.ratio * power * (player?values[d.action.actorAttr]:50) * (['physical','magic'].includes(d.action.kind)?1:d.action.kind==='heal'?0.65:0.35);
  };
  const skills=s.current.abilities.skills.slice().sort((a,b)=>score(b,true)-score(a,true)).slice(0,3);
  const commanders=s.eligibleCommanders().slice().sort((a,b)=>
    (s.current.roster.members.find(m=>m.notableId===b)?.affinity??0)-(s.current.roster.members.find(m=>m.notableId===a)?.affinity??0))
    .flatMap(notableId=>{
      const skillId=s.commanderSkills(notableId).slice().sort((a,b)=>score(b,false)-score(a,false))[0];
      return skillId ? [{notableId,skillId}] : [];
    }).slice(0,3);
  return {skills,commanders};
}
function runLife(meta:MetaState, runSeed:number, mode:string, detailed:boolean) {
  const policy=POLICIES.find(p=>p.name===mode.replace('wei-','')) ?? POLICIES.find(p=>p.name==='greedy-gain')!;
  const draft=draftFor(meta,mode);
  const s=Session.start(wiring,meta,draft,seed(runSeed));
  const trace:Entry[]=[];
  let step=0,actions=0,events=0,failedEvents=0,scenes=0,storyPaid=0,upgrades=0,boughtItems=0,boughtFragments=0;
  let noSkillsAtStart=s.current.abilities.skills.length===0, noSkillTurns=0, capTurns=0;
  const chapters:unknown[]=[];
  const depths:number[]=[];
  const eventIds:Record<string,number>={},rarities:Record<string,number>={},choices:Record<string,string>={};
  const record=(kind:string,detail:unknown)=>{step++;if(detailed)trace.push({step,kind,detail,turn:s.current.progress.turn,chapter:String(s.current.progress.chapterId),money:s.money});};
  record('entry',{runSeed,draft,metaPoints:meta.points,attributes:s.current.attributes,notableStars:meta.notableCodex,items:meta.itemCodex});
  const spend=()=>{
    if(mode==='no-spend')return;
    for(let n=0;n<50;n++){
      const row=s.learningOffers().filter(x=>x.status==='ready').sort((a,b)=>Number(b.kind==='skill')-Number(a.kind==='skill')||a.cost-b.cost)[0];
      if(!row)break;
      if(!s.upgradeAbility(row.id))break;
      upgrades++;record('upgrade',{id:row.id,level:row.level+1,cost:row.cost});
    }
    for(const row of s.marketShelf().offers.filter(x=>!x.bought).slice().sort((a,b)=>scoreItem(b.itemId)-scoreItem(a.itemId))){
      // Reserve 120 for upcoming paid commission options; chapter-end money is spendable now.
      if(row.price>s.money-(s.needsChapterCamp?0:120))continue;
      if(s.buyMarket(row.id)){boughtItems++;record('market',row);}
    }
    if(!s.marketShelf().fragmentBought){
      const target=s.fragmentTargets().slice().sort((a,b)=>scoreItem(b.itemId)-scoreItem(a.itemId))[0];
      if(target && s.money>=s.fragmentPrice(target.itemId)+(s.needsChapterCamp?0:120)){
        s.selectFragment(target.itemId);
        if(s.buyFragment()){boughtFragments++;record('fragment',{item:target.itemId,price:s.fragmentPrice(target.itemId)});}
      }
    }
    const candidates=s.current.roster.members.filter(m=>s.storyRows(m.notableId).some(r=>!r.completed && r.blockers.length===0))
      .sort((a,b)=>b.affinity-a.affinity);
    if(candidates[0] && s.current.stories?.tracked!==candidates[0].notableId){s.trackStory(candidates[0].notableId);record('track',candidates[0].notableId);}
  };
  for(let guard=0;guard<3000&&!s.isOver;guard++){
    if(s.storyScene){
      const scene=s.storyScene, before=s.money, levels=s.current.abilities.levels;
      s.acknowledgeStory(scene.id);scenes++;if(s.money>before)storyPaid++;
      record('scene',{id:scene.id,beats:scene.beats?.length??1,teachings:scene.teachings,levelsBefore:levels,levelsAfter:s.current.abilities.levels,moneyDelta:s.money-before});continue;
    }
    if(s.needsEndingChoice){
      const candidates=s.storyEndingOptions();
      const ending=candidates.find(e=>!meta.collection.reachedEndings.includes(e.ending))??candidates[0]!;
      s.chooseStoryEnding(String(ending.ending));record('endingChoice',ending.ending);continue;
    }
    if(s.needsChapterCamp){spend();s.continueChapter();record('continueChapter',null);continue;}
    if(s.storyChoice){
      const node=s.storyChoice;
      const option=mode==='blind-story'?node.options[0]!.id:prepared[node.id]??node.options[0]!.id;
      choices[node.id]=option;s.chooseStory(node.id,option);record('storyChoice',{id:node.id,option});continue;
    }
    if(s.needsFactionChoice){
      const wanted=mode.startsWith('wei')?'faction:wei':'faction:shu';
      const pick=s.factionOptions().find(f=>String(f.factionId)===wanted&&f.eligible);
      if(pick)s.chooseFaction(factionId(wanted));else s.noFactionAvailable();
      record('faction',pick?.factionId??null);continue;
    }
    if(s.needsSuperiors){s.assignSuperiors(s.superiorCandidates().filter(id=>meta.notableCodex[String(id)]?.completedWith).slice(0,s.bondQuota()));record('superiors',s.current.roster);continue;}
    if(s.needsCampaign){
      if(s.campaignState()?.phase==='configuring'){
        spend();s.configureCampaign(loadout(s));record('configure',{host:s.campaignState()?.host,loadout:s.campaignState()?.loadout,learning:s.learningOffers().map(r=>({id:r.id,status:r.status,level:r.level}))});
      }
      let cleared=0,defeated=false;
      if(mode==='no-battle')s.withdraw();
      else {
        const battle=s.startRealtimeCampaign();
        for(let frame=0;frame<120000&&battle.status!=='finished';frame++){
          if(frame%6===0&&battle.phase==='combat'&&!battle.cinematic){
            const allied=battle.units.filter(u=>u.side==='ally').reduce((n,u)=>n+u.hp,0);
            const chosen=battle.skills.filter(k=>k.effect!=='heal'||battle.initial-allied>=k.damage*.5)
              .filter(k=>k.effect!=='buff'||battle.buff<=0).filter(k=>k.effect!=='debuff'||battle.debuff<=0)
              .sort((a,b)=>Number(b.effect==='heal'&&allied<battle.initial*.6)-Number(a.effect==='heal'&&allied<battle.initial*.6)||b.damage/b.cost-a.damage/a.cost);
            for(const skill of chosen)if(s.castRealtimeSkill(skill.id))break;
          }
          s.advanceRealtimeCampaign(1/30);
        }
        if(battle.status!=='finished')throw Error('Live battle did not finish');
        const result=s.realtimeCampaignResult();cleared=result.cleared;defeated=result.defeated;
        record('battle',{time:battle.time,kills:battle.kills,lost:battle.lost,initial:battle.initial,casts:battle.castCount,result});
        s.settleRealtimeCampaign();
      }
      depths.push(cleared);
      const chapter={chapter:s.current.progress.chapterId,turn:s.current.progress.turn,cleared,defeated,career:s.current.career,attributes:s.current.attributes.values,money:s.money,earned:s.current.economy?.earned,spent:s.current.economy?.spent,abilities:s.current.abilities,roster:s.current.roster,items:s.current.items};
      chapters.push(chapter);record('chapterResult',chapter);continue;
    }
    if(!s.hasActed){
      spend();
      const slot=mode.includes('balanced') ? ([0,1,2,3] as const).slice().sort((a,b)=>{
        const score=(i:0|1|2|3)=>{const p=s.previewTraining(i),line=p.meritGain.line;return p.expectedGain*3+(p.meritGain.amount+(p.hasCommission?18:0))*(s.current.career[line]<Math.max(s.current.career.civil,s.current.career.martial)?2:0.5)+(p.hasEncounter?3:0);};return score(b)-score(a);
      })[0]! : policy.chooseSlot(s),preview=s.previewTraining(slot);
      if(!s.current.abilities.skills.length)noSkillTurns++;
      if(ATTRS.some(a=>s.current.attributes.values[a]>=s.attrCap(a)))capTurns++;
      s.selectSlot(slot);actions++;
      record('action',{slot,preview,training:s.current.turn.training,attributes:s.current.attributes.values,career:s.current.career});
    }
    let guardEvents=0;
    while(s.pendingEvent){
      if(++guardEvents>64)throw Error('Event queue failed to drain');
      const offer=s.pendingEvent, option=policy.chooseOption(s,offer),def=defs.reader('event').get(String(offer.eventDefId));
      if(!offer.optionStates[option]?.enabled)throw Error('Policy selected disabled option');
      const beforeLevels=s.current.abilities.levels;
      s.resolveEvent(option);events++;
      const result=s.current.turn.resolved.at(-1);
      if(result&&!result.passed)failedEvents++;
      eventIds[offer.eventDefId]=(eventIds[offer.eventDefId]??0)+1;
      const rarityKey=def.trigger.kind+'/'+offer.rarity;rarities[rarityKey]=(rarities[rarityKey]??0)+1;
      record('event',{id:offer.eventDefId,title:defs.text(String(def.titleKey)),type:def.trigger.kind,rarity:offer.rarity,option,options:offer.optionStates,result,beforeLevels,afterLevels:s.current.abilities.levels});
    }
    if(s.canAdvance())s.advance();
  }
  if(!s.isOver)throw Error(`Run failed to finish: ${runSeed}`);
  const settlement=s.settle(meta);
  const duplicate=s.settle(settlement.meta);
  if(duplicate.pointsGained!==0)throw Error('Duplicate settlement paid');
  const summary=s.summary();
  if(summary.turnsPlayed!==actions)throw Error('Turn/action accounting mismatch');
  const purse=s.current.economy;
  if(purse.money<0||purse.money!==purse.earned-purse.spent||purse.money!==purse.ledger.reduce((n,x)=>n+x.amount,0))throw Error('Money ledger mismatch');
  if(new Set(purse.ledger.map(x=>x.id)).size!==purse.ledger.length)throw Error('Duplicate ledger transaction');
  if(s.learningOffers().some(r=>r.level===0))throw Error('Locked ability leaked into training');
  const milestones=s.storyProgress().milestones;
  const both=milestones.includes('shu.guanyu-rescued')&&milestones.includes('shu.kongming-rested');
  const result={runSeed,life:meta.runIndex+1,actions,events,failedEvents,scenes,storyPaid,upgrades,boughtItems,boughtFragments,noSkillsAtStart,noSkillTurns,capTurns,
    depths,chapters,choices,rarities,eventIds,uniqueEvents:Object.keys(eventIds).length,milestones,both,topNarrative:both&&summary.pointsMultiplier===2,
    ending:summary.endingId,multiplier:summary.pointsMultiplier,career:s.current.career,rankSummit:Math.min(s.current.career.civil,s.current.career.martial)>=10,
    finalMoney:s.money,earned:s.current.economy?.earned,spent:s.current.economy?.spent,ledger:s.current.economy?.ledger,
    stagesInSummary:summary.stagesCleared,points:settlement.pointsGained,notableFragments:settlement.notableFragments,notableCodex:settlement.meta.notableCodex,starsRaised:settlement.starRaised,itemTiersRaised:settlement.itemTierRaised,
    config:draft,metaPurchasesBefore:meta.shop.purchased,abilities:s.current.abilities,finalStateHash:createHash('sha256').update(JSON.stringify(s.current)).digest('hex')};
  record('settlement',{...settlement,meta:undefined});
  return {result,meta:settlement.meta,trace};
}

const journeys=[];
for(const mode of modes)for(let family=0;family<families;family++){
  const id=`${mode}-${family+1}`;
  const previous=resumeDir ? JSON.parse(readFileSync(`${resumeDir}/${id}.json`,'utf8')) as {finalMeta:MetaState;firstTop:number|null;firstSummit:number|null} : null;
  let meta=previous?.finalMeta??emptyMeta();
  const initialLife=meta.runIndex;
  const lives=[];
  let firstTop:number|null=previous?.firstTop??null,firstSummit:number|null=previous?.firstSummit??null;
  for(let life=0;life<maxLives;life++){
    // Same seeds between policies; all outcomes kept, including failures. No retry selection.
    const runSeed=9000+family+(life+initialLife)*100;
    const out=runLife(meta,runSeed,mode,family===0);
    meta=out.meta;
    if(out.result.topNarrative&&firstTop===null)firstTop=initialLife+life+1;
    if(out.result.rankSummit&&firstSummit===null)firstSummit=initialLife+life+1;
    const bought=spendDestiny(meta,mode);meta=bought.meta;
    lives.push({...out.result,destinyPurchases:bought.purchases,remainingDestiny:meta.points});
    if(family===0)writeFileSync(`${output}/${id}-life-${initialLife+life+1}.json`,JSON.stringify(out.trace,null,2));
    // Full narrative maximum plus BOTH recorded endings and actual rank summit, not just its unlocked cap.
    const maximumMet=mode.startsWith('wei') ? out.result.ending==='ending:pillar' : requireSameLife ? out.result.topNarrative&&out.result.rankSummit : firstTop!==null&&firstSummit!==null;
    if(process.argv[8]!=='fixed'&&!mode.startsWith('wei')&&maximumMet&&['ending:shu.reunion','ending:shu.dawn'].every(e=>meta.collection.reachedEndings.some(x=>String(x)===e)))break;
  }
  const journey={id,mode,family,resumedFrom:resumeDir??null,initialLife,firstTop,firstSummit,lives,finalMeta:meta};
  journeys.push(journey);
  writeFileSync(`${output}/${id}.json`,JSON.stringify(journey,null,2));
  console.log(JSON.stringify({id,lives:lives.length,firstTop,firstSummit,endings:meta.collection.reachedEndings,rank:lives.at(-1)?.career,points:meta.stats.pointsEarnedTotal}));
}
writeFileSync(`${output}/summary.json`,JSON.stringify({families,maxLives,modes,method:'Session.start, legal draft, story/event/action/shop/training/campaign APIs, Session.settle, destiny purchase; no state injection or UI save access',journeys:journeys.map(j=>({...j,lives:j.lives.map(({chapters,ledger,...r})=>r)}))},null,2));
