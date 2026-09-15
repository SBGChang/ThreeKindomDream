import assert from 'node:assert/strict';
import {createCardDebate,resolveCardDebate,debateBlock,debateHandSize,debateIntent,DEBATE_RECOVER,DEFAULT_DEBATE_BUILD,type DebateCard,type CardDebate} from '../../src/app/card-debate-model.js';
const policies=['evidence','counter','control','adaptive'] as const;
type Policy=typeof policies[number];
function choose(s:CardDebate,policy:Policy):number{
 const f=s.ally,t=s.enemy,intent=debateIntent(s);
 const order:DebateCard[]=f.mind<22?['focus','claim','borrow','question','rebut','pressure','proof']:
 policy==='evidence'?['proof','claim','question','pressure','rebut','borrow','focus']:
 policy==='counter'?(intent==='攻勢'?['rebut','pressure','borrow','question','proof','claim','focus']:['pressure','borrow','proof','claim','question','focus','rebut']):
 policy==='control'?(t.momentum>=2?['borrow','question','pressure','proof','claim','rebut','focus']:t.evidence>=2?['question','proof','pressure','claim','borrow','rebut','focus']:['proof','pressure','claim','question','borrow','rebut','focus']):
 intent==='攻勢'?(t.momentum>=2&&t.evidence<2?['borrow','focus','pressure','proof','claim','question','rebut']:t.evidence>=2?['question','rebut','pressure','proof','claim','borrow','focus']:['proof','pressure','rebut','claim','question','borrow','focus']):
 intent==='周旋'?['pressure','claim','focus','borrow','proof','question','rebut']:
 ['proof','question','claim','pressure','borrow','focus','rebut'];
 for(const card of order){const i=f.hand.indexOf(card);if(i>=0&&!debateBlock(f,card))return i;}return DEBATE_RECOVER;
}
const report=[];
for(const policy of policies){
 let wins=0,losses=0,draws=0,rounds=0;const used:Partial<Record<DebateCard,number>>={};
 for(let seed=0;seed<400;seed++){
  const int=[35,50,70,90][seed%4]!,s=createCardDebate({...DEFAULT_DEBATE_BUILD,int,trait:(['scholar','counter','orator','calm'] as const)[Math.floor(seed/4)%4]!},{...DEFAULT_DEBATE_BUILD,int},seed);
  while(!s.result){const i=choose(s,policy);assert(resolveCardDebate(s,i));const card=s.last!.ally;used[card]=(used[card]??0)+1;for(const f of [s.ally,s.enemy]){assert.equal(f.hand.length,debateHandSize(f.build.int));assert.equal(f.hand.length+f.deck.length+f.discard.length,16);assert(f.mind>=0&&f.mind<=f.maxMind&&f.momentum>=0&&f.momentum<=4&&f.evidence>=0&&f.evidence<=5);}}
  rounds+=s.history.length;if(s.result==='ally')wins++;else if(s.result==='enemy')losses++;else draws++;
 }
 report.push({policy,wins,losses,draws,averageRounds:rounds/400,used});
}
console.log(JSON.stringify(report,null,2));
assert(report.every(r=>(r.used.pressure??0)>0),'every policy can reach the alternate finisher');
