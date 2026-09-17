import assert from 'node:assert/strict';
import {actRally,chooseRallyAction,createRally,drawRallyCard,forecastRally,rallyHandSize,rallyOpponentHand,rallyPlayable,rallySpecialPlayable} from '../../src/app/debate-rally-model.js';
import type {RallyBuild,RallyCard,RallyColor,RallySpecial} from '../../src/contracts/core/debate-rally.js';
import {RALLY_PROFILES,RALLY_SPECIALS,RALLY_PASSIVES,rallyProfile} from '../../src/app/debate-traits.js';
import {DUEL_ACTORS} from '../../src/contracts/core/duel-art.js';
import {DEBATE_OFFICER_STATS} from '../../src/app/debate-roster.js';
const plain:RallyBuild={int:70,pol:65,special:null,passives:[]};
let id=10000;
const normal=(color:RallyColor,value:number):RallyCard=>({id:id++,kind:'normal',color,value});
const special=(special:RallySpecial):RallyCard=>({id:id++,kind:'special',special});
const setup=()=>{const s=createRally(plain,plain);s.table={id:9999,kind:'normal',color:'reason',value:5};return s;};
for(const color of ['reason','evidence','presence'] as const)for(let value=1;value<=9;value++){
 const s=setup(),card=normal(color,value);assert.equal(rallyPlayable(s,'ally',card),color==='reason'?value>5:value===5);
 s.table=null;assert(rallyPlayable(s,'ally',card));
}
{
 const s=setup();s.ally.hand=[normal('reason',7)];const c=s.ally.hand[0]!,before=structuredClone(s),forecast=forecastRally(s,'ally',c.id)!;
 assert.deepEqual(s,before,'forecast cannot mutate state or RNG');assert(actRally(s,'ally',{kind:'normal',id:c.id}));assert.equal(s.turn,'enemy');assert.equal(s.ally.hand.length,1);assert.equal(s.enemy.heart,forecast.enemy);assert.equal(s.table?.value,7);
 assert(!actRally(s,'ally',{kind:'pass'}),'cannot act out of turn');
}
for(const kind of Object.keys(RALLY_SPECIALS) as RallySpecial[]){
 const s=setup(),sp=special(kind),a=normal('reason',7),b=normal('evidence',5);s.ally.hand=[sp,a,b,special('reflect')];
 const count=s.ally.hand.length;assert(actRally(s,'ally',{kind:'special',id:sp.id,...(kind==='induct'?{targets:[a.id,b.id]}:{})}));assert.equal(s.turn,'ally');assert(s.specialUsed);assert.equal(s.ally.hand.length,count-1+(kind==='concentrate'?3:0));
 assert(!rallySpecialPlayable(s,'ally',s.ally.hand.find(c=>c.kind==='special')!),'second special forbidden');
 if(kind==='induct')assert(s.ally.hand.filter(c=>c.kind==='normal').every(c=>c.value===9));
 if(kind==='shout'){assert(s.ally.double);assert(s.enemy.skip);assert(actRally(s,'ally',{kind:'normal',id:a.id}));assert(actRally(s,'enemy',{kind:'pass'}));assert(!s.enemy.skip);assert.equal(s.lastPass,'enemy');}
 if(kind==='wild'){assert(rallyPlayable(s,'ally',normal('presence',1)));}
 if(kind==='reflect')assert(s.ally.reflect);
}
{
 const s=setup(),sp=special('induct'),a=normal('reason',2);s.ally.hand=[sp,a,normal('presence',3)];const before=structuredClone(s);
 for(const targets of [[],[a.id,a.id],[a.id,999],[a.id]]){assert(!actRally(s,'ally',{kind:'special',id:sp.id,targets}));assert.deepEqual(s,before);}
 assert(actRally(s,'ally',{kind:'special',id:sp.id,targets:[a.id,s.ally.hand[2]!.id]}));assert(s.ally.hand.every(c=>c.kind==='normal'&&c.value===5));
}
{
 const s=setup();s.ally.hand=[normal('reason',6)];s.enemy.hand=[normal('evidence',1)];assert(!actRally(s,'ally',{kind:'pass'}));
 assert(actRally(s,'ally',{kind:'normal',id:s.ally.hand[0]!.id}));assert(actRally(s,'enemy',{kind:'pass'}));
 s.ally.hand=[normal('reason',7)];assert(actRally(s,'ally',{kind:'normal',id:s.ally.hand[0]!.id}));assert.equal(s.ally.combo,1);
 s.enemy.hand=[normal('presence',7)];assert(actRally(s,'enemy',{kind:'normal',id:s.enemy.hand[0]!.id}));assert.equal(s.ally.combo,0);
 s.ally.hand=[normal('reason',1)];s.enemy.hand=[normal('evidence',1)];assert(actRally(s,'ally',{kind:'pass'}));assert(actRally(s,'enemy',{kind:'pass'}));assert.equal(s.table,null);assert.equal(s.turn,'enemy');assert.equal(s.restarts,1);assert.equal(s.enemy.combo,0);assert.equal(s.enemy.hand.length,rallyHandSize(70));
}
{
 const s=setup();s.ally.hand=[normal('reason',9)];s.ally.reflect=true;s.enemy.reflect=true;s.ally.double=true;s.ally.wild=true;
 const before=s.enemy.heart;assert(actRally(s,'ally',{kind:'normal',id:s.ally.hand[0]!.id}));assert(s.last!.reflected);assert.equal(s.enemy.heart,before);assert(s.ally.heart<s.ally.maxHeart);assert(!s.enemy.reflect);assert(s.ally.reflect,'reflection does not bounce recursively');assert(!s.ally.double&&!s.ally.wild);
 s.turn='ally';s.ally.hand=[normal('reason',9)];s.table=null;s.enemy.reflect=true;s.ally.heart=1;assert(actRally(s,'ally',{kind:'normal',id:s.ally.hand[0]!.id}));assert.equal(s.winner,'enemy');
}
{
 const s=createRally(plain,plain);s.enemy.hand=[normal('reason',9),special('reflect')];const visible=rallyOpponentHand(s,'ally');assert.deepEqual(visible,[{color:'reason'},{color:'special'}]);
 const before=chooseRallyAction(s);s.enemy.hand=[normal('presence',1)];assert.deepEqual(chooseRallyAction(s),before,'AI cannot inspect opponent ranks');
}
{
 let low=0,high=0;const a=createRally({...plain,int:1}),b=createRally({...plain,int:100});
 for(let i=0;i<10000;i++){const x=drawRallyCard(a,'ally',true),y=drawRallyCard(b,'ally',true);assert(x.kind==='normal'&&y.kind==='normal');low+=x.value;high+=y.value;assert(y.value>=1&&y.value<=9);}
 assert(high/10000>low/10000+1.5);assert(rallyHandSize(100)>rallyHandSize(1));
 for(let i=0;i<1000;i++)assert.equal(drawRallyCard(a,'ally').kind,'normal');
 const t=createRally({...plain,special:'wild'});let specialCount=0;for(let i=0;i<1000;i++){const c=drawRallyCard(t,'ally');if(c.kind==='special'){assert.equal(c.special,'wild');specialCount++;}}assert(specialCount>100&&specialCount<230);
}
assert.equal(RALLY_PROFILES.length,Object.keys(DUEL_ACTORS).length);
for(const p of RALLY_PROFILES){assert(p.build.passives.length<=2);if(DEBATE_OFFICER_STATS[p.id])assert.equal(p.build.int,DEBATE_OFFICER_STATS[p.id]!.int);}
for(const passive of Object.keys(RALLY_PASSIVES) as RallyBuild['passives'][number][]){
 const s=createRally({...plain,passives:[passive]},plain),base=createRally(plain,plain);
 if(passive==='scholar')assert.equal(s.ally.hand.length,base.ally.hand.length+1);
 else if(passive==='resourceful'||passive==='renewal'){
  s.table={id:999,kind:'normal',color:'reason',value:9};s.ally.hand=[normal('evidence',1)];const n=s.ally.hand.length;s.ally.heart=50;
  if(passive==='renewal')s.lastPass='enemy';assert(actRally(s,'ally',{kind:'pass'}));
  if(passive==='resourceful')assert.equal(s.ally.hand.length,n+2);else assert.equal(s.ally.heart,58);
 }else{
  const side=passive==='composure'?'enemy':'ally',card=normal('reason',passive==='precision'?2:6);s.turn=side;base.turn=side;s[side].hand=[card];base[side].hand=[card];
  if(passive==='adaptable'){s.table={id:999,kind:'normal',color:'evidence',value:6};base.table={...s.table};}
  if(passive==='momentum'){s.lastPass='enemy';base.lastPass='enemy';}
  const preview=forecastRally(s,side,card.id)!,plainPreview=forecastRally(base,side,card.id)!;
  if(passive==='composure')assert(preview.ally>plainPreview.ally);else assert(preview.enemy<plainPreview.enemy);
 }
}
{
 const s=createRally({...plain,int:100},plain);const card=normal('reason',5);s.ally.hand=[card];
 const damage=()=>s.enemy.heart-forecastRally(s,'ally',card.id)!.enemy;
 assert.equal(damage(),27);s.ally.double=true;assert.equal(damage(),54);s.ally.double=false;
 s.lastPass='enemy';assert.equal(damage(),32);s.ally.combo=1;assert.equal(damage(),38);
}
let completed=0,maxActions=0;const outcomes={ally:0,enemy:0};
for(let seed=1;seed<=500;seed++){
 const a=RALLY_PROFILES[seed%RALLY_PROFILES.length]!.build,b=rallyProfile(['guojia','zhugeliang','simayi','zhouyu','zhangfei'][seed%5]!).build,s=createRally(a,b,seed);
 let n=0;while(!s.winner&&n<1500){const action=chooseRallyAction(s);assert(actRally(s,s.turn,action),'AI always selects a legal action');for(const side of ['ally','enemy'] as const){assert(s[side].heart>=0&&s[side].heart<=s[side].maxHeart);assert.equal(new Set(s[side].hand.map(c=>c.id)).size,s[side].hand.length);for(const c of s[side].hand)if(c.kind==='normal')assert(c.value>=1&&c.value<=9);}n++;}
 assert(s.winner,`simulation ${seed} must terminate`);outcomes[s.winner]++;completed++;maxActions=Math.max(maxActions,n);
}
console.log('Rally debate passed: 27 follow rules, five specials, caps, reflection, combo, redraw, secrecy, eight passives, roster stats, intelligence distribution.',{completed,maxActions,outcomes});
