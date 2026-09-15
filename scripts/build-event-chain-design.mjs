/** Compile and validate a DESIGN packet only. Never modifies runtime content or saves. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import wei from '../docs/event-chains/wei-personal.mjs';
import shu from '../docs/event-chains/shu-personal.mjs';
import linked from '../docs/event-chains/linked.mjs';

const read = path => JSON.parse(readFileSync(path,'utf8'));
const definitions = ['core','wei','shu'].flatMap(p=>read(`content/${p}/defs.json`));
const texts = Object.assign({},...['core','wei','shu'].map(p=>read(`content/${p}/texts.json`)));
const people = definitions.filter(d=>d.kind==='notable');
const registry = new Map(definitions.map(d=>[d.id,d]));
const person = slug => registry.get('notable:'+slug);
const name = slug => texts[person(slug)?.nameKey];
const attributes = {lead:'統御',war:'武力',int:'智力',pol:'政務'};
const entry = {
  3:{chapter:1,leadAffinity:40,othersAffinity:20,leadCooperations:2,othersCooperations:1,base:40,small:[32],hard:46,reference:50},
  4:{chapter:2,leadAffinity:60,othersAffinity:40,leadCooperations:4,othersCooperations:2,base:60,small:[40,43],hard:60,reference:65},
  5:{chapter:3,leadAffinity:70,othersAffinity:50,leadCooperations:6,othersCooperations:3,base:80,small:[49,51,53],hard:76,reference:80},
};
const newRewards = {
  'draft-trait:shousi':{name:'死守',kind:'trait',tier:'peerless',effect:'每場戰役一次：我方兵力首次低於初始 40%，受到的普通攻擊傷害減少 15%，持續 6/7/8/9/10 秒；不免疫技能、不補兵、不刷新觸發。'},
  'draft-trait:huliang':{name:'護糧',kind:'trait',tier:'fine',effect:'每場戰役第一次擊退整波後，恢復軍糧 5/6/7/8/10，最高不超過軍糧上限；過場只結算一次，後續波次不再發。'},
  'draft-skill:fanjian':{name:'反間',kind:'skill',tier:'fine',effect:'消耗軍糧 35，CD 16 秒；敵方普通攻擊降低 15/18/22/26/30%，持續 6 秒。無直接傷害，不與同類減攻相乘，取較強值。'},
  'draft-skill:tongxin':{name:'同心',kind:'skill',tier:'peerless',effect:'消耗軍糧 35，CD 18 秒；我方普通攻擊提高 10/12/15/18/22%，持續 8 秒。無治療、不復活，不與同類鼓舞相乘，取較強值。'},
};
const rewardLabel = id => newRewards[id]?.name ?? texts[registry.get(id)?.nameKey];
const sources = [...wei,...shu,...linked];
assert.equal(people.length,18,'Character catalog changed; extend the design packet');
assert.equal(new Set(sources.map(c=>c.id)).size,sources.length,'Duplicate chain ID');
const checkRule=definitions.find(d=>d.kind==='checkRule');
const chance=(value,dc)=>{
  let hits=0;
  for(let r=checkRule.rollMin;r<=checkRule.rollMax;r++)
    hits+=Number(Math.round(value*(1+(r-checkRule.rollCenter)/checkRule.rollSpread))>=dc);
  return hits/(checkRule.rollMax-checkRule.rollMin+1);
};
const chains=sources.map(c=>{
  const n=c.stages.length,rule=entry[c.stars];
  assert(n>=3&&n<=5,`${c.id}: dedicated chains must be 3–5 stages`);
  assert(rule&&rule.small.length>=n-2,`${c.id}: missing intermediate check budget`);
  assert(c.cast.length>=1&&c.cast.length<=3&&new Set(c.cast).size===c.cast.length,`${c.id}: cast`);
  c.cast.forEach(who=>assert(person(who),`${c.id}: unknown ${who}`));
  assert(registry.has(c.reward)||newRewards[c.reward],`${c.id}: missing reward`);
  if(registry.has(c.reward))assert(['trait','skill','item'].includes(registry.get(c.reward).kind));
  const intro=c.cast.map(who=>{
    const options=definitions.filter(d=>d.kind==='event'&&d.trigger?.kind==='notable'&&
      d.trigger.cast.length===1&&d.trigger.cast[0].notableId===person(who).notableId&&d.progression?.rarity===1);
    assert(options.length,`${who}: no existing introduction`);
    return options[0].id;
  });
  const stages=c.stages.map((row,i)=>{
    assert.equal(row.length,8,`${c.id}/${i+1}: field count`);
    const [title,narration,lines,cashLabel,cashText,proceedLabel,successText,attr]=row;
    for(const value of [title,narration,cashLabel,cashText,proceedLabel,successText])assert(typeof value==='string'&&value.trim(),`${c.id}: missing writing`);
    assert.equal(i===0,attr===null,`${c.id}: only first stage is unchecked`);
    if(i>0)assert(attributes[attr]&&typeof c.failures?.[i+1]==='string',`${c.id}: missing check or failure scene`);
    assert(lines.length>=c.cast.length,`${c.id}/${i+1}: silent participant`);
    const dialogue=lines.map(line=>{
      const split=line.indexOf('：'),speaker=line.slice(0,split),text=line.slice(split+1);
      assert(split>0&&text.length>0,`${c.id}: malformed dialogue`);
      assert(c.cast.map(name).includes(speaker)||speaker==='你',`${c.id}: unknown speaker ${speaker}`);
      return {speaker:speaker==='你'?'player':person(c.cast.find(who=>name(who)===speaker)).notableId,text};
    });
    c.cast.forEach(who=>assert(dialogue.some(d=>d.speaker===person(who).notableId),`${c.id}/${i+1}: ${who} has no line`));
    const stageId=`design-chain:${c.id}.s${i+1}`,terminal=i===n-1;
    const dc=i===0?null:terminal?rule.hard:rule.small[i-1];
    const prize=i===0?0.5*rule.base:terminal?({3:5,4:7,5:10}[n])*rule.base:rule.base;
    return {id:stageId,number:i+1,title,beats:[{speaker:null,text:narration},...dialogue],
      salary:({3:50,4:70,5:100}[c.stars]),
      cashOut:{id:`${stageId}.cash-out`,label:cashLabel,check:null,money:rule.base*(1.5+0.5*i),status:'cashedOut',next:null,
        beats:[{speaker:null,text:cashText}]},
      proceed:{id:`${stageId}.${terminal?'challenge':'continue'}`,label:proceedLabel,
        check:dc===null?null:{attr,dc,difficulty:terminal?'hard':'minor',referenceValue:rule.reference,referenceChance:chance(rule.reference,dc)},
        success:{money:prize,reward:terminal?c.reward:null,status:terminal?'completed':'active',
          next:terminal?null:`design-chain:${c.id}.s${i+2}`,beats:[{speaker:null,text:successText}]},
        failure:i===0?null:{money:rule.base*(terminal?1:0.5),reward:null,status:'failed',next:null,
          beats:[{speaker:null,text:c.failures[i+1]}]}},
      // Any affinity changes use the existing per-person/per-turn ceiling; only actual cast members receive these.
      affinity:{cashOut:1,success:terminal?4:i===0?1:2,failure:1},
    };
  });
  const cumulativeCheckChance=stages.reduce((p,s)=>p*(s.proceed.check?.referenceChance??1),1);
  return {id:'design-chain:'+c.id,title:c.title,type:c.cast.length===1?'personal':c.cast.length===2?'duo':'trio',
    rarity:c.stars,totalStages:n,cast:c.cast.map(w=>person(w).notableId),theme:c.theme,
    start:{route:c.route??'any',earliestChapter:rule.chapter,minimumAvailableStoryTurns:2*n-1,requiredIntroductions:intro,
      participants:c.cast.map((who,i)=>({id:person(who).notableId,affinity:i===0?rule.leadAffinity:rule.othersAffinity,cooperations:i===0?rule.leadCooperations:rule.othersCooperations})),
      priorPersonalChainRequired:false,simultaneousActionSlotRequired:false},
    terminalReward:{id:c.reward,name:rewardLabel(c.reward),newDefinitionRequired:!!newRewards[c.reward]},
    referenceChecksOnlyCompletionChance:cumulativeCheckChance,stages};
});

const coverage=people.map(p=>{
  const solo=chains.filter(c=>c.type==='personal'&&c.cast.includes(p.id)),duo=chains.filter(c=>c.type==='duo'&&c.cast.includes(p.id)),trio=chains.filter(c=>c.type==='trio'&&c.cast.includes(p.id));
  assert.equal(solo.length,1,`${p.id}: needs exactly one authored personal chain`);
  assert(duo.length>=1,`${p.id}: missing duo`);
  return {id:p.id,name:texts[p.nameKey],personal:solo.map(c=>c.id),duo:duo.map(c=>c.id),trio:trio.map(c=>c.id)};
});
// Every specified cast can fit into the three freely designated companion slots once known,
// regardless of the later faction; faction-bound plots additionally use their own superior pool.
const rules=definitions.find(d=>d.kind==='gameRules');
for(const c of chains){
  assert(c.cast.length<=rules.companionCount,'Cast cannot be assembled');
  if(c.start.route!=='any'){
    const pool=definitions.find(d=>d.kind==='notablePool'&&d.factionId===`faction:${c.start.route}`);
    assert(pool&&c.cast.every(id=>pool.entries.some(e=>e.notableId===id)),'Faction plot has an unavailable cast');
  }
  for(const stage of c.stages){
    assert(stage.cashOut.money>=(stage.proceed.success.reward?0:stage.proceed.success.money),'Early exit must pay more immediately');
    if(stage.number>1)assert.equal(stage.proceed.failure.next,null);
  }
  const stagesById=new Map(c.stages.map(s=>[s.id,s]));
  const walk=(id,path=[])=>{
    assert(!path.includes(id)&&path.length<5,`${c.id}: cyclic or overlong path`);
    const stage=stagesById.get(id);assert(stage,`${c.id}: unresolved next stage`);
    assert.equal(stage.cashOut.next,null);
    const success=stage.proceed.success;
    if(success.next){assert.equal(success.status,'active');assert.equal(success.reward,null);walk(success.next,[...path,id]);}
    else {assert.equal(success.status,'completed');assert.equal(success.reward,c.terminalReward.id);assert.equal(path.length+1,c.totalStages);}
  };
  walk(c.stages[0].id);
}
const packet={status:'design-only-not-runtime',date:'2026-09-14',newRewards,coverage,chains};
writeFileSync('docs/event-chains/catalog.json',JSON.stringify(packet,null,2)+'\n');

const titleFor=id=>chains.find(c=>c.id===id)?.title;
const coverageTable=['| 人物 | 個人故事 | 雙人連動 | 三人連動 |','|---|---|---|---|',...coverage.map(p=>`| ${p.name} | ${p.personal.map(titleFor).join('、')} | ${p.duo.map(titleFor).join('、')} | ${p.trio.map(titleFor).join('、')||'—'} |`)].join('\n');
const pct=n=>(n*100).toFixed(1)+'%';
const line=b=>`${b.speaker===null?'系統（無頭像）':b.speaker==='player'?'你':texts[registry.get(b.speaker).nameKey]}：${b.text}`;
function renderChain(c){
  const trigger=c.start;
  const header=[`## ${c.title}`,`\`${c.id}\` · ${'★'.repeat(c.rarity)} · ${c.totalStages} 段 · ${c.cast.map(id=>texts[registry.get(id).nameKey]).join('＋')}`,c.theme,
    `開始：${trigger.route==='any'?'任何路線，角色在隊':trigger.route==='wei'?'魏線':'蜀線'}；全局第 ${trigger.earliestChapter} 章起；至少剩 ${trigger.minimumAvailableStoryTurns} 個扣除主線後的可用故事回合。`,
    `人物門檻：${trigger.participants.map(p=>`${texts[registry.get(p.id).nameKey]}好感 ${p.affinity}、共事 ${p.cooperations} 次`).join('；')}。各自相識已看過；不要求個人長篇通關，不要求同格。`,
    `終章成功：${c.terminalReward.name}（${c.terminalReward.id}，${c.terminalReward.newDefinitionRequired?'新能力草案，尚未實作':c.terminalReward.id.startsWith('item:')?'現有器物':'現有能力教學'}）。`,
    `本串所有檢定都恰達參考能力值且無加成時，純擲骰全通機率 ${pct(c.referenceChecksOnlyCompletionChance)}。這不是玩家實測通關率。`];
  for(const s of c.stages){
    header.push(`### ${s.number}／${c.totalStages}　${s.title}`,...s.beats.map(line),
      `本段出場薪水 +${s.salary} 金幣，只領一次；以下選項金額皆為額外獎金。`,
      `**結案：${s.cashOut.label}** — 無檢定，額外 +${s.cashOut.money} 金幣，參與者各好感 +${s.affinity.cashOut}，本輪結案。`,
      ...s.cashOut.beats.map(line),
      `**${s.number===c.totalStages?'終章挑戰':'續行'}：${s.proceed.label}** — ${s.proceed.check?`${attributes[s.proceed.check.attr]} ${s.proceed.check.difficulty==='hard'?'困難':'小'}檢定，DC ${s.proceed.check.dc}；能力 ${s.proceed.check.referenceValue} 無加成時約 ${pct(s.proceed.check.referenceChance)}`:'無檢定'}。`,
      `成功：額外 +${s.proceed.success.money} 金幣，參與者各好感 +${s.affinity.success}${s.proceed.success.reward?'，取得上述終章大獎並完成故事':'，排入下一段'}。`,
      ...s.proceed.success.beats.map(line));
    if(s.proceed.failure)header.push(`失敗：額外 +${s.proceed.failure.money} 金幣，參與者各好感 +${s.affinity.failure}，本輪收尾，無終章大獎；以前領取的獎勵保留。`,...s.proceed.failure.beats.map(line));
  }
  return header.join('\n\n');
}
for(const [file,label,filter] of [['WEI-PERSONAL.md','魏國十二位人物',c=>c.type==='personal'&&c.cast[0].startsWith('notable:')&&person(c.cast[0].slice(8)).factionId==='faction:wei'],
  ['SHU-PERSONAL.md','蜀國六位人物',c=>c.type==='personal'&&person(c.cast[0].slice(8)).factionId==='faction:shu'],
  ['LINKED-STORIES.md','九條雙人與三條三人連動',c=>c.type!=='personal']]){
  writeFileSync('docs/event-chains/'+file,`# ${label}\n\n設計稿，尚未接入遊戲。由作者稿產生，請以 [總覽與共通規則](README.md) 解讀門檻、薪資、檢定、重複教學及存檔規則。\n\n`+chains.filter(filter).map(renderChain).join('\n\n---\n\n')+'\n');
}
writeFileSync('docs/event-chains/COVERAGE.md','# 人物完整覆蓋表\n\n由目前遊戲人物定義逐一核對；主角參與每一串，這裡只列可培養名士。\n\n'+coverageTable+'\n');
console.log(JSON.stringify({characters:coverage.length,personal:chains.filter(c=>c.type==='personal').length,duos:chains.filter(c=>c.type==='duo').length,trios:chains.filter(c=>c.type==='trio').length,stages:chains.reduce((n,c)=>n+c.totalStages,0),newRewardDefinitions:Object.keys(newRewards).length,checks:'Coverage, all cast dialogue, branch closure, 3–5 stages, first/mid/final checks, current reward IDs, intro references, assembleable cast and reward ordering passed.'},null,2));
